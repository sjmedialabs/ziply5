-- ReturnRequest: product line + customer return metadata + Shiprocket reverse + lifecycle timestamps
ALTER TABLE "ReturnRequest"
  ADD COLUMN IF NOT EXISTS "productId" text,
  ADD COLUMN IF NOT EXISTS "imageUrl" text,
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "videoUrl" text,
  ADD COLUMN IF NOT EXISTS "images" jsonb,
  ADD COLUMN IF NOT EXISTS "returnType" text,
  ADD COLUMN IF NOT EXISTS "refundMethod" text,
  ADD COLUMN IF NOT EXISTS "upiId" text,
  ADD COLUMN IF NOT EXISTS "bankDetails" jsonb,
  ADD COLUMN IF NOT EXISTS "adminNote" text,
  ADD COLUMN IF NOT EXISTS "rejectionReason" text,
  ADD COLUMN IF NOT EXISTS "shipmentId" text,
  ADD COLUMN IF NOT EXISTS "reverseShipmentId" text,
  ADD COLUMN IF NOT EXISTS "reverseAwb" text,
  ADD COLUMN IF NOT EXISTS "reverseCourier" text,
  ADD COLUMN IF NOT EXISTS "reverseTrackingUrl" text,
  ADD COLUMN IF NOT EXISTS "reverseRawResponse" jsonb,
  ADD COLUMN IF NOT EXISTS "reverseTrackingData" jsonb,
  ADD COLUMN IF NOT EXISTS "lastReverseTrackingSyncAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "requestedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "approvedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "rejectedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "pickupScheduledAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "completedAt" timestamptz;

-- ReturnPickup: mirror reverse AWB for ops visibility (optional; ReturnRequest holds canonical reverse fields)
ALTER TABLE "ReturnPickup"
  ADD COLUMN IF NOT EXISTS "reverseAwb" text,
  ADD COLUMN IF NOT EXISTS "reverseShiprocketResponse" jsonb;
