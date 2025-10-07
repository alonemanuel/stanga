-- Add gender and date_of_birth fields to users table
ALTER TABLE "users" ADD COLUMN "gender" text;
ALTER TABLE "users" ADD COLUMN "date_of_birth" timestamp;