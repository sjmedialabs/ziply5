-- Phase 4 shipping and COD settlement additions (additive)
BEGIN;

CREATE TABLE IF NOT EXISTS "CodSettlement" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE,
  "expectedAmount" DECIMAL(10,2) NOT NULL,
  "collectedAmount" DECIMAL(10,2) NOT NULL,
  "settledAmount" DECIMAL(10,2) NOT NULL,
  "varianceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "reconciledById" TEXT,
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CodSettlement_orderId_fkey') THEN
    ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CodSettlement_reconciledById_fkey') THEN
    ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_reconciledById_fkey"
      FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Shipment_orderId_createdAt_idx" ON "Shipment" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "CodSettlement_status_reconciledAt_idx" ON "CodSettlement" ("status", "reconciledAt");

COMMIT;
