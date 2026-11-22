-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CompensationReason" AS ENUM ('HIRE', 'PROMOTION', 'MERIT', 'MARKET_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'TERMINATE');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('EMPLOYEE', 'COMPENSATION_ENTRY');

-- CreateTable
CREATE TABLE "FxRate" (
    "currency" CHAR(3) NOT NULL,
    "rateToUsd" DOUBLE PRECISION NOT NULL,
    "asOfDate" DATE NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("currency")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTitle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "jobTitleId" INTEGER NOT NULL,
    "level" SMALLINT NOT NULL,
    "hireDate" DATE NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "terminationDate" DATE,
    "currentBaseSalary" INTEGER NOT NULL,
    "currentTargetBonus" INTEGER NOT NULL,
    "currentCurrency" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationEntry" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "baseSalary" INTEGER NOT NULL,
    "targetBonus" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" "CompensationReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "entityType" "AuditEntity" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_name_key" ON "JobTitle"("name");

-- CreateIndex
CREATE INDEX "JobTitle_departmentId_idx" ON "JobTitle"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_countryCode_jobTitleId_level_idx" ON "Employee"("countryCode", "jobTitleId", "level");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompensationEntry_employeeId_effectiveDate_key" ON "CompensationEntry"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_createdAt_idx" ON "AuditLog"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FxRate"("currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationEntry" ADD CONSTRAINT "CompensationEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written CHECK constraints (Prisma's schema language cannot express these).
-- They guard data integrity even if application code has a bug.

ALTER TABLE "FxRate" ADD CONSTRAINT "FxRate_rateToUsd_positive" CHECK ("rateToUsd" > 0);

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_level_range" CHECK ("level" BETWEEN 1 AND 6);
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentBaseSalary_positive" CHECK ("currentBaseSalary" > 0);
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_currentTargetBonus_non_negative" CHECK ("currentTargetBonus" >= 0);
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_termination_matches_status" CHECK (("status" = 'TERMINATED') = ("terminationDate" IS NOT NULL));
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_termination_after_hire" CHECK ("terminationDate" IS NULL OR "terminationDate" >= "hireDate");

ALTER TABLE "CompensationEntry" ADD CONSTRAINT "CompensationEntry_baseSalary_positive" CHECK ("baseSalary" > 0);
ALTER TABLE "CompensationEntry" ADD CONSTRAINT "CompensationEntry_targetBonus_non_negative" CHECK ("targetBonus" >= 0);
