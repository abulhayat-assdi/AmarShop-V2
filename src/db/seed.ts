import "dotenv/config";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./client";
import { stores, staffMembers, type NewStore } from "./schema";
import { withStoreContext } from "./context";

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
//      who signs up and pays for AmarShop ends up with. Store slug "demo".
//        owner@demo.amarshop.test / password123
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

async function main() {
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
  });
  await upsertStaff(demoStore.id, {
    name: "Demo Owner",
    email: "owner@demo.amarshop.test",
    password: "password123",
    role: "owner",
    isPlatformAdmin: false,
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
`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
