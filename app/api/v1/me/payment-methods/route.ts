import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  createSavedPaymentMethod,
  listSavedPaymentMethods,
} from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  provider: z.string().min(1),
  externalRef: z.string().min(1),
  last4: z.string().optional(),
  brand: z.string().optional(),
  isDefault: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "addresses.read")
  if (denied) return denied
  const rows = await listSavedPaymentMethods(auth.user.sub)
  return ok(rows, "Payment methods")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "addresses.write")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const row = await createSavedPaymentMethod(auth.user.sub, parsed.data)
  return ok(row, "Saved", 201)
}
