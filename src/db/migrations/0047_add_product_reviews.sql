CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"author_name" text NOT NULL,
	"body" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_reviews_store_id_idx" ON "product_reviews" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "product_reviews_store_product_status_idx" ON "product_reviews" USING btree ("store_id","product_id","status");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "product_reviews" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_reviews" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "product_reviews_tenant_isolation" ON "product_reviews"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);