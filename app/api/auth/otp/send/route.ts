import { NextResponse } from "next/server"
import { otpAuthService } from "@/src/server/modules/auth/otp-auth.service"
import { z } from "zod"

const sendOtpSchema = z.object({
  mobile: z.string().min(8), // Allow various formats, let service normalize
  purpose: z.enum(["LOGIN", "REGISTER", "RESET_PASSWORD", "TRANSACTION"]),
  email: z.string().email().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mobile, purpose, email } = sendOtpSchema.parse(body)

    if (purpose === "LOGIN") {
      await otpAuthService.requestLoginOtp(mobile)
    } else if (purpose === "REGISTER") {
      await otpAuthService.requestRegistrationOtp(mobile, email)
    } else if (purpose === "RESET_PASSWORD") {
      await otpAuthService.requestPasswordResetOtp(mobile)
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 })
  }
}
