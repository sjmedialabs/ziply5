import bcrypt from "bcryptjs"
import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

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
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (const role of roles) {
      await client.query(
        `
          INSERT INTO "Role" (id, key, name)
          VALUES (gen_random_uuid()::text, $1, $2)
          ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name
        `,
        [role.key, role.name],
      )
    }

    for (const item of usersToSeed) {
      const roleRes = await client.query(`SELECT id, key FROM "Role" WHERE key = $1 LIMIT 1`, [item.roleKey])
      const role = roleRes.rows[0]
      if (!role) throw new Error(`Missing role: ${item.roleKey}`)

      const passwordHash = await bcrypt.hash(item.password, 12)

      const userRes = await client.query(
        `
          INSERT INTO "User" (id, name, email, "passwordHash", status, "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, 'active', now(), now())
          ON CONFLICT (email) DO UPDATE
          SET name = EXCLUDED.name, "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = now()
          RETURNING id, email
        `,
        [item.name, item.email, passwordHash],
      )
      const user = userRes.rows[0]
      if (!user) throw new Error(`Failed to upsert user: ${item.email}`)

      await client.query(
        `
          INSERT INTO "UserRole" ("userId", "roleId")
          VALUES ($1, $2)
          ON CONFLICT ("userId","roleId") DO NOTHING
        `,
        [user.id, role.id],
      )

      console.log(`Seeded user: ${item.email} (${item.roleKey})`)
    }

    await client.query("COMMIT")

  console.log("Auth seed completed.")
  } catch (e) {
    await client.query("ROLLBACK").catch(() => null)
    throw e
  } finally {
    client.release()
  }
}

main()
  .catch((error) => {
    console.error("Auth seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
