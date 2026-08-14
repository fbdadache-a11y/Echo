-- ============================================================
-- Echo — الترقية 0002: مرفقات + تفاعلات + ردود + حالة الاتصال
-- شغّل هذا الملف في Supabase SQL Editor بعد 0001_echo_schema.sql
-- ============================================================

-- ─── 1) أعمدة إضافية على الرسائل ──────────────────────────────
-- الرد على رسالة، والحذف الناعم (يبقي الصف لكن يُخفي المحتوى)
alter table messages
  add column if not exists reply_to_id uuid references messages(id) on delete set null,
  add column if not exists deleted_at  timestamptz;

alter table direct_messages
  add column if not exists reply_to_id uuid references direct_messages(id) on delete set null,
  add column if not exists deleted_at  timestamptz;

-- السماح بمحتوى نصي فاضي إذا كانت الرسالة عبارة عن مرفق فقط (بدون نص)
alter table messages         alter column content drop not null;
alter table direct_messages  alter column content drop not null;

-- ─── 2) جدول المرفقات (موحّد لرسائل المجموعات والرسائل الفردية) ─
create type attachment_kind as enum ('image', 'video', 'audio', 'file');

create table if not exists attachments (
  id            uuid primary key default gen_random_uuid(),

  -- رسالة مجموعة أو رسالة فردية (يجب تعبئة واحدة منهما فقط)
  message_id    uuid references messages(id) on delete cascade,
  direct_message_id uuid references direct_messages(id) on delete cascade,

  uploader_id   uuid not null references auth.users(id) on delete cascade,

  kind          attachment_kind not null,
  bucket        text not null,              -- اسم البكت في storage
  path          text not null,              -- المسار داخل البكت
  file_name     text not null,              -- الاسم الأصلي للملف
  mime_type     text not null,
  size_bytes    bigint not null,

  -- أبعاد للصور/الفيديو (بالبكسل)
  width         int,
  height        int,
  -- المدة بالثواني للفيديو/الصوت
  duration_seconds numeric,
  -- مسار صورة مصغّرة مولّدة (اختياري)، لتحميل أسرع قبل الفيديو الكامل
  thumbnail_path text,

  created_at    timestamptz not null default now(),

  constraint attachments_one_parent_only check (
    (message_id is not null and direct_message_id is null)
    or (message_id is null and direct_message_id is not null)
  )
);

create index if not exists idx_attachments_message on attachments(message_id);
create index if not exists idx_attachments_dm on attachments(direct_message_id);
create index if not exists idx_attachments_uploader on attachments(uploader_id);

-- ─── 3) جدول التفاعلات (إيموجي) على الرسائل ────────────────────
create table if not exists message_reactions (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references messages(id) on delete cascade,
  direct_message_id uuid references direct_messages(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  emoji         text not null,
  created_at    timestamptz not null default now(),

  constraint reactions_one_parent_only check (
    (message_id is not null and direct_message_id is null)
    or (message_id is null and direct_message_id is not null)
  )
);

-- فهارس فريدة جزئية (بدل unique عادي) لأن NULL لا يُعامَل كقيمة متكررة في
-- PostgreSQL — بدونها يمكن لنفس المستخدم تكرار نفس الإيموجي على رسائل DM
-- (حيث message_id فاضي دوماً) أو العكس على رسائل المجموعات.
create unique index if not exists uq_reactions_message
  on message_reactions(message_id, user_id, emoji) where message_id is not null;
create unique index if not exists uq_reactions_dm
  on message_reactions(direct_message_id, user_id, emoji) where direct_message_id is not null;

create index if not exists idx_reactions_message on message_reactions(message_id);
create index if not exists idx_reactions_dm on message_reactions(direct_message_id);

-- ─── 4) حالة الاتصال (Online / Last seen) ──────────────────────
alter table users
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists is_online    boolean not null default false;

-- دالة يستدعيها العميل بشكل دوري (heartbeat) لتحديث حالة الاتصال
-- search_path مضبوط صريحاً لمنع schema injection (مطلوب مع security definer)
create or replace function touch_presence()
returns void language sql security definer set search_path = public as $$
  update users set last_seen_at = now(), is_online = true where id = auth.uid();
$$;

-- ملاحظة تصميم مهمة: عمود is_online قد "يتجمّد" على true إذا أغلق المستخدم
-- التبويب بلا استئذان (بلا beforeunload)، لأن لا خادم يوقفه تلقائياً بدون
-- Edge Function مجدولة. لمعالجة هذا عملياً بدون وظائف خلفية إضافية،
-- الواجهة (ChatLayout.tsx) تعتبر المستخدم "غير متصل" إذا تجاوز last_seen_at
-- أكثر من 90 ثانية، بدلاً من الاعتماد فقط على عمود is_online الخام.
-- إن رغبت بدقة أعلى مستقبلاً، أضف Supabase Cron يستدعي:
--   update users set is_online = false where last_seen_at < now() - interval '90 seconds';

