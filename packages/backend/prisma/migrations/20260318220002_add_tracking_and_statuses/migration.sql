-- Step 2: Use new enum values, add tracking, add StatusChange table

-- Migrate old W_TRAKCIE rows
UPDATE "Submission" SET "status" = 'WERYFIKACJA_KOMPLETNOSCI' WHERE "status" = 'W_TRAKCIE';

-- Add trackingToken (nullable first for existing rows)
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "trackingToken" TEXT;
UPDATE "Submission" SET "trackingToken" = gen_random_uuid()::text WHERE "trackingToken" IS NULL;
ALTER TABLE "Submission" ALTER COLUMN "trackingToken" SET NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "trackingToken" SET DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX IF NOT EXISTS "Submission_trackingToken_key" ON "Submission"("trackingToken");

-- Add iterationCount
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "iterationCount" INTEGER NOT NULL DEFAULT 0;

-- Create StatusChange table
CREATE TABLE IF NOT EXISTS "StatusChange" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StatusChange_submissionId_idx" ON "StatusChange"("submissionId");
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Submission_trackingToken_idx" ON "Submission"("trackingToken");
