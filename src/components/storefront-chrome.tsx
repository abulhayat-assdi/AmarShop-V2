import Link from "next/link";
import type { Store, Category } from "@/db/schema";
import { ProductMedia } from "@/components/product-media";

// Shared by both src/app/(storefront)/layout.tsx and the storefront branch
// of src/app/page.tsx (the root path is reached from both a resolved store
// AND the platform root, so it can't live inside the (storefront) route
// group's own layout — see the plan's routing note). Plain, data-in
// components so neither caller re-fetches on the other's behalf.
export function StorefrontHeader({
  store,
  categories,
  cartItemCount,
}: {
  store: Store;
  categories: Category[];
  cartItemCount: number;
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold">
          {store.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {categories.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="hover:underline">
              {category.name}
            </Link>
          ))}
          <Link href="/search" className="hover:underline">
            Search
          </Link>
          <Link href="/cart" className="hover:underline">
            Cart ({cartItemCount})
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function StorefrontFooter({ store }: { store: Store }) {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto max-w-5xl p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} {store.name}
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
    </Link>
  );
}
