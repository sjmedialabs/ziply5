import { prisma } from "@/src/server/db/prisma"

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== "object") return false
  const code = (error as { code?: string }).code
  return code === "P2021"
}

export const getCmsPageSafe = async (slug: string) => {
  try {
    return await prisma.cmsPage.findUnique({
      where: { slug },
      include: { sections: { orderBy: { position: "asc" } } },
    })
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`CMS table missing while loading slug "${slug}". Returning fallback content.`)
      return null
    }
    throw error
  }
}
