export const renderPlaceholders = (text: string, vars: Record<string, string>) =>
  text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => vars[String(key)] ?? "")

