import { APP_NAME } from '../lib/brand';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOOKS, chapterRange, episodeOfChapter, readingMinutes, type Book, type Episode } from '../data/books';
import { getChapter, SOURCE_LABEL, type ChapterData, type VersionId } from '../lib/api';
import { Art } from '../components/Art';
import { credit, painting } from '../lib/paintings';
import { navigate } from '../lib/router';
import { bookPercent, episodeRead, formatMinutes, pct } from '../lib/stats';
import { useProfile, useStore, type ReaderTheme } from '../lib/store';
import { Icon } from '../components/Icon';
import { RatingButtons } from '../components/Card';
import { useUI } from '../components/ui';
import { TopButtons } from '../components/TopTools';
import { cleanVerse } from '../lib/share';
import { useVersions } from '../lib/useVersions';

type ChState = { status: 'loading' } | { status: 'ok'; data: ChapterData } | { status: 'error'; message: string };

function formatRef(book: Book, chapter: number, verses: number[]): string {
  const v = [...verses].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < v.length) {
    let j = i;
    while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++;
    parts.push(i === j ? `${v[i]}` : `${v[i]}-${v[j]}`);
    i = j + 1;
  }
  return `${book.name} ${chapter}:${parts.join(',')}`;
}

function nextEpisodeOf(book: Book, ep: Episode): { book: Book; ep: Episode } | null {
  if (ep.n < book.episodes.length) return { book, ep: book.episodes[ep.n] };
  const nb = BOOKS[book.index + 1];
  return nb ? { book: nb, ep: nb.episodes[0] } : null;
}

function prevEpisodeOf(book: Book, ep: Episode): { book: Book; ep: Episode } | null {
  if (ep.n > 1) return { book, ep: book.episodes[ep.n - 2] };
  const pb = BOOKS[book.index - 1];
  return pb ? { book: pb, ep: pb.episodes[pb.episodes.length - 1] } : null;
}

