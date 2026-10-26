import { useMemo, useState } from 'react';
import { BOOKS, chapterRange, episodeOfChapter, readingMinutes, type Book } from '../data/books';
import { VERSIONS } from '../lib/api';
import { Art } from './Art';
import { credit, painting } from '../lib/paintings';
import { setQuery } from '../lib/router';
import { bookPercent, episodePercent, nextChapter, pct, formatMinutes } from '../lib/stats';
import { useProfile, useStore } from '../lib/store';
import { Badge, openTitle, playBook, RatingButtons } from './Card';
import { StarRating } from './DevotionalModal';
import { Icon } from './Icon';
import { Modal, useUI } from './ui';

export function TitleModal({ book }: { book: Book }) {
  const profile = useProfile();
  const { actions } = useStore();
  const { openShare, openDevotional, toast } = useUI();
  const [confirmReset, setConfirmReset] = useState(false);
  const close = () => setQuery('title', null);
  const p = bookPercent(profile, book);
  const started = (profile.progress[book.id]?.read.length ?? 0) > 0;
  const next = nextChapter(profile, book);
  const nextEp = episodeOfChapter(book, next);
  const inList = profile.myList.includes(book.id);
  const totalMin = readingMinutes(book, 1, book.chapters);
  const devs = profile.devotionals.filter((d) => d.bookId === book.id);
  const similar = useMemo(() => {
    const same = BOOKS.filter((b) => b.group === book.group && b.id !== book.id);
    const neighbors = [BOOKS[book.index + 1], BOOKS[book.index - 1]].filter((b): b is Book => !!b && !same.includes(b));
    return [...same, ...neighbors].slice(0, 9);
  }, [book]);
  const read = new Set(profile.progress[book.id]?.read ?? []);

  return (
    <Modal onClose={close} className="title-modal" label={book.name}>
      <button className="modal-close" onClick={close} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="tm-hero">
        <Art book={book} kind="backdrop" />
        <div className="tm-shade" />
        <div className="tm-hero-content">
          <Badge />
          <h1 className="tm-title">{book.name}</h1>
          <div className="tm-actions">
            <button className="btn btn-white" onClick={() => playBook(book, next)}>
              <Icon name="play" size={24} /> {started ? `Continuar E${nextEp.n}` : 'Ler E1'}
            </button>
            <button className="round-btn" onClick={() => actions.toggleList(book.id)} aria-label={inList ? 'Remover da lista' : 'Adicionar à minha lista'} title="Minha lista">
              <Icon name={inList ? 'check' : 'plus'} />
            </button>
            <RatingButtons bookId={book.id} />
            <button className="round-btn" onClick={() => openShare({ kind: 'book', book, episode: started ? nextEp : undefined })} aria-label="Compartilhar progresso" title="Compartilhar">
              <Icon name="share" size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="tm-body">
        <div className="tm-info">
          <div className="tm-left">
            <div className="meta">
              <span className="match">{started ? `${pct(p)} concluído` : 'Novo para você'}</span>
              <span>{book.date}</span>
              <span>
                {book.episodes.length} episódio{book.episodes.length > 1 ? 's' : ''}
              </span>
              <span className="hd">{VERSIONS.find((v) => v.id === profile.settings.version)?.label}</span>
            </div>
            <div className="meta">
              <span className="age">L</span>
              <span>
                {book.chapters} capítulo{book.chapters > 1 ? 's' : ''} · {formatMinutes(totalMin)}
              </span>
            </div>
            {started && (
              <div className="tm-progress">
                <span className="bar">
                  <i style={{ width: pct(p) }} />
                </span>
                <span>
                  {profile.progress[book.id]?.read.length}/{book.chapters}
                </span>
              </div>
            )}
            <p className="tm-tagline">“{book.tagline}”</p>
            <p className="tm-syn">{book.synopsis}</p>
          </div>
          <div className="tm-right">
            <p>
              <span className="muted">Autor: </span>
              {book.author}
            </p>
            <p>
              <span className="muted">Gêneros: </span>
              {book.tags.join(', ')}
            </p>
            <p>
              <span className="muted">Coleção: </span>
              {book.group} · {book.testament === 'AT' ? 'Antigo' : 'Novo'} Testamento
            </p>
            <p>
              <span className="muted">Versículo-chave: </span>
              {book.keyVerse}
            </p>
            {painting(book) && (
              <p className="art-credit">
                <span className="muted">Arte: </span>
                <a href={painting(book)!.d} target="_blank" rel="noreferrer">
                  {credit(painting(book))}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="ep-head">
          <h3>Episódios</h3>
          <span className="muted">{book.name} · Temporada completa</span>
        </div>
        <ol className="episodes">
          {book.episodes.map((e) => {
            const ep = episodePercent(profile, book, e);
            const first = (() => {
              for (let c = e.start; c <= e.end; c++) if (!read.has(c)) return c;
              return e.start;
            })();
            return (
              <li key={e.n} className={`episode ${ep >= 1 ? 'done' : ''} ${nextEp.n === e.n && started ? 'current' : ''}`}>
                <button className="ep-btn" onClick={() => playBook(book, first)} aria-label={`Ler episódio ${e.n}: ${e.title}`}>
                  <span className="ep-n">{e.n}</span>
                  <span className="ep-thumb">
                    <Art book={book} kind="thumb" ep={e.n} loading="lazy" />
                    <span className="ep-play">
                      <Icon name="play" size={22} />
                    </span>
                    <span className="ep-num-art">{String(e.n).padStart(2, '0')}</span>
                    {ep > 0 && (
                      <span className="bar">
                        <i style={{ width: pct(ep) }} />
                      </span>
                    )}
                  </span>
                  <span className="ep-text">
                    <span className="ep-top">
                      <b>{e.title}</b>
                      <span>{formatMinutes(readingMinutes(book, e.start, e.end))}</span>
                    </span>
                    <span className="ep-syn">{e.synopsis}</span>
                    <span className="ep-range">
                      {chapterRange(e)}
                      {ep >= 1 && (
                        <span className="ep-done">
                          <Icon name="check" size={14} /> Assistido
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="ep-head">
          <h3>Minhas devocionais</h3>
          <button className="btn btn-gray sm" onClick={() => openDevotional({ bookId: book.id })}>
            <Icon name="pen" size={18} /> Escrever devocional
          </button>
        </div>
        {devs.length ? (
          <div className="dev-mini-list">
            {devs.map((d) => (
              <article key={d.id} className="dev-mini" onClick={() => openDevotional({ existing: d })}>
                <div className="dev-mini-top">
                  <b>{d.title}</b>
                  <StarRating value={d.rating} size={14} />
                </div>
                <p>{d.text}</p>
                <span className="muted small">
                  {d.episode ? `E${d.episode} · ` : ''}
                  {new Date(d.updatedAt).toLocaleDateString('pt-BR')}
                  {d.mood ? ` · ${d.mood}` : ''}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Ainda não há devocionais para {book.name}. Que tal registrar o que Deus está falando com você?</p>
        )}

        <h3 className="similar-title">Títulos semelhantes</h3>
        <div className="similar">
          {similar.map((b) => (
            <button key={b.id} className="sim-card" onClick={() => openTitle(b.id)}>
              <span className="sim-art">
                <Art book={b} kind="thumb" loading="lazy" />
                <span className="card-title">{b.name}</span>
                <span className="sim-eps">{b.episodes.length} ep.</span>
              </span>
              <span className="sim-body">
                <span className="meta">
                  <span className="match">{bookPercent(profile, b) > 0 ? pct(bookPercent(profile, b)) : 'Novo'}</span>
                  <span className="age">L</span>
                  <span>{b.date}</span>
                </span>
                <span className="sim-syn">{b.synopsis}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="tm-footer">
          {started &&
            (confirmReset ? (
              <span>
                Recomeçar e apagar o progresso de {book.name}?{' '}
                <button
                  className="link danger"
                  onClick={() => {
                    actions.resetBook(book.id);
                    setConfirmReset(false);
                    toast('Progresso reiniciado');
                  }}
                >
                  Sim, recomeçar
                </button>{' '}
                <button className="link" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button className="link" onClick={() => setConfirmReset(true)}>
                <Icon name="refresh" size={16} /> Recomeçar série
              </button>
            ))}
        </div>
      </div>
    </Modal>
  );
}
