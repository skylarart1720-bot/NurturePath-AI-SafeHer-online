CREATE TABLE "SafeherEnrollment" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "secretEncrypted" TEXT, CONSTRAINT "SafeherEnrollment_pkey" PRIMARY KEY ("id"));
CREATE INDEX "SafeherEnrollment_expiresAt_idx" ON "SafeherEnrollment"("expiresAt");
