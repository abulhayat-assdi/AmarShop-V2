CREATE TYPE "public"."wallet_provider" AS ENUM('bkash', 'nagad');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'manual_wallet';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "wallet_provider" "wallet_provider";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "sender_msisdn" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "customer_reference" text;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD COLUMN "manual_wallet_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD COLUMN "bkash_number" text;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD COLUMN "nagad_number" text;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD COLUMN "manual_instructions" text;