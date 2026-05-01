#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${TARGET_DIR:-/var/www/assets}"
WARN_PERCENT="${WARN_PERCENT:-80}"

usage="$(df -P "$TARGET_DIR" | awk 'NR==2 {gsub("%","",$5); print $5}')"
size="$(du -sh "$TARGET_DIR" | awk '{print $1}')"

echo "Asset usage: ${usage}% (size=${size}, dir=${TARGET_DIR})"

if [ "$usage" -ge "$WARN_PERCENT" ]; then
  echo "WARNING: storage usage exceeded ${WARN_PERCENT}%"
  exit 2
fi
