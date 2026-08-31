CREATE TABLE "product_digital_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "digital_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_digital" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_digital_files" ADD CONSTRAINT "product_digital_files_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_digital_files" ADD CONSTRAINT "product_digital_files_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_digital_files_store_id_idx" ON "product_digital_files" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "product_digital_files_product_id_idx" ON "product_digital_files" USING btree ("product_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "product_digital_files" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "product_digital_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_digital_files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "product_digital_files_tenant_isolation" ON "product_digital_files"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);