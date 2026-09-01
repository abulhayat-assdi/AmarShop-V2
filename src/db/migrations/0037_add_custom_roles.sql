CREATE TABLE "custom_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"permissions" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_members" ADD COLUMN "custom_role_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_roles_store_id_idx" ON "custom_roles" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_roles_store_id_name_idx" ON "custom_roles" USING btree ("store_id","name");--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_custom_role_id_custom_roles_id_fk" FOREIGN KEY ("custom_role_id") REFERENCES "public"."custom_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "custom_roles" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "custom_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "custom_roles_tenant_isolation" ON "custom_roles"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);