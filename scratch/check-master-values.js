
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMasterValues() {
  const { data, error } = await supabase
    .from('MasterValue')
    .select('value, label')
    .eq('group', 'ORDER_STATUS');

  if (error) {
    console.error('Error fetching master values:', error);
    return;
  }

  console.log('Valid ORDER_STATUS master values:');
  console.table(data);
}

checkMasterValues();
