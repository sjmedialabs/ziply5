const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM "Setting" WHERE "group" = \'CITIES\' AND "key" ILIKE \'%Don Bosco%\'');
    console.log("Don Bosco Nagar in CITIES:");
    console.log(res.rows);
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await pool.end();
  }
}

run();
