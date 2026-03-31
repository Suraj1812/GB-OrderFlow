-- AlterTable
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN "resetTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "User_lockedUntil_idx" ON "User"("lockedUntil");
