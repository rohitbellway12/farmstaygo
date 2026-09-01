-- AlterTable: add missing property policy columns
ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT,
    ADD COLUMN IF NOT EXISTS "termsConditions" TEXT;
