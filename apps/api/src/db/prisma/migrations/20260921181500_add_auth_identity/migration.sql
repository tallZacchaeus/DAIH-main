-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- Safe backfill of any existing googleId users
INSERT INTO "auth_identities" ("id", "userId", "provider", "providerUserId", "email", "linkedAt")
SELECT gen_random_uuid()::text, "id", 'GOOGLE', "googleId", "email", CURRENT_TIMESTAMP
FROM "users"
WHERE "googleId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropIndex
DROP INDEX IF EXISTS "users_googleId_idx";

-- DropIndex
DROP INDEX IF EXISTS "users_googleId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId";

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider", "providerUserId");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
