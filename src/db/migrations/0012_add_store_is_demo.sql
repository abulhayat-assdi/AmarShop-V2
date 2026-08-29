-- Marks seed/demo tenants so they can be excluded from production-facing
-- surfaces (CLAUDE.md rule #9). stores sits outside the RLS boundary by
-- design, so this is a plain ADD COLUMN with no policy block.
ALTER TABLE "stores" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The local seed's own fixtures, by their reserved slugs.
UPDATE "stores" SET "is_demo" = true WHERE "slug" IN ('demo', 'test');
