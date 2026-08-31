-- Cross-tenant order rollup for the platform-admin dashboard
-- (src/lib/platform). orders is RLS + FORCE, so amarshop_app cannot read
-- across tenants on the normal path — this is the one sanctioned
-- exception, same pattern as auth_lookup_staff_by_email() in 0000:
-- SECURITY DEFINER runs it as the owner (the migration superuser, which
-- bypasses RLS), it returns only aggregates (no PII, no per-order rows),
-- and only amarshop_app may call it. Canceled and quota-locked orders are
-- excluded so the platform's view of a store matches the merchant's own.
CREATE FUNCTION platform_store_stats()
RETURNS TABLE (store_id uuid, order_count bigint, gmv numeric, last_order_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT store_id,
	       count(*)::bigint AS order_count,
	       coalesce(sum(total), 0) AS gmv,
	       max(created_at) AS last_order_at
	FROM orders
	WHERE status <> 'canceled' AND quota_locked_at IS NULL
	GROUP BY store_id;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_store_stats() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_store_stats() TO amarshop_app;
