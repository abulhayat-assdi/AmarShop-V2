CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"from_path" text NOT NULL,
	"to_target" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redirects_store_id_idx" ON "redirects" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_store_id_from_path_idx" ON "redirects" USING btree ("store_id","from_path");--> statement-breakpoint
-- Row-Level Security, same pattern as every prior tenant-scoped table.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "redirects" TO amarshop_app;--> statement-breakpoint
ALTER TABLE "redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "redirects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "redirects_tenant_isolation" ON "redirects"
	USING ("store_id" = current_setting('app.current_store_id', true)::uuid)
	WITH CHECK ("store_id" = current_setting('app.current_store_id', true)::uuid);