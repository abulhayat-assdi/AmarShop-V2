import "dotenv/config";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./client";
import { stores, staffMembers, categories, products, productVariants, type NewStore } from "./schema";
import { withStoreContext } from "./context";
import { slugify } from "../lib/slugify";

// Dev-only convenience script — never run against a production database.
// Seeds two accounts to log in with while developing locally:
//
//   1. Platform admin (you, the AmarShop operator) — belongs to the
//      reserved "platform" store (not a real merchant storefront; "platform"
//      is a reserved slug, see stores/create/actions.ts). isPlatformAdmin
//      distinguishes this from a merchant's own staff — see
//      src/db/schema/staff.ts and src/lib/auth/roles.ts#requirePlatformAdmin.
//        admin@amarshop.test / AmarShopAdmin!23
//
//   2. Merchant / customer — an ordinary store owner, exactly what someone
//      who signs up and pays for AmarShop ends up with. Store slug "demo",
//      with a couple of categories/products so the admin catalog pages
//      have real data to look at immediately.
//        owner@demo.amarshop.test / password123
// Hard stop before anything is written. The comment above used to be the
// only protection, and `pnpm db:seed` reads whatever DATABASE_URL is in
// the environment — one misfired command on a prod shell would have
// written live tenant rows plus a platform-admin account with a password
// that is published in this file.
function assertNotProduction() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "yes") {
    console.error(
      "Refusing to seed: NODE_ENV=production. This script writes demo tenants and " +
        "well-known passwords. Set ALLOW_SEED=yes only if you are certain."
    );
    process.exit(1);
  }
}

async function upsertStore(values: NewStore) {
  const [existing] = await db.select().from(stores).where(eq(stores.slug, values.slug)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(stores).values(values).returning();
  return created;
}

async function upsertStaff(
  storeId: string,
  values: { name: string; email: string; password: string; role: "owner" | "admin" | "staff"; isPlatformAdmin: boolean }
) {
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.email, values.email))
      .limit(1);
    if (existing) return;

    const passwordHash = await bcrypt.hash(values.password, 10);
    await tx.insert(staffMembers).values({
      storeId,
      name: values.name,
      email: values.email,
      passwordHash,
      role: values.role,
      isPlatformAdmin: values.isPlatformAdmin,
    });
  });
}

async function upsertCategory(storeId: string, name: string, description?: string) {
  const slug = slugify(name);
  return withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.storeId, storeId), eq(categories.slug, slug)))
      .limit(1);
    if (existing) return existing;

    const [created] = await tx
      .insert(categories)
      .values({ storeId, name, slug, description })
      .returning();
    return created;
  });
}

async function upsertProduct(
  storeId: string,
  categoryId: string | null,
  values: { name: string; brand?: string; sku: string; price: string; quantity: number }
) {
  const slug = slugify(values.name);
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.slug, slug)))
      .limit(1);
    if (existing) return;

    const [product] = await tx
      .insert(products)
      .values({
        storeId,
        categoryId,
        name: values.name,
        slug,
        brand: values.brand,
        status: "active",
      })
      .returning();

    await tx.insert(productVariants).values({
      storeId,
      productId: product.id,
      sku: values.sku,
      price: values.price,
      quantity: values.quantity,
    });
  });
}

async function main() {
  assertNotProduction();

  const platformStore = await upsertStore({
    slug: "platform",
    name: "AmarShop (Platform)",
    status: "active",
    locale: "en",
  });
  await upsertStaff(platformStore.id, {
    name: "AmarShop Admin",
    email: "admin@amarshop.test",
    password: "AmarShopAdmin!23",
    role: "owner",
    isPlatformAdmin: true,
  });

  const demoStore = await upsertStore({
    slug: "demo",
    name: "Demo Store",
    status: "active",
    locale: "bn",
    isDemo: true,
    digitalEnabled: true,
  });
  await upsertStaff(demoStore.id, {
    name: "Demo Owner",
    email: "owner@demo.amarshop.test",
    password: "password123",
    role: "owner",
    isPlatformAdmin: false,
  });

  const shirts = await upsertCategory(demoStore.id, "Shirts");
  const accessories = await upsertCategory(demoStore.id, "Accessories");

  await upsertProduct(demoStore.id, shirts.id, {
    name: "Classic Cotton Panjabi",
    brand: "AmarShop Basics",
    sku: "PANJABI-001",
    price: "1200.00",
    quantity: 25,
  });
  await upsertProduct(demoStore.id, shirts.id, {
    name: "Slim Fit Formal Shirt",
    brand: "AmarShop Basics",
    sku: "SHIRT-001",
    price: "950.00",
    quantity: 40,
  });
  await upsertProduct(demoStore.id, accessories.id, {
    name: "Leather Belt",
    brand: "AmarShop Basics",
    sku: "BELT-001",
    price: "550.00",
    quantity: 60,
  });

  console.log(`
Seeded two local dev accounts:

  Platform admin (host / you)
    email:    admin@amarshop.test
    password: AmarShopAdmin!23
    host:     localhost:3000  (the shared platform host — isPlatformAdmin session flag)

  Merchant / customer (demo store owner)
    email:    owner@demo.amarshop.test
    password: password123
    store:    demo.localhost:3000
    catalog:  2 categories, 3 products
`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
