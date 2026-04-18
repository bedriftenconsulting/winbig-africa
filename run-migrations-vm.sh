#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PREFIX="vinne-microservices"

run_migration() {
    local service=$1
    local container="${PREFIX}_${2}_1"
    local user=$3
    local db=$4
    local dir="services/${service}/migrations"

    echo -e "${YELLOW}Migrating ${service}...${NC}"

    if [ ! -d "$dir" ]; then
        echo -e "${RED}No migrations dir for ${service}, skipping${NC}"
        return
    fi

    for f in $(ls -1 ${dir}/*.sql 2>/dev/null | sort); do
        echo "  Applying: $(basename $f)"
        sed -n '/-- +goose Up/,/-- +goose Down/{/-- +goose/d;p}' "$f" | \
            docker exec -i "$container" psql -U "$user" -d "$db" 2>&1 | \
            grep -E "(ERROR|error)" || true
    done
    echo -e "${GREEN}Done: ${service}${NC}"
}

cd ~/vinne/vinne-microservices

run_migration service-admin-management service-admin-management-db admin_mgmt admin_management
run_migration service-agent-auth       service-agent-auth-db       agent      agent_auth
run_migration service-agent-management service-agent-management-db agent_mgmt agent_management
run_migration service-wallet           service-wallet-db           wallet     wallet_service
run_migration service-terminal         service-terminal-db         terminal   terminal_service
run_migration service-payment          service-payment-db          payment    payment_service
run_migration service-game             service-game-db             game       game_service
run_migration service-draw             service-draw-db             draw_service draw_service
run_migration service-ticket           service-ticket-db           ticket     ticket_service
run_migration service-notification     service-notification-db     notification notification
run_migration service-player           service-player-db           player     player_service

echo -e "${GREEN}All migrations done!${NC}"
