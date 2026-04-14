import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createTag, listTags } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
})

export async function GET() {
  const rows = await listTags()
  return ok(rows, "Tags")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "tags.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createTag(parsed.data.name, parsed.data.slug)
    return ok(row, "Tag created", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
