-- =============================================
-- Migration: Add reviews table and services column
-- =============================================

-- 1. Create ReviewStatus enum
DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- 3. Create indexes for reviews
CREATE INDEX IF NOT EXISTS "reviews_property_id_status_idx" ON "reviews"("property_id", "status");
CREATE INDEX IF NOT EXISTS "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- 4. Add foreign key for reviews
ALTER TABLE "reviews" 
    ADD CONSTRAINT "reviews_property_id_fkey" 
    FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE;

-- 5. Add services column to Property table
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT ARRAY[]::TEXT[];
