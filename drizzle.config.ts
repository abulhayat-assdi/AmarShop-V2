import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_MIGRATION_URL) {
  throw new Error(
    "DATABASE_MIGRATION_URL is not set — copy .env.example to .env first"
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Deliberately the admin/bootstrap role, not the app's own DATABASE_URL —
  // migrations need DDL rights (CREATE TABLE, CREATE POLICY, GRANT) that the
  // restricted amarshop_app role does not have. See .env.example.
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL,
  },
  strict: true,
  verbose: true,
});
