import { createCategorySupabase, listCategoriesSupabase } from "@/src/lib/db/categories"

export const listCategories = async () => {
  return await listCategoriesSupabase()
}

export const createCategory = async (input: { name: string; slug: string; parentId?: string | null }) => {
  return await createCategorySupabase(input)
}

export const updateCategory = async (
  id: string,
  input: { name?: string; slug?: string; isActive?: boolean },
) => {
  throw new Error("Category update requires Supabase implementation (Prisma disabled).")
}
