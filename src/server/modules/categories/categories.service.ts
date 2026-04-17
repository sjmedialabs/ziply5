import { prisma } from "@/src/server/db/prisma"

export const listCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { parent: { select: { id: true, name: true, slug: true } } },
  })
}

export const createCategory = async (input: { name: string; slug: string; parentId?: string | null }) => {
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
