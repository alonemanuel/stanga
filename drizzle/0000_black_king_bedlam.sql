CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"changes" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"game_id" text NOT NULL,
	"player_id" text,
	"team_id" text NOT NULL,
	"event_type" text NOT NULL,
	"minute" integer,
	"description" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"matchday_id" text NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"winner_team_id" text,
	"end_reason" text,
	"max_goals" integer,
	"queue_position" integer
);
--> statement-breakpoint
CREATE TABLE "matchdays" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"name" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"location" text,
	"max_players" integer DEFAULT 18 NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"rules" jsonb NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penalty_kicks" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"shootout_id" text NOT NULL,
	"player_id" text NOT NULL,
	"team_id" text NOT NULL,
	"kick_order" integer NOT NULL,
	"result" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "penalty_shootouts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"game_id" text NOT NULL,
	"home_team_score" integer DEFAULT 0 NOT NULL,
	"away_team_score" integer DEFAULT 0 NOT NULL,
	"winner_team_id" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"name" text NOT NULL,
	"nickname" text,
	"position" text,
	"skill_level" integer DEFAULT 5,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"team_id" text NOT NULL,
	"player_id" text NOT NULL,
	"position" text,
	"position_order" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"matchday_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"formation" text DEFAULT '4-4-2',
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_kicks" ADD CONSTRAINT "penalty_kicks_shootout_id_penalty_shootouts_id_fk" FOREIGN KEY ("shootout_id") REFERENCES "public"."penalty_shootouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_kicks" ADD CONSTRAINT "penalty_kicks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_kicks" ADD CONSTRAINT "penalty_kicks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootouts" ADD CONSTRAINT "penalty_shootouts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalty_shootouts" ADD CONSTRAINT "penalty_shootouts_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_matchday_id_matchdays_id_fk" FOREIGN KEY ("matchday_id") REFERENCES "public"."matchdays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_log_actor_idx" ON "activity_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "game_events_game_idx" ON "game_events" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_events_player_idx" ON "game_events" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "game_events_type_idx" ON "game_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "game_events_active_idx" ON "game_events" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "games_matchday_idx" ON "games" USING btree ("matchday_id");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status");--> statement-breakpoint
CREATE INDEX "games_teams_idx" ON "games" USING btree ("home_team_id","away_team_id");--> statement-breakpoint
CREATE INDEX "games_queue_idx" ON "games" USING btree ("queue_position");--> statement-breakpoint
CREATE INDEX "matchdays_scheduled_idx" ON "matchdays" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "matchdays_status_idx" ON "matchdays" USING btree ("status");--> statement-breakpoint
CREATE INDEX "matchdays_public_idx" ON "matchdays" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "penalty_kicks_shootout_idx" ON "penalty_kicks" USING btree ("shootout_id");--> statement-breakpoint
CREATE INDEX "penalty_kicks_order_idx" ON "penalty_kicks" USING btree ("shootout_id","kick_order");--> statement-breakpoint
CREATE INDEX "penalty_shootouts_game_idx" ON "penalty_shootouts" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "players" USING btree ("name");--> statement-breakpoint
CREATE INDEX "players_active_idx" ON "players" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "players_skill_idx" ON "players" USING btree ("skill_level");--> statement-breakpoint
CREATE INDEX "team_assignments_team_player_idx" ON "team_assignments" USING btree ("team_id","player_id");--> statement-breakpoint
CREATE INDEX "team_assignments_player_idx" ON "team_assignments" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "team_assignments_active_idx" ON "team_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "teams_matchday_idx" ON "teams" USING btree ("matchday_id");--> statement-breakpoint
CREATE INDEX "teams_active_idx" ON "teams" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");