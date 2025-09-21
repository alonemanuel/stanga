-- Rename max_players to team_size and add number_of_teams column
ALTER TABLE "matchdays" RENAME COLUMN "max_players" TO "team_size";
ALTER TABLE "matchdays" ADD COLUMN "number_of_teams" integer DEFAULT 2 NOT NULL;
-- Set default team size to 9 (updating existing records)
UPDATE "matchdays" SET "team_size" = 9 WHERE "team_size" = 18;
