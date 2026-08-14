-- Echo Schema — Groups + Chat
-- Run this in your Supabase SQL editor

-- ─── GROUPS ──────────────────────────────────────────────────
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  avatar_url  text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  is_private  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── GROUP MEMBERS ───────────────────────────────────────────
create type group_role as enum ('owner', 'admin', 'member');

create table if not exists group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- ─── GROUP MESSAGES ──────────────────────────────────────────
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);

-- ─── DIRECT MESSAGES ─────────────────────────────────────────
create table if not exists direct_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── USERS PROFILE TABLE (mirrors Agora pattern) ─────────────
create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  bio          text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ─── TRIGGERS: auto-create user profile on signup ────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table users enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;
alter table direct_messages enable row level security;

-- users: readable by all, writable by owner
create policy "users_select" on users for select using (true);
create policy "users_update" on users for update using (auth.uid() = id);
create policy "users_insert" on users for insert with check (auth.uid() = id);

-- groups: members can read, anyone can create
create policy "groups_select" on groups for select
  using (
    not is_private
    or exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );
create policy "groups_insert" on groups for insert with check (auth.uid() = created_by);
create policy "groups_update" on groups for update
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- group_members
create policy "members_select" on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );
create policy "members_insert" on group_members for insert with check (auth.uid() = user_id);
create policy "members_delete" on group_members for delete using (auth.uid() = user_id);

-- messages: only group members
create policy "messages_select" on messages for select
  using (
    exists (
      select 1 from group_members
      where group_id = messages.group_id and user_id = auth.uid()
    )
  );
create policy "messages_insert" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from group_members
      where group_id = messages.group_id and user_id = auth.uid()
    )
  );
create policy "messages_update" on messages for update using (auth.uid() = sender_id);
create policy "messages_delete" on messages for delete using (auth.uid() = sender_id);

-- direct_messages
create policy "dm_select" on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "dm_insert" on direct_messages for insert with check (auth.uid() = sender_id);
create policy "dm_update" on direct_messages for update
  using (auth.uid() = receiver_id); -- only receiver can mark as read

-- ─── REALTIME ────────────────────────────────────────────────
-- Enable realtime for messages and DMs (run in Supabase dashboard → Replication)
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table direct_messages;

-- ─── MEMBER COUNT VIEW ───────────────────────────────────────
create or replace view groups_with_count as
select
  g.*,
  count(gm.id)::int as member_count
from groups g
left join group_members gm on gm.group_id = g.id
group by g.id;
