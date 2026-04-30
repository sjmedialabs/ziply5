-- Abandoned Cart Recovery (production schema, additive only)
-- Safe to run multiple times.
-- Does NOT alter or drop existing tables (including Prisma "AbandonedCart" and runtime *_v2 tables).
-- These tables match the spec and are intended as the long-term stable foundation.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'abandoned_cart_status') THEN
    CREATE TYPE abandoned_cart_status AS ENUM ('NEW','IN_PROGRESS','RECOVERY_SENT','RECOVERED','EXPIRED','IGNORED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'abandon_stage') THEN
    CREATE TYPE abandon_stage AS ENUM ('CART_ONLY','CHECKOUT_STARTED','PAYMENT_PENDING','PAYMENT_FAILED','CONTACT_CAPTURED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'abandoned_payment_status') THEN
    CREATE TYPE abandoned_payment_status AS ENUM ('NOT_STARTED','INITIATED','FAILED','CANCELLED','TIMEOUT','SUCCESS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recovery_channel') THEN
    CREATE TYPE recovery_channel AS ENUM ('EMAIL','SMS','WHATSAPP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recovery_log_status') THEN
    CREATE TYPE recovery_log_status AS ENUM ('SENT','FAILED','DELIVERED','READ','CLICKED');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id text NULL,
  guest_token text NULL,
  name text NULL,
  email text NULL,
  phone text NULL,
  cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  cart_value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status abandoned_cart_status NOT NULL DEFAULT 'NEW',
  abandon_stage abandon_stage NOT NULL DEFAULT 'CART_ONLY',
  payment_status abandoned_payment_status NOT NULL DEFAULT 'NOT_STARTED',
  checkout_started_at timestamptz NULL,
  payment_started_at timestamptz NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  abandoned_at timestamptz NULL,
  recovered_at timestamptz NULL,
  device text NULL,
  browser text NULL,
  ip inet NULL,
  source text NULL,
  utm_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_abandoned_carts_session_id ON abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status_stage ON abandoned_carts(status, abandon_stage, abandoned_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_activity ON abandoned_carts(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_contact ON abandoned_carts(email, phone);

CREATE TABLE IF NOT EXISTS abandoned_cart_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_id uuid NOT NULL REFERENCES abandoned_carts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_events_cart ON abandoned_cart_events(abandoned_cart_id, created_at);

CREATE TABLE IF NOT EXISTS recovery_campaign_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_id uuid NOT NULL REFERENCES abandoned_carts(id) ON DELETE CASCADE,
  template_id uuid NULL,
  channel recovery_channel NOT NULL,
  attempt_no int NOT NULL DEFAULT 1,
  status recovery_log_status NOT NULL DEFAULT 'SENT',
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_campaign_logs_cart ON recovery_campaign_logs(abandoned_cart_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_recovery_campaign_logs_channel ON recovery_campaign_logs(channel, status, sent_at);

CREATE TABLE IF NOT EXISTS abandoned_cart_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  channel recovery_channel NOT NULL,
  language text NOT NULL DEFAULT 'EN',
  name text NULL,
  trigger_scenario abandon_stage NULL,
  priority int NOT NULL DEFAULT 100,
  subject text NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key, channel, language)
);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_templates_active ON abandoned_cart_templates(active, channel, priority);

CREATE TABLE IF NOT EXISTS abandoned_cart_settings (
  id text PRIMARY KEY,
  value_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


