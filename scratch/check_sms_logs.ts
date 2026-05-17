import { pgQuery } from "./src/server/db/pg";

async function check() {
  try {
    const res = await pgQuery('SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
