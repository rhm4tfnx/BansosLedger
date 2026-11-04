#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for required in abi/BansosLedger.json reports/gas.txt reports/coverage-gate.json reports/slither.json reports/slither.sarif; do
  test -s "$required" || { printf 'Missing measured artifact: %s\n' "$required" >&2; exit 1; }
done
archive="reports/contracts-$(git rev-parse --short HEAD)-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
files=(abi/BansosLedger.json reports/gas.txt reports/coverage-gate.json reports/slither.json reports/slither.sarif coverage.json coverage/ artifacts/)
if test -d deployments; then files+=(deployments/); fi
tar -czf "$archive" "${files[@]}"
printf '%s\n' "$archive"
