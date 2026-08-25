-- Create unique index on booking_id to prevent duplicate commissions per booking
-- Using CONCURRENTLY requires superuser, so we use a standard unique index
-- First, clean up any existing duplicates (already done manually)
CREATE UNIQUE INDEX IF NOT EXISTS vendor_commissions_booking_id_unique
ON vendor_commissions (booking_id);
