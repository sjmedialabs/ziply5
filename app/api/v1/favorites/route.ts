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
      // Try both camelCase and snake_case.
      const attempts = [
        () => client.from(table).select("productId,product:Product(slug)").eq("userId", userId),
        () => client.from(table).select("product_id,product:Product(slug)").eq("user_id", userId),
        () => client.from(table).select("productId,product:products(slug)").eq("userId", userId),
        () => client.from(table).select("product_id,product:products(slug)").eq("user_id", userId),
      ]
      for (const run of attempts) {
        const { data, error } = await run()
        if (error || !Array.isArray(data)) continue
        const slugs = (data as any[])
          .map((row) => safeString(row?.product?.slug))
          .filter(Boolean)
        return NextResponse.json({ success: true, data: slugs })
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
    const client = getSupabaseAdmin()
    for (const table of FAVORITE_TABLES) {
      const attempts = [
        () => client.from(table).upsert({ userId, productId: product.id }, { onConflict: "userId,productId" }),
        () => client.from(table).upsert({ user_id: userId, product_id: product.id }, { onConflict: "user_id,product_id" }),
      ]
      for (const run of attempts) {
        const { error } = await run()
        if (!error) return NextResponse.json({ success: true, message: "Added to favorites" })
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