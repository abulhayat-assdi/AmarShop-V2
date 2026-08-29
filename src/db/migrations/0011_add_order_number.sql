-- Per-store sequential order number. Added nullable, backfilled per store
-- ordered by creation time, then locked to NOT NULL + unique(store_id,
-- order_number). orders already has its RLS policy (tenant-scoped table);
-- a new column needs none — same as 0008_add_payment_gateway_ref.sql.
ALTER TABLE "orders" ADD COLUMN "order_number" integer;--> statement-breakpoint
UPDATE "orders" o
SET "order_number" = seq.rn
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "store_id" ORDER BY "created_at", "id") AS rn
	FROM "orders"
) seq
WHERE o."id" = seq."id";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_store_id_order_number_idx" ON "orders" USING btree ("store_id","order_number");
