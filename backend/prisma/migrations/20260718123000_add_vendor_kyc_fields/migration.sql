ALTER TABLE "vendors"
ADD COLUMN "pan_number" TEXT,
ADD COLUMN "aadhaar_number" TEXT,
ADD COLUMN "address_line" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "postal_code" TEXT,
ADD COLUMN "bank_account_name" TEXT,
ADD COLUMN "bank_account_number" TEXT,
ADD COLUMN "bank_ifsc_code" TEXT,
ADD COLUMN "gst_number" TEXT,
ADD COLUMN "kyc_submitted_at" TIMESTAMP(3),
ADD COLUMN "kyc_reviewed_at" TIMESTAMP(3),
ADD COLUMN "kyc_rejection_reason" TEXT;
