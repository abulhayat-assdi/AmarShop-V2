import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { products, productVariants } from "@/db/schema";

// Admin -> Account -> System -> "Export my products." Route Handlers are
// NOT wrapped by (admin)/layout.tsx (that only wraps page.tsx renders), so
// this re-checks auth itself, same as every other route under src/app/api.
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  const session = await requirePermission("settings:manage");

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({
        productName: products.name,
        productStatus: products.status,
        sku: productVariants.sku,
        optionsLabel: productVariants.optionsLabel,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        quantity: productVariants.quantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(productVariants.storeId, session.user.storeId))
  );

  const header = ["Product", "Status", "SKU", "Variant", "Price", "Discounted Price", "Quantity"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvField(r.productName),
        csvField(r.productStatus),
        csvField(r.sku),
        csvField(r.optionsLabel ?? ""),
        csvField(r.price),
        csvField(r.discountedPrice ?? ""),
        csvField(String(r.quantity ?? "")),
      ].join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
