import crypto from "node:crypto"
import { env } from "@/src/server/core/config/env"
import { hashPassword, verifyPassword } from "@/src/server/core/security/password"
import {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/src/server/core/security/jwt"
import { mailService } from "../mail/mail.service"
import { ROLE_KEYS } from "@/src/server/core/rbac/permissions"
import { smsService } from "@/src/server/modules/sms/sms.service"
import { enqueueEmail, emailTemplates } from "@/src/server/modules/notifications/email.service"
import { pgQuery, pgTx } from "@/src/server/db/pg"

type SignupInput = {
  name: string
  email: string
  password: string
  role?: "super_admin" | "admin" | "customer"
  isFromAdmin?: boolean
}

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

export const signup = async (input: SignupInput) => {
  const normalizedEmail = input.email.trim().toLowerCase()
  const passwordHash = await hashPassword(input.password)
  const roleKey = input.role ?? ROLE_KEYS.CUSTOMER

  const user = await pgTx(async (client) => {
    const existing = await client.query(`SELECT id FROM "User" WHERE lower(email) = lower($1) LIMIT 1`, [
      normalizedEmail,
    ])
    if (existing.rows[0]?.id) throw new Error("Email already in use")

    const roleId = crypto.randomUUID()
    const roleRes = await client.query(
      `
        INSERT INTO "Role" (id, "key", name)
        VALUES ($1, $2, $3)
        ON CONFLICT ("key") DO UPDATE SET name = EXCLUDED.name
        RETURNING id, "key"
      `,
      [roleId, roleKey, roleKey.replaceAll("_", " ")],
    )
    const ensuredRoleId = roleRes.rows[0].id as string

    const userId = crypto.randomUUID()
    const created = await client.query(
      `
        INSERT INTO "User" (id, email, "passwordHash", name, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'active', now(), now())
        RETURNING id, email, name, status, "passwordHash"
      `,
      [userId, normalizedEmail, passwordHash, input.name],
    )

    await client.query(`INSERT INTO "UserRole" ("userId", "roleId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      userId,
      ensuredRoleId,
    ])

    return created.rows[0] as { id: string; email: string; name: string; status: string; passwordHash: string }
  })

  try {
    console.log("is from aadmin::::::::::::::",input?.isFromAdmin);
    if(input?.isFromAdmin){
      console.log("Sending admin created email to ", user.email);
      const mail = emailTemplates.adminCreated(user.name,input.password,input.email)
      await enqueueEmail({ to: user.email, ...mail })
    }
    else{
      const mail = emailTemplates.welcome(user.name)
      await enqueueEmail({ to: user.email, ...mail })
    }
  } catch {
    // Non-blocking: account creation must not fail on email queue issues.
  }

  return user
}

const issueAuthTokens = async (input: {
  userId: string
  email: string
  role: string
  name: string
}) => {
  const accessToken = signAccessToken({
    sub: input.userId,
    email: input.email,
    role: input.role,
  })
  const refreshToken = signRefreshToken({
    sub: input.userId,
    role: input.role,
  })

  await pgQuery(
    `INSERT INTO "RefreshToken" (id, "userId", "tokenHash", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, now())`,
    [
      crypto.randomUUID(),
      input.userId,
      sha256(refreshToken),
      new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)),
    ],
  )

  return {
    user: {
      id: input.userId,
      email: input.email,
      name: input.name,
      role: input.role,
    },
    accessToken,
    refreshToken,
  }
}

export const login = async (email: string, password: string) => {
  const rows = await pgQuery<{
    id: string
    email: string
    name: string
    status: string
    passwordHash: string
    role: string | null
  }>(
    `
      SELECT u.id, u.email, u.name, u.status, u."passwordHash",
             r."key" as role
      FROM "User" u
      LEFT JOIN "UserRole" ur ON ur."userId" = u.id
      LEFT JOIN "Role" r ON r.id = ur."roleId"
      WHERE lower(u.email) = lower($1)
      ORDER BY u."updatedAt" DESC
      LIMIT 1
    `,
    [email.trim().toLowerCase()],
  )
  const user = rows[0]
  if (!user) throw new Error("Invalid credentials")

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error("Invalid credentials")
  
  const status = user.status
  if(status==="suspended") throw new Error("Account is suspended. Please contact support.")

  const role = user.role ?? ROLE_KEYS.CUSTOMER
  return issueAuthTokens({
    userId: user.id,
    email: user.email,
    role,
    name: user.name,
  })
}

export const assertPortalAccess = (
  role: string,
  portal: "website" | "admin" = "website",
) => {
  if (portal === "admin" && !(role === "admin" || role === "super_admin")) {
    throw new Error("This account is not allowed in admin login")
  }

  if (portal === "website" && role !== "customer") {
    throw new Error("Please use your dedicated login portal")
  }
}

export const refresh = async (token: string) => {
  const decoded = verifyRefreshToken(token)
  const tokenHash = sha256(token)

  const tokenRows = await pgQuery<{ expiresAt: Date; revokedAt: Date | null }>(
    `SELECT "expiresAt", "revokedAt" FROM "RefreshToken" WHERE "tokenHash" = $1 LIMIT 1`,
    [tokenHash],
  )
  const tokenRecord = tokenRows[0]
  if (!tokenRecord || tokenRecord.revokedAt || new Date(tokenRecord.expiresAt) < new Date()) {
    throw new Error("Refresh token expired or revoked")
  }

  const userRows = await pgQuery<{ id: string; email: string }>(`SELECT id, email FROM "User" WHERE id = $1 LIMIT 1`, [
    decoded.sub,
  ])
  const user = userRows[0]
  if (!user) throw new Error("User not found")

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: decoded.role,
  })

  return { accessToken }
}

export const revokeRefresh = async (token: string) => {
  await pgQuery(
    `UPDATE "RefreshToken" SET "revokedAt" = now() WHERE "tokenHash" = $1 AND "revokedAt" IS NULL`,
    [sha256(token)],
  )
}

export const requestPasswordReset = async (email: string) => {
  const normalized = email.trim().toLowerCase()
  const userRows = await pgQuery<{ email: string }>(
    `SELECT email FROM "User" WHERE lower(email) = lower($1) LIMIT 1`,
    [normalized],
  )
  const user = userRows[0] ?? null
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = sha256(token)
  if (user) {
    await pgTx(async (client) => {
      await client.query(`DELETE FROM "PasswordReset" WHERE email = $1 AND "usedAt" IS NULL`, [user.email])
      await client.query(
        `INSERT INTO "PasswordReset" (id, email, "tokenHash", "expiresAt", "createdAt") VALUES ($1,$2,$3,$4, now())`,
        [crypto.randomUUID(), user.email, tokenHash, new Date(Date.now() + 60 * 60 * 1000)],
      )
    })
    
    // Send Email
    await mailService.sendPasswordResetEmail(user.email, token).catch(e => {
      console.error("[Auth Service] Failed to send reset email:", e);
    })
  }
  if (env.PASSWORD_RESET_RETURN_TOKEN && user) {
    return { message: "Reset token issued", resetToken: token }
  }
  return { message: "If an account exists, a reset link has been sent." }
}

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const tokenHash = sha256(token.trim())
  const rows = await pgQuery<{ email: string; expiresAt: Date; usedAt: Date | null }>(
    `SELECT email, "expiresAt", "usedAt" FROM "PasswordReset" WHERE "tokenHash" = $1 LIMIT 1`,
    [tokenHash],
  )
  const row = rows[0]
  if (!row || row.usedAt || new Date(row.expiresAt) < new Date()) {
    throw new Error("Invalid or expired reset token")
  }
  const passwordHash = await hashPassword(newPassword)
  await pgTx(async (client) => {
    await client.query(`UPDATE "User" SET "passwordHash" = $1, "updatedAt" = now() WHERE lower(email) = lower($2)`, [
      passwordHash,
      row.email,
    ])
    await client.query(`UPDATE "PasswordReset" SET "usedAt" = now() WHERE "tokenHash" = $1`, [tokenHash])
  })
}

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/[^\d+]/g, "")
  if (!digits) throw new Error("Invalid phone")
  if (digits.startsWith("+")) return digits
  return `+${digits}`
}

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000))

const getOtpConfig = () => ({
  ttlSec: Number(env.OTP_TTL_SECONDS ?? "300"),
  maxAttempts: Number(env.OTP_MAX_ATTEMPTS ?? "5"),
  resendCooldownSec: Number(env.OTP_RESEND_COOLDOWN_SECONDS ?? "45"),
})

export const requestLoginOtp = async (phoneRaw: string) => {
  const phone = normalizePhone(phoneRaw)
  const cfg = getOtpConfig()

  const prevRows = await pgQuery<{ createdAt: Date; resendCount: number }>(
    `SELECT "createdAt", "resendCount" FROM "OtpChallenge" WHERE phone = $1 AND purpose = 'login' AND "consumedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1`,
    [phone],
  )
  const previous = prevRows[0] ?? null

  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime()
    const minAgeMs = cfg.resendCooldownSec * 1000
    if (ageMs < minAgeMs) {
      const waitSeconds = Math.ceil((minAgeMs - ageMs) / 1000)
      throw new Error(`Please wait ${waitSeconds}s before requesting another OTP`)
    }
  }

  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + cfg.ttlSec * 1000)
  await pgQuery(
    `INSERT INTO "OtpChallenge" (id, phone, purpose, "codeHash", "expiresAt", attempts, "maxAttempts", "resendCount", "createdAt")
     VALUES ($1,$2,'login',$3,$4,0,$5,$6, now())`,
    [crypto.randomUUID(), phone, sha256(code), expiresAt, cfg.maxAttempts, (previous?.resendCount ?? 0) + 1],
  )

  await smsService.send({
    to: phone,
    body: `Your OTP is ${code} for Ziply5 login. Please do not share this code with anyone. It is valid for 5 minutes.`,
    templateId: env.SMS_TEMPLATE_LOGIN_OTP,
  })

  const includeOtp = process.env.OTP_RETURN_CODE === "true"
  return {
    phone,
    expiresAt,
    ...(includeOtp ? { otp: code } : {}),
  }
}

export const verifyLoginOtp = async (phoneRaw: string, code: string) => {
  const phone = normalizePhone(phoneRaw)
  const rows = await pgQuery<{
    id: string
    expiresAt: Date
    attempts: number
    maxAttempts: number
    codeHash: string
  }>(
    `SELECT id, "expiresAt", attempts, "maxAttempts", "codeHash" FROM "OtpChallenge"
     WHERE phone = $1 AND purpose='login' AND "consumedAt" IS NULL
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [phone],
  )
  const challenge = rows[0]
  if (!challenge) throw new Error("OTP not found")
  if (new Date(challenge.expiresAt) < new Date()) throw new Error("OTP expired")
  if (challenge.attempts >= challenge.maxAttempts) throw new Error("OTP attempts exceeded")

  if (challenge.codeHash !== sha256(code.trim())) {
    await pgQuery(`UPDATE "OtpChallenge" SET attempts = attempts + 1 WHERE id = $1`, [challenge.id])
    throw new Error("Invalid OTP")
  }

  await pgQuery(`UPDATE "OtpChallenge" SET "consumedAt" = now() WHERE id = $1`, [challenge.id])

  const profileRows = await pgQuery<{
    userId: string
    email: string
    name: string
    role: string | null
  }>(
    `
      SELECT up."userId" as "userId",
             u.email,
             u.name,
             r."key" as role
      FROM "UserProfile" up
      JOIN "User" u ON u.id = up."userId"
      LEFT JOIN "UserRole" ur ON ur."userId" = u.id
      LEFT JOIN "Role" r ON r.id = ur."roleId"
      WHERE up.phone = $1
      ORDER BY u."updatedAt" DESC
      LIMIT 1
    `,
    [phone],
  )

  let authUser = profileRows[0] ?? null
  if (!authUser) {
    authUser = await pgTx(async (client) => {
      const roleId = crypto.randomUUID()
      const roleRes = await client.query(
        `
          INSERT INTO "Role" (id, "key", name)
          VALUES ($1, $2, $3)
          ON CONFLICT ("key") DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `,
        [roleId, ROLE_KEYS.CUSTOMER, "customer"],
      )
      const ensuredRoleId = roleRes.rows[0].id as string

      const syntheticEmail = `phone_${phone.replace(/\D/g, "")}_${Date.now()}@ziply5.local`
      const randomPasswordHash = await hashPassword(crypto.randomBytes(24).toString("hex"))
      const userId = crypto.randomUUID()
      await client.query(
        `INSERT INTO "User" (id, email, "passwordHash", name, status, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,'active', now(), now())`,
        [userId, syntheticEmail, randomPasswordHash, `User ${phone.slice(-4)}`],
      )
      await client.query(`INSERT INTO "UserRole" ("userId","roleId") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
        userId,
        ensuredRoleId,
      ])
      await client.query(
        `INSERT INTO "UserProfile" (id, "userId", phone, "createdAt", "updatedAt") VALUES ($1,$2,$3, now(), now())`,
        [crypto.randomUUID(), userId, phone],
      )
      const user = { userId, email: syntheticEmail, name: `User ${phone.slice(-4)}`, role: ROLE_KEYS.CUSTOMER }
      
      // Send Welcome SMS for new user
      smsService.send({
        to: phone,
        body: `Welcome to Ziply5 ! Your account is created successfully. Username: ${user.name} - Team Ziply5`,
        templateId: env.SMS_TEMPLATE_WELCOME
      }).catch(err => console.error("Welcome SMS failed", err))

      return user
    })
  }

  const role = authUser.role ?? ROLE_KEYS.CUSTOMER
  return issueAuthTokens({
    userId: authUser.userId,
    email: authUser.email,
    role,
    name: authUser.name,
  })
}
