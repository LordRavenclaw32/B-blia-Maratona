import { BOOKS, TOTAL_CHAPTERS, type Book, type Episode } from '../data/books';
import { artUrl, avatarUrl } from './art';
import type { Devotional, Profile } from './store';
import { bookPercent, completedBooks, overallPercent, pct, streak, totalRead } from './stats';

export type ShareKind = 'book' | 'overall' | 'devotional' | 'verse' | 'episode';
export type ShareFormat = 'story' | 'post';

export interface ShareInput {
  kind: ShareKind;
  format: ShareFormat;
  profile: Profile;
  book?: Book;
  episode?: Episode;
  devotional?: Devotional;
  verse?: { ref: string; text: string; version: string };
}

const RED = '#e50914';

export function cleanVerse(t: string): string {
  return t.trim().replace(/^["“”']+|["“”']+$/g, '').trim();
}
const DISPLAY = '"Bebas Neue", Impact, "Arial Narrow", sans-serif';
const SANS = 'Inter, "Segoe UI", Roboto, Arial, sans-serif';
const SERIF = '"Merriweather", Georgia, "Times New Roman", serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`400 100px "Bebas Neue"`),
      document.fonts.load(`400 40px Inter`),
      document.fonts.load(`700 40px Inter`),
      document.fonts.load(`400 40px Merriweather`),
      document.fonts.load(`italic 400 40px Merriweather`),
    ]);
  } catch {
    /* fontes do sistema serão usadas */
  }
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxW: number): string[] {
  if (lines.length <= max) return lines;
  const cut = lines.slice(0, max);
  let last = cut[max - 1];
  while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
  cut[max - 1] = last.replace(/[\s,.;:]+$/, '') + '…';
  return cut;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign = 'left') {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = RED;
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 12;
  ctx.fillText('MARATONA', x, y);
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${size * 0.26}px ${SANS}`;
  ctx.letterSpacing = `${size * 0.12}px`;
  ctx.fillText('BÍBLICA', align === 'left' ? x + 4 : x, y + size * 0.36);
  ctx.restore();
}

function progressBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number) {
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (p > 0) {
    ctx.fillStyle = RED;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, p)), h, h / 2);
    ctx.fill();
  }
}

function stat(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, label: string, scale: number) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `400 ${86 * scale}px ${DISPLAY}`;
  ctx.fillText(value, x, y);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = `500 ${24 * scale}px ${SANS}`;
  ctx.fillText(label.toUpperCase(), x, y + 40 * scale);
}

function stars(ctx: CanvasRenderingContext2D, cx: number, y: number, n: number, size: number) {
  const gap = size * 1.25;
  const start = cx - (gap * 4) / 2;
  for (let i = 0; i < 5; i++) {
    const x = start + i * gap;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? size * 0.22 : size * 0.5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = i < n ? '#ffc94a' : 'rgba(255,255,255,.25)';
    ctx.fill();
  }
}

export async function renderShareImage(input: ShareInput): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const W = 1080;
  const H = input.format === 'story' ? 1920 : 1080;
  const story = input.format === 'story';
  const s = story ? 1 : 0.8;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, W, H);

  const { profile } = input;
  const book = input.book ?? (input.devotional ? BOOKS.find((b) => b.id === input.devotional!.bookId) : undefined);
  const pad = 80 * s;

  // ── fundo ──
  if (input.kind === 'overall') {
    const posters = await Promise.all(BOOKS.map((b) => loadImage(artUrl(b, 'poster'))));
    const cols = story ? 6 : 8;
    const pw = W / cols;
    const ph = pw * 1.5;
    const rows = Math.ceil(H / ph) + 1;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const b = BOOKS[i % BOOKS.length];
        const img = posters[i % BOOKS.length];
        ctx.globalAlpha = bookPercent(profile, b) >= 1 ? 0.95 : bookPercent(profile, b) > 0 ? 0.6 : 0.22;
        ctx.drawImage(img, c * pw, r * ph - (c % 2 ? ph / 2 : 0), pw - 4, ph - 4);
        i++;
      }
    }
    ctx.globalAlpha = 1;
  } else if (book) {
    const img = await loadImage(artUrl(book, story ? 'poster' : 'backdrop'));
    cover(ctx, img, 0, 0, W, story ? H * 0.72 : H);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (input.kind === 'overall') {
    grad.addColorStop(0, 'rgba(0,0,0,.55)');
    grad.addColorStop(0.35, 'rgba(0,0,0,.75)');
    grad.addColorStop(1, 'rgba(0,0,0,.96)');
  } else {
    grad.addColorStop(0, 'rgba(0,0,0,.45)');
    grad.addColorStop(story ? 0.3 : 0.2, 'rgba(0,0,0,.05)');
    grad.addColorStop(story ? 0.62 : 0.55, 'rgba(0,0,0,.85)');
    grad.addColorStop(1, '#000');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  logo(ctx, pad, pad + 70 * s, 92 * s);

  // badge "série"
  const top = pad + 70 * s;
  if (book && input.kind !== 'overall') {
    ctx.font = `700 ${24 * s}px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText(`${book.testament === 'AT' ? 'ANTIGO' : 'NOVO'} TESTAMENTO`, W - pad, top - 30 * s);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `500 ${22 * s}px ${SANS}`;
    ctx.fillText(book.group.toUpperCase(), W - pad, top + 4 * s);
  }

  const st = streak(profile);
  const read = totalRead(profile);
  const maxW = W - pad * 2;
  let y = story ? H * 0.6 : H * 0.42;

  const kicker = (txt: string) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = RED;
    ctx.font = `800 ${30 * s}px ${SANS}`;
    ctx.letterSpacing = `${4 * s}px`;
    ctx.fillText(txt, pad, y);
    ctx.letterSpacing = '0px';
    y += 20 * s;
  };
  const bigTitle = (txt: string, size = 170) => {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    let fs = size * s;
    ctx.font = `400 ${fs}px ${DISPLAY}`;
    while (ctx.measureText(txt.toUpperCase()).width > maxW && fs > 60) {
      fs -= 6;
      ctx.font = `400 ${fs}px ${DISPLAY}`;
    }
    y += fs * 0.82;
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 20;
    ctx.fillText(txt.toUpperCase(), pad - 4, y);
    ctx.shadowBlur = 0;
    y += 24 * s;
  };

  if (input.kind === 'book' && book) {
    const p = bookPercent(profile, book);
    const done = profile.progress[book.id]?.read.length ?? 0;
    kicker(p >= 1 ? 'TEMPORADA CONCLUÍDA' : 'ESTOU MARATONANDO');
    bigTitle(book.name);
    ctx.font = `italic 400 ${34 * s}px ${SERIF}`;
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    for (const l of clampLines(ctx, wrap(ctx, `“${book.tagline}”`, maxW), 2, maxW)) {
      y += 44 * s;
      ctx.fillText(l, pad, y);
    }
    y += 60 * s;
    progressBar(ctx, pad, y, maxW, 18 * s, p);
    y += 62 * s;
    ctx.font = `600 ${30 * s}px ${SANS}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`${done} de ${book.chapters} capítulos`, pad, y);
    ctx.textAlign = 'right';
    ctx.fillText(pct(p), W - pad, y);
    ctx.textAlign = 'left';
    if (input.episode) {
      y += 50 * s;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = `500 ${26 * s}px ${SANS}`;
      ctx.fillText(`Episódio ${input.episode.n} · ${input.episode.title}`, pad, y);
    }
  } else if (input.kind === 'episode' && book && input.episode) {
    kicker('EPISÓDIO CONCLUÍDO ✓');
    bigTitle(input.episode.title, 130);
    ctx.font = `600 ${32 * s}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    y += 20 * s;
    ctx.fillText(`${book.name} · E${input.episode.n} · ${input.episode.start === input.episode.end ? `Cap. ${input.episode.start}` : `Caps. ${input.episode.start}–${input.episode.end}`}`, pad, y);
    ctx.font = `400 ${30 * s}px ${SERIF}`;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (const l of clampLines(ctx, wrap(ctx, input.episode.synopsis, maxW), 3, maxW)) {
      y += 46 * s;
      ctx.fillText(l, pad, y);
    }
    y += 56 * s;
    progressBar(ctx, pad, y, maxW, 16 * s, bookPercent(profile, book));
    y += 50 * s;
    ctx.font = `500 ${26 * s}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(`${pct(bookPercent(profile, book))} da série ${book.name}`, pad, y);
  } else if (input.kind === 'overall') {
    y = story ? 380 : 300;
    kicker('MINHA MARATONA BÍBLICA');
    // anel de progresso
    const cx = W / 2;
    const cy = y + (story ? 330 : 230) * s;
    const R = (story ? 250 : 190) * s;
    ctx.lineWidth = 34 * s;
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.005, overallPercent(profile)));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `400 ${(story ? 190 : 150) * s}px ${DISPLAY}`;
    ctx.fillText(pct(overallPercent(profile)), cx, cy + 50 * s);
    ctx.font = `600 ${26 * s}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText('DA BÍBLIA LIDA', cx, cy + 100 * s);
    y = cy + R + 140 * s;
    const colW = maxW / 3;
    stat(ctx, pad + colW / 2, y, `${read}`, `de ${TOTAL_CHAPTERS} caps.`, s);
    stat(ctx, pad + colW * 1.5, y, `${completedBooks(profile).length}`, 'livros concluídos', s);
    stat(ctx, pad + colW * 2.5, y, `${st.current}`, st.current === 1 ? 'dia seguido' : 'dias seguidos', s);
    if (story) {
      const going = BOOKS.filter((b) => (profile.progress[b.id]?.read.length ?? 0) > 0)
        .sort((a, b) => (profile.progress[b.id]?.updatedAt ?? 0) - (profile.progress[a.id]?.updatedAt ?? 0))
        .slice(0, 4);
      if (going.length) {
        y += 130;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = `700 24px ${SANS}`;
        ctx.fillText('SÉRIES EM ANDAMENTO', pad, y);
        const thumbs = await Promise.all(going.map((b) => loadImage(artUrl(b, 'thumb'))));
        going.forEach((b, i) => {
          const ry = y + 30 + i * 120;
          ctx.save();
          roundRect(ctx, pad, ry, 170, 96, 8);
          ctx.clip();
          ctx.drawImage(thumbs[i], pad, ry, 170, 96);
          ctx.restore();
          ctx.fillStyle = '#fff';
          ctx.font = `400 48px ${DISPLAY}`;
          ctx.fillText(b.name.toUpperCase(), pad + 200, ry + 46);
          progressBar(ctx, pad + 200, ry + 66, maxW - 330, 12, bookPercent(profile, b));
          ctx.textAlign = 'right';
          ctx.fillStyle = '#fff';
          ctx.font = `700 28px ${SANS}`;
          ctx.fillText(pct(bookPercent(profile, b)), W - pad, ry + 78);
          ctx.textAlign = 'left';
        });
      }
    }
  } else if (input.kind === 'devotional' && input.devotional) {
    const d = input.devotional;
    y = story ? H * 0.42 : H * 0.3;
    kicker('MINHA DEVOCIONAL');
    bigTitle(d.title || 'Devocional', 110);
    stars(ctx, pad + 130 * s, y + 10 * s, d.rating, 46 * s);
    if (book) {
      ctx.textAlign = 'right';
      ctx.font = `600 ${28 * s}px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(d.episode ? `${book.name} · E${d.episode}` : book.name, W - pad, y + 20 * s);
      ctx.textAlign = 'left';
    }
    y += 90 * s;
    const dfs = (story ? 40 : 34) * s;
    ctx.font = `400 ${dfs}px ${SERIF}`;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    const lines = clampLines(ctx, wrap(ctx, d.text, maxW), story ? 15 : 6, maxW);
    for (const l of lines) {
      ctx.fillText(l, pad, y);
      y += dfs * 1.55;
    }
    if (d.verse) {
      y += 20 * s;
      ctx.fillStyle = RED;
      ctx.font = `700 ${28 * s}px ${SANS}`;
      ctx.fillText(d.verse, pad, y);
    }
  } else if (input.kind === 'verse' && input.verse) {
    const v = { ...input.verse, text: cleanVerse(input.verse.text) };
    let fs = (story ? 62 : 46) * s;
    ctx.font = `400 ${fs}px ${SERIF}`;
    let lines = wrap(ctx, v.text, maxW);
    const limit = story ? 14 : 7;
    while (lines.length > limit && fs > 28) {
      fs -= 3;
      ctx.font = `400 ${fs}px ${SERIF}`;
      lines = wrap(ctx, v.text, maxW);
    }
    lines = clampLines(ctx, lines, limit, maxW);
    const blockH = 110 * s + lines.length * fs * 1.45 + 180 * s;
    y = Math.max(story ? H * 0.34 : H * 0.2, (H - blockH) / 2 + (story ? 120 : 20) * s);
    ctx.fillStyle = RED;
    ctx.font = `400 ${200 * s}px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText('“', pad - 10, y + 60 * s);
    y += 110 * s;
    ctx.font = `400 ${fs}px ${SERIF}`;
    ctx.fillStyle = '#fff';
    for (const l of lines) {
      ctx.fillText(l, pad, y);
      y += fs * 1.45;
    }
    y += 30 * s;
    ctx.fillStyle = RED;
    ctx.fillRect(pad, y - 8 * s, 70 * s, 6 * s);
    y += 50 * s;
    ctx.fillStyle = '#fff';
    ctx.font = `400 ${64 * s}px ${DISPLAY}`;
    ctx.fillText(v.ref.toUpperCase(), pad, y);
    ctx.font = `600 ${24 * s}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillText(v.version, pad, y + 40 * s);
  }

  // ── rodapé ──
  const fy = H - pad - 30 * s;
  const av = await loadImage(avatarUrl(profile.avatar));
  const as = 84 * s;
  ctx.save();
  roundRect(ctx, pad, fy - as / 2 - 10 * s, as, as, 10 * s);
  ctx.clip();
  ctx.drawImage(av, pad, fy - as / 2 - 10 * s, as, as);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${30 * s}px ${SANS}`;
  ctx.fillText(profile.name, pad + as + 24 * s, fy - 16 * s);
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = `500 ${24 * s}px ${SANS}`;
  ctx.fillText(
    input.kind === 'overall' || st.current < 2 ? 'Maratone a Bíblia comigo' : `🔥 ${st.current} dias seguidos · ${read} capítulos`,
    pad + as + 24 * s,
    fy + 20 * s,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = `500 ${22 * s}px ${SANS}`;
  ctx.fillText(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }), W - pad, fy + 20 * s);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/png'));
}

export function shareText(input: ShareInput): string {
  const { profile } = input;
  const book = input.book;
  const url = location.href.split('#')[0];
  switch (input.kind) {
    case 'book':
      return book
        ? `Estou maratonando ${book.name} na Maratona Bíblica: ${profile.progress[book.id]?.read.length ?? 0}/${book.chapters} capítulos (${pct(bookPercent(profile, book))}). Bora maratonar junto? ${url}`
        : url;
    case 'episode':
      return book && input.episode
        ? `Acabei de concluir o episódio "${input.episode.title}" de ${book.name} (E${input.episode.n}). ${url}`
        : url;
    case 'overall':
      return `Já li ${totalRead(profile)} de ${TOTAL_CHAPTERS} capítulos da Bíblia (${pct(overallPercent(profile))}) na Maratona Bíblica! ${url}`;
    case 'devotional':
      return input.devotional ? `${input.devotional.title}\n\n${input.devotional.text}\n\n${input.devotional.verse ?? ''}`.trim() : url;
    case 'verse':
      return input.verse ? `“${cleanVerse(input.verse.text)}” — ${input.verse.ref} (${input.verse.version})` : url;
  }
}
