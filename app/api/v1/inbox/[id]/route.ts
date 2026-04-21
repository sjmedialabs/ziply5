import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";
import { requireAuth } from "@/src/server/middleware/auth";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const { status } = body;
    const { id } = await context.params;

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating inbox message:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const { id } = await context.params;

    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting inbox message:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
