import { prisma } from "@/src/server/db/prisma"

export const listCmsPages = async () => {
  return prisma.cmsPage.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      updatedAt: true,
      _count: { select: { sections: true } },
    },
  })
}

export const getCmsPageBySlug = async (slug: string) => {
  return prisma.cmsPage.findUnique({
    where: { slug },
    include: { sections: { orderBy: { position: "asc" } } },
  })
}

export const upsertCmsPage = async (input: {
  slug: string
  title: string
  status?: string
  sections?: Array<{ sectionType: string; position: number; contentJson: unknown }>
}) => {
  const page = await prisma.cmsPage.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title,
      status: input.status ?? "draft",
    },
    create: {
      slug: input.slug,
      title: input.title,
      status: input.status ?? "draft",
    },
  })

  if (input.sections) {
    await prisma.cmsSection.deleteMany({ where: { pageId: page.id } })
    await prisma.cmsSection.createMany({
      data: input.sections.map((section) => ({
        pageId: page.id,
        sectionType: section.sectionType,
        position: section.position,
        contentJson: section.contentJson as never,
      })),
    })
  }

  return getCmsPageBySlug(input.slug)
}
