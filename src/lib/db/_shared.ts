import type { SupabaseClient } from "@supabase/supabase-js"

const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)

const shouldRetryWithTimestamps = (message: string) => {
  const m = message.toLowerCase()
  return (
    m.includes("violates not-null constraint") &&
    (m.includes('"updatedat"') || m.includes('"createdat"') || m.includes('"updated_at"') || m.includes('"created_at"'))
  )
}

export const readFromCandidateTables = async <T>(
  client: SupabaseClient,
  tables: string[],
  selectClause: string,
  options?: {
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
  },
): Promise<T[]> => {
  let lastError: Error | null = null
  for (const table of tables) {
    try {
      let query = client.from(table).select(selectClause)
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        })
      }
      if (options?.limit) query = query.limit(options.limit)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as T[]
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw lastError ?? new Error("No matching table available")
}

export const insertIntoCandidateTables = async <T>(
  client: SupabaseClient,
  tables: string[],
  payload: Record<string, unknown>,
  selectClause = "*",
): Promise<T> => {
  let lastError: Error | null = null
  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).insert(payload).select(selectClause).single()
      if (error) throw error
      return data as T
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      // Common in Supabase when schema has NOT NULL timestamps but payload omits them.
      if (shouldRetryWithTimestamps(err.message)) {
        const now = new Date().toISOString()
        const camelPayload = { ...payload, createdAt: (payload as any).createdAt ?? now, updatedAt: (payload as any).updatedAt ?? now }
        try {
          const { data, error } = await client.from(table).insert(camelPayload).select(selectClause).single()
          if (error) throw error
          return data as T
        } catch {}
        const snakePayload = Object.fromEntries(Object.entries({ ...payload, created_at: (payload as any).created_at ?? now, updated_at: (payload as any).updated_at ?? now }).map(([k, v]) => [camelToSnake(k), v]))
        try {
          const { data, error } = await client.from(table).insert(snakePayload).select(selectClause).single()
          if (error) throw error
          return data as T
        } catch {}
      }
      lastError = err
    }
  }
  throw lastError ?? new Error("No matching table available")
}

