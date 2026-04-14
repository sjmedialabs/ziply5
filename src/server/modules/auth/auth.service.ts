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

type SignupInput = {
  name: string
  email: string
  password: string
  role?: "super_admin" | "admin" | "seller" | "customer"
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

  return user
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
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role,
  })
  const refreshToken = signRefreshToken({
    sub: user.id,
    role,
  })

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    },
    accessToken,
    refreshToken,
  }
}

export const assertPortalAccess = (
  role: string,
  portal: "website" | "admin" | "seller" = "website",
) => {
  if (portal === "admin" && !(role === "admin" || role === "super_admin")) {
    throw new Error("This account is not allowed in admin login")
  }

  if (portal === "seller" && role !== "seller") {
    throw new Error("This account is not allowed in seller login")
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