export function Reader({ book, chapter }: { book: Book; chapter: number }) {
  const versions = useVersions();
  const profile = useProfile();
  const { actions } = useStore();
  const { openShare, openDevotional, toast } = useUI();
  const ep = useMemo(() => episodeOfChapter(book, chapter), [book, chapter]);
  const s = profile.settings;
  const [version, setVersion] = useState<VersionId>(s.version);
  const [chapters, setChapters] = useState<Record<number, ChState>>({});
  const [visibleCh, setVisibleCh] = useState(chapter);
  const [progress, setProgress] = useState(0);
  const [controls, setControls] = useState(true);
  const [panel, setPanel] = useState<'text' | 'chapters' | null>(null);
  const [selection, setSelection] = useState<{ chapter: number; verses: number[] } | null>(null);
  const [skipRecap, setSkipRecap] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [atEnd, setAtEnd] = useState(false);
  // versículo citado (#/read/livro/cap?v=16&ve=18): destacado e centralizado ao abrir
  const focus = useMemo(() => {
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
    const v = Number(q.get('v')) || 0;
    return { v, ve: Math.max(v, Number(q.get('ve')) || v) };
  }, []);
  const engaged = useRef(false);
  const openedAt = useRef(Date.now());
  const urlChapter = useRef(chapter);
  const lastY = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const read = useMemo(() => new Set(profile.progress[book.id]?.read ?? []), [profile.progress, book.id]);
  const readRef = useRef(read);
  readRef.current = read;
  const chList = useMemo(() => Array.from({ length: ep.end - ep.start + 1 }, (_, i) => ep.start + i), [ep]);
  const next = useMemo(() => nextEpisodeOf(book, ep), [book, ep]);
  const prev = useMemo(() => prevEpisodeOf(book, ep), [book, ep]);
  const favSet = useMemo(
    () => new Set(profile.favorites.filter((f) => f.bookId === book.id).map((f) => `${f.chapter}:${f.verse}`)),
    [profile.favorites, book.id],
  );

  // ── carregamento ──
  const load = useCallback(
    (v: VersionId) => {
      setChapters(Object.fromEntries(chList.map((c) => [c, { status: 'loading' } as ChState])));
      chList.forEach((c) => {
        getChapter(v, book, c)
          .then((data) => setChapters((cur) => ({ ...cur, [c]: { status: 'ok', data } })))
          .catch((e: Error) => setChapters((cur) => ({ ...cur, [c]: { status: 'error', message: e.message } })));
      });
    },
    [book, chList],
  );

  const focusStatus = chapters[chapter]?.status;
  useEffect(() => {
    if (!focus.v || focusStatus !== 'ok') return;
    const t = setTimeout(() => document.getElementById(`v-${chapter}-${focus.v}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    return () => clearTimeout(t);
  }, [focus.v, focusStatus, chapter]);

  useEffect(() => {
    load(version);
  }, [load, version]);

  useEffect(() => {
    actions.setLastChapter(book.id, chapter);
    document.title = `${book.name} · E${ep.n}: ${ep.title} — ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, []);

  // pré-carrega o próximo episódio
  useEffect(() => {
    if (progress > 0.6 && next) getChapter(version, next.book, next.ep.start).catch(() => undefined);
  }, [progress > 0.6, next, version]);

  // ── rolagem até o capítulo solicitado ──
  const allLoaded = chList.every((c) => chapters[c] && chapters[c].status !== 'loading');
  const scrolledInitial = useRef(false);
  useEffect(() => {
    if (!allLoaded) return;
    if (!scrolledInitial.current) {
      scrolledInitial.current = true;
      if (chapter !== ep.start) document.getElementById(`ch-${chapter}`)?.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    }
  }, [allLoaded, chapter, ep.start]);

  useEffect(() => {
    if (chapter !== urlChapter.current) {
      urlChapter.current = chapter;
      document.getElementById(`ch-${chapter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chapter]);

  // ── rolagem: progresso, controles, engajamento ──
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 1);
      if (Math.abs(y - lastY.current) > 6) {
        setControls(y < lastY.current || y < 80);
        lastY.current = y;
      }
      if (!engaged.current && Date.now() - openedAt.current > 1500) engaged.current = true;
    };
    window.addEventListener('scroll', on, { passive: true });
    const t = window.setTimeout(() => (engaged.current = true), 20000);
    on();
    return () => {
      window.removeEventListener('scroll', on);
      window.clearTimeout(t);
    };
  }, []);

  // ── capítulo visível + marcação automática de leitura ──
  useEffect(() => {
    if (!allLoaded) return;
    const heads = chList.map((c) => document.getElementById(`ch-${c}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) {
          const c = Number((vis[0].target as HTMLElement).dataset.ch);
          setVisibleCh(c);
          if (c !== urlChapter.current) {
            urlChapter.current = c;
            history.replaceState(null, '', `#/read/${book.id}/${c}`);
            actions.setLastChapter(book.id, c);
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    heads.forEach((h) => io.observe(h));

    const sentinels = chList.map((c) => document.getElementById(`end-${c}`)).filter(Boolean) as HTMLElement[];
    const visible = new Set<number>();
    const tryMark = () => {
      if (!engaged.current) return;
      visible.forEach((c) => {
        if (!readRef.current.has(c)) actions.setChapterRead(book.id, c, true);
      });
    };
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const c = Number((e.target as HTMLElement).dataset.ch);
        if (e.isIntersecting) visible.add(c);
        else visible.delete(c);
      });
      tryMark();
    });
    sentinels.forEach((sn) => so.observe(sn));
    const iv = window.setInterval(tryMark, 1500);
    return () => {
      io.disconnect();
      so.disconnect();
      window.clearInterval(iv);
    };
  }, [allLoaded, chList, book.id]);

  // ── fim do episódio + autoplay ──
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [allLoaded]);

  const epDone = episodeRead(profile, book, ep) === chList.length;

  useEffect(() => {
    if (atEnd && epDone && s.autoplay && next && countdown === null) setCountdown(10);
    if (!atEnd && countdown !== null) setCountdown(null);
  }, [atEnd, epDone]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (next) navigate(`/read/${next.book.id}/${next.ep.start}`);
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, next]);

  // ── atalhos de teclado ──
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) return;
      if (e.key === 'Escape') {
        if (selection) setSelection(null);
        else if (panel) setPanel(null);
        else navigate(`/browse?title=${book.id}`);
      }
      if (e.key === 'n' && next) navigate(`/read/${next.book.id}/${next.ep.start}`);
      if (e.key === 'p' && prev) navigate(`/read/${prev.book.id}/${prev.ep.start}`);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [selection, panel, next, prev, book.id]);

  const changeVersion = (v: VersionId) => {
    setVersion(v);
    actions.updateSettings({ version: v });
    setSelection(null);
  };

  const toggleVerse = (c: number, v: number) => {
    setSelection((cur) => {
      if (!cur || cur.chapter !== c) return { chapter: c, verses: [v] };
      const has = cur.verses.includes(v);
      const verses = has ? cur.verses.filter((x) => x !== v) : [...cur.verses, v];
      return verses.length ? { chapter: c, verses } : null;
    });
  };

  const selectionText = () => {
    if (!selection) return '';
    const st = chapters[selection.chapter];
    if (st?.status !== 'ok') return '';
    return st.data.verses
      .filter((v) => selection.verses.includes(v.number))
      .sort((a, b) => a.number - b.number)
      .map((v) => v.text)
      .join(' ');
  };

  const versionLabel = versions.find((v) => v.id === version)?.label ?? version.toUpperCase();
  const sel = selection ? formatRef(book, selection.chapter, selection.verses) : '';

  const goNext = () => {
    setCountdown(null);
    if (next) navigate(`/read/${next.book.id}/${next.ep.start}`);
  };

  const markEpisode = () => {
    chList.forEach((c) => !read.has(c) && actions.setChapterRead(book.id, c, true));
    toast('Episódio marcado como lido');
  };

  return (
    <div className={`reader theme-${s.readerTheme}`} style={{ ['--fs' as string]: `${s.fontSize}px` }}>
      <header className={`reader-top ${controls || panel ? '' : 'hide'}`}>
        <button className="icon-btn" onClick={() => navigate(`/browse?title=${book.id}`)} aria-label="Voltar">
          <Icon name="back" size={28} />
        </button>
        <div className="rt-title">
          <b>{book.name}</b>
          <span>
            E{ep.n}: {ep.title}
          </span>
        </div>
        <div className="rt-right">
          <div className="seg small" role="group" aria-label="Versão">
            {versions.map((v) => (
              <button key={v.id} className={version === v.id ? 'on' : ''} onClick={() => changeVersion(v.id)} title={v.name}>
                {v.label}
              </button>
            ))}
          </div>
          <button className={`icon-btn ${panel === 'chapters' ? 'on' : ''}`} onClick={() => setPanel(panel === 'chapters' ? null : 'chapters')} aria-label="Episódios e capítulos">
            <Icon name="list" />
          </button>
          <button className={`icon-btn ${panel === 'text' ? 'on' : ''}`} onClick={() => setPanel(panel === 'text' ? null : 'text')} aria-label="Aparência do texto">
            <Icon name="text" />
          </button>
          <button className="icon-btn" onClick={() => openShare({ kind: 'book', book, episode: ep })} aria-label="Compartilhar progresso">
            <Icon name="share" />
          </button>
          <TopButtons />
        </div>
        <div className="rt-progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {panel === 'text' && (
        <div className="reader-panel" role="dialog" aria-label="Aparência">
          <div className="rp-row">
            <span>Versão</span>
            <select value={version} onChange={(e) => changeVersion(e.target.value)} aria-label="Versão da Bíblia">
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="rp-row">
            <span>Tamanho</span>
            <div className="rp-size">
              <button onClick={() => actions.updateSettings({ fontSize: Math.max(14, s.fontSize - 2) })} aria-label="Diminuir fonte">
                A−
              </button>
              <b>{s.fontSize}</b>
              <button onClick={() => actions.updateSettings({ fontSize: Math.min(34, s.fontSize + 2) })} aria-label="Aumentar fonte">
                A+
              </button>
            </div>
          </div>
          <div className="rp-row">
            <span>Tema</span>
            <div className="rp-themes">
              {(['dark', 'sepia', 'light'] as ReaderTheme[]).map((t) => (
                <button key={t} className={`th th-${t} ${s.readerTheme === t ? 'on' : ''}`} onClick={() => actions.updateSettings({ readerTheme: t })}>
                  {t === 'dark' ? 'Escuro' : t === 'sepia' ? 'Sépia' : 'Claro'}
                </button>
              ))}
            </div>
          </div>
          <label className="rp-row check">
            <span>Números dos versículos</span>
            <input type="checkbox" checked={s.showVerseNumbers} onChange={(e) => actions.updateSettings({ showVerseNumbers: e.target.checked })} />
          </label>
          <label className="rp-row check">
            <span>Reprodução automática do próximo episódio</span>
            <input type="checkbox" checked={s.autoplay} onChange={(e) => actions.updateSettings({ autoplay: e.target.checked })} />
          </label>
        </div>
      )}

      {panel === 'chapters' && (
        <div className="reader-panel wide" role="dialog" aria-label="Episódios">
          <h4>Capítulos deste episódio</h4>
          <div className="ch-chips">
            {chList.map((c) => (
              <button
                key={c}
                className={`ch-chip ${visibleCh === c ? 'on' : ''} ${read.has(c) ? 'read' : ''}`}
                onClick={() => {
                  document.getElementById(`ch-${c}`)?.scrollIntoView({ behavior: 'smooth' });
                  setPanel(null);
                }}
              >
                {c}
                {read.has(c) && <Icon name="check" size={12} />}
              </button>
            ))}
          </div>
          <h4>Episódios de {book.name}</h4>
          <ol className="ep-mini">
            {book.episodes.map((e) => (
              <li key={e.n}>
                <button
                  className={e.n === ep.n ? 'on' : ''}
                  onClick={() => {
                    setPanel(null);
                    navigate(`/read/${book.id}/${e.start}`);
                  }}
                >
                  <Art book={book} kind="thumb" ep={e.n} loading="lazy" />
                  <span>
                    <b>
                      E{e.n} · {e.title}
                    </b>
                    <small>
                      {chapterRange(e)} · {formatMinutes(readingMinutes(book, e.start, e.end))}
                    </small>
                  </span>
                  {episodeRead(profile, book, e) === e.end - e.start + 1 && <Icon name="check" size={18} />}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <article className="reader-body" onClick={() => panel && setPanel(null)}>
        <div className="ep-hero">
          <Art book={book} kind="poster" ep={ep.n} />
          <div className="ep-hero-shade" />
          <div className="ep-hero-text">
            <span className="kick">
              {book.name} · Episódio {ep.n} de {book.episodes.length}
            </span>
            <h1>{ep.title}</h1>
            <p>{ep.synopsis}</p>
            <span className="muted small">
              {chapterRange(ep)} · {formatMinutes(readingMinutes(book, ep.start, ep.end))} · {versionLabel}
            </span>
            {painting(book, ep.n) && <span className="ep-credit">Arte: {credit(painting(book, ep.n))}</span>}
          </div>
        </div>

        {ep.n > 1 && !skipRecap && (
          <aside className="recap">
            <div>
              <span className="kick">Anteriormente em {book.name}</span>
              <p>
                <b>{book.episodes[ep.n - 2].title}.</b> {book.episodes[ep.n - 2].synopsis}
              </p>
            </div>
            <button className="btn btn-outline sm" onClick={() => setSkipRecap(true)}>
              Pular recapitulação
            </button>
          </aside>
        )}

        {chList.map((c) => {
          const st = chapters[c];
          return (
            <section key={c} className="chapter" id={`ch-${c}`} data-ch={c}>
              <h2 className="ch-title">
                <span>Capítulo</span> {c}
              </h2>
              {(!st || st.status === 'loading') && (
                <div className="skeleton">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <i key={i} style={{ width: `${70 + ((i * 37) % 30)}%` }} />
                  ))}
                </div>
              )}
              {st?.status === 'error' && (
                <div className="ch-error">
                  <Icon name="wifiOff" size={28} />
                  <p>Não foi possível carregar este capítulo. Verifique sua conexão.</p>
                  <button className="btn btn-gray sm" onClick={() => load(version)}>
                    <Icon name="refresh" size={18} /> Tentar novamente
                  </button>
                </div>
              )}
              {st?.status === 'ok' && (
                <>
                  <p className="verses">
                    {st.data.verses.map((v) => {
                      const selected = selection?.chapter === c && selection.verses.includes(v.number);
                      const fav = favSet.has(`${c}:${v.number}`);
                      return (
                        <span
                          key={v.number}
                          id={`v-${c}-${v.number}`}
                          className={`verse ${selected ? 'sel' : ''} ${fav ? 'fav' : ''} ${c === chapter && v.number >= focus.v && v.number <= focus.ve ? 'focus' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVerse(c, v.number);
                          }}
                        >
                          {s.showVerseNumbers && <sup>{v.number}</sup>}
                          {v.text}{' '}
                        </span>
                      );
                    })}
                  </p>
                  <div className="ch-foot">
                    <span className="src">
                      {st.data.servedAs.startsWith('u-') ? `Versão importada · ${versionLabel}` : `${st.data.source === 'abibliadigital' ? 'ABíbliaDigital' : 'Fonte alternativa'} · ${SOURCE_LABEL[st.data.servedAs] ?? st.data.servedAs.toUpperCase()}`}
                    </span>
                    <button className={`read-toggle ${read.has(c) ? 'on' : ''}`} onClick={() => actions.setChapterRead(book.id, c, !read.has(c))}>
                      <Icon name="check" size={18} /> {read.has(c) ? 'Lido' : 'Marcar como lido'}
                    </button>
                  </div>
                </>
              )}
              <div className="sentinel" id={`end-${c}`} data-ch={c} />
            </section>
          );
        })}

        <section className="end-card" ref={endRef}>
          <div className="end-left">
            <span className="kick">{epDone ? 'Episódio concluído' : 'Fim do episódio'}</span>
            <h2>{ep.title}</h2>
            <div className="end-progress">
              <span className="bar">
                <i style={{ width: pct(bookPercent(profile, book)) }} />
              </span>
              <span>
                {pct(bookPercent(profile, book))} de {book.name}
              </span>
            </div>
            {!epDone && (
              <button className="btn btn-gray" onClick={markEpisode}>
                <Icon name="check" /> Marcar episódio como lido
              </button>
            )}
            <div className="end-actions">
              <div className="end-rate">
                <span>Avalie a série:</span>
                <RatingButtons bookId={book.id} />
              </div>
              <button className="btn btn-gray" onClick={() => openDevotional({ bookId: book.id, episode: ep.n })}>
                <Icon name="pen" /> Escrever devocional
              </button>
              <button className="btn btn-gray" onClick={() => openShare({ kind: epDone ? 'episode' : 'book', book, episode: ep })}>
                <Icon name="share" /> Compartilhar
              </button>
            </div>
          </div>
          {next ? (
            <button className="next-card" onClick={goNext}>
              <span className="next-art">
                <Art book={next.book} kind="thumb" ep={next.ep.n} />
                <span className="ep-play">
                  <Icon name="play" size={30} />
                </span>
                {countdown !== null && (
                  <span className="countdown">
                    <svg viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" />
                      <circle cx="18" cy="18" r="16" className="fg" style={{ strokeDashoffset: `${(countdown / 10) * 100.5}` }} />
                    </svg>
                    <b>{countdown}</b>
                  </span>
                )}
              </span>
              <span className="next-text">
                <span className="kick">{next.book.id === book.id ? 'Próximo episódio' : `Próxima série: ${next.book.name}`}</span>
                <b>
                  E{next.ep.n} · {next.ep.title}
                </b>
                <small>{next.ep.synopsis}</small>
              </span>
            </button>
          ) : (
            <div className="next-card final">
              <span className="kick">Fim da saga</span>
              <b>Você chegou ao final da Bíblia!</b>
              <button className="btn btn-primary" onClick={() => openShare({ kind: 'overall' })}>
                Compartilhar conquista
              </button>
            </div>
          )}
          {countdown !== null && (
            <button className="link cancel-auto" onClick={() => setCountdown(null)}>
              Cancelar reprodução automática
            </button>
          )}
        </section>
      </article>

      <footer className={`reader-bottom ${controls ? '' : 'hide'}`}>
        <button className="icon-btn" disabled={!prev} onClick={() => prev && navigate(`/read/${prev.book.id}/${prev.ep.start}`)} aria-label="Episódio anterior" title="Episódio anterior (P)">
          <Icon name="prev" />
        </button>
        <div className="scrub">
          {chList.map((c) => (
            <button
              key={c}
              className={`seg-ch ${read.has(c) ? 'read' : ''} ${visibleCh === c ? 'cur' : ''}`}
              style={{ flex: Math.max(1, (chapters[c] as { data?: ChapterData })?.data?.verses.length ?? 20) }}
              onClick={() => document.getElementById(`ch-${c}`)?.scrollIntoView({ behavior: 'smooth' })}
              aria-label={`Capítulo ${c}`}
              title={`Capítulo ${c}`}
            />
          ))}
        </div>
        <span className="scrub-label">
          Cap. {visibleCh} · {chList.indexOf(visibleCh) + 1}/{chList.length}
        </span>
        <button className="icon-btn" disabled={!next} onClick={goNext} aria-label="Próximo episódio" title="Próximo episódio (N)">
          <Icon name="next" />
        </button>
      </footer>

      {selection && (
        <div className="sel-bar" role="toolbar" aria-label="Versículos selecionados">
          <b>
            {sel} <small>{versionLabel}</small>
          </b>
          <div className="sel-actions">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`“${cleanVerse(selectionText())}” — ${sel} (${versionLabel})`);
                  toast('Versículo copiado');
                } catch {
                  toast('Não foi possível copiar');
                }
              }}
            >
              <Icon name="copy" size={20} />
              <span>Copiar</span>
            </button>
            <button onClick={() => openShare({ kind: 'verse', book, verse: { ref: sel, text: selectionText(), version: versions.find((v) => v.id === version)?.name ?? versionLabel } })}>
              <Icon name="image" size={20} />
              <span>Imagem</span>
            </button>
            <button
              onClick={() => {
                const st = chapters[selection.chapter];
                if (st?.status !== 'ok') return;
                let added = 0;
                selection.verses.forEach((n) => {
                  const v = st.data.verses.find((x) => x.number === n)!;
                  if (actions.toggleFavorite({ bookId: book.id, chapter: selection.chapter, verse: n, text: v.text, version })) added++;
                });
                toast(added ? 'Salvo nos seus versículos' : 'Removido dos salvos');
                setSelection(null);
              }}
            >
              <Icon name="bookmark" size={20} />
              <span>Salvar</span>
            </button>
            <button
              onClick={() => {
                openDevotional({ bookId: book.id, episode: ep.n, verse: sel });
                setSelection(null);
              }}
            >
              <Icon name="pen" size={20} />
              <span>Devocional</span>
            </button>
            <button onClick={() => setSelection(null)} aria-label="Limpar seleção">
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
