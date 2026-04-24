-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variant');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('in_stock', 'out_of_stock');

-- CreateEnum
CREATE TYPE "SpiceLevel" AS ENUM ('mild', 'medium', 'hot', 'extra_hot');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'packed', 'returned');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('in', 'reserve', 'release', 'pick', 'adjust', 'writeoff', 'transfer', 'returned');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'sent', 'failed', 'dead');

-- CreateEnum
CREATE TYPE "PromotionKind" AS ENUM ('FLASH_SALE', 'CLEARANCE', 'FEATURED_DEAL', 'FEATURED_ONLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "externalRef" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "AttributeDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributeDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequestItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "reasonCode" TEXT,
    "conditionStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnPickup" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT,
    "carrier" TEXT,
    "trackingRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "email" TEXT,
    "itemsJson" JSONB NOT NULL,
    "total" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionVariant" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "PromotionVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kind" "PromotionKind" NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "managedById" TEXT,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "basePrice" DECIMAL(10,2),
    "discountPercent" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metaDescription" TEXT,
    "metaTitle" TEXT,
    "salePrice" DECIMAL(10,2),
    "shelfLife" TEXT,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'in_stock',
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "thumbnail" TEXT,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "type" "ProductType" NOT NULL DEFAULT 'variant',
    "createdById" TEXT,
    "managedById" TEXT,
    "temperatureSensitive" BOOLEAN NOT NULL DEFAULT false,
    "preparationType" TEXT,
    "spiceLevel" "SpiceLevel",
    "weight" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountPercent" DECIMAL(5,2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "mrp" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weight" TEXT,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFeature" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "ProductFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLabel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "ProductLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDetailSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductDetailSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSeo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "canonicalUrl" TEXT,

    CONSTRAINT "ProductSeo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouse" TEXT,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "managedById" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shipping" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "appliedCouponId" TEXT,
    "managedById" TEXT,
    "customerAddress" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "paymentId" TEXT,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "description" TEXT,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minOrderAmount" DECIMAL(10,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "usageLimitTotal" INTEGER,
    "usageLimitPerUser" INTEGER,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "contentJson" JSONB NOT NULL,

    CONSTRAINT "CmsSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComplianceProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductComplianceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComplianceCertificate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL,
    "issuer" TEXT,
    "certificateNumber" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "documentUrl" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductComplianceCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'fixed',
    "isCombo" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockLot" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reasonCode" TEXT,
    "notes" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shipmentNo" TEXT,
    "carrier" TEXT,
    "trackingNo" TEXT,
    "shipmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "gstin" TEXT,
    "taxableAmount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodSettlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(10,2) NOT NULL,
    "collectedAmount" DECIMAL(10,2) NOT NULL,
    "settledAmount" DECIMAL(10,2) NOT NULL,
    "varianceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "reconciledById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailySalesSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "region" TEXT,
    "warehouseId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "grossSales" DECIMAL(12,2) NOT NULL,
    "netSales" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL,
    "refundTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsDailySalesSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailyProductSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "unitsSold" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL,
    "returns" INTEGER NOT NULL DEFAULT 0,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsDailyProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsJobRun" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastSuccessAt" TIMESTAMP(3),
    "watermark" TEXT,
    "errorMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSegment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSegmentMembership" (
    "segmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSegmentMembership_pkey" PRIMARY KEY ("segmentId","userId")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "templateRef" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignExecution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerMsgId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEndpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpointType" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "authConfigJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationOutboxEvent" (
    "id" TEXT NOT NULL,
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
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationOutboxAttempt" (
    "id" TEXT NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationOutboxAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceabilityZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceabilityZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceabilityRule" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "pincodePrefix" TEXT,
    "pincodeStart" INTEGER,
    "pincodeEnd" INTEGER,
    "isServiceable" BOOLEAN NOT NULL DEFAULT true,
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEtaRule" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "cutoffHour" INTEGER,
    "temperatureSensitiveExtraDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEtaRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_phone_key" ON "UserProfile"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_consumedAt_expiresAt_idx" ON "OtpChallenge"("phone", "consumedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDef_slug_key" ON "AttributeDef"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "ProductAttributeValue"("productId", "attributeId");

-- CreateIndex
CREATE INDEX "ReturnRequestItem_returnRequestId_idx" ON "ReturnRequestItem"("returnRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequestItem_returnRequestId_orderItemId_key" ON "ReturnRequestItem"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnPickup_returnRequestId_key" ON "ReturnPickup"("returnRequestId");

-- CreateIndex
CREATE INDEX "ReturnPickup_pickupDate_status_idx" ON "ReturnPickup"("pickupDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_sessionKey_key" ON "AbandonedCart"("sessionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionProduct_promotionId_productId_key" ON "PromotionProduct"("promotionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionVariant_promotionId_variantId_key" ON "PromotionVariant"("promotionId", "variantId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_createdById_idx" ON "WithdrawalRequest"("createdById");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_managedById_idx" ON "WithdrawalRequest"("managedById");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_createdById_idx" ON "Product"("createdById");

-- CreateIndex
CREATE INDEX "Product_managedById_idx" ON "Product"("managedById");

-- CreateIndex
CREATE INDEX "idx_product_sections_product_id" ON "product_sections"("product_id");

-- CreateIndex
CREATE INDEX "idx_product_sections_product_sort" ON "product_sections"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSeo_productId_key" ON "ProductSeo"("productId");

-- CreateIndex
CREATE INDEX "InventoryItem_managedById_idx" ON "InventoryItem"("managedById");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "Order_managedById_idx" ON "Order"("managedById");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_group_key_key" ON "Setting"("group", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComplianceProfile_productId_key" ON "ProductComplianceProfile"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_productId_key" ON "Bundle"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_slug_key" ON "Bundle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "InventoryStockLot_product_warehouse_expiry_idx" ON "InventoryStockLot"("productId", "warehouseId", "expiryDate");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_order_changedAt_idx" ON "OrderStatusHistory"("orderId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_orderId_createdAt_idx" ON "Shipment"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "CodSettlement_orderId_key" ON "CodSettlement"("orderId");

-- CreateIndex
CREATE INDEX "CodSettlement_status_reconciledAt_idx" ON "CodSettlement"("status", "reconciledAt");

-- CreateIndex
CREATE INDEX "AnalyticsDailySalesSnapshot_date_region_idx" ON "AnalyticsDailySalesSnapshot"("snapshotDate", "region");

-- CreateIndex
CREATE INDEX "AnalyticsDailyProductSnapshot_date_product_idx" ON "AnalyticsDailyProductSnapshot"("snapshotDate", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsJobRun_jobKey_key" ON "AnalyticsJobRun"("jobKey");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSegment_key_key" ON "CustomerSegment"("key");

-- CreateIndex
CREATE INDEX "IntegrationOutboxEvent_status_available_idx" ON "IntegrationOutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "ServiceabilityRule_zone_idx" ON "ServiceabilityRule"("zoneId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnPickup" ADD CONSTRAINT "ReturnPickup_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionVariant" ADD CONSTRAINT "PromotionVariant_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionVariant" ADD CONSTRAINT "PromotionVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRecord" ADD CONSTRAINT "RefundRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sections" ADD CONSTRAINT "product_sections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFeature" ADD CONSTRAINT "ProductFeature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLabel" ADD CONSTRAINT "ProductLabel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDetailSection" ADD CONSTRAINT "ProductDetailSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSeo" ADD CONSTRAINT "ProductSeo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSection" ADD CONSTRAINT "CmsSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComplianceProfile" ADD CONSTRAINT "ProductComplianceProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComplianceCertificate" ADD CONSTRAINT "ProductComplianceCertificate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProductComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockLot" ADD CONSTRAINT "InventoryStockLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryStockLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsDailyProductSnapshot" ADD CONSTRAINT "AnalyticsDailyProductSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceabilityRule" ADD CONSTRAINT "ServiceabilityRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ServiceabilityZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEtaRule" ADD CONSTRAINT "DeliveryEtaRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ServiceabilityZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

