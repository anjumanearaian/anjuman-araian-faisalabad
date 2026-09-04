const { Client } = require('pg');
require('dotenv').config();

const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'SiteSettings' ORDER BY ordinal_position`))
  .then(r => {
    console.log('=== SiteSettings columns in DB ===');
    console.table(r.rows);
  })
  .catch(console.error)
  .finally(() => c.end());
