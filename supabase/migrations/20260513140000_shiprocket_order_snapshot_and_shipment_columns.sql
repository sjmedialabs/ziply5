-- Order: extended Shiprocket snapshot fields for website/admin hydration
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingStatusCode" integer,
  ADD COLUMN IF NOT EXISTS "awbAssignedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "labelUrl" text,
  ADD COLUMN IF NOT EXISTS "pickupGeneratedAt" timestamptz;

-- Shipment: columns referenced by sync / persistExtendedShipmentFields / tracking
ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "trackingData" jsonb,
  ADD COLUMN IF NOT EXISTS "isPickupGenerated" boolean,
  ADD COLUMN IF NOT EXISTS "pickupGeneratedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "routingCode" text,
  ADD COLUMN IF NOT EXISTS "rtoRoutingCode" text,
  ADD COLUMN IF NOT EXISTS "transporterName" text,
  ADD COLUMN IF NOT EXISTS "transporterId" text,
  ADD COLUMN IF NOT EXISTS "appliedWeight" numeric,
  ADD COLUMN IF NOT EXISTS "assignedDateTime" timestamptz,
  ADD COLUMN IF NOT EXISTS "invoiceNo" text,
  ADD COLUMN IF NOT EXISTS "labelUrl" text;
