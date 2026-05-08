const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const res = await pool.query("SELECT mobile, purpose, verified, created_at FROM otp_requests WHERE created_at > now() - interval '2 hours' ORDER BY created_at DESC");
  console.log('ALL Recent OTP Requests:');
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
