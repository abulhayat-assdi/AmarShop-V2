CREATE TYPE "public"."media_asset_kind" AS ENUM('image', 'document');--> statement-breakpoint
CREATE TABLE "media_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"folder_id" uuid,
	"kind" "media_asset_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folder_id_media_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_folders_store_id_idx" ON "media_folders" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_folders_store_id_name_idx" ON "media_folders" USING btree ("store_id","name");--> statement-breakpoint
CREATE INDEX "media_assets_store_id_idx" ON "media_assets" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "media_assets_store_folder_idx" ON "media_assets" USING btree ("store_id","folder_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "media_folders" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "media_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_folders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "media_folders_tenant_isolation" ON "media_folders"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "media_assets" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "media_assets_tenant_isolation" ON "media_assets"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);