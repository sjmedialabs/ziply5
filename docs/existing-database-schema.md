# Existing Database Schema (Admin-Enterprise)

Primary source: `prisma/schema.prisma`.

This file is a **downloadable overview** (not a full copy of `schema.prisma`), so it’s easy to share. For the complete, authoritative schema, use:
- `prisma/schema.prisma`
- Migration scripts: `prisma/init.sql`, `prisma/auth-init.sql`, `prisma/admin-only-phase1.sql`, and the additive enterprise scripts in `prisma/`.

## Enums
- `UserStatus`: `active`, `suspended`, `deleted`
- `ProductStatus`: `draft`, `published`, `archived`
- `ProductType`: `simple`, `variant`
- `StockStatus`: `in_stock`, `out_of_stock`
- `OrderStatus`: `pending`, `confirmed`, `packed`, `shipped`, `delivered`, `returned`, `cancelled`
- `TicketStatus`: `open`, `in_progress`, `resolved`, `closed`
- `InventoryMovementType`: `in`, `reserve`, `release`, `pick`, `adjust`, `writeoff`, `transfer`, `returned`
- `OutboxStatus`: `pending`, `processing`, `sent`, `failed`, `dead`

## Models (high level)

### Identity / RBAC
- `User`, `UserProfile`, `OtpChallenge`
- `Role`, `Permission`, `RolePermission`, `UserRole`
- `Session`, `RefreshToken`, `Device`, `PasswordReset`
- `UserAddress`, `SavedPaymentMethod`
- `ActivityLog`, `Notification`, `Setting`

### Catalog / Product (food-ready)
- `Category` (supports hierarchy: `parentId`)
- `Brand`
- `Product`
- `ProductSection` (mapped to `product_sections`)
- `ProductVariant`
- `ProductImage`
- `ProductFeature`, `ProductLabel`, `ProductDetailSection`
- `ProductSeo`
- `ProductCategory`
- `ProductTag`
- `AttributeDef`, `ProductAttributeValue`
- `ProductReview`

### Food compliance
- `ProductComplianceProfile`
- `ProductComplianceCertificate`

### Bundles / combos
- `Bundle`
- `BundleItem`
- `OrderItemBundleComponent` (bundle explosion tracking at order-item level)

### Inventory / Warehouse / FIFO-ready foundation
- `InventoryItem` (legacy “summary” inventory; kept for compatibility)
- `Warehouse`
- `InventoryStockLot` (batch/lot + `expiryDate`)
- `InventoryMovement` (ledger rows for lot movements)
- `OrderItemAllocation` (allocates lots to order items)
- `StockTransfer`

### OMS / Fulfillment / Returns / Refunds
- `Order` (admin-owned via `createdById` / `managedById`)
- `OrderItem`
- `Transaction`
- `OrderStatusHistory` (status transition audit)
- `OrderFulfillment` (packed/shipped/delivered timestamps)
- `Shipment`, `ShipmentItem`
- `Invoice`
- `OrderNote`
- `CodSettlement`
- `ReturnRequest`, `ReturnRequestItem`
- `ReturnPickup`
- `RefundRecord`

### Promotions / Coupons
- `Promotion`
- `Coupon`
- `CouponRedemption`
- `PromotionRule`, `PromotionAction`
- `PromotionScopeProduct`, `PromotionScopeCategory`

### Customers / segmentation / campaigns
- `CustomerSegment`
- `CustomerSegmentMembership`
- `Campaign`
- `CampaignExecution`

### Analytics / reporting snapshots
- `AnalyticsDailySalesSnapshot`
- `AnalyticsDailyProductSnapshot`
- `AnalyticsJobRun`

### Integrations (ERP/Logistics/CRM-ready via outbox)
- `IntegrationEndpoint`
- `IntegrationOutboxEvent`
- `IntegrationOutboxAttempt`

### Delivery serviceability (pincode + ETA)
- `ServiceabilityZone`
- `ServiceabilityRule`
- `DeliveryEtaRule`

