import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { prisma } from "@/src/server/db/prisma"
import { getSellerDashboardSummary } from "@/src/server/modules/dashboard/dashboard.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "finance.read")
  if (denied) return denied
  if (auth.user.role !== "seller") {
    return ok({ message: "Seller only" }, "Use /finance/summary for admin")
  }
  const dash = await getSellerDashboardSummary(auth.user.sub)
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { sellerId: auth.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return ok({ ...dash, withdrawals }, "Seller finance")
}
