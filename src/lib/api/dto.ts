import type { Order, OrderItem, Product, ProductVariant } from "@/db/schema";

// Stable public shapes for /api/v1. Deliberately not the raw DB rows:
//   - no `storeId` (implied by the key), no internal ids a consumer can't
//     use (deliveryZoneId), no internal blobs (fraudRaw).
//   - `purchasePrice` (the merchant's cost) is withheld — a future
//     `read:products:cost` scope can add it.
//   - enum values pass through as-is: they ARE the API contract, not a
//     display label (CLAUDE.md rule #7 is about the UI, not payloads).
//   - timestamps → ISO strings; money → strings, exactly as stored.

const iso = (d: Date | string | null): string | null =>
  d == null ? null : new Date(d).toISOString();

export type ProductVariantDto = {
  id: string;
  sku: string;
  optionsLabel: string | null;
  price: string;
  discountedPrice: string | null;
  quantity: number;
};

export type ProductDto = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  status: Product["status"];
  isDigital: boolean;
  vatPercent: string;
  category: { id: string; name: string } | null;
  variants: ProductVariantDto[];
  createdAt: string | null;
  updatedAt: string | null;
};

export function productToDto(
  product: Product,
  variants: ProductVariant[],
  category: { id: string; name: string } | null
): ProductDto {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    status: product.status,
    isDigital: product.isDigital,
    vatPercent: product.vatPercent,
    category,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      optionsLabel: v.optionsLabel,
      price: v.price,
      discountedPrice: v.discountedPrice,
      quantity: v.quantity,
    })),
    createdAt: iso(product.createdAt),
    updatedAt: iso(product.updatedAt),
  };
}

export type OrderItemDto = {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderDto = {
  id: string;
  orderCode: string;
  status: Order["status"];
  customer: { name: string; phone: string; email: string | null; address: string };
  items: OrderItemDto[];
  subtotal: string;
  discountAmount: string;
  couponCode: string | null;
  deliveryCharge: string;
  total: string;
  paymentMethod: Order["paymentMethod"];
  notes: string | null;
  fraudRiskLevel: Order["fraudRiskLevel"];
  placedAt: string | null;
  updatedAt: string | null;
};

export function orderToDto(order: Order, items: OrderItem[]): OrderDto {
  return {
    id: order.id,
    orderCode: order.orderCode,
    status: order.status,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: order.customerAddress,
    },
    items: items.map((it) => ({
      productName: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    fraudRiskLevel: order.fraudRiskLevel,
    placedAt: iso(order.createdAt),
    updatedAt: iso(order.updatedAt),
  };
}
