-- Order pricing normalization for ecommerce checkout payload.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shippingCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "couponCode" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "sku" TEXT,
  ADD COLUMN IF NOT EXISTS "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "Order"
SET
  "subtotal" = COALESCE("subtotal", 0),
  "discount" = COALESCE("discount", 0),
  "tax" = COALESCE("tax", 0),
  "shippingCharge" = COALESCE("shippingCharge", COALESCE("shipping", 0)),
  "couponCode" = NULLIF(TRIM(COALESCE("couponCode", '')), '');

UPDATE "OrderItem"
SET
  "subtotal" = COALESCE("subtotal", COALESCE("lineTotal", 0)),
  "tax" = COALESCE("tax", 0),
  "sku" = NULLIF(TRIM(COALESCE("sku", '')), '');
