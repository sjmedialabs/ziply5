const fs = require('fs');
const { Pool } = require('pg');

// Parse .env manually
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log("No .env found or failed to parse", e);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Product' OR table_name = 'products'
    ORDER BY column_name
  `);
  console.log('Product Columns:');
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
