import IGREJAS from 'virtual:igrejas';
import { getBook, type Book } from '../data/books';

/** Configuração do app próprio de uma igreja (arquivo igrejas/<slug>.json). */
export interface ChurchConfig {
  slug: string;
  /** nome completo, ex.: "Igreja Batista Central" */
  nome: string;
  app?: { nome?: string; subtitulo?: string };
  /** cor principal (#rrggbb) */
  cor?: string;
  /** URL, caminho publicado ou data URL da logo */
  logo?: string;
  cidade?: string;
  pastor?: string;
  boasVindas?: string;
  contato?: { whatsapp?: string; instagram?: string; youtube?: string; site?: string; email?: string; endereco?: string; pix?: string };
  cultos?: { dia: string; hora: string; nome?: string }[];
  avisos?: { titulo: string; texto?: string; data?: string; link?: string }[];
  playlists?: { nome: string; descricao?: string; url: string }[];
  /** mantém as playlists Louvores Clássicos e Gospel 2026 junto com as da igreja (padrão: sim) */
  manterPlaylistsPadrao?: boolean;
  plano?: ReadingPlan;
  /** versões permitidas (nvi, ara, arc); vazio = todas */
  versoes?: string[];
  versaoPadrao?: string;
  acesso?: { hash?: string; codigo?: string; dica?: string };
  /** mostra "tecnologia BíbliaFlix" no rodapé (padrão: sim) */
  creditoBibliaFlix?: boolean;
  /** só na demonstração: endereço que a igreja terá ao ser publicada */
  slugReal?: string;
}

export interface ReadingPlan {
  titulo: string;
  descricao?: string;
  /** yyyy-mm-dd */
  inicio: string;
  capitulosPorDia: number;
  /** ids dos livros na ordem de leitura */
  livros: string[];
}

export const CHURCHES: ChurchConfig[] = IGREJAS;

const LS_ACTIVE = 'mb:igreja';
export const LS_DEMO = 'mb:igreja-demo';
export const DEMO_SLUG = 'demo';

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function demoConfig(): ChurchConfig | null {
  try {
    const c = JSON.parse(lsGet(LS_DEMO) ?? 'null') as ChurchConfig | null;
    return c?.nome ? { ...c, slug: DEMO_SLUG } : null;
  } catch {
    return null;
  }
}

/** ?igreja=<slug> escolhe a igreja (e fica lembrado para o app instalado); ?igreja=bibliaflix volta ao app padrão. */
function detect(): ChurchConfig | null {
  const q = new URLSearchParams(location.search).get('igreja');
  if (q !== null) lsSet(LS_ACTIVE, q && q !== 'bibliaflix' ? q : null);
  const slug = q ?? lsGet(LS_ACTIVE);
  if (!slug || slug === 'bibliaflix') return null;
  const found = slug === DEMO_SLUG ? demoConfig() : CHURCHES.find((c) => c.slug === slug) ?? null;
  if (!found) lsSet(LS_ACTIVE, null);
  return found;
}

export const CHURCH: ChurchConfig | null = detect();
export const IS_DEMO = CHURCH?.slug === DEMO_SLUG;

/** Faixa de "modo demonstração" (configurador ou ?demo=1 vindo da apresentação). */
export const SHOW_DEMO_BAR = (() => {
  if (!CHURCH) return false;
  if (IS_DEMO) return true;
  try {
    if (new URLSearchParams(location.search).has('demo')) sessionStorage.setItem('mb:demo-bar', '1');
    return sessionStorage.getItem('mb:demo-bar') === '1';
  } catch {
    return false;
  }
})();

/** Separa os dados (perfis, progresso, louvor) de cada igreja no mesmo aparelho. */
export function nsKey(key: string): string {
  return CHURCH ? `${key}@${CHURCH.slug}` : key;
}

// ───────── cores ─────────
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex: string, f: number): string {
  const rgb = hexToRgb(hex) ?? [229, 9, 20];
  const c = rgb.map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function resolveAsset(src: string): string {
  if (/^(data:|https?:|blob:)/.test(src)) return src;
  return new URL(src, document.baseURI).href;
}

/** Aplica nome, cor, ícone e manifesto da igreja antes do primeiro render. */
export function applyChurchTheme() {
  if (!CHURCH) return;
  const root = document.documentElement.style;
  const color = hexToRgb(CHURCH.cor ?? '') ? CHURCH.cor! : '#e50914';
  const rgb = hexToRgb(color)!;
  root.setProperty('--red', color);
  root.setProperty('--red-2', shade(color, -0.25));
  root.setProperty('--red-hover', shade(color, 0.12));
  root.setProperty('--red-rgb', rgb.join(', '));
  root.setProperty('--bf-lines', shade(color, -0.6));
  root.setProperty('--red-deep', shade(color, -0.82));
  const name = CHURCH.app?.nome || CHURCH.nome;
  document.title = name;
  const icon = CHURCH.logo ? resolveAsset(CHURCH.logo) : undefined;
  if (icon) {
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
      l.href = icon;
      l.removeAttribute('type');
    });
  }
  const start = new URL(location.pathname, location.origin);
  start.searchParams.set('igreja', CHURCH.slug);
  const manifest = {
    name,
    short_name: (CHURCH.app?.nome || CHURCH.nome).slice(0, 24),
    description: CHURCH.app?.subtitulo ?? `Maratona bíblica da ${CHURCH.nome}`,
    start_url: `${start.href}#/browse`,
    scope: new URL('./', location.href).href,
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    lang: 'pt-BR',
    icons: [{ src: icon ?? new URL('icon.svg', document.baseURI).href, sizes: 'any', purpose: 'any' }],
  };
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) link.href = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(manifest))}`;
}

/** Link para divulgar: página de entrada da igreja (com prévia no WhatsApp) ou ?igreja=. */
export function churchLink(slug = CHURCH?.slug): string {
  const base = new URL('./', location.href);
  base.search = '';
  base.hash = '';
  if (!slug) return base.href;
  if (import.meta.env.PROD && slug !== DEMO_SLUG) return new URL(`igreja/${slug}/`, base).href;
  base.searchParams.set('igreja', slug);
  return base.href;
}

// ───────── código de acesso ─────────
export async function accessHash(slug: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${slug}:${code.trim().toLowerCase()}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const accessKey = () => `mb:acesso@${CHURCH?.slug}`;

export function needsAccess(): boolean {
  const hash = CHURCH?.acesso?.hash;
  return !!hash && lsGet(accessKey()) !== hash;
}

export async function tryAccess(code: string): Promise<boolean> {
  if (!CHURCH?.acesso?.hash) return true;
  const ok = (await accessHash(CHURCH.slugReal ?? CHURCH.slug, code)) === CHURCH.acesso.hash;
  if (ok) lsSet(accessKey(), CHURCH.acesso.hash);
  return ok;
}

// ───────── plano de leitura da igreja ─────────
export interface PlanDay {
  day: number;
  date: Date;
  items: { book: Book; chapter: number }[];
}

export function planChapters(plan: ReadingPlan): { book: Book; chapter: number }[] {
  const out: { book: Book; chapter: number }[] = [];
  for (const id of plan.livros) {
    const b = getBook(id);
    if (b) for (let c = 1; c <= b.chapters; c++) out.push({ book: b, chapter: c });
  }
  return out;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

export function planDays(plan: ReadingPlan): PlanDay[] {
  const all = planChapters(plan);
  const per = Math.max(1, Math.round(plan.capitulosPorDia) || 1);
  const start = parseDate(plan.inicio);
  const days: PlanDay[] = [];
  for (let i = 0; i < all.length; i += per) {
    const n = i / per;
    const date = new Date(start);
    date.setDate(start.getDate() + n);
    days.push({ day: n + 1, date, items: all.slice(i, i + per) });
  }
  return days;
}

/** Índice (0…) do dia de hoje no plano; negativo = ainda não começou; ≥ total = terminou. */
export function planTodayIndex(plan: ReadingPlan, now = new Date()): number {
  const start = parseDate(plan.inicio);
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((b - a) / 86400000);
}

export function planBooks(plan: ReadingPlan): Book[] {
  return plan.livros.map((id) => getBook(id)).filter((b): b is Book => !!b);
}

export function dayLabel(day: PlanDay): string {
  const groups: { book: Book; from: number; to: number }[] = [];
  for (const it of day.items) {
    const last = groups[groups.length - 1];
    if (last && last.book.id === it.book.id && last.to === it.chapter - 1) last.to = it.chapter;
    else groups.push({ book: it.book, from: it.chapter, to: it.chapter });
  }
  return groups.map((g) => `${g.book.name} ${g.from}${g.to > g.from ? `–${g.to}` : ''}`).join(', ');
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function instagramLink(v: string): string {
  return /^https?:/.test(v) ? v : `https://instagram.com/${v.replace(/^@/, '')}`;
}

export function externalLink(v: string): string {
  return /^https?:/.test(v) ? v : `https://${v}`;
}
