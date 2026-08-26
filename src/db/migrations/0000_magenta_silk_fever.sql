CREATE TYPE "public"."staff_role" AS ENUM('owner', 'admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"custom_domain" text,
	"status" "store_status" DEFAULT 'pending' NOT NULL,
	"locale" text DEFAULT 'bn' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "staff_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"staff_member_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stores_slug_idx" ON "stores" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_custom_domain_idx" ON "stores" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_email_idx" ON "staff_members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "staff_members_store_id_idx" ON "staff_members" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "audit_logs_store_id_idx" ON "audit_logs" USING btree ("store_id");--> statement-breakpoint
-- Row-Level Security. amarshop_app (created by docker/postgres/init/01-create-app-role.sh,
-- NOT the migration role running this file) is the only role the app ever
-- connects as for runtime queries, so it is what these policies actually gate.
--
-- "stores" is deliberately excluded: it IS the tenant, not tenant-scoped data,
-- and resolving which store a request belongs to (proxy.ts) has to read this
-- table before app.current_store_id can even be set. See src/db/schema/stores.ts.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "stores" TO amarshop_app;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "staff_members" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "staff_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "staff_members_tenant_isolation" ON "staff_members"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "audit_logs" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);--> statement-breakpoint

-- Staff login happens on the shared platform host, before any store_id is
-- known, so it cannot go through the normal RLS-gated read path above (RLS
-- would return zero rows with no store context set — correctly so, for
-- every OTHER query). This function is the one deliberate, narrow exception:
-- SECURITY DEFINER makes it run as its owner (the migration role, a
-- superuser in the official postgres image), and superusers bypass RLS
-- unconditionally — so, and only inside this one function, the email
-- lookup can see every store's staff. It returns only the columns login
-- needs, nothing else, and only amarshop_app may call it.
CREATE FUNCTION auth_lookup_staff_by_email(p_email text)
RETURNS TABLE (id uuid, store_id uuid, password_hash text, role staff_role)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT id, store_id, password_hash, role
	FROM staff_members
	WHERE email = p_email
	LIMIT 1;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION auth_lookup_staff_by_email(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION auth_lookup_staff_by_email(text) TO amarshop_app;