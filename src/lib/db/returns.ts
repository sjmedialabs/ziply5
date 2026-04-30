import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { camelToSnakeObject, safeString, shouldRetryWithId, withId } from "./supabaseIntegrity"
import { insertIntoCandidateTables } from "./_shared"
import { getOrderByIdSupabaseBasic } from "./orders"

const RETURN_REQUEST_TABLES = ["ReturnRequest", "return_requests"]
const RETURN_REQUEST_ITEM_TABLES = ["ReturnRequestItem", "return_request_items"]

export const createReturnRequestSupabase = async (
  orderId: string,
  userId: string | null,
  reason?: string,
  items?: Array<{ orderItemId: string; productId: string; requestedQty: number; reasonCode?: string; notes?: string; imageUrl?: string }>
) => {
  const client = getSupabaseAdmin()

  // Verify order
  const order = await getOrderByIdSupabaseBasic(orderId)
  if (!order) throw new Error("Order not found")

  if (order.status?.toLowerCase() !== "delivered") {
    throw new Error("Returns are allowed only for delivered orders")
  }

  // Check duplicate returns
  for (const table of RETURN_REQUEST_TABLES) {
    const { data, error } = await client
      .from(table)
      .select("id, status")
      .eq("orderId", orderId)

    if (!error && data) {
      const duplicate = data.find((r: any) => r.status !== "rejected")
      if (duplicate) throw new Error("Return request already exists for this order")
      break
    } else if (error && error.code === "PGRST204") {
      // Column doesn't exist, try snake_case
      const { data: snakeData, error: snakeError } = await client
        .from(table)
        .select("id, status")
        .eq("order_id", orderId)
      if (!snakeError && snakeData) {
        const duplicate = snakeData.find((r: any) => r.status !== "rejected")
        if (duplicate) throw new Error("Return request already exists for this order")
        break
      }
    }
  }

  const now = new Date().toISOString()

  // Prepare payload. One row per item.
  const payloads = items && items.length > 0
    ? items.map((item) => ({
        orderId,
        productId: item.productId,
        userId: userId ?? null,
        reason: [item.reasonCode, item.notes].filter(Boolean).join(" - ") || reason || null,
        imageUrl: item.imageUrl ?? null,
        status: "requested",
        createdAt: now,
        updatedAt: now,
      }))
    : [
        {
          orderId,
          productId: null,
          userId: userId ?? null,
          reason: reason ?? null,
          imageUrl: null,
          status: "requested",
          createdAt: now,
          updatedAt: now,
        },
      ]

  let inserted = false
  let firstRow: any

  for (const table of RETURN_REQUEST_TABLES) {
    const snakePayloads = payloads.map(camelToSnakeObject)

    for (const p of [payloads, snakePayloads]) {
      const { data, error } = await client.from(table).insert(p).select()
      if (!error && data && data.length > 0) {
        inserted = true
        firstRow = data[0]
        break
      } else if (error && shouldRetryWithId(error.message)) {
        const { data: d2, error: e2 } = await client.from(table).insert(p.map(withId)).select()
        if (!e2 && d2 && d2.length > 0) {
          inserted = true
          firstRow = d2[0]
          break
        }
      }
    }
    if (inserted) break
  }

  if (!inserted) throw new Error("Failed to insert return request details")

  return { id: firstRow.id || firstRow.id_, orderId, userId, status: firstRow.status ?? "requested" }
}
