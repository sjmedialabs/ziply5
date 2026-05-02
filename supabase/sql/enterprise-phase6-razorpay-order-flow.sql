-- Phase 6: strict payment/cancel/return/refund data model extensions

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status_enum') THEN
    CREATE TYPE refund_status_enum AS ENUM ('PENDING', 'INITIATED', 'COMPLETED');
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "refundStatus" refund_status_enum DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "cancelReason" text,
  ADD COLUMN IF NOT EXISTS "returnReason" text;

ALTER TABLE "Order"
  ALTER COLUMN "paymentStatus" TYPE payment_status_enum
  USING CASE
    WHEN "paymentStatus" IS NULL THEN 'PENDING'::payment_status_enum
    WHEN upper("paymentStatus") IN ('PAID', 'SUCCESS') THEN 'SUCCESS'::payment_status_enum
    WHEN upper("paymentStatus") = 'FAILED' THEN 'FAILED'::payment_status_enum
    WHEN upper("paymentStatus") = 'REFUNDED' THEN 'REFUNDED'::payment_status_enum
    ELSE 'PENDING'::payment_status_enum
  END;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "razorpayPaymentId" text,
  ADD COLUMN IF NOT EXISTS "razorpaySignature" text,
  ADD COLUMN IF NOT EXISTS "refundId" text;

CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order" ("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_refundStatus_idx" ON "Order" ("refundStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_razorpayPaymentId_unique_not_null"
  ON "Transaction" ("razorpayPaymentId")
  WHERE "razorpayPaymentId" IS NOT NULL;

COMMIT;
