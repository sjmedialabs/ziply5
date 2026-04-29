import { hashPassword } from "@/src/server/core/security/password"
import {
  createUserByAdminSupabase,
  getUserByIdWithRolesSupabase,
  getUserByIdSupabase,
  listUsersSupabase,
  updateUserStatusSupabase,
} from "@/src/lib/db/users"
import { logger } from "@/lib/logger"

export const listUsers = async (page = 1, limit = 20) => {
  try {
    return await listUsersSupabase({ page, limit })
  } catch (error) {
    logger.error("users.list.supabase_failed", {
      error: error instanceof Error ? error.message : "unknown",
    })
    throw new Error("Unable to list users via Supabase")
  }
}

export const createUserByAdmin = async (input: {
  email: string
  name: string
  password: string
  roleKey: string
}) => {
  const passwordHash = await hashPassword(input.password)
  const created = await createUserByAdminSupabase({
    email: input.email, 
    name: input.name,
    passwordHash,
    roleKey: input.roleKey,
  })
  const hydrated = await getUserByIdWithRolesSupabase(created.id)
  if (hydrated) return hydrated
  return { id: created.id, email: input.email.trim().toLowerCase(), name: input.name, roles: [] } as any
}

export const updateUserStatus = async (userId: string, status: "active" | "suspended" | "deleted") => {
  const updated = await updateUserStatusSupabase(userId, status)
  if (updated) return updated
  throw new Error("Unable to update user status via Supabase")
}

export const getUserById = async (userId: string) => {
  const row = await getUserByIdSupabase(userId)
  if (row) return row
  const withRoles = await getUserByIdWithRolesSupabase(userId)
  if (withRoles) return withRoles
  return null
}

export const assertUsersSupabaseEnabled = () => {
  if (process.env.SUPABASE_USERS_READ_ENABLED !== "true" || process.env.SUPABASE_USERS_WRITE_ENABLED !== "true") {
    logger.warn("users.supabase_flags_not_fully_enabled", {
      read: process.env.SUPABASE_USERS_READ_ENABLED,
      write: process.env.SUPABASE_USERS_WRITE_ENABLED,
    })
  }
}
