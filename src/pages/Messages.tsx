import { useMemo, useState } from 'react';
import { CommunityGate } from '../components/CommunityGate';
import { Icon } from '../components/Icon';
import { Countdown, downloadIcs, MediaPlayer, RichText, refLink } from '../components/RichText';
import { useUI } from '../components/ui';
import { WELCOME_BACKGROUND } from '../data/customArt';
import { APP_NAME } from '../lib/brand';
import { CHURCH, churchLink } from '../lib/church';
import { isLaunched, monthKey, monthLabel, seasonsOf, useCommunity, type Content, type Series } from '../lib/community';
import { parseMedia } from '../lib/media';
import { assetUrl } from '../lib/paintings';
import { parseRef } from '../lib/refs';
import { navigate } from '../lib/router';

/** Mensagens da igreja: mural do mês, séries com temporadas, lançamentos, vídeos e podcasts. */

const KIND_LABEL: Record<Content['kind'], string> = { mensagem: 'Mensagem', video: 'Vídeo', podcast: 'Podcast' };
const PHASE_LABEL = { pre: 'Antes da pregação', pos: 'Depois da pregação' } as const;

const fmtDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString('pt-BR', withTime ? { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });

export function thumbOf(c: Content, series?: Series): string | undefined {
  return c.thumb || (c.media_url ? parseMedia(c.media_url)?.thumb : undefined) || series?.cover || undefined;
}

function Thumb({ src, kind, title }: { src?: string; kind: string; title: string }) {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
  ) : (
    <span className="c-thumb-ph" aria-hidden="true">
      <Icon name={kind === 'podcast' ? 'music' : kind === 'video' ? 'play' : 'book'} size={34} />
      <b>{title}</b>
    </span>
  );
}

export function ContentCard({ c, series }: { c: Content; series?: Series }) {
  const locked = c.locked || !isLaunched(series);
  return (
    <a className={`c-card ${locked ? 'locked' : ''}`} href={`#/mensagens/item/${c.id}`}>
      <span className="c-thumb">
        <Thumb src={thumbOf(c, series)} kind={c.kind} title={c.title} />
        <span className="c-kind">
          <Icon name={c.kind === 'podcast' ? 'music' : c.kind === 'video' ? 'play' : 'book'} size={13} /> {KIND_LABEL[c.kind]}
        </span>
        {c.phase && <span className={`c-phase ${c.phase}`}>{c.phase === 'pre' ? 'Antes' : 'Depois'}</span>}
        {locked && (
          <span className="c-lock">
            <Icon name="lock" size={16} /> {fmtDate(series?.launch_at && !isLaunched(series) ? series.launch_at : c.publish_at, true)}
          </span>
        )}
      </span>
      <span className="c-title">{c.title}</span>
      {c.author && <span className="c-meta">{c.author}</span>}
    </a>
  );
}

function SeriesCard({ s, count }: { s: Series; count: number }) {
  const soon = !isLaunched(s);
  return (
    <a className="s-card" href={`#/mensagens/serie/${s.id}`}>
      <span className="s-cover">
        {s.cover ? <img src={s.cover} alt="" loading="lazy" /> : <span className="s-cover-ph">{s.title}</span>}
        {soon && <span className="s-soon">Estreia {fmtDate(s.launch_at!, true)}</span>}
        {s.kind === 'mural' && <span className="s-tag">Mural</span>}
      </span>
      <span className="c-title">{s.title}</span>
      <span className="c-meta">{soon ? 'Em breve' : `${count} ${count === 1 ? 'episódio' : 'episódios'}`}</span>
    </a>
  );
}

