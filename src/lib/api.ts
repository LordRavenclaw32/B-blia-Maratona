import type { Book } from '../data/books';
import { idbGet, idbSet } from './idb';

export type VersionId = 'nvi' | 'ara' | 'arc';
export type SourcePref = 'auto' | 'abibliadigital' | 'github';

export interface Verse {
  number: number;
  text: string;
}

export interface ChapterData {
  verses: Verse[];
  source: 'abibliadigital' | 'github';
  /** identificador da versão efetivamente servida pela fonte */
  servedAs: string;
}

export const VERSIONS: { id: VersionId; label: string; name: string }[] = [
  { id: 'nvi', label: 'NVI', name: 'Nova Versão Internacional' },
  { id: 'ara', label: 'ARA', name: 'Almeida Revista e Atualizada' },
  { id: 'arc', label: 'ARC', name: 'Almeida Revista e Corrigida' },
];

export const ABD_BASE = 'https://www.abibliadigital.com.br/api';

/** Identificadores aceitos pela ABíbliaDigital para cada versão (o primeiro disponível é usado). */
const ABD_KEYS: Record<VersionId, string[]> = {
  nvi: ['nvi'],
  ara: ['ara', 'ra'],
  arc: ['arc', 'acf'],
};

/** Fallback: Bíblias completas em JSON de domínio aberto no GitHub (thiagobodruk/biblia). */
const GH_FILES: Record<VersionId, string> = { nvi: 'nvi', ara: 'aa', arc: 'acf' };
const GH_URL = (file: string) => `https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/${file}.json`;

export const SOURCE_LABEL: Record<string, string> = {
  nvi: 'NVI',
  ra: 'ARA (ra)',
  ara: 'ARA',
  arc: 'ARC',
  acf: 'Almeida Corrigida Fiel',
  aa: 'Almeida Revisada',
};

interface ApiConfig {
  token: string;
  source: SourcePref;
}

let config: ApiConfig = { token: '', source: 'auto' };
export function configureApi(c: Partial<ApiConfig>) {
  config = { ...config, ...c };
}

// ───────────── ABíbliaDigital ─────────────
let abdDownUntil = 0;
let abdVersions: string[] | null = null;
let abdVersionsPromise: Promise<string[] | null> | null = null;

function abdHeaders(): HeadersInit {
  return config.token ? { Authorization: `Bearer ${config.token}` } : {};
}

async function fetchJson(url: string, opts: RequestInit = {}, timeout = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    const text = await res.text();
    return JSON.parse(text.replace(/^﻿/, ''));
  } finally {
    clearTimeout(t);
  }
}

/** GET /api/versions */
export async function abdListVersions(): Promise<string[] | null> {
  if (abdVersions) return abdVersions;
  if (!abdVersionsPromise) {
    abdVersionsPromise = (async () => {
      const cached = await idbGet<{ at: number; list: string[] }>('abd:versions');
      if (cached && Date.now() - cached.at < 86400000) return (abdVersions = cached.list);
      try {
        const data = (await fetchJson(`${ABD_BASE}/versions`, { headers: abdHeaders() }, 6000)) as { version: string }[];
        const list = data.map((v) => v.version.toLowerCase());
        abdVersions = list;
        idbSet('abd:versions', { at: Date.now(), list });
        return list;
      } catch {
        abdDownUntil = Date.now() + 5 * 60_000;
        return null;
      } finally {
        abdVersionsPromise = null;
      }
    })();
  }
  return abdVersionsPromise;
}

/** GET /api/books */
export async function abdListBooks(): Promise<unknown[]> {
  return (await fetchJson(`${ABD_BASE}/books`, { headers: abdHeaders() })) as unknown[];
}

async function abdChapter(version: VersionId, book: Book, chapter: number): Promise<ChapterData> {
  if (Date.now() < abdDownUntil) throw new Error('ABíbliaDigital indisponível');
  const available = await abdListVersions();
  const key = ABD_KEYS[version].find((k) => !available || available.includes(k)) ?? ABD_KEYS[version][0];
  try {
    const data = (await fetchJson(
      `${ABD_BASE}/verses/${key}/${encodeURIComponent(book.abbrev)}/${chapter}`,
      { headers: abdHeaders() },
    )) as { verses?: { number: number; text: string }[] };
    if (!data.verses?.length) throw new Error('Resposta vazia');
    return { verses: data.verses.map((v) => ({ number: v.number, text: v.text.trim() })), source: 'abibliadigital', servedAs: key };
  } catch (e) {
    const status = (e as { status?: number }).status;
    // limite de requisições, servidor fora do ar ou rede: pausa a fonte por alguns minutos
    if (!status || status === 429 || status >= 500 || status === 403) abdDownUntil = Date.now() + 5 * 60_000;
    throw e;
  }
}

// ───────────── GitHub (fallback) ─────────────
const ghMemory = new Map<VersionId, Promise<string[][][]>>();

function ghBible(version: VersionId): Promise<string[][][]> {
  let p = ghMemory.get(version);
  if (!p) {
    p = (async () => {
      const stored = await idbGet<string[][][]>(`gh:${version}`);
      if (stored) return stored;
      const data = (await fetchJson(GH_URL(GH_FILES[version]), {}, 45000)) as { chapters: string[][] }[];
      const chapters = data.map((b) => b.chapters);
      idbSet(`gh:${version}`, chapters);
      return chapters;
    })();
    p.catch(() => ghMemory.delete(version));
    ghMemory.set(version, p);
  }
  return p;
}

async function ghChapter(version: VersionId, book: Book, chapter: number): Promise<ChapterData> {
  const bible = await ghBible(version);
  const verses = bible[book.index]?.[chapter - 1];
  if (!verses) throw new Error('Capítulo não encontrado');
  return {
    verses: verses.map((text, i) => ({ number: i + 1, text: text.trim() })),
    source: 'github',
    servedAs: GH_FILES[version],
  };
}

// ───────────── API pública ─────────────
const inflight = new Map<string, Promise<ChapterData>>();

export function getChapter(version: VersionId, book: Book, chapter: number): Promise<ChapterData> {
  const key = `ch:${version}:${book.id}:${chapter}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    const cached = await idbGet<ChapterData>(key);
    if (cached) return cached;
    let data: ChapterData;
    const order: ('abibliadigital' | 'github')[] =
      config.source === 'github' ? ['github'] : config.source === 'abibliadigital' ? ['abibliadigital', 'github'] : ['abibliadigital', 'github'];
    let lastErr: unknown;
    for (const src of order) {
      try {
        data = src === 'abibliadigital' ? await abdChapter(version, book, chapter) : await ghChapter(version, book, chapter);
        idbSet(key, data);
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Falha ao carregar o capítulo');
  })();
  inflight.set(key, p);
  p.finally(() => inflight.delete(key));
  return p;
}

export async function testAbd(): Promise<{ ok: boolean; versions?: string[]; message: string }> {
  try {
    abdVersions = null;
    abdDownUntil = 0;
    const data = (await fetchJson(`${ABD_BASE}/versions`, { headers: abdHeaders() }, 8000)) as { version: string }[];
    const versions = data.map((v) => v.version.toLowerCase());
    abdVersions = versions;
    return { ok: true, versions, message: `Conectado — ${versions.length} versões disponíveis` };
  } catch (e) {
    return { ok: false, message: `Sem conexão com a ABíbliaDigital (${(e as Error).message}). O app usará a fonte alternativa.` };
  }
}
