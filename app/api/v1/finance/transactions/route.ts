import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { prisma } from "@/src/server/db/prisma"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const denied = requirePermission(auth.user.role, "orders.read")
  if (denied) return denied

  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Limiting to the 100 most recent transactions
    })

    const mappedTransactions = transactions.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount), // Convert Prisma Decimal to number
      type: tx.gateway,          // Map gateway to the 'type' field expected by the UI
      status: tx.status,
      referenceId: tx.externalId, // Map externalId to 'referenceId'
      createdAt: tx.createdAt.toISOString(),
    }))

    return ok(mappedTransactions, "Transactions fetched successfully")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to fetch transactions", 500)
  }
}
