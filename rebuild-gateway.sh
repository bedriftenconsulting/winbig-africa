#!/bin/bash
set -e

cd /home/suraj/vinne-microservices

echo "=== Pulling latest code ==="
git pull origin main 2>&1 | tail -5

echo ""
echo "=== Rebuilding api-gateway ==="
sudo docker compose build api-gateway 2>&1 | tail -20

echo ""
echo "=== Restarting api-gateway ==="
sudo docker compose up -d api-gateway

echo ""
echo "=== Waiting 5s for startup ==="
sleep 5

echo ""
echo "=== Gateway health check ==="
curl -s http://localhost:4000/health || echo "no /health endpoint"

echo ""
echo "=== Recent gateway logs ==="
sudo docker logs vinne-microservices_api-gateway_1 --since=30s 2>&1 | grep -v DEBUG | tail -15

echo ""
echo "=== Test reset-password (expect 400 not 500) ==="
curl -s -X POST http://localhost:4000/api/v1/players/reset-password \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+233256826832","code":"000000","new_password":"test123"}' | python3 -m json.tool
