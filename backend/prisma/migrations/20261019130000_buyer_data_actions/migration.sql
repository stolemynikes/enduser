-- A record of sellers answering buyers' access and erasure requests: who,
-- when and how many statements, never which buyer.
CREATE TYPE "BuyerDataKind" AS ENUM ('EXPORT', 'ERASURE');

CREATE TABLE "BuyerDataAction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "adminId" TEXT,
    "kind" "BuyerDataKind" NOT NULL,
    "statements" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerDataAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BuyerDataAction_companyId_createdAt_idx" ON "BuyerDataAction"("companyId", "createdAt");
