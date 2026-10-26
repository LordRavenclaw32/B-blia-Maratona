import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBook } from '../data/books';
import { CHURCH, nsKey, planChapters } from './church';
import { rpc, ServerError } from './server';
import { completedBooks, streak, totalRead } from './stats';
import { today, useStore, type Profile } from './store';

/** Comunidade da igreja: conta do membro, papéis (membro, líder, pastor), conteúdos e sincronização da leitura. */

export type Role = 'member' | 'leader' | 'pastor';

export interface Member {
  id: string;
  church: string;
  name: string;
  login: string;
  role: Role;
  avatar: number;
  grp?: string | null;
  share_activity: boolean;
  church_name?: string;
}

export interface Series {
  id: string;
  kind: 'serie' | 'mural';
  title: string;
  subtitle?: string | null;
  description?: string | null;
  cover?: string | null;
  seasons: string[];
  month?: string | null;
  launch_at?: string | null;
  author?: string | null;
  created_at: string;
  mine?: boolean;
}

export interface Content {
  id: string;
  series_id?: string | null;
  season: number;
  position: number;
  kind: 'mensagem' | 'video' | 'podcast';
  phase?: 'pre' | 'pos' | null;
  title: string;
  summary?: string | null;
  body?: string | null;
  verses: string[];
  media_url?: string | null;
  thumb?: string | null;
  author?: string | null;
  author_role?: string | null;
  publish_at: string;
  locked: boolean;
  mine?: boolean;
}

export interface Catalog {
  series: Series[];
  contents: Content[];
}

export interface FeedItem {
  id: number;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
  member_id: string;
  name: string;
  avatar: number;
  role: Role;
  amens: number;
  mine: boolean;
}

export interface CommunityMember {
  id: string;
  name: string;
  avatar: number;
  role: Role;
  grp?: string | null;
  created_at: string;
  last_seen: string;
  share_activity: boolean;
  total?: number | null;
  streak?: number | null;
  last7?: number | null;
  plan_read?: number | null;
  plan_total?: number | null;
  books_done?: number | null;
  devotionals?: number | null;
  last_read_at?: string | null;
  last_ref?: string | null;
  login?: string | null;
}

export interface ProfileStats {
  total: number;
  last7: number;
  streak: number;
  plan_read: number;
  plan_total: number;
  books_done: number;
  devotionals: number;
  last_read_at?: string | null;
  last_ref?: string | null;
  updated_at?: string;
  detail?: { days?: Record<string, number>; books?: Record<string, number>; recent?: { book: string; chapter: number }[] };
}

export interface MemberProfile {
  member: CommunityMember;
  visible: boolean;
  stats: ProfileStats | null;
  activity: { id: number; kind: string; data: Record<string, unknown>; created_at: string }[] | null;
}

export interface ConversationSummary {
  id: string;
  is_group: boolean;
  title: string;
  avatar?: number | null;
  role?: Role | null;
  other_id?: string | null;
  members: number;
  last_message_at: string;
  last?: { body: string; mine: boolean; name?: string | null } | null;
  unread: number;
}

export interface ChatMessage {
  id: number;
  body: string;
  created_at: string;
  member_id?: string | null;
  mine: boolean;
  name?: string | null;
  avatar?: number | null;
  role?: Role | null;
}

interface Session {
  token: string;
  member: Member;
  /** perfil local cujo progresso é enviado para a igreja */
  profileId: string;
}

interface Snapshot {
  read: Record<string, number[]>;
  devs: string[];
  done: string[];
  streak: number;
}

interface CommunityValue {
  enabled: boolean;
  slug: string;
  session: Session | null;
  member: Member | null;
  isLeader: boolean;
  isPastor: boolean;
  catalog: Catalog | null;
  catalogError: string | null;
  unread: number;
  refreshUnread(): void;
  join(name: string, login: string, pin: string): Promise<void>;
  login(login: string, pin: string): Promise<void>;
  logout(): Promise<void>;
  leave(): Promise<void>;
  elevate(code: string): Promise<Role>;
  updateMe(patch: { name?: string; avatar?: number; grp?: string; share?: boolean }): Promise<void>;
  refreshCatalog(): Promise<void>;
  call<T>(fn: string, args?: Record<string, unknown>): Promise<T>;
  syncNow(): Promise<void>;
}

const Ctx = createContext<CommunityValue | null>(null);
const SLUG = CHURCH ? CHURCH.slugReal ?? CHURCH.slug : '';
const LS_SESSION = nsKey('mb:comunidade');
const LS_CATALOG = nsKey('mb:catalogo');
const LS_SNAP = nsKey('mb:sync');

