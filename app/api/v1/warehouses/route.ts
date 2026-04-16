import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createWarehouse, listWarehouses } from "@/src/server/modules/warehouses/warehouses.service"

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  region: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "warehouses.read")
  if (denied) return denied
  const rows = await listWarehouses()
  return ok(rows, "Warehouses fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "warehouses.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const row = await createWarehouse(parsed.data)
    return ok(row, "Warehouse created", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Create failed", 400)
  }
}
