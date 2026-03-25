-- Add admin permission flag to users
ALTER TABLE "User" ADD COLUMN "admin" BOOLEAN NOT NULL DEFAULT false;
