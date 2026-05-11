const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function normalizeExisting() {
  const client = await pool.connect();
  try {
    console.log("Normalizing existing mobile numbers...");
    const res = await client.query('SELECT id, phone FROM "UserProfile"');
    for (const row of res.rows) {
      if (!row.phone) continue;
      const d = row.phone.replace(/\D/g, "");
      const normalized = d.length === 10 ? `91${d}` : d;
      if (normalized !== row.phone) {
        console.log(`Updating ${row.phone} -> ${normalized}`);
        await client.query('UPDATE "UserProfile" SET phone = $1 WHERE id = $2', [normalized, row.id]);
      }
    }
    console.log("Done!");
  } finally {
    client.release();
    await pool.end();
  }
}

normalizeExisting().catch(console.error);
