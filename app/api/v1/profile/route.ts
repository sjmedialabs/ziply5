import { NextRequest, NextResponse } from "next/server"
import { pgQuery, pgTx } from "@/src/server/db/pg"
import { randomUUID } from "crypto"

async function getAuthenticatedUserId(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  // The client passes the userId in the x-user-id header based on your current implementation
  return req.headers.get("x-user-id"); 
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const userRows = await pgQuery<Array<{ id: string; email: string; name: string | null }>>(
      `SELECT id, email, name FROM "User" WHERE id = $1 LIMIT 1`,
      [userId],
    )
    const user = userRows[0]

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const [profileRows, addresses] = await Promise.all([
      pgQuery<Array<Record<string, unknown>>>(`SELECT * FROM "UserProfile" WHERE "userId" = $1 LIMIT 1`, [userId]),
      pgQuery<Array<Record<string, unknown>>>(`SELECT * FROM "UserAddress" WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [userId]),
    ])
    let profile = profileRows[0] ?? null
    if (!profile) {
      profile = (
        await pgQuery<Array<Record<string, unknown>>>(
          `INSERT INTO "UserProfile" (id, "userId", "createdAt", "updatedAt") VALUES ($1, $2, now(), now()) RETURNING *`,
          [randomUUID(), userId],
        )
      )[0]
    }

    return NextResponse.json({ success: true, data: { ...user, profile, addresses } });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUserId = await getAuthenticatedUserId(request);
  if (!authUserId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";
  if (!userId) return NextResponse.json({ success: false, message: "userId is required" }, { status: 400 });

  try {
    const client = getSupabaseAdmin();
    const body = await request.json();
    const { name, bio, phone, avatarUrl } = body as { 
      name?: string; 
      bio?: string; 
      phone?: string; 
      avatarUrl?: string 
    };

    const userRows = await pgQuery<Array<{ id: string }>>(`SELECT id FROM "User" WHERE id = $1 LIMIT 1`, [userId])
    const user = userRows[0]

    if (!user) {
      return NextResponse.json({ success: false, message: "User account not found" }, { status: 404 });
    }

    const updatedProfile = await pgTx(async (client) => {
      if (name !== undefined) {
        await client.query(`UPDATE "User" SET name = $2, "updatedAt" = now() WHERE id = $1`, [userId, name])
      }

      // Note: UserProfile schema does not include `bio` in this project; ignore if provided.
      const insertRows = await client.query<Record<string, unknown>>(
        `
          INSERT INTO "UserProfile" (id, "userId", phone, "avatarUrl", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, now(), now())
          ON CONFLICT ("userId") DO UPDATE
          SET
            phone = COALESCE(EXCLUDED.phone, "UserProfile".phone),
            "avatarUrl" = COALESCE(EXCLUDED."avatarUrl", "UserProfile"."avatarUrl"),
            "updatedAt" = now()
          RETURNING *
        `,
        [randomUUID(), userId, phone ?? null, avatarUrl ?? null],
      )
      return insertRows.rows[0]
    })

    return NextResponse.json({ success: true, data: updatedProfile, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    // Clear specific profile fields rather than deleting the user account
    await pgQuery(
      `UPDATE "UserProfile" SET phone = NULL, "avatarUrl" = NULL, "updatedAt" = now() WHERE "userId" = $1`,
      [userId],
    )
    return NextResponse.json({ success: true, message: "Profile data cleared" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}