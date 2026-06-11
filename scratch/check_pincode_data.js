const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'data', 'pincodes_detailed.json');
if (!fs.existsSync(filePath)) {
  console.log("File not found");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const records = Array.isArray(data) ? data : (data.Sheet1 || []);
const match = records.filter(r => r.pincode === 500086 || r.pincode === '500086');
console.log(JSON.stringify(match, null, 2));
