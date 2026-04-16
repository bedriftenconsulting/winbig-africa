# WinBig Competition Fields Update

## Summary
Updated the game service to support WinBig Africa's competition model with dedicated fields for prize details, rules, total tickets, and date ranges.

## Changes Made

### 1. Database Migration
**File:** `migrations/20260414000001_add_winbig_competition_fields.sql`
- Added `prize_details` (TEXT) - stores prize descriptions
- Added `rules` (TEXT) - stores competition rules/terms
- Added `total_tickets` (INTEGER) - maximum tickets available
- Added `start_date` (DATE) - competition start date
- Added `end_date` (DATE) - competition end date
- Added indexes for date range queries

### 2. Go Models
**File:** `internal/models/game.go`
- Updated `Game` struct with new fields
- Updated `CreateGameRequest` with new fields and optional `status`
- Modified `ConvertToGame()` to apply sensible defaults for lottery-specific fields (organizer, game_format, etc.)
- Relaxed `Validate()` to make lottery-specific fields optional (organizer, game_category, bet_types)
- Relaxed `ValidateBusinessRules()` to not require organizer/stake amounts

### 3. Repository Layer
**File:** `internal/repositories/game_repository.go`
- Updated `CreateWithTx()` INSERT query to include new fields
- Updated `GetByID()` SELECT query to include new fields
- Updated `List()` SELECT query to include new fields
- Updated all Scan() calls to map new fields

### 4. Frontend TypeScript
**File:** `vinne-admin-web/src/services/games.ts`
- Added `prize_details`, `rules`, `total_tickets` to `CreateGameRequest`
- Added same fields to `Game` interface

**File:** `vinne-admin-web/src/components/games/CreateGameWizard.tsx`
- Updated `handleSubmit()` to send new fields to backend
- Removed TODO comment about missing backend support

## Migration Instructions

1. **Run the migration:**
   ```bash
   cd vinne-microservices/services/service-game
   goose postgres "your-connection-string" up
   ```

2. **Rebuild the service:**
   ```bash
   go build ./cmd/service-game
   ```

3. **Restart the service** to pick up the changes

## Backward Compatibility

- All new fields are optional (nullable in DB, pointers in Go)
- Existing lottery games will continue to work
- The wizard now sends competition-specific fields while still providing lottery defaults for required backend fields
- Validation is relaxed to support both lottery and competition models

## Testing

Create a new game via the admin wizard and verify:
1. All 4 wizard steps complete successfully
2. Game appears in the games list
3. Prize details, rules, and ticket count are stored correctly
4. Start/end dates are saved as DATE fields
5. Status can be set during creation (Draft/Active/Suspended)
