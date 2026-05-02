-- Product list/detail performance indexes for storefront traffic.
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx" ON "Product"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Promotion_active_startsAt_endsAt_idx" ON "Promotion"("active", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");
CREATE INDEX IF NOT EXISTS "PromotionVariant_variantId_idx" ON "PromotionVariant"("variantId");
CREATE INDEX IF NOT EXISTS "ProductTag_tagId_idx" ON "ProductTag"("tagId");
CREATE INDEX IF NOT EXISTS "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isDefault_idx" ON "ProductVariant"("productId", "isDefault");
