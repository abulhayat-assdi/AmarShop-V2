CREATE TYPE "public"."sms_message_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sms_provider" AS ENUM('bulksmsbd', 'log');--> statement-breakpoint
CREATE TABLE "store_sms_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" "sms_provider",
	"sender_id" text,
	"sandbox" boolean DEFAULT true NOT NULL,
	"secrets" text,
	"notify_order_placed" boolean DEFAULT true NOT NULL,
	"notify_order_shipped" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"event" text NOT NULL,
	"status" "sms_message_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_sms_settings" ADD CONSTRAINT "store_sms_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_sms_settings_store_id_idx" ON "store_sms_settings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "sms_messages_store_id_idx" ON "sms_messages" USING btree ("store_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "store_sms_settings" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "store_sms_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_sms_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_sms_settings_tenant_isolation" ON "store_sms_settings"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sms_messages" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "sms_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sms_messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sms_messages_tenant_isolation" ON "sms_messages"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);
