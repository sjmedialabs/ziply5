import { NextResponse } from "next/server"
import { otpAuthService } from "@/src/server/modules/auth/otp-auth.service"
import { z } from "zod"

const verifyOtpSchema = z.object({
  mobile: z.string().min(8), // More lenient, normalization happens in service
  code: z.string(), // Let the service handle length check
  purpose: z.enum(["LOGIN", "REGISTER", "RESET_PASSWORD", "TRANSACTION"]),
  // Extra fields for registration
  name: z.string().optional(),
  email: z.string().optional().or(z.literal("")), // Allow empty/optional
  newPassword: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mobile, code, purpose, name, email, newPassword } = verifyOtpSchema.parse(body)

    let result
    if (purpose === "LOGIN") {
      result = await otpAuthService.verifyAndLogin(mobile, code)
      // Here you would typically set the session/cookie
      // For now, returning the user data
    } else if (purpose === "REGISTER") {
      if (!name || !email) throw new Error("Name and Email are required for registration")
      result = await otpAuthService.verifyAndRegister({ mobile, code, name, email })
    } else if (purpose === "RESET_PASSWORD") {
      if (!newPassword) throw new Error("New password is required")
      result = await otpAuthService.verifyAndResetPassword(mobile, code, newPassword)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error("[OTP Verify Error]:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 400 })
  }
}