function CRow({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  if (!count) return null;
  return (
    <section className="c-row">
      <h2>{title}</h2>
      <div className="c-scroll">{children}</div>
    </section>
  );
}

function Empty({ leader }: { leader: boolean }) {
  return (
    <div className="panel c-empty">
      <Icon name="play" size={34} />
      <h2>Ainda não há mensagens publicadas</h2>
      <p className="muted">Quando os pastores e líderes lançarem séries, mensagens, vídeos ou podcasts, eles aparecem aqui.</p>
      {leader && (
        <a className="btn btn-primary" href="#/estudio">
          <Icon name="pen" /> Abrir o estúdio
        </a>
      )}
    </div>
  );
}

function Hub() {
  const c = useCommunity();
  const cat = c.catalog!;
  const byId = useMemo(() => new Map(cat.series.map((s) => [s.id, s])), [cat]);
  const count = (s: Series) => cat.contents.filter((x) => x.series_id === s.id).length;
  const upcoming = cat.series.filter((s) => !isLaunched(s)).sort((a, b) => a.launch_at!.localeCompare(b.launch_at!));
  const launched = cat.series.filter((s) => isLaunched(s));
  const murals = launched.filter((s) => s.kind === 'mural').sort((a, b) => (b.month ?? '').localeCompare(a.month ?? ''));
  const mural = murals.find((s) => s.month === monthKey()) ?? murals[0];
  const muralItems = mural ? cat.contents.filter((x) => x.series_id === mural.id) : [];
  const series = launched.filter((s) => s.kind === 'serie');
  const visible = cat.contents.filter((x) => !x.locked && isLaunched(x.series_id ? byId.get(x.series_id) : null));
  const recent = [...visible].sort((a, b) => b.publish_at.localeCompare(a.publish_at));
  const hero = upcoming[0] ?? series[0];

  if (!cat.series.length && !cat.contents.length) return <Empty leader={c.isLeader} />;

  return (
    <>
      {hero && <SeriesHero s={hero} count={count(hero)} />}
      {mural && (
        <section className="mural">
          <div className="mural-head">
            <span className="kick">Mural de rotina da igreja</span>
            <h2>{mural.title}</h2>
            <p className="muted">{mural.subtitle || monthLabel(mural.month)}</p>
          </div>
          <div className="mural-cols">
            {(['pre', 'pos'] as const).map((ph) => {
              const list = muralItems.filter((x) => x.phase === ph);
              return (
                <div key={ph} className="mural-col">
                  <h3>
                    <span className={`c-phase ${ph}`}>{ph === 'pre' ? 'Antes' : 'Depois'}</span> {PHASE_LABEL[ph]}
                  </h3>
                  {list.length ? list.map((x) => <MuralItem key={x.id} c={x} />) : <p className="muted small">Nenhuma mensagem ainda.</p>}
                </div>
              );
            })}
          </div>
          {muralItems.some((x) => !x.phase) && (
            <div className="c-scroll">
              {muralItems.filter((x) => !x.phase).map((x) => (
                <ContentCard key={x.id} c={x} series={mural} />
              ))}
            </div>
          )}
          <a className="link small" href={`#/mensagens/serie/${mural.id}`}>
            Ver o mural completo <Icon name="chevronRight" size={16} />
          </a>
        </section>
      )}
      <CRow title="Em breve · Lançamentos" count={upcoming.length}>
        {upcoming.map((s) => (
          <SeriesCard key={s.id} s={s} count={count(s)} />
        ))}
      </CRow>
      <CRow title="Séries da igreja" count={series.length}>
        {series.map((s) => (
          <SeriesCard key={s.id} s={s} count={count(s)} />
        ))}
      </CRow>
      <CRow title="Mensagens recentes" count={recent.filter((x) => x.kind === 'mensagem').length}>
        {recent.filter((x) => x.kind === 'mensagem').slice(0, 20).map((x) => (
          <ContentCard key={x.id} c={x} series={x.series_id ? byId.get(x.series_id) : undefined} />
        ))}
      </CRow>
      <CRow title="Vídeos" count={recent.filter((x) => x.kind === 'video').length}>
        {recent.filter((x) => x.kind === 'video').map((x) => (
          <ContentCard key={x.id} c={x} series={x.series_id ? byId.get(x.series_id) : undefined} />
        ))}
      </CRow>
      <CRow title="Podcasts" count={recent.filter((x) => x.kind === 'podcast').length}>
        {recent.filter((x) => x.kind === 'podcast').map((x) => (
          <ContentCard key={x.id} c={x} series={x.series_id ? byId.get(x.series_id) : undefined} />
        ))}
      </CRow>
      <CRow title="Murais anteriores" count={murals.length - (mural ? 1 : 0)}>
        {murals.filter((s) => s !== mural).map((s) => (
          <SeriesCard key={s.id} s={s} count={count(s)} />
        ))}
      </CRow>
    </>
  );
}

function MuralItem({ c }: { c: Content }) {
  return (
    <a className="mural-item" href={`#/mensagens/item/${c.id}`}>
      <b>{c.title}</b>
      {c.summary && <span className="muted small">{c.summary}</span>}
      <small className="muted">
        {c.author ? `${c.author} · ` : ''}
        {fmtDate(c.publish_at)}
      </small>
    </a>
  );
}

function SeriesHero({ s, count }: { s: Series; count: number }) {
  const c = useCommunity();
  const soon = !isLaunched(s);
  return (
    <header className="c-hero" style={{ ['--bg-img' as string]: `url(${s.cover || assetUrl(WELCOME_BACKGROUND)})` }}>
      <div className="c-hero-text">
        <span className="kick">{soon ? 'Lançamento' : s.kind === 'mural' ? 'Mural do mês' : 'Série da igreja'}</span>
        <h1>{s.title}</h1>
        {s.subtitle && <p className="c-hero-sub">{s.subtitle}</p>}
        <p className="muted">{s.author ? `${s.author} · ` : ''}{soon ? `Estreia ${fmtDate(s.launch_at!, true)}` : `${count} ${count === 1 ? 'episódio' : 'episódios'}`}</p>
        {soon && <Countdown to={s.launch_at!} onDone={() => c.refreshCatalog()} />}
        <div className="inline">
          <a className="btn btn-white" href={`#/mensagens/serie/${s.id}`}>
            <Icon name={soon ? 'info' : 'play'} /> {soon ? 'Ver detalhes' : 'Assistir'}
          </a>
          {soon && (
            <button className="btn btn-gray" onClick={() => downloadIcs(`${s.title} · ${APP_NAME}`, s.launch_at!, s.description ?? s.subtitle ?? '', churchLink())}>
              <Icon name="calendar" /> Lembrar-me
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function SeriesPage({ id }: { id: string }) {
  const c = useCommunity();
  const s = c.catalog!.series.find((x) => x.id === id);
  const seasons = useMemo(() => (s ? seasonsOf(s, c.catalog!.contents) : []), [s, c.catalog]);
  const [tab, setTab] = useState(0);
  if (!s) return <NotFound />;
  const soon = !isLaunched(s);
  const season = seasons[Math.min(tab, seasons.length - 1)];
  return (
    <>
      <header className="c-hero series" style={{ ['--bg-img' as string]: `url(${s.cover || assetUrl(WELCOME_BACKGROUND)})` }}>
        <div className="c-hero-text">
          <a className="link" href="#/mensagens">
            <Icon name="back" size={18} /> Mensagens
          </a>
          <span className="kick">{s.kind === 'mural' ? `Mural · ${monthLabel(s.month)}` : soon ? 'Lançamento' : 'Série da igreja'}</span>
          <h1>{s.title}</h1>
          {s.subtitle && <p className="c-hero-sub">{s.subtitle}</p>}
          {s.author && <p className="muted">{s.author}</p>}
          {s.description && <p className="c-desc">{s.description}</p>}
          {soon && (
            <>
              <p className="muted">Estreia em {fmtDate(s.launch_at!, true)}</p>
              <Countdown to={s.launch_at!} onDone={() => c.refreshCatalog()} />
              <button className="btn btn-gray" onClick={() => downloadIcs(`${s.title} · ${APP_NAME}`, s.launch_at!, s.description ?? '', churchLink())}>
                <Icon name="calendar" /> Lembrar-me
              </button>
            </>
          )}
          {c.isLeader && (
            <div className="inline">
              <a className="btn btn-outline sm" href={`#/estudio?serie=${s.id}`}>
                <Icon name="pen" size={16} /> Editar no estúdio
              </a>
            </div>
          )}
        </div>
      </header>
      {seasons.length > 1 && (
        <div className="seg season-tabs" role="tablist">
          {seasons.map((x, i) => (
            <button key={x.n} className={i === tab ? 'on' : ''} onClick={() => setTab(i)} role="tab" aria-selected={i === tab}>
              {x.title}
            </button>
          ))}
        </div>
      )}
      {season ? (
        <ol className="ep-list">
          {season.items.map((x, i) => (
            <li key={x.id}>
              <a href={`#/mensagens/item/${x.id}`} className={x.locked || soon ? 'locked' : ''}>
                <span className="ep-n">{i + 1}</span>
                <span className="ep-thumb">
                  <Thumb src={thumbOf(x, s)} kind={x.kind} title={x.title} />
                  {(x.locked || soon) && <Icon name="lock" size={20} />}
                </span>
                <span className="ep-text">
                  <b>{x.title}</b>
                  <small className="muted">
                    {KIND_LABEL[x.kind]}
                    {x.phase ? ` · ${PHASE_LABEL[x.phase]}` : ''}
                    {x.author ? ` · ${x.author}` : ''}
                  </small>
                  {x.summary && <span className="muted small">{x.summary}</span>}
                </span>
              </a>
            </li>
          ))}
          {!season.items.length && <p className="muted">Os episódios desta temporada aparecem aqui.</p>}
        </ol>
      ) : (
        <p className="muted">Os episódios desta série aparecem aqui.</p>
      )}
    </>
  );
}

function ItemPage({ id }: { id: string }) {
  const c = useCommunity();
  const { toast } = useUI();
  const item = c.catalog!.contents.find((x) => x.id === id);
  if (!item) return <NotFound />;
  const series = item.series_id ? c.catalog!.series.find((s) => s.id === item.series_id) : undefined;
  const siblings = series ? seasonsOf(series, c.catalog!.contents).find((s) => s.n === item.season)?.items ?? [] : [];
  const idx = siblings.findIndex((x) => x.id === item.id);
  const locked = item.locked || (!c.isLeader && !isLaunched(series));
  const refs = item.verses.map((v) => parseRef(v)).filter((r): r is NonNullable<typeof r> => !!r);

  const share = async () => {
    const url = `${churchLink()}#/mensagens/item/${item.id}`;
    const text = `${item.title}${item.author ? ` — ${item.author}` : ''} · ${CHURCH?.nome}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Link copiado');
    } catch {
      toast(url);
    }
  };

  return (
    <article className="c-item">
      <a className="link" href={series ? `#/mensagens/serie/${series.id}` : '#/mensagens'}>
        <Icon name="back" size={18} /> {series ? series.title : 'Mensagens'}
      </a>
      {locked ? (
        <div className="panel c-locked">
          <Icon name="lock" size={34} />
          <h1>{item.title}</h1>
          <p className="muted">Disponível em {fmtDate(series?.launch_at && !isLaunched(series) ? series.launch_at : item.publish_at, true)}</p>
          <Countdown to={series?.launch_at && !isLaunched(series) ? series.launch_at : item.publish_at} onDone={() => c.refreshCatalog()} />
          {item.summary && <p>{item.summary}</p>}
        </div>
      ) : (
        <>
          {item.media_url && (
            <div className="c-media">
              <MediaPlayer url={item.media_url} />
            </div>
          )}
          <header className="c-item-head">
            <span className="kick">
              {KIND_LABEL[item.kind]}
              {series ? ` · ${series.seasons[item.season - 1] || `Temporada ${item.season}`}` : ''}
              {item.phase ? ` · ${PHASE_LABEL[item.phase]}` : ''}
            </span>
            <h1>{item.title}</h1>
            <p className="muted">
              {item.author && (
                <>
                  <b>{item.author}</b>
                  {item.author_role ? ` (${item.author_role})` : ''} ·{' '}
                </>
              )}
              {fmtDate(item.publish_at)}
            </p>
            <div className="inline">
              <button className="btn btn-gray sm" onClick={share}>
                <Icon name="share" size={18} /> Compartilhar
              </button>
              {c.isLeader && (
                <a className="btn btn-outline sm" href={`#/estudio?conteudo=${item.id}`}>
                  <Icon name="pen" size={16} /> Editar
                </a>
              )}
            </div>
          </header>
          {refs.length > 0 && (
            <div className="c-verses">
              <span className="qs-title">Passagens citadas</span>
              <div className="chips">
                {refs.map((r) => (
                  <a key={r.label} className="chip" href={refLink(r)}>
                    <Icon name="book" size={14} /> {r.label}
                  </a>
                ))}
              </div>
            </div>
          )}
          {item.summary && <p className="c-summary">{item.summary}</p>}
          {item.body && <RichText text={item.body} />}
        </>
      )}
      {siblings.length > 1 && (
        <nav className="c-nav">
          {idx > 0 ? (
            <a className="btn btn-outline sm" href={`#/mensagens/item/${siblings[idx - 1].id}`}>
              <Icon name="chevronLeft" size={18} /> {siblings[idx - 1].title}
            </a>
          ) : (
            <span />
          )}
          {idx < siblings.length - 1 && (
            <a className="btn btn-primary sm" href={`#/mensagens/item/${siblings[idx + 1].id}`}>
              Próximo: {siblings[idx + 1].title} <Icon name="chevronRight" size={18} />
            </a>
          )}
        </nav>
      )}
    </article>
  );
}

function NotFound() {
  return (
    <div className="panel c-empty">
      <h2>Conteúdo não encontrado</h2>
      <button className="btn btn-gray" onClick={() => navigate('/mensagens')}>
        Voltar às mensagens
      </button>
    </div>
  );
}

export function Messages({ path }: { path: string[] }) {
  const c = useCommunity();
  if (!c.session)
    return (
      <main className="page messages">
        <CommunityGate title={`Mensagens da ${CHURCH?.nome}`} text="Entre na comunidade da igreja para assistir às séries, mensagens, vídeos e podcasts dos pastores e líderes." />
      </main>
    );
  if (!c.catalog)
    return (
      <main className="page messages">
        {c.catalogError ? (
          <div className="panel c-empty">
            <Icon name="wifiOff" size={30} />
            <p>{c.catalogError}</p>
            <button className="btn btn-gray" onClick={() => c.refreshCatalog()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="spinner" />
        )}
      </main>
    );
  const [kind, id] = path;
  return (
    <main className={`page messages ${kind ? 'detail' : ''}`}>
      {kind === 'serie' && id ? <SeriesPage key={id} id={id} /> : kind === 'item' && id ? <ItemPage key={id} id={id} /> : <Hub />}
    </main>
  );
}

/** Linha "Da igreja" na página inicial: lançamentos e últimos conteúdos. */
export function ChurchContentRow() {
  const c = useCommunity();
  if (!c.session) {
    return (
      <a className="notice-strip join-strip" href="#/mensagens">
        <Icon name="play" size={18} />
        <span>
          <b>Mensagens, séries e podcasts da igreja</b>
          <small> · entre na comunidade para assistir</small>
        </span>
        <Icon name="chevronRight" size={18} />
      </a>
    );
  }
  const cat = c.catalog;
  if (!cat) return null;
  const byId = new Map(cat.series.map((s) => [s.id, s]));
  const upcoming = cat.series.filter((s) => !isLaunched(s));
  const recent = cat.contents
    .filter((x) => !x.locked && isLaunched(x.series_id ? byId.get(x.series_id) : null))
    .sort((a, b) => b.publish_at.localeCompare(a.publish_at))
    .slice(0, 12);
  if (!upcoming.length && !recent.length) return null;
  return (
    <section className="c-row home">
      <h2>
        <a href="#/mensagens">
          Da {CHURCH?.nome} <Icon name="chevronRight" size={18} />
        </a>
      </h2>
      <div className="c-scroll">
        {upcoming.map((s) => (
          <SeriesCard key={s.id} s={s} count={cat.contents.filter((x) => x.series_id === s.id).length} />
        ))}
        {recent.map((x) => (
          <ContentCard key={x.id} c={x} series={x.series_id ? byId.get(x.series_id) : undefined} />
        ))}
      </div>
    </section>
  );
}
