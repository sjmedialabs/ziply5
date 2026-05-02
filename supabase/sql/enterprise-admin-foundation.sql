-- Enterprise admin foundation (additive, non-destructive)
BEGIN;

-- Additive columns
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "temperatureSensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "minOrderAmount" DECIMAL(10,2);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "maxDiscountAmount" DECIMAL(10,2);
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usageLimitTotal" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "usageLimitPerUser" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "stackable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryMovementType') THEN
    CREATE TYPE "InventoryMovementType" AS ENUM ('in','reserve','release','pick','adjust','writeoff','transfer','returned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutboxStatus') THEN
    CREATE TYPE "OutboxStatus" AS ENUM ('pending','processing','sent','failed','dead');
  END IF;
END $$;

-- Product compliance
CREATE TABLE IF NOT EXISTS "ProductComplianceProfile" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL UNIQUE,
  "ingredients" TEXT,
  "nutritionFacts" JSONB,
  "storageInstructions" TEXT,
  "fssaiDetails" TEXT,
  "allergenInfo" TEXT,
  "ingredientDeclaration" TEXT,
  "complianceState" TEXT NOT NULL DEFAULT 'draft',
  "requiresColdChain" BOOLEAN NOT NULL DEFAULT false,
  "storageTempMin" DECIMAL(5,2),
  "storageTempMax" DECIMAL(5,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductComplianceCertificate" (
  "id" TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "certificateType" TEXT NOT NULL,
  "issuer" TEXT,
  "certificateNumber" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "documentUrl" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bundles/combos
CREATE TABLE IF NOT EXISTS "Bundle" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "pricingMode" TEXT NOT NULL DEFAULT 'fixed',
  "isCombo" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BundleItem" (
  "id" TEXT PRIMARY KEY,
  "bundleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "minSelect" INTEGER NOT NULL DEFAULT 0,
  "maxSelect" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- Warehouses + lots + FIFO movement
CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "region" TEXT,
  "addressLine1" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT NOT NULL DEFAULT 'IN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryStockLot" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "warehouseId" TEXT NOT NULL,
  "batchNo" TEXT NOT NULL,
  "mfgDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qtyReceived" INTEGER NOT NULL,
  "qtyAvailable" INTEGER NOT NULL,
  "qtyReserved" INTEGER NOT NULL DEFAULT 0,
  "costPerUnit" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" TEXT PRIMARY KEY,
  "lotId" TEXT NOT NULL,
  "movementType" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "notes" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Serviceability + ETA
CREATE TABLE IF NOT EXISTS "ServiceabilityZone" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "region" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ServiceabilityRule" (
  "id" TEXT PRIMARY KEY,
  "zoneId" TEXT NOT NULL,
  "pincodePrefix" TEXT,
  "pincodeStart" INTEGER,
  "pincodeEnd" INTEGER,
  "isServiceable" BOOLEAN NOT NULL DEFAULT true,
  "codAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DeliveryEtaRule" (
  "id" TEXT PRIMARY KEY,
  "zoneId" TEXT NOT NULL,
  "minDays" INTEGER NOT NULL,
  "maxDays" INTEGER NOT NULL,
  "cutoffHour" INTEGER,
  "temperatureSensitiveExtraDays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS "AnalyticsDailySalesSnapshot" (
  "id" TEXT PRIMARY KEY,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "region" TEXT,
  "warehouseId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "grossSales" DECIMAL(12,2) NOT NULL,
  "netSales" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL,
  "refundTotal" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer segmentation + campaigns
CREATE TABLE IF NOT EXISTS "CustomerSegment" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ruleJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CustomerSegmentMembership" (
  "segmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("segmentId","userId")
);

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "templateRef" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CampaignExecution" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "providerMsgId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Integration outbox
CREATE TABLE IF NOT EXISTS "IntegrationEndpoint" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "endpointType" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "authConfigJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "IntegrationOutboxEvent" (
  "id" TEXT PRIMARY KEY,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "headers" JSONB,
  "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "IntegrationOutboxAttempt" (
  "id" TEXT PRIMARY KEY,
  "outboxEventId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "attemptNo" INTEGER NOT NULL,
  "responseCode" INTEGER,
  "responseBody" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductComplianceProfile_productId_fkey') THEN
    ALTER TABLE "ProductComplianceProfile" ADD CONSTRAINT "ProductComplianceProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductComplianceCertificate_profileId_fkey') THEN
    ALTER TABLE "ProductComplianceCertificate" ADD CONSTRAINT "ProductComplianceCertificate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProductComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Bundle_productId_fkey') THEN
    ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BundleItem_bundleId_fkey') THEN
    ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BundleItem_productId_fkey') THEN
    ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryStockLot_productId_fkey') THEN
    ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryStockLot_variantId_fkey') THEN
    ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryStockLot_warehouseId_fkey') THEN
    ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryMovement_lotId_fkey') THEN
    ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryStockLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ServiceabilityRule_zoneId_fkey') THEN
    ALTER TABLE "ServiceabilityRule" ADD CONSTRAINT "ServiceabilityRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ServiceabilityZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='DeliveryEtaRule_zoneId_fkey') THEN
    ALTER TABLE "DeliveryEtaRule" ADD CONSTRAINT "DeliveryEtaRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ServiceabilityZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "InventoryStockLot_product_warehouse_expiry_idx" ON "InventoryStockLot" ("productId","warehouseId","expiryDate");
CREATE INDEX IF NOT EXISTS "ServiceabilityRule_zone_idx" ON "ServiceabilityRule" ("zoneId");
CREATE INDEX IF NOT EXISTS "AnalyticsDailySalesSnapshot_date_region_idx" ON "AnalyticsDailySalesSnapshot" ("snapshotDate","region");
CREATE INDEX IF NOT EXISTS "IntegrationOutboxEvent_status_available_idx" ON "IntegrationOutboxEvent" ("status","availableAt");

COMMIT;
