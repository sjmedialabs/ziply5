import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return req.headers.get("x-user-id"); 
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: { product: { select: { slug: true } } }
    });
    const slugs = favorites.map((f: any) => f.product.slug);
    return NextResponse.json({ success: true, data: slugs });
  } catch (error) {
    console.error("GET Favorites Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { slug } = await request.json();
    const product = await prisma.product.findUnique({ where: { slug } });
    
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    await prisma.userFavorite.upsert({
      where: { 
        userId_productId: { userId, productId: product.id } 
      },
      create: { userId, productId: product.id },
      update: {}
    });

    return NextResponse.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("POST Favorite Error:", error);
    return NextResponse.json({ success: false, message: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const { slug } = await request.json();
    const product = await prisma.product.findUnique({ where: { slug } });
    
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    await prisma.userFavorite.delete({
      where: { 
        userId_productId: { userId, productId: product.id } 
      }
    });

    return NextResponse.json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    console.error("DELETE Favorite Error:", error);
    return NextResponse.json({ success: false, message: "Failed to remove favorite" }, { status: 500 });
  }
}