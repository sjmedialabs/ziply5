import { z } from "zod"

export const createProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().min(2),
  price: z.number().positive(),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sellerId: z.string().nullable().optional(),
})

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sellerId: z.string().nullable().optional(),
})
