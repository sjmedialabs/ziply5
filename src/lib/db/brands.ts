import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { insertIntoCandidateTables, readFromCandidateTables } from "@/src/lib/db/_shared"

type BrandRow = {
  id: string
  name: string
  slug: string
}

const BRAND_TABLES = ["Brand", "brands"]

export const listBrandsSupabase = async (): Promise<BrandRow[]> => {
  const client = getSupabaseAdmin()
  return readFromCandidateTables<BrandRow>(client, BRAND_TABLES, "id,name,slug", {
    orderBy: { column: "name", ascending: true },
  })
}

export const createBrandSupabase = async (input: { name: string; slug: string }): Promise<BrandRow> => {
  const client = getSupabaseAdmin()
  return insertIntoCandidateTables<BrandRow>(
    client,
    BRAND_TABLES,
    { name: input.name, slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-") },
    "id,name,slug",
  )
}

