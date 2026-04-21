# Razorpay Order Flow Test Plan

## 1) Successful payment -> auto confirm
- Create order from checkout.
- Initiate Razorpay payment.
- Complete payment and submit verify payload (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`).
- Assert:
  - transaction status becomes `paid`
  - order `paymentStatus` becomes `SUCCESS`
  - latest order lifecycle status includes `payment_success -> admin_approval_pending`
  - `confirmed` occurs only after admin approval (or auto-approve setting enabled)

## 2) Failed payment -> no confirmation
- Initiate Razorpay payment and force failure.
- Send webhook event `payment.failed`.
- Assert:
  - transaction status becomes `failed`
  - order `paymentStatus` becomes `FAILED`
  - order is not moved to `confirmed`

## 3) Cancel after successful payment -> refund triggered
- Place paid order and ensure order is `confirmed`.
- Customer requests `cancel_request`.
- Admin runs `approve_cancel`.
- Assert:
  - order reaches `cancelled`
  - refund record created in `pending/initiated`
  - Razorpay refund API call succeeds

## 4) Return after delivery -> refund processed
- Move order to `delivered`.
- Customer requests return (`return_request`) within return window.
- Admin approves return and marks received.
- Trigger refund from admin.
- Send webhook event `refund.processed`.
- Assert:
  - refund status reaches `completed`
  - order `paymentStatus` becomes `REFUNDED`

## 5) Edge cases
- Duplicate refund trigger: second trigger must fail.
- Cancel after shipped: must fail.
- Return after return-window expiry: must fail.
- Partial refund: create refund with amount lower than order total, verify accepted.

## 6) Admin approval flow
- Set `orders:auto_approve_orders` to `false`.
- Complete payment.
- Assert order status is `admin_approval_pending`.
- Approve order from admin lifecycle actions.
- Assert status transitions to `confirmed`.

## 7) Product visibility + performance
- Ensure inactive products are not returned from `/api/v1/products`.
- If `deletedAt` exists, soft-deleted products are not returned.
- Verify empty states show `No products available`.
- Benchmark APIs:
  - `/api/v1/products?page=1&limit=20`
  - `/api/v1/orders?page=1&limit=20`
  - `/api/v1/finance/refunds?page=1&limit=20`
- Target p95 response under 500ms in staging.
