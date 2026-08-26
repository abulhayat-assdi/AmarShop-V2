import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { staffMembers } from "./staff";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    staffMemberId: uuid("staff_member_id").references(() => staffMembers.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_store_id_idx").on(table.storeId)]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
