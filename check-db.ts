import { pgQuery } from "./src/server/db/pg.ts";

async function check() {
  try {
    const res = await pgQuery('SELECT "customerEmail" FROM "Order" LIMIT 1');
    console.log("Column customerEmail exists!");
  } catch (e) {
    try {
      const res = await pgQuery('SELECT "customer_email" FROM "Order" LIMIT 1');
      console.log("Column customer_email exists!");
    } catch (e2) {
      console.log("Column does not exist.");
    }
  }
}

check();
