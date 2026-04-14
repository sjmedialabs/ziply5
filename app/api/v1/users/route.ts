import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createUserByAdmin, listUsers } from "@/src/server/modules/users/users.service"
import { z } from "zod"

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  roleKey: z.enum(["super_admin", "admin", "seller", "customer"]),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "users.read")
  if (forbidden) return forbidden

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")

  const data = await listUsers(page, limit)
  return ok(data, "Users fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "users.create")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  try {
    const user = await createUserByAdmin(parsed.data)
    return ok(user, "User created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
