-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OverrideCategory" AS ENUM ('VIES', 'IDENTITY', 'SUBSTANCE');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'EMPLOYEE_PLUS', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('PASSPORT', 'ID_CARD');

-- CreateEnum
CREATE TYPE "IdVerificationStatus" AS ENUM ('NOT_CHECKED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'DECLINED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ViesStatus" AS ENUM ('VALID', 'INVALID', 'ERROR', 'NOT_CHECKED');

-- CreateEnum
CREATE TYPE "ViesAddressMatch" AS ENUM ('NOT_CHECKED', 'UNAVAILABLE', 'MATCH', 'PARTIAL', 'MISMATCH');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "SubstanceCheckStatus" AS ENUM ('NOT_CHECKED', 'PENDING', 'OK', 'FLAGGED', 'ERROR');

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "buyerType" "BuyerType" NOT NULL DEFAULT 'COMPANY',
    "substances" TEXT NOT NULL,
    "casNumbers" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "idDocumentName" TEXT,
    "idDocumentType" "IdDocumentType",
    "idDocumentNumber" TEXT,
    "idDataCollectedAt" TIMESTAMP(3),
    "idMrzValid" BOOLEAN,
    "idLikelySynthetic" BOOLEAN,
    "idDocumentExpiry" TIMESTAMP(3),
    "idVerificationSessionId" TEXT,
    "idVerificationStatus" "IdVerificationStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "idLivenessPassed" BOOLEAN,
    "idFaceMatch" BOOLEAN,
    "idVerificationWarnings" TEXT,
    "idVerificationCheckedAt" TIMESTAMP(3),
    "idVerificationPurged" BOOLEAN NOT NULL DEFAULT false,
    "viesStatus" "ViesStatus" NOT NULL,
    "viesName" TEXT,
    "viesAddress" TEXT,
    "viesAddressMatch" "ViesAddressMatch" NOT NULL DEFAULT 'NOT_CHECKED',
    "substanceCheckStatus" "SubstanceCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "substanceCheckNote" TEXT,
    "substanceCheckedAt" TIMESTAMP(3),
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionOverride" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "category" "OverrideCategory" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "formConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'EMPLOYEE',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAccess" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_idVerificationSessionId_key" ON "Submission"("idVerificationSessionId");

-- CreateIndex
CREATE INDEX "Submission_companyId_createdAt_idx" ON "Submission"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_companyId_status_idx" ON "Submission"("companyId", "status");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_idDataCollectedAt_idx" ON "Submission"("idDataCollectedAt");

-- CreateIndex
CREATE INDEX "SubmissionOverride_submissionId_idx" ON "SubmissionOverride"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_email_key" ON "CompanyUser"("email");

-- CreateIndex
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");

-- CreateIndex
CREATE INDEX "CompanyMember_companyId_idx" ON "CompanyMember"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvite_token_key" ON "CompanyInvite"("token");

-- CreateIndex
CREATE INDEX "CompanyInvite_companyId_idx" ON "CompanyInvite"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "SupportAccess_companyId_createdAt_idx" ON "SupportAccess"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionOverride" ADD CONSTRAINT "SubmissionOverride_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CompanyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

