import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { requireAuth } from "@/src/server/middleware/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    // If the auth middleware returned a response (like 401 Unauthorized), return it to stop execution
    if (auth instanceof Response) return auth;

    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}