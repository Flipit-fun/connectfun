const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lboicfbzysnaetesvylt:Oyesxd8013%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const steps = [
  // Add status column
  `alter table connect_members add column if not exists status text default 'active' check (status in ('active', 'pending'))`,
  
  // Update posts_select policy to ensure pending members can't see posts in non-public communities
  `drop policy if exists posts_select on connect_posts`,
  `create policy posts_select on connect_posts for select using (
    exists (
      select 1 from connect_members 
      where community_id = connect_posts.community_id 
      and user_id = auth.uid() 
      and status = 'active'
    )
    or exists (
      select 1 from connect_communities 
      where id = connect_posts.community_id 
      and visibility = 'public'
    )
    -- Allow owners to see their own posts even if they aren't \"active\" members (though they should be)
    or author_id = auth.uid()
  )`,
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
