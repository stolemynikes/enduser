-- Duplicate-detection fingerprints on Submission, and the dashboard's
-- notification stream. Written by hand: Prisma 7's migrate dev cannot run
-- non-interactively here, and the baseline is squashed.

-- Deterministic fingerprints. Nullable and left NULL on existing rows: the
-- value they are derived from is encrypted with a random IV, so there is no way
-- to compute them in SQL. Rows written from now on carry them; older rows
-- simply never match, which is the correct answer rather than a wrong one.
ALTER TABLE "Submission" ADD COLUMN "idDocumentNumberHash" TEXT;
ALTER TABLE "Submission" ADD COLUMN "vatNumberHash" TEXT;
ALTER TABLE "Submission" ADD COLUMN "substanceKeyHash" TEXT;

CREATE INDEX "Submission_companyId_idDocumentNumberHash_idx"
  ON "Submission"("companyId", "idDocumentNumberHash");
CREATE INDEX "Submission_companyId_vatNumberHash_idx"
  ON "Submission"("companyId", "vatNumberHash");
CREATE INDEX "Submission_companyId_substanceKeyHash_idx"
  ON "Submission"("companyId", "substanceKeyHash");

CREATE TYPE "NotificationKind" AS ENUM (
  'SUBMISSION_RECEIVED',
  'SUBSTANCE_FLAGGED',
  'VIES_INVALID',
  'IDENTITY_DECLINED',
  'DOCUMENT_EXPIRING',
  'DUPLICATE_SEEN',
  'ROLE_CHANGED',
  'INVITE_ACCEPTED',
  'SUPPORT_ACCESS'
);

CREATE TABLE "Notification" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "userId"       TEXT,
  "kind"         "NotificationKind" NOT NULL,
  "title"        TEXT NOT NULL,
  "body"         TEXT,
  "submissionId" TEXT,
  "readAt"       TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");
CREATE INDEX "Notification_companyId_userId_readAt_idx" ON "Notification"("companyId", "userId", "readAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
