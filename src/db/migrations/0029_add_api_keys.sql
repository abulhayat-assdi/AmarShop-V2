CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"scopes" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_staff_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_store_id_idx" ON "api_keys" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_token_hash_idx" ON "api_keys" USING btree ("token_hash");--> statement-breakpoint
-- NO Row-Level Security on "api_keys" — deliberate, and NOT a rule #2 gap.
-- An API request carries only a Bearer token, so `WHERE token_hash = ?`
-- has to resolve the store BEFORE any app.current_store_id can be set
-- (same reason `stores` and `platform_invoices` sit outside the boundary
-- — see src/db/schema/api-keys.ts and src/db/context.ts). All access goes
-- through src/lib/api/keys.ts with explicit `where store_id = ?` scoping.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "api_keys" TO amarshop_app;