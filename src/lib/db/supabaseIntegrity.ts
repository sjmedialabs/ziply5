import crypto from "node:crypto"
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

export type CandidateTables = readonly string[]

type TableCapabilities = {
  hasIdColumn?: boolean
}

const tableCaps = new Map<string, TableCapabilities>()

export const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)

export const camelToSnakeObject = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [camelToSnake(k), v]))

export const safeString = (value: unknown) => String(value ?? "").trim()

export const withId = (payload: Record<string, unknown>) => {
  if (payload.id != null && safeString(payload.id)) return payload
  return { id: crypto.randomUUID(), ...payload }
}

export const shouldRetryWithTimestamps = (message: string) => {
  const m = message.toLowerCase()
  return (
    m.includes("violates not-null constraint") &&
    (m.includes('"updatedat"') || m.includes('"createdat"') || m.includes('"updated_at"') || m.includes('"created_at"'))
  )
}

export const shouldRetryWithId = (message: string) => {
  const m = message.toLowerCase()
  return m.includes("violates not-null constraint") && m.includes('"id"')
}

const markNoIdColumn = (table: string, message: string) => {
  if (message.toLowerCase().includes("could not find the 'id' column")) {
    tableCaps.set(table, { ...(tableCaps.get(table) ?? {}), hasIdColumn: false })
  }
}

export type InsertWithIdResult = { row: Record<string, unknown> | null; errors: string[]; usedTable?: string }
export type InsertNoIdResult = { ok: boolean; errors: string[]; usedTable?: string }

export async function insertCandidateWithId(
  client: SupabaseClient,
  tables: CandidateTables,
  payloads: Array<Record<string, unknown>>,
): Promise<InsertWithIdResult> {
  const errors: string[] = []
  for (const table of tables) {
    const cap = tableCaps.get(table)
    if (cap?.hasIdColumn === false) {
      errors.push(`${table}: id column missing (cached)`)
      continue
    }
    for (const payload of payloads) {
      const { data, error } = await client.from(table).insert(payload).select("id").maybeSingle()
      if (!error && data) return { row: data as Record<string, unknown>, errors, usedTable: table }
      if (error) {
        markNoIdColumn(table, error.message)
        errors.push(`${table}: ${error.message}`)

        if (shouldRetryWithTimestamps(error.message)) {
          const now = new Date().toISOString()
          const retryPayload = { ...payload, createdAt: (payload as any).createdAt ?? now, updatedAt: (payload as any).updatedAt ?? now }
          const retry = await client.from(table).insert(retryPayload).select("id").maybeSingle()
          if (!retry.error && retry.data) return { row: retry.data as Record<string, unknown>, errors, usedTable: table }
          if (retry.error) errors.push(`${table} (retry timestamps): ${retry.error.message}`)
        }

        if (shouldRetryWithId(error.message)) {
          const retry = await client.from(table).insert(withId(payload)).select("id").maybeSingle()
          if (!retry.error && retry.data) return { row: retry.data as Record<string, unknown>, errors, usedTable: table }
          if (retry.error) errors.push(`${table} (retry id): ${retry.error.message}`)
        }
      }
    }
  }
  return { row: null, errors }
}

export async function insertCandidateNoId(
  client: SupabaseClient,
  tables: CandidateTables,
  payloads: Array<Record<string, unknown>>,
): Promise<InsertNoIdResult> {
  const errors: string[] = []
  for (const table of tables) {
    for (const payload of payloads) {
      const { error } = await client.from(table).insert(payload)
      if (!error) return { ok: true, errors, usedTable: table }
      errors.push(`${table}: ${error.message}`)
    }
  }
  return { ok: false, errors }
}

export async function updateCandidateById(
  client: SupabaseClient,
  tables: CandidateTables,
  id: string,
  payloads: Array<Record<string, unknown>>,
): Promise<{ ok: boolean; errors: string[]; usedTable?: string }> {
  const errors: string[] = []
  for (const table of tables) {
    for (const payload of payloads) {
      const { data, error } = await client.from(table).update(payload).eq("id", id).select("id").maybeSingle()
      if (!error && data) return { ok: true, errors, usedTable: table }
      if (error) errors.push(`${table}: ${error.message}`)
    }
  }
  return { ok: false, errors }
}

export async function deleteCandidateById(
  client: SupabaseClient,
  tables: CandidateTables,
  id: string,
): Promise<{ ok: boolean; errors: string[]; usedTable?: string }> {
  const errors: string[] = []
  for (const table of tables) {
    const { error } = await client.from(table).delete().eq("id", id)
    if (!error) return { ok: true, errors, usedTable: table }
    errors.push(`${table}: ${error.message}`)
  }
  return { ok: false, errors }
}

export async function readCandidateById<T extends Record<string, unknown>>(
  client: SupabaseClient,
  tables: CandidateTables,
  id: string,
): Promise<T | null> {
  for (const table of tables) {
    const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle()
    if (!error) return (data as T | null) ?? null
  }
  return null
}

export function formatPostgrestError(error: PostgrestError | null | undefined) {
  if (!error) return null
  return {
    message: error.message,
    code: (error as any).code,
    details: (error as any).details,
    hint: (error as any).hint,
  }
}

