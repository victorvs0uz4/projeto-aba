-- AlterTable
ALTER TABLE "User" ADD COLUMN "resetPasswordToken" TEXT,
ADD COLUMN "resetPasswordExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordToken_key" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "User_resetPasswordToken_idx" ON "User"("resetPasswordToken");
