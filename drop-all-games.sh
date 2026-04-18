#!/bin/bash
docker exec vinne-microservices_service-game-db_1 \
  psql -U game -d game_service << 'SQL'

-- Drop all game-related data
TRUNCATE TABLE game_schedules CASCADE;
TRUNCATE TABLE game_prize_structures CASCADE;
TRUNCATE TABLE game_rules CASCADE;
TRUNCATE TABLE games CASCADE;

SELECT 'All games cleared' as result;
SQL
