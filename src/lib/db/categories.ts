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

const CATEGORY_TABLES = ["Category"]

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
      updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    },
    "id,name,slug,parentId,isActive,parent:parentId(id,name,slug)",
  )
}

export const updateCategorySupabase = async (
  id: string,
  input: {
    name?: string
    slug?: string
    parentId?: string | null
    isActive?: boolean
  }
): Promise<CategoryRow> => {
  const client = getSupabaseAdmin()

  const updateData: any = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.parentId !== undefined && {
      parentId: input.parentId ?? null,
    }),
    ...(input.isActive !== undefined && {
      isActive: input.isActive,
    }),

    // Always update timestamp
    updatedAt: new Date().toISOString(),
  }

  const { data, error } = await client
    .from("Category")
    .update(updateData)
    .eq("id", id)
    .select(
      "id,name,slug,parentId,isActive,parent:parentId(id,name,slug)"
    )
    .single()

  if (error) {
    throw new Error(`Failed to update Category: ${error.message}`)
  }

  return data;
}
