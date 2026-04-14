import { z } from "zod"

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["super_admin", "admin", "seller", "customer"]).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  portal: z.enum(["website", "admin", "seller"]).optional(),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
})
