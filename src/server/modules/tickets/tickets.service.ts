import { prisma } from "@/src/server/db/prisma"
import type { TicketStatus } from "@prisma/client"

export const createTicket = async (createdById: string, subject: string) => {
  return prisma.ticket.create({
    data: { createdById, subject },
  })
}

export const listTickets = async (actorId: string, role: string) => {
  const isStaff = role === "admin" || role === "super_admin"
  return prisma.ticket.findMany({
    where: isStaff ? {} : { createdById: actorId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
}

export const updateTicketStatus = async (id: string, status: TicketStatus) => {
  return prisma.ticket.update({
    where: { id },
    data: { status },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
}
