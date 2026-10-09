-- Companies are approved by hand before their form opens.
ALTER TABLE "Company" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Company" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Company" ADD COLUMN "requestNote" TEXT;

-- Every company that exists today was admitted under open registration and is
-- grandfathered in: closing registration must not close a form that works.
UPDATE "Company" SET "approvedAt" = "createdAt" WHERE "deletedAt" IS NULL;

-- The admin's queue asks for exactly the undecided ones.
CREATE INDEX "Company_pending_access_idx" ON "Company" ("createdAt")
  WHERE "approvedAt" IS NULL AND "rejectedAt" IS NULL AND "deletedAt" IS NULL;
