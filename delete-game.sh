#!/bin/bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@randco.com","password":"Admin@123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

echo "Token: ${TOKEN:0:20}..."

# List all games
echo "=== Games ==="
curl -s http://localhost:4000/api/v1/admin/games?limit=20 \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
games = d.get('data',{}).get('games') or []
for g in games:
    print(g['id'], '|', g.get('code'), '|', g.get('name'))
"

# Delete game starting with 42c1f7da
GAME_ID=$(curl -s "http://localhost:4000/api/v1/admin/games?limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
games = d.get('data',{}).get('games') or []
for g in games:
    if g['id'].startswith('42c1f7da'):
        print(g['id'])
" 2>/dev/null)

if [ -n "$GAME_ID" ]; then
  echo "Deleting game: $GAME_ID"
  curl -s -X DELETE "http://localhost:4000/api/v1/admin/games/$GAME_ID" \
    -H "Authorization: Bearer $TOKEN"
  echo ""
  echo "Done"
else
  echo "Game not found with that prefix, listing all IDs above"
fi
