-- +goose Up
-- +goose StatementBegin

-- Add WinBig Africa competition-specific fields to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS prize_details TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_tickets INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS end_date DATE;

-- Indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_games_start_date_date ON games(start_date);
CREATE INDEX IF NOT EXISTS idx_games_end_date_date ON games(end_date);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE games DROP COLUMN IF EXISTS prize_details;
ALTER TABLE games DROP COLUMN IF EXISTS rules;
ALTER TABLE games DROP COLUMN IF EXISTS total_tickets;
ALTER TABLE games DROP COLUMN IF EXISTS start_date;
ALTER TABLE games DROP COLUMN IF EXISTS end_date;

DROP INDEX IF EXISTS idx_games_start_date_date;
DROP INDEX IF EXISTS idx_games_end_date_date;

-- +goose StatementEnd
