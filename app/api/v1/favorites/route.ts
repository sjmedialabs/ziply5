import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { safeString } from "@/src/lib/db/supabaseIntegrity"

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return req.headers.get("x-user-id")
}

const PRODUCT_TABLES = ["Product", "products"]
const COMBO_TABLES = ["Bundle", "bundles", "Combo", "combos"]
const FAVORITE_TABLES = ["UserFavorite", "user_favorites", "user_favorite", "favorites", "userFavorites"]
const COMBO_FAV_TABLES = ["ComboFavorite", "combo_favorites", "combo_favorite", "BundleFavorite", "bundle_favorites", "bundle_favorite", "UserComboFavorite", "user_combo_favorites", "UserBundleFavorite", "user_bundle_favorites"]

const findProductBySlug = async (slug: string) => {
  const client = getSupabaseAdmin()
  for (const table of PRODUCT_TABLES) {
    const { data, error } = await client.from(table).select("id,slug").eq("slug", slug).maybeSingle()
    if (!error && data) return { id: safeString((data as any).id), slug: safeString((data as any).slug), isCombo: false }
  }
  for (const table of COMBO_TABLES) {
    const { data, error } = await client.from(table).select("id,slug").eq("slug", slug).maybeSingle()
    if (!error && data) return { id: safeString((data as any).id), slug: safeString((data as any).slug), isCombo: true }
  }
  return null
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const client = getSupabaseAdmin()
    const allItemIds = new Set<string>()
    
    for (const table of [...FAVORITE_TABLES, ...COMBO_FAV_TABLES]) {
      const attempts = [
        () => client.from(table).select("productId, bundleId").eq("userId", userId),
        () => client.from(table).select("product_id, bundle_id").eq("user_id", userId),
        () => client.from(table).select("productId, comboId").eq("userId", userId),
        () => client.from(table).select("product_id, combo_id").eq("user_id", userId),
        () => client.from(table).select("productId").eq("userId", userId),
        () => client.from(table).select("product_id").eq("user_id", userId),
        () => client.from(table).select("bundleId").eq("userId", userId),
        () => client.from(table).select("bundle_id").eq("user_id", userId),
        () => client.from(table).select("comboId").eq("userId", userId),
        () => client.from(table).select("combo_id").eq("user_id", userId),
      ]
      for (const run of attempts) {
        const { data, error } = await run()
        if (error || !Array.isArray(data)) continue
        const extractedIds = (data as any[])
          .map((row) => safeString(row?.productId ?? row?.product_id ?? row?.bundleId ?? row?.bundle_id ?? row?.comboId ?? row?.combo_id))
          .filter(Boolean)
          
        extractedIds.forEach(id => allItemIds.add(id))
        break
      }
    }
    
    if (allItemIds.size === 0) return NextResponse.json({ success: true, data: [] })
    
    const allSlugs: string[] = []
    const idsArray = Array.from(allItemIds)
    
    for (const pt of [...PRODUCT_TABLES, ...COMBO_TABLES]) {
      const { data: items, error: pErr } = await client.from(pt).select("id,slug").in("id", idsArray)
      if (!pErr && Array.isArray(items)) {
        items.forEach((p) => {
          if (p.slug) allSlugs.push(safeString(p.slug))
        })
      }
    }
    
    return NextResponse.json({ success: true, data: Array.from(new Set(allSlugs)) })
  } catch (error) {
    console.error("GET Favorites Error:", error)
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const { slug } = await request.json()
    const product = await findProductBySlug(String(slug ?? ""))
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
    }
    
    // Parse product ID as a number if it is purely numeric to prevent foreign key type mismatch errors
    const parsedProductId = !isNaN(Number(product.id)) ? Number(product.id) : product.id
    const client = getSupabaseAdmin()
    let lastError: any = null

    const tablesToTry = product.isCombo ? [...COMBO_FAV_TABLES, ...FAVORITE_TABLES] : FAVORITE_TABLES
    for (const table of tablesToTry) {
      const cols = product.isCombo 
        ? [
            { u: "userId", p: "bundleId" },
            { u: "user_id", p: "bundle_id" },
            { u: "userId", p: "comboId" },
            { u: "user_id", p: "combo_id" },
            { u: "userId", p: "productId" },
            { u: "user_id", p: "product_id" },
          ]
        : [
            { u: "userId", p: "productId" },
            { u: "user_id", p: "product_id" },
          ]
      for (const { u, p } of cols) {
        const { data, error: selectError } = await client.from(table).select(u).eq(u, userId).eq(p, parsedProductId).limit(1)
        if (!selectError) {
          if (data && data.length > 0) return NextResponse.json({ success: true, message: "Added to favorites" })
          
          const insertPayload: any = { [u]: userId, [p]: parsedProductId }
          const { error: insertError } = await client.from(table).insert(insertPayload)
          
          if (!insertError || insertError.code === "23505") {
            return NextResponse.json({ success: true, message: "Added to favorites" })
          }

          if (insertError.code === "23503") {
            lastError = insertError
            continue // Foreign key constraint violation, try next column/table
          }

          // Handle case where Prisma generated the schema and 'id' requires a client-side CUID/UUID
          if (insertError?.message?.includes("null value") && insertError?.message?.includes("id")) {
            insertPayload.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)
            const { error: retryError } = await client.from(table).insert(insertPayload)
            if (!retryError || retryError.code === "23505") {
              return NextResponse.json({ success: true, message: "Added to favorites" })
            }
            if (retryError.code === "23503") {
              lastError = retryError
              continue
            }
            lastError = retryError
          } else {
            lastError = insertError
          }
          
          // Stop the loop and return the specific database error to aid in debugging
          const errorMsg = lastError?.message || JSON.stringify(lastError) || "Favorites table not available"
          console.error("POST Favorite Insert Error:", lastError)
          return NextResponse.json({ success: false, message: `Failed to add favorite: ${errorMsg}` }, { status: 500 })
        }
      }
    }
    const errorMsg = lastError?.message || JSON.stringify(lastError) || "Favorites table not available"
    return NextResponse.json({ success: false, message: `Failed to add favorite: ${errorMsg}` }, { status: 500 })
  } catch (error) {
    console.error("POST Favorite Error:", error)
    return NextResponse.json({ success: false, message: "Failed to add favorite" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const { slug } = await request.json()
    const product = await findProductBySlug(String(slug ?? ""))
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 })
    }
    const client = getSupabaseAdmin()
    const tablesToTry = product.isCombo ? [...COMBO_FAV_TABLES, ...FAVORITE_TABLES] : FAVORITE_TABLES
    for (const table of tablesToTry) {
      const cols = product.isCombo 
        ? [
            { u: "userId", p: "bundleId" },
            { u: "user_id", p: "bundle_id" },
            { u: "userId", p: "comboId" },
            { u: "user_id", p: "combo_id" },
            { u: "userId", p: "productId" },
            { u: "user_id", p: "product_id" },
          ]
        : [
            { u: "userId", p: "productId" },
            { u: "user_id", p: "product_id" },
          ]
          
      for (const { u, p } of cols) {
        const { error } = await client.from(table).delete().eq(u, userId).eq(p, product.id)
        if (!error) return NextResponse.json({ success: true, message: "Removed from favorites" })
      }
    }
    return NextResponse.json({ success: false, message: "Favorites table not available" }, { status: 500 })
  } catch (error) {
    console.error("DELETE Favorite Error:", error)
    return NextResponse.json({ success: false, message: "Failed to remove favorite" }, { status: 500 })
  }
}