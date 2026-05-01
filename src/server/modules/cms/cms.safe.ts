import { pgQuery } from "@/src/server/db/pg"

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== "object") return false
  const code = (error as { code?: string }).code
  // Postgres missing relation
  return code === "42P01"
}

const isTransientDbError = (error: unknown) => {
  if (!error) return false
  const anyErr = error as any
  const code = typeof anyErr?.code === "string" ? anyErr.code : undefined
  const message = typeof anyErr?.message === "string" ? anyErr.message : ""

  // Query canceled / statement timeout in Postgres
  if (code === "57014") return true

  // Network / pooler hiccups (common with hosted DBs)
  if (message.includes("Connection terminated")) return true
  if (message.includes("timeout")) return true
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "EPIPE") return true
  return false
}

export const getCmsPageSafe = async (slug: string) => {
  try {
    const pages = await pgQuery<{ id: string; slug: string; title: string; status: string; createdAt: Date; updatedAt: Date }>(
      `SELECT id, slug, title, status, "createdAt", "updatedAt" FROM "CmsPage" WHERE slug = $1 LIMIT 1`,
      [slug],
    )
    const page = pages[0]
    if (!page) return null
    const sections = await pgQuery<{ id: string; pageId: string; sectionType: string; position: number; contentJson: any }>(
      `SELECT id, "pageId", "sectionType", position, "contentJson" FROM "CmsSection" WHERE "pageId" = $1 ORDER BY position ASC`,
      [page.id],
    )
    return { ...page, sections }
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn(`CMS table missing while loading slug "${slug}". Returning fallback content.`)
      return null
    }
    if (isTransientDbError(error)) {
      console.warn(`CMS DB temporarily unavailable while loading slug "${slug}". Returning fallback content.`)
      return null
    }
    throw error
  }
}
