-- Phase 9: Master Data Management

CREATE TABLE IF NOT EXISTS master_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_values (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES master_groups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, value)
);

CREATE INDEX IF NOT EXISTS idx_master_groups_key ON master_groups(key);
CREATE INDEX IF NOT EXISTS idx_master_values_group_id ON master_values(group_id);
CREATE INDEX IF NOT EXISTS idx_master_values_group_sort ON master_values(group_id, sort_order);

INSERT INTO master_groups (key, name, description, is_active)
VALUES
  ('PRODUCT_WEIGHT', 'Product Weight', 'Weights used in variant products', true),
  ('PRODUCT_CATEGORY', 'Product Category', 'Categories for products', true),
  ('ORDER_STATUS', 'Order Status', 'Order lifecycle statuses', true),
  ('PAYMENT_STATUS', 'Payment Status', 'Payment status values', true),
  ('CANCEL_REASON', 'Cancel Reason', 'Reasons for order cancellation', true),
  ('RETURN_REASON', 'Return Reason', 'Reasons for order return', true),
  ('COUNTRY', 'Country', 'Country master', true),
  ('CURRENCY', 'Currency', 'Currency master', true),
  ('PAYMENT_METHOD', 'Payment Method', 'Accepted payment methods', true),
  ('USER_ROLE', 'User Role', 'System roles', true)
ON CONFLICT (key) DO NOTHING;

WITH grp AS (
  SELECT id, key FROM master_groups
)
INSERT INTO master_values (group_id, label, value, sort_order, is_active)
SELECT grp.id, v.label, v.value, v.sort_order, true
FROM grp
JOIN (
  VALUES
    ('PRODUCT_WEIGHT', '250g', '250g', 1),
    ('PRODUCT_WEIGHT', '500g', '500g', 2),
    ('PRODUCT_WEIGHT', '1kg', '1kg', 3),
    ('ORDER_STATUS', 'Pending Payment', 'pending_payment', 1),
    ('ORDER_STATUS', 'Payment Success', 'payment_success', 2),
    ('ORDER_STATUS', 'Admin Approval Pending', 'admin_approval_pending', 3),
    ('ORDER_STATUS', 'Confirmed', 'confirmed', 4),
    ('ORDER_STATUS', 'Packed', 'packed', 5),
    ('ORDER_STATUS', 'Shipped', 'shipped', 6),
    ('ORDER_STATUS', 'Delivered', 'delivered', 7),
    ('ORDER_STATUS', 'Cancel Requested', 'cancel_requested', 8),
    ('ORDER_STATUS', 'Return Requested', 'return_requested', 9),
    ('ORDER_STATUS', 'Return Approved', 'return_approved', 10),
    ('ORDER_STATUS', 'Refund Initiated', 'refund_initiated', 11),
    ('ORDER_STATUS', 'Returned', 'returned', 12),
    ('ORDER_STATUS', 'Cancelled', 'cancelled', 13),
    ('PAYMENT_STATUS', 'Pending', 'PENDING', 1),
    ('PAYMENT_STATUS', 'Success', 'SUCCESS', 2),
    ('PAYMENT_STATUS', 'Failed', 'FAILED', 3),
    ('PAYMENT_STATUS', 'Refunded', 'REFUNDED', 4),
    ('CANCEL_REASON', 'Customer Request', 'customer_request', 1),
    ('CANCEL_REASON', 'Duplicate Order', 'duplicate_order', 2),
    ('CANCEL_REASON', 'Payment Issue', 'payment_issue', 3),
    ('RETURN_REASON', 'Damaged', 'damaged', 1),
    ('RETURN_REASON', 'Wrong Item', 'wrong_item', 2),
    ('RETURN_REASON', 'Quality Issue', 'quality_issue', 3),
    ('RETURN_REASON', 'Late Delivery', 'late_delivery', 4),
    ('RETURN_REASON', 'Customer Remorse', 'customer_remorse', 5),
    ('RETURN_REASON', 'Other', 'other', 6),
    ('COUNTRY', 'India', 'IN', 1),
    ('CURRENCY', 'Indian Rupee', 'INR', 1),
    ('PAYMENT_METHOD', 'Razorpay', 'razorpay', 1),
    ('PAYMENT_METHOD', 'Cash on Delivery', 'cod', 2),
    ('USER_ROLE', 'Super Admin', 'super_admin', 1),
    ('USER_ROLE', 'Admin', 'admin', 2),
    ('USER_ROLE', 'Customer', 'customer', 3)
) AS v(group_key, label, value, sort_order)
ON grp.key = v.group_key
ON CONFLICT (group_id, value) DO NOTHING;
