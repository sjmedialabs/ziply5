-- Phase 10: Coupon + Product Discount + Return/Replace + Support Ticket extensions
-- Additive only. No existing table or column modifications.

CREATE TABLE IF NOT EXISTS coupons_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INT,
  usage_per_user INT,
  expiry_date TIMESTAMPTZ,
  status BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_applicability_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons_v2(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES "Product"(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES "Category"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_id IS NOT NULL OR category_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS coupon_usage_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons_v2(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES "Order"(id) ON DELETE SET NULL,
  usage_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_v2_code ON coupons_v2(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_v2_coupon_user ON coupon_usage_v2(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_applicability_v2_coupon ON coupon_applicability_v2(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_applicability_v2_product ON coupon_applicability_v2(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_applicability_v2_category ON coupon_applicability_v2(category_id);

CREATE TABLE IF NOT EXISTS product_discounts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_discounts_v2_product_id ON product_discounts_v2(product_id);
CREATE INDEX IF NOT EXISTS idx_product_discounts_v2_dates ON product_discounts_v2(start_date, end_date);

CREATE TABLE IF NOT EXISTS return_requests_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES "OrderItem"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL CHECK (type IN ('return', 'replace')),
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED','APPROVED','PICKUP_INITIATED','RECEIVED','REFUND_INITIATED','REPLACEMENT_SHIPPED','COMPLETED','REJECTED')),
  notes TEXT,
  reverse_shipment_id TEXT REFERENCES "Shipment"(id) ON DELETE SET NULL,
  replacement_shipment_id TEXT REFERENCES "Shipment"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_v2_order_id ON return_requests_v2(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_v2_user_id ON return_requests_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_v2_status ON return_requests_v2(status);

CREATE TABLE IF NOT EXISTS support_tickets_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES "Order"(id) ON DELETE SET NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('order_issue','payment_issue','technical_issue')),
  subject TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets_v2(id) ON DELETE CASCADE,
  sender_type VARCHAR(16) NOT NULL CHECK (sender_type IN ('user','admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_v2_user_id ON support_tickets_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_v2_order_id ON support_tickets_v2(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_v2_status ON support_tickets_v2(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_v2_ticket_id ON support_messages_v2(ticket_id);
