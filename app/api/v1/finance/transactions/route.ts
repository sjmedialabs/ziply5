import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const denied = requirePermission(auth.user.role, "orders.read")
  if (denied) return denied

  try {
    const client = getSupabaseAdmin()
    const tables = ["Transaction", "transactions"]
    let rows: Array<Record<string, unknown>> = []
    for (const table of tables) {
      const attempts = [
        () => client.from(table).select("*").order("createdAt", { ascending: false }).limit(100),
        () => client.from(table).select("*").order("created_at", { ascending: false }).limit(100),
        () => client.from(table).select("*").limit(100),
      ]
      for (const run of attempts) {
        const { data, error } = await run()
        if (!error && Array.isArray(data)) {
          rows = data as Array<Record<string, unknown>>
          break
        }
      }
      if (rows.length) break
    }

    const mappedTransactions = rows.map((tx) => ({
      id: String(tx.id ?? ""),
      amount: Number(tx.amount ?? 0),
      type: String(tx.gateway ?? ""),
      status: String(tx.status ?? ""),
      referenceId: String((tx as any).externalId ?? (tx as any).external_id ?? ""),
      createdAt: String((tx as any).createdAt ?? (tx as any).created_at ?? ""),
    }))

    return ok(mappedTransactions, "Transactions fetched successfully")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to fetch transactions", 500)
  }
}
