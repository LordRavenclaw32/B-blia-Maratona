-- BíbliaFlix · Comunidade da igreja (membros, líderes, pastores, conteúdos, atividades)
-- Todo acesso é feito por funções (RPC) com token de sessão; as tabelas ficam fechadas por RLS.

create extension if not exists pgcrypto with schema extensions;

create table if not exists platform (id int primary key default 1 check (id = 1), master_hash text not null);

create table if not exists churches (
  slug text primary key,
  name text not null,
  pastor_code_hash text not null,
  leader_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  login text not null,
  pin_hash text not null,
  role text not null default 'member' check (role in ('member', 'leader', 'pastor')),
  avatar int not null default 0,
  grp text,
  share_activity boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (church, login)
);

create table if not exists sessions (
  token_hash text primary key,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days'
);
create index if not exists sessions_member_idx on sessions(member_id);

create table if not exists member_stats (
  member_id uuid primary key references members(id) on delete cascade,
  total int not null default 0,
  last7 int not null default 0,
  streak int not null default 0,
  plan_read int not null default 0,
  plan_total int not null default 0,
  books_done int not null default 0,
  devotionals int not null default 0,
  last_read_at timestamptz,
  last_ref text,
  updated_at timestamptz not null default now()
);

create table if not exists activity (
  id bigint generated always as identity primary key,
  church text not null references churches(slug) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activity_church_idx on activity(church, created_at desc);
create index if not exists activity_member_idx on activity(member_id);

create table if not exists reactions (
  activity_id bigint not null references activity(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (activity_id, member_id)
);
create index if not exists reactions_member_idx on reactions(member_id);

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  kind text not null default 'serie' check (kind in ('serie', 'mural')),
  title text not null check (char_length(title) between 1 and 120),
  subtitle text,
  description text,
  cover text,
  seasons jsonb not null default '[]',
  month text,
  launch_at timestamptz,
  author text,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists series_church_idx on series(church);
create index if not exists series_created_by_idx on series(created_by);

create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  church text not null references churches(slug) on delete cascade,
  series_id uuid references series(id) on delete cascade,
  season int not null default 1,
  position int not null default 0,
  kind text not null default 'mensagem' check (kind in ('mensagem', 'video', 'podcast')),
  phase text check (phase in ('pre', 'pos')),
  title text not null check (char_length(title) between 1 and 160),
  summary text,
  body text check (char_length(body) <= 60000),
  verses text[] not null default '{}',
  media_url text,
  thumb text check (char_length(thumb) <= 400000),
  author text,
  author_role text,
  publish_at timestamptz not null default now(),
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contents_church_idx on contents(church);
create index if not exists contents_series_idx on contents(series_id);
create index if not exists contents_created_by_idx on contents(created_by);

alter table platform enable row level security;
alter table churches enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;
alter table member_stats enable row level security;
alter table activity enable row level security;
alter table reactions enable row level security;
alter table series enable row level security;
alter table contents enable row level security;

-- ───────── utilitários ─────────
create or replace function _h(t text) returns text language sql immutable set search_path = public, extensions
as $$ select encode(extensions.digest(t, 'sha256'), 'hex') $$;

create or replace function _code() returns text language sql volatile set search_path = public, extensions
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 32) + 1, 1), '')
  from (select extensions.gen_random_bytes(10) b) x, generate_series(0, 9) i
$$;

create or replace function _member(p_token text) returns members
language plpgsql security definer set search_path = public, extensions as $$
declare m members;
begin
  select mb.* into m from sessions s join members mb on mb.id = s.member_id
  where s.token_hash = _h(coalesce(p_token, '')) and s.expires_at > now();
  if not found then raise exception 'sessao_invalida'; end if;
  if m.last_seen < now() - interval '5 minutes' then update members set last_seen = now() where id = m.id; end if;
  return m;
end $$;

create or replace function _require(m members, roles text[]) returns void language plpgsql set search_path = public as $$
begin
  if not (m.role = any(roles)) then raise exception 'sem_permissao'; end if;
end $$;

create or replace function _member_json(m members) returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('id', m.id, 'church', m.church, 'name', m.name, 'login', m.login, 'role', m.role,
    'avatar', m.avatar, 'grp', m.grp, 'share_activity', m.share_activity, 'church_name', (select name from churches where slug = m.church))
$$;

