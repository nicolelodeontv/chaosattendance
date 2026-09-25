-- Apply manually only after code verification and explicit production approval.
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "submissionDeadline" TIMESTAMP(3);
