-- Performance optimization: Add missing foreign key indexes reported by Supabase
-- This migration adds indexes for foreign key columns that were missing them

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS "game_events_team_id_idx" 
  ON "game_events" ("team_id");

CREATE INDEX IF NOT EXISTS "games_away_team_id_idx" 
  ON "games" ("away_team_id");

CREATE INDEX IF NOT EXISTS "games_winner_team_id_idx" 
  ON "games" ("winner_team_id");

CREATE INDEX IF NOT EXISTS "penalty_kicks_player_id_idx" 
  ON "penalty_kicks" ("player_id");

CREATE INDEX IF NOT EXISTS "penalty_kicks_team_id_idx" 
  ON "penalty_kicks" ("team_id");

CREATE INDEX IF NOT EXISTS "penalty_shootouts_winner_team_id_idx" 
  ON "penalty_shootouts" ("winner_team_id");

-- Add compound indexes for common query patterns
-- This significantly improves query performance for frequently used filters

CREATE INDEX IF NOT EXISTS "game_events_game_active_idx" 
  ON "game_events" ("game_id", "is_active");

CREATE INDEX IF NOT EXISTS "games_matchday_status_idx" 
  ON "games" ("matchday_id", "status");

CREATE INDEX IF NOT EXISTS "players_group_active_idx" 
  ON "players" ("group_id", "is_active");

-- Note: Some unused indexes reported by Supabase are kept for future query patterns
-- They can be removed later if confirmed to be truly unnecessary after monitoring production usage

