-- Passkeys: origin-bound key pairs, alongside TOTP rather than instead of it.
-- A phishing proxy can relay a password and a six-digit code in real time; it
-- cannot make a passkey sign for a domain it does not own.
CREATE TABLE "Passkey" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT,
  "adminId"      TEXT,
  "credentialId" TEXT NOT NULL,
  "publicKey"    TEXT NOT NULL,
  "counter"      INTEGER NOT NULL DEFAULT 0,
  "transports"   TEXT,
  "name"         TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"   TIMESTAMP(3),
  CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");
CREATE INDEX "Passkey_userId_idx"  ON "Passkey"("userId");
CREATE INDEX "Passkey_adminId_idx" ON "Passkey"("adminId");

ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "CompanyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
