-- AlterTable
ALTER TABLE "DecisionLog" ADD COLUMN     "fromStatus" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "toStatus" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "idCheckSealed" TEXT,
ADD COLUMN     "submittedFirstName" TEXT,
ADD COLUMN     "submittedLastName" TEXT;

-- CreateTable
CREATE TABLE "SpentToken" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpentToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "SpentToken_expiresAt_idx" ON "SpentToken"("expiresAt");
