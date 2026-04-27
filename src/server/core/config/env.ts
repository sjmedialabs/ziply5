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
  REDIS_PASSWORD?: string
  REDIS_ENABLED?: string
  STORAGE_LOCAL_PATH: string
  CDN_BASE_URL: string
  PAYMENT_PROVIDER_DEFAULT?: string
  PAYMENT_WEBHOOK_SECRET?: string
  RAZORPAY_KEY_ID?: string
  RAZORPAY_KEY_SECRET?: string
  STRIPE_SECRET_KEY?: string
  SHIPROCKET_EMAIL?: string
  SHIPROCKET_PASSWORD?: string
  SHIPROCKET_BASE_URL?: string
  SHIPROCKET_MODE?: string
  SHIPROCKET_WEBHOOK_SECRET?: string
  SHIPROCKET_PICKUP_POSTCODE?: string
  OTP_TTL_SECONDS?: string
  RETURN_WINDOW_DAYS?: string
  OTP_MAX_ATTEMPTS?: string
  OTP_RESEND_COOLDOWN_SECONDS?: string
  SMS_PROVIDER?: string
  SMS_FROM?: string
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  MSG91_AUTH_KEY?: string
  MSG91_TEMPLATE_ID?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASS?: string
  SMTP_FROM?: string
  INTERNAL_JOB_SECRET?: string
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
  JWT_ACCESS_EXPIRES_IN: getEnv("JWT_ACCESS_EXPIRES_IN", "1h"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_ENABLED: process.env.REDIS_ENABLED,
  STORAGE_LOCAL_PATH: getEnv("STORAGE_LOCAL_PATH", "./storage/uploads"),
  CDN_BASE_URL: getEnv("CDN_BASE_URL", "https://cdn.ziply5.com"),
  PAYMENT_PROVIDER_DEFAULT: process.env.PAYMENT_PROVIDER_DEFAULT,
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  SHIPROCKET_EMAIL: process.env.SHIPROCKET_EMAIL,
  SHIPROCKET_PASSWORD: process.env.SHIPROCKET_PASSWORD,
  SHIPROCKET_BASE_URL: process.env.SHIPROCKET_BASE_URL,
  SHIPROCKET_MODE: process.env.SHIPROCKET_MODE,
  SHIPROCKET_WEBHOOK_SECRET: process.env.SHIPROCKET_WEBHOOK_SECRET,
  SHIPROCKET_PICKUP_POSTCODE: process.env.SHIPROCKET_PICKUP_POSTCODE,
  OTP_TTL_SECONDS: process.env.OTP_TTL_SECONDS,
  RETURN_WINDOW_DAYS: process.env.RETURN_WINDOW_DAYS,
  OTP_MAX_ATTEMPTS: process.env.OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS: process.env.OTP_RESEND_COOLDOWN_SECONDS,
  SMS_PROVIDER: process.env.SMS_PROVIDER,
  SMS_FROM: process.env.SMS_FROM,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET,
}
