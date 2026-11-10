#!/bin/sh
set -e

echo "[STARTUP] Iniciando backend Node.js/Express em background na porta 3001..."
node /app/server/superadmin_server.js &

echo "[STARTUP] Iniciando Nginx na porta 80..."
exec nginx -g "daemon off;"
