-- Product custom sections (CMS-like blocks)
-- Compatible with current Prisma tables where products are stored in "Product".

CREATE TABLE IF NOT EXISTS product_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sections_product_id
  ON product_sections(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sections_product_sort
  ON product_sections(product_id, sort_order);

-- Optional: keep updated_at fresh if running SQL migrations manually.
CREATE OR REPLACE FUNCTION set_product_sections_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_sections_updated_at ON product_sections;
CREATE TRIGGER trg_product_sections_updated_at
BEFORE UPDATE ON product_sections
FOR EACH ROW
EXECUTE FUNCTION set_product_sections_updated_at();
