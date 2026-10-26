import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Book } from '../data/books';
import { BOOKS } from '../data/books';
import { CUSTOM_ART } from '../data/customArt';
import manifest from '../data/artManifest.json';
import { idbGet, idbSet } from './idb';
import { useStore, uid, type Cover } from './store';

/** Estilos visuais para capas personalizadas (CSS filter, também aplicado no canvas de compartilhamento). */
export const COVER_STYLES: { id: string; name: string; filter: string }[] = [
  { id: 'original', name: 'Original', filter: 'none' },
  { id: 'biblico', name: 'Bíblico', filter: 'sepia(0.55) saturate(1.15) contrast(1.05) brightness(0.95)' },
  { id: 'cinema', name: 'Cinema', filter: 'contrast(1.25) saturate(1.3) brightness(0.92)' },
  { id: 'dourado', name: 'Dourado', filter: 'sepia(0.35) saturate(1.6) hue-rotate(-12deg) brightness(1.02)' },
  { id: 'noite', name: 'Noite', filter: 'brightness(0.75) saturate(0.85) hue-rotate(185deg) sepia(0.15)' },
  { id: 'pb', name: 'P&B', filter: 'grayscale(1) contrast(1.15)' },
];

export function styleFilter(id?: string): string {
  return COVER_STYLES.find((s) => s.id === id)?.filter ?? 'none';
}

export interface ResolvedCover {
  url: string;
  w: number;
  h: number;
  filter: string;
}

interface CoversValue {
  coverOf(book: Book, ep?: number): ResolvedCover | undefined;
  /** salva uma imagem enviada e devolve o src "idb:<id>" */
  saveUpload(dataUrl: string): Promise<string>;
  urlOf(src: string): string | undefined;
}

const Ctx = createContext<CoversValue | null>(null);

export function CoversProvider({ children }: { children: ReactNode }) {
  const { profile } = useStore();
  const covers = useMemo(() => profile?.covers ?? {}, [profile?.covers]);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Object.values(covers)
      .map((c) => c.src)
      .filter((s) => s.startsWith('idb:') && !images[s]);
    if (!ids.length) return;
    let alive = true;
    Promise.all(ids.map(async (src) => [src, await idbGet<string>(`cover:${src.slice(4)}`)] as const)).then((pairs) => {
      if (!alive) return;
      setImages((cur) => {
        const next = { ...cur };
        for (const [src, data] of pairs) if (data) next[src] = data;
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [covers, images]);

  const value = useMemo<CoversValue>(() => {
    const urlOf = (src: string) => (src.startsWith('idb:') ? images[src] : src);
    return {
      urlOf,
      coverOf(book, ep) {
        const c: Cover | undefined = (ep ? covers[`${book.id}:${ep}`] : undefined) ?? (ep ? undefined : covers[book.id]);
        if (!c) return undefined;
        const url = urlOf(c.src);
        return url ? { url, w: c.w, h: c.h, filter: styleFilter(c.style) } : undefined;
      },
      async saveUpload(dataUrl) {
        const id = uid();
        await idbSet(`cover:${id}`, dataUrl);
        const src = `idb:${id}`;
        setImages((cur) => ({ ...cur, [src]: dataUrl }));
        return src;
      },
    };
  }, [covers, images]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCovers(): CoversValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('CoversProvider ausente');
  return v;
}

// ───────── galeria de artes do app ─────────
export interface GalleryItem {
  src: string;
  thumb: string;
  w: number;
  h: number;
  name: string;
  /** id do livro de origem (quando houver) */
  book?: string;
  testament?: 'AT' | 'NT';
}

let galleryCache: GalleryItem[] | null = null;

export function galleryItems(): GalleryItem[] {
  if (galleryCache) return galleryCache;
  const seen = new Set<string>();
  const out: GalleryItem[] = [];
  const testamentOf = (id?: string) => BOOKS.find((b) => b.id === id)?.testament;
  const push = (it: GalleryItem) => {
    if (seen.has(it.src)) return;
    seen.add(it.src);
    out.push(it);
  };
  for (const [key, c] of Object.entries(CUSTOM_ART)) {
    const book = key.split(/[:@]/)[0];
    push({ src: `art/${c.file}.webp`, thumb: `art/${c.file}-sm.webp`, w: c.w, h: c.h, name: c.name, book, testament: testamentOf(book) });
  }
  const M = manifest as unknown as {
    books: Record<string, { p?: string; w: number; h: number; n: string }>;
    episodes: Record<string, { p?: string; w: number; h: number; n: string }>;
    groups?: Record<string, { p?: string; w: number; h: number; n: string }>;
  };
  for (const [key, v] of [...Object.entries(M.books), ...Object.entries(M.episodes)]) {
    if (!v.p) continue;
    const book = key.split(':')[0];
    push({ src: v.p, thumb: v.p, w: v.w, h: v.h, name: v.n, book, testament: testamentOf(book) });
  }
  for (const v of Object.values(M.groups ?? {})) if (v.p) push({ src: v.p, thumb: v.p, w: v.w, h: v.h, name: v.n });
  galleryCache = out;
  return out;
}

// ───────── backup das imagens enviadas ─────────
type Backup = { profile?: { covers?: Record<string, Cover> }; coverImages?: Record<string, string> };

export async function withCoverImages(json: string): Promise<string> {
  const data = JSON.parse(json) as Backup;
  const images: Record<string, string> = {};
  for (const c of Object.values(data.profile?.covers ?? {})) {
    if (c.src.startsWith('idb:')) {
      const img = await idbGet<string>(`cover:${c.src.slice(4)}`);
      if (img) images[c.src] = img;
    }
  }
  if (Object.keys(images).length) data.coverImages = images;
  return JSON.stringify(data, null, 2);
}

export async function restoreCoverImages(json: string): Promise<void> {
  const data = JSON.parse(json) as Backup;
  for (const [src, img] of Object.entries(data.coverImages ?? {})) await idbSet(`cover:${src.slice(4)}`, img);
}

/** Lê um arquivo de imagem, reduz para no máximo 1400px e devolve um dataURL JPEG. */
export function fileToCover(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.86), w, h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}
