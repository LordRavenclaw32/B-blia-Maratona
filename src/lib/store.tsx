import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { configureApi, type SourcePref, type VersionId } from './api';
import { CHURCH, nsKey } from './church';

export type ReaderTheme = 'dark' | 'sepia' | 'light';
export type Rating = 'down' | 'up' | 'love';

export interface Settings {
  version: VersionId;
  fontSize: number;
  readerTheme: ReaderTheme;
  autoplay: boolean;
  dailyGoal: number;
  showVerseNumbers: boolean;
  source: SourcePref;
  token: string;
}

export interface BookProgress {
  read: number[];
  lastChapter: number;
  updatedAt: number;
}

export interface Devotional {
  id: string;
  bookId: string;
  episode?: number;
  title: string;
  text: string;
  rating: number;
  mood: string;
  verse?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  id: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  version: VersionId;
  at: number;
}

/** Capa personalizada de uma série (chave = id do livro) ou episódio ("livro:n"). */
export interface Cover {
  /** caminho de uma arte do app (art/…) ou "idb:<id>" para imagem enviada pelo usuário */
  src: string;
  w: number;
  h: number;
  /** estilo visual aplicado (ver COVER_STYLES) */
  style?: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: number;
  pinHash?: string;
  createdAt: number;
  settings: Settings;
  progress: Record<string, BookProgress>;
  myList: string[];
  ratings: Record<string, Rating>;
  devotionals: Devotional[];
  favorites: Favorite[];
  covers: Record<string, Cover>;
  /** yyyy-mm-dd → capítulos lidos no dia */
  activity: Record<string, number>;
}

interface DB {
  v: 1;
  profiles: Profile[];
}

const KEY = nsKey('mb:db');
const SESSION = nsKey('mb:session');

