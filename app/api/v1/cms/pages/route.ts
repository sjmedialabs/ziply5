import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getCmsPageBySlug, listCmsPages, upsertCmsPage } from "@/src/server/modules/cms/cms.service"

const upsertCmsSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.string().optional(),
  sections: z
    .array(
      z.object({
        sectionType: z.string().min(1),
        position: z.number().int().nonnegative(),
        contentJson: z.unknown(),
      }),
    )
    .optional(),
})

export async function GET(request: NextRequest) {
  const list = request.nextUrl.searchParams.get("list")
  if (list === "1") {
    const auth = requireAuth(request)
    if ("status" in auth) return auth
    const forbidden = requirePermission(auth.user.role, "cms.read")
    if (forbidden) return forbidden
    try {
      const pages = await listCmsPages()
      return ok(pages, "CMS pages listed")
    } catch (error) {
      const message = error instanceof Error ? error.message : "CMS list failed"
      return fail(message, 503)
    }
  }

  const slug = request.nextUrl.searchParams.get("slug")
  if (!slug) return fail("slug query parameter is required (or use list=1 for admin index)", 422)
  try {
    const page = await getCmsPageBySlug(slug)
    if (!page) {
      if (slug === "header" || slug === "footer") {
        return ok(
          {
            slug,
            title: slug === "header" ? "Header Settings" : "Footer Settings",
            status: "draft",
            sections: [],
          },
          "CMS page defaulted",
        )
      }
      return fail("CMS page not found", 404)
    }
    return ok(page, "CMS page fetched")
  } catch (error) {
    const message = error instanceof Error ? error.message : "CMS fetch failed"
    return fail(message, 503)
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "cms.update")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = upsertCmsSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  const page = await upsertCmsPage({
    slug: parsed.data.slug,
    title: parsed.data.title,
    status: parsed.data.status,
    sections: parsed.data.sections?.map((section) => ({
      sectionType: section.sectionType,
      position: section.position,
      contentJson: section.contentJson,
    })),
  })
  return ok(page, "CMS page saved")
}
