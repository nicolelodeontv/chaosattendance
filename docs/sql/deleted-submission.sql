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

CREATE INDEX "DeletedSubmission_deletedAt_idx"
  ON "DeletedSubmission"("deletedAt");

CREATE INDEX "DeletedSubmission_opId_deletedAt_idx"
  ON "DeletedSubmission"("opId", "deletedAt");

CREATE INDEX "DeletedSubmission_originalId_idx"
  ON "DeletedSubmission"("originalId");

CREATE INDEX "DeletedSubmission_discordId_idx"
  ON "DeletedSubmission"("discordId");
