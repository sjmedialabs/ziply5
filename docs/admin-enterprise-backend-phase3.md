# Admin Enterprise Backend - Phase 3

This phase extends the admin-only backend into enterprise-ready foundations without breaking existing routes/UI.

## Updated DB schema

Additive enterprise models and fields (apply via SQL under `supabase/sql/`):

- Product compliance:
  - `ProductComplianceProfile`
  - `ProductComplianceCertificate`
- Bundles/combos:
  - `Bundle`
  - `BundleItem`
  - `OrderItemBundleComponent`
- Warehouse and FIFO-ready inventory:
  - `Warehouse`
  - `InventoryStockLot`
  - `InventoryMovement`
  - `OrderItemAllocation`
  - `StockTransfer`
- OMS enterprise extensions:
  - `OrderStatusHistory`
  - `OrderFulfillment`
  - `Shipment`
  - `ShipmentItem`
  - `Invoice`
  - `OrderNote`
- Promotion/coupon expansion:
  - `CouponRedemption`
  - `PromotionRule`
  - `PromotionAction`
  - `PromotionScopeProduct`
  - `PromotionScopeCategory`
  - `Coupon` new fields:
    - `minOrderAmount`
    - `maxDiscountAmount`
    - `usageLimitTotal`
    - `usageLimitPerUser`
    - `stackable`
    - `firstOrderOnly`
- Reporting/snapshots:
  - `AnalyticsDailySalesSnapshot`
  - `AnalyticsDailyProductSnapshot`
  - `AnalyticsJobRun`
- Segmentation/campaigns:
  - `CustomerSegment`
  - `CustomerSegmentMembership`
  - `Campaign`
  - `CampaignExecution`
- Integration outbox:
  - `IntegrationEndpoint`
  - `IntegrationOutboxEvent`
  - `IntegrationOutboxAttempt`
- Food delivery serviceability:
  - `ServiceabilityZone`
  - `ServiceabilityRule`
  - `DeliveryEtaRule`
- Product field:
  - `Product.temperatureSensitive`

## Migration plan

Script: `supabase/sql/enterprise-admin-foundation.sql`

Principles:

- Additive/non-destructive only.
- Existing seller-era columns untouched for compatibility.
- Existing APIs/UI remain valid.

Execution (Supabase SQL Editor or `psql`):

```bash
psql "$DIRECT_URL" -f supabase/sql/enterprise-admin-foundation.sql
```

## API structure added

New admin/backend endpoints:

- `GET/POST /api/v1/warehouses`
- `GET/POST /api/v1/inventory/lots`
  - `POST` supports FIFO preview mode (`mode: "fifo_preview"`)
- `GET/PUT /api/v1/products/:id/compliance`
- `GET/POST /api/v1/bundles`
- `POST /api/v1/serviceability/check`
- `GET /api/v1/reports/enterprise`
  - `?view=dashboard` or `?view=segments`
- `GET /api/v1/customers/segments`
- `POST /api/v1/coupons/bulk`

## RBAC enhancement

`src/server/core/rbac/permissions.ts` includes enterprise action keys:

- `warehouses.read/create/update`
- `inventory.lots.read/create`
- `bundles.read/create/update`
- `compliance.read/update`
- `serviceability.read/update`
- `reports.enterprise.read`
- `customers.read`
- `segments.read`
- `campaigns.manage`
- `coupons.bulk.create`
- `integrations.read/update`

## Removed/deprecated feature list (admin-only direction)

- Seller role stays removed from runtime auth and RBAC.
- Seller-facing logic remains deprecated and non-primary.
- Seller payout flow remains deprecated (withdrawal request creation already returns deprecated status).
- New enterprise modules are admin-owned only.

## New feature list added from scope

- Food compliance profile APIs.
- Bundle/combo management APIs.
- Warehouse master + lot-level stock tracking APIs.
- FIFO allocation preview endpoint.
- Serviceability + delivery ETA API contract.
- Enterprise dashboard API (revenue, daily orders, top products, low stock, region sales snapshot support).
- Customer segmentation API.
- Bulk coupon generation API with usage-limit fields.
- Integration outbox schema foundation.

## Regression testing checklist

Core existing:

- [ ] Admin login still works.
- [ ] Existing product CRUD APIs still work.
- [ ] Existing orders/inventory/finance APIs still work.
- [ ] Existing admin panel pages render without route break.

Enterprise additions:

- [ ] `GET /api/v1/warehouses` returns 200.
- [ ] `POST /api/v1/warehouses` creates warehouse.
- [ ] `GET /api/v1/inventory/lots` returns 200.
- [ ] `POST /api/v1/inventory/lots` creates lot.
- [ ] `POST /api/v1/inventory/lots` with FIFO preview mode returns allocation plan.
- [ ] `PUT /api/v1/products/:id/compliance` saves compliance data.
- [ ] `GET /api/v1/products/:id/compliance` returns saved profile.
- [ ] `POST /api/v1/bundles` creates combo/bundle.
- [ ] `GET /api/v1/reports/enterprise` returns enterprise KPI payload.
- [ ] `GET /api/v1/customers/segments` returns segmentation rows.
- [ ] `POST /api/v1/coupons/bulk` returns generated coupon batch.
- [ ] `POST /api/v1/serviceability/check` returns serviceability + ETA schema.

Performance/safety:

- [ ] Run `npx tsc --noEmit`.
- [ ] Ensure Prisma client regenerated after schema changes.
- [ ] Add indexes as traffic patterns stabilize (warehouse/pincode/report filters).
