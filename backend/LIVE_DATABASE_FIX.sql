-- =============================================
-- FARMSTAYGO LIVE DATABASE FIX
-- Run this SQL directly on your live database
-- =============================================

-- 1. Create reviews table (if not exists)
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- 2. Create indexes for reviews
CREATE INDEX IF NOT EXISTS "reviews_property_id_status_idx" ON "reviews"("property_id", "status");
CREATE INDEX IF NOT EXISTS "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- 3. Add foreign key for reviews (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_property_id_fkey'
    THEN
        ALTER TABLE "reviews" 
        ADD CONSTRAINT "reviews_property_id_fkey" 
        FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add services column to Property (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Property' AND column_name = 'services'
    THEN
        ALTER TABLE "Property" ADD COLUMN services TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 5. Add ReviewStatus enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ReviewStatus'
    THEN
        CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 6. Verify tables exist
SELECT 'reviews table exists' as check_name 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews');

SELECT 'services column exists' as check_name 
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Property' AND column_name = 'services');
