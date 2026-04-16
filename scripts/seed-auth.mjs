import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const roles = [
  { key: "super_admin", name: "super admin" },
  { key: "admin", name: "admin" },
  { key: "customer", name: "customer" },
]

const usersToSeed = [
  {
    name: "Ziply5 Admin",
    email: "admin@ziply5.com",
    password: "Admin@12345",
    roleKey: "admin",
  },
  {
    name: "Ziply5 Super Admin",
    email: "superadmin@ziply5.com",
    password: "SuperAdmin@12345",
    roleKey: "super_admin",
  },
]

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name },
      create: role,
    })
  }

  for (const item of usersToSeed) {
    const role = await prisma.role.findUnique({ where: { key: item.roleKey } })
    if (!role) {
      throw new Error(`Missing role: ${item.roleKey}`)
    }

    const passwordHash = await bcrypt.hash(item.password, 12)
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        passwordHash,
      },
      create: {
        name: item.name,
        email: item.email,
        passwordHash,
      },
    })

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    })

    console.log(`Seeded user: ${item.email} (${item.roleKey})`)
  }

  console.log("Auth seed completed.")
}

main()
  .catch((error) => {
    console.error("Auth seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
