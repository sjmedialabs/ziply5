import { NextRequest, NextResponse } from "next/server"
import { pgQuery } from "@/src/server/db/pg"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: "Missing email address" }, { status: 400 });
    }

    await pgQuery(
      `
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `,
    )

    // ON CONFLICT DO NOTHING prevents throwing an error if the user is already subscribed
    await pgQuery(
      `INSERT INTO newsletter_subscribers (email, created_at) VALUES ($1, now()) ON CONFLICT (email) DO NOTHING`,
      [email],
    )

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Newsletter Subscribe Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await pgQuery(`SELECT id, email, created_at as "createdAt" FROM newsletter_subscribers ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Newsletter Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
