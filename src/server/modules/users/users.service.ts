import { prisma } from "@/src/server/db/prisma"
import { hashPassword } from "@/src/server/core/security/password"
import {
  createUserByAdminSupabase,
  getUserByIdSupabase,
  listUserIdsSupabase,
  updateUserStatusSupabase,
} from "@/src/lib/db/users"
import { logger } from "@/lib/logger"

export const listUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit

  const selectShape = {
    id: true,
    email: true,
    name: true,
    status: true,
    createdAt: true,
    roles: { include: { role: { select: { key: true, name: true } } } },
  } as const

  let items: Array<any> = []
  let total = 0
  const supabaseReadsEnabled = process.env.SUPABASE_USERS_READ_ENABLED === "true"
  if (supabaseReadsEnabled) {
    try {
      const idPayload = await listUserIdsSupabase({ page, limit })
      total = idPayload.total
      if (idPayload.ids.length) {
        const hydrated = await prisma.user.findMany({
          where: { id: { in: idPayload.ids } },
          select: selectShape,
        })
        const byId = new Map(hydrated.map((row) => [row.id, row]))
        items = idPayload.ids.map((id) => byId.get(id)).filter(Boolean)
      } else {
        items = []
      }
    } catch (error) {
      logger.warn("users.list.supabase_fallback_prisma", {
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }

  if (!items.length && total === 0) {
    ;[items, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: selectShape,
      }),
      prisma.user.count(),
    ])
  }

  return { items, total, page, limit }
}

export const createUserByAdmin = async (input: {
  email: string
  name: string
  password: string
  roleKey: string
}) => {
  const passwordHash = await hashPassword(input.password)
  const supabaseWritesEnabled = process.env.SUPABASE_USERS_WRITE_ENABLED === "true"

  if (supabaseWritesEnabled) {
    try {
      const created = await createUserByAdminSupabase({
        email: input.email,
        name: input.name,
        passwordHash,
        roleKey: input.roleKey,
      })
      const hydrated = await prisma.user.findUnique({
        where: { id: created.id },
        include: { roles: { include: { role: true } } },
      })
      if (hydrated) return hydrated
      return { id: created.id, email: input.email.trim().toLowerCase(), name: input.name } as any
    } catch (error) {
      logger.warn("users.create.supabase_fallback_prisma", {
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } })
  if (existing) throw new Error("Email already in use")
  const role = await prisma.role.upsert({
    where: { key: input.roleKey },
    update: { name: input.roleKey.replaceAll("_", " ") },
    create: { key: input.roleKey, name: input.roleKey.replaceAll("_", " ") },
  })

  return prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      name: input.name,
      passwordHash,
      roles: { create: [{ roleId: role.id }] },
    },
    include: { roles: { include: { role: true } } },
  })
}

export const updateUserStatus = async (userId: string, status: "active" | "suspended" | "deleted") => {
  const supabaseWritesEnabled = process.env.SUPABASE_USERS_WRITE_ENABLED === "true"
  if (supabaseWritesEnabled) {
    try {
      const updated = await updateUserStatusSupabase(userId, status)
      if (updated) return updated
    } catch (error) {
      logger.warn("users.status.supabase_fallback_prisma", {
        userId,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  })
}

export const getUserById = async (userId: string) => {
  const supabaseReadsEnabled = process.env.SUPABASE_USERS_READ_ENABLED === "true"
  if (supabaseReadsEnabled) {
    try {
      const row = await getUserByIdSupabase(userId)
      if (row) return row
    } catch (error) {
      logger.warn("users.get_by_id.supabase_fallback_prisma", {
        userId,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, status: true },
  })
}
