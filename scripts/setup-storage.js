const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lboicfbzysnaetesvylt:Oyesxd8013%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  // Create storage bucket
  try {
    await client.query(`
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('community-assets', 'community-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
      on conflict (id) do nothing
    `);
    console.log('✓ Storage bucket created: community-assets');
  } catch (err) {
    console.log('Bucket:', err.message);
  }

  // Storage RLS - allow authenticated uploads
  const storageSteps = [
    `drop policy if exists "community_assets_select" on storage.objects`,
    `drop policy if exists "community_assets_insert" on storage.objects`,
    `drop policy if exists "community_assets_update" on storage.objects`,
    `drop policy if exists "community_assets_delete" on storage.objects`,
    `create policy "community_assets_select" on storage.objects for select using (bucket_id = 'community-assets')`,
    `create policy "community_assets_insert" on storage.objects for insert with check (bucket_id = 'community-assets' and auth.role() = 'authenticated')`,
    `create policy "community_assets_update" on storage.objects for update using (bucket_id = 'community-assets' and auth.uid() = owner)`,
    `create policy "community_assets_delete" on storage.objects for delete using (bucket_id = 'community-assets' and auth.uid() = owner)`,
  ];
  for (const sql of storageSteps) {
    try {
      await client.query(sql);
      console.log('✓', sql.slice(0, 60));
    } catch (err) {
      console.log('✗', sql.slice(0, 50), '→', err.message.slice(0, 60));
    }
  }
  await client.end();
}

run().catch(console.error);
