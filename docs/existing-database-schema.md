# Existing Database Schema (Admin-Enterprise)

Authoritative DDL lives in SQL under **`supabase/sql/`** and **`supabase/migrations/`** (no generated ORM schema in-repo).

This file is a **human-readable overview** only. For tables and constraints, apply or inspect:
- `supabase/sql/init.sql`, `supabase/sql/auth-init.sql`, `supabase/sql/admin-only-phase1.sql`
- Additive scripts in `supabase/sql/` (enterprise phases, grants, etc.)
- Timestamped files in `supabase/migrations/`

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

