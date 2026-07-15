#!/bin/sh
set -eu

: "${DATABASE_URL:=file:/app/data/dev.db}"
: "${APP_UPLOADS_PATH:=/app/public/uploads}"
: "${APP_UPLOADS_BACKUP_PATH:=/app/uploads_backup}"
: "${APP_LINE_ARTS_PATH:=/app/runtime-line-arts}"
: "${APP_SETTINGS_PATH:=/app/server/data/settings.json}"
: "${APP_LINE_ART_HISTORY_PATH:=/app/server/data/line-art-history.json}"
: "${AUTH_SECRET:=}"
: "${ADMIN_USER:=}"
: "${ADMIN_PASSWORD:=}"
: "${PARTNER_USER:=}"
: "${PARTNER_PASSWORD:=}"
export DATABASE_URL APP_UPLOADS_PATH APP_UPLOADS_BACKUP_PATH APP_LINE_ARTS_PATH APP_SETTINGS_PATH APP_LINE_ART_HISTORY_PATH

fail() {
  printf '%s
' "startup error: $1" >&2
  exit 1
}

[ "${#AUTH_SECRET}" -ge 32 ] || fail 'AUTH_SECRET must contain at least 32 characters'
[ -n "$ADMIN_USER" ] || fail 'ADMIN_USER is required'
[ -n "$PARTNER_USER" ] || fail 'PARTNER_USER is required'
[ -n "$ADMIN_PASSWORD" ] || fail 'ADMIN_PASSWORD is required'
[ -n "$PARTNER_PASSWORD" ] || fail 'PARTNER_PASSWORD is required'
[ "$ADMIN_USER" != "$PARTNER_USER" ] || fail 'ADMIN_USER and PARTNER_USER must be different'

case "$ADMIN_PASSWORD" in
  momo|partner|zhuzhu|zhubao) fail 'ADMIN_PASSWORD must not use a default password' ;;
esac
case "$PARTNER_PASSWORD" in
  momo|partner|zhuzhu|zhubao) fail 'PARTNER_PASSWORD must not use a default password' ;;
esac

settings_dir="$(dirname "$APP_SETTINGS_PATH")"
history_dir="$(dirname "$APP_LINE_ART_HISTORY_PATH")"

check_writable_dir() {
  directory="$1"
  mkdir -p "$directory" || fail "cannot create $directory; check the bind mount and PUID/PGID"
  probe="$directory/.write-test-$$"
  if ! : > "$probe"; then
    fail "cannot write to $directory; set PUID/PGID to the owner of docker-data and fix directory ownership"
  fi
  rm -f "$probe"
}

check_writable_dir /app/data
check_writable_dir "$APP_UPLOADS_PATH"
check_writable_dir "$APP_UPLOADS_BACKUP_PATH"
check_writable_dir "$APP_LINE_ARTS_PATH"
check_writable_dir "$settings_dir"
check_writable_dir "$history_dir"

./node_modules/.bin/prisma migrate deploy
exec "$@"
