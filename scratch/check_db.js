
const { Pool } = require('pg');
require('dotenv').config();

async function checkColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfile'
    `);
    console.log('Columns in UserProfile:', res.rows.map(r => r.column_name));

    const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `);
    console.log('Columns in User:', res2.rows.map(r => r.column_name));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkColumns();
