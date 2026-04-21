import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
      },
    });

    return NextResponse.json({ success: true, data: contactMessage });
  } catch (error) {
    console.error("Contact Form Error Details:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}