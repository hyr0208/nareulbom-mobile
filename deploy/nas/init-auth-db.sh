#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
\getenv app_password APP_DB_PASSWORD
CREATE ROLE nareulbom_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
ALTER DATABASE nareulbom OWNER TO nareulbom_app;
REVOKE ALL ON DATABASE nareulbom FROM PUBLIC;
GRANT CONNECT, CREATE ON DATABASE nareulbom TO nareulbom_app;
ALTER SCHEMA public OWNER TO nareulbom_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
