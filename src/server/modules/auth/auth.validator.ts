import { z } from "zod"

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["super_admin", "admin", "customer"]).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  portal: z.enum(["website", "admin"]).optional(),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
})

export const requestOtpSchema = z.object({
  phone: z.string().min(8),
  purpose: z.enum(["login"]).default("login"),
})

export const verifyOtpSchema = z.object({
  phone: z.string().min(8),
  code: z.string().regex(/^\d{6}$/),
  portal: z.enum(["website", "admin"]).optional(),
})
