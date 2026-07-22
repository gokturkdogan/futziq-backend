-- Add slot_code column for draft selections
ALTER TABLE "game_selections" ADD COLUMN IF NOT EXISTS "slot_code" TEXT;

-- Backfill from player_snapshot JSON
UPDATE "game_selections"
SET "slot_code" = "player_snapshot"->>'slotCode'
WHERE "slot_code" IS NULL
  AND "player_snapshot"->>'slotCode' IS NOT NULL;

-- Multiplayer dedup index
CREATE INDEX IF NOT EXISTS "game_selections_game_session_id_player_id_idx"
  ON "game_selections" ("game_session_id", "player_id");

-- pg_trgm for player name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "players_display_name_trgm_idx"
  ON "players" USING gin ("display_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "players_first_name_trgm_idx"
  ON "players" USING gin ("first_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "players_last_name_trgm_idx"
  ON "players" USING gin ("last_name" gin_trgm_ops);

-- Partial indexes for common metric columns
CREATE INDEX IF NOT EXISTS "players_height_cm_idx"
  ON "players" ("height_cm")
  WHERE "height_cm" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "players_total_goals_idx"
  ON "players" ("total_goals")
  WHERE "total_goals" IS NOT NULL;
