
const { Client } = require('pg');

async function checkSms() {
  const client = new Client({
    connectionString: "postgresql://postgres.pbhaebdqdswegmcfnqtc:Svraf%40marketing1@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, mobile, template, status, provider_response, payload, created_at FROM sms_logs ORDER BY created_at DESC LIMIT 10');
    
    console.log('Recent SMS Logs:');
    res.rows.forEach(row => {
      console.log('-------------------');
      console.log(`ID: ${row.id}`);
      console.log(`To: ${row.mobile}`);
      console.log(`Template: ${row.template}`);
      console.log(`Status: ${row.status}`);
      console.log(`Response: ${row.provider_response}`);
      console.log(`Payload: ${row.payload}`);
      console.log(`Time: ${row.created_at}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSms();
