import { and, desc, eq, inArray } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import {
  carts,
  cartItems,
  checkoutLeads,
  deliveryZones,
  productVariants,
  products,
} from "@/db/schema";

type SaveLeadInput = {
  storeId: string;
  cartToken: string;
  name: string;
  phone: string;
  address: string | null;
  deliveryZoneId: string | null;
};

// Upsert the one lead for this cart. status is set only on insert
// ("pending"); an existing "contacted" / "dismissed" / "converted" lead
// keeps its status while its contact details and lastSeenAt stay fresh.
// No-ops if the cart doesn't exist (nothing to attach a lead to).
export async function saveCheckoutLead(input: SaveLeadInput): Promise<void> {
  const { storeId, cartToken, name, phone, address, deliveryZoneId } = input;

  await withStoreContext(storeId, async (tx) => {
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.storeId, storeId), eq(carts.cartToken, cartToken)))
      .limit(1);
    if (!cart) return;

    const now = new Date();
    await tx
      .insert(checkoutLeads)
      .values({
        storeId,
        cartId: cart.id,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        deliveryZoneId,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: checkoutLeads.cartId,
        set: {
          customerName: name,
          customerPhone: phone,
          customerAddress: address,
          deliveryZoneId,
          lastSeenAt: now,
          updatedAt: now,
        },
      });
  });
}

// Called from placeOrder via after() once an order is written. Never
// throws — a failed status bump must not surface on a completed checkout.
export async function markLeadConverted(storeId: string, cartId: string): Promise<void> {
  try {
    await withStoreContext(storeId, (tx) =>
      tx
        .update(checkoutLeads)
        .set({ status: "converted", updatedAt: new Date() })
        .where(and(eq(checkoutLeads.storeId, storeId), eq(checkoutLeads.cartId, cartId)))
    );
  } catch (err) {
    console.error("[checkout-lead] mark converted failed", err);
  }
}

export async function setLeadStatus(
  storeId: string,
  leadId: string,
  status: "contacted" | "dismissed"
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .update(checkoutLeads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(checkoutLeads.storeId, storeId), eq(checkoutLeads.id, leadId)))
  );
}

export type OpenLead = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  zoneName: string | null;
  status: "pending" | "contacted";
  lastSeenAt: Date;
  cart: { count: number; total: number; items: string[] };
};

// The admin "Incomplete Checkouts" list: pending + contacted leads,
// newest activity first, each with a live summary of what's in its cart.
export async function listOpenLeads(storeId: string): Promise<OpenLead[]> {
  return withStoreContext(storeId, async (tx) => {
    const leads = await tx
      .select({
        id: checkoutLeads.id,
        name: checkoutLeads.customerName,
        phone: checkoutLeads.customerPhone,
        address: checkoutLeads.customerAddress,
        status: checkoutLeads.status,
        lastSeenAt: checkoutLeads.lastSeenAt,
        cartId: checkoutLeads.cartId,
        zoneName: deliveryZones.name,
      })
      .from(checkoutLeads)
      .leftJoin(deliveryZones, eq(deliveryZones.id, checkoutLeads.deliveryZoneId))
      .where(
        and(
          eq(checkoutLeads.storeId, storeId),
          inArray(checkoutLeads.status, ["pending", "contacted"])
        )
      )
      .orderBy(desc(checkoutLeads.lastSeenAt));

    if (leads.length === 0) return [];

    const cartIds = leads.map((l) => l.cartId);
    const lines = await tx
      .select({
        cartId: cartItems.cartId,
        quantity: cartItems.quantity,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        productName: products.name,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(cartItems.storeId, storeId), inArray(cartItems.cartId, cartIds)));

    const byCart = new Map<string, { count: number; total: number; items: string[] }>();
    for (const line of lines) {
      const g = byCart.get(line.cartId) ?? { count: 0, total: 0, items: [] };
      g.count += line.quantity;
      g.total += Number(line.discountedPrice ?? line.price) * line.quantity;
      g.items.push(`${line.productName} ×${line.quantity}`);
      byCart.set(line.cartId, g);
    }

    return leads.map(({ cartId, status, ...rest }) => ({
      ...rest,
      status: status as "pending" | "contacted",
      cart: byCart.get(cartId) ?? { count: 0, total: 0, items: [] },
    }));
  });
}
