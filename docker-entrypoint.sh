#!/bin/sh
set -e

: "${DATABASE_URL:=file:/app/data/dev.db}"
export DATABASE_URL

npx prisma migrate deploy

exec "$@"
