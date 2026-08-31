CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."platform_invoice_status" AS ENUM('pending', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "platform_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"cycle" "billing_cycle" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "platform_invoice_status" DEFAULT 'pending' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"wallet_provider" "wallet_provider",
	"sender_msisdn" text,
	"sender_reference" text,
	"paid_at" timestamp with time zone,
	"verified_by_staff_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "subscription_plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "subscription_cycle" "billing_cycle";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "current_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_invoices_store_id_idx" ON "platform_invoices" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "platform_invoices_status_idx" ON "platform_invoices" USING btree ("status");--> statement-breakpoint
-- Backfill: give every existing store a live 7-day trial so the Billing
-- page has real state to show. (The column default only applies to rows
-- inserted after this migration.)
UPDATE "stores" SET "trial_ends_at" = now() + interval '7 days' WHERE "trial_ends_at" IS NULL;--> statement-breakpoint
-- NO Row-Level Security on "platform_invoices" — deliberate, and NOT a
-- rule #2 gap. This is platform-owned data *about* a tenant (the platform
-- billing a merchant), reached only by authenticated staff/platform
-- sessions with explicit `where store_id = ?` scoping — never by the
-- storefront request path via app.current_store_id. It sits outside the
-- RLS boundary for the same reason "stores" itself does (see
-- src/db/schema/platform-invoices.ts and src/db/context.ts). "amarshop_app"
-- reaches it through the default schema grant, exactly like "stores".
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "platform_invoices" TO amarshop_app;