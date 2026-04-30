/**
 * Prisma has been intentionally retired from the runtime path.
 * This module is kept as a compatibility stub for any legacy imports.
 */

export const prisma: never = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Prisma is disabled in this project. Use Supabase or pg queries instead.",
      )
    },
  },
) as never

export default prisma