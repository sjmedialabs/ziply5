import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { insertIntoCandidateTables, readFromCandidateTables } from "@/src/lib/db/_shared"

type UserAddressRow = {
  id: string
  userId: string
  label?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const ADDRESS_TABLES = ["UserAddress", "user_addresses"]
const USER_TABLES = ["User", "users"]
const ROLE_TABLES = ["Role", "roles"]
const USER_ROLE_TABLES = ["UserRole", "user_roles"]

export const listUserAddressesSupabase = async (userId: string): Promise<UserAddressRow[]> => {
  const client = getSupabaseAdmin()
  const rows = await readFromCandidateTables<UserAddressRow>(
    client,
    ADDRESS_TABLES,
    "id,userId,label,firstName,lastName,email,line1,line2,city,state,postalCode,country,phone,isDefault,createdAt,updatedAt",
    { orderBy: { column: "createdAt", ascending: false } },
  )
  return rows.filter((row) => row.userId === userId)
}

export const createUserAddressSupabase = async (
  userId: string,
  data: {
    label?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    line1: string
    line2?: string | null
    city: string
    state: string
    postalCode: string
    country?: string
    phone?: string | null
    isDefault?: boolean
  },
): Promise<UserAddressRow> => {
  const client = getSupabaseAdmin()
  return insertIntoCandidateTables<UserAddressRow>(
    client,
    ADDRESS_TABLES,
    {
      ...data,
      userId,
      country: data.country ?? "IN",
      isDefault: data.isDefault ?? false,
    },
    "id,userId,label,firstName,lastName,email,line1,line2,city,state,postalCode,country,phone,isDefault,createdAt,updatedAt",
  )
}

export const updateUserAddressSupabase = async (
  id: string,
  userId: string,
  data: Partial<{
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    label?: string | null
    line1?: string
    line2?: string | null
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string | null
    isDefault?: boolean
  }>,
): Promise<{ count: number }> => {
  const client = getSupabaseAdmin()
  for (const table of ADDRESS_TABLES) {
    const { data: row, error: readError } = await client
      .from(table)
      .select("id,userId")
      .eq("id", id)
      .eq("userId", userId)
      .maybeSingle()
    if (readError) continue
    if (!row) return { count: 0 }
    const { error: updateError } = await client.from(table).update(data).eq("id", id).eq("userId", userId)
    if (updateError) continue
    return { count: 1 }
  }
  return { count: 0 }
}

export const deleteUserAddressSupabase = async (id: string, userId: string): Promise<{ count: number }> => {
  const client = getSupabaseAdmin()
  for (const table of ADDRESS_TABLES) {
    const { error, count } = await client.from(table).delete({ count: "exact" }).eq("id", id).eq("userId", userId)
    if (!error) return { count: count ?? 0 }
  }
  return { count: 0 }
}

export const listUserIdsSupabase = async (input: { page?: number; limit?: number }) => {
  const client = getSupabaseAdmin()
  const page = Math.max(1, input.page ?? 1)
  const limit = Math.min(100, Math.max(1, input.limit ?? 20))
  const offset = (page - 1) * limit

  for (const table of USER_TABLES) {
    const attempts = [
      () =>
        client
          .from(table)
          .select("id", { count: "exact" })
          .order("createdAt", { ascending: false })
          .range(offset, offset + limit - 1),
      () =>
        client
          .from(table)
          .select("id", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1),
      () =>
        client
          .from(table)
          .select("id", { count: "exact" })
          .range(offset, offset + limit - 1),
    ]
    for (const run of attempts) {
      const { data, error, count } = await run()
      if (error) continue
      const ids = (data ?? []).map((row) => String((row as any).id ?? "")).filter(Boolean)
      return { ids, total: count ?? 0, page, limit }
    }
  }
  throw new Error("Unable to list users via Supabase")
}

const findBySingleField = async <T>(
  tables: string[],
  field: string,
  value: string,
  select = "*",
): Promise<T | null> => {
  const client = getSupabaseAdmin()
  for (const table of tables) {
    const { data, error } = await client.from(table).select(select).eq(field, value).maybeSingle()
    if (!error) return (data as T | null) ?? null
  }
  return null
}

export const createUserByAdminSupabase = async (input: {
  email: string
  name: string
  passwordHash: string
  roleKey: string
}) => {
  const client = getSupabaseAdmin()
  const normalizedEmail = input.email.trim().toLowerCase()
  const roleName = input.roleKey.replaceAll("_", " ")

  const existing = await findBySingleField<{ id: string }>(USER_TABLES, "email", normalizedEmail, "id")
  if (existing) throw new Error("Email already in use")

  let createdUser: { id: string } | null = null
  for (const table of USER_TABLES) {
    const { data, error } = await client
      .from(table)
      .insert({
        email: normalizedEmail,
        name: input.name,
        passwordHash: input.passwordHash,
      })
      .select("id")
      .single()
    if (!error && data?.id) {
      createdUser = { id: String(data.id) }
      break
    }
  }
  if (!createdUser) throw new Error("Unable to create user in Supabase")

  let roleId: string | null = null
  const existingRole = await findBySingleField<{ id: string }>(ROLE_TABLES, "key", input.roleKey, "id")
  if (existingRole?.id) {
    roleId = existingRole.id
  } else {
    for (const table of ROLE_TABLES) {
      const { data, error } = await client
        .from(table)
        .insert({ key: input.roleKey, name: roleName })
        .select("id")
        .single()
      if (!error && data?.id) {
        roleId = String(data.id)
        break
      }
    }
  }
  if (!roleId) throw new Error("Unable to create/find role")

  let linked = false
  for (const table of USER_ROLE_TABLES) {
    const { error } = await client.from(table).insert({ userId: createdUser.id, roleId })
    if (!error) {
      linked = true
      break
    }
  }
  if (!linked) throw new Error("Unable to link user role")

  return { id: createdUser.id }
}

export const updateUserStatusSupabase = async (userId: string, status: "active" | "suspended" | "deleted") => {
  const client = getSupabaseAdmin()
  for (const table of USER_TABLES) {
    const { data, error } = await client.from(table).update({ status }).eq("id", userId).select("*").maybeSingle()
    if (!error && data) return data as { id: string; email?: string | null; name?: string | null; status: string }
  }
  return null
}

export const getUserByIdSupabase = async (userId: string) => {
  const client = getSupabaseAdmin()
  for (const table of USER_TABLES) {
    const { data, error } = await client
      .from(table)
      .select("id,name,email,status")
      .eq("id", userId)
      .maybeSingle()
    if (!error && data) {
      return data as { id: string; name: string; email: string; status: "active" | "suspended" | "deleted" }
    }
  }
  return null
}

type UserSummary = {
  id: string
  email: string | null
  name: string | null
  status: "active" | "suspended" | "deleted"
  createdAt?: string
  roles: Array<{ role: { key: string; name: string } }>
}

const listRolesByUserId = async (userId: string): Promise<Array<{ role: { key: string; name: string } }>> => {
  const client = getSupabaseAdmin()
  let roleIds: string[] = []
  for (const table of USER_ROLE_TABLES) {
    const attempts = [
      () => client.from(table).select("roleId").eq("userId", userId),
      () => client.from(table).select("role_id").eq("user_id", userId),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (error) continue
      roleIds = (data ?? [])
        .map((row: any) => String(row.roleId ?? row.role_id ?? "").trim())
        .filter(Boolean)
      break
    }
    if (roleIds.length) break
  }
  if (!roleIds.length) return []

  const roles: Array<{ key: string; name: string }> = []
  for (const table of ROLE_TABLES) {
    const attempts = [
      () => client.from(table).select("id,key,name").in("id", roleIds),
      () => client.from(table).select("id,key,name").in("id", roleIds),
    ]
    for (const run of attempts) {
      const { data, error } = await run()
      if (error) continue
      for (const row of data ?? []) {
        const key = String((row as any).key ?? "").trim()
        if (!key) continue
        roles.push({ key, name: String((row as any).name ?? key).trim() || key })
      }
      break
    }
    if (roles.length) break
  }
  return roles.map((role) => ({ role }))
}

export const listUsersSupabase = async (input: { page?: number; limit?: number }) => {
  const idPayload = await listUserIdsSupabase(input)
  const users: UserSummary[] = []
  for (const userId of idPayload.ids) {
    const row = await getUserByIdSupabase(userId)
    if (!row) continue
    users.push({
      id: String((row as any).id),
      email: ((row as any).email ?? null) as string | null,
      name: ((row as any).name ?? null) as string | null,
      status: (((row as any).status ?? "active") as UserSummary["status"]),
      createdAt: (row as any).createdAt as string | undefined,
      roles: await listRolesByUserId(userId),
    })
  }
  return {
    items: users,
    total: idPayload.total,
    page: idPayload.page,
    limit: idPayload.limit,
  }
}

export const getUserByIdWithRolesSupabase = async (userId: string) => {
  const row = await getUserByIdSupabase(userId)
  if (!row) return null
  return {
    id: String((row as any).id),
    email: ((row as any).email ?? null) as string | null,
    name: ((row as any).name ?? null) as string | null,
    status: (((row as any).status ?? "active") as "active" | "suspended" | "deleted"),
    roles: await listRolesByUserId(userId),
  }
}

