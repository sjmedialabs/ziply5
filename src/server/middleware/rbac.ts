import { fail } from "@/src/server/core/http/response"
import { hasPermission, type RoleKey } from "@/src/server/core/rbac/permissions"

export const requirePermission = (role: string, permission: string) => {
  if (!hasPermission(role as RoleKey, permission)) {
    return fail("Forbidden", 403)
  }
  return null
}
