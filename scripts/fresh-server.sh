#!/bin/sh
# Starts a throw-away SWK OS test server (empty workspace, office geofence at 25.2,55.27 r=300m) on :8090. Usage: scripts/fresh-server.sh /path/to/SWKOS
pkill -f "src/server/index.ts" 2>/dev/null; sleep 1; rm -rf /tmp/swk-e2e; mkdir -p /tmp/swk-e2e
cd "$1" && DEMO_ENABLED=false NODE_ENV=development PORT=8090 HOST=127.0.0.1 DATA_DIR=/tmp/swk-e2e COOKIE_SECURE=false STARTER_DATA=false SWK_OFFICE_LAT=25.2 SWK_OFFICE_LNG=55.27 SWK_OFFICE_RADIUS_M=300 nohup npx tsx src/server/index.ts >/tmp/swk-e2e.log 2>&1 &
for i in $(seq 1 40); do sleep 1; curl -sf localhost:8090/api/health >/dev/null && echo up && exit 0; done; echo "server failed"; exit 1
