CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body_markdown" text DEFAULT '' NOT NULL,
	"category" text,
	"author_name" text,
	"cover_image_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_published_published_at_idx" ON "blog_posts" USING btree ("published","published_at");--> statement-breakpoint
-- Platform-owned marketing content, NOT tenant data: no store_id, no RLS
-- policy — same call as `stores` / `platform_invoices` / `testimonials`.
-- Writes are gated by requirePlatformAdmin() in the app layer; the
-- marketing site reads only `published = true`.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "blog_posts" TO amarshop_app;