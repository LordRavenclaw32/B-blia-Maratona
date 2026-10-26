// Resolve as buscas de src/data/artQueries.ts em obras reais do Wikimedia Commons
// e grava src/data/artManifest.json (+ scripts/art-report.md para revisão).
// Uso: node --experimental-strip-types scripts/resolve-art.mjs
import { writeFileSync } from 'node:fs';
import { BOOK_ART, EPISODE_ART } from '../src/data/artQueries.ts';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'BibliaFlixArtResolver/1.0 (https://github.com/LordRavenclaw32/B-blia-Maratona)';
const OK_MIME = /^image\/(jpeg|png|tiff|webp)$/;
const BAD_TITLE = /geograph|stained glass|railway|station|baptist church|cylinder|statue|sculpture|relief|stamp|coin|\bmap\b|logo|diagram|\.pdf|\.djvu|\.svg|DSC_?\d|IMG_\d|photograph|church of|cathedral|basilica|tomb of|grave/i;
const BIBLE = /bible|biblical|testament|prophet|christ|jesus|apostle|saint|gospel|tissot|dor[ée]|psalm|psalter|religious|christian|evangelist|moses|abraham|isaac|jacob|joseph|david|solomon|samson|elijah|elisha|daniel|jonah|isaiah|jeremiah|ezekiel|madonna|angel|scripture|israelite|hebrew|jewish|judaism|eden|paradise|apocalypse|revelation|nativity|crucifixion|resurrection|last supper|last judg|annunciation|magi|lazarus|pentecost|noah|deluge|babel|exodus|pharaoh|sinai|jericho|ruth|esther|job|habakkuk|zechariah|amos|hosea|micah|nahum|joel|malachi|haggai|obadiah|zephaniah|nehemiah|ezra|lamentations|song of songs|song of solomon|sistine|icons of|vanitas|nineveh|assyria/i;
const BAD_ARTIST = /photo was taken|feel free to use|nasa|hubble/i;
const BAD_CAT = /stained glass|church interiors|interiors of churches|aerial photographs|maps of|buildings in|exteriors of|streets in|photographs by/i;
const STOP = new Set(['painting', 'paintings', 'the', 'of', 'and', 'in', 'a', 'an', 'at', 'on', 'to', 'by', 'his', 'her', 'with', 'from', 'icon', 'drawing', 'saint', 'st', 'prophet', 'king', 'tissot', 'dore', 'doré', 'holy', 'bible', 'plate']);
const norm = (t = '') => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ARTISTS = /tissot|dore|rembrandt|caravaggio|michelangelo|rubens|raphael|poussin|bruegel|brueghel|blake|martin|leonardo|vinci|giotto|greco|bloch|hunt|aivazovsky|repin|cranach|delacroix|honthorst|schnorr|calderon|hayez|poynter|leighton|turner|domenichino|valentin|lievens|ribera|cole|friedrich|moreau|rossetti|tanner|bonnat|fra angelico|angelico|lastman|gogh|veronese|ciseri|ford madox brown|durer|dürer|vasnetsov|eyck|church|alma-tadema|claesz|steenwijck|grebber|roberts|bendemann|hicks|champaigne|memling|perugino|ghirlandaio|masaccio|gauguin|cornelius|piero/i;

/** Termos relevantes da busca (sem nomes de artistas e palavras genéricas). */
function keywords(q) {
  return norm(q)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w) && !ARTISTS.test(w));
}

/** Limpa nomes do Commons: prefere o rótulo em inglês e remove marcações "label QS:". */
function cleanName(raw, file) {
  const en = raw.match(/(?:title|label) QS:(?:P1476,)?(?:L)?en(?:-[a-z]+)?:?,?"\s*([^"]+?)\s*"/);
  if (en) return en[1];
  let n = raw.replace(/(?:title|label) QS:[^"]*"[^"]*"/g, '').replace(/^[A-Z][a-z]+(?: [A-Z][a-z]+)?:\s*/, '').trim();
  if (!n) n = file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ');
  return n.replace(/\s+/g, ' ').trim();
}

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
    iiextmetadatafilter: 'Artist|LicenseShortName|ObjectName|DateTimeOriginal|Categories',
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
          const rawName = strip(md.ObjectName?.value);
          const name = cleanName(rawName, file);
          const cats = md.Categories?.value ?? '';
          const artist = strip(md.Artist?.value).slice(0, 90);
          const year = Number((strip(md.DateTimeOriginal?.value).match(/\b(1[0-9]{3})\b/) ?? [])[1] ?? 0);
          return { file, name, rawName, cats, artist, year, ii };
        })
        .filter(({ artist, cats, year }) => !BAD_ARTIST.test(artist) && !BAD_CAT.test(cats) && !(year >= 1930))
        .filter(({ file, rawName, cats, artist }) => BIBLE.test(`${file} ${rawName} ${cats} ${artist}`))
        .filter(({ file, rawName }) => {
          const kw = keywords(q);
          if (!kw.length) return true;
          const hay = norm(`${file} ${rawName}`);
          return kw.some((w) => hay.includes(w));
        })
        .map(({ file, name, artist, ii }) => ({
          f: file,
          t: ii.thumburl,
          u: ii.url,
          w: ii.width,
          h: ii.height,
          a: artist,
          l: strip(ii.extmetadata?.LicenseShortName?.value),
          n: name.slice(0, 110),
          d: ii.descriptionurl,
        }));
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

const workKey = (h) => `${norm(h.n).replace(/[^a-z]/g, '').slice(0, 28)}|${norm(h.a).replace(/[^a-z]/g, '').slice(0, 12)}`;

async function resolve(queries, used) {
  for (const q of queries) {
    const hits = await search(q);
    const pick = hits.find((h) => !used.has(h.f) && !used.has(workKey(h)));
    if (pick) {
      used.add(pick.f);
      used.add(workKey(pick));
      return { ...pick, q };
    }
  }
  return null;
}

const manifest = { generatedAt: new Date().toISOString(), books: {}, episodes: {} };
const report = ['# Relatório de arte (Wikimedia Commons)', ''];
let missing = 0;

const usedBooks = new Set();
const NT_LETTERS = new Set(['rm', '1co', '2co', 'gl', 'ef', 'fp', 'cl', '1ts', '2ts', '1tm', '2tm', 'tt', 'fm', 'hb', 'tg', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd']);
const OT_PROPHETS = new Set(['is', 'jr', 'lm', 'ez', 'dn', 'os', 'jl', 'am', 'ob', 'jn', 'mq', 'na', 'hc', 'sf', 'ag', 'zc', 'ml']);

for (const [id, queries0] of Object.entries(BOOK_ART)) {
  const generic = NT_LETTERS.has(id)
    ? ['Apostle Paul painting Rembrandt', 'Saint Paul writing epistles', 'Apostles painting']
    : OT_PROPHETS.has(id)
      ? ['Doré prophet', 'Tissot Drawing prophet', 'Old Testament prophet painting']
      : ['Tissot Drawing', 'Doré Holy Bible Plate'];
  const queries = [...queries0, ...generic];
  const used = new Set();
  let book = await resolve(queries0, usedBooks);
  book ??= await resolve(queries, new Set());
  if (book) {
    used.add(book.f);
    used.add(workKey(book));
  }
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
