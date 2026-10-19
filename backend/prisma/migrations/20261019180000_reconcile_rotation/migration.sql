-- The nightly reconcile rotates through open identity checks and reports a
-- stuck one once.
ALTER TABLE "Submission" ADD COLUMN "idReconciledAt" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN "idStuckReportedAt" TIMESTAMP(3);
