import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createProductSchema } from "@/src/server/modules/products/products.validator"
import { createProduct, listProducts,applyPromotionToProduct, type ListProductsScope } from "@/src/server/modules/products/products.service"
import { logActivity } from "@/src/server/modules/activity/activity.service"
import {
  buildProductListCacheKey,
  getProductCache,
  invalidateProductCache,
  setProductCache,
} from "@/src/server/modules/products/products.cache"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const PRODUCT_LIST_TTL_MS = 60_000

const resolveListScope = (user: AppTokenPayload | null): { scope: ListProductsScope } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" }
  return { scope: "public" }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  const page = Number(
    request.nextUrl.searchParams.get("page") ?? "1"
  )

  const limit = Number(
    request.nextUrl.searchParams.get("limit") ?? "20"
  )

  const status =
    request.nextUrl.searchParams.get("status") ?? undefined

  const q =
    request.nextUrl.searchParams.get("q") ?? undefined

  const inStockOnly =
    request.nextUrl.searchParams.get("inStockOnly") === "true"

  const user = optionalAuth(request)

  const { scope } =
    resolveListScope(user)

  const cacheKey = buildProductListCacheKey({
    page,
    limit,
    status,
    q,
    inStockOnly,
    scope,
    user: user?.role ?? "public"
  })

  const cached = await getProductCache<unknown>(cacheKey, PRODUCT_LIST_TTL_MS)
  if (cached) {
    console.info("[products:list] cache hit", {
      scope,
      page,
      limit,
      tookMs: Date.now() - startedAt,
    })
    return ok(cached, "Products fetched")
  }

  /* ===============================
     FETCH PRODUCTS
     =============================== */

  const data =
    await listProducts(
      page,
      limit,
      scope,
      {
        status:
          scope === "admin"
            ? status
            : undefined,

        q: q ?? undefined,

        inStockOnly,
      }
    )

    //  console.log("Fetched products::::", data);

  /* ===============================
     APPLY PROMOTION TO EACH PRODUCT
     =============================== */

  const updatedProducts =
    data.items?.map((product: any) =>
      applyPromotionToProduct(product)
    )

  /* ===============================
     KEEP SAME RESPONSE STRUCTURE
     =============================== */

  const updatedData = {
    ...data,
    products: updatedProducts
  }

  /* ===============================
     CACHE UPDATED DATA
     =============================== */

  await setProductCache(cacheKey, updatedData, PRODUCT_LIST_TTL_MS)

  console.info("[products:list] cache miss", {
    scope,
    page,
    limit,
    itemCount: updatedProducts?.length ?? 0,
    tookMs: Date.now() - startedAt,
  })

    // console.log("Updated products with promotion::::", updatedProducts);

  return ok(
    updatedData,
    "Products fetched"
  )
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
    await invalidateProductCache()

    return ok(product, "Product created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
