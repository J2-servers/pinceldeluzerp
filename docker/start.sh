#!/bin/sh
set -eu

mkdir -p /app/database /app/storage/uploads /app/storage/backups

if [ ! -f "$PINCEL_LUZ_DB" ]; then
  echo "Banco SQLite nao encontrado. Criando banco inicial em $PINCEL_LUZ_DB"
  python /app/scripts/create-sqlite-db.py --output "$PINCEL_LUZ_DB" --schema-sql /app/database/schema.sql --manifest /app/database/sqlite-manifest.json
fi

python /app/server/local_api.py &
API_PID="$!"

nginx -g "daemon off;" &
NGINX_PID="$!"

trap 'kill "$API_PID" "$NGINX_PID" 2>/dev/null || true' TERM INT
wait -n "$API_PID" "$NGINX_PID"
