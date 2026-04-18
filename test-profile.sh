#!/bin/bash
# Login and test profile endpoint
LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@randco.com","password":"Admin@123!"}')

echo "Login response: $LOGIN" | head -c 200
echo ""

TOKEN=$(echo $LOGIN | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not extract token"
  exit 1
fi

echo "Token extracted, testing /admin/profile..."
PROFILE=$(curl -s http://localhost:4000/api/v1/admin/profile \
  -H "Authorization: Bearer $TOKEN")

echo "Profile response: $PROFILE" | head -c 300
echo ""
