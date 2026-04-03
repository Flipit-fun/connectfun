const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lboicfbzysnaetesvylt:Oyesxd8013%40@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

const steps = [
  // Tables
  `create table if not exists connect_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null,
    display_name text,
    avatar_url text,
    created_at timestamptz default now()
  )`,
  `create table if not exists connect_communities (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    handle text unique not null,
    description text,
    categories text[] default '{}',
    visibility text default 'public',
    owner_id uuid references auth.users(id) on delete set null,
    avatar_url text,
    banner_url text,
    color text default '#1A1A1A',
    member_count integer default 1,
    created_at timestamptz default now()
  )`,
  `create table if not exists connect_members (
    id uuid primary key default gen_random_uuid(),
    community_id uuid references connect_communities(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role text default 'member',
    joined_at timestamptz default now(),
    unique(community_id, user_id)
  )`,
  `create table if not exists connect_posts (
    id uuid primary key default gen_random_uuid(),
    community_id uuid references connect_communities(id) on delete cascade,
    author_id uuid references auth.users(id) on delete cascade,
    body text not null,
    pinned boolean default false,
    created_at timestamptz default now()
  )`,
  `create table if not exists connect_reactions (
    id uuid primary key default gen_random_uuid(),
    post_id uuid references connect_posts(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    unique(post_id, user_id)
  )`,

  // RLS
  `alter table connect_profiles enable row level security`,
  `alter table connect_communities enable row level security`,
  `alter table connect_members enable row level security`,
  `alter table connect_posts enable row level security`,
  `alter table connect_reactions enable row level security`,

  // Drop old policies (ignore errors)
  ...['profiles_select','profiles_insert','profiles_update'].map(p => `drop policy if exists ${p} on connect_profiles`),
  ...['communities_select','communities_insert','communities_update','communities_delete'].map(p => `drop policy if exists ${p} on connect_communities`),
  ...['members_select','members_insert','members_delete'].map(p => `drop policy if exists ${p} on connect_members`),
  ...['posts_select','posts_insert','posts_update','posts_delete'].map(p => `drop policy if exists ${p} on connect_posts`),
  ...['reactions_select','reactions_insert','reactions_delete'].map(p => `drop policy if exists ${p} on connect_reactions`),

  // Create policies
  `create policy profiles_select on connect_profiles for select using (true)`,
  `create policy profiles_insert on connect_profiles for insert with check (auth.uid() = id)`,
  `create policy profiles_update on connect_profiles for update using (auth.uid() = id)`,
  `create policy communities_select on connect_communities for select using (visibility = 'public' or owner_id = auth.uid())`,
  `create policy communities_insert on connect_communities for insert with check (auth.uid() = owner_id)`,
  `create policy communities_update on connect_communities for update using (auth.uid() = owner_id)`,
  `create policy communities_delete on connect_communities for delete using (auth.uid() = owner_id)`,
  `create policy members_select on connect_members for select using (true)`,
  `create policy members_insert on connect_members for insert with check (auth.uid() = user_id)`,
  `create policy members_delete on connect_members for delete using (auth.uid() = user_id)`,
  `create policy posts_select on connect_posts for select using (true)`,
  `create policy posts_insert on connect_posts for insert with check (auth.uid() = author_id)`,
  `create policy posts_update on connect_posts for update using (auth.uid() = author_id)`,
  `create policy posts_delete on connect_posts for delete using (auth.uid() = author_id)`,
  `create policy reactions_select on connect_reactions for select using (true)`,
  `create policy reactions_insert on connect_reactions for insert with check (auth.uid() = user_id)`,
  `create policy reactions_delete on connect_reactions for delete using (auth.uid() = user_id)`,

  // Trigger function
  `create or replace function update_member_count()
  returns trigger language plpgsql security definer as
  $fn$
  begin
    if TG_OP = 'INSERT' then
      update connect_communities set member_count = member_count + 1 where id = NEW.community_id;
    elsif TG_OP = 'DELETE' then
      update connect_communities set member_count = greatest(0, member_count - 1) where id = OLD.community_id;
    end if;
    return null;
  end;
  $fn$`,

  `drop trigger if exists member_count_trigger on connect_members`,
  `create trigger member_count_trigger after insert or delete on connect_members for each row execute function update_member_count()`,
];

async function run() {
  await client.connect();
  console.log('Connected to Supabase.\n');
  let ok = 0, skip = 0, fail = 0;
  for (const sql of steps) {
    try {
      await client.query(sql);
      console.log('✓', sql.trim().split('\n')[0].slice(0, 60));
      ok++;
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('→ skip (exists):', sql.trim().split('\n')[0].slice(0, 50));
        skip++;
      } else {
        console.error('✗', sql.trim().split('\n')[0].slice(0, 50));
        console.error('  ↳', err.message);
        fail++;
      }
    }
  }
  await client.end();
  console.log(`\nDone: ${ok} ok, ${skip} skipped, ${fail} failed`);
}

run().catch(err => { console.error(err); process.exit(1); });
