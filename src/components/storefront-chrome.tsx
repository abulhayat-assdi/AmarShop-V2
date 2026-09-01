import Link from "next/link";
import type { Store, Category } from "@/db/schema";
import { ProductMedia } from "@/components/product-media";
import { Stars } from "@/components/stars";
import { LocaleToggle } from "@/components/locale-toggle";
import { StorefrontAnalytics } from "@/components/storefront-analytics";
import { getTranslator } from "@/lib/i18n/server";
import type { ResolvedMenuLink } from "@/lib/menus/query";

// Shared by both src/app/(storefront)/layout.tsx and the storefront branch
// of src/app/page.tsx (the root path is reached from both a resolved store
// AND the platform root, so it can't live inside the (storefront) route
// group's own layout — see the plan's routing note). Plain, data-in
// components so neither caller re-fetches on the other's behalf. Async:
// each resolves the locale from its own store.locale + the cookie.
export async function StorefrontHeader({
  store,
  categories,
  cartItemCount,
  hasBlog,
  menuLinks,
}: {
  store: Store;
  categories: Category[];
  cartItemCount: number;
  hasBlog: boolean;
  // Admin -> Menu Builder. Empty/omitted = fall back to the plain category
  // list below, so a store that's never touched Menu Builder keeps working
  // exactly as before (src/lib/menus/query.ts's getActiveMenuLinks()
  // already returns [] in that case).
  menuLinks?: ResolvedMenuLink[];
}) {
  const { locale, t } = await getTranslator(store.locale);
  return (
    <>
      <StorefrontAnalytics
        analytics={{ metaPixelId: store.metaPixelId, ga4MeasurementId: store.ga4MeasurementId }}
      />
    <header className="border-b" style={store.primaryColor ? { borderBottomColor: store.primaryColor } : undefined}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
          style={store.primaryColor ? { color: store.primaryColor } : undefined}
        >
          {store.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- storefront-served upload (Admin -> Appearance), not a Next-optimizable static asset
            <img src={store.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
          )}
          {store.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {menuLinks && menuLinks.length > 0
            ? menuLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="hover:underline"
                >
                  {link.label}
                </Link>
              ))
            : categories.map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`} className="hover:underline">
                  {category.name}
                </Link>
              ))}
          {hasBlog && (
            <Link href="/blog" className="hover:underline">
              {t("nav.blog")}
            </Link>
          )}
          <Link href="/search" className="hover:underline">
            {t("nav.search")}
          </Link>
          <Link href="/track" className="hover:underline">
            {t("nav.track")}
          </Link>
          <Link href="/cart" className="hover:underline">
            {t("nav.cart", { count: cartItemCount })}
          </Link>
          <LocaleToggle current={locale} />
        </nav>
      </div>
    </header>
    </>
  );
}

export function StorefrontFooter({
  store,
  footerPages,
}: {
  store: Store;
  footerPages: { slug: string; title: string }[];
}) {
  const socialLinks = [
    { href: store.socialWhatsapp, label: "WhatsApp" },
    { href: store.socialFacebook, label: "Facebook" },
    { href: store.socialInstagram, label: "Instagram" },
  ].filter((s): s is { href: string; label: string } => !!s.href);

  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 p-4 text-sm text-gray-500">
        {store.footerTagline && <p>{store.footerTagline}</p>}
        {footerPages.length > 0 && (
          <nav className="flex flex-wrap gap-4">
            {footerPages.map((page) => (
              <Link key={page.slug} href={`/pages/${page.slug}`} className="hover:underline">
                {page.title}
              </Link>
            ))}
          </nav>
        )}
        {socialLinks.length > 0 && (
          <nav className="flex flex-wrap gap-4">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {s.label}
              </a>
            ))}
          </nav>
        )}
        <span>
          © {new Date().getFullYear()} {store.name}
        </span>
      </div>
    </footer>
  );
}

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: string;
  discountedPrice: string | null;
  imageUrl?: string | null;
  // Approved-review summary, when the caller has looked it up. Absent /
  // count 0 renders no stars (SITE_STRUCTURE.md: "review count or
  // 'No Review Yet'" — never a fabricated number).
  rating?: { count: number; average: number } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex flex-col gap-2 rounded border p-3 hover:border-gray-400"
    >
      <ProductMedia item={null} src={product.imageUrl} alt={product.name} />
      <span className="text-sm font-medium">{product.name}</span>
      {product.discountedPrice ? (
        <span className="text-sm">
          ৳{product.discountedPrice} <span className="text-gray-400 line-through">৳{product.price}</span>
        </span>
      ) : (
        <span className="text-sm">৳{product.price}</span>
      )}
      {product.rating && product.rating.count > 0 && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Stars value={product.rating.average} className="text-xs" />
          <span>({product.rating.count})</span>
        </span>
      )}
    </Link>
  );
}
