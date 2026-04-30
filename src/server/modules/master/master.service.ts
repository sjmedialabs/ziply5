import { randomUUID } from "crypto"
import { pgQuery } from "@/src/server/db/pg"

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
  const code = (error as { code?: string }).code
  if (code !== "42P01") return false
  const message = ((error as { message?: string }).message ?? "").toLowerCase()
  return message.includes("master_groups") || message.includes("master_values")
}

export const listMasterGroups = async (opts?: { activeOnly?: boolean }) => {
  let rows: Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }> = []
  try {
    rows = await pgQuery<Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }>>(
      `
        SELECT id, key, name, description, is_active
        FROM master_groups
        ${opts?.activeOnly ? `WHERE is_active = true` : ``}
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
    rows = await pgQuery<
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
      `
        SELECT mv.id, mv.group_id, mg.key as group_key, mv.label, mv.value, mv.sort_order, mv.metadata, mv.is_active
        FROM master_values mv
        INNER JOIN master_groups mg ON mg.id = mv.group_id
        WHERE mg.key = $1
        ${opts?.activeOnly ? `AND mg.is_active = true AND mv.is_active = true` : ``}
        ORDER BY mv.sort_order ASC, mv.label ASC
      `,
      [groupKey],
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
    valuesRows = await pgQuery<
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
      `
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
  const rows = await pgQuery<Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }>>(
    `
      INSERT INTO master_groups (id, key, name, description, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING id, key, name, description, is_active
    `,
    [id, input.key.trim().toUpperCase(), input.name.trim(), input.description ?? null, input.isActive ?? true],
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
  const sets: string[] = []
  const params: any[] = []
  if (input.name !== undefined) {
    params.push(input.name.trim())
    sets.push(`name = $${params.length}`)
  }
  if (input.description !== undefined) {
    params.push(input.description)
    sets.push(`description = $${params.length}`)
  }
  if (input.isActive !== undefined) {
    params.push(input.isActive)
    sets.push(`is_active = $${params.length}`)
  }
  sets.push(`updated_at = now()`)
  params.push(id)
  const rows = await pgQuery<Array<{ id: string; key: string; name: string; description: string | null; is_active: boolean }>>(
    `UPDATE master_groups SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id, key, name, description, is_active`,
    params,
  )
  const row = rows[0]
  if (!row) throw new Error("Master group not found")

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isActive: mapBool(row.is_active),
  }
}

export const deleteMasterGroup = async (id: string) => {
  await pgQuery(`DELETE FROM master_groups WHERE id = $1`, [id])
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
  const rows = await pgQuery<
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
    `
      INSERT INTO master_values (id, group_id, label, value, sort_order, metadata, is_active, updated_at)
      SELECT $1, mg.id, $2, $3, $4, $5::jsonb, $6, now()
      FROM master_groups mg
      WHERE mg.key = $7
      RETURNING id, group_id, $7 as group_key, label, value, sort_order, metadata, is_active
    `,
    [
      id,
      input.label.trim(),
      input.value.trim(),
      input.sortOrder ?? 0,
      JSON.stringify(input.metadata ?? {}),
      input.isActive ?? true,
      input.groupKey.trim().toUpperCase(),
    ],
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
  const sets: string[] = []
  const params: any[] = []
  if (input.label !== undefined) {
    params.push(input.label.trim())
    sets.push(`label = $${params.length}`)
  }
  if (input.value !== undefined) {
    params.push(input.value.trim())
    sets.push(`value = $${params.length}`)
  }
  if (input.sortOrder !== undefined) {
    params.push(input.sortOrder)
    sets.push(`sort_order = $${params.length}`)
  }
  if (input.metadata !== undefined) {
    params.push(JSON.stringify(input.metadata ?? {}))
    sets.push(`metadata = $${params.length}::jsonb`)
  }
  if (input.isActive !== undefined) {
    params.push(input.isActive)
    sets.push(`is_active = $${params.length}`)
  }
  sets.push(`updated_at = now()`)
  params.push(id)
  const rows = await pgQuery<
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
    `
      UPDATE master_values mv
      SET ${sets.join(", ")}
      FROM master_groups mg
      WHERE mv.id = $${params.length}
        AND mg.id = mv.group_id
      RETURNING mv.id, mv.group_id, mg.key as group_key, mv.label, mv.value, mv.sort_order, mv.metadata, mv.is_active
    `,
    params,
  )
  const row = rows[0]
  if (!row) throw new Error("Master value not found")

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

export const deleteMasterValue = async (id: string) => {
  await pgQuery(`DELETE FROM master_values WHERE id = $1`, [id])
  return { id }
}

export const assertMasterValueExists = async (groupKey: string, value: string) => {
  const rows = await pgQuery<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM master_values mv
        INNER JOIN master_groups mg ON mg.id = mv.group_id
        WHERE mg.key = $1
          AND mv.value = $2
          AND mg.is_active = true
          AND mv.is_active = true
      ) as exists
    `,
    [groupKey.trim().toUpperCase(), value],
  )
  return Boolean(rows[0]?.exists)
}
