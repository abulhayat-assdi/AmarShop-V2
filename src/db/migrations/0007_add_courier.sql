CREATE TYPE "public"."courier_provider" AS ENUM('steadfast', 'pathao', 'redx');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'booked', 'in_transit', 'delivered', 'returned', 'cancelled', 'failed');--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "courier_provider" NOT NULL,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"consignment_id" text,
	"tracking_code" text,
	"tracking_url" text,
	"charge" numeric(10, 2),
	"cod_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_address" text NOT NULL,
	"last_status_raw" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "store_courier_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"active_provider" "courier_provider",
	"sandbox" boolean DEFAULT true NOT NULL,
	"secrets" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_courier_settings" ADD CONSTRAINT "store_courier_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipments_store_id_idx" ON "shipments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "shipments_order_id_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_courier_settings_store_id_idx" ON "store_courier_settings" USING btree ("store_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "shipments" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "shipments_tenant_isolation" ON "shipments"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "store_courier_settings" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "store_courier_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_courier_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_courier_settings_tenant_isolation" ON "store_courier_settings"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);