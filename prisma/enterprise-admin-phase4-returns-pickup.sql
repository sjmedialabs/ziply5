-- Phase 4 return pickup and receiving details (additive)
BEGIN;

CREATE TABLE IF NOT EXISTS "ReturnRequestItem" (
  "id" TEXT PRIMARY KEY,
  "returnRequestId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "requestedQty" INTEGER NOT NULL,
  "receivedQty" INTEGER NOT NULL DEFAULT 0,
  "reasonCode" TEXT,
  "conditionStatus" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRequestItem_returnRequestId_orderItemId_key" UNIQUE ("returnRequestId","orderItemId")
);

CREATE TABLE IF NOT EXISTS "ReturnPickup" (
  "id" TEXT PRIMARY KEY,
  "returnRequestId" TEXT NOT NULL UNIQUE,
  "pickupDate" TIMESTAMP(3) NOT NULL,
  "timeSlot" TEXT,
  "carrier" TEXT,
  "trackingRef" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ReturnRequestItem_returnRequestId_fkey') THEN
    ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey"
      FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ReturnRequestItem_orderItemId_fkey') THEN
    ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_orderItemId_fkey"
      FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ReturnPickup_returnRequestId_fkey') THEN
    ALTER TABLE "ReturnPickup" ADD CONSTRAINT "ReturnPickup_returnRequestId_fkey"
      FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ReturnRequestItem_returnRequestId_idx" ON "ReturnRequestItem" ("returnRequestId");
CREATE INDEX IF NOT EXISTS "ReturnPickup_pickupDate_status_idx" ON "ReturnPickup" ("pickupDate","status");

COMMIT;
