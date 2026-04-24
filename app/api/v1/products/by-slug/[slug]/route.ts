import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { canAccessProduct, getProductBySlug, applyPromotionToProduct,isProductSoftDeleted, type ListProductsScope } from "@/src/server/modules/products/products.service"
import type { AppTokenPayload } from "@/src/server/core/security/jwt"

const resolveAccessScope = (user: AppTokenPayload | null): { scope: ListProductsScope } => {
  if (!user) return { scope: "public" }
  if (user.role === "super_admin" || user.role === "admin") return { scope: "admin" } 
  return { scope: "public" }
}

// function applyPromotionToProduct(product: any) {

//   console.log(
//     "Applying promotion to product::::",
//     product.promotionLinks[0]?.promotion?.metadata
//   )

//   /* ===========================================================
//      SIMPLE PRODUCT LOGIC
//      =========================================================== */

//   if (product.type === "simple") {

//     const basePrice =
//       Number(product.basePrice ?? product.price)

//     let discountPercent = 0
//     let saleName: string | null = null

//     /* ---------- PRODUCT PROMOTION ---------- */

//     if (product.promotionLinks?.length) {

//       const promo =
//         product.promotionLinks[0]?.promotion

//       const discount =
//         promo?.metadata?.products
//           ?.find(
//             (p: any) =>
//               p.productId === product.id
//           )
//           ?.discountPercent ?? 0

//       if (discount > 0) {

//         discountPercent = discount
//         saleName = promo?.name ?? null

//       }

//     }

//     /* ---------- NORMAL PRODUCT DISCOUNT ---------- */

//     if (discountPercent === 0) {

//       discountPercent =
//         Number(product.discountPercent ?? 0)

//     }

//     /* ---------- FINAL PRICE ---------- */

//     const finalPrice =
//       basePrice -
//       (basePrice * discountPercent / 100)

//     /* ---------- RENAME FIELDS ---------- */

//     product.oldPrice = basePrice
//     product.price = Math.round(finalPrice)

//     product.discountPercent =
//       discountPercent

//     product.saleName =
//       saleName

//     delete product.finalPrice
//     delete product.promotionLinks

//     product.variants =
//       product.variants?.map((variant: any) => {

//         delete variant.promotionLinks

//         return variant

//       })

//     return product
//   }



//   /* ===========================================================
//      PRODUCT LEVEL (VARIANT PRODUCTS)
//      =========================================================== */

//   if (product.promotionLinks?.length) {

//     const promo =
//       product.promotionLinks[0]?.promotion

//     const discount =
//       promo?.metadata?.discountPercent ?? 0

//     if (discount > 0) {

//       const basePrice =
//         Number(product.basePrice ?? product.price)

//       const finalPrice =
//         basePrice -
//         (basePrice * discount / 100)

//       /* ---------- RENAME ---------- */

//       product.oldPrice = basePrice
//       product.price = Math.round(finalPrice)

//       product.discountPercent =
//         discount

//       product.promotion = {
//         name: promo.name,
//         kind: promo.kind
//       }

//     }

//   }
//   else {

//     product.oldPrice =
//       Number(product.price)

//     product.price =
//       Number(product.price)

//     product.discountPercent =
//       Number(product.discountPercent ?? 0)

//   }



//   /* ===========================================================
//      VARIANT LEVEL
//      =========================================================== */

//   product.variants =
//     product.variants?.map((variant: any) => {

//       const originalPrice =
//         Number(
//           variant.mrp ??
//           variant.price
//         )

//       if (variant.promotionLinks?.length) {

//         const promo =
//           variant.promotionLinks[0]?.promotion

//         const discount =
//           variant.promotionLinks[0]
//             ?.metadata?.discountPercent ?? 0

//         if (discount > 0) {

//           const finalPrice =
//             originalPrice -
//             (originalPrice * discount / 100)

//           /* ---------- RENAME ---------- */

//           variant.oldPrice =
//             originalPrice

//           variant.price =
//             Math.round(finalPrice)

//           variant.discountPercent =
//             discount

//           variant.promotion = {

//             name: promo.name,

//             kind: promo.kind

//           }

//         }

//       }
//       else {

//         variant.oldPrice =
//           originalPrice

//         variant.price =
//           Number(variant.price)

//         variant.discountPercent =
//           Number(
//             variant.discountPercent ?? 0
//           )

//       }

//       delete variant.promotionLinks

//       return variant

//     })

//   delete product.promotionLinks

//   return product

// }
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
