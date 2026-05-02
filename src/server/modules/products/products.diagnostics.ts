import { pgQuery } from "@/src/server/db/pg"

export const getProductApiDiagnostics = async () => {
  const diagnostics = {
    dbDriver: "postgres" as const,
    dbConnectionOk: false,
    productTableExists: false,
  }

  try {
    await pgQuery("SELECT 1")
    diagnostics.dbConnectionOk = true
  } catch {
    diagnostics.dbConnectionOk = false
  }

  try {
    const rows = (await pgQuery(
      "SELECT to_regclass('public.\"Product\"') AS product_table",
    )) as Array<{ product_table: string | null }>
    diagnostics.productTableExists = Boolean(rows?.[0]?.product_table)
  } catch {
    diagnostics.productTableExists = false
  }

  return diagnostics
}
