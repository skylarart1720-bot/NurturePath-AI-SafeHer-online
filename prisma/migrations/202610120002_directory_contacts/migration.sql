-- Add public provider contacts; preserve all existing service and clinical records.
ALTER TABLE "SafeherService"
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "serviceCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "accessMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "verificationMethod" TEXT NOT NULL DEFAULT 'RECORDED_REVIEW';
