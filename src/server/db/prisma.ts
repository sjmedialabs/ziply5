/**
 * Prisma has been intentionally retired from the runtime path.
 *
 * This file remains ONLY to avoid breaking legacy imports during migration.
 * Any attempt to use `prisma` will throw at runtime so we can find and remove
 * remaining call-sites deterministically.
 */

export const prisma: never = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Prisma is disabled in this project. Use Supabase or pg queries (src/server/db/pg.ts) instead.",
      )
    },
  },
) as never
