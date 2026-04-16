# Admin Enterprise Backend - Phase 4

Phase 4 focuses on enterprise order operations, integration dispatch, and analytics job foundations.

## DB and migration updates

### Schema updates

- `OrderStatus` expanded in schema intent to include:
  - `packed`
  - `returned`
- New/additional enterprise tables now used by runtime:
  - `OrderStatusHistory`
  - `OrderFulfillment`
  - `OrderNote`
  - `Invoice`
  - `Shipment`
  - `ShipmentItem`
  - `AnalyticsDailyProductSnapshot`
  - `AnalyticsJobRun`

### SQL scripts added

- `prisma/enterprise-admin-phase4-orders.sql`
  - additive enum updates for `OrderStatus`
- `prisma/enterprise-admin-phase4-foundation.sql`
  - additive creation of missing phase-4 tables and constraints

## API structure added

- `GET/POST /api/v1/orders/:id/invoice`
  - generate and retrieve GST-ready invoice records
- `GET/POST /api/v1/orders/:id/notes`
  - internal order notes for admin workflow
- `POST /api/v1/integrations/outbox/dispatch`
  - dispatch pending integration outbox events
- `POST /api/v1/reports/snapshots/daily`
  - build daily analytics snapshots (`sales` + `product`)

## Order lifecycle implementation

Implemented explicit lifecycle transitions in service layer:

- `pending -> confirmed -> packed -> shipped -> delivered -> returned`
- cancel paths:
  - `pending/confirmed/packed -> cancelled`

Runtime safety:

- Transition validation is strict and returns 422 on invalid transitions.
- Every transition writes `OrderStatusHistory`.
- Fulfillment state is written to `OrderFulfillment`.
- Activity log and email notification still run.
- Outbox event emitted for `order.status.updated`.

Compatibility note:

- Existing environments may still have legacy DB enum values.
- Service persists compatible `Order.status` values while preserving enterprise state in:
  - `OrderStatusHistory.toStatus`
  - `OrderFulfillment.fulfillmentStatus`

## New backend services

- `src/server/modules/orders/invoice.service.ts`
- `src/server/modules/integrations/outbox.service.ts`
- `src/server/modules/reports/snapshot.service.ts`

## Regression checklist (phase 4)

- [ ] Create order works (`POST /api/v1/orders`)
- [ ] Status update pending -> confirmed -> packed works
- [ ] Invalid transition returns 422
- [ ] Order note create/get works
- [ ] Invoice generation returns 201 and is idempotent on re-fetch
- [ ] Outbox dispatch endpoint returns processed/sent/failed metrics
- [ ] Daily snapshot build endpoint returns 200 and writes records
- [ ] Type-check passes: `npx tsc --noEmit`
