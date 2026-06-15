#!/bin/sh
set -eu

mkdir -p /app/database /app/storage/uploads /app/storage/backups

if [ ! -f "$PINCEL_LUZ_DB" ]; then
  echo "Banco SQLite nao encontrado. Criando banco inicial em $PINCEL_LUZ_DB"
  python /app/scripts/create-sqlite-db.py --output "$PINCEL_LUZ_DB" --schema-sql /app/database/schema.sql --manifest /app/database/sqlite-manifest.json
fi

python /app/server/local_api.py &
API_PID="$!"
echo "API Python iniciada com PID $API_PID em 127.0.0.1:8787"

nginx -g "daemon off;" &
NGINX_PID="$!"
echo "Nginx iniciado com PID $NGINX_PID na porta interna 8080"

shutdown() {
  trap - TERM INT EXIT
  echo "Sinal de encerramento recebido. Parando API e Nginx."
  kill "$API_PID" "$NGINX_PID" 2>/dev/null || true
  wait "$API_PID" "$NGINX_PID" 2>/dev/null || true
  exit 0
}

trap shutdown TERM INT EXIT

while :; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API Python parou. Encerrando container."
    kill "$NGINX_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    exit 1
  fi

  if ! kill -0 "$NGINX_PID" 2>/dev/null; then
    echo "Nginx parou. Encerrando container."
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
    exit 1
  fi

  sleep 2
done
