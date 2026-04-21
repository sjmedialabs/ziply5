import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { prisma } from "@/src/server/db/prisma"
import { enqueueEmail, emailTemplates } from "@/src/server/modules/notifications/email.service";
import { z } from "zod"

//  Status schema using your enum
const statusSchema = z.object({
  status: z.enum(["active", "suspended", "deleted"]),
})

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {

    //  Auth check
    const auth = requireAuth(request)
    if ("status" in auth) return auth

    //  Permission check
    const forbidden = requirePermission(
      auth.user.role,
      "users.update"
    )
    if (forbidden) return forbidden

    //  Parse request body
    const body = await request.json()

    const parsed = statusSchema.safeParse(body)

    if (!parsed.success) {
      return fail("Invalid status", parsed.error.flatten())
    }

    const { status } = parsed.data

    //  FIX — Await params
    const { id: userId } = await context.params

    console.log("User ID:", userId)

    if (!userId) {
      return fail("User ID missing")
    }

    //  Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    })

    if (!user) {
      return fail("User not found")
    }

    //  Prevent duplicate update
    if (user.status === status) {
      return ok(user, "Status unchanged")
    }

    //  Update status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    })

    //  Send email
    try {
      const mail =
        emailTemplates.userStatusChanged(
          user.name,
          status
        )

      await enqueueEmail({
        to: user.email,
        ...mail,
      })

    } catch (error) {
      console.error("Email sending failed:", error)
    }

    return ok(
      updatedUser,
      "User status updated successfully"
    )

  } catch (error: any) {

    console.error(error)

    return fail(
      error.message || "Failed to update status"
    )
  }
}