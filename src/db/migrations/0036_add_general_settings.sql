ALTER TABLE "stores" ADD COLUMN "business_address" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "timezone" text DEFAULT 'Asia/Dhaka' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "currency" text DEFAULT 'BDT' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "maintenance_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "staff_members" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "staff_members" ADD COLUMN "notify_billing_notices" boolean DEFAULT true NOT NULL;