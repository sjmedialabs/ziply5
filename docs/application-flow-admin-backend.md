# Admin Backend Application Flow (Admin-Only Enterprise)

This document describes the **end-to-end backend flow** for your admin panel and REST APIs. It intentionally focuses on backend modules and APIs (not storefront UI).

## 1) Auth + JWT + Portal Access

1. Login endpoint:
   - `POST /api/v1/auth/login`
   - Validates with `src/server/modules/auth/auth.validator.ts`
   - Auth logic in `src/server/modules/auth/auth.service.ts`
   - Portal enforcement via `assertPortalAccess(...)`
2. Request authentication middleware:
   - `src/server/middleware/auth.ts` → `requireAuth()`
   - Verifies access token via `src/server/core/security/jwt.ts`
3. Admin RBAC enforcement:
   - `src/server/middleware/rbac.ts` → `requirePermission(role, permissionKey)`
   - Permission map: `src/server/core/rbac/permissions.ts`

Roles:
- `SUPER_ADMIN`, `ADMIN`

Seller portal/guards:
- Seller concept was removed from runtime RBAC/auth flows; admin APIs are guarded by `requirePermission`.

## 2) Admin UI flow (routes + data calls)

Admin pages live under:
- `app/admin/(panel)/**`

Shared layout:
- `components/dashboard/AdminPanelLayout.tsx`

Admin pages fetch data via authed helpers:
- `lib/dashboard-fetch.ts` (`authedFetch`, `authedPost`, etc.)

These routes call the REST APIs below.

## 3) Core Admin API flow patterns

Each module follows:
- Zod validation in `src/server/modules/**/validator.ts` (when present)
- Authorization via `requirePermission(auth.user.role, "...")`
- Service layer calls Prisma via `src/server/modules/**/**.service.ts`
- Response envelope via `src/server/core/http/response.ts` (`ok`, `fail`)

## 4) Products + Categories + Brands + Tags + Attributes

Products:
- `app/api/v1/products/route.ts`:
  - `GET /api/v1/products`
  - `POST /api/v1/products` (admin-only)
- Product CRUD and read access controlled in:
  - `src/server/modules/products/products.service.ts`
  - `src/server/modules/products/products.validator.ts`

Categories:
- `app/api/v1/categories/route.ts`
- Services:
  - `src/server/modules/categories/categories.service.ts`
  - `src/server/modules/categories/categories.validator.ts`

Food compliance for products:
- `GET/PUT /api/v1/products/[id]/compliance`
- Service: `src/server/modules/compliance/compliance.service.ts`

Bundles / combos:
- `GET/POST /api/v1/bundles`
- Service: `src/server/modules/bundles/bundles.service.ts`

## 5) Inventory + Warehouses + FIFO-ready foundation

Inventory overview (legacy summary):
- `GET /api/v1/inventory`

Warehouse master:
- `GET/POST /api/v1/warehouses`
- Service: `src/server/modules/warehouses/warehouses.service.ts`

Lot-level inventory:
- `GET/POST /api/v1/inventory/lots`
  - `POST` supports `mode: "fifo_preview"` to preview FIFO allocations
- Underlying models:
  - `Warehouse`
  - `InventoryStockLot`
  - `InventoryMovement`
  - `OrderItemAllocation`

## 6) Order Management System (OMS)

Order creation:
- `POST /api/v1/orders`
- Service: `src/server/modules/orders/orders.service.ts`
- Validates payload via `src/server/modules/orders/orders.validator.ts`
- Applies coupon discount via:
  - `src/server/modules/coupons/coupons.service.ts`

Order listing / fetch:
- `GET /api/v1/orders`
- `GET /api/v1/orders/[id]`

Strict lifecycle transition updates (enterprise):
- `PATCH /api/v1/orders/[id]`
- Enforces valid transitions and writes:
  - `OrderStatusHistory`
  - `OrderFulfillment` (where relevant)
