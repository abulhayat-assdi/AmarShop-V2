-- Per-store low-stock alert threshold (single source for the dashboard
-- card and the admin bell). stores is outside the RLS boundary, so a
-- plain ADD COLUMN with a default — existing rows get 5.
ALTER TABLE "stores" ADD COLUMN "low_stock_threshold" integer DEFAULT 5 NOT NULL;
