-- One row per time an identity document number was looked at. The number no
-- longer travels with any query; it comes back from a mutation that demands a
-- fresh second factor and records the access here.
CREATE TABLE "RevealLog" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "userName"     TEXT NOT NULL,
  "sessionId"    TEXT,
  "adminId"      TEXT,
  "at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevealLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevealLog_companyId_at_idx" ON "RevealLog"("companyId", "at");
CREATE INDEX "RevealLog_submissionId_idx" ON "RevealLog"("submissionId");
