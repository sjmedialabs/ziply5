
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

async function checkMasterValues() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT mv.value, mv.label
      FROM master_values mv
      INNER JOIN master_groups mg ON mg.id = mv.group_id
      WHERE mg.key = 'ORDER_STATUS'
    `);
    console.log('Valid ORDER_STATUS values:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMasterValues();
