-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN "deviceFingerprint" TEXT,
ADD COLUMN "mismatchCount" INTEGER NOT NULL DEFAULT 0;
