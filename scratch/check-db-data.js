const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log("Analyzing product sales...");
    
    const query = `
      SELECT 
        p.id, 
        p.name, 
        SUM(oi.quantity) as total_qty, 
        COUNT(DISTINCT o.id) as total_orders
      FROM "Product" p
      JOIN "OrderItem" oi ON p.id = oi."productId"
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE o.status NOT IN ('cancelled', 'pending')
      GROUP BY p.id, p.name
      ORDER BY total_qty DESC, total_orders DESC
    `;
    const res = await pool.query(query);
    console.log("Product Sales (Not Cancelled/Pending):");
    console.table(res.rows);

  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await pool.end();
  }
}

run();
