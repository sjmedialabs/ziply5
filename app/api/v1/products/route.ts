import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createProductSchema } from "@/src/server/modules/products/products.validator"
import { createProduct, listProducts, type ListProductsScope } from "@/src/server/modules/products/products.service"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const resolveListScope = (user: AppTokenPayload | null): { scope: ListProductsScope; sellerUserId?: string } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" }
  if (user.role === "seller") return { scope: "seller", sellerUserId: user.sub }
  return { scope: "public" }
}

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")
  const status = request.nextUrl.searchParams.get("status") ?? undefined
  const q = request.nextUrl.searchParams.get("q") ?? undefined

  const user = optionalAuth(request)
  const { scope, sellerUserId } = resolveListScope(user)

  const data = await listProducts(page, limit, scope, sellerUserId, {
    status: scope === "admin" ? status : undefined,
    q: q ?? undefined,
  })
  return ok(data, "Products fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "products.create")
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const isSeller = auth.user.role === "seller"
    const { sellerId: bodySellerId, ...fields } = parsed.data
    const sellerId = isSeller ? auth.user.sub : (bodySellerId ?? null)

    const product = await createProduct({
      ...fields,
      sellerId,
    })

    await logActivity({
      actorId: auth.user.sub,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
    })

    return ok(product, "Product created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
