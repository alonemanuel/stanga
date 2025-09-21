-- Migration: Update teams and team_assignments tables for color tokens and DnD positioning

-- Add new columns to teams table
ALTER TABLE "teams" ADD COLUMN "color_token" text;
ALTER TABLE "teams" ADD COLUMN "color_hex" text;
ALTER TABLE "teams" ADD COLUMN "formation_json" jsonb;

-- Update existing teams to have default values (if any exist)
UPDATE "teams" SET "color_token" = 'blue', "color_hex" = '#3b82f6' WHERE "color_token" IS NULL;

-- Make the new columns NOT NULL after setting defaults
ALTER TABLE "teams" ALTER COLUMN "color_token" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "color_hex" SET NOT NULL;

-- Drop the old color and formation columns
ALTER TABLE "teams" DROP COLUMN "color";
ALTER TABLE "teams" DROP COLUMN "formation";

-- Add new columns to team_assignments table
ALTER TABLE "team_assignments" ADD COLUMN "matchday_id" text;
ALTER TABLE "team_assignments" ADD COLUMN "x_pct" integer;
ALTER TABLE "team_assignments" ADD COLUMN "y_pct" integer;

-- Update existing team_assignments to have matchday_id from their team
UPDATE "team_assignments" 
SET "matchday_id" = (
  SELECT "matchday_id" 
  FROM "teams" 
  WHERE "teams"."id" = "team_assignments"."team_id"
) 
WHERE "matchday_id" IS NULL;

-- Make matchday_id NOT NULL after setting values
ALTER TABLE "team_assignments" ALTER COLUMN "matchday_id" SET NOT NULL;

-- Add foreign key constraint for matchday_id
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_matchday_id_matchdays_id_fk" 
FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE no action ON UPDATE no action;

-- Create new indexes
CREATE INDEX "teams_color_idx" ON "teams" USING btree ("matchday_id","color_token");
DROP INDEX "team_assignments_team_player_idx";
CREATE INDEX "team_assignments_matchday_team_player_idx" ON "team_assignments" USING btree ("matchday_id","team_id","player_id");
CREATE INDEX "team_assignments_team_player_idx" ON "team_assignments" USING btree ("team_id","player_id");
