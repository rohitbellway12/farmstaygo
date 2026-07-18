-- CreateEnum
CREATE TYPE "AmenityGroup" AS ENUM ('POPULAR', 'BASIC', 'OUTDOOR', 'INDOOR', 'SAFETY', 'KITCHEN', 'ENTERTAINMENT', 'ACCESSIBILITY');

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "group" "AmenityGroup" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE INDEX "Amenity_group_isActive_sortOrder_idx" ON "Amenity"("group", "isActive", "sortOrder");
