import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { webhookEndpoints } from "./webhook-endpoints";
import { webhookDeliveryStatusEnum } from "./enums";

// One attempt-set to deliver one event to one endpoint (src/lib/webhooks).
// Written by emitWebhook() and re-run by resendDelivery(), both inside the
// triggering order's store context — tenant-scoped, fully under RLS.
//
// `payload` is the exact JSON body that was sent, so a Resend replays it
// byte-for-byte (and its `id` field is this row's id). `attempts` counts
// tries across the initial run of 3 plus any manual resends.
// `responseStatus` / `responseBody` hold the last HTTP response;
// `error` holds a transport error string when there was no response at all.
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: text("payload").notNull(),
    status: webhookDeliveryStatusEnum("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    error: text("error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("webhook_deliveries_store_id_created_at_idx").on(table.storeId, table.createdAt),
    index("webhook_deliveries_endpoint_id_idx").on(table.endpointId),
  ]
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
