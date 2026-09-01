CREATE TYPE "public"."notice_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"category" text NOT NULL,
	"severity" "notice_severity" DEFAULT 'info' NOT NULL,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notices_store_id_created_at_idx" ON "notices" USING btree ("store_id","created_at");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
-- An ordinary RLS table (like webhook_endpoints/webhook_deliveries) —
-- every read/write runs inside withStoreContext (src/lib/notices).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notices" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "notices_tenant_isolation" ON "notices"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);