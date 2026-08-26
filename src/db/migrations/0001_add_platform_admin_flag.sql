ALTER TABLE "staff_members" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- auth_lookup_staff_by_email's return columns are changing, so it has to be
-- dropped and recreated rather than CREATE OR REPLACE (Postgres doesn't
-- allow changing a function's OUT columns in place). Same SECURITY DEFINER
-- reasoning as when this function was first created — see migration 0000.
DROP FUNCTION auth_lookup_staff_by_email(text);--> statement-breakpoint
CREATE FUNCTION auth_lookup_staff_by_email(p_email text)
RETURNS TABLE (id uuid, store_id uuid, password_hash text, role staff_role, is_platform_admin boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT id, store_id, password_hash, role, is_platform_admin
	FROM staff_members
	WHERE email = p_email
	LIMIT 1;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION auth_lookup_staff_by_email(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION auth_lookup_staff_by_email(text) TO amarshop_app;