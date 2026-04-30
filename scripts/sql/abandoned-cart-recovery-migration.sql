-- Abandoned Cart Recovery (additive only)
-- Safe to run multiple times. Does NOT modify existing tables.
--
-- Note: The app currently uses "AbandonedCart" + *_v2 tables (created at runtime by ensureRecoveryTables()).
-- These tables are the spec-aligned names for long-term stability / reporting / future refactors.

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id text NULL,
  session_key text NULL,
  user_id text NULL,
  guest_session_id text NULL,
  customer_name text NULL,
  mobile text NULL,
  email text NULL,
  address_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_count int NOT NULL DEFAULT 0,
  cart_value numeric(12,2) NULL,
  coupon_code text NULL,
  last_visited_page text NULL,
  checkout_stage text NULL,
  payment_status text NULL,
  lifecycle_state text NOT NULL DEFAULT 'ACTIVE_CART',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NULL,
  abandoned_at timestamptz NULL,
  recovered_at timestamptz NULL,
  recovered_source text NULL,
  recovery_attempts_count int NOT NULL DEFAULT 0,
  recovery_disabled boolean NOT NULL DEFAULT false,
  ignored boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(lifecycle_state, abandoned_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_activity ON abandoned_carts(last_activity_at);

CREATE TABLE IF NOT EXISTS abandoned_cart_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_id uuid NOT NULL,
  event_type text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_events_cart ON abandoned_cart_events(abandoned_cart_id, created_at);

CREATE TABLE IF NOT EXISTS abandoned_cart_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_id uuid NOT NULL,
  step_no int NOT NULL,
  channel text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(abandoned_cart_id, step_no, channel)
);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_followups_due ON abandoned_cart_followups(status, scheduled_at);

CREATE TABLE IF NOT EXISTS abandoned_cart_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  channel text NOT NULL,
  subject text NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key, channel)
);

CREATE TABLE IF NOT EXISTS abandoned_cart_settings (
  id text PRIMARY KEY,
  value_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

