import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { prisma } from "@/src/server/db/prisma"
import { createWithdrawal, listWithdrawals } from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.read")
  if (denied) return denied
  if (auth.user.role === "seller") {
    const rows = await prisma.withdrawalRequest.findMany({
      where: { sellerId: auth.user.sub },
      orderBy: { createdAt: "desc" },
    })
    return ok(rows, "Your withdrawals")
  }
  const rows = await listWithdrawals()
  return ok(rows, "Withdrawals")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.withdraw")
  if (denied) return denied
  if (auth.user.role !== "seller") return fail("Sellers only", 403)
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const row = await createWithdrawal(auth.user.sub, parsed.data.amount, parsed.data.note)
  return ok(row, "Withdrawal requested", 201)
}
