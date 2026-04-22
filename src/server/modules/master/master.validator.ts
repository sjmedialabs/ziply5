import { z } from "zod"

export const createMasterGroupSchema = z.object({
  key: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
})

export const createMasterValueSchema = z.object({
  groupKey: z.string().trim().min(2).max(80),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export const updateMasterValueSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  value: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})