export const DEFAULT_SETTINGS: Settings = {
  version: CHURCH?.versaoPadrao || CHURCH?.versoes?.[0] || 'nvi',
  fontSize: 20,
  readerTheme: 'dark',
  autoplay: true,
  dailyGoal: 3,
  showVerseNumbers: true,
  source: 'auto',
  token: '',
};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, val: string | null) {
  try {
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {
    /* armazenamento indisponível */
  }
}

function load(): DB {
  const raw = safeGet(KEY);
  if (raw) {
    try {
      const db = JSON.parse(raw) as DB;
      db.profiles = db.profiles.map(normalizeProfile);
      return db;
    } catch {
      /* corrompido: recomeça */
    }
  }
  return { v: 1, profiles: [] };
}

/** No app de uma igreja, troca uma versão não liberada pela versão padrão da igreja. */
function allowedVersion(s: Settings): Settings {
  const allowed = CHURCH?.versoes;
  if (allowed?.length && !s.version.startsWith('u-') && !allowed.includes(s.version)) return { ...s, version: DEFAULT_SETTINGS.version };
  return s;
}

function normalizeProfile(p: Partial<Profile>): Profile {
  return {
    id: p.id ?? uid(),
    name: p.name ?? 'Leitor',
    avatar: p.avatar ?? 0,
    pinHash: p.pinHash,
    createdAt: p.createdAt ?? Date.now(),
    settings: allowedVersion({ ...DEFAULT_SETTINGS, ...(p.settings ?? {}) }),
    progress: p.progress ?? {},
    myList: p.myList ?? [],
    ratings: p.ratings ?? {},
    devotionals: p.devotionals ?? [],
    favorites: p.favorites ?? [],
    covers: p.covers ?? {},
    activity: p.activity ?? {},
  };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  try {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // contextos sem SubtleCrypto (http não seguro): hash simples
    let h = 0;
    for (const b of data) h = (Math.imul(h, 31) + b) | 0;
    return `w${(h >>> 0).toString(16)}`;
  }
}

interface Actions {
  createProfile(p: { name: string; avatar: number; pin?: string; version: VersionId }): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatar'>> & { pin?: string | null; version?: VersionId }): Promise<void>;
  deleteProfile(id: string): void;
  login(id: string): void;
  logout(): void;
  setChapterRead(bookId: string, chapter: number, read?: boolean): void;
  setLastChapter(bookId: string, chapter: number): void;
  resetBook(bookId: string): void;
  toggleList(bookId: string): void;
  rate(bookId: string, r: Rating | null): void;
  saveDevotional(d: Omit<Devotional, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Devotional;
  deleteDevotional(id: string): void;
  toggleFavorite(f: Omit<Favorite, 'id' | 'at'>): boolean;
  setCover(key: string, cover: Cover | null): void;
  updateSettings(patch: Partial<Settings>): void;
  exportData(): string;
  importData(json: string): number;
}

interface StoreValue {
  profiles: Profile[];
  profile: Profile | null;
  actions: Actions;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [sessionId, setSessionId] = useState<string | null>(() => safeGet(SESSION));
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    safeSet(KEY, JSON.stringify(db));
  }, [db]);

  // sincroniza entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setDb(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const profile = useMemo(() => db.profiles.find((p) => p.id === sessionId) ?? null, [db, sessionId]);

  useEffect(() => {
    if (profile) configureApi({ token: profile.settings.token, source: profile.settings.source });
  }, [profile]);

  const mutateProfile = useCallback(
    (fn: (p: Profile) => Profile, id?: string) => {
      setDb((cur) => {
        const target = id ?? sessionId;
        return { ...cur, profiles: cur.profiles.map((p) => (p.id === target ? fn(p) : p)) };
      });
    },
    [sessionId],
  );

  const actions = useMemo<Actions>(
    () => ({
      async createProfile({ name, avatar, pin, version }) {
        const id = uid();
        const p = normalizeProfile({
          id,
          name: name.trim() || 'Leitor',
          avatar,
          pinHash: pin ? await hashPin(pin, id) : undefined,
          settings: { ...DEFAULT_SETTINGS, version },
        });
        setDb((cur) => ({ ...cur, profiles: [...cur.profiles, p] }));
        return p;
      },
      async updateProfile(id, patch) {
        const pinHash = patch.pin === undefined ? undefined : patch.pin === null ? null : await hashPin(patch.pin, id);
        setDb((cur) => ({
          ...cur,
          profiles: cur.profiles.map((p) => {
            if (p.id !== id) return p;
            const next: Profile = { ...p };
            if (patch.name !== undefined) next.name = patch.name.trim() || p.name;
            if (patch.avatar !== undefined) next.avatar = patch.avatar;
            if (patch.version) next.settings = { ...p.settings, version: patch.version };
            if (pinHash === null) delete next.pinHash;
            else if (pinHash) next.pinHash = pinHash;
            return next;
          }),
        }));
      },
      deleteProfile(id) {
        setDb((cur) => ({ ...cur, profiles: cur.profiles.filter((p) => p.id !== id) }));
        if (sessionId === id) {
          setSessionId(null);
          safeSet(SESSION, null);
        }
      },
      login(id) {
        setSessionId(id);
        safeSet(SESSION, id);
      },
      logout() {
        setSessionId(null);
        safeSet(SESSION, null);
      },
      setChapterRead(bookId, chapter, read = true) {
        mutateProfile((p) => {
          const cur = p.progress[bookId] ?? { read: [], lastChapter: chapter, updatedAt: 0 };
          const has = cur.read.includes(chapter);
          if (has === read) return { ...p, progress: { ...p.progress, [bookId]: { ...cur, lastChapter: chapter, updatedAt: Date.now() } } };
          const nextRead = read ? [...cur.read, chapter].sort((a, b) => a - b) : cur.read.filter((c) => c !== chapter);
          const day = today();
          const activity = { ...p.activity };
          if (read) activity[day] = (activity[day] ?? 0) + 1;
          return {
            ...p,
            activity,
            progress: { ...p.progress, [bookId]: { read: nextRead, lastChapter: chapter, updatedAt: Date.now() } },
          };
        });
      },
      setLastChapter(bookId, chapter) {
        mutateProfile((p) => {
          const cur = p.progress[bookId] ?? { read: [], lastChapter: chapter, updatedAt: 0 };
          return { ...p, progress: { ...p.progress, [bookId]: { ...cur, lastChapter: chapter, updatedAt: Date.now() } } };
        });
      },
      resetBook(bookId) {
        mutateProfile((p) => {
          const progress = { ...p.progress };
          delete progress[bookId];
          return { ...p, progress };
        });
      },
      toggleList(bookId) {
        mutateProfile((p) => ({
          ...p,
          myList: p.myList.includes(bookId) ? p.myList.filter((b) => b !== bookId) : [bookId, ...p.myList],
        }));
      },
      rate(bookId, r) {
        mutateProfile((p) => {
          const ratings = { ...p.ratings };
          if (r) ratings[bookId] = r;
          else delete ratings[bookId];
          return { ...p, ratings };
        });
      },
      saveDevotional(d) {
        const now = Date.now();
        const existing = d.id ? dbRef.current.profiles.find((p) => p.id === sessionId)?.devotionals.find((x) => x.id === d.id) : undefined;
        const dev: Devotional = existing
          ? { ...existing, ...d, id: existing.id, updatedAt: now }
          : { ...d, id: uid(), createdAt: now, updatedAt: now };
        mutateProfile((p) => ({
          ...p,
          devotionals: existing ? p.devotionals.map((x) => (x.id === dev.id ? dev : x)) : [dev, ...p.devotionals],
        }));
        return dev;
      },
      deleteDevotional(id) {
        mutateProfile((p) => ({ ...p, devotionals: p.devotionals.filter((d) => d.id !== id) }));
      },
      setCover(key, cover) {
        mutateProfile((p) => {
          const covers = { ...p.covers };
          if (cover) covers[key] = cover;
          else delete covers[key];
          return { ...p, covers };
        });
      },
      toggleFavorite(f) {
        const p = dbRef.current.profiles.find((x) => x.id === sessionId);
        const exists = p?.favorites.find((x) => x.bookId === f.bookId && x.chapter === f.chapter && x.verse === f.verse);
        mutateProfile((pr) => ({
          ...pr,
          favorites: exists ? pr.favorites.filter((x) => x.id !== exists.id) : [{ ...f, id: uid(), at: Date.now() }, ...pr.favorites],
        }));
        return !exists;
      },
      updateSettings(patch) {
        mutateProfile((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
      },
      exportData() {
        const p = dbRef.current.profiles.find((x) => x.id === sessionId);
        return JSON.stringify({ app: 'maratona-biblica', exportedAt: new Date().toISOString(), profile: p }, null, 2);
      },
      importData(json) {
        const parsed = JSON.parse(json) as { profile?: Partial<Profile>; profiles?: Partial<Profile>[] };
        const incoming = parsed.profiles ?? (parsed.profile ? [parsed.profile] : []);
        if (!incoming.length) throw new Error('Arquivo sem perfis');
        setDb((cur) => {
          const map = new Map(cur.profiles.map((p) => [p.id, p]));
          for (const raw of incoming) {
            const p = normalizeProfile(raw);
            map.set(p.id, p);
          }
          return { ...cur, profiles: [...map.values()] };
        });
        return incoming.length;
      },
    }),
    [mutateProfile, sessionId],
  );

  const value = useMemo(() => ({ profiles: db.profiles, profile, actions }), [db.profiles, profile, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider ausente');
  return v;
}

/** Perfil ativo (garantido nas rotas autenticadas). */
export function useProfile(): Profile {
  const { profile } = useStore();
  if (!profile) throw new Error('Nenhum perfil ativo');
  return profile;
}
