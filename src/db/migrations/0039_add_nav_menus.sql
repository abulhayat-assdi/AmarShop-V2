CREATE TYPE "public"."nav_menu_item_kind" AS ENUM('custom_link', 'page', 'category');--> statement-breakpoint
CREATE TABLE "nav_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nav_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"kind" "nav_menu_item_kind" NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"content_entry_id" uuid,
	"category_id" uuid,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nav_menus" ADD CONSTRAINT "nav_menus_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_menu_items" ADD CONSTRAINT "nav_menu_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_menu_items" ADD CONSTRAINT "nav_menu_items_menu_id_nav_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."nav_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_menu_items" ADD CONSTRAINT "nav_menu_items_content_entry_id_content_entries_id_fk" FOREIGN KEY ("content_entry_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nav_menu_items" ADD CONSTRAINT "nav_menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nav_menus_store_id_idx" ON "nav_menus" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "nav_menu_items_store_id_idx" ON "nav_menu_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "nav_menu_items_menu_id_idx" ON "nav_menu_items" USING btree ("menu_id");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "nav_menus" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "nav_menus" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nav_menus" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "nav_menus_tenant_isolation" ON "nav_menus"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "nav_menu_items" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "nav_menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nav_menu_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "nav_menu_items_tenant_isolation" ON "nav_menu_items"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);