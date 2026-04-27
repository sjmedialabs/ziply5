import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

const ORDER_TABLES = ["Order", "orders"]
const TRANSACTION_TABLES = ["Transaction", "transactions"]

type IdRow = { id: string }

const safeString = (value: unknown) => String(value ?? "").trim()

const normalizeIdRows = (rows: unknown[] | null | undefined) =>
  (rows ?? [])
    .map((row) => safeString((row as Record<string, unknown>)?.id))
    .filter(Boolean)

export const listOrderIdsSupabase = async (input: {
  page: number
  limit: number
  role: string
  userId: string
}) => {
  const client = getSupabaseAdmin()
  const page = Math.max(1, input.page)
  const limit = Math.min(200, Math.max(1, input.limit))
  const offset = (page - 1) * limit

  for (const table of ORDER_TABLES) {
    // Try both camelCase and snake_case for compatibility
    const roleIsCustomer = input.role === "customer"
    const attempts: Array<() => Promise<{ data: IdRow[] | null; error: any; count: number | null }>> = []

    attempts.push(() => {
      let q = client.from(table).select("id", { count: "exact" }).order("createdAt", { ascending: false }).range(offset, offset + limit - 1)
      if (roleIsCustomer) q = q.eq("userId", input.userId)
      return q
    })
    attempts.push(() => {
      let q = client.from(table).select("id", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1)
      if (roleIsCustomer) q = q.eq("user_id", input.userId)
      return q
    })

    for (const run of attempts) {
      const { data, error, count } = await run()
      if (!error) {
        return {
          ids: normalizeIdRows(data as unknown[]),
          total: count ?? 0,
          page,
          limit,
        }
      }
    }
  }
  throw new Error("Unable to list orders via Supabase")
}

export const orderExistsByIdSupabase = async (orderId: string) => {
  const client = getSupabaseAdmin()
  for (const table of ORDER_TABLES) {
    const { data, error } = await client.from(table).select("id").eq("id", orderId).maybeSingle()
    if (!error) return Boolean(data?.id)
  }
  throw new Error("Unable to verify order by id via Supabase")
}

export const markOrderPaymentSuccessSupabase = async (orderId: string, paymentId: string) => {
  const client = getSupabaseAdmin()
  for (const table of ORDER_TABLES) {
    const attempts = [
      () => client.from(table).update({ paymentStatus: "SUCCESS", paymentId }).eq("id", orderId).select("id").maybeSingle(),
      () => client.from(table).update({ payment_status: "SUCCESS", payment_id: paymentId }).eq("id", orderId).select("id").maybeSingle(),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (!error && data) return true
    }
  }
  return false
}

export const upsertPaidTransactionSupabase = async (input: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
}) => {
  const client = getSupabaseAdmin()
  for (const table of TRANSACTION_TABLES) {
    const readAttempts = [
      () => client.from(table).select("id,status,externalId,orderId").eq("orderId", input.orderId),
      () => client.from(table).select("id,status,external_id,order_id").eq("order_id", input.orderId),
    ]
    for (const read of readAttempts) {
      const { data, error } = await read()
      if (error) continue
      const rows = (data ?? []) as Array<Record<string, unknown>>
      const existing = rows.find((row) => {
        const external = safeString(row.externalId ?? row.external_id)
        return external === input.razorpayOrderId || external === input.razorpayPaymentId
      })
      if (existing) {
        const id = safeString(existing.id)
        const updateAttempts = [
          () => client.from(table).update({ status: "paid", externalId: input.razorpayPaymentId }).eq("id", id).select("id").maybeSingle(),
          () => client.from(table).update({ status: "paid", external_id: input.razorpayPaymentId }).eq("id", id).select("id").maybeSingle(),
        ]
        for (const update of updateAttempts) {
          const result = await update()
          if (!result.error && result.data) return safeString((result.data as Record<string, unknown>).id)
        }
      } else {
        const insertAttempts = [
          () =>
            client
              .from(table)
              .insert({
                orderId: input.orderId,
                gateway: "razorpay",
                amount: 0,
                status: "paid",
                externalId: input.razorpayPaymentId,
              })
              .select("id")
              .single(),
          () =>
            client
              .from(table)
              .insert({
                order_id: input.orderId,
                gateway: "razorpay",
                amount: 0,
                status: "paid",
                external_id: input.razorpayPaymentId,
              })
              .select("id")
              .single(),
        ]
        for (const insert of insertAttempts) {
          const result = await insert()
          if (!result.error && result.data) return safeString((result.data as Record<string, unknown>).id)
        }
      }
    }
  }
  return null
}

export const setOrderCancelReasonSupabase = async (orderId: string, reason: string) => {
  const client = getSupabaseAdmin()
  for (const table of ORDER_TABLES) {
    const attempts = [
      () => client.from(table).update({ cancelReason: reason }).eq("id", orderId).select("id").maybeSingle(),
      () => client.from(table).update({ cancel_reason: reason }).eq("id", orderId).select("id").maybeSingle(),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (!error && data) return true
    }
  }
  return false
}

export const setOrderReturnReasonSupabase = async (orderId: string, reason: string) => {
  const client = getSupabaseAdmin()
  for (const table of ORDER_TABLES) {
    const attempts = [
      () => client.from(table).update({ returnReason: reason }).eq("id", orderId).select("id").maybeSingle(),
      () => client.from(table).update({ return_reason: reason }).eq("id", orderId).select("id").maybeSingle(),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (!error && data) return true
    }
  }
  return false
}

export const mirrorOrderStatusSupabase = async (orderId: string, status: string) => {
  const client = getSupabaseAdmin()
  for (const table of ORDER_TABLES) {
    const attempts = [
      () => client.from(table).update({ status }).eq("id", orderId).select("id").maybeSingle(),
      () => client.from(table).update({ status }).eq("id", orderId).select("id").maybeSingle(),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (!error && data) return true
    }
  }
  return false
}

