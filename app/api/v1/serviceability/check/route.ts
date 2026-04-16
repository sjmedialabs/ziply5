import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { checkPincodeServiceability } from "@/src/server/modules/serviceability/serviceability.service"

const schema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  temperatureSensitive: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const result = await checkPincodeServiceability(
      parsed.data.pincode,
      parsed.data.temperatureSensitive ?? false,
    )
    return ok(result, "Serviceability checked")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check failed", 400)
  }
}
