-- Second factor for seller accounts and platform admins, plus single-use
-- recovery codes. Written by hand: Prisma 7's migrate dev cannot run
-- non-interactively here.

ALTER TABLE "CompanyUser" ADD COLUMN "totpSecret"      TEXT;
ALTER TABLE "CompanyUser" ADD COLUMN "totpEnabledAt"   TIMESTAMP(3);
ALTER TABLE "CompanyUser" ADD COLUMN "totpLastCounter" INTEGER;

ALTER TABLE "Admin" ADD COLUMN "totpSecret"      TEXT;
ALTER TABLE "Admin" ADD COLUMN "totpEnabledAt"   TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN "totpLastCounter" INTEGER;

CREATE TABLE "RecoveryCode" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "adminId"   TEXT,
  "codeHash"  TEXT NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- A code is spent by hash, so the hash has to be unique platform-wide.
CREATE UNIQUE INDEX "RecoveryCode_codeHash_key" ON "RecoveryCode"("codeHash");
CREATE INDEX "RecoveryCode_userId_usedAt_idx"  ON "RecoveryCode"("userId", "usedAt");
CREATE INDEX "RecoveryCode_adminId_usedAt_idx" ON "RecoveryCode"("adminId", "usedAt");

-- Closing an account takes its recovery codes with it.
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "CompanyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
