-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('ENTIRE_PROPERTY', 'ROOM_WISE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "property_id" TEXT NOT NULL,
    "room_type_id" TEXT,
    "booking_mode" "BookingMode" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guests" INTEGER NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "total_nights" INTEGER NOT NULL,
    "estimated_total" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "guest_mobile" TEXT,
    "special_request" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "bookings_property_id_status_check_in_check_out_idx" ON "bookings"("property_id", "status", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "bookings_room_type_id_status_check_in_check_out_idx" ON "bookings"("room_type_id", "status", "check_in", "check_out");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
