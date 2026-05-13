const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'UserProfile'
    ORDER BY column_name
  `);
  console.log('UserProfile Schema:');
  console.table(res.rows);

  const res2 = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'User'
    ORDER BY column_name
  `);
  console.log('User Schema:');
  console.table(res2.rows);

  await pool.end();
}

checkSchema().catch(console.error);
