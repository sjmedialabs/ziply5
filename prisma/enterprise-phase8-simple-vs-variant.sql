-- Phase 8: Simple vs Variant product architecture hardening
-- Safe migration: adds missing index and integrity guards where possible.

CREATE INDEX IF NOT EXISTS "idx_product_variant_product_id"
  ON "ProductVariant"("productId");

-- Guarantee a single default variant per product.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_variant_default_per_product"
  ON "ProductVariant"("productId")
  WHERE "isDefault" = true;
