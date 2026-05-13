const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Running migration...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile text NOT NULL,
        purpose text NOT NULL,
        otp_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        attempts int DEFAULT 0,
        verified boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sms_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile text NOT NULL,
        template text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        status text NOT NULL,
        provider_response text,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_otp_requests_mobile ON otp_requests(mobile);
      CREATE INDEX IF NOT EXISTS idx_sms_logs_mobile ON sms_logs(mobile);
    `);
    console.log("Migration successful!");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
