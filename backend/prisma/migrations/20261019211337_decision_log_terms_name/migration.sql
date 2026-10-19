-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "idNameMatches" BOOLEAN,
ADD COLUMN     "termsText" TEXT,
ADD COLUMN     "termsUrl" TEXT;

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "submissionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT,
    "byId" TEXT NOT NULL,
    "byName" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DecisionLog_companyId_at_idx" ON "DecisionLog"("companyId", "at");

-- CreateIndex
CREATE INDEX "DecisionLog_submissionId_idx" ON "DecisionLog"("submissionId");
