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
    },
    include: { parent: true },
  })
}
