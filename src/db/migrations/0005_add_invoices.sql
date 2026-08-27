CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'generated');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_store_id_idx" ON "invoices" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_order_id_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_store_number_idx" ON "invoices" USING btree ("store_id","number");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invoices" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "invoices_tenant_isolation" ON "invoices"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);