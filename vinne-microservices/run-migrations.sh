#!/bin/bash
# Run all service database migrations (Up section only).
# Run from the vinne-microservices/ directory after `docker compose up -d`.
set -e

run_service_migrations() {
  local container=$1
  local user=$2
  local db=$3
  local migrations_path=$4

  echo "=== Migrating $db ==="

  local files
  mapfile -t files < <(ls "$migrations_path"/*.sql 2>/dev/null | sort)
  if [ ${#files[@]} -eq 0 ]; then
    echo "  No SQL files found in $migrations_path"
    return
  fi

  for f in "${files[@]}"; do
    local fname
    fname=$(basename "$f")
    echo "  Applying $fname..."
    docker cp "$f" "$container:/tmp/mig_current.sql"
    docker exec "$container" bash -c "
      sed -n '/-- +goose Up/,/-- +goose Down/p' /tmp/mig_current.sql \
        | grep -v '^-- +goose' \
        | psql -U $user -d $db -v ON_ERROR_STOP=0 2>&1
    " || true
  done

  echo "  Done."
}

BASE="$(cd "$(dirname "$0")" && pwd)/services"

run_service_migrations vinne-microservices-service-admin-management-db-1 admin_mgmt  admin_management "$BASE/service-admin-management/migrations"
run_service_migrations vinne-microservices-service-game-db-1              game         game_service     "$BASE/service-game/migrations"
run_service_migrations vinne-microservices-service-player-db-1            player       player_service   "$BASE/service-player/migrations"
run_service_migrations vinne-microservices-service-draw-db-1              draw_service draw_service     "$BASE/service-draw/migrations"
run_service_migrations vinne-microservices-service-ticket-db-1            ticket       ticket_service   "$BASE/service-ticket/migrations"
run_service_migrations vinne-microservices-service-payment-db-1           payment      payment_service  "$BASE/service-payment/migrations"
run_service_migrations vinne-microservices-service-notification-db-1      notification notification     "$BASE/service-notification/migrations"
run_service_migrations vinne-microservices-service-wallet-db-1            wallet       wallet_service   "$BASE/service-wallet/migrations"
run_service_migrations vinne-microservices-service-agent-auth-db-1        agent        agent_auth       "$BASE/service-agent-auth/migrations"
run_service_migrations vinne-microservices-service-agent-management-db-1  agent_mgmt   agent_management "$BASE/service-agent-management/migrations"
run_service_migrations vinne-microservices-service-terminal-db-1          terminal     terminal_service "$BASE/service-terminal/migrations"

echo ""
echo "=== All migrations complete ==="
echo ""
echo "Default admin login: superadmin@randco.com / Admin@123!"
