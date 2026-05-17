import { NextResponse } from "next/server"
import { pgQuery } from "@/src/server/db/pg"
// import { assertAdmin } from "@/src/server/core/auth/session" // Assuming an admin check exists

export async function GET(req: Request) {
  // await assertAdmin(req)
  
  const { searchParams } = new URL(req.url)
  const mobile = searchParams.get("mobile")
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100)

  let query = `SELECT * FROM sms_logs WHERE 1=1`
  const params: any[] = []

  if (mobile) {
    params.push(`%${mobile}%`)
    query += ` AND mobile LIKE $${params.length}`
  }
  if (status) {
    params.push(status)
    query += ` AND status = $${params.length}`
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit}`

  const logs = await pgQuery(query, params)
  return NextResponse.json(logs)
}
