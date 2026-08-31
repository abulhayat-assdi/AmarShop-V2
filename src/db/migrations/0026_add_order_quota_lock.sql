ALTER TABLE "orders" ADD COLUMN "quota_locked_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_store_id_created_at_idx" ON "orders" USING btree ("store_id","created_at");