import { BOOKS, TOTAL_CHAPTERS, getBook, readingMinutes, type Book, type Episode } from '../data/books';
import { today, type Profile } from './store';

export function readSet(p: Profile, bookId: string): Set<number> {
  return new Set(p.progress[bookId]?.read ?? []);
}

export function bookPercent(p: Profile, book: Book): number {
  return (p.progress[book.id]?.read.length ?? 0) / book.chapters;
}

export function episodeRead(p: Profile, book: Book, ep: Episode): number {
  const s = readSet(p, book.id);
  let n = 0;
  for (let c = ep.start; c <= ep.end; c++) if (s.has(c)) n++;
  return n;
}

export function episodePercent(p: Profile, book: Book, ep: Episode): number {
  return episodeRead(p, book, ep) / (ep.end - ep.start + 1);
}

export function totalRead(p: Profile): number {
  return Object.values(p.progress).reduce((s, b) => s + b.read.length, 0);
}

export function overallPercent(p: Profile): number {
  return totalRead(p) / TOTAL_CHAPTERS;
}

export function completedBooks(p: Profile): Book[] {
  return BOOKS.filter((b) => (p.progress[b.id]?.read.length ?? 0) >= b.chapters);
}

export function minutesRead(p: Profile): number {
  let m = 0;
  for (const [id, prog] of Object.entries(p.progress)) {
    const b = getBook(id);
    if (!b) continue;
    for (const c of prog.read) m += readingMinutes(b, c, c);
  }
  return m;
}

/** Próximo capítulo não lido (a partir do último acessado). */
export function nextChapter(p: Profile, book: Book): number {
  const prog = p.progress[book.id];
  if (!prog) return 1;
  const s = new Set(prog.read);
  for (let c = prog.lastChapter; c <= book.chapters; c++) if (!s.has(c)) return c;
  for (let c = 1; c <= book.chapters; c++) if (!s.has(c)) return c;
  return 1;
}

export function continueWatching(p: Profile): Book[] {
  return Object.entries(p.progress)
    .filter(([id, prog]) => {
      const b = getBook(id);
      return b && prog.read.length < b.chapters && (prog.read.length > 0 || prog.updatedAt > 0);
    })
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id]) => getBook(id)!)
    .filter(Boolean);
}

export function streak(p: Profile): { current: number; best: number } {
  const days = Object.keys(p.activity).filter((d) => p.activity[d] > 0).sort();
  if (!days.length) return { current: 0, best: 0 };
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = new Date(d + 'T12:00:00').getTime();
    run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  let current = 0;
  const cursor = new Date();
  if (!set.has(today(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(today(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, best };
}

export function testamentPercent(p: Profile, t: 'AT' | 'NT'): number {
  const books = BOOKS.filter((b) => b.testament === t);
  const total = books.reduce((s, b) => s + b.chapters, 0);
  const read = books.reduce((s, b) => s + (p.progress[b.id]?.read.length ?? 0), 0);
  return read / total;
}

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  earned: boolean;
}

export function badges(p: Profile): Badge[] {
  const read = totalRead(p);
  const done = completedBooks(p);
  const st = streak(p);
  const has = (id: string) => done.some((b) => b.id === id);
  const gospels = ['mt', 'mc', 'lc', 'jo'].every(has);
  const penta = ['gn', 'ex', 'lv', 'nm', 'dt'].every(has);
  const paul = BOOKS.filter((b) => b.group === 'Cartas Paulinas').every((b) => has(b.id));
  return [
    { id: 'first', icon: 'play', title: 'Primeiro episódio', desc: 'Leia seu primeiro capítulo', earned: read >= 1 },
    { id: 'ten', icon: 'flame', title: 'Esquentando', desc: '10 capítulos lidos', earned: read >= 10 },
    { id: 'hundred', icon: 'star', title: 'Maratonista', desc: '100 capítulos lidos', earned: read >= 100 },
    { id: 'book', icon: 'check', title: 'Primeira temporada', desc: 'Conclua um livro inteiro', earned: done.length >= 1 },
    { id: 'streak7', icon: 'calendar', title: 'Uma semana firme', desc: '7 dias seguidos de leitura', earned: st.best >= 7 },
    { id: 'streak30', icon: 'trophy', title: 'Hábito formado', desc: '30 dias seguidos de leitura', earned: st.best >= 30 },
    { id: 'gospels', icon: 'dove', title: 'Os Quatro Evangelhos', desc: 'Mateus, Marcos, Lucas e João', earned: gospels },
    { id: 'penta', icon: 'tablets', title: 'Torá completa', desc: 'Conclua o Pentateuco', earned: penta },
    { id: 'paul', icon: 'letter', title: 'Correspondência de Paulo', desc: 'Todas as cartas paulinas', earned: paul },
    { id: 'dev', icon: 'pen', title: 'Crítico devocional', desc: 'Escreva 5 devocionais', earned: p.devotionals.length >= 5 },
    { id: 'half', icon: 'half', title: 'Meio caminho', desc: '50% da Bíblia', earned: read >= TOTAL_CHAPTERS / 2 },
    { id: 'all', icon: 'crown', title: 'Bíblia completa', desc: 'Todos os 1.189 capítulos', earned: read >= TOTAL_CHAPTERS },
  ];
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export function pct(n: number): string {
  const v = n * 100;
  return `${v > 0 && v < 1 ? v.toFixed(1) : Math.round(v)}%`;
}
