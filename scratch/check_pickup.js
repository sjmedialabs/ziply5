const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkLatestShipment() {
  const res = await pool.query(`
    SELECT "orderId", "shipmentNo", "trackingNo", "pickupStatus", "shipmentStatus", "rawShiprocketResponse"
    FROM "Shipment" 
    ORDER BY "createdAt" DESC 
    LIMIT 1
  `);
  console.log('Latest Shipment Status:');
  console.table(res.rows.map(r => ({
    ...r,
    rawShiprocketResponse: JSON.stringify(r.rawShiprocketResponse).slice(0, 100) + '...'
  })));
  await pool.end();
}

checkLatestShipment().catch(console.error);
