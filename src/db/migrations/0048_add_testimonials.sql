CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text,
	"quote" text NOT NULL,
	"outcome" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "testimonials_published_order_idx" ON "testimonials" USING btree ("published","display_order");--> statement-breakpoint
-- Platform-owned marketing content, NOT tenant data: no store_id, no RLS
-- policy — the same call `stores` / `platform_invoices` make. Writes are
-- gated by requirePlatformAdmin() in the app layer; the marketing site
-- reads only `published = true`. The app role needs full DML because both
-- the admin writes and the public read run as amarshop_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "testimonials" TO amarshop_app;