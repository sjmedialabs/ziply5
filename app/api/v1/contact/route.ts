import { NextRequest, NextResponse } from "next/server"
import { pgQuery } from "@/src/server/db/pg"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    await pgQuery(
      `
        CREATE TABLE IF NOT EXISTS contact_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          email text NOT NULL,
          phone text NULL,
          message text NOT NULL,
          status text NOT NULL DEFAULT 'open',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `,
    )

    const rows = await pgQuery<Array<Record<string, unknown>>>(
      `INSERT INTO contact_messages (name, email, phone, message, status, updated_at)
       VALUES ($1,$2,$3,$4,'open', now())
       RETURNING *`,
      [name, email, phone || null, message],
    )
    const contactMessage = rows[0]

    return NextResponse.json({ success: true, data: contactMessage });
  } catch (error) {
    console.error("Contact Form Error Details:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}