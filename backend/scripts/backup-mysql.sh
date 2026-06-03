#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/weekly-report-app}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
ENV_FILE="${ENV_FILE:-/etc/weekly-report/weekly-report.env}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"

MYSQL_DATABASE="${MYSQL_DATABASE:-weekly_report}"
MYSQL_HOST="${MYSQL_HOST:-localhost}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
target="$BACKUP_DIR/weekly_report-$timestamp.sql"

MYSQL_PWD="$MYSQL_PASSWORD" mysqldump \
  -h "$MYSQL_HOST" \
  -u "$MYSQL_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "$MYSQL_DATABASE" \
  > "$target"

find "$BACKUP_DIR" -type f -name "weekly_report-*.sql" -mtime +"$RETENTION_DAYS" -delete

echo "Created backup: $target"
