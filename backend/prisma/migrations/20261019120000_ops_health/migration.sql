-- Operational health for the admin: how each outside service last answered,
-- and counted events with no personal data.
CREATE TABLE "ServiceHealth" (
    "service" TEXT NOT NULL,
    "lastOkAt" TIMESTAMP(3),
    "lastFailAt" TIMESTAMP(3),
    "failStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceHealth_pkey" PRIMARY KEY ("service")
);

CREATE TABLE "OpsEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpsEvent_kind_createdAt_idx" ON "OpsEvent"("kind", "createdAt");
