export const cacheKeys = {
  categories: () => "cache:v1:categories",
  brands: () => "cache:v1:brands",
  financeSummary: () => "cache:v1:finance:summary",
  dashboardSummary: (scope: string) => `cache:v1:dashboard:summary:${scope}`,
  masterGroups: (role: string, activeOnly: boolean) => `cache:v1:master:groups:${role}:${activeOnly}`,
  masterValues: (group: string, role: string, activeOnly: boolean) => `cache:v1:master:values:${group}:${role}:${activeOnly}`,
  permissionsByUser: (userId: string) => `cache:v1:auth:permissions:${userId}`,
}

