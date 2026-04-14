import { prisma } from "@/src/server/db/prisma"

export const listNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export const markNotificationRead = async (id: string, userId: string) => {
  const n = await prisma.notification.findFirst({ where: { id, userId } })
  if (!n) throw new Error("Notification not found")
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })
}
