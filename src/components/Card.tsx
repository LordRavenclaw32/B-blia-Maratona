import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { episodeOfChapter, type Book } from '../data/books';
import { artUrl } from '../lib/art';
import { navigate, setQuery } from '../lib/router';
import { bookPercent, nextChapter, pct } from '../lib/stats';
import { useProfile, useStore, type Rating } from '../lib/store';
import { Icon } from './Icon';
import { BFMark } from './Brand';

export type CardVariant = 'wide' | 'poster' | 'top10' | 'continue';

const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function openTitle(id: string) {
  setQuery('title', id);
}

export function playBook(book: Book, chapter?: number) {
  navigate(`/read/${book.id}/${chapter ?? 1}`);
}

export function Badge() {
  return (
    <span className="series-badge">
      <BFMark size={18} />
      SÉRIE
    </span>
  );
}

export function RatingButtons({ bookId, compact = false }: { bookId: string; compact?: boolean }) {
  const profile = useProfile();
  const { actions } = useStore();
  const cur = profile.ratings[bookId];
  const [open, setOpen] = useState(false);
  const icon = cur === 'down' ? 'thumbDown' : cur === 'love' ? 'love' : 'thumbUp';
  const opts: { r: Rating; icon: string; label: string }[] = [
    { r: 'down', icon: 'thumbDown', label: 'Não é pra mim' },
    { r: 'up', icon: 'thumbUp', label: 'Gostei' },
    { r: 'love', icon: 'love', label: 'Amei!' },
  ];
  return (
    <div className={`rate ${open ? 'open' : ''}`} onMouseLeave={() => setOpen(false)}>
      <button
        className={`round-btn ${cur ? 'filled' : ''} ${compact ? 'sm' : ''}`}
        aria-label="Avaliar"
        onMouseEnter={() => canHover() && setOpen(true)}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={icon} size={compact ? 16 : 20} />
      </button>
      {open && (
        <div className="rate-pop">
          {opts.map((o) => (
            <button
              key={o.r}
              className={cur === o.r ? 'on' : ''}
              title={o.label}
              aria-label={o.label}
              onClick={() => {
                actions.rate(bookId, cur === o.r ? null : o.r);
                setOpen(false);
              }}
            >
              <Icon name={o.icon} size={20} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Preview({ book, rect, onClose }: { book: Book; rect: DOMRect; onClose: () => void }) {
  const profile = useProfile();
  const { actions } = useStore();
  const p = bookPercent(profile, book);
  const inList = profile.myList.includes(book.id);
  const next = nextChapter(profile, book);
  const ep = episodeOfChapter(book, next);
  const width = Math.max(rect.width * 1.45, 300);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  const top = rect.top + window.scrollY - rect.height * 0.25;

  return createPortal(
    <div className="preview" style={{ left, top, width }} onMouseLeave={onClose}>
      <button className="preview-art" onClick={() => openTitle(book.id)} aria-label={`Detalhes de ${book.name}`}>
        <img src={artUrl(book, 'thumb')} alt="" />
        <Badge />
        <span className="card-title">{book.name}</span>
        {p > 0 && (
          <span className="bar">
            <i style={{ width: pct(p) }} />
          </span>
        )}
      </button>
      <div className="preview-body">
        <div className="preview-actions">
          <button className="round-btn white" onClick={() => playBook(book, next)} aria-label="Ler agora">
            <Icon name="play" size={20} />
          </button>
          <button className="round-btn" onClick={() => actions.toggleList(book.id)} aria-label={inList ? 'Remover da lista' : 'Adicionar à lista'}>
            <Icon name={inList ? 'check' : 'plus'} size={20} />
          </button>
          <RatingButtons bookId={book.id} />
          <button className="round-btn push" onClick={() => openTitle(book.id)} aria-label="Mais informações">
            <Icon name="chevronDown" size={22} />
          </button>
        </div>
        <div className="meta">
          {p > 0 ? <span className="match">{pct(p)} concluído</span> : <span className="match">Novo para você</span>}
          <span className="age">L</span>
          <span>{book.episodes.length} episódio{book.episodes.length > 1 ? 's' : ''}</span>
          <span className="hd">{profile.settings.version.toUpperCase()}</span>
        </div>
        {p > 0 && p < 1 && (
          <div className="meta small">
            E{ep.n}: {ep.title}
          </div>
        )}
        <div className="tags">
          {book.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Card({ book, variant = 'wide', rank }: { book: Book; variant?: CardVariant; rank?: number }) {
  const profile = useProfile();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const p = bookPercent(profile, book);
  const next = nextChapter(profile, book);
  const ep = episodeOfChapter(book, next);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!rect) return;
    const close = () => setRect(null);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [rect]);

  const enter = () => {
    if (!canHover()) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ref.current && setRect(ref.current.getBoundingClientRect()), 550);
  };
  const leave = () => window.clearTimeout(timer.current);

  const click = () => {
    setRect(null);
    if (variant === 'continue') playBook(book, next);
    else openTitle(book.id);
  };

  const art = variant === 'poster' || variant === 'top10' ? artUrl(book, 'poster') : artUrl(book, 'thumb');

  return (
    <div ref={ref} className={`card ${variant}`} onMouseEnter={enter} onMouseLeave={leave}>
      {variant === 'top10' && <span className="rank">{rank}</span>}
      <button className="card-art" onClick={click} aria-label={variant === 'continue' ? `Continuar ${book.name}` : book.name}>
        <img src={art} alt="" loading="lazy" />
        <Badge />
        <span className={`card-title ${variant === 'poster' || variant === 'top10' ? 'poster-title' : ''}`}>{book.name}</span>
        {variant === 'continue' && (
          <>
            <span className="card-play">
              <Icon name="play" size={28} />
            </span>
            <span className="bar">
              <i style={{ width: pct(p) }} />
            </span>
          </>
        )}
        {variant !== 'continue' && p >= 1 && <span className="done-flag">CONCLUÍDO</span>}
      </button>
      {variant === 'continue' && (
        <div className="card-under">
          <span>
            E{ep.n} · Cap. {next}
          </span>
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              openTitle(book.id);
            }}
            aria-label="Detalhes"
          >
            <Icon name="info" size={18} />
          </button>
        </div>
      )}
      {rect && <Preview book={book} rect={rect} onClose={() => setRect(null)} />}
    </div>
  );
}
