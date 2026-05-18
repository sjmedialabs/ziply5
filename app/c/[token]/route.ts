import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ziply5.com"
  
  // Redirect to the query-parameter-based recovery route
  return NextResponse.redirect(`${baseUrl.replace(/\/$/, "")}/cart/recover?token=${encodeURIComponent(token)}`, 302)
}
