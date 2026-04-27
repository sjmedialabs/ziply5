import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createOffer, duplicateOffer, listOfferUsageLogs, listOffers, softDeleteOffer, toggleOfferStatus, updateOffer } from "@/src/server/modules/offers/offers.service"
import { createOfferSchema, updateOfferSchema } from "@/src/server/modules/offers/offers.validator"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.read")
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const query = searchParams.get("q") ?? undefined
  const sortBy = (searchParams.get("sortBy") as "priority" | "created_at" | "name" | null) ?? undefined
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "20")
  const logsForOfferId = searchParams.get("logsForOfferId")
  if (logsForOfferId) {
    const logs = await listOfferUsageLogs({ offerId: logsForOfferId, page, pageSize })
    return ok(logs, "Offer usage logs")
  }
  const rows = await listOffers({ type: (type as any) ?? undefined, status: (status as any) ?? undefined, query, sortBy, sortDir, page, pageSize })
  return ok(rows, "Offers")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.create")
  if (denied) return denied
  const body = await request.json()
  const parsed = createOfferSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const id = await createOffer({
    ...parsed.data,
    createdBy: auth.user.sub,
    startsAt: parsed.data.startsAt ?? null,
    endsAt: parsed.data.endsAt ?? null,
  })
  return ok({ id }, "Offer created", 201)
}

export async function PUT(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.update")
  if (denied) return denied
  const body = await request.json()
  const id = body?.id as string | undefined
  if (!id) return fail("Offer id is required", 422)
  const parsed = updateOfferSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  await updateOffer(id, {
    ...parsed.data,
    startsAt: parsed.data.startsAt ?? undefined,
    endsAt: parsed.data.endsAt ?? undefined,
  })
  return ok({ id }, "Offer updated")
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.update")
  if (denied) return denied
  const body = (await request.json()) as { id?: string; ids?: string[]; action?: "toggle" | "duplicate" | "bulk_toggle"; status?: "draft" | "active" | "inactive" | "expired" }
  if (!body.id && !(body.action === "bulk_toggle" && body.ids?.length)) return fail("Offer id is required", 422)
  if (body.action === "duplicate") {
    const duplicatedId = await duplicateOffer(body.id, auth.user.sub)
    return ok({ id: duplicatedId }, "Offer duplicated")
  }
  if (body.action === "bulk_toggle" && body.ids?.length) {
    await Promise.all(body.ids.map((id) => toggleOfferStatus(id, body.status ?? "inactive")))
    return ok({ count: body.ids.length }, "Offers status updated")
  }
  await toggleOfferStatus(body.id, body.status ?? "inactive")
  return ok({ id: body.id }, "Offer status updated")
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "promotions.update")
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return fail("Offer id is required", 422)
  await softDeleteOffer(id)
  return ok({ id }, "Offer deleted")
}