- Emits outbox events via:
  - `src/server/modules/integrations/outbox.service.ts`

Shipment:
- `GET/POST /api/v1/orders/[id]/shipments`
- Creates `Shipment` + `ShipmentItem`
- Updates order lifecycle toward shipped

Delivery confirmation:
- `POST /api/v1/orders/[id]/delivery`
- Updates shipment to delivered
- Writes status history + fulfillment

Invoice (GST-ready record):
- `GET/POST /api/v1/orders/[id]/invoice`
- Service: `src/server/modules/orders/invoice.service.ts`

Order notes:
- `GET/POST /api/v1/orders/[id]/notes`

COD reconciliation:
- `GET/POST /api/v1/orders/[id]/cod`
- Uses `CodSettlement`
- Service: `src/server/modules/orders/orders.service.ts`

## 7) Returns + Refunds (enterprise reverse-logistics)

Return listing/update (legacy):
- `GET /api/v1/returns`
- `PATCH /api/v1/returns/[id]`

Enterprise return lifecycle settlement:
- `POST /api/v1/returns/[id]/settlement`
- Enforced stages:
  - `requested -> approved -> picked_up -> received -> refunded`
  - rejects supported at intermediate stages
- Refund guardrails:
  - prevent duplicate full refunds
  - caps refunds to remaining refundable amount
  - uses received item quantities when available (partial refunds)

Pickup scheduling:
- `POST /api/v1/returns/[id]/pickup`
- Creates:
  - `ReturnPickup`
  - `ReturnRequestItem` rows with requested quantities

Receiving / inspection:
- `POST /api/v1/returns/[id]/receiving`
- Updates:
  - `ReturnRequestItem.receivedQty`
  - condition status per returned item

Refund records:
- `RefundRecord` is created when status transitions to `refunded`

## 8) Promotions + Coupons + Discounts

Coupons:
- `GET/POST/PATCH /api/v1/coupons`
- Validation:
  - `src/server/modules/coupons/coupons.service.ts` (`computeCouponDiscount`)
- Bulk generation:
  - `POST /api/v1/coupons/bulk`

Promotions:
- `GET/POST/PATCH /api/v1/promotions`
- Rule/action/scope tables exist for future rule engine upgrades:
  - `PromotionRule`, `PromotionAction`
  - `PromotionScopeProduct`, `PromotionScopeCategory`

## 9) Finance module

Finance summary:
- `GET /api/v1/finance/summary`

Finance refunds:
- `GET /api/v1/finance/refunds`
- `POST /api/v1/finance/refunds`
- `PATCH /api/v1/finance/refunds/[id]`

Withdrawals:
- `POST /api/v1/finance/withdrawals` returns deprecated `410` (deprecated feature)

## 10) Reporting / analytics

Admin dashboard summary:
- `GET /api/v1/dashboard/summary`

Enterprise reporting endpoint:
- `GET /api/v1/reports/enterprise?view=dashboard|segments`
- Service: `src/server/modules/reports/enterprise-reports.service.ts`

Snapshot materialization:
- `POST /api/v1/reports/snapshots/daily`
- Service: `src/server/modules/reports/snapshot.service.ts`
- Builds:
  - `AnalyticsDailySalesSnapshot`
  - `AnalyticsDailyProductSnapshot`
- Includes refund-aware `refundTotal` and return item counts.

## 11) Integrations (outbox + dispatch)

Outbox write (best-effort async):
- `src/server/modules/integrations/outbox.service.ts`

Dispatch endpoint:
- `POST /api/v1/integrations/outbox/dispatch?limit=...`
- Populates:
  - `IntegrationOutboxEvent`
  - `IntegrationOutboxAttempt`

## 12) Observability & safety characteristics

- Queue work is best-effort and non-blocking in request flows (email worker integration via BullMQ).
- Admin APIs enforce RBAC on every critical endpoint.
- All additive schema work is migration-driven (no destructive drops).

