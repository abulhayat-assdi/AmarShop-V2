import { getStorageAdapter } from "@/lib/storage";

// Serves uploaded bytes (product images + videos, store/OAuth logos, and
// Media Library files) from the storage adapter. LocalStorageAdapter.url()
// points here; nothing else serves /uploads.
//
// Public and unscoped on purpose — everything served here is content the
// merchant intends to show on the open storefront (product media, a logo,
// a Media Library image/PDF linked from a page or blog post). Content type
// comes from the key's own (adapter-controlled) extension, so this route
// needs no tenant context. Digital-product PDFs are the exception: those
// are gated behind /order/[tranId]/download/[fileId] and never get a
// storage-adapter URL, so they never reach here. proxy.ts skips /uploads
// in its matcher.
//
// Range requests are honoured so <video> can seek. The adapter only offers
// a whole-buffer get(); slicing a <=50 MB buffer in memory is fine at this
// scale — a range-capable adapter read is a note for the R2 swap.

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

const IMMUTABLE = "public, max-age=31536000, immutable";

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  const key = segments.join("/");

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await getStorageAdapter().get(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const total = bytes.length;
  const range = req.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;

  if (match) {
    const start = match[1] === "" ? 0 : Number(match[1]);
    let end = match[2] === "" ? total - 1 : Number(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${total}`, "Accept-Ranges": "bytes" },
      });
    }
    end = Math.min(end, total - 1);
    const chunk = bytes.subarray(start, end + 1);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(chunk.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": IMMUTABLE,
      },
    });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": IMMUTABLE,
    },
  });
}
