CREATE TYPE "public"."content_kind" AS ENUM('post', 'page');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "content_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "content_kind" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"show_in_footer" boolean DEFAULT false NOT NULL,
	"footer_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_entries_store_kind_slug_idx" ON "content_entries" USING btree ("store_id","kind","slug");--> statement-breakpoint
CREATE INDEX "content_entries_store_id_idx" ON "content_entries" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "content_entries_store_kind_status_idx" ON "content_entries" USING btree ("store_id","kind","status");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "content_entries" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "content_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "content_entries_tenant_isolation" ON "content_entries"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);