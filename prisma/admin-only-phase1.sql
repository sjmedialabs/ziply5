-- Admin-only refactor (phase 1, non-destructive)
-- 1) Keep legacy seller columns for compatibility.
-- 2) Introduce createdById/managedById ownership columns.
-- 3) Backfill ownership from legacy sellerId where present.

BEGIN;

-- Product ownership fields
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "managedById" TEXT;
ALTER TABLE "Product" ALTER COLUMN "sellerId" DROP NOT NULL;

-- Order ownership fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "managedById" TEXT;

-- Inventory ownership fields
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "managedById" TEXT;

-- Payout/withdrawal ownership fields
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "managedById" TEXT;
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "sellerId" DROP NOT NULL;

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_createdById_fkey'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_managedById_fkey'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_managedById_fkey"
      FOREIGN KEY ("managedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_createdById_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_managedById_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_managedById_fkey"
      FOREIGN KEY ("managedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_managedById_fkey'
  ) THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_managedById_fkey"
      FOREIGN KEY ("managedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithdrawalRequest_createdById_fkey'
  ) THEN
    ALTER TABLE "WithdrawalRequest"
      ADD CONSTRAINT "WithdrawalRequest_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithdrawalRequest_managedById_fkey'
  ) THEN
    ALTER TABLE "WithdrawalRequest"
      ADD CONSTRAINT "WithdrawalRequest_managedById_fkey"
      FOREIGN KEY ("managedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for ownership columns
CREATE INDEX IF NOT EXISTS "Product_createdById_idx" ON "Product" ("createdById");
CREATE INDEX IF NOT EXISTS "Product_managedById_idx" ON "Product" ("managedById");
CREATE INDEX IF NOT EXISTS "Order_createdById_idx" ON "Order" ("createdById");
CREATE INDEX IF NOT EXISTS "Order_managedById_idx" ON "Order" ("managedById");
CREATE INDEX IF NOT EXISTS "InventoryItem_managedById_idx" ON "InventoryItem" ("managedById");
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_createdById_idx" ON "WithdrawalRequest" ("createdById");
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_managedById_idx" ON "WithdrawalRequest" ("managedById");

-- Choose one default admin for historical mapping
WITH default_admin AS (
  SELECT u."id"
  FROM "User" u
  JOIN "UserRole" ur ON ur."userId" = u."id"
  JOIN "Role" r ON r."id" = ur."roleId"
  WHERE r."key" IN ('super_admin', 'admin')
  ORDER BY CASE WHEN r."key" = 'super_admin' THEN 0 ELSE 1 END, u."createdAt" ASC
  LIMIT 1
)
UPDATE "Product" p
SET
  "createdById" = COALESCE(p."createdById", p."sellerId", da."id"),
  "managedById" = COALESCE(p."managedById", p."sellerId", da."id")
FROM default_admin da
WHERE p."createdById" IS NULL OR p."managedById" IS NULL;

WITH default_admin AS (
  SELECT u."id"
  FROM "User" u
  JOIN "UserRole" ur ON ur."userId" = u."id"
  JOIN "Role" r ON r."id" = ur."roleId"
  WHERE r."key" IN ('super_admin', 'admin')
  ORDER BY CASE WHEN r."key" = 'super_admin' THEN 0 ELSE 1 END, u."createdAt" ASC
  LIMIT 1
)
UPDATE "WithdrawalRequest" w
SET
  "createdById" = COALESCE(w."createdById", w."sellerId", da."id"),
  "managedById" = COALESCE(w."managedById", w."sellerId", da."id")
FROM default_admin da
WHERE w."createdById" IS NULL OR w."managedById" IS NULL;

COMMIT;
