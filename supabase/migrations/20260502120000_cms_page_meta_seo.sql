-- Per-page CMS SEO (meta title / description)
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
