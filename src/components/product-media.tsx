// One place product photos and videos get rendered. Plain <img> / <video>,
// not next/image — media is served from /uploads by a route handler and
// will move to an R2/CDN URL later (PROJECT_PLAN.md §6), where Next's
// optimizer would just double-handle and add a sharp dependency to the web
// image on a small VPS.
//
// With no media, renders the same neutral grey box the storefront used as
// a placeholder before this component existed.

type MediaItem = {
  kind: "image" | "video";
  url: string;
  alt?: string | null;
};

type ProductMediaProps = {
  item: MediaItem | null | undefined;
  // Convenience for the common "just an image URL" case (listing grids).
  src?: string | null;
  alt?: string;
  className?: string;
};

export function ProductMedia({ item, src, alt = "", className = "" }: ProductMediaProps) {
  const base = `aspect-square rounded bg-gray-100 ${className}`;

  const resolved: MediaItem | null = item ?? (src ? { kind: "image", url: src, alt } : null);
  if (!resolved) {
    return <div className={base} aria-hidden="true" />;
  }

  if (resolved.kind === "video") {
    return (
      <video
        src={resolved.url}
        controls
        preload="metadata"
        className={`${base} bg-black object-contain`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved.url}
      alt={resolved.alt ?? alt}
      loading="lazy"
      className={`${base} object-cover`}
    />
  );
}
