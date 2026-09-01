CREATE TYPE "public"."email_message_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('smtp', 'sendgrid', 'mailgun', 'ses', 'log');--> statement-breakpoint
CREATE TABLE "store_email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" "email_provider",
	"from_name" text,
	"from_email" text,
	"host" text,
	"port" integer,
	"secure" boolean DEFAULT false NOT NULL,
	"secrets" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_message_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_email_settings" ADD CONSTRAINT "store_email_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_email_settings_store_id_idx" ON "store_email_settings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "email_messages_store_id_created_at_idx" ON "email_messages" USING btree ("store_id","created_at");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "store_email_settings" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "store_email_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_email_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_email_settings_tenant_isolation" ON "store_email_settings"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "email_messages" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "email_messages_tenant_isolation" ON "email_messages"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);