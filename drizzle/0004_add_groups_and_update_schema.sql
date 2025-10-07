-- Create groups table
CREATE TABLE IF NOT EXISTS "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"description" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

-- Add groupId to players table
ALTER TABLE "players" ADD COLUMN "group_id" text;
ALTER TABLE "players" ADD COLUMN "user_id" text;

-- Add groupId to matchdays table
ALTER TABLE "matchdays" ADD COLUMN "group_id" text;

-- Create indexes for groups
CREATE INDEX IF NOT EXISTS "groups_invite_code_idx" ON "groups" ("invite_code");
CREATE INDEX IF NOT EXISTS "groups_active_idx" ON "groups" ("is_active");

-- Create indexes for group_members
CREATE INDEX IF NOT EXISTS "group_members_group_user_idx" ON "group_members" ("group_id","user_id");
CREATE INDEX IF NOT EXISTS "group_members_user_idx" ON "group_members" ("user_id");
CREATE INDEX IF NOT EXISTS "group_members_active_idx" ON "group_members" ("is_active");

-- Create indexes for players
CREATE INDEX IF NOT EXISTS "players_group_idx" ON "players" ("group_id");
CREATE INDEX IF NOT EXISTS "players_user_idx" ON "players" ("user_id");

-- Create indexes for matchdays
CREATE INDEX IF NOT EXISTS "matchdays_group_idx" ON "matchdays" ("group_id");

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "players" ADD CONSTRAINT "players_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matchdays" ADD CONSTRAINT "matchdays_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
