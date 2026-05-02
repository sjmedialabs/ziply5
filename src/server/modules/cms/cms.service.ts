import crypto from "node:crypto"
import { pgQuery, pgTx } from "@/src/server/db/pg"

export const listCmsPages = async () => {
  const pages = await pgQuery<Array<{ id: string; slug: string; title: string; status: string; updatedAt: Date }>>(
    `SELECT id, slug, title, status, "updatedAt" FROM "CmsPage" ORDER BY "updatedAt" DESC`,
  )
  const counts = await pgQuery<Array<{ pageId: string; count: number }>>(
    `SELECT "pageId" as "pageId", COUNT(*)::int as count FROM "CmsSection" GROUP BY "pageId"`,
  )
  const byId = new Map(counts.map((c) => [c.pageId, c.count]))
  return pages.map((p: any) => ({ ...p, _count: { sections: byId.get(p.id) ?? 0 } }))
}

export const getCmsPageBySlug = async (slug: string) => {
  const pages = await pgQuery<{
    id: string
    slug: string
    title: string
    status: string
    metaTitle: string | null
    metaDescription: string | null
    createdAt: Date
    updatedAt: Date
  }>(
    `SELECT id, slug, title, status, "metaTitle", "metaDescription", "createdAt", "updatedAt" FROM "CmsPage" WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  const page = pages[0]
  if (!page) return null
  const sections = await pgQuery<{ id: string; pageId: string; sectionType: string; position: number; contentJson: any }>(
    `SELECT id, "pageId", "sectionType", position, "contentJson" FROM "CmsSection" WHERE "pageId" = $1 ORDER BY position ASC`,
    [page.id],
  )
  return { ...page, sections }
}

export const upsertCmsPage = async (input: {
  slug: string
  title: string
  status?: string
  metaTitle?: string | null
  metaDescription?: string | null
  sections?: Array<{ sectionType: string; position: number; contentJson: unknown }>
}) => {
  await pgTx(async (client) => {
    const pageId = crypto.randomUUID()
    const upsert = await client.query(
      `
        INSERT INTO "CmsPage" (id, slug, title, status, "metaTitle", "metaDescription", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6, now(), now())
        ON CONFLICT (slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          "metaTitle" = EXCLUDED."metaTitle",
          "metaDescription" = EXCLUDED."metaDescription",
          "updatedAt" = now()
        RETURNING id
      `,
      [
        pageId,
        input.slug,
        input.title,
        input.status ?? "draft",
        input.metaTitle ?? null,
        input.metaDescription ?? null,
      ],
    )
    const id = upsert.rows[0].id as string

    if (input.sections) {
      await client.query(`DELETE FROM "CmsSection" WHERE "pageId" = $1`, [id])
      for (const section of input.sections) {
        await client.query(
          `INSERT INTO "CmsSection" (id, "pageId", "sectionType", position, "contentJson") VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [crypto.randomUUID(), id, section.sectionType, section.position, JSON.stringify(section.contentJson ?? {})],
        )
      }
    }
  })

  return getCmsPageBySlug(input.slug)
}
