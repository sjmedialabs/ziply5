-- App code references these columns; baseline migrations did not include them.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "allowReturn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "amazonLink" TEXT;

ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "comboPrice" DECIMAL(10,2);
ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Bundle" ADD COLUMN IF NOT EXISTS "image" TEXT;

CREATE INDEX IF NOT EXISTS "Bundle_isCombo_isActive_idx" ON "Bundle" ("isCombo", "isActive");
