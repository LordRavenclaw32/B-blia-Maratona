import { useMemo } from 'react';
import { BOOKS, GROUP_ROWS, TOP10, getBook, type Book, type Testament } from '../data/books';
import { Hero } from '../components/Hero';
import { Row } from '../components/Row';
import { completedBooks, continueWatching } from '../lib/stats';
import { useProfile } from '../lib/store';
import { BOOKS_WITH_CUSTOM_ART } from '../lib/paintings';
import { CUSTOM_ART } from '../data/customArt';

const ORIGINALS = ['gn', 'ex', 'js', 'rt', '1sm', 'et', 'dn', 'jn', 'mt', 'jo', 'at', 'ap'];

function dayIndex() {
  const d = new Date();
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
}

export function Browse({ testament }: { testament?: Testament }) {
  const profile = useProfile();
  const inT = (b: Book) => !testament || b.testament === testament;

  const cont = continueWatching(profile).filter(inT);
  const list = profile.myList.map((id) => getBook(id)!).filter((b) => b && inT(b));
  const done = completedBooks(profile).filter(inT);

  const hero = useMemo(() => {
    if (cont[0]) return { book: cont[0], kicker: undefined as string | undefined };
    const featured = BOOKS.filter((b) => inT(b) && BOOKS_WITH_CUSTOM_ART.has(b.id) && (b.id in CUSTOM_ART));
    const pool = featured.length ? featured : BOOKS.filter(inT);
    const pick = pool[dayIndex() % pool.length];
    const rank = TOP10.indexOf(pick.id);
    return { book: pick, kicker: rank >= 0 ? `Nº ${rank + 1} entre os livros mais lidos` : undefined };
  }, [testament, cont[0]?.id]);

  const last = cont[0];
  const because = last ? BOOKS.filter((b) => b.group === last.group && b.id !== last.id && inT(b)) : [];
  const shorts = BOOKS.filter((b) => b.chapters <= 5 && inT(b));
  const top10 = TOP10.map((id) => getBook(id)!).filter(inT);
  const originals = ORIGINALS.map((id) => getBook(id)!).filter(inT);

  return (
    <main className="browse">
      <Hero book={hero.book} kicker={hero.kicker} />
      <div className="rows">
        <Row title={`Continuar lendo como ${profile.name}`} books={cont} variant="continue" />
        <Row title="Minha lista" books={list} />
        {top10.length >= 5 && <Row title={testament ? `Top ${top10.length} ${testament === 'AT' ? 'do Antigo' : 'do Novo'} Testamento` : 'Top 10 livros mais lidos'} books={top10} variant="top10" />}
        <Row title="Originais Maratona · Grandes épicos" books={originals} variant="poster" />
        {because.length > 0 && <Row title={`Porque você está lendo ${last!.name}`} books={because} />}
        {GROUP_ROWS.map((g) => {
          const groups = Array.isArray(g.group) ? g.group : [g.group];
          const books = BOOKS.filter((b) => groups.includes(b.group) && inT(b));
          return <Row key={g.title} title={g.title} books={books} />;
        })}
        <Row title="Minisséries · Leia numa sentada" books={shorts} />
        <Row title="Ler novamente" books={done} />
      </div>
    </main>
  );
}
