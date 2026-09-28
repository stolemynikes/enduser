-- Session integrity: tokens issued before sessionsValidFrom are refused, so a
-- password reset ends sessions that were already open.
ALTER TABLE "CompanyUser" ADD COLUMN "sessionsValidFrom" TIMESTAMP(3);
ALTER TABLE "CompanyUser" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CompanyUser" ADD COLUMN "lockedUntil" TIMESTAMP(3);

ALTER TABLE "Admin" ADD COLUMN "sessionsValidFrom" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Admin" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Invites move from a cuid() token (structured, partly predictable, stored raw)
-- to the SHA-256 of a 32-byte random value. Existing invites keep working:
-- their raw token is hashed in place rather than invalidated.
ALTER TABLE "CompanyInvite" ADD COLUMN "tokenHash" TEXT;
UPDATE "CompanyInvite" SET "tokenHash" = encode(sha256("token"::bytea), 'hex');
DELETE FROM "CompanyInvite" WHERE "tokenHash" IS NULL;
ALTER TABLE "CompanyInvite" ALTER COLUMN "tokenHash" SET NOT NULL;
CREATE UNIQUE INDEX "CompanyInvite_tokenHash_key" ON "CompanyInvite"("tokenHash");
DROP INDEX IF EXISTS "CompanyInvite_token_key";
ALTER TABLE "CompanyInvite" DROP COLUMN "token";

-- Verification capacity is budgeted per address and per tenant instead of one
-- global bucket that any caller could fill.
ALTER TABLE "VerificationSession" ADD COLUMN "ipHash" TEXT;
CREATE INDEX "VerificationSession_ipHash_expiresAt_idx" ON "VerificationSession"("ipHash", "expiresAt");
CREATE INDEX "VerificationSession_companyId_expiresAt_idx" ON "VerificationSession"("companyId", "expiresAt");

-- Rate-limit counters, previously per-process memory.
CREATE TABLE "RateLimitHit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key","windowStart")
);
CREATE INDEX "RateLimitHit_expiresAt_idx" ON "RateLimitHit"("expiresAt");

-- Outbound mail budget per recipient.
CREATE TABLE "MailBudget" (
    "id" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailBudget_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MailBudget_recipientHash_kind_sentAt_idx" ON "MailBudget"("recipientHash", "kind", "sentAt");
CREATE INDEX "MailBudget_sentAt_idx" ON "MailBudget"("sentAt");
