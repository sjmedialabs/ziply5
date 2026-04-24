import { prisma } from "@/src/server/db/prisma"

export const getProductApiDiagnostics = async () => {
  const diagnostics = {
    prismaClientReady: typeof prisma.product?.findMany === "function",
    dbConnectionOk: false,
    productTableExists: false,
  }

  try {
    await prisma.$queryRawUnsafe("SELECT 1")
    diagnostics.dbConnectionOk = true
  } catch {
    diagnostics.dbConnectionOk = false
  }

  try {
    const rows = (await prisma.$queryRawUnsafe(
      "SELECT to_regclass('public.\"Product\"') AS product_table",
    )) as Array<{ product_table: string | null }>
    diagnostics.productTableExists = Boolean(rows?.[0]?.product_table)
  } catch {
    diagnostics.productTableExists = false
  }

  return diagnostics
}
