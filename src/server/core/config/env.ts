type AppEnv = {
  /** If true, forgot-password API includes reset token in JSON (dev/testing only). */
  PASSWORD_RESET_RETURN_TOKEN: boolean
  DATABASE_URL: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  JWT_ACCESS_EXPIRES_IN: string
  JWT_REFRESH_EXPIRES_IN: string
  REDIS_URL?: string
  STORAGE_LOCAL_PATH: string
  CDN_BASE_URL: string
}

const getEnv = (key: keyof AppEnv, fallback?: string) => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env: AppEnv = {
  PASSWORD_RESET_RETURN_TOKEN: process.env.PASSWORD_RESET_RETURN_TOKEN === "true",
  DATABASE_URL: getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ziply5_admin?schema=public"),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET", "dev_access_secret"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  JWT_ACCESS_EXPIRES_IN: getEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  REDIS_URL: process.env.REDIS_URL,
  STORAGE_LOCAL_PATH: getEnv("STORAGE_LOCAL_PATH", "./storage/uploads"),
  CDN_BASE_URL: getEnv("CDN_BASE_URL", "https://cdn.ziply5.com"),
}
