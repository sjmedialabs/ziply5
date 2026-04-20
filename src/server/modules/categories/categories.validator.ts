import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().nullable().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})
