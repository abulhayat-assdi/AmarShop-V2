CREATE TYPE "public"."fraud_risk_level" AS ENUM('safe', 'low', 'medium', 'high', 'danger', 'unknown');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fraud_risk_level" "fraud_risk_level";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fraud_success_ratio" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fraud_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fraud_raw" text;