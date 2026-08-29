-- Locks in the random order_code backfilled by 0013 and retires the
-- sequential order_number. See src/lib/orders/number.ts for why.
DROP INDEX "orders_store_id_order_number_idx";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_store_id_order_code_idx" ON "orders" USING btree ("store_id","order_code");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "order_number";