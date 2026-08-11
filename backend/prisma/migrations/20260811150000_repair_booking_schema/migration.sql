-- Booking endpoints depend on these enums/tables/columns. This migration is
-- intentionally idempotent because some live databases already have a partial
-- booking schema from manual syncs.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BookingMode" AS ENUM ('ENTIRE_PROPERTY', 'ROOM_WISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'CASH', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentType" AS ENUM ('RESERVATION', 'INSTALLMENT', 'BALANCE', 'REFUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_APPROVAL';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "PaymentStatus" ADD VALUE 'COMPLETED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Property/room reservation amount columns used by booking calculations.
ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "reservation_amount" DECIMAL(12,2);

ALTER TABLE "RoomType"
    ADD COLUMN IF NOT EXISTS "reservation_amount" DECIMAL(12,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bookings" (
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
    "reservation_amount" DECIMAL(12,2),
    "payment_method" "PaymentMethod",
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_commission" DECIMAL(12,2),
    "vendor_commission" DECIMAL(12,2),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- Repair partial bookings table if it already exists.
ALTER TABLE "bookings"
    ADD COLUMN IF NOT EXISTS "user_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "property_id" TEXT,
    ADD COLUMN IF NOT EXISTS "room_type_id" TEXT,
    ADD COLUMN IF NOT EXISTS "booking_mode" "BookingMode",
    ADD COLUMN IF NOT EXISTS "status" "BookingStatus" DEFAULT 'REQUESTED',
    ADD COLUMN IF NOT EXISTS "check_in" DATE,
    ADD COLUMN IF NOT EXISTS "check_out" DATE,
    ADD COLUMN IF NOT EXISTS "guests" INTEGER,
    ADD COLUMN IF NOT EXISTS "rooms" INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "total_nights" INTEGER,
    ADD COLUMN IF NOT EXISTS "estimated_total" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS "guest_name" TEXT,
    ADD COLUMN IF NOT EXISTS "guest_email" TEXT,
    ADD COLUMN IF NOT EXISTS "guest_mobile" TEXT,
    ADD COLUMN IF NOT EXISTS "special_request" TEXT,
    ADD COLUMN IF NOT EXISTS "reservation_amount" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod",
    ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "admin_commission" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "vendor_commission" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Backfill nullable columns before tightening constraints.
UPDATE "bookings" SET
    "booking_mode" = COALESCE("booking_mode", 'ENTIRE_PROPERTY'::"BookingMode"),
    "status" = COALESCE("status", 'REQUESTED'::"BookingStatus"),
    "rooms" = COALESCE("rooms", 1),
    "currency" = COALESCE("currency", 'INR'),
    "payment_status" = COALESCE("payment_status", 'PENDING'),
    "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Repair partial payments table if it already exists.
ALTER TABLE "payments"
    ADD COLUMN IF NOT EXISTS "booking_id" TEXT,
    ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod",
    ADD COLUMN IF NOT EXISTS "payment_type" "PaymentType",
    ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "transaction_id" TEXT,
    ADD COLUMN IF NOT EXISTS "notes" TEXT,
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

UPDATE "payments" SET
    "status" = COALESCE("status", 'PENDING'::"PaymentStatus"),
    "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_commissions" (
    "id" TEXT NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "booking_id" TEXT NOT NULL,
    "booking_amount" DECIMAL(12,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "vendor_earning" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_commissions_pkey" PRIMARY KEY ("id")
);

-- Repair partial vendor commission table if it already exists.
ALTER TABLE "vendor_commissions"
    ADD COLUMN IF NOT EXISTS "vendor_id" INTEGER,
    ADD COLUMN IF NOT EXISTS "booking_id" TEXT,
    ADD COLUMN IF NOT EXISTS "booking_amount" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "vendor_earning" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "status" "CommissionStatus" DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

UPDATE "vendor_commissions" SET
    "status" = COALESCE("status", 'PENDING'::"CommissionStatus"),
    "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP),
    "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_property_id_status_check_in_check_out_idx" ON "bookings"("property_id", "status", "check_in", "check_out");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_room_type_id_status_check_in_check_out_idx" ON "bookings"("room_type_id", "status", "check_in", "check_out");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_commissions_vendor_id_status_idx" ON "vendor_commissions"("vendor_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_commissions_booking_id_idx" ON "vendor_commissions"("booking_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "Property"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_room_type_id_fkey"
    FOREIGN KEY ("room_type_id") REFERENCES "RoomType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "payments"
    ADD CONSTRAINT "payments_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "vendor_commissions"
    ADD CONSTRAINT "vendor_commissions_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "vendor_commissions"
    ADD CONSTRAINT "vendor_commissions_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
