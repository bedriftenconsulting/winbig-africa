#!/bin/bash
# ============================================================
# VINNE DATA RESET SCRIPT
# Clears all operational data for a clean test run.
# Preserves: admins, agents, retailers, terminals.
# Wipes:     games, schedules, draws, tickets, wallets,
#            players, payments, notifications.
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║           VINNE DATA RESET — DESTRUCTIVE             ║"
echo "║  This will permanently wipe all operational data.   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Preserved:  admins · agents · retailers · terminals"
echo "Wiped:      games · draws · tickets · wallets · players · payments"
echo ""
read -p "Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

run_psql() {
  local PORT=$1
  local USER=$2
  local PASS=$3
  local DB=$4
  local SQL=$5
  PGPASSWORD="$PASS" psql -h localhost -p "$PORT" -U "$USER" -d "$DB" -c "$SQL" -q
}

echo ""
echo -e "${YELLOW}[1/6] Resetting game_service...${NC}"
run_psql 5441 game game123 game_service "
  TRUNCATE TABLE
    game_audit,
    game_schedules,
    game_approvals,
    game_versions,
    prize_tiers,
    prize_structures,
    game_rules,
    games
  RESTART IDENTITY CASCADE;
"
# Also truncate bet_types tables if they exist
PGPASSWORD=game123 psql -h localhost -p 5441 -U game -d game_service -q <<'SQL'
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_bet_types') THEN
      TRUNCATE TABLE game_bet_types RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bet_type_configs') THEN
      TRUNCATE TABLE bet_type_configs RESTART IDENTITY CASCADE;
    END IF;
  END $$;
SQL
echo -e "${GREEN}  ✓ game_service cleared${NC}"

echo -e "${YELLOW}[2/6] Resetting draw_service...${NC}"
run_psql 5436 draw_service draw_service123 draw_service "
  TRUNCATE TABLE
    draw_validations,
    prize_distributions,
    draw_results,
    draw_schedules,
    draws
  RESTART IDENTITY CASCADE;
"
echo -e "${GREEN}  ✓ draw_service cleared${NC}"

echo -e "${YELLOW}[3/6] Resetting ticket_service...${NC}"
run_psql 5442 ticket ticket123 ticket_service "
  TRUNCATE TABLE tickets RESTART IDENTITY CASCADE;
"
# Also clear any extra ticket tables
PGPASSWORD=ticket123 psql -h localhost -p 5442 -U ticket -d ticket_service -q <<'SQL'
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ticket_bet_lines') THEN
      TRUNCATE TABLE ticket_bet_lines RESTART IDENTITY CASCADE;
    END IF;
  END $$;
SQL
echo -e "${GREEN}  ✓ ticket_service cleared${NC}"

echo -e "${YELLOW}[4/6] Resetting wallet_service (zero balances + clear transactions)...${NC}"
PGPASSWORD=wallet123 psql -h localhost -p 5438 -U wallet -d wallet_service -q <<'SQL'
  -- Clear all transaction records
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_reservations') THEN
      TRUNCATE TABLE wallet_reservations RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transaction_reversals') THEN
      TRUNCATE TABLE transaction_reversals RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'idempotency_keys') THEN
      TRUNCATE TABLE idempotency_keys RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
      TRUNCATE TABLE wallet_transactions RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
      TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_holdings') THEN
      TRUNCATE TABLE wallet_holdings RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_wallets') THEN
      TRUNCATE TABLE player_wallets RESTART IDENTITY CASCADE;
    END IF;
  END $$;

  -- Zero out all wallet balances (keep wallet records, agents/retailers still exist)
  UPDATE agent_stake_wallets
    SET balance = 0, pending_balance = 0, available_balance = 0, last_transaction_at = NULL;
  UPDATE retailer_stake_wallets
    SET balance = 0, pending_balance = 0, available_balance = 0, last_transaction_at = NULL;
  UPDATE retailer_winning_wallets
    SET balance = 0, pending_balance = 0, available_balance = 0, last_transaction_at = NULL;
SQL
echo -e "${GREEN}  ✓ wallet_service cleared (balances zeroed)${NC}"

echo -e "${YELLOW}[5/6] Resetting player_service...${NC}"
PGPASSWORD=player123 psql -h localhost -p 5444 -U player -d player_service -q <<'SQL'
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_feedback') THEN
      TRUNCATE TABLE player_feedback RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_sessions') THEN
      TRUNCATE TABLE player_sessions RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'players') THEN
      TRUNCATE TABLE players RESTART IDENTITY CASCADE;
    END IF;
  END $$;
SQL
echo -e "${GREEN}  ✓ player_service cleared${NC}"

echo -e "${YELLOW}[6/6] Resetting payment_service...${NC}"
PGPASSWORD=payment123 psql -h localhost -p 5440 -U payment -d payment_service -q <<'SQL'
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_events') THEN
      TRUNCATE TABLE webhook_events RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_sagas') THEN
      TRUNCATE TABLE payment_sagas RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
      TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
    END IF;
  END $$;
SQL
echo -e "${GREEN}  ✓ payment_service cleared${NC}"

# Notifications (bonus — clear but non-critical)
PGPASSWORD=notification123 psql -h localhost -p 5443 -U notification -d notification -q <<'SQL' 2>/dev/null || true
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
      TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'device_tokens') THEN
      TRUNCATE TABLE device_tokens RESTART IDENTITY CASCADE;
    END IF;
  END $$;
SQL

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║              RESET COMPLETE ✓                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "All operational data has been wiped."
echo "Your admin accounts, agents, retailers, and terminals are intact."
echo ""
echo "Next steps:"
echo "  1. Create games via the admin panel"
echo "  2. Generate a schedule (current week)"
echo "  3. Test ticket purchase flow"
