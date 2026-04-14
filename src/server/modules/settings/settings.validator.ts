import { z } from "zod"

export const upsertSettingSchema = z.object({
  group: z.string().min(1),
  key: z.string().min(1),
  valueJson: z.unknown(),
})
