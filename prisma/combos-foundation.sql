-- Combos foundation (additive, non-destructive)
-- Adds storefront-facing combo fields to the existing Bundle table.
BEGIN;

-- Combo selling price (used when pricingMode = 'fixed').
ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "comboPrice" DECIMAL(10,2);

-- Optional storefront copy.
ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Optional storefront image (URL or uploads-relative path).
ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "image" TEXT;

-- Helpful index for storefront active-combo queries.
CREATE INDEX IF NOT EXISTS "Bundle_isCombo_isActive_idx" ON "Bundle" ("isCombo","isActive");

COMMIT;
