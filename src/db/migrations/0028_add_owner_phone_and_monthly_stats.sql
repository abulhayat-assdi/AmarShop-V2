ALTER TABLE "staff_members" ADD COLUMN "phone" text;--> statement-breakpoint
-- Rebuild platform_store_stats() with an extra orders_this_month column
-- for the dashboard list. DROP + CREATE (not CREATE OR REPLACE) because
-- adding an OUT column changes the return type; nothing else depends on it.
-- "this month" = the current calendar month in Asia/Dhaka (matches
-- src/lib/billing/order-quota.ts's monthStartDhaka).
DROP FUNCTION IF EXISTS platform_store_stats();--> statement-breakpoint
CREATE FUNCTION platform_store_stats()
RETURNS TABLE (
	store_id uuid,
	order_count bigint,
	gmv numeric,
	last_order_at timestamptz,
	orders_this_month bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT store_id,
	       count(*)::bigint AS order_count,
	       coalesce(sum(total), 0) AS gmv,
	       max(created_at) AS last_order_at,
	       count(*) FILTER (
	         WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka')
	                              AT TIME ZONE 'Asia/Dhaka'
	       )::bigint AS orders_this_month
	FROM orders
	WHERE status <> 'canceled' AND quota_locked_at IS NULL
	GROUP BY store_id;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_store_stats() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_store_stats() TO amarshop_app;
