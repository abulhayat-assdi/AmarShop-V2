CREATE TABLE "store_payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"sandbox" boolean DEFAULT true NOT NULL,
	"secrets" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD CONSTRAINT "store_payment_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_payment_settings_store_id_idx" ON "store_payment_settings" USING btree ("store_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "store_payment_settings" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_payment_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_payment_settings_tenant_isolation" ON "store_payment_settings"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);
