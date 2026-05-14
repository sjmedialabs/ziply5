-- Shipment: customer cancellation audit (Shiprocket cancel response + timestamp)
ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "cancelledAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "shiprocketCancelResponse" jsonb;
