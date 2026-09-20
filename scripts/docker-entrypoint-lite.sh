#!/bin/sh
set -e

echo "[Entrypoint] Initializing OpenWA container..."
echo "[Server] Serving directly on port ${PORT:-2785}."

# Ensure data subdirectories exist on persistent disk
mkdir -p /data/sessions /data/baileys /data/media /data/plugins

# Execute CMD arguments or default to node
if [ $# -gt 0 ]; then
  exec "$@"
else
  exec node dist/main
fi