create or replace function _new_session(p_member uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  delete from sessions where member_id = p_member and expires_at < now();
  insert into sessions(token_hash, member_id) values (_h(t), p_member);
  return t;
end $$;

-- ───────── plataforma (vendedor) ─────────
create or replace function register_church(p_master text, p_slug text, p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare pc text := _code(); lc text := _code();
begin
  if not exists (select 1 from platform where master_hash = _h(coalesce(p_master, ''))) then raise exception 'chave_mestra_invalida'; end if;
  if p_slug !~ '^[a-z0-9-]{2,48}$' then raise exception 'endereco_invalido'; end if;
  insert into churches(slug, name, pastor_code_hash, leader_code_hash) values (p_slug, p_name, _h(pc), _h(lc))
  on conflict (slug) do update set name = excluded.name, pastor_code_hash = excluded.pastor_code_hash, leader_code_hash = excluded.leader_code_hash;
  return jsonb_build_object('pastor_code', pc, 'leader_code', lc);
end $$;

create or replace function church_status(p_slug text) returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_build_object('active', exists (select 1 from churches where slug = p_slug),
    'members', (select count(*) from members where church = p_slug))
$$;

-- ───────── conta do membro ─────────
create or replace function join_church(p_slug text, p_name text, p_login text, p_pin text, p_avatar int default 0) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members; l text := lower(trim(p_login));
begin
  if not exists (select 1 from churches where slug = p_slug) then raise exception 'igreja_inativa'; end if;
  if char_length(coalesce(p_pin, '')) < 4 then raise exception 'pin_curto'; end if;
  if char_length(l) < 3 then raise exception 'login_invalido'; end if;
  if exists (select 1 from members where church = p_slug and login = l) then raise exception 'login_existe'; end if;
  insert into members(church, name, login, pin_hash, avatar)
  values (p_slug, left(trim(p_name), 40), l, extensions.crypt(p_pin, extensions.gen_salt('bf')), coalesce(p_avatar, 0)) returning * into m;
  insert into activity(church, member_id, kind) values (p_slug, m.id, 'join');
  return jsonb_build_object('token', _new_session(m.id), 'member', _member_json(m));
end $$;

create or replace function login_member(p_slug text, p_login text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members;
begin
  -- erros de senha são devolvidos (sem exceção) para o contador de tentativas ser gravado
  select * into m from members where church = p_slug and login = lower(trim(p_login));
  if not found then return jsonb_build_object('error', 'login_incorreto'); end if;
  if m.locked_until > now() then return jsonb_build_object('error', 'bloqueado'); end if;
  if m.pin_hash <> extensions.crypt(coalesce(p_pin, ''), m.pin_hash) then
    update members set failed = case when failed + 1 >= 5 then 0 else failed + 1 end,
      locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where id = m.id;
    return jsonb_build_object('error', 'login_incorreto');
  end if;
  update members set failed = 0, locked_until = null, last_seen = now() where id = m.id;
  return jsonb_build_object('token', _new_session(m.id), 'member', _member_json(m));
end $$;

create or replace function logout_member(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from sessions where token_hash = _h(coalesce(p_token, ''))
$$;

create or replace function me(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin return _member_json(_member(p_token)); end $$;

create or replace function update_me(p_token text, p_name text, p_avatar int, p_grp text, p_share boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  update members set name = coalesce(nullif(left(trim(p_name), 40), ''), name), avatar = coalesce(p_avatar, avatar),
    grp = nullif(left(trim(coalesce(p_grp, '')), 40), ''), share_activity = coalesce(p_share, share_activity)
  where id = m.id returning * into m;
  return _member_json(m);
end $$;

create or replace function elevate(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); c churches; h text := _h(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')));
begin
  select * into c from churches where slug = m.church;
  if h = c.pastor_code_hash then update members set role = 'pastor' where id = m.id returning * into m;
  elsif h = c.leader_code_hash then
    if m.role = 'member' then update members set role = 'leader' where id = m.id returning * into m; end if;
  else raise exception 'codigo_invalido';
  end if;
  return _member_json(m);
end $$;

create or replace function leave_church(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin delete from members where id = m.id; end $$;

-- ───────── progresso e atividades ─────────
create or replace function sync_progress(p_token text, p_stats jsonb, p_events jsonb default '[]') returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); e jsonb;
begin
  insert into member_stats(member_id, total, last7, streak, plan_read, plan_total, books_done, devotionals, last_read_at, last_ref, updated_at)
  values (m.id, coalesce((p_stats->>'total')::int, 0), coalesce((p_stats->>'last7')::int, 0), coalesce((p_stats->>'streak')::int, 0),
    coalesce((p_stats->>'plan_read')::int, 0), coalesce((p_stats->>'plan_total')::int, 0), coalesce((p_stats->>'books_done')::int, 0),
    coalesce((p_stats->>'devotionals')::int, 0), (p_stats->>'last_read_at')::timestamptz, left(p_stats->>'last_ref', 80), now())
  on conflict (member_id) do update set total = excluded.total, last7 = excluded.last7, streak = excluded.streak, plan_read = excluded.plan_read,
    plan_total = excluded.plan_total, books_done = excluded.books_done, devotionals = excluded.devotionals,
    last_read_at = coalesce(excluded.last_read_at, member_stats.last_read_at), last_ref = coalesce(excluded.last_ref, member_stats.last_ref), updated_at = now();
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) limit 30 loop
    if e->>'kind' in ('read', 'devotional', 'complete', 'streak', 'plan') and pg_column_size(e->'data') < 2000 then
      insert into activity(church, member_id, kind, data) values (m.church, m.id, e->>'kind', coalesce(e->'data', '{}'));
    end if;
  end loop;
end $$;

create or replace function feed(p_token text, p_before bigint default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  return coalesce((select jsonb_agg(row_to_json(x) order by x.id desc) from (
    select a.id, a.kind, a.data, a.created_at, mb.id as member_id, mb.name, mb.avatar, mb.role,
      (select count(*) from reactions r where r.activity_id = a.id) as amens,
      exists (select 1 from reactions r where r.activity_id = a.id and r.member_id = m.id) as mine
    from activity a join members mb on mb.id = a.member_id
    where a.church = m.church and (mb.share_activity or mb.id = m.id or a.kind in ('launch', 'content'))
      and (p_before is null or a.id < p_before)
    order by a.id desc limit 40) x), '[]');
end $$;

create or replace function react(p_token text, p_activity bigint) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  if not exists (select 1 from activity where id = p_activity and church = m.church) then raise exception 'nao_encontrado'; end if;
  if exists (select 1 from reactions where activity_id = p_activity and member_id = m.id) then
    delete from reactions where activity_id = p_activity and member_id = m.id;
  else insert into reactions values (p_activity, m.id);
  end if;
  return (select count(*) from reactions where activity_id = p_activity);
end $$;

create or replace function community(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); lead boolean := m.role in ('leader', 'pastor');
begin
  return coalesce((select jsonb_agg(row_to_json(x) order by x.total desc nulls last, x.name) from (
    select mb.id, mb.name, mb.avatar, mb.role, mb.grp, mb.created_at, mb.last_seen, mb.share_activity,
      case when lead or mb.share_activity or mb.id = m.id then s.total end as total,
      case when lead or mb.share_activity or mb.id = m.id then s.streak end as streak,
      case when lead or mb.id = m.id then s.last7 end as last7,
      case when lead or mb.id = m.id then s.plan_read end as plan_read,
      case when lead or mb.id = m.id then s.plan_total end as plan_total,
      case when lead or mb.id = m.id then s.books_done end as books_done,
      case when lead or mb.id = m.id then s.devotionals end as devotionals,
      case when lead or mb.id = m.id then s.last_read_at end as last_read_at,
      case when lead or mb.id = m.id then s.last_ref end as last_ref,
      case when lead then mb.login end as login
    from members mb left join member_stats s on s.member_id = mb.id
    where mb.church = m.church) x), '[]');
end $$;

create or replace function set_role(p_token text, p_member uuid, p_role text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['pastor']);
  if p_member = m.id then raise exception 'sem_permissao'; end if;
  if p_role not in ('member', 'leader', 'pastor') then raise exception 'papel_invalido'; end if;
  update members set role = p_role where id = p_member and church = m.church;
end $$;

create or replace function remove_member(p_token text, p_member uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['pastor']);
  if p_member = m.id then raise exception 'sem_permissao'; end if;
  delete from members where id = p_member and church = m.church;
end $$;

create or replace function reset_member_pin(p_token text, p_member uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['pastor']);
  if char_length(coalesce(p_pin, '')) < 4 then raise exception 'pin_curto'; end if;
  update members set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')), failed = 0, locked_until = null where id = p_member and church = m.church;
  delete from sessions where member_id = p_member;
end $$;

create or replace function rotate_codes(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); pc text := _code(); lc text := _code();
begin
  perform _require(m, array['pastor']);
  update churches set pastor_code_hash = _h(pc), leader_code_hash = _h(lc) where slug = m.church;
  return jsonb_build_object('pastor_code', pc, 'leader_code', lc);
end $$;

-- ───────── conteúdos (séries, mural, mensagens, vídeos, podcasts) ─────────
create or replace function catalog(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); lead boolean := m.role in ('leader', 'pastor');
begin
  return jsonb_build_object(
    'series', coalesce((select jsonb_agg(to_jsonb(s) - 'church' - 'created_by' || jsonb_build_object('mine', s.created_by = m.id) order by coalesce(s.launch_at, s.created_at) desc)
      from series s where s.church = m.church), '[]'),
    'contents', coalesce((select jsonb_agg(
        case when lead or (c.publish_at <= now() and coalesce(sr.launch_at, '-infinity') <= now())
          then to_jsonb(c) - 'church' - 'created_by' || jsonb_build_object('locked', false, 'mine', c.created_by = m.id)
          else jsonb_build_object('id', c.id, 'series_id', c.series_id, 'season', c.season, 'position', c.position, 'kind', c.kind, 'phase', c.phase,
            'title', c.title, 'summary', c.summary, 'thumb', c.thumb, 'author', c.author, 'author_role', c.author_role, 'publish_at', c.publish_at,
            'verses', '{}'::text[], 'locked', true, 'mine', false)
        end order by c.season, c.position, c.publish_at)
      from contents c left join series sr on sr.id = c.series_id where c.church = m.church), '[]'));
end $$;

create or replace function save_series(p_token text, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); sid uuid := nullif(p->>'id', '')::uuid; is_new boolean := false;
begin
  perform _require(m, array['leader', 'pastor']);
  if sid is null or not exists (select 1 from series where id = sid and church = m.church) then
    insert into series(church, created_by, title) values (m.church, m.id, coalesce(nullif(p->>'title', ''), 'Nova série')) returning id into sid;
    is_new := true;
  end if;
  update series set
    kind = coalesce(p->>'kind', kind), title = coalesce(nullif(p->>'title', ''), title), subtitle = p->>'subtitle', description = p->>'description',
    cover = p->>'cover', seasons = coalesce(p->'seasons', seasons), month = p->>'month', launch_at = nullif(p->>'launch_at', '')::timestamptz,
    author = p->>'author', updated_at = now()
  where id = sid;
  if is_new then
    insert into activity(church, member_id, kind, data)
    select m.church, m.id, 'launch', jsonb_build_object('series', s.id, 'title', s.title, 'kind', s.kind, 'launch_at', s.launch_at) from series s where s.id = sid;
  end if;
  return sid;
end $$;

create or replace function delete_series(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['leader', 'pastor']);
  delete from series where id = p_id and church = m.church and (m.role = 'pastor' or created_by = m.id or created_by is null);
  delete from activity where church = m.church and kind = 'launch' and data->>'series' = p_id::text;
end $$;

create or replace function save_content(p_token text, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token); cid uuid := nullif(p->>'id', '')::uuid; sid uuid := nullif(p->>'series_id', '')::uuid; is_new boolean := false;
begin
  perform _require(m, array['leader', 'pastor']);
  if sid is not null and not exists (select 1 from series where id = sid and church = m.church) then raise exception 'serie_invalida'; end if;
  if cid is null or not exists (select 1 from contents where id = cid and church = m.church) then
    insert into contents(church, created_by, title) values (m.church, m.id, coalesce(nullif(p->>'title', ''), 'Sem título')) returning id into cid;
    is_new := true;
  end if;
  update contents set
    series_id = sid, season = coalesce((p->>'season')::int, 1), position = coalesce((p->>'position')::int, 0),
    kind = coalesce(p->>'kind', kind), phase = nullif(p->>'phase', ''), title = coalesce(nullif(p->>'title', ''), title),
    summary = p->>'summary', body = p->>'body', verses = coalesce((select array_agg(left(v, 40)) from jsonb_array_elements_text(p->'verses') v), '{}'),
    media_url = p->>'media_url', thumb = p->>'thumb', author = p->>'author', author_role = p->>'author_role',
    publish_at = coalesce(nullif(p->>'publish_at', '')::timestamptz, publish_at), updated_at = now()
  where id = cid;
  if is_new then
    insert into activity(church, member_id, kind, data)
    select m.church, m.id, 'content', jsonb_build_object('content', c.id, 'title', c.title, 'kind', c.kind, 'series', c.series_id, 'publish_at', c.publish_at)
    from contents c where c.id = cid;
  end if;
  return cid;
end $$;

create or replace function delete_content(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare m members := _member(p_token);
begin
  perform _require(m, array['leader', 'pastor']);
  delete from contents where id = p_id and church = m.church and (m.role = 'pastor' or created_by = m.id or created_by is null);
  delete from activity where church = m.church and kind = 'content' and data->>'content' = p_id::text;
end $$;

-- ───────── permissões ─────────
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function register_church(text, text, text), church_status(text), join_church(text, text, text, text, int), login_member(text, text, text),
  logout_member(text), me(text), update_me(text, text, int, text, boolean), elevate(text, text), leave_church(text),
  sync_progress(text, jsonb, jsonb), feed(text, bigint), react(text, bigint), community(text), set_role(text, uuid, text),
  remove_member(text, uuid), reset_member_pin(text, uuid, text), rotate_codes(text), catalog(text), save_series(text, jsonb),
  delete_series(text, uuid), save_content(text, jsonb), delete_content(text, uuid)
to anon, authenticated;
