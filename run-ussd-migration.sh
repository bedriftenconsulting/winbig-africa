#!/bin/bash
cd ~/vinne/vinne-microservices

echo "Running USSD migration on player DB..."

# Extract only the UP section (between StatementBegin after goose Up, and goose Down)
awk '/-- \+goose Up/{found=1} found && /-- \+goose StatementBegin/{p=1; next} p && /-- \+goose StatementEnd/{p=0} p{print}' \
  services/service-player/migrations/20260418000001_create_ussd_sessions.sql | \
  docker exec -i vinne-microservices_service-player-db_1 \
  psql -U player -d player_service 2>&1

echo "Verifying tables..."
docker exec vinne-microservices_service-player-db_1 \
  psql -U player -d player_service \
  -c "\dt"

echo "Done!"
