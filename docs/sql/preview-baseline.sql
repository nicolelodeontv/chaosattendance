-- Initial schema for the isolated CHAOS Attendance Preview database only.
-- Do NOT run this baseline script on Production.
-- Generated to match prisma/schema.prisma at PR #54.
-- Additive and re-runnable for the project's blank Preview database.

DO $$
BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "Submission" (
  "id" TEXT NOT NULL,
  "opId" TEXT NOT NULL DEFAULT 'current',
  "discordId" TEXT NOT NULL,
  "discordUsername" TEXT NOT NULL,
  "discordAvatar" TEXT,
  "ign" TEXT NOT NULL,
  "attending" BOOLEAN NOT NULL,
  "hasPilot" BOOLEAN NOT NULL,
  "pilotName" TEXT,
  "hours" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "submittedByAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "enteredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Submission_opId_discordId_key" UNIQUE ("opId", "discordId")
);

CREATE INDEX IF NOT EXISTS "Submission_discordId_idx" ON "Submission" ("discordId");
CREATE INDEX IF NOT EXISTS "Submission_createdAt_idx" ON "Submission" ("createdAt");
CREATE INDEX IF NOT EXISTS "Submission_opId_idx" ON "Submission" ("opId");

CREATE TABLE IF NOT EXISTS "AdminUser" (
  "discordId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "addedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("discordId")
);

CREATE TABLE IF NOT EXISTS "Settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "webhookUrl" TEXT,
  "guildName" TEXT NOT NULL DEFAULT 'Squadron',
  "currentOpId" TEXT NOT NULL DEFAULT 'current',
  "submissionDeadline" TIMESTAMP(3),
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- The application expects a Recently Removed archive table. This is the
-- current docs/sql/deleted-submission.sql definition, including manual audit fields.
CREATE TABLE IF NOT EXISTS "DeletedSubmission" (
  "id" TEXT NOT NULL,
  "originalId" TEXT NOT NULL,
  "opId" TEXT NOT NULL,
  "discordId" TEXT NOT NULL,
  "discordUsername" TEXT NOT NULL,
  "discordAvatar" TEXT,
  "ign" TEXT NOT NULL,
  "attending" BOOLEAN NOT NULL,
  "hasPilot" BOOLEAN NOT NULL,
  "pilotName" TEXT,
  "hours" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "submittedByAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "enteredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedByDiscordId" TEXT NOT NULL,
  CONSTRAINT "DeletedSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DeletedSubmission_deletedAt_idx" ON "DeletedSubmission" ("deletedAt");
CREATE INDEX IF NOT EXISTS "DeletedSubmission_opId_deletedAt_idx" ON "DeletedSubmission" ("opId", "deletedAt");
CREATE INDEX IF NOT EXISTS "DeletedSubmission_originalId_idx" ON "DeletedSubmission" ("originalId");
CREATE INDEX IF NOT EXISTS "DeletedSubmission_discordId_idx" ON "DeletedSubmission" ("discordId");
