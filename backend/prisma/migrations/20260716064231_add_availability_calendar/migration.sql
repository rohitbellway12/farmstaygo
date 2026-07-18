-- CreateTable
CREATE TABLE "PropertyAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "blockedRooms" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyAvailabilityBlock_date_idx" ON "PropertyAvailabilityBlock"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAvailabilityBlock_propertyId_date_key" ON "PropertyAvailabilityBlock"("propertyId", "date");

-- CreateIndex
CREATE INDEX "RoomAvailabilityBlock_date_idx" ON "RoomAvailabilityBlock"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAvailabilityBlock_roomTypeId_date_key" ON "RoomAvailabilityBlock"("roomTypeId", "date");

-- AddForeignKey
ALTER TABLE "PropertyAvailabilityBlock" ADD CONSTRAINT "PropertyAvailabilityBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAvailabilityBlock" ADD CONSTRAINT "RoomAvailabilityBlock_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
