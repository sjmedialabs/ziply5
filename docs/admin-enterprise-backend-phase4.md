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
  - `CodSettlement`
  - `AnalyticsDailyProductSnapshot`
  - `AnalyticsJobRun`

### SQL scripts added

- `supabase/sql/enterprise-admin-phase4-orders.sql`
  - additive enum updates for `OrderStatus`
- `supabase/sql/enterprise-admin-phase4-foundation.sql`
  - additive creation of missing phase-4 tables and constraints
- `supabase/sql/enterprise-admin-phase4-shipping-cod.sql`
  - additive COD settlement table and shipment/COD indexes

## API structure added

- `GET/POST /api/v1/orders/:id/invoice`
  - generate and retrieve GST-ready invoice records
- `GET/POST /api/v1/orders/:id/notes`
  - internal order notes for admin workflow
- `GET/POST /api/v1/orders/:id/shipments`
  - create shipment records and retrieve shipment history
- `POST /api/v1/orders/:id/delivery`
  - confirm delivery (shipment + order lifecycle update)
- `GET/POST /api/v1/orders/:id/cod`
  - reconcile and fetch COD settlement records
- `POST /api/v1/returns/:id/settlement`
  - settle return via reverse-logistics lifecycle:
    - `requested -> approved -> picked_up -> received -> refunded`
    - or reject path at each intermediate stage
- `POST /api/v1/returns/:id/pickup`
  - schedule return pickup and bind requested quantities per order item
- `POST /api/v1/returns/:id/receiving`
  - record pickup/receiving quantities and condition per returned item
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

## Return lifecycle and refund guardrails

- Return transitions are validated server-side; invalid transitions return 422.
- Refund settlement guardrails:
  - prevents duplicate full refunds
  - caps refund amount to remaining refundable value
  - uses received item quantities for partial refund eligibility when available
  - supports reason codes (`damaged`, `expired`, `wrong_item`, `quality_issue`, `late_delivery`, `customer_remorse`, `other`)
- Audit/eventing:
  - logs activity metadata with `fromStatus`, `toStatus`, `reasonCode`
  - emits outbox event `return.settled`

Compatibility note:

- Existing environments may still have legacy DB enum values.
- Service persists compatible `Order.status` values while preserving enterprise state in:
  - `OrderStatusHistory.toStatus`
  - `OrderFulfillment.fulfillmentStatus`

## New backend services

- `src/server/modules/orders/invoice.service.ts`
- `src/server/modules/integrations/outbox.service.ts`
- `src/server/modules/reports/snapshot.service.ts`
- `src/server/modules/orders/orders.service.ts` (shipment + COD reconciliation extensions)
- `src/server/modules/returns/returns.service.ts` (return settlement workflow)
- `src/server/modules/reports/snapshot.service.ts` (refund/return-aware metrics)

## Regression checklist (phase 4)

- [ ] Create order works (`POST /api/v1/orders`)
- [ ] Status update pending -> confirmed -> packed works
- [ ] Invalid transition returns 422
- [ ] Order note create/get works
- [ ] Invoice generation returns 201 and is idempotent on re-fetch
- [ ] Shipment create/get endpoints return 201/200
- [ ] Delivery confirmation endpoint returns 200 and marks order delivered
- [ ] COD reconcile/get endpoints return 201/200
- [ ] Return settlement endpoint returns 200 and creates refund on `refunded`
- [ ] Return pickup endpoint schedules pickup and stores requested item quantities
- [ ] Return receiving endpoint stores received quantities and condition
- [ ] Return lifecycle transition checks return 422 for invalid stage jumps
- [ ] Refund amount cannot exceed remaining refundable amount
- [ ] Duplicate full refund attempt is blocked
- [ ] Outbox dispatch endpoint returns processed/sent/failed metrics
- [ ] Daily snapshot includes non-zero `refundTotal` when refunds exist
- [ ] Daily snapshot build endpoint returns 200 and writes records
- [ ] Type-check passes: `npx tsc --noEmit`
