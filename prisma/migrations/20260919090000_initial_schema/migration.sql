-- Baseline schema for a fresh environment.
-- Keep later schema changes in their focused, timestamped migrations.

CREATE TABLE "Submission" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeletedSubmission" (
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
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedByDiscordId" TEXT NOT NULL,
    CONSTRAINT "DeletedSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminUser" (
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("discordId")
);

CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "webhookUrl" TEXT,
    "guildName" TEXT NOT NULL DEFAULT 'Squadron',
    "currentOpId" TEXT NOT NULL DEFAULT 'current',
    "submissionDeadline" TIMESTAMP(3),
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Submission_discordId_idx" ON "Submission"("discordId");
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");
CREATE INDEX "Submission_opId_idx" ON "Submission"("opId");

CREATE INDEX "DeletedSubmission_deletedAt_idx" ON "DeletedSubmission"("deletedAt");
CREATE INDEX "DeletedSubmission_opId_deletedAt_idx" ON "DeletedSubmission"("opId", "deletedAt");
CREATE INDEX "DeletedSubmission_originalId_idx" ON "DeletedSubmission"("originalId");
CREATE INDEX "DeletedSubmission_discordId_idx" ON "DeletedSubmission"("discordId");
