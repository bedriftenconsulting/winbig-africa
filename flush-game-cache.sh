#!/bin/bash
# Flush game DB and Redis cache
echo "Truncating game tables..."
docker exec vinne-microservices_service-game-db_1 \
  psql -U game -d game_service \
  -c "TRUNCATE TABLE game_schedules CASCADE; TRUNCATE TABLE games CASCADE;" 2>&1

echo "Flushing game Redis cache..."
docker exec vinne-microservices_service-game-redis_1 redis-cli FLUSHALL 2>&1

echo "Done - all games cleared"
