-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN "cnpj" TEXT,
ADD COLUMN "reactivatedAt" TIMESTAMP(3),
ADD COLUMN "status" "ClinicStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "suspendReason" TEXT,
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedBy" TEXT;

-- CreateTable
CREATE TABLE "ClinicStatusHistory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicStatusHistory_clinicId_idx" ON "ClinicStatusHistory"("clinicId");

-- AddForeignKey
ALTER TABLE "ClinicStatusHistory" ADD CONSTRAINT "ClinicStatusHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
