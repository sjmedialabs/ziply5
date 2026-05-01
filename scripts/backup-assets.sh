#!/usr/bin/env bash
set -euo pipefail

ASSET_DIR="${ASSET_DIR:-/var/www/assets}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ziply5/assets}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/ziply5-assets-$STAMP.tar.gz"

tar -C "$(dirname "$ASSET_DIR")" -czf "$OUT" "$(basename "$ASSET_DIR")"
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
echo "Asset backup complete: $OUT"
