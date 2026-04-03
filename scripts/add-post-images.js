const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lboicfbzysnaetesvylt:Oyesxd8013%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const steps = [
  // Add image_url to connect_posts
  `alter table connect_posts add column if not exists image_url text`,
];

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase.\n');
    for (const sql of steps) {
      try {
        await client.query(sql);
        console.log('✓', sql.trim().split('\n')[0].slice(0, 80));
      } catch (err) {
        console.error('✗', sql.trim().split('\n')[0].slice(0, 80));
        console.error('  ↳', err.message);
      }
    }
  } finally {
    await client.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
