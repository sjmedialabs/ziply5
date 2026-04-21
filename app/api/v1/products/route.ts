import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createProductSchema } from "@/src/server/modules/products/products.validator"
import { createProduct, listProducts, type ListProductsScope } from "@/src/server/modules/products/products.service"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const PRODUCT_LIST_TTL_MS = 30_000
const productListCache = new Map<string, { at: number; payload: unknown }>()

const resolveListScope = (user: AppTokenPayload | null): { scope: ListProductsScope } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" }
  return { scope: "public" }
}

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")
  const status = request.nextUrl.searchParams.get("status") ?? undefined
  const q = request.nextUrl.searchParams.get("q") ?? undefined
  const inStockOnly = request.nextUrl.searchParams.get("inStockOnly") === "true"

  const user = optionalAuth(request)
  const { scope } = resolveListScope(user)
  const cacheKey = JSON.stringify({ page, limit, status, q, inStockOnly, scope, user: user?.role ?? "public" })
  const cached = productListCache.get(cacheKey)
  if (cached && Date.now() - cached.at < PRODUCT_LIST_TTL_MS) {
    return ok(cached.payload, "Products fetched")
  }

  const data = await listProducts(page, limit, scope, {
    status: scope === "admin" ? status : undefined,
    q: q ?? undefined,
    inStockOnly,
  })
  productListCache.set(cacheKey, { at: Date.now(), payload: data })
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

    const fields = parsed.data

    const product = await createProduct({
      ...fields,
      createdById: auth.user.sub,
      managedById: auth.user.sub,
    })

    await logActivity({
      actorId: auth.user.sub,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
    })
    productListCache.clear()

    return ok(product, "Product created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
