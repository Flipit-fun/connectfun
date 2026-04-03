-- ── Connect Platform Schema ──────────────────────────────

-- Profiles (extends Supabase auth.users)
create table if not exists connect_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Communities
create table if not exists connect_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text unique not null,
  description text,
  categories text[] default '{}',
  visibility text default 'public' check (visibility in ('public','invite','private')),
  owner_id uuid references auth.users(id) on delete set null,
  avatar_url text,
  banner_url text,
  color text default '#1A1A1A',
  member_count integer default 1,
  created_at timestamptz default now()
);

-- Community members
create table if not exists connect_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references connect_communities(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner','mod','member')),
  status text default 'active' check (status in ('active','pending')),
  joined_at timestamptz default now(),
  unique(community_id, user_id)
);

-- Posts
create table if not exists connect_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references connect_communities(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  image_url text,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- Post reactions (hearts)
create table if not exists connect_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references connect_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  unique(post_id, user_id)
);

-- ── RLS Policies ─────────────────────────────────────────

alter table connect_profiles enable row level security;
alter table connect_communities enable row level security;
alter table connect_members enable row level security;
alter table connect_posts enable row level security;
alter table connect_reactions enable row level security;

-- Profiles: users can read all, only update own
create policy "profiles_select" on connect_profiles for select using (true);
create policy "profiles_insert" on connect_profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on connect_profiles for update using (auth.uid() = id);

-- Communities: public ones are readable by all
create policy "communities_select_public" on connect_communities
  for select using (visibility = 'public' or owner_id = auth.uid());
create policy "communities_insert" on connect_communities
  for insert with check (auth.uid() = owner_id);
create policy "communities_update" on connect_communities
  for update using (auth.uid() = owner_id);
create policy "communities_delete" on connect_communities
  for delete using (auth.uid() = owner_id);

-- Members: visible if community is public or you're a member
create policy "members_select" on connect_members
  for select using (true);
create policy "members_insert" on connect_members
  for insert with check (auth.uid() = user_id);
create policy "members_delete" on connect_members
  for delete using (auth.uid() = user_id);

-- Posts: readable if community accessible AND user is active member
create policy "posts_select" on connect_posts
  for select using (
    exists (
      select 1 from connect_members 
      where community_id = connect_posts.community_id 
      and user_id = auth.uid() 
      and status = 'active'
    ) or exists (
      select 1 from connect_communities 
      where id = connect_posts.community_id and visibility = 'public'
    )
  );
create policy "posts_insert" on connect_posts
  for insert with check (
    auth.uid() = author_id and exists (
      select 1 from connect_members 
      where community_id = connect_posts.community_id 
      and user_id = auth.uid() 
      and status = 'active'
    )
  );
create policy "posts_update" on connect_posts
  for update using (auth.uid() = author_id);
create policy "posts_delete" on connect_posts
  for delete using (auth.uid() = author_id);

-- Reactions
create policy "reactions_select" on connect_reactions for select using (true);
create policy "reactions_insert" on connect_reactions
  for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on connect_reactions
  for delete using (auth.uid() = user_id);

-- ── Storage Bucket ───────────────────────────────────────
-- Create bucket via Supabase dashboard or API
-- insert into storage.buckets (id, name, public) values ('community-assets', 'community-assets', true)
-- on conflict do nothing;

-- ── Trigger: auto-increment member_count ─────────────────
create or replace function update_member_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update connect_communities set member_count = member_count + 1 where id = NEW.community_id;
  elsif TG_OP = 'DELETE' then
    update connect_communities set member_count = greatest(0, member_count - 1) where id = OLD.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists member_count_trigger on connect_members;
create trigger member_count_trigger
after insert or delete on connect_members
for each row execute function update_member_count();
