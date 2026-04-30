import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { safeString } from "@/src/lib/db/supabaseIntegrity"

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return req.headers.get("x-user-id")
}

const PRODUCT_TABLES = ["Product", "products"]
const FAVORITE_TABLES = ["UserFavorite", "user_favorites", "user_favorite", "favorites", "userFavorites"]

const findProductBySlug = async (slug: string) => {
  const client = getSupabaseAdmin()
  for (const table of PRODUCT_TABLES) {
    const { data, error } = await client.from(table).select("id,slug").eq("slug", slug).maybeSingle()
    if (!error && data) return { id: safeString((data as any).id), slug: safeString((data as any).slug) }
  }
  return null
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  try {
    const client = getSupabaseAdmin()
    for (const table of FAVORITE_TABLES) {
      // Fetch product ids, then resolve to slugs from Product table(s).
      const attempts = [
        () => client.from(table).select("productId").eq("userId", userId),
        () => client.from(table).select("product_id").eq("user_id", userId),
      ]
      for (const run of attempts) {
        const { data, error } = await run()
        if (error || !Array.isArray(data)) continue
        const productIds = (data as any[])
          .map((row) => safeString(row?.productId ?? row?.product_id))
          .filter(Boolean)
        if (!productIds.length) return NextResponse.json({ success: true, data: [] })
        for (const pt of PRODUCT_TABLES) {
          const { data: products, error: pErr } = await client.from(pt).select("id,slug").in("id", productIds)
          if (pErr || !Array.isArray(products)) continue
          const slugById = new Map((products as any[]).map((p) => [safeString(p.id), safeString(p.slug)]))
          const slugs = productIds.map((id) => slugById.get(id)).filter(Boolean)
          return NextResponse.json({ success: true, data: slugs })
        }
        return NextResponse.json({ success: true, data: [] })
      }
    }
    return NextResponse.json({ success: true, data: [] })
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

    for (const table of FAVORITE_TABLES) {
      const cols = [
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

          // Handle case where Prisma generated the schema and 'id' requires a client-side CUID/UUID
          if (insertError?.message?.includes("null value") && insertError?.message?.includes("id")) {
            insertPayload.id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)
            const { error: retryError } = await client.from(table).insert(insertPayload)
            if (!retryError || retryError.code === "23505") {
              return NextResponse.json({ success: true, message: "Added to favorites" })
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
    return NextResponse.json({ success: false, message: "Favorites table not available" }, { status: 500 })
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
    for (const table of FAVORITE_TABLES) {
      const attempts = [
        () => client.from(table).delete().eq("userId", userId).eq("productId", product.id),
        () => client.from(table).delete().eq("user_id", userId).eq("product_id", product.id),
      ]
      for (const run of attempts) {
        const { error } = await run()
        if (!error) return NextResponse.json({ success: true, message: "Removed from favorites" })
      }
    }
    return NextResponse.json({ success: false, message: "Favorites table not available" }, { status: 500 })
  } catch (error) {
    console.error("DELETE Favorite Error:", error)
    return NextResponse.json({ success: false, message: "Failed to remove favorite" }, { status: 500 })
  }
}