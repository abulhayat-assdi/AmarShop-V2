CREATE TYPE "public"."oauth_app_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "oauth_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"developer_name" text NOT NULL,
	"developer_email" text NOT NULL,
	"homepage_url" text,
	"logo_url" text,
	"client_id" text NOT NULL,
	"client_secret_hash" text NOT NULL,
	"client_secret_prefix" text NOT NULL,
	"redirect_uris" text NOT NULL,
	"scopes" text NOT NULL,
	"status" "oauth_app_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"scopes" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"token_last_used_at" timestamp with time zone,
	"installed_by_staff_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"scopes" text NOT NULL,
	"code_challenge" text,
	"code_challenge_method" text,
	"installed_by_staff_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_installations" ADD CONSTRAINT "app_installations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_installations" ADD CONSTRAINT "app_installations_app_id_oauth_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."oauth_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_app_id_oauth_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."oauth_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_apps_slug_idx" ON "oauth_apps" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_apps_client_id_idx" ON "oauth_apps" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "app_installations_store_id_idx" ON "app_installations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "app_installations_app_id_idx" ON "app_installations" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_installations_token_hash_idx" ON "app_installations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "app_installations_live_idx" ON "app_installations" USING btree ("app_id","store_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_authorization_codes_code_hash_idx" ON "oauth_authorization_codes" USING btree ("code_hash");--> statement-breakpoint
-- NO Row-Level Security on any of the three tables below — deliberate, and
-- NOT a rule #2 gap.
--
-- The developer platform's credential path is the same chicken/egg as
-- `api_keys` and staff login: an incoming request carries only a Bearer
-- token (app_installations) or a client_id + client_secret + code
-- (oauth_apps, oauth_authorization_codes), so every lookup here has to
-- resolve the store/app BEFORE any app.current_store_id can be set.
--   * oauth_apps            — platform-global (one app, many stores),
--                             written only from /platform/apps.
--   * app_installations     — tenant data, but reached only by the token
--                             resolver (by token_hash) and the merchant's
--                             own Installed Apps page (explicit
--                             `where store_id = session.user.storeId`),
--                             never by the storefront request path.
--   * oauth_authorization_codes — 10-minute single-use, redeemed by an
--                             unauthenticated machine call to /oauth/token.
-- All access goes through src/lib/oauth/* with explicit store scoping.
-- "amarshop_app" reaches these through the default schema grant, exactly
-- like "stores" / "api_keys".
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "oauth_apps" TO amarshop_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app_installations" TO amarshop_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "oauth_authorization_codes" TO amarshop_app;