-- Phase 7: performance indexes + product visibility support

BEGIN;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order" ("status");
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product" ("isActive");
CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product" ("deletedAt");
CREATE INDEX IF NOT EXISTS "Transaction_orderId_idx" ON "Transaction" ("orderId");

COMMIT;
