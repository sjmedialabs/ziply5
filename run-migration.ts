import "dotenv/config"
import { migrateOtpSmsTables } from "./src/server/core/db/migrations/20240508_otp_sms"

async function run() {
  try {
    console.log("Running migration...")
    await migrateOtpSmsTables()
    console.log("Migration successful!")
    process.exit(0)
  } catch (err) {
    console.error("Migration failed:", err)
    process.exit(1)
  }
}

run()
