import { Prisma } from "@prisma/client"
import { prisma } from "@/src/server/db/prisma"
import { randomUUID } from "crypto"

export type MasterGroupRow = {
  id: string
  key: string
  name: string
  description: string | null
  isActive: boolean
}

export type MasterValueRow = {
  id: string
  groupId: string
  groupKey: string
  label: string
  value: string
  sortOrder: number
  metadata: Record<string, unknown>
  isActive: boolean
}

const mapBool = (value: unknown) => Boolean(value)
const mapNum = (value: unknown) => Number(value ?? 0)
const mapJson = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

const isMissingMasterTablesError = (error: unknown) => {
  if (!error || typeof error !== "object") return false
  const prismaCode = (error as { code?: string }).code
  if (prismaCode !== "P2010") return false
  const meta = (error as { meta?: { code?: string; message?: string } }).meta
  if (meta?.code !== "42P01") return false
  const message = (meta.message ?? "").toLowerCase()
  return message.includes("master_groups") || message.includes("master_values")
}

export const listMasterGroups = async (opts?: { activeOnly?: boolean }) => {
  let rows: Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }> = []
  try {
    rows = await prisma.$queryRaw<
      Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }>
    >(
      Prisma.sql`
        SELECT id, key, name, description, is_active
        FROM master_groups
        WHERE 1=1
        ${opts?.activeOnly ? Prisma.sql`AND is_active = true` : Prisma.empty}
        ORDER BY name ASC
      `,
    )
  } catch (error) {
    if (!isMissingMasterTablesError(error)) throw error
    console.warn("Master tables are not initialized yet. Returning empty groups.")
  }
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isActive: mapBool(row.is_active),
  }))
}

export const listMasterValues = async (groupKey: string, opts?: { activeOnly?: boolean }) => {
  let rows: Array<{
    id: string
    group_id: string
    group_key: string
    label: string
    value: string
    sort_order: number
    metadata: unknown
    is_active: boolean
  }> = []
  try {
    rows = await prisma.$queryRaw<
      Array<{
        id: string
        group_id: string
        group_key: string
        label: string
        value: string
        sort_order: number
        metadata: unknown
        is_active: boolean
      }>
    >(
      Prisma.sql`
        SELECT mv.id, mv.group_id, mg.key as group_key, mv.label, mv.value, mv.sort_order, mv.metadata, mv.is_active
        FROM master_values mv
        INNER JOIN master_groups mg ON mg.id = mv.group_id
        WHERE mg.key = ${groupKey}
        ${opts?.activeOnly ? Prisma.sql`AND mg.is_active = true AND mv.is_active = true` : Prisma.empty}
        ORDER BY mv.sort_order ASC, mv.label ASC
      `,
    )
  } catch (error) {
    if (!isMissingMasterTablesError(error)) throw error
    console.warn("Master tables are not initialized yet. Returning empty values.")
  }
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupKey: row.group_key,
    label: row.label,
    value: row.value,
    sortOrder: mapNum(row.sort_order),
    metadata: mapJson(row.metadata),
    isActive: mapBool(row.is_active),
  }))
}

export const getAllMasterData = async (activeOnly = true) => {
  const groups = await listMasterGroups({ activeOnly: false })
  let valuesRows: Array<{
    id: string
    group_id: string
    group_key: string
    label: string
    value: string
    sort_order: number
    metadata: unknown
    is_active: boolean
    group_active: boolean
  }> = []
  try {
    valuesRows = await prisma.$queryRaw<
      Array<{
        id: string
        group_id: string
        group_key: string
        label: string
        value: string
        sort_order: number
        metadata: unknown
        is_active: boolean
        group_active: boolean
      }>
    >(
      Prisma.sql`
        SELECT mv.id, mv.group_id, mg.key as group_key, mv.label, mv.value, mv.sort_order, mv.metadata, mv.is_active, mg.is_active as group_active
        FROM master_values mv
        INNER JOIN master_groups mg ON mg.id = mv.group_id
        ORDER BY mg.key ASC, mv.sort_order ASC, mv.label ASC
      `,
    )
  } catch (error) {
    if (!isMissingMasterTablesError(error)) throw error
    console.warn("Master tables are not initialized yet. Returning empty master values.")
  }
  const grouped = valuesRows.reduce<Record<string, MasterValueRow[]>>((acc, row) => {
    if (activeOnly && (!row.group_active || !row.is_active)) return acc
    const entry: MasterValueRow = {
      id: row.id,
      groupId: row.group_id,
      groupKey: row.group_key,
      label: row.label,
      value: row.value,
      sortOrder: mapNum(row.sort_order),
      metadata: mapJson(row.metadata),
      isActive: mapBool(row.is_active),
    }
    if (!acc[row.group_key]) acc[row.group_key] = []
    acc[row.group_key].push(entry)
    return acc
  }, {})

  const normalizedGroups = groups
    .filter((group) => !activeOnly || group.isActive)
    .map((group) => ({
      ...group,
      values: grouped[group.key] ?? [],
    }))
  return normalizedGroups
}

