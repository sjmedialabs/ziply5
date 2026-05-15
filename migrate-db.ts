import { pgQuery } from "./src/server/db/pg.ts";

async function migrate() {
  try {
    await pgQuery('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT');
    console.log("Successfully added customerEmail column to Order table.");
  } catch (e) {
    console.error("Failed to add column:", e);
  }
}

migrate();
