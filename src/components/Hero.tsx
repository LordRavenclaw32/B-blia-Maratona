import { episodeOfChapter, type Book } from '../data/books';
import { Art } from './Art';
import { imageUrl } from '../lib/paintings';
import { bookPercent, nextChapter, pct } from '../lib/stats';
import { useProfile, useStore } from '../lib/store';
import { Badge, openTitle, playBook } from './Card';
import { Icon } from './Icon';

export function Hero({ book, kicker }: { book: Book; kicker?: string }) {
  const profile = useProfile();
  const { actions } = useStore();
  const p = bookPercent(profile, book);
  const next = nextChapter(profile, book);
  const ep = episodeOfChapter(book, next);
  const inList = profile.myList.includes(book.id);
  const started = (profile.progress[book.id]?.read.length ?? 0) > 0;

  return (
    <section className="hero" aria-label={`Destaque: ${book.name}`}>
      <picture>
        <source media="(max-width: 800px)" srcSet={imageUrl(book, 'poster')} />
        <Art className="hero-art" book={book} kind="backdrop" />
      </picture>
      <div className="hero-shade" />
      <div className="hero-content">
        <Badge />
        <h1 className="hero-title">{book.name}</h1>
        {kicker && (
          <div className="hero-kicker">
            <span className="top10-badge">
              TOP
              <b>10</b>
            </span>
            {kicker}
          </div>
        )}
        <p className="hero-tagline">“{book.tagline}”</p>
        <p className="hero-syn">{book.synopsis}</p>
        {started && (
          <div className="hero-progress">
            <span className="bar">
              <i style={{ width: pct(p) }} />
            </span>
            <span>
              E{ep.n}: {ep.title} · {pct(p)}
            </span>
          </div>
        )}
        <div className="hero-actions">
          <button className="btn btn-white" onClick={() => playBook(book, next)}>
            <Icon name="play" size={26} /> {started ? 'Continuar' : 'Ler'}
          </button>
          <button className="btn btn-gray" onClick={() => openTitle(book.id)}>
            <Icon name="info" size={26} /> Mais informações
          </button>
          <button className="round-btn hero-list" onClick={() => actions.toggleList(book.id)} aria-label={inList ? 'Remover da lista' : 'Adicionar à minha lista'}>
            <Icon name={inList ? 'check' : 'plus'} />
          </button>
        </div>
      </div>
      <div className="hero-age">
        <span>{book.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}</span>
      </div>
    </section>
  );
}
