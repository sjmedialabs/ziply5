import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { canAccessProduct, getProductBySlug, type ListProductsScope } from "@/src/server/modules/products/products.service"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const resolveAccessScope = (user: AppTokenPayload | null): { scope: ListProductsScope; sellerUserId?: string } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" }
  if (user.role === "seller") return { scope: "seller", sellerUserId: user.sub }
  return { scope: "public" }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const user = optionalAuth(request)
  const { scope, sellerUserId } = resolveAccessScope(user)
  const product = await getProductBySlug(slug)
  if (!product) return fail("Product not found", 404)
  if (!canAccessProduct(product, scope, sellerUserId)) return fail("Product not found", 404)
  return ok(product, "Product fetched")
}
