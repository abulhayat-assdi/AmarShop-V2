import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// A merchant-registered HTTP endpoint that AmarShop POSTs a signed JSON
// payload to when a subscribed event fires (src/lib/webhooks). Tenant-scoped
// and fully under RLS — every read/write runs inside withStoreContext, and
// emitWebhook() runs in the store context of the order that triggered it.
// Unlike api_keys / app_installations there is no pre-store-context lookup
// here, so this is an ordinary RLS table.
//
// `secret` is stored via encryptSecret() and is RETRIEVABLE — it's
// decrypted and shown to the merchant so they can verify the
// `X-AmarShop-Signature` HMAC on their side. `events` is a comma-joined
// list validated on write against src/lib/webhooks/events.ts. `disabledAt`
// set = the endpoint is kept but no deliveries are attempted for it.
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: text("events").notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    // The staff member who created it. No FK — staff rows are tenant-scoped
    // and this is a loose audit note (cf. api_keys.created_by_staff_id).
    createdByStaffId: uuid("created_by_staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhook_endpoints_store_id_idx").on(table.storeId)]
);

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;
