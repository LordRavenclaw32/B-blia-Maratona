import { useMemo, useState } from 'react';
import { BOOKS, getBook } from '../data/books';
import { Art } from '../components/Art';
import { navigate } from '../lib/router';
import { useProfile, useStore } from '../lib/store';
import { Icon } from '../components/Icon';
import { DEVOTIONAL_BACKGROUND } from '../data/customArt';
import { assetUrl } from '../lib/paintings';
import { StarRating } from '../components/DevotionalModal';
import { useUI } from '../components/ui';
import { useVersions } from '../lib/useVersions';

export function Diary() {
  const versions = useVersions();
  const profile = useProfile();
  const { actions } = useStore();
  const { openDevotional, openShare, toast } = useUI();
  const [tab, setTab] = useState<'dev' | 'fav'>('dev');
  const [filter, setFilter] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  const devs = useMemo(
    () => profile.devotionals.filter((d) => !filter || d.bookId === filter).sort((a, b) => b.updatedAt - a.updatedAt),
    [profile.devotionals, filter],
  );
  const favs = useMemo(
    () => profile.favorites.filter((f) => !filter || f.bookId === filter).sort((a, b) => b.at - a.at),
    [profile.favorites, filter],
  );
  const usedBooks = BOOKS.filter((b) => profile.devotionals.some((d) => d.bookId === b.id) || profile.favorites.some((f) => f.bookId === b.id));
  const avg = profile.devotionals.length ? profile.devotionals.reduce((s, d) => s + d.rating, 0) / profile.devotionals.length : 0;

  return (
    <main className="page diary">
      <div className="page-head page-banner" style={{ ['--bg-img' as string]: `url(${assetUrl(DEVOTIONAL_BACKGROUND)})` }}>
        <div>
          <h1 className="page-title">Meu diário de maratona</h1>
          <p className="muted">
            {profile.devotionals.length} devocionais · {profile.favorites.length} versículos salvos
            {avg > 0 && ` · nota média ${avg.toFixed(1)}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openDevotional({ bookId: Object.keys(profile.progress)[0] })}>
          <Icon name="pen" /> Nova devocional
        </button>
      </div>

      <div className="toolbar">
        <div className="seg" role="tablist">
          <button className={tab === 'dev' ? 'on' : ''} onClick={() => setTab('dev')} role="tab" aria-selected={tab === 'dev'}>
            Devocionais
          </button>
          <button className={tab === 'fav' ? 'on' : ''} onClick={() => setTab('fav')} role="tab" aria-selected={tab === 'fav'}>
            Versículos salvos
          </button>
        </div>
        {usedBooks.length > 0 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por livro">
            <option value="">Todos os livros</option>
            {usedBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {tab === 'dev' &&
        (devs.length ? (
          <div className="dev-list">
            {devs.map((d) => {
              const b = getBook(d.bookId)!;
              return (
                <article key={d.id} className="dev-card">
                  <button className="dev-art" onClick={() => openDevotional({ existing: d })} aria-label="Editar">
                    <Art book={b} kind="thumb" ep={d.episode} loading="lazy" />
                    <span className="card-title">{b.name}</span>
                  </button>
                  <div className="dev-body">
                    <div className="dev-top">
                      <div>
                        <span className="kick">
                          {b.name}
                          {d.episode ? ` · E${d.episode}: ${b.episodes[d.episode - 1]?.title}` : ''}
                        </span>
                        <h3>{d.title}</h3>
                      </div>
                      <StarRating value={d.rating} size={16} />
                    </div>
                    <p className="dev-text">{d.text}</p>
                    <div className="dev-meta">
                      <span>{new Date(d.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      {d.mood && <span className="chip on sm">{d.mood}</span>}
                      {d.verse && <span className="verse-ref">{d.verse}</span>}
                    </div>
                    <div className="dev-actions">
                      <button className="link" onClick={() => openDevotional({ existing: d })}>
                        <Icon name="pen" size={16} /> Editar
                      </button>
                      <button className="link" onClick={() => openShare({ kind: 'devotional', devotional: d, book: b })}>
                        <Icon name="share" size={16} /> Compartilhar
                      </button>
                      {confirm === d.id ? (
                        <button
                          className="link danger"
                          onClick={() => {
                            actions.deleteDevotional(d.id);
                            setConfirm(null);
                            toast('Devocional excluída');
                          }}
                        >
                          Confirmar exclusão
                        </button>
                      ) : (
                        <button className="link" onClick={() => setConfirm(d.id)}>
                          <Icon name="trash" size={16} /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <p>Seu diário está esperando a primeira devocional.</p>
            <p className="muted">Ao terminar um episódio, registre o que Deus falou com você — como uma crítica da sua própria maratona.</p>
          </div>
        ))}

      {tab === 'fav' &&
        (favs.length ? (
          <div className="fav-list">
            {favs.map((f) => {
              const b = getBook(f.bookId)!;
              const ref = `${b.name} ${f.chapter}:${f.verse}`;
              const vname = versions.find((v) => v.id === f.version)?.name ?? f.version;
              return (
                <article key={f.id} className="fav-card">
                  <blockquote>“{f.text}”</blockquote>
                  <div className="fav-foot">
                    <button className="link strong" onClick={() => navigate(`/read/${b.id}/${f.chapter}`)}>
                      {ref} · {f.version.toUpperCase()}
                    </button>
                    <div>
                      <button className="icon-btn" aria-label="Compartilhar como imagem" onClick={() => openShare({ kind: 'verse', book: b, verse: { ref, text: f.text, version: vname } })}>
                        <Icon name="image" size={20} />
                      </button>
                      <button className="icon-btn" aria-label="Escrever devocional" onClick={() => openDevotional({ bookId: b.id, verse: ref })}>
                        <Icon name="pen" size={20} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Remover"
                        onClick={() => actions.toggleFavorite({ bookId: f.bookId, chapter: f.chapter, verse: f.verse, text: f.text, version: f.version })}
                      >
                        <Icon name="trash" size={20} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <p>Nenhum versículo salvo ainda.</p>
            <p className="muted">Durante a leitura, toque em um versículo e escolha “Salvar”.</p>
          </div>
        ))}
    </main>
  );
}
