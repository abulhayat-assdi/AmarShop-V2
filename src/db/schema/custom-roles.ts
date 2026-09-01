import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Admin -> Roles (granular RBAC — SITE_STRUCTURE.md's "/roles"). A named,
// reusable permission set a store defines and assigns to "staff"-rank
// members (staff_members.custom_role_id) — owner and admin keep their
// unchanged full access regardless (src/lib/auth/roles.ts's
// requirePermission()). `permissions` is a comma-joined list validated on
// write against src/lib/auth/permissions.ts's PERMISSIONS, same
// convention as webhook_endpoints.events / oauth_apps.scopes.
// Tenant-scoped, ordinary RLS table.
export const customRoles = pgTable(
  "custom_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    permissions: text("permissions").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("custom_roles_store_id_idx").on(table.storeId),
    uniqueIndex("custom_roles_store_id_name_idx").on(table.storeId, table.name),
  ]
);

export type CustomRole = typeof customRoles.$inferSelect;
export type NewCustomRole = typeof customRoles.$inferInsert;
