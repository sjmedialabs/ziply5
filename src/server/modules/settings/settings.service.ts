import { prisma } from "@/src/server/db/prisma"

export const listSettings = async (group?: string) => {
  return prisma.setting.findMany({
    where: group ? { group } : undefined,
    orderBy: [{ group: "asc" }, { key: "asc" }],
  })
}

export const upsertSetting = async (input: { group: string; key: string; valueJson: unknown }) => {
  return prisma.setting.upsert({
    where: { group_key: { group: input.group, key: input.key } },
    update: { valueJson: input.valueJson as never },
    create: {
      group: input.group,
      key: input.key,
      valueJson: input.valueJson as never,
    },
  })
}
