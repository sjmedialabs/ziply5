import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import {
  parseAndVerifyWebhook,
  processWebhookEvent,
} from "@/src/server/modules/payments/payments.service"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  const payload = await request.text()
  const signature =
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-razorpay-signature") ??
    request.headers.get("stripe-signature")

  try {
    const parsed = parseAndVerifyWebhook({ providerRaw: provider, payload, signature })

    const externalIdHint =
      request.nextUrl.searchParams.get("externalId") ??
      request.headers.get("x-payment-id")

    const result = await processWebhookEvent(provider, parsed, externalIdHint)
    return ok(result, "Webhook processed")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Webhook rejected", 401)
  }
}
