ALTER TABLE "stores" ADD COLUMN "home_show_categories" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "home_categories_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "home_show_new_arrivals" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "home_new_arrivals_order" integer DEFAULT 2 NOT NULL;