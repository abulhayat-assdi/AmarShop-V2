CREATE TYPE "public"."checkout_field_type" AS ENUM('text', 'textarea');--> statement-breakpoint
CREATE TABLE "checkout_custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"label" text NOT NULL,
	"field_type" "checkout_field_type" DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_custom_field_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"field_id" uuid,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_custom_fields" ADD CONSTRAINT "checkout_custom_fields_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_field_answers" ADD CONSTRAINT "order_custom_field_answers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_field_answers" ADD CONSTRAINT "order_custom_field_answers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_field_answers" ADD CONSTRAINT "order_custom_field_answers_field_id_checkout_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."checkout_custom_fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_custom_fields_store_id_idx" ON "checkout_custom_fields" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "order_custom_field_answers_store_id_idx" ON "order_custom_field_answers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "order_custom_field_answers_order_id_idx" ON "order_custom_field_answers" USING btree ("order_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "checkout_custom_fields" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "checkout_custom_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkout_custom_fields" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "checkout_custom_fields_tenant_isolation" ON "checkout_custom_fields"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "order_custom_field_answers" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "order_custom_field_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_custom_field_answers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "order_custom_field_answers_tenant_isolation" ON "order_custom_field_answers"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);