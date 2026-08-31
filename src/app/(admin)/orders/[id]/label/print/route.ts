import { requireStaffSession } from "@/lib/auth/roles";

// A tiny wrapper page: it embeds the label PDF in an iframe and fires the
// browser's print dialog on load. The "Print label" link opens this in a
// new tab. Same-origin; the PDF route does the real auth + rendering.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireStaffSession();
  const { id } = await params;
  const src = `/orders/${encodeURIComponent(id)}/label`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print label</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${src}" onload="setTimeout(function(){try{this.contentWindow.focus();this.contentWindow.print()}catch(e){}}.bind(this),400)"></iframe></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
