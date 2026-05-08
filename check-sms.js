const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const res = await pool.query("SELECT mobile, template, status, provider_response, created_at FROM sms_logs ORDER BY created_at DESC LIMIT 10");
  console.log('Recent SMS Logs:');
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
