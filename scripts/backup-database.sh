#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/gb-orderflow-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
pg_dump "${DATABASE_URL}" --format=custom --file="${OUTPUT_FILE}"
echo "Database backup written to ${OUTPUT_FILE}"
