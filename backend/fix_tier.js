const { Client } = require('pg');
require('dotenv').config();

const c = new Client(process.env.DATABASE_URL);

c.connect().then(async () => {
  await c.query(`UPDATE "LeadershipProfile" SET tier = 0 WHERE name = 'Dr. Muhammad Ahsanul Haq' AND category = 'cabinet';`);
  await c.query(`DELETE FROM "LeadershipProfile" WHERE name = 'Ch. Muhammad Rafiq' AND category = 'cabinet';`);
  console.log('Fixed Database Tiers!');
}).catch(console.error).finally(() => c.end());
