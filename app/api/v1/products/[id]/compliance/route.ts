import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getComplianceProfile, upsertComplianceProfile } from "@/src/server/modules/compliance/compliance.service"

const upsertSchema = z.object({
  ingredients: z.string().optional().nullable(),
  nutritionFacts: z.unknown().optional(),
  storageInstructions: z.string().optional().nullable(),
  fssaiDetails: z.string().optional().nullable(),
  allergenInfo: z.string().optional().nullable(),
  ingredientDeclaration: z.string().optional().nullable(),
  complianceState: z.string().optional(),
  requiresColdChain: z.boolean().optional(),
  storageTempMin: z.number().optional().nullable(),
  storageTempMax: z.number().optional().nullable(),
})

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "compliance.read")
  if (denied) return denied
  const { id } = await ctx.params
  const profile = await getComplianceProfile(id)
  return ok(profile, "Compliance profile fetched")
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "compliance.update")
  if (denied) return denied
  const body = await request.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const { id } = await ctx.params
  try {
    const profile = await upsertComplianceProfile(id, parsed.data)
    return ok(profile, "Compliance profile saved")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Save failed", 400)
  }
}
