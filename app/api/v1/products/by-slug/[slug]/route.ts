import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { canAccessProduct, getProductBySlug, isProductSoftDeleted, type ListProductsScope } from "@/src/server/modules/products/products.service"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const resolveAccessScope = (user: AppTokenPayload | null): { scope: ListProductsScope } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" }
  return { scope: "public" }
}

function applyPromotionToProduct(product: any) {

  /* ---------- PRODUCT LEVEL ---------- */

  if (product.promotionLinks?.length) {

    const promo =
      product.promotionLinks[0]?.promotion

    const discount =
      promo?.metadata?.discountPercent ?? 0

    if (discount > 0) {

      /*  Apply on basePrice */

      const basePrice =
        Number(product.basePrice ?? product.price)

      product.discountPercent = discount

      product.finalPrice =
        basePrice -
        (basePrice * discount / 100)

      product.promotion = {
        name: promo.name,
        kind: promo.kind
      }

    }

  }
  else {

    /*  No sale → use normal product discount */

    product.finalPrice =
      Number(product.price)

    product.discountPercent =
      Number(product.discountPercent ?? 0)

  }


  /* ---------- VARIANT LEVEL ---------- */

  product.variants =
    product.variants?.map((variant: any) => {

      if (variant.promotionLinks?.length) {

        const promo =
          variant.promotionLinks[0]?.promotion

        const discount =
          variant.promotionLinks[0]
            ?.metadata?.discountPercent ?? 0

        if (discount > 0) {

          /*  Apply on variant base price */

          const basePrice =
            Number(
              variant.mrp ??
              variant.price
            )

          variant.discountPercent =
            discount

          variant.finalPrice =
            basePrice -
            (basePrice * discount / 100)

          variant.promotion = {
            name: promo.name,
            kind: promo.kind
          }

        }

      }
      else {

        /*  No sale → keep original price */

        variant.finalPrice =
          Number(variant.price)

        variant.discountPercent =
          Number(
            variant.discountPercent ?? 0
          )

      }

      delete variant.promotionLinks

      return variant

    })

  delete product.promotionLinks

  return product

}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const user = optionalAuth(request)
  const { scope } = resolveAccessScope(user)
  let product = await getProductBySlug(slug)

if (!product)
  return fail("Product not found", 404)

product =
  applyPromotionToProduct(product)
  console.log("Product after applying promotion is:::::", product)
  if (!product) return fail("Product not found", 404)
  // if (await isProductSoftDeleted(product.id)) return fail("Product not found", 404)
  if (!canAccessProduct(product, scope)) return fail("Product not found", 404)
  return ok(product, "Product fetched")
}
