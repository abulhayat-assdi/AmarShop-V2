CREATE TYPE "public"."form_field_type" AS ENUM('text', 'email', 'phone', 'textarea', 'dropdown', 'radio', 'checkbox', 'number', 'date');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"success_message" text,
	"status" "form_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"type" "form_field_type" NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forms_store_id_idx" ON "forms" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forms_store_id_slug_idx" ON "forms" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "form_fields_store_id_idx" ON "form_fields" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "form_fields_form_id_idx" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_submissions_store_id_idx" ON "form_submissions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "form_submissions_form_id_created_at_idx" ON "form_submissions" USING btree ("form_id","created_at");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "forms" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "forms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "forms_tenant_isolation" ON "forms"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "form_fields" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "form_fields" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "form_fields" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "form_fields_tenant_isolation" ON "form_fields"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "form_submissions" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "form_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "form_submissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "form_submissions_tenant_isolation" ON "form_submissions"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);