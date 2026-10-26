import { BOOKS, normalize, type Book } from '../data/books';

/** Referências bíblicas em texto livre ("Jo 3:16", "1 Coríntios 13:4-7", "Salmos 23"). */
export interface Ref {
  book: Book;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  label: string;
}

const KEYS = new Map<string, Book>();
for (const b of BOOKS) {
  const name = normalize(b.name).replace(/\s+/g, '');
  KEYS.set(name, b);
  KEYS.set(normalize(b.abbrev), b);
  KEYS.set(b.id, b);
}
const EXTRA: Record<string, string> = {
  gen: 'gn', exo: 'ex', lev: 'lv', num: 'nm', deut: 'dt', jos: 'js', juiz: 'jz', sal: 'sl', salmo: 'sl', prov: 'pv', ecl: 'ec',
  cant: 'ct', isa: 'is', jer: 'jr', lam: 'lm', eze: 'ez', dan: 'dn', mat: 'mt', mar: 'mc', luc: 'lc', joao: 'jo', rom: 'rm',
  gal: 'gl', efe: 'ef', fil: 'fp', col: 'cl', heb: 'hb', tia: 'tg', apo: 'ap', apoc: 'ap',
  '1cor': '1co', '2cor': '2co', '1tes': '1ts', '2tes': '2ts', '1tim': '1tm', '2tim': '2tm', '1ped': '1pe', '2ped': '2pe',
  '1sam': '1sm', '2sam': '2sm', '1reis': '1rs', '2reis': '2rs', '1cron': '1cr', '2cron': '2cr', '1joao': '1jo', '2joao': '2jo', '3joao': '3jo',
};
for (const [k, id] of Object.entries(EXTRA)) {
  const b = BOOKS.find((x) => x.id === id);
  if (b) KEYS.set(k, b);
}

function bookFor(raw: string): Book | undefined {
  // "Jó" (com acento) é o livro de Jó; "Jo" é João
  if (/^j[óÓ]$/.test(raw.trim())) return BOOKS.find((b) => normalize(b.name) === 'jo');
  const key = normalize(raw).replace(/[\s.]+/g, '');
  return KEYS.get(key) ?? (key.replace(/^[1-3]/, '').length >= 3 ? BOOKS.find((b) => normalize(b.name).replace(/\s+/g, '').startsWith(key)) : undefined);
}

const RE = /\b((?:[1-3]\s?)?[A-Za-zÀ-ÿ]{2,}\.?)\s+(\d{1,3})(?:\s?[:.,]\s?(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?)?/g;

export function parseRef(text: string): Ref | null {
  RE.lastIndex = 0;
  const m = RE.exec(text.trim());
  return m && m.index === 0 ? toRef(m) : null;
}

function toRef(m: RegExpExecArray): Ref | null {
  const book = bookFor(m[1]);
  if (!book) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const verse = m[3] ? Number(m[3]) : undefined;
  const verseEnd = m[4] ? Number(m[4]) : undefined;
  return { book, chapter, verse, verseEnd, label: `${book.name} ${chapter}${verse ? `:${verse}${verseEnd ? `-${verseEnd}` : ''}` : ''}` };
}

export type Segment = string | { ref: Ref; text: string };

/** Divide o texto em trechos comuns e referências bíblicas reconhecidas. */
export function splitRefs(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(text))) {
    const ref = toRef(m);
    if (!ref) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ ref, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function findRefs(text: string): Ref[] {
  const seen = new Set<string>();
  return splitRefs(text)
    .filter((s): s is { ref: Ref; text: string } => typeof s !== 'string')
    .map((s) => s.ref)
    .filter((r) => !seen.has(r.label) && seen.add(r.label));
}

export function refHref(r: Ref): string {
  return `#/read/${r.book.id}/${r.chapter}${r.verse ? `?v=${r.verse}` : ''}`;
}
