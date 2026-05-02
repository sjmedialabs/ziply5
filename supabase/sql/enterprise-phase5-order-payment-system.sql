-- Phase 5: order/payment/return/refund hardening
-- Safe, backward-compatible constraints and indexes for production traffic.

BEGIN;

-- Payment idempotency: prevent multiple orders for same payment reference.
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentId_unique_not_null"
ON "Order" ("paymentId")
WHERE "paymentId" IS NOT NULL;

-- Return idempotency: allow at most one active return request per order.
CREATE UNIQUE INDEX IF NOT EXISTS "ReturnRequest_orderId_active_unique"
ON "ReturnRequest" ("orderId")
WHERE "status" <> 'rejected';

-- Refund idempotency: only one in-flight refund process per order.
CREATE UNIQUE INDEX IF NOT EXISTS "RefundRecord_orderId_inflight_unique"
ON "RefundRecord" ("orderId")
WHERE "status" IN ('pending', 'processing', 'initiated');

-- Webhook de-duplication ledger (optional for processors that supply event ids).
CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" text PRIMARY KEY,
  "provider" text NOT NULL,
  "eventId" text NOT NULL,
  "externalId" text,
  "receivedAt" timestamptz NOT NULL DEFAULT now(),
  "payload" jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_eventId_key"
ON "PaymentWebhookEvent" ("provider", "eventId");

COMMIT;
