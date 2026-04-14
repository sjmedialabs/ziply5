import { prisma } from "@/src/server/db/prisma"
import { hashPassword } from "@/src/server/core/security/password"

export const listUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        roles: { include: { role: { select: { key: true, name: true } } } },
      },
    }),
    prisma.user.count(),
  ])
  return { items, total, page, limit }
}

export const createUserByAdmin = async (input: {
  email: string
  name: string
  password: string
  roleKey: string
}) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } })
  if (existing) throw new Error("Email already in use")

  const passwordHash = await hashPassword(input.password)
  const role = await prisma.role.upsert({
    where: { key: input.roleKey },
    update: { name: input.roleKey.replaceAll("_", " ") },
    create: { key: input.roleKey, name: input.roleKey.replaceAll("_", " ") },
  })

  return prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      name: input.name,
      passwordHash,
      roles: { create: [{ roleId: role.id }] },
    },
    include: { roles: { include: { role: true } } },
  })
}
