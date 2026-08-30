CREATE TYPE "public"."checkout_lead_status" AS ENUM('pending', 'contacted', 'converted', 'dismissed');--> statement-breakpoint
CREATE TABLE "checkout_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text,
	"delivery_zone_id" uuid,
	"status" "checkout_lead_status" DEFAULT 'pending' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_leads" ADD CONSTRAINT "checkout_leads_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_leads" ADD CONSTRAINT "checkout_leads_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_leads" ADD CONSTRAINT "checkout_leads_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_leads_cart_id_idx" ON "checkout_leads" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "checkout_leads_store_id_idx" ON "checkout_leads" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "checkout_leads_store_status_seen_idx" ON "checkout_leads" USING btree ("store_id","status","last_seen_at");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "checkout_leads" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "checkout_leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkout_leads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "checkout_leads_tenant_isolation" ON "checkout_leads"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);