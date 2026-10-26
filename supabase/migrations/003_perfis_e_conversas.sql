-- Perfil dos irmãos (rotina de leitura detalhada) e conversas (individuais e em grupo) da igreja.

alter table member_stats add column if not exists detail jsonb not null default '{}';

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  is_group boolean not null default false,
  title text check (char_length(title) <= 60),
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists conversations_church_idx on conversations(church);
create index if not exists conversations_created_by_idx on conversations(created_by);

create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);
create index if not exists conversation_members_member_idx on conversation_members(member_id);

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, id desc);
create index if not exists messages_member_idx on messages(member_id);

alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

-- progresso: agora também guarda a rotina detalhada (dias, livros em andamento)
create or replace function sync_progress(p_token text, p_stats jsonb, p_events jsonb default '[]') returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); e jsonb; d jsonb := case when jsonb_typeof(p_stats->'detail') = 'object' and pg_column_size(p_stats->'detail') < 20000 then p_stats->'detail' end;
begin
  insert into member_stats(member_id, total, last7, streak, plan_read, plan_total, books_done, devotionals, last_read_at, last_ref, detail, updated_at)
  values (m.id, coalesce((p_stats->>'total')::int, 0), coalesce((p_stats->>'last7')::int, 0), coalesce((p_stats->>'streak')::int, 0),
    coalesce((p_stats->>'plan_read')::int, 0), coalesce((p_stats->>'plan_total')::int, 0), coalesce((p_stats->>'books_done')::int, 0),
    coalesce((p_stats->>'devotionals')::int, 0), (p_stats->>'last_read_at')::timestamptz, left(p_stats->>'last_ref', 80), coalesce(d, '{}'), now())
  on conflict (member_id) do update set total = excluded.total, last7 = excluded.last7, streak = excluded.streak, plan_read = excluded.plan_read,
    plan_total = excluded.plan_total, books_done = excluded.books_done, devotionals = excluded.devotionals,
    last_read_at = coalesce(excluded.last_read_at, member_stats.last_read_at), last_ref = coalesce(excluded.last_ref, member_stats.last_ref),
    detail = coalesce(d, member_stats.detail), updated_at = now();
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) limit 30 loop
    if e->>'kind' in ('read', 'devotional', 'complete', 'streak', 'plan') and pg_column_size(e->'data') < 2000 then
      insert into activity(church, member_id, kind, data) values (m.church, m.id, e->>'kind', coalesce(e->'data', '{}'));
    end if;
  end loop;
end $$;

create or replace function member_profile(p_token text, p_member uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); t members; vis boolean; s member_stats;
begin
  select * into t from members where id = p_member and church = m.church;
  if not found then raise exception 'nao_encontrado'; end if;
  vis := t.id = m.id or t.share_activity or m.role in ('leader', 'pastor');
  select * into s from member_stats where member_id = t.id;
  return jsonb_build_object(
    'member', jsonb_build_object('id', t.id, 'name', t.name, 'avatar', t.avatar, 'role', t.role, 'grp', t.grp, 'created_at', t.created_at,
      'last_seen', t.last_seen, 'share_activity', t.share_activity, 'login', case when m.role in ('leader', 'pastor') then t.login end),
    'visible', vis,
    'stats', case when vis and s.member_id is not null then to_jsonb(s) - 'member_id' end,
    'activity', case when vis then coalesce((select jsonb_agg(row_to_json(x) order by x.id desc) from (
        select a.id, a.kind, a.data, a.created_at from activity a where a.member_id = t.id order by a.id desc limit 30) x), '[]') end);
end $$;

create or replace function _conv_of(m members, p_conv uuid) returns conversations
language plpgsql security definer set search_path = public as $$
declare c conversations;
begin
  select cv.* into c from conversations cv join conversation_members cm on cm.conversation_id = cv.id
  where cv.id = p_conv and cm.member_id = m.id;
  if not found then raise exception 'nao_encontrado'; end if;
  return c;
end $$;

create or replace function open_direct(p_token text, p_member uuid) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); cid uuid;
begin
  if p_member = m.id or not exists (select 1 from members where id = p_member and church = m.church) then raise exception 'nao_encontrado'; end if;
  select c.id into cid from conversations c
  where c.church = m.church and not c.is_group
    and exists (select 1 from conversation_members where conversation_id = c.id and member_id = m.id)
    and exists (select 1 from conversation_members where conversation_id = c.id and member_id = p_member)
  limit 1;
  if cid is null then
    insert into conversations(church, created_by) values (m.church, m.id) returning id into cid;
    insert into conversation_members(conversation_id, member_id) values (cid, m.id), (cid, p_member);
  end if;
  return cid;
end $$;

create or replace function create_group(p_token text, p_title text, p_members uuid[]) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); cid uuid;
begin
  perform _require(m, array['leader', 'pastor']);
  if char_length(trim(coalesce(p_title, ''))) = 0 then raise exception 'titulo_obrigatorio'; end if;
  insert into conversations(church, is_group, title, created_by) values (m.church, true, left(trim(p_title), 60), m.id) returning id into cid;
  insert into conversation_members(conversation_id, member_id)
  select cid, mb.id from members mb where mb.church = m.church and (mb.id = m.id or mb.id = any(coalesce(p_members, '{}')))
  on conflict do nothing;
  insert into messages(conversation_id, member_id, body) values (cid, m.id, 'Criou o grupo “' || left(trim(p_title), 60) || '”.');
  return cid;
end $$;

create or replace function group_add(p_token text, p_conv uuid, p_members uuid[]) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); c conversations := _conv_of(m, p_conv);
begin
  if not c.is_group or not (m.role in ('leader', 'pastor')) then raise exception 'sem_permissao'; end if;
  insert into conversation_members(conversation_id, member_id)
  select c.id, mb.id from members mb where mb.church = m.church and mb.id = any(coalesce(p_members, '{}'))
  on conflict do nothing;
end $$;

create or replace function conversation_list(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  return coalesce((select jsonb_agg(row_to_json(x) order by x.last_message_at desc) from (
    select c.id, c.is_group, c.last_message_at,
      coalesce(c.title, (select o.name from conversation_members oc join members o on o.id = oc.member_id where oc.conversation_id = c.id and oc.member_id <> m.id limit 1), 'Conversa') as title,
      (select o.avatar from conversation_members oc join members o on o.id = oc.member_id where oc.conversation_id = c.id and oc.member_id <> m.id limit 1) as avatar,
      (select o.role from conversation_members oc join members o on o.id = oc.member_id where oc.conversation_id = c.id and oc.member_id <> m.id limit 1) as role,
      (select o.id from conversation_members oc join members o on o.id = oc.member_id where oc.conversation_id = c.id and oc.member_id <> m.id and not c.is_group limit 1) as other_id,
      (select count(*) from conversation_members oc where oc.conversation_id = c.id) as members,
      (select jsonb_build_object('body', left(ms.body, 120), 'mine', ms.member_id = m.id, 'name', (select name from members where id = ms.member_id))
        from messages ms where ms.conversation_id = c.id order by ms.id desc limit 1) as last,
      (select count(*) from messages ms where ms.conversation_id = c.id and ms.created_at > cm.last_read_at and ms.member_id is distinct from m.id) as unread
    from conversations c join conversation_members cm on cm.conversation_id = c.id and cm.member_id = m.id
    where exists (select 1 from messages ms where ms.conversation_id = c.id) or c.created_by = m.id) x), '[]');
end $$;

create or replace function conversation_messages(p_token text, p_conv uuid, p_after bigint default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); c conversations := _conv_of(m, p_conv); out jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x) order by x.id), '[]') into out from (
    select ms.id, ms.body, ms.created_at, ms.member_id, ms.member_id = m.id as mine, mb.name, mb.avatar, mb.role
    from messages ms left join members mb on mb.id = ms.member_id
    where ms.conversation_id = c.id and (p_after is null or ms.id > p_after)
    order by ms.id desc limit 80) x;
  update conversation_members set last_read_at = now() where conversation_id = c.id and member_id = m.id;
  return jsonb_build_object(
    'conversation', jsonb_build_object('id', c.id, 'is_group', c.is_group, 'title', c.title, 'created_by', c.created_by),
    'members', (select jsonb_agg(jsonb_build_object('id', mb.id, 'name', mb.name, 'avatar', mb.avatar, 'role', mb.role) order by mb.name)
      from conversation_members cm join members mb on mb.id = cm.member_id where cm.conversation_id = c.id),
    'messages', out);
end $$;

create or replace function send_message(p_token text, p_conv uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); c conversations := _conv_of(m, p_conv); b text := left(trim(coalesce(p_body, '')), 4000); r messages;
begin
  if b = '' then raise exception 'mensagem_vazia'; end if;
  insert into messages(conversation_id, member_id, body) values (c.id, m.id, b) returning * into r;
  update conversations set last_message_at = now() where id = c.id;
  update conversation_members set last_read_at = now() where conversation_id = c.id and member_id = m.id;
  return jsonb_build_object('id', r.id, 'body', r.body, 'created_at', r.created_at, 'member_id', m.id, 'mine', true, 'name', m.name, 'avatar', m.avatar, 'role', m.role);
end $$;

create or replace function unread_count(p_token text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  return (select count(*) from conversation_members cm join messages ms on ms.conversation_id = cm.conversation_id
    where cm.member_id = m.id and ms.created_at > cm.last_read_at and ms.member_id is distinct from m.id);
end $$;

revoke all on function _conv_of(members, uuid) from public, anon, authenticated;
grant execute on function member_profile(text, uuid), open_direct(text, uuid), create_group(text, text, uuid[]), group_add(text, uuid, uuid[]),
  conversation_list(text), conversation_messages(text, uuid, bigint), send_message(text, uuid, text), unread_count(text) to anon, authenticated;
