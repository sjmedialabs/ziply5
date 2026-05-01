-- Additive performance indexes for VPS-first traffic and read-heavy catalog flows.
-- Safe, backward-compatible, and no schema/behavior changes.

CREATE INDEX IF NOT EXISTS idx_product_status_created_at ON "Product" ("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_product_slug ON "Product" ("slug");
CREATE INDEX IF NOT EXISTS idx_product_sku ON "Product" ("sku");
CREATE INDEX IF NOT EXISTS idx_product_type_status ON "Product" ("type", "status");

CREATE INDEX IF NOT EXISTS idx_product_variant_product_id ON "ProductVariant" ("productId");
CREATE INDEX IF NOT EXISTS idx_product_variant_sku ON "ProductVariant" ("sku");

CREATE INDEX IF NOT EXISTS idx_product_image_product_position ON "ProductImage" ("productId", "position");
CREATE INDEX IF NOT EXISTS idx_product_category_category_id ON "ProductCategory" ("categoryId");
CREATE INDEX IF NOT EXISTS idx_tag_slug ON "Tag" ("slug");
CREATE INDEX IF NOT EXISTS idx_category_slug ON "Category" ("slug");
