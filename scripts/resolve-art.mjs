// Resolve as buscas de src/data/artQueries.ts em obras reais do Wikimedia Commons
// e grava src/data/artManifest.json (+ scripts/art-report.md para revisão).
// Uso: node --experimental-strip-types scripts/resolve-art.mjs
import { writeFileSync } from 'node:fs';
import { BOOK_ART, EPISODE_ART } from '../src/data/artQueries.ts';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'BibliaFlixArtResolver/1.0 (https://github.com/LordRavenclaw32/B-blia-Maratona)';
const OK_MIME = /^image\/(jpeg|png|tiff|webp)$/;
const BAD_TITLE = /statue|sculpture|relief|stamp|coin|\bmap\b|logo|diagram|\.pdf|\.djvu|\.svg|DSC_?\d|IMG_\d|photograph|church of|cathedral|basilica|tomb of|grave/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();

const strip = (html = '') =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function search(q) {
  if (cache.has(q)) return cache.get(q);
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '15',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '960',
    iiextmetadatafilter: 'Artist|LicenseShortName|ObjectName|DateTimeOriginal',
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const pages = (data.query?.pages ?? []).sort((a, b) => a.index - b.index);
      const out = pages
        .map((p) => ({ p, ii: p.imageinfo?.[0] }))
        .filter(({ p, ii }) => ii && OK_MIME.test(ii.mime) && ii.width >= 700 && ii.height >= 450 && !BAD_TITLE.test(p.title))
        .filter(({ ii }) => ii.width / ii.height > 0.45 && ii.width / ii.height < 2.8)
        .filter(({ ii }) => /public domain|^pd|cc0|cc[- ]by/i.test(ii.extmetadata?.LicenseShortName?.value ?? ''))
        .map(({ p, ii }) => {
          const md = ii.extmetadata ?? {};
          const file = p.title.replace(/^File:/, '');
          const name = strip(md.ObjectName?.value) || file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ');
          return {
            f: file,
            t: ii.thumburl,
            u: ii.url,
            w: ii.width,
            h: ii.height,
            a: strip(md.Artist?.value).slice(0, 90),
            l: strip(md.LicenseShortName?.value),
            n: name.slice(0, 120),
            d: ii.descriptionurl,
          };
        });
      cache.set(q, out);
      await sleep(120);
      return out;
    } catch (e) {
      await sleep(1500 * (attempt + 1));
      if (attempt === 3) {
        console.warn('falha', q, e.message);
        return [];
      }
    }
  }
  return [];
}

async function resolve(queries, used) {
  for (const q of queries) {
    const hits = await search(q);
    const pick = hits.find((h) => !used.has(h.f));
    if (pick) {
      used.add(pick.f);
      return { ...pick, q };
    }
  }
  return null;
}

const manifest = { generatedAt: new Date().toISOString(), books: {}, episodes: {} };
const report = ['# Relatório de arte (Wikimedia Commons)', ''];
let missing = 0;

for (const [id, queries] of Object.entries(BOOK_ART)) {
  const used = new Set();
  const book = await resolve(queries, used);
  if (book) manifest.books[id] = book;
  else missing++;
  report.push(`## ${id}`, `- **livro**: ${book ? `${book.n} — ${book.a} \`${book.q}\`` : '❌ sem resultado'}`);
  const eps = EPISODE_ART[id] ?? [];
  for (let i = 0; i < eps.length; i++) {
    const ep = await resolve([...eps[i], ...queries], used);
    if (ep) manifest.episodes[`${id}:${i + 1}`] = ep;
    else missing++;
    report.push(`- E${i + 1}: ${ep ? `${ep.n} — ${ep.a} \`${ep.q}\`` : '❌ sem resultado'}`);
  }
  console.log(id, 'ok');
}

writeFileSync(new URL('../src/data/artManifest.json', import.meta.url), JSON.stringify(manifest));
report.splice(1, 0, `Itens sem imagem: ${missing}`, '');
writeFileSync(new URL('./art-report.md', import.meta.url), report.join('\n') + '\n');
console.log('itens sem imagem:', missing);
