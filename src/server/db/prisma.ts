import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    // Prefer direct/session URL for runtime Prisma to avoid interactive
    // transaction issues with transaction-pooler connections.
    datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
