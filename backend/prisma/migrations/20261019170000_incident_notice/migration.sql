-- Messages to company owners about a security incident, and when they went.
CREATE TABLE "IncidentNotice" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "allCompanies" BOOLEAN NOT NULL,
    "companies" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentNotice_pkey" PRIMARY KEY ("id")
);
