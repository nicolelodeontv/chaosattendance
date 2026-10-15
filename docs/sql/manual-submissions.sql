-- Run in the production database SQL editor before deploying the manual-entry feature.
-- Normal member submissions default to submittedByAdmin = false.
ALTER TABLE "Submission"
  ADD COLUMN IF NOT EXISTS "submittedByAdmin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Submission"
  ADD COLUMN IF NOT EXISTS "enteredBy" TEXT;

-- The archive table may not exist yet; docs/sql/deleted-submission.sql includes
-- these columns for fresh installations and keeps existing tables compatible.
ALTER TABLE IF EXISTS "DeletedSubmission"
  ADD COLUMN IF NOT EXISTS "submittedByAdmin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS "DeletedSubmission"
  ADD COLUMN IF NOT EXISTS "enteredBy" TEXT;
