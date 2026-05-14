const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkLatestShipmentFull() {
  const res = await pool.query(`
    SELECT "rawShiprocketResponse"
    FROM "Shipment" 
    ORDER BY "createdAt" DESC 
    LIMIT 1
  `);
  console.log(JSON.stringify(res.rows[0].rawShiprocketResponse, null, 2));
  await pool.end();
}

checkLatestShipmentFull().catch(console.error);
