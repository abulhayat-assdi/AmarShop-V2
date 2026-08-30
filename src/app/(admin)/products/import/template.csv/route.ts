import { CSV_COLUMNS } from "@/lib/products/import";

// A ready-to-fill template: the exact header row the importer expects plus
// one example line. No auth gate — it's a static schema hint, not data.
export function GET() {
  const example = [
    "Classic Cotton Panjabi", // name
    "PANJABI-XL-001", // sku
    "1200", // price
    "25", // quantity
    "Panjabi", // category
    "AmarShop Basics", // brand
    "Full-sleeve cotton panjabi", // description
    "999", // discounted_price
    "0", // vat_percent
    "active", // status
  ];
  const body = `${CSV_COLUMNS.join(",")}\n${example.map((v) => (v.includes(",") ? `"${v}"` : v)).join(",")}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="amarshop-products-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
