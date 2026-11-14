#!/bin/sh
# Arranque del contenedor: prepara /data para el usuario «node» y arranca el servidor como «node».
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  chown -R node:node "${DATA_DIR:-/data}"
  exec su-exec node "$@"
fi
exec "$@"