export const createMasterGroup = async (input: {
  key: string
  name: string
  description?: string | null
  isActive?: boolean
}) => {
  const id = randomUUID()
  const rows = await prisma.$queryRaw<
    Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }>
  >(
    Prisma.sql`
      INSERT INTO master_groups (id, key, name, description, is_active, updated_at)
      VALUES (${id}, ${input.key.trim().toUpperCase()}, ${input.name.trim()}, ${input.description ?? null}, ${input.isActive ?? true}, now())
      RETURNING id, key, name, description, is_active
    `,
  )
  const row = rows[0]
  if (!row) throw new Error("Failed to create master group")
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isActive: mapBool(row.is_active),
  }
}

export const updateMasterGroup = async (
  id: string,
  input: { name?: string; description?: string | null; isActive?: boolean },
) => {
  const row = await prisma.masterGroup.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  })

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isActive: mapBool(row.isActive),
  }
}

export const deleteMasterGroup = async (id: string) => {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM master_groups WHERE id = ${id}`)
  return { id }
}

export const createMasterValue = async (input: {
  groupKey: string
  label: string
  value: string
  sortOrder?: number
  metadata?: Record<string, unknown>
  isActive?: boolean
}) => {
  const id = randomUUID()
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      group_id: string
      group_key: string
      label: string
      value: string
      sort_order: number
      metadata: unknown
      is_active: boolean
    }>
  >(
    Prisma.sql`
      INSERT INTO master_values (id, group_id, label, value, sort_order, metadata, is_active, updated_at)
      SELECT ${id}, mg.id, ${input.label.trim()}, ${input.value.trim()}, ${input.sortOrder ?? 0}, ${JSON.stringify(input.metadata ?? {})}::jsonb, ${input.isActive ?? true}, now()
      FROM master_groups mg
      WHERE mg.key = ${input.groupKey.trim().toUpperCase()}
      RETURNING id, group_id, ${input.groupKey.trim().toUpperCase()} as group_key, label, value, sort_order, metadata, is_active
    `,
  )
  if (!rows[0]) throw new Error("Master group not found")
  const row = rows[0]
  return {
    id: row.id,
    groupId: row.group_id,
    groupKey: row.group_key,
    label: row.label,
    value: row.value,
    sortOrder: mapNum(row.sort_order),
    metadata: mapJson(row.metadata),
    isActive: mapBool(row.is_active),
  }
}

export const updateMasterValue = async (
  id: string,
  input: {
    label?: string
    value?: string
    sortOrder?: number
    metadata?: Record<string, unknown>
    isActive?: boolean
  },
) => {
  const row = await prisma.masterValue.update({
    where: { id },
    data: {
      ...(input.label !== undefined && { label: input.label.trim() }),
      ...(input.value !== undefined && { value: input.value.trim() }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.metadata !== undefined && { metadata: input.metadata as any }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: { group: true }
  })

  return {
    id: row.id,
    groupId: row.groupId,
    groupKey: row.group.key,
    label: row.label,
    value: row.value,
    sortOrder: mapNum(row.sortOrder),
    metadata: mapJson(row.metadata),
    isActive: mapBool(row.isActive),
  }
}

export const deleteMasterValue = async (id: string) => {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM master_values WHERE id = ${id}`)
  return { id }
}

export const assertMasterValueExists = async (groupKey: string, value: string) => {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(
    Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM master_values mv
        INNER JOIN master_groups mg ON mg.id = mv.group_id
        WHERE mg.key = ${groupKey.trim().toUpperCase()}
          AND mv.value = ${value}
          AND mg.is_active = true
          AND mv.is_active = true
      ) as exists
    `,
  )
  return Boolean(rows[0]?.exists)
}
