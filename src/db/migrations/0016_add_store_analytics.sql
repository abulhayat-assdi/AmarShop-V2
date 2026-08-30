-- Merchant ad-tracking ids for their storefront <head>. Public
-- identifiers, not secrets. stores is outside the RLS boundary by design,
-- so this is a plain ADD COLUMN with no policy block (like 0012).
ALTER TABLE "stores" ADD COLUMN "meta_pixel_id" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "ga4_measurement_id" text;
