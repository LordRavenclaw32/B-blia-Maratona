import type { Book } from '../data/books';
import manifest from '../data/artManifest.json';
import { artUrl } from './art';

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
}

type Kind = 'poster' | 'backdrop' | 'thumb';

const M = manifest as unknown as { books: Record<string, Painting>; episodes: Record<string, Painting> };

export function painting(book: Book, ep?: number): Painting | undefined {
  return (ep ? M.episodes[`${book.id}:${ep}`] : undefined) ?? M.books[book.id];
}

/** Tamanhos padronizados de miniatura do Wikimedia. */
const STEPS = [500, 960, 1280, 1920];
const NEED: Record<Kind, number> = { thumb: 500, poster: 960, backdrop: 1920 };

function sized(p: Painting, want: number): string {
  if (!p.t || !/\/\d+px-/.test(p.t)) return p.u;
  const fit = STEPS.filter((s) => s <= p.w);
  if (!fit.length) return p.u;
  const size = fit.find((s) => s >= want) ?? fit[fit.length - 1];
  if (size >= p.w) return p.u;
  return p.t.replace(/\/\d+px-/, `/${size}px-`);
}

/** URL da imagem (pintura real; arte vetorial apenas como reserva). */
export function imageUrl(book: Book, kind: Kind, ep?: number): string {
  const p = painting(book, ep);
  return p ? sized(p, NEED[kind]) : artUrl(book, kind, ep);
}

export function fallbackUrl(book: Book, kind: Kind, ep?: number): string {
  return artUrl(book, kind, ep);
}

export function credit(p: Painting | undefined): string {
  if (!p) return '';
  const name = p.n.replace(/\s*\(\s*\)\s*$/, '');
  return `${name}${p.a ? ` — ${p.a}` : ''}`;
}
