import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createOrderInvoiceSchema } from "@/src/server/modules/orders/orders.validator"
import { generateOrderInvoice, getOrderInvoice } from "@/src/server/modules/orders/invoice.service"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const invoice = await getOrderInvoice(id)
  if (!invoice) return fail("Invoice not found", 404)
  return ok(invoice, "Invoice fetched")
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const parsed = createOrderInvoiceSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const invoice = await generateOrderInvoice({
      orderId: id,
      actorId: auth.user.sub,
      gstin: parsed.data.gstin,
      taxRate: parsed.data.taxRate,
    })
    return ok(invoice, "Invoice generated", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice generation failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
