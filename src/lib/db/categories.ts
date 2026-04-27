import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { insertIntoCandidateTables, readFromCandidateTables } from "@/src/lib/db/_shared"

type CategoryRow = {
  id: string
  name: string
  slug: string
  parentId?: string | null
  isActive?: boolean
  parent?: { id: string; name: string; slug: string } | null
}

const CATEGORY_TABLES = ["Category", "categories"]

export const listCategoriesSupabase = async (): Promise<CategoryRow[]> => {
  const client = getSupabaseAdmin()
  return readFromCandidateTables<CategoryRow>(
    client,
    CATEGORY_TABLES,
    "id,name,slug,parentId,isActive,parent:parentId(id,name,slug)",
    { orderBy: { column: "name", ascending: true } },
  )
}

export const createCategorySupabase = async (input: {
  name: string
  slug: string
  parentId?: string | null
}): Promise<CategoryRow> => {
  const client = getSupabaseAdmin()
  return insertIntoCandidateTables<CategoryRow>(
    client,
    CATEGORY_TABLES,
    {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId ?? null,
      isActive: true,
    },
    "id,name,slug,parentId,isActive,parent:parentId(id,name,slug)",
  )
}

