import { useMemo } from 'react';
import { BOOKS, episodeOfChapter, normalize, type Book } from '../data/books';
import { artUrl } from '../lib/art';
import { navigate, useRoute } from '../lib/router';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

const ALIASES: Record<string, string> = {
  genesis: 'gn', gen: 'gn', exodo: 'ex', exo: 'ex', levitico: 'lv', lev: 'lv', numeros: 'nm', num: 'nm', deuteronomio: 'dt', deut: 'dt',
  josue: 'js', juizes: 'jz', rute: 'rt', job: 'job', jo: 'jo', salmo: 'sl', salmos: 'sl', sal: 'sl', proverbios: 'pv', prov: 'pv',
  eclesiastes: 'ec', canticos: 'ct', cantares: 'ct', isaias: 'is', jeremias: 'jr', lamentacoes: 'lm', ezequiel: 'ez', daniel: 'dn',
  oseias: 'os', joel: 'jl', amos: 'am', obadias: 'ob', jonas: 'jn', miqueias: 'mq', naum: 'na', habacuque: 'hc', sofonias: 'sf',
  ageu: 'ag', zacarias: 'zc', malaquias: 'ml', mateus: 'mt', marcos: 'mc', lucas: 'lc', joao: 'jo', atos: 'at', romanos: 'rm',
  galatas: 'gl', efesios: 'ef', filipenses: 'fp', colossenses: 'cl', tito: 'tt', filemom: 'fm', hebreus: 'hb', tiago: 'tg',
  judas: 'jd', apocalipse: 'ap', ap: 'ap',
};

/** Interpreta referências como "Jo 3:16", "1 Samuel 17", "salmos 23". */
function parseRef(q: string): { book: Book; chapter: number; verse?: number } | null {
  const m = normalize(q).match(/^([1-3]?\s*[a-z]+)\.?\s*(\d+)?(?:[:.,](\d+))?/);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '');
  const num = raw.match(/^[1-3]/)?.[0] ?? '';
  const word = raw.replace(/^[1-3]/, '');
  let book: Book | undefined;
  if (raw === 'jo') book = BOOKS.find((b) => b.id === (q.trim().toLowerCase().startsWith('jó') ? 'job' : 'jo'));
  book ??= BOOKS.find((b) => normalize(b.abbrev) === raw || b.id === raw);
  book ??= ALIASES[raw] ? BOOKS.find((b) => b.id === ALIASES[raw]) : undefined;
  book ??= BOOKS.find((b) => normalize(b.name).replace(/\s+/g, '') === raw);
  book ??= word.length >= 3 ? BOOKS.find((b) => normalize(b.name).replace(/\s+/g, '').startsWith(raw) || (num && normalize(b.name).startsWith(num + ' ' + word))) : undefined;
  if (!book) return null;
  const chapter = Math.min(Math.max(1, Number(m[2] ?? 1)), book.chapters);
  return { book, chapter, verse: m[3] ? Number(m[3]) : undefined };
}

export function Search() {
  const route = useRoute();
  const q = route.query.get('q') ?? '';
  const nq = normalize(q);

  const { books, episodes, ref } = useMemo(() => {
    if (!nq) return { books: [] as Book[], episodes: [] as { book: Book; n: number }[], ref: null };
    const books = BOOKS.filter((b) =>
      [b.name, b.author, b.group, b.tagline, b.synopsis, ...b.tags].some((x) => normalize(x).includes(nq)),
    ).sort((a, b) => Number(!normalize(a.name).includes(nq)) - Number(!normalize(b.name).includes(nq)));
    const episodes: { book: Book; n: number }[] = [];
    for (const b of BOOKS) for (const e of b.episodes) if (normalize(e.title).includes(nq) || normalize(e.synopsis).includes(nq)) episodes.push({ book: b, n: e.n });
    const r = parseRef(q);
    const ref = r && (/\d/.test(q) || normalize(r.book.name).startsWith(nq)) ? r : null;
    return { books, episodes: episodes.slice(0, 24), ref };
  }, [nq, q]);

  return (
    <main className="page">
      <div className="search-mobile">
        <Icon name="search" />
        <input
          autoFocus
          value={q}
          onChange={(e) => navigate(`/search?q=${encodeURIComponent(e.target.value)}`, true)}
          placeholder="Buscar livros, episódios ou Jo 3:16"
          aria-label="Buscar"
        />
      </div>
      {!q && (
        <>
          <h1 className="page-title">Explorar</h1>
          <div className="grid">
            {BOOKS.map((b) => (
              <Card key={b.id} book={b} />
            ))}
          </div>
        </>
      )}
      {q && (
        <>
          {ref && (
            <button className="ref-jump" onClick={() => navigate(`/read/${ref.book.id}/${ref.chapter}`)}>
              <img src={artUrl(ref.book, 'thumb', episodeOfChapter(ref.book, ref.chapter).n)} alt="" />
              <span>
                <span className="kick">Ir direto para</span>
                <b>
                  {ref.book.name} {ref.chapter}
                  {ref.verse ? `:${ref.verse}` : ''}
                </b>
                <small>
                  Episódio {episodeOfChapter(ref.book, ref.chapter).n} · {episodeOfChapter(ref.book, ref.chapter).title}
                </small>
              </span>
              <Icon name="play" size={30} />
            </button>
          )}
          <h1 className="page-title sm">Séries</h1>
          {books.length ? (
            <div className="grid">
              {books.map((b) => (
                <Card key={b.id} book={b} />
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum livro encontrado para “{q}”.</p>
          )}
          {episodes.length > 0 && (
            <>
              <h1 className="page-title sm">Episódios</h1>
              <div className="ep-results">
                {episodes.map(({ book, n }) => {
                  const e = book.episodes[n - 1];
                  return (
                    <button key={`${book.id}${n}`} className="ep-result" onClick={() => navigate(`/read/${book.id}/${e.start}`)}>
                      <img src={artUrl(book, 'thumb', n)} alt="" loading="lazy" />
                      <span>
                        <small>
                          {book.name} · E{n}
                        </small>
                        <b>{e.title}</b>
                        <span>{e.synopsis}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
