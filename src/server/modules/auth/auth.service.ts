import crypto from "node:crypto"
import { prisma } from "@/src/server/db/prisma"
import { env } from "@/src/server/core/config/env"
import { hashPassword, verifyPassword } from "@/src/server/core/security/password"
import {
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/src/server/core/security/jwt"
import { ROLE_KEYS } from "@/src/server/core/rbac/permissions"
import { smsService } from "@/src/server/integrations/sms/sms.service"
import { enqueueEmail, emailTemplates } from "@/src/server/modules/notifications/email.service"

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
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new Error("Email already in use")

  const passwordHash = await hashPassword(input.password)
  const roleKey = input.role ?? ROLE_KEYS.CUSTOMER

  const role = await prisma.role.upsert({
    where: { key: roleKey },
    update: { name: roleKey.replace("_", " ") },
    create: { key: roleKey, name: roleKey.replace("_", " ") },
  })

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      roles: {
        create: [{ roleId: role.id }],
      },
    },
    include: {
      roles: { include: { role: true } },
    },
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

  await prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(
        Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
      ),
    },
  })

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
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  })
  if (!user) throw new Error("Invalid credentials")

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error("Invalid credentials")

  const role = user.roles[0]?.role.key ?? ROLE_KEYS.CUSTOMER
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

  const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new Error("Refresh token expired or revoked")
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } })
  if (!user) throw new Error("User not found")

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: decoded.role,
  })

  return { accessToken }
}

export const revokeRefresh = async (token: string) => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export const requestPasswordReset = async (email: string) => {
  const normalized = email.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  })
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = sha256(token)
  if (user) {
    await prisma.passwordReset.deleteMany({ where: { email: user.email, usedAt: null } })
    await prisma.passwordReset.create({
      data: {
        email: user.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
  }
  if (env.PASSWORD_RESET_RETURN_TOKEN && user) {
    return { message: "Reset token issued", resetToken: token }
  }
  return { message: "If an account exists, a reset link has been sent." }
}

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const tokenHash = sha256(token.trim())
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash } })
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new Error("Invalid or expired reset token")
  }
  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { email: row.email },
    data: { passwordHash },
  })
  await prisma.passwordReset.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
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

  const previous = await prisma.otpChallenge.findFirst({
    where: { phone, purpose: "login", consumedAt: null },
    orderBy: { createdAt: "desc" },
  })

  if (previous) {
    const ageMs = Date.now() - previous.createdAt.getTime()
    const minAgeMs = cfg.resendCooldownSec * 1000
    if (ageMs < minAgeMs) {
      const waitSeconds = Math.ceil((minAgeMs - ageMs) / 1000)
      throw new Error(`Please wait ${waitSeconds}s before requesting another OTP`)
    }
  }

  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + cfg.ttlSec * 1000)
  await prisma.otpChallenge.create({
    data: {
      phone,
      purpose: "login",
      codeHash: sha256(code),
      expiresAt,
      maxAttempts: cfg.maxAttempts,
      resendCount: (previous?.resendCount ?? 0) + 1,
    },
  })

  await smsService.send({
    to: phone,
    body: `Your Ziply5 OTP is ${code}. It expires in ${Math.floor(cfg.ttlSec / 60)} minutes.`,
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
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, purpose: "login", consumedAt: null },
    orderBy: { createdAt: "desc" },
  })
  if (!challenge) throw new Error("OTP not found")
  if (challenge.expiresAt < new Date()) throw new Error("OTP expired")
  if (challenge.attempts >= challenge.maxAttempts) throw new Error("OTP attempts exceeded")

  if (challenge.codeHash !== sha256(code.trim())) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    })
    throw new Error("Invalid OTP")
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  })

  let profile = await prisma.userProfile.findFirst({
    where: { phone },
    include: { user: { include: { roles: { include: { role: true } } } } },
  })

  if (!profile) {
    const role = await prisma.role.upsert({
      where: { key: ROLE_KEYS.CUSTOMER },
      update: { name: "customer" },
      create: { key: ROLE_KEYS.CUSTOMER, name: "customer" },
    })
    const syntheticEmail = `phone_${phone.replace(/\D/g, "")}_${Date.now()}@ziply5.local`
    const randomPasswordHash = await hashPassword(crypto.randomBytes(24).toString("hex"))
    const created = await prisma.user.create({
      data: {
        email: syntheticEmail,
        name: `User ${phone.slice(-4)}`,
        passwordHash: randomPasswordHash,
        roles: { create: [{ roleId: role.id }] },
        profile: { create: { phone } },
      },
      include: {
        profile: true,
        roles: { include: { role: true } },
      },
    })
    profile = {
      id: created.profile!.id,
      userId: created.id,
      phone: created.profile!.phone,
      avatarUrl: created.profile!.avatarUrl,
      createdAt: created.profile!.createdAt,
      updatedAt: created.profile!.updatedAt,
      user: created,
    }
  }

  const role = profile.user.roles[0]?.role.key ?? ROLE_KEYS.CUSTOMER
  return issueAuthTokens({
    userId: profile.user.id,
    email: profile.user.email,
    role,
    name: profile.user.name,
  })
}
