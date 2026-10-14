-- Additive: preserves every existing maternal-care table and record.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REGISTERED_USER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT_PARTNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTENT_REVIEWER';
CREATE TABLE "SafeherContent" ("slug" TEXT PRIMARY KEY, "lesson" JSONB NOT NULL, "locale" TEXT NOT NULL DEFAULT 'en', "status" TEXT NOT NULL DEFAULT 'DRAFT', "reviewScope" TEXT NOT NULL DEFAULT 'DEMO_ONLY', "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "SafeherService" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "region" TEXT NOT NULL, "category" TEXT NOT NULL, "accessMethod" TEXT NOT NULL, "eligibility" TEXT NOT NULL, "hours" TEXT, "contactUrl" TEXT, "verificationSource" TEXT, "verifiedAt" TIMESTAMP(3), "verifiedBy" TEXT, "synthetic" BOOLEAN NOT NULL DEFAULT true, "partnerId" TEXT, "referralInstructions" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "SafeherProgress" ("userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "slug" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("userId", "slug"));
CREATE TABLE "SafeherFeedback" ("id" TEXT PRIMARY KEY, "category" TEXT NOT NULL, "rating" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "SafeherMetric" ("day" TEXT NOT NULL, "event" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'en', "count" INTEGER NOT NULL DEFAULT 1, PRIMARY KEY ("day", "event", "locale"));
