-- Publicações dos membros (devocionais, estudos, reflexões) com público/privado, Amém/Amei, comentários,
-- compartilhamento; mídias enviadas (imagem, vídeo, áudio) e anúncios da liderança na tela inicial.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  kind text not null default 'reflexao' check (kind in ('devocional', 'estudo', 'reflexao', 'oracao', 'testemunho')),
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 20000),
  verse text check (char_length(verse) <= 160),
  book text,
  rating int,
  media_type text check (media_type in ('image', 'video', 'audio')),
  media_url text check (char_length(media_url) <= 600),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  shared_from uuid references posts(id) on delete set null,
  inspired_by uuid references posts(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_church_idx on posts(church, created_at desc);
create index if not exists posts_member_idx on posts(member_id);
create index if not exists posts_shared_idx on posts(shared_from);
create index if not exists posts_inspired_idx on posts(inspired_by);

create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  type text not null check (type in ('amem', 'amei')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id, type)
);
create index if not exists post_reactions_member_idx on post_reactions(member_id);

create table if not exists post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments(post_id, id);
create index if not exists post_comments_member_idx on post_comments(member_id);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  created_by uuid references members(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  body text check (char_length(body) <= 1000),
  image_url text check (char_length(image_url) <= 600),
  media_type text check (media_type in ('video', 'audio')),
  media_url text check (char_length(media_url) <= 600),
  link text check (char_length(link) <= 600),
  link_label text check (char_length(link_label) <= 40),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists announcements_church_idx on announcements(church, starts_at desc);
create index if not exists announcements_created_by_idx on announcements(created_by);

create table if not exists upload_tickets (
  ticket text primary key,
  member_id uuid not null references members(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now()
);
create index if not exists upload_tickets_member_idx on upload_tickets(member_id, created_at desc);

alter table posts enable row level security;
alter table post_reactions enable row level security;
alter table post_comments enable row level security;
alter table announcements enable row level security;
alter table upload_tickets enable row level security;

-- ───────── mídias: bucket público, envio só com ticket de membro (válido 15 min) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/*', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function storage_ticket_ok(p_name text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from upload_tickets where ticket = split_part(p_name, '/', 1) and expires_at > now())
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'midia: envio com ticket') then
    create policy "midia: envio com ticket" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'midia' and public.storage_ticket_ok(name));
  end if;
end $$;

create or replace function request_upload(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); t text := m.church || '-' || encode(extensions.gen_random_bytes(12), 'hex');
begin
  if (select count(*) from upload_tickets where member_id = m.id and created_at > now() - interval '1 hour') >= 40 then raise exception 'limite_envios'; end if;
  insert into upload_tickets(ticket, member_id) values (t, m.id);
  return t;
end $$;


create or replace function _media_ok(u text) returns boolean language sql immutable set search_path = public as $$
  select u is null or u ~ '^https://'
$$;

-- ───────── publicações ─────────
create or replace function _post_json(p posts, viewer uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'body', p.body, 'verse', p.verse, 'book', p.book, 'rating', p.rating,
    'media_type', p.media_type, 'media_url', p.media_url, 'visibility', p.visibility, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'member', (select jsonb_build_object('id', mb.id, 'name', mb.name, 'avatar', mb.avatar, 'role', mb.role) from members mb where mb.id = p.member_id),
    'mine', p.member_id = viewer,
    'amem', (select count(*) from post_reactions r where r.post_id = p.id and r.type = 'amem' and r.active),
    'amei', (select count(*) from post_reactions r where r.post_id = p.id and r.type = 'amei' and r.active),
    'my_reactions', coalesce((select jsonb_agg(r.type) from post_reactions r where r.post_id = p.id and r.member_id = viewer and r.active), '[]'),
    'comments', (select count(*) from post_comments c where c.post_id = p.id and c.removed_at is null),
    'shares', (select count(*) from posts s where s.shared_from = p.id and s.removed_at is null),
    'shared', (select jsonb_build_object('id', s.id, 'kind', s.kind, 'title', s.title, 'body', left(s.body, 600), 'verse', s.verse,
        'media_type', s.media_type, 'media_url', s.media_url, 'created_at', s.created_at,
        'member', (select jsonb_build_object('id', mb.id, 'name', mb.name, 'avatar', mb.avatar, 'role', mb.role) from members mb where mb.id = s.member_id))
      from posts s where s.id = p.shared_from and s.removed_at is null and s.visibility = 'public'),
    'inspired', (select jsonb_build_object('id', s.id, 'title', s.title, 'name', (select name from members where id = s.member_id))
      from posts s where s.id = p.inspired_by and s.removed_at is null and s.visibility = 'public'))
$$;

create or replace function save_post(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); r posts; pid uuid := nullif(p->>'id', '')::uuid; sf uuid := nullif(p->>'shared_from', '')::uuid; ib uuid := nullif(p->>'inspired_by', '')::uuid;
begin
  if not _media_ok(nullif(p->>'media_url', '')) then raise exception 'midia_invalida'; end if;
  if sf is not null and not exists (select 1 from posts where id = sf and church = m.church and visibility = 'public' and removed_at is null) then raise exception 'nao_encontrado'; end if;
  if ib is not null and not exists (select 1 from posts where id = ib and church = m.church and visibility = 'public' and removed_at is null) then ib := null; end if;
  if coalesce(trim(p->>'body'), '') = '' and coalesce(p->>'media_url', '') = '' and sf is null then raise exception 'publicacao_vazia'; end if;
  if pid is not null then
    select * into r from posts where id = pid and member_id = m.id and removed_at is null;
    if not found then raise exception 'nao_encontrado'; end if;
  else
    if (select count(*) from posts where member_id = m.id and created_at > now() - interval '1 hour') >= 30 then raise exception 'limite_publicacoes'; end if;
    insert into posts(church, member_id, shared_from, inspired_by) values (m.church, m.id, sf, ib) returning * into r;
  end if;
  update posts set
    kind = coalesce(nullif(p->>'kind', ''), kind), title = nullif(left(trim(coalesce(p->>'title', '')), 120), ''), body = nullif(left(coalesce(p->>'body', ''), 20000), ''),
    verse = nullif(left(trim(coalesce(p->>'verse', '')), 160), ''), book = nullif(p->>'book', ''), rating = nullif(p->>'rating', '')::int,
    media_type = nullif(p->>'media_type', ''), media_url = nullif(p->>'media_url', ''),
    visibility = case when p->>'visibility' in ('public', 'private') then p->>'visibility' else visibility end, updated_at = now()
  where id = r.id returning * into r;
  return _post_json(r, m.id);
end $$;

create or replace function remove_post(p_token text, p_post uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  update posts set removed_at = now() where id = p_post and church = m.church and (member_id = m.id or m.role in ('leader', 'pastor'));
end $$;

create or replace function posts_feed(p_token text, p_before timestamptz default null, p_member uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  return coalesce((select jsonb_agg(_post_json(x, m.id) order by x.created_at desc) from (
    select p.* from posts p where p.church = m.church and p.removed_at is null
      and (p.visibility = 'public' or p.member_id = m.id)
      and (p_member is null or p.member_id = p_member)
      and (p_before is null or p.created_at < p_before)
    order by p.created_at desc limit 25) x), '[]');
end $$;

create or replace function get_post(p_token text, p_post uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); r posts;
begin
  select * into r from posts where id = p_post and church = m.church and removed_at is null and (visibility = 'public' or member_id = m.id);
  if not found then raise exception 'nao_encontrado'; end if;
  return _post_json(r, m.id);
end $$;

create or replace function react_post(p_token text, p_post uuid, p_type text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); r posts;
begin
  select * into r from posts where id = p_post and church = m.church and removed_at is null and (visibility = 'public' or member_id = m.id);
  if not found or p_type not in ('amem', 'amei') then raise exception 'nao_encontrado'; end if;
  insert into post_reactions(post_id, member_id, type) values (r.id, m.id, p_type)
  on conflict (post_id, member_id, type) do update set active = not post_reactions.active, created_at = now();
  return _post_json(r, m.id);
end $$;

create or replace function post_comments_list(p_token text, p_post uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  if not exists (select 1 from posts where id = p_post and church = m.church and removed_at is null and (visibility = 'public' or member_id = m.id)) then raise exception 'nao_encontrado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at, 'mine', c.member_id = m.id,
      'member', jsonb_build_object('id', mb.id, 'name', mb.name, 'avatar', mb.avatar, 'role', mb.role)) order by c.id)
    from post_comments c join members mb on mb.id = c.member_id where c.post_id = p_post and c.removed_at is null), '[]');
end $$;

create or replace function add_comment(p_token text, p_post uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); b text := left(trim(coalesce(p_body, '')), 2000);
begin
  if b = '' then raise exception 'mensagem_vazia'; end if;
  if not exists (select 1 from posts where id = p_post and church = m.church and removed_at is null and visibility = 'public') then raise exception 'nao_encontrado'; end if;
  insert into post_comments(post_id, member_id, body) values (p_post, m.id, b);
  return post_comments_list(p_token, p_post);
end $$;

create or replace function remove_comment(p_token text, p_comment bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  update post_comments c set removed_at = now() from posts p
  where c.id = p_comment and p.id = c.post_id and p.church = m.church
    and (c.member_id = m.id or p.member_id = m.id or m.role in ('leader', 'pastor'));
end $$;

-- ───────── anúncios ─────────
create or replace function _ann_json(a announcements) returns jsonb language sql stable security invoker set search_path = public as $$
  select to_jsonb(a) - 'church' - 'created_by' - 'removed_at' || jsonb_build_object('author', (select name from members where id = a.created_by))
$$;

create or replace function public_announcements(p_slug text) returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(_ann_json(a) order by a.starts_at desc), '[]') from announcements a
  where a.church = p_slug and a.removed_at is null and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
$$;

create or replace function announcements_manage(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['leader', 'pastor']);
  return coalesce((select jsonb_agg(_ann_json(a) order by a.created_at desc) from announcements a where a.church = m.church and a.removed_at is null), '[]');
end $$;

create or replace function save_announcement(p_token text, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); aid uuid := nullif(p->>'id', '')::uuid;
begin
  perform _require(m, array['leader', 'pastor']);
  if not (_media_ok(nullif(p->>'image_url', '')) and _media_ok(nullif(p->>'media_url', ''))) then raise exception 'midia_invalida'; end if;
  if aid is null or not exists (select 1 from announcements where id = aid and church = m.church) then
    insert into announcements(church, created_by, title) values (m.church, m.id, coalesce(nullif(trim(p->>'title'), ''), 'Anúncio')) returning id into aid;
  end if;
  update announcements set title = coalesce(nullif(left(trim(p->>'title'), 100), ''), title), body = nullif(left(coalesce(p->>'body', ''), 1000), ''),
    image_url = nullif(p->>'image_url', ''), media_type = nullif(p->>'media_type', ''), media_url = nullif(p->>'media_url', ''),
    link = nullif(left(coalesce(p->>'link', ''), 600), ''), link_label = nullif(left(coalesce(p->>'link_label', ''), 40), ''),
    starts_at = coalesce(nullif(p->>'starts_at', '')::timestamptz, starts_at), ends_at = nullif(p->>'ends_at', '')::timestamptz
  where id = aid;
  return aid;
end $$;

create or replace function remove_announcement(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['leader', 'pastor']);
  update announcements set removed_at = now() where id = p_id and church = m.church;
end $$;

grant execute on function request_upload(text), save_post(text, jsonb), remove_post(text, uuid), posts_feed(text, timestamptz, uuid), get_post(text, uuid),
  react_post(text, uuid, text), post_comments_list(text, uuid), add_comment(text, uuid, text), remove_comment(text, bigint),
  public_announcements(text), announcements_manage(text), save_announcement(text, jsonb), remove_announcement(text, uuid) to anon, authenticated;
