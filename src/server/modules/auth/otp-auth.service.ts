import { otpService, OtpPurpose } from "../otp/otp.service"
import { smsService } from "../sms/sms.service"
import { pgQuery, pgTx } from "@/src/server/db/pg"
import { hashPassword } from "@/src/server/core/security/password"
import crypto from "node:crypto"
import { ROLE_KEYS } from "@/src/server/core/rbac/permissions"
import { env } from "@/src/server/core/config/env"
import {
  sha256 as jwtSha256,
  signAccessToken,
  signRefreshToken,
} from "@/src/server/core/security/jwt"

const parseDurationMs = (value: string, fallbackMs: number) => {
  const match = /^(\d+)([smhd])$/i.exec(value.trim())
  if (!match) return fallbackMs
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs
  if (unit === "s") return amount * 1000
  if (unit === "m") return amount * 60 * 1000
  if (unit === "h") return amount * 60 * 60 * 1000
  if (unit === "d") return amount * 24 * 60 * 60 * 1000
  return fallbackMs
}

export const otpAuthService = {
  normalize(mobile: string) {
    const d = mobile.replace(/\D/g, "");
    return d.length === 10 ? `91${d}` : d;
  },

  async requestRegistrationOtp(mobileInput: string) {
    const mobile = this.normalize(mobileInput);
    // Check if user exists
    const existing = await pgQuery(`SELECT id FROM "UserProfile" WHERE phone = $1`, [mobile])
    if (existing.length > 0) throw new Error("Mobile number already registered")

    const code = await otpService.generate(mobile, "REGISTER")
    
    await smsService.send({
      mobile,
      templateKey: "OTP_VERIFY", 
      variables: [code],
      body: `Welcome! Your OTP for mobile verification is ${code}. This code is valid for 5 minutes only. - Ziply5`
    })

    return { success: true, message: "OTP sent successfully" }
  },

  async verifyAndRegister(input: { mobile: string; code: string; name: string; email: string }) {
    const mobile = this.normalize(input.mobile);
    await otpService.verify(mobile, "REGISTER", input.code)

    const user = await pgTx(async (client) => {
      // Check if email exists
      const existingEmail = await client.query(`SELECT id FROM "User" WHERE lower(email) = lower($1) LIMIT 1`, [input.email])
      if (existingEmail.rows[0]?.id) throw new Error("Email already in use")

      // 1. Create User
      const userId = crypto.randomUUID()
      const syntheticPassword = crypto.randomBytes(16).toString("hex")
      const passwordHash = await hashPassword(syntheticPassword)

      await client.query(
        `INSERT INTO "User" (id, email, "passwordHash", name, status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,'active', now(), now())`,
        [userId, input.email, passwordHash, input.name]
      )

      // 2. Create Profile
      await client.query(
        `INSERT INTO "UserProfile" (id, "userId", phone, "createdAt", "updatedAt") VALUES ($1,$2,$3, now(), now())`,
        [crypto.randomUUID(), userId, mobile]
      )

      // 3. Assign Role
      const roleId = crypto.randomUUID()
      const roleRes = await client.query(
        `INSERT INTO "Role" (id, "key", name) VALUES ($1, $2, $3) ON CONFLICT ("key") DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [roleId, ROLE_KEYS.CUSTOMER, "customer"]
      )
      await client.query(`INSERT INTO "UserRole" ("userId","roleId") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, roleRes.rows[0].id])

      return { userId, name: input.name }
    })

    // 4. Send Welcome SMS
    await smsService.send({
      mobile,
      templateKey: "WELCOME",
      variables: [input.name],
      body: `Welcome to Ziply5 ! Your account is created successfully. Username: ${input.name} - Team Ziply5`
    }).catch(e => console.error("Welcome SMS failed", e))

    // 5. Issue Tokens
    const accessToken = signAccessToken({
      sub: user.userId,
      email: input.email,
      role: ROLE_KEYS.CUSTOMER,
    })
    const refreshToken = signRefreshToken({
      sub: user.userId,
      role: ROLE_KEYS.CUSTOMER,
    })

    await pgQuery(
      `INSERT INTO "RefreshToken" (id, "userId", "tokenHash", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, now())`,
      [
        crypto.randomUUID(),
        user.userId,
        jwtSha256(refreshToken),
        new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)),
      ],
    )

    return { 
      success: true, 
      user: {
        id: user.userId,
        email: input.email,
        name: input.name,
        role: ROLE_KEYS.CUSTOMER
      },
      accessToken,
      refreshToken
    }
  },

  async requestLoginOtp(mobileInput: string) {
    const mobile = this.normalize(mobileInput);
    console.log(`[OTP] RequestLoginOtp - Input: ${mobileInput}, Normalized: ${mobile}`);
    const existing = await pgQuery(`SELECT id FROM "UserProfile" WHERE phone = $1`, [mobile])
    console.log(`[OTP] Found existing: ${existing.length}`);
    if (existing.length === 0) throw new Error("Mobile number not found. Please register first.")

    const code = await otpService.generate(mobile, "LOGIN")
    
    await smsService.send({
      mobile,
      templateKey: "LOGIN_OTP",
      variables: [code],
      body: `Your OTP is ${code} for Ziply5 login. Please do not share this code with anyone. It is valid for 5 minutes.`
    })

    return { success: true }
  },

  async verifyAndLogin(mobileInput: string, code: string) {
    const mobile = this.normalize(mobileInput);
    await otpService.verify(mobile, "LOGIN", code)

    const userRows = await pgQuery(
      `SELECT u.id, u.email, u.name, r.key as role
       FROM "User" u
       JOIN "UserProfile" up ON up."userId" = u.id
       JOIN "UserRole" ur ON ur."userId" = u.id
       JOIN "Role" r ON r.id = ur."roleId"
       WHERE up.phone = $1`,
      [mobile]
    )

    if (userRows.length === 0) throw new Error("User data inconsistent")

    const user = userRows[0]
    
    // Issue Tokens
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
    const refreshToken = signRefreshToken({
      sub: user.id,
      role: user.role,
    })

    await pgQuery(
      `INSERT INTO "RefreshToken" (id, "userId", "tokenHash", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, now())`,
      [
        crypto.randomUUID(),
        user.id,
        jwtSha256(refreshToken),
        new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)),
      ],
    )

    return { 
      success: true, 
      user,
      accessToken,
      refreshToken
    }
  },

  async requestPasswordResetOtp(mobileInput: string) {
    const mobile = this.normalize(mobileInput);
    const existing = await pgQuery(`SELECT id FROM "UserProfile" WHERE phone = $1`, [mobile])
    if (existing.length === 0) throw new Error("Mobile number not found")

    const code = await otpService.generate(mobile, "RESET_PASSWORD")
    
    await smsService.send({
      mobile,
      templateKey: "PASSWORD_RESET",
      variables: [code],
      body: `OTP ${code} is required to reset your password. Valid for 10 minutes. Please do not share this OTP. - Ziply5`
    })

    return { success: true }
  },

  async verifyAndResetPassword(mobileInput: string, code: string, newPassword: string) {
    const mobile = this.normalize(mobileInput);
    await otpService.verify(mobile, "RESET_PASSWORD", code)

    const userRows = await pgQuery(`SELECT "userId" FROM "UserProfile" WHERE phone = $1`, [mobile])
    if (userRows.length === 0) throw new Error("User not found")

    const passwordHash = await hashPassword(newPassword)
    await pgQuery(`UPDATE "User" SET "passwordHash" = $1, "updatedAt" = now() WHERE id = $2`, [
      passwordHash,
      userRows[0].userId
    ])

    // Invalidate refresh tokens
    await pgQuery(`DELETE FROM "RefreshToken" WHERE "userId" = $1`, [userRows[0].userId])

    return { success: true }
  }
}