function lsGet<T>(k: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
function lsSet(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function snapshotOf(p: Profile): Snapshot {
  return {
    read: Object.fromEntries(Object.entries(p.progress).map(([id, pr]) => [id, [...pr.read]])),
    devs: p.devotionals.map((d) => d.id),
    done: completedBooks(p).map((b) => b.id),
    streak: streak(p).current,
  };
}

function ranges(nums: number[]): string {
  const s = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(', ');
}

export function statsOf(p: Profile) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return p.activity[today(d)] ?? 0;
  }).reduce((a, b) => a + b, 0);
  const plan = CHURCH?.plano ? planChapters(CHURCH.plano) : [];
  const ordered = Object.entries(p.progress).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  const recent = ordered[0];
  const days: Record<string, number> = {};
  for (let i = 0; i < 84; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = today(d);
    if (p.activity[k]) days[k] = p.activity[k];
  }
  return {
    total: totalRead(p),
    last7,
    streak: streak(p).current,
    plan_read: plan.filter((it) => p.progress[it.book.id]?.read.includes(it.chapter)).length,
    plan_total: plan.length,
    books_done: completedBooks(p).length,
    devotionals: p.devotionals.length,
    last_read_at: recent ? new Date(recent[1].updatedAt).toISOString() : null,
    last_ref: recent ? `${getBook(recent[0])?.name ?? recent[0]} ${recent[1].lastChapter}` : null,
    // rotina detalhada exibida no perfil (últimas 12 semanas e séries em andamento)
    detail: {
      days,
      books: Object.fromEntries(ordered.map(([id, pr]) => [id, pr.read.length])),
      recent: ordered.slice(0, 8).map(([id, pr]) => ({ book: id, chapter: pr.lastChapter })),
    },
  };
}

