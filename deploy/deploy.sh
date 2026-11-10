#!/usr/bin/env bash
# Zero-downtime deploy for PisoScan. Run as root on the server: bash /var/www/cadena/deploy/deploy.sh
# Pulls main, installs packages if the lockfile changed, rebuilds the database if data or the importer changed,
# builds into .next-build while the live site keeps serving .next, swaps, restarts, and rolls back if the health check fails.
set -euo pipefail
APP=/var/www/cadena
PORT=3470
RUN="sudo -u cadena -H"
exec 9>/tmp/cadena-deploy.lock
flock -n 9 || { echo "Another deploy is running"; exit 1; }
cd "$APP"

OLD_LOCK=$(sha1sum package-lock.json | cut -d' ' -f1)
$RUN git pull --ff-only
NEW_LOCK=$(sha1sum package-lock.json | cut -d' ' -f1)
if [ "$OLD_LOCK" != "$NEW_LOCK" ] || [ ! -d node_modules ]; then
  echo "==> npm ci"
  $RUN npm ci --no-audit --no-fund
fi

if ! $RUN node scripts/needs-import.mjs; then
  echo "==> rebuilding database"
  $RUN npm run -s import
fi

echo "==> building"
rm -rf .next-build
$RUN env NEXT_DIST_DIR=.next-build npx next build

echo "==> swapping"
rm -rf .next-prev
[ -d .next ] && mv .next .next-prev
mv .next-build .next
pm2 restart cadena --update-env >/dev/null

for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/"; then
    echo "==> Deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo "!! health check failed, rolling back"
rm -rf .next && mv .next-prev .next
pm2 restart cadena >/dev/null
exit 1
