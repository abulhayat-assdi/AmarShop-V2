-- stores sits outside the RLS boundary by design (tenant resolution runs
-- before app.current_store_id is set — see src/db/schema/stores.ts), so
-- this is a plain ADD COLUMN with no policy/grant block, same as
-- 0008_add_payment_gateway_ref.sql. NULL = no custom domain or one not
-- yet DNS-verified; set = the CNAME/A check passed.
ALTER TABLE "stores" ADD COLUMN "custom_domain_verified_at" timestamp with time zone;
