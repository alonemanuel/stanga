-- Make matchday name field optional
ALTER TABLE "matchdays" ALTER COLUMN "name" DROP NOT NULL;
