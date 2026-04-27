import type { SupabaseClient } from "@supabase/supabase-js"

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
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }
  throw lastError ?? new Error("No matching table available")
}