function eventsSince(prev: Snapshot, p: Profile) {
  const events: { kind: string; data: Record<string, unknown> }[] = [];
  for (const [id, pr] of Object.entries(p.progress)) {
    const before = new Set(prev.read[id] ?? []);
    const fresh = pr.read.filter((c) => !before.has(c));
    const book = getBook(id);
    if (fresh.length && book) events.push({ kind: 'read', data: { book: id, ref: `${book.name} ${ranges(fresh)}`, n: fresh.length } });
  }
  for (const b of completedBooks(p)) if (!prev.done.includes(b.id)) events.push({ kind: 'complete', data: { book: b.id, name: b.name } });
  for (const d of p.devotionals)
    if (!prev.devs.includes(d.id)) events.push({ kind: 'devotional', data: { title: d.title, book: d.bookId, rating: d.rating, verse: d.verse ?? null } });
  const s = streak(p).current;
  const mark = [3, 7, 15, 30, 50, 100, 365].filter((m) => s >= m && prev.streak < m).pop();
  if (mark) events.push({ kind: 'streak', data: { days: mark } });
  return events.slice(0, 30);
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { profile } = useStore();
  const [session, setSession] = useState<Session | null>(() => (CHURCH ? lsGet<Session>(LS_SESSION) : null));
  const [catalog, setCatalog] = useState<Catalog | null>(() => (CHURCH ? lsGet<Catalog>(LS_CATALOG) : null));
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const save = useCallback((s: Session | null) => {
    setSession(s);
    lsSet(LS_SESSION, s);
    if (!s) {
      lsSet(LS_CATALOG, null);
      lsSet(LS_SNAP, null);
      setCatalog(null);
    }
  }, []);

  const call = useCallback(
    async <T,>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
      const s = sessionRef.current;
      if (!s) throw new ServerError('sessao_invalida');
      try {
        return await rpc<T>(fn, { p_token: s.token, ...args });
      } catch (e) {
        if (e instanceof ServerError && e.code === 'sessao_invalida') save(null);
        throw e;
      }
    },
    [save],
  );

  const start = useCallback(
    (res: { token: string; member: Member }) => {
      if (!profile) return;
      lsSet(LS_SNAP, snapshotOf(profile));
      save({ token: res.token, member: res.member, profileId: profile.id });
      // primeiro envio do progresso já existente (sem gerar atividades antigas)
      rpc('sync_progress', { p_token: res.token, p_stats: statsOf(profile), p_events: [] }).catch(() => undefined);
    },
    [profile, save],
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const c = await call<Catalog>('catalog');
      setCatalog(c);
      setCatalogError(null);
      lsSet(LS_CATALOG, c);
    } catch (e) {
      setCatalogError((e as Error).message);
    }
  }, [call]);

  // sincroniza a leitura do perfil vinculado (com atraso, agrupando várias leituras)
  const syncing = useRef(false);
  const syncNow = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !profile || profile.id !== s.profileId || syncing.current) return;
    syncing.current = true;
    try {
      const prev = lsGet<Snapshot>(LS_SNAP) ?? snapshotOf(profile);
      const events = eventsSince(prev, profile);
      await rpc('sync_progress', { p_token: s.token, p_stats: statsOf(profile), p_events: s.member.share_activity ? events : [] });
      lsSet(LS_SNAP, snapshotOf(profile));
    } catch (e) {
      if (e instanceof ServerError && e.code === 'sessao_invalida') save(null);
    } finally {
      syncing.current = false;
    }
  }, [profile, save]);

  useEffect(() => {
    if (!session || !profile || profile.id !== session.profileId) return;
    const t = setTimeout(syncNow, 4000);
    return () => clearTimeout(t);
  }, [profile?.progress, profile?.devotionals, session, syncNow]);

  useEffect(() => {
    const on = () => document.visibilityState === 'hidden' && syncNow();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [syncNow]);

  // mensagens não lidas: consulta a cada 20 s com o app aberto e ao navegar
  const lastUnread = useRef(0);
  const refreshUnread = useCallback(() => {
    if (!sessionRef.current) return;
    lastUnread.current = Date.now();
    call<number>('unread_count')
      .then(setUnread)
      .catch(() => undefined);
  }, [call]);
  useEffect(() => {
    if (!session) return setUnread(0);
    refreshUnread();
    const tick = () => document.visibilityState === 'visible' && refreshUnread();
    // ao navegar pelo app, atualiza no máximo a cada 8 s
    const onNav = () => Date.now() - lastUnread.current > 8000 && tick();
    const t = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('hashchange', onNav);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('hashchange', onNav);
    };
  }, [session?.token, refreshUnread]);

  // atualiza papel/nome e catálogo ao abrir o app
  useEffect(() => {
    if (!session) return;
    call<Member>('me')
      .then((m) => save({ ...sessionRef.current!, member: m }))
      .catch(() => undefined);
    refreshCatalog();
  }, [session?.token]);

  const value = useMemo<CommunityValue>(() => {
    const member = session?.member ?? null;
    return {
      enabled: !!CHURCH,
      slug: SLUG,
      session,
      member,
      isLeader: member?.role === 'leader' || member?.role === 'pastor',
      isPastor: member?.role === 'pastor',
      catalog,
      catalogError,
      unread,
      refreshUnread,
      async join(name, login, pin) {
        start(await rpc<{ token: string; member: Member }>('join_church', { p_slug: SLUG, p_name: name, p_login: login, p_pin: pin, p_avatar: profile?.avatar ?? 0 }));
      },
      async login(login, pin) {
        start(await rpc<{ token: string; member: Member }>('login_member', { p_slug: SLUG, p_login: login, p_pin: pin }));
      },
      async logout() {
        const s = sessionRef.current;
        save(null);
        if (s) await rpc('logout_member', { p_token: s.token }).catch(() => undefined);
      },
      async leave() {
        await call('leave_church');
        save(null);
      },
      async elevate(code) {
        const m = await call<Member>('elevate', { p_code: code });
        save({ ...sessionRef.current!, member: m });
        refreshCatalog();
        return m.role;
      },
      async updateMe(patch) {
        const m = await call<Member>('update_me', { p_name: patch.name ?? null, p_avatar: patch.avatar ?? null, p_grp: patch.grp ?? member?.grp ?? null, p_share: patch.share ?? null });
        save({ ...sessionRef.current!, member: m });
      },
      refreshCatalog,
      call,
      syncNow,
    };
  }, [session, catalog, catalogError, unread, refreshUnread, start, save, call, refreshCatalog, syncNow, profile?.avatar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommunity(): CommunityValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('CommunityProvider ausente');
  return v;
}

export const ROLE_LABEL: Record<Role, string> = { member: 'Membro', leader: 'Líder', pastor: 'Pastor(a)' };

export function seasonsOf(series: Series, contents: Content[]): { n: number; title: string; items: Content[] }[] {
  const items = contents.filter((c) => c.series_id === series.id);
  const nums = [...new Set([...items.map((c) => c.season), ...series.seasons.map((_, i) => i + 1)])].sort((a, b) => a - b);
  return nums
    .map((n) => ({ n, title: series.seasons[n - 1] || `Temporada ${n}`, items: items.filter((c) => c.season === n).sort((a, b) => a.position - b.position || a.publish_at.localeCompare(b.publish_at)) }))
    .filter((s) => s.items.length || series.seasons[s.n - 1]);
}

export function isLaunched(series?: Series | null): boolean {
  return !series?.launch_at || new Date(series.launch_at).getTime() <= Date.now();
}

export function relTime(iso?: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key?: string | null): string {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} de ${y}`;
}
