ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "shiprocketOrderId" text,
  ADD COLUMN IF NOT EXISTS "shiprocketShipmentId" text,
  ADD COLUMN IF NOT EXISTS "awbCode" text,
  ADD COLUMN IF NOT EXISTS "courierId" text,
  ADD COLUMN IF NOT EXISTS "pickupStatus" text,
  ADD COLUMN IF NOT EXISTS "trackingUrl" text,
  ADD COLUMN IF NOT EXISTS "shippingLabelUrl" text,
  ADD COLUMN IF NOT EXISTS "manifestUrl" text,
  ADD COLUMN IF NOT EXISTS "lastSyncAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "courierName" text,
  ADD COLUMN IF NOT EXISTS "courierCompanyId" text,
  ADD COLUMN IF NOT EXISTS "freightCharges" numeric,
  ADD COLUMN IF NOT EXISTS "shippingStatus" text,
  ADD COLUMN IF NOT EXISTS "shippingStatusCode" integer,
  ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" timestamptz,
  ADD COLUMN IF NOT EXISTS "awbAssignedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "currentStatus" text,
  ADD COLUMN IF NOT EXISTS "currentStatusId" integer,
  ADD COLUMN IF NOT EXISTS "trackingRawResponse" jsonb,
  ADD COLUMN IF NOT EXISTS "rawShiprocketResponse" jsonb,
  ADD COLUMN IF NOT EXISTS "lastTrackingSyncAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "pickupDate" timestamptz,
  ADD COLUMN IF NOT EXISTS "deliveredDate" timestamptz,
  ADD COLUMN IF NOT EXISTS "origin" text,
  ADD COLUMN IF NOT EXISTS "destination" text;

CREATE TABLE IF NOT EXISTS "ShipmentTrackingEvent" (
  "id" text PRIMARY KEY,
  "shipmentId" text NOT NULL,
  "awbCode" text NOT NULL,
  "status" text,
  "statusCode" integer,
  "activity" text,
  "location" text,
  "activityDate" timestamptz,
  "rawEvent" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ShipmentTrackingEvent_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShipmentTrackingEvent_unique_event"
  ON "ShipmentTrackingEvent" ("shipmentId", "awbCode", "statusCode", "activityDate");