-- ─── 5) دوال مساعدة ─────────────────────────────────────────────
-- تعديل رسالة مجموعة (تحدّث edited_at تلقائياً)
create or replace function set_edited_at()
returns trigger language plpgsql as $$
begin
  if new.content is distinct from old.content then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_edited on messages;
create trigger trg_messages_edited
  before update on messages
  for each row execute procedure set_edited_at();

-- ─── 6) تفعيل RLS على الجداول الجديدة ───────────────────────────
alter table attachments enable row level security;
alter table message_reactions enable row level security;

-- attachments: يمكن رؤيتها لمن يمكنه رؤية الرسالة الأصل
create policy "attachments_select_group" on attachments for select
  using (
    message_id is not null and exists (
      select 1 from messages m
      join group_members gm on gm.group_id = m.group_id
      where m.id = attachments.message_id and gm.user_id = auth.uid()
    )
  );

create policy "attachments_select_dm" on attachments for select
  using (
    direct_message_id is not null and exists (
      select 1 from direct_messages dm
      where dm.id = attachments.direct_message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

-- الإدراج: فقط لمن رفع الملف وهو مالك الرسالة، وله صلاحية الكتابة فيها
create policy "attachments_insert_group" on attachments for insert
  with check (
    uploader_id = auth.uid()
    and message_id is not null
    and exists (
      select 1 from messages m
      join group_members gm on gm.group_id = m.group_id
      where m.id = attachments.message_id
        and m.sender_id = auth.uid()
        and gm.user_id = auth.uid()
    )
  );

create policy "attachments_insert_dm" on attachments for insert
  with check (
    uploader_id = auth.uid()
    and direct_message_id is not null
    and exists (
      select 1 from direct_messages dm
      where dm.id = attachments.direct_message_id
        and dm.sender_id = auth.uid()
    )
  );

create policy "attachments_delete" on attachments for delete
  using (uploader_id = auth.uid());

-- message_reactions: يمكن رؤيتها لمن يمكنه رؤية الرسالة، وكل عضو يضيف/يحذف تفاعله فقط
create policy "reactions_select_group" on message_reactions for select
  using (
    message_id is not null and exists (
      select 1 from messages m
      join group_members gm on gm.group_id = m.group_id
      where m.id = message_reactions.message_id and gm.user_id = auth.uid()
    )
  );

create policy "reactions_select_dm" on message_reactions for select
  using (
    direct_message_id is not null and exists (
      select 1 from direct_messages dm
      where dm.id = message_reactions.direct_message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

create policy "reactions_insert_group" on message_reactions for insert
  with check (
    user_id = auth.uid()
    and message_id is not null
    and exists (
      select 1 from messages m
      join group_members gm on gm.group_id = m.group_id
      where m.id = message_reactions.message_id and gm.user_id = auth.uid()
    )
  );

create policy "reactions_insert_dm" on message_reactions for insert
  with check (
    user_id = auth.uid()
    and direct_message_id is not null
    and exists (
      select 1 from direct_messages dm
      where dm.id = message_reactions.direct_message_id
        and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
    )
  );

create policy "reactions_delete" on message_reactions for delete
  using (user_id = auth.uid());

-- ─── 7) تحديث سياسات الرسائل: السماح بإدراج رسالة بلا نص (مرفق فقط) ─
-- (السياسات القديمة تعتمد على auth.uid() = sender_id فقط، تبقى صالحة، لا حاجة لتعديلها)

-- ─── 8) STORAGE BUCKETS ─────────────────────────────────────────
-- بكت للصور والفيديوهات (معاينة مباشرة inline)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media', 'chat-media', true, 104857600, -- 100MB
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav'
  ]
)
on conflict (id) do nothing;

-- بكت لبقية الملفات (pdf, docx, zip, ...) — تحميل لا معاينة
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', true, 104857600) -- 100MB
on conflict (id) do nothing;

-- سياسات storage.objects لِـ chat-media
create policy "chat_media_select" on storage.objects for select
  using (bucket_id = 'chat-media');

create policy "chat_media_insert" on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "chat_media_delete" on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- سياسات storage.objects لِـ chat-files
create policy "chat_files_select" on storage.objects for select
  using (bucket_id = 'chat-files');

create policy "chat_files_insert" on storage.objects for insert
  with check (
    bucket_id = 'chat-files'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "chat_files_delete" on storage.objects for delete
  using (
    bucket_id = 'chat-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 9) REALTIME ─────────────────────────────────────────────────
-- فعّل هذا من Supabase Dashboard → Database → Replication
-- أو نفّذ الأسطر التالية مباشرة إن كانت صلاحياتك تسمح:
alter publication supabase_realtime add table attachments;
alter publication supabase_realtime add table message_reactions;
alter publication supabase_realtime add table users; -- لتحديثات is_online اللحظية

-- ─── 10) فهرس مساعد لترتيب/تصفّح الرسائل مع مرفقاتها ──────────────
create index if not exists idx_messages_reply on messages(reply_to_id);
create index if not exists idx_dm_reply on direct_messages(reply_to_id);
