#!/usr/bin/env bash
set -euo pipefail
: "${APP_BASE_URL:?APP_BASE_URL must be set}"
: "${CRON_SECRET:?CRON_SECRET must be set}"
curl -fsS --max-time 70 -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_BASE_URL/api/v1/cron/reconcile"
