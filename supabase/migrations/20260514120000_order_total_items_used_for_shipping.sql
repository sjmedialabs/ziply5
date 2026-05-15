-- Pack count used for Ziply5 slab shipping (sum of checkout line quantities; not Shiprocket-derived).
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "totalItemsUsedForShipping" integer;

COMMENT ON COLUMN "Order"."totalItemsUsedForShipping" IS 'Total item/pack quantity used for Ziply5 flat shipping slabs at order time.';
