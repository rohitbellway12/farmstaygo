-- AlterTable
ALTER TABLE "vendor_commissions" ADD COLUMN IF NOT EXISTS "transaction_id" TEXT;
ALTER TABLE "vendor_commissions" ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod";
ALTER TABLE "vendor_commissions" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "vendor_commissions" ADD COLUMN IF NOT EXISTS "paid_by_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
