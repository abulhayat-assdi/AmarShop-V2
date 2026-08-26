#!/bin/bash
# Runs once, on first container init, via /docker-entrypoint-initdb.d.
#
# POSTGRES_USER (from docker-compose environment) is the initdb bootstrap
# role — in the official postgres image that role is ALWAYS a superuser,
# and superusers bypass Row-Level Security unconditionally, no matter what
# FORCE ROW LEVEL SECURITY says. If the app connected as that role, every
# RLS policy in this project would be silently inert.
#
# So the app never connects as POSTGRES_USER. This script creates a second,
# ordinary (non-superuser) login role — amarshop_app — that the Next.js app
# uses for all runtime queries. Migrations still run as POSTGRES_USER
# (needs DDL rights anyway), and each migration that adds a tenant-scoped
# table grants amarshop_app exactly the DML rights it needs and enables its
# RLS policy in the same file (see src/db/migrations).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'amarshop_app') THEN
	    CREATE ROLE amarshop_app LOGIN PASSWORD '$POSTGRES_APP_PASSWORD';
	  END IF;
	END
	\$\$;

	GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO amarshop_app;
	GRANT USAGE ON SCHEMA public TO amarshop_app;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO amarshop_app;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO amarshop_app;
EOSQL
