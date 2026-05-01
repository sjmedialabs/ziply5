import type { SupabaseClient } from "@supabase/supabase-js"
import { camelToSnake, insertCandidateWithId, shouldRetryWithTimestamps } from "@/src/lib/db/supabaseIntegrity"

/** PostgREST errors are often plain objects; preserve message/details for logs and HTTP responses. */
export function supabaseThrownReasonToError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  if (reason && typeof reason === "object") {
    const o = reason as Record<string, unknown>
    const chunks = [o.message, o.details, o.hint].filter((x): x is string => typeof x === "string" && x.length > 0)
    const text = chunks.length > 0 ? chunks.join(" — ") : JSON.stringify(reason)
    const err = new Error(text)
    const code = o.code ?? o.statusCode
    if (typeof code === "string" || typeof code === "number") {
      ;(err as Error & { code?: string | number }).code = code
    }
    return err
  }
  return new Error(String(reason))
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
      if (error) throw supabaseThrownReasonToError(error)
      return (data ?? []) as T[]
    } catch (error) {
      lastError = supabaseThrownReasonToError(error)
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
  // `insertCandidateWithId` handles timestamp retries and id-required retries.
  // We still need to return the selected shape, so we retry the successful table with `.select(selectClause)`.
  const inserted = await insertCandidateWithId(client, tables, [payload])
  if (!inserted.row || !inserted.usedTable) {
    throw new Error(inserted.errors[inserted.errors.length - 1] ?? "No matching table available")
  }

  // Re-read using the desired select clause.
  const { data, error } = await client.from(inserted.usedTable).select(selectClause).eq("id", inserted.row.id as any).single()
  if (error) throw supabaseThrownReasonToError(error)
  return data as T
}

