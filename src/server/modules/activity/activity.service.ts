import { prisma } from "@/src/server/db/prisma"

export const logActivity = async (input: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: unknown
}) => {
  await prisma.activityLog.create({
    data: {
      actorId: input.actorId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      metadata: input.metadata === undefined ? undefined : (input.metadata as never),
    },
  })
}
