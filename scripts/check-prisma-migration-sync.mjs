#!/usr/bin/env node

import { execSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"

const schemaPath = "prisma/schema.prisma"
const migrationsDir = "prisma/migrations"

const getOutput = (command) =>
  execSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  }).trim()

const hasStagedSchemaChange = () => {
  const staged = getOutput("git diff --cached --name-only")
  if (!staged) return false
  return staged.split("\n").includes(schemaPath)
}

const hasStagedMigrationChange = () => {
  const staged = getOutput("git diff --cached --name-only")
  if (!staged) return false
  return staged.split("\n").some((path) => path.startsWith(`${migrationsDir}/`))
}

const hasAnyMigrationFiles = () => {
  if (!existsSync(migrationsDir)) return false
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
  return entries.some((entry) => entry.isDirectory())
}

const ensureMigrationsExist = process.argv.includes("--require-migrations")

if (ensureMigrationsExist && !hasAnyMigrationFiles()) {
  console.error("Prisma migration check failed: no files found under prisma/migrations.")
  console.error("Create a migration with: npx prisma migrate dev --name <migration_name>")
  process.exit(1)
}

if (hasStagedSchemaChange() && !hasStagedMigrationChange()) {
  console.error("Prisma migration check failed: prisma/schema.prisma changed without a staged migration.")
  console.error("Run: npx prisma migrate dev --name <migration_name> and stage prisma/migrations/*")
  process.exit(1)
}

process.exit(0)
