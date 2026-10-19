-- Announcements of new or replaced sub-processors, as the DPA promises.
CREATE TABLE "SubprocessorNotice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubprocessorNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubprocessorNotice_effectiveAt_idx" ON "SubprocessorNotice"("effectiveAt");
