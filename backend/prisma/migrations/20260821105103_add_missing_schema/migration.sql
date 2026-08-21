-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AmenityGroup" AS ENUM ('POPULAR', 'BASIC', 'OUTDOOR', 'INDOOR', 'SAFETY', 'KITCHEN', 'ENTERTAINMENT', 'ACCESSIBILITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PropertyBookingType" AS ENUM ('ENTIRE_PROPERTY', 'ROOM_WISE', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable Property Rules
DROP TABLE IF EXISTS "PropertyRuleAssignment" CASCADE;
DROP TABLE IF EXISTS "PropertyRule" CASCADE;
CREATE TABLE "PropertyRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyRule_slug_key" ON "PropertyRule"("slug");
CREATE INDEX "PropertyRule_isActive_sortOrder_idx" ON "PropertyRule"("isActive", "sortOrder");

CREATE TABLE "PropertyRuleAssignment" (
    "propertyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyRuleAssignment_pkey" PRIMARY KEY ("propertyId", "ruleId")
);

CREATE INDEX "PropertyRuleAssignment_ruleId_idx" ON "PropertyRuleAssignment"("ruleId");

ALTER TABLE "PropertyRuleAssignment" ADD CONSTRAINT "PropertyRuleAssignment_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyRuleAssignment" ADD CONSTRAINT "PropertyRuleAssignment_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "PropertyRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Blog Posts
DROP TABLE IF EXISTS "blog_posts" CASCADE;
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_is_published_sort_order_idx" ON "blog_posts"("is_published", "sort_order");

-- CreateTable Wishlists
DROP TABLE IF EXISTS "Wishlist" CASCADE;
DROP TABLE IF EXISTS "wishlists" CASCADE;
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wishlist_userId_propertyId_key" ON "Wishlist"("userId", "propertyId");
CREATE INDEX "Wishlist_userId_idx" ON "Wishlist"("userId");
CREATE INDEX "Wishlist_propertyId_idx" ON "Wishlist"("propertyId");

ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add missing vendor columns
ALTER TABLE "vendors"
    ADD COLUMN IF NOT EXISTS "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "vendors"
    ADD COLUMN IF NOT EXISTS "total_commission" DECIMAL(12,2) NOT NULL DEFAULT 0;
