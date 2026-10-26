import { useEffect, useRef, useState } from 'react';
import type { Book } from '../data/books';
import { Card, type CardVariant } from './Card';
import { Icon } from './Icon';
import { groupUrl } from '../lib/paintings';

export interface Season {
  key: string;
  name: string;
  subtitle: string;
}

export function Row({ title, books, variant = 'wide', id, season }: { title: string; books: Book[]; variant?: CardVariant; id?: string; season?: Season }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [books.length]);

  const scroll = (dir: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth - 80), behavior: 'smooth' });
  };

  if (!books.length) return null;
  return (
    <section className={`row row-${variant}`} id={id}>
      {season ? (
        <div className="season-banner">
          {groupUrl(season.key) && <img src={groupUrl(season.key)} alt="" loading="lazy" referrerPolicy="no-referrer" />}
          <div className="season-text">
            <span className="kick">Temporada</span>
            <h2>{season.name}</h2>
            <p>{season.subtitle}</p>
          </div>
          <span className="season-count">
            {books.length} série{books.length > 1 ? 's' : ''} · {books.reduce((s, b) => s + b.chapters, 0)} capítulos
          </span>
        </div>
      ) : (
        <h2 className="row-title">{title}</h2>
      )}
      <div className="row-wrap">
        {edges.left && (
          <button className="row-arrow left" onClick={() => scroll(-1)} aria-label="Anterior">
            <Icon name="chevronLeft" size={40} />
          </button>
        )}
        <div className="row-track" ref={track} onScroll={update}>
          {books.map((b, i) => (
            <Card key={b.id} book={b} variant={variant} rank={i + 1} />
          ))}
        </div>
        {edges.right && (
          <button className="row-arrow right" onClick={() => scroll(1)} aria-label="Próximo">
            <Icon name="chevronRight" size={40} />
          </button>
        )}
      </div>
    </section>
  );
}
