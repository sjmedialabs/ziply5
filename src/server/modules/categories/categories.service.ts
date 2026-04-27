import { prisma } from "@/src/server/db/prisma"
import { createCategorySupabase, listCategoriesSupabase } from "@/src/lib/db/categories"
import { logger } from "@/lib/logger"

export const listCategories = async () => {
  try {
    return await listCategoriesSupabase()
  } catch (error) {
    logger.warn("categories.list.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { parent: { select: { id: true, name: true, slug: true } } },
    })
  }
}

export const createCategory = async (input: { name: string; slug: string; parentId?: string | null }) => {
  try {
    return await createCategorySupabase(input)
  } catch (error) {
    logger.warn("categories.create.supabase_fallback_prisma", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? undefined,
        isActive: true,
      },
      include: { parent: true },
    })
  }
}

export const updateCategory = async (
  id: string,
  input: { name?: string; slug?: string; isActive?: boolean },
) => {
  return prisma.category.update({
    where: { id },
    data: {
      ...("name" in input && input.name !== undefined ? { name: input.name } : {}),
      ...("slug" in input && input.slug !== undefined ? { slug: input.slug } : {}),
      ...("isActive" in input ? { isActive: input.isActive } : {}),
    },
    include: { parent: true },
  })
}
