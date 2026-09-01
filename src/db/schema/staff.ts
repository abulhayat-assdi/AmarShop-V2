import { pgTable, uuid, text, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { staffRoleEnum } from "./enums";
import { customRoles } from "./custom-roles";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// email is GLOBALLY unique (not per-store) on purpose: a staff member logs
// in from the shared platform host (app.amarshop.com), where no store_id
// is known yet, so login has to identify the right row by email alone
// before any store context exists. That lookup can't go through the normal
// RLS-gated path (see auth_lookup_staff_by_email() in the migration) — it's
// the one deliberate, narrow exception to "every query is store_id-scoped."
export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Optional contact number for the store owner, collected on the
    // create-store form and shown on the platform-admin store-detail page.
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: staffRoleEnum("role").notNull().default("staff"),
    // The AmarShop operator's own team (not a merchant) — a staff row still
    // scoped to one store like any other (the reserved "platform" store,
    // seeded by src/db/seed.ts), so the existing RLS policy covers it
    // unchanged. Real cross-tenant admin tooling is Phase 5
    // (PROJECT_PLAN.md §8); this flag only exists so a session can tell
    // "AmarShop's own staff" apart from "a merchant's staff" going forward.
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    // Admin -> Account (General Settings -> Profile tab). A short optional
    // bio, shown nowhere yet outside the admin's own settings page.
    bio: text("bio"),
    // Admin -> Account (General Settings -> Notifications tab). Whether
    // this staff member's own admin bell shows billing_* notices — a
    // per-viewer preference, unlike notices themselves which are
    // store-wide (src/db/schema/notices.ts). Defaults on so nobody misses
    // a suspension notice by accident.
    notifyBillingNotices: boolean("notify_billing_notices").notNull().default(true),
    // Admin -> Roles. Only meaningful when role = "staff" — owner/admin
    // ignore this entirely (requirePermission() in src/lib/auth/roles.ts
    // gives them unconditional access). NULL = this staff member has none
    // of the granular permissions in src/lib/auth/permissions.ts yet.
    customRoleId: uuid("custom_role_id").references(() => customRoles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_members_email_idx").on(table.email),
    index("staff_members_store_id_idx").on(table.storeId),
  ]
);

export type StaffMember = typeof staffMembers.$inferSelect;
export type NewStaffMember = typeof staffMembers.$inferInsert;
