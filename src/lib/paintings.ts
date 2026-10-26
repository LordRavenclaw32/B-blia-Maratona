import type { Book } from '../data/books';
import manifest from '../data/artManifest.json';
import { CUSTOM_ART } from '../data/customArt';

/** Obra de arte em domínio público (Wikimedia Commons) associada a um livro ou episódio. */
export interface Painting {
  f: string;
  t: string;
  u: string;
  w: number;
  h: number;
  a: string;
  l: string;
  n: string;
  d: string;
  /** arte própria servida de public/art */
  local?: boolean;
  /** cópia local baixada pelo workflow (public/art/c) */
  p?: string;
}

type Kind = 'poster' | 'backdrop' | 'thumb';

const M = manifest as unknown as { books: Record<string, Painting>; episodes: Record<string, Painting>; groups?: Record<string, Painting> };

/** Imagem bíblica genérica, usada só se nada mais estiver disponível. */
export const GENERIC_ART = 'art/bg-livro-luz.webp';

function custom(key: string): Painting | undefined {
  const c = CUSTOM_ART[key];
  if (!c) return undefined;
  return { f: c.file, t: `art/${c.file}-sm.webp`, u: `art/${c.file}.webp`, w: c.w, h: c.h, a: '', l: '', n: c.name, d: '', local: true };
}

export function painting(book: Book, ep?: number, kind?: Kind): Painting | undefined {
  if (!ep && kind === 'backdrop') {
    const b = custom(`${book.id}@backdrop`);
    if (b) return b;
  }
  if (ep) {
    const key = `${book.id}:${ep}`;
    const e = custom(key) ?? M.episodes[key];
    if (e) return e;
  }
  return custom(book.id) ?? M.books[book.id];
}

/** Livros com arte própria (usados com prioridade no destaque da página inicial). */
export const BOOKS_WITH_CUSTOM_ART = new Set(Object.keys(CUSTOM_ART).map((k) => k.split(/[:@]/)[0]));

/** Tamanhos padronizados de miniatura do Wikimedia. */
const STEPS = [500, 960, 1280, 1920];
const NEED: Record<Kind, number> = { thumb: 500, poster: 960, backdrop: 1920 };

function sized(p: Painting, want: number): string {
  if (p.local) return want <= 500 ? p.t : p.u;
  if (p.p) return p.p;
  if (!p.t || !/\/\d+px-/.test(p.t)) return p.u;
  const fit = STEPS.filter((s) => s <= p.w);
  if (!fit.length) return p.u;
  const size = fit.find((s) => s >= want) ?? fit[fit.length - 1];
  if (size >= p.w) return p.u;
  return p.t.replace(/\/\d+px-/, `/${size}px-`);
}

/** URL da imagem (pintura real; arte vetorial apenas como reserva). */
export function imageUrl(book: Book, kind: Kind, ep?: number): string {
  const p = painting(book, ep, kind);
  return p ? sized(p, NEED[kind]) : groupUrl(book.group) ?? GENERIC_ART;
}

/** Cadeia de reservas quando a imagem principal falha: original remoto → pôster do livro → imagem genérica. */
export function fallbackChain(book: Book, kind: Kind, ep?: number): string[] {
  const p = painting(book, ep, kind);
  const out: string[] = [];
  if (p && !p.local && p.p && p.t) out.push(p.t);
  const bookP = painting(book, undefined, 'poster');
  if (ep && bookP) out.push(sized(bookP, NEED.poster));
  const g = groupUrl(book.group);
  if (g) out.push(g);
  out.push(GENERIC_ART);
  return out.filter((u, i, a) => a.indexOf(u) === i);
}

/** Arte temática da temporada (coleção) ou do testamento. */
export function groupPainting(key: string): Painting | undefined {
  return M.groups?.[key];
}

export function groupUrl(key: string): string | undefined {
  const g = M.groups?.[key];
  return g ? sized(g, 1600) : undefined;
}

/** Resolve caminhos de public/ em URLs absolutas (CSS e canvas). */
export function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

export function credit(p: Painting | undefined): string {
  if (!p) return '';
  const name = p.n.replace(/\s*\(\s*\)\s*$/, '');
  return `${name}${p.a ? ` — ${p.a}` : ''}`;
}
