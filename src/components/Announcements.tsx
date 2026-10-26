import { useEffect, useRef, useState } from 'react';
import { COMMUNITY_NAME, externalLink } from '../lib/church';
import { useCommunity, type Announcement } from '../lib/community';
import { nsKey } from '../lib/church';
import { rpc } from '../lib/server';
import { Icon } from './Icon';
import { PostMedia } from './Posts';

/** Anúncios da liderança na tela inicial (banner, texto, vídeo ou áudio), como uma "publi" dentro do app. */

const LS = nsKey('mb:anuncios');

function cached(): Announcement[] {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? '[]') as Announcement[];
  } catch {
    return [];
  }
}

export function useAnnouncements() {
  const c = useCommunity();
  const [list, setList] = useState<Announcement[]>(cached);
  useEffect(() => {
    rpc<Announcement[]>('public_announcements', { p_slug: c.slug })
      .then((l) => {
        setList(l);
        try {
          localStorage.setItem(LS, JSON.stringify(l));
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }, [c.slug]);
  return list;
}

export function AnnouncementCard({ a }: { a: Announcement }) {
  const [playing, setPlaying] = useState(false);
  const internal = a.link?.startsWith('#');
  return (
    <article className={`ann-card ${a.image_url ? '' : 'no-image'}`}>
      <div className="ann-visual">
        {playing && a.media_type && a.media_url ? (
          <PostMedia type={a.media_type} url={a.media_url} />
        ) : a.image_url ? (
          <img src={a.image_url} alt="" loading="lazy" />
        ) : (
          <span className="ann-ph">
            <Icon name="bell" size={30} />
          </span>
        )}
        {!playing && a.media_type && a.media_url && (
          <button className="ann-play" onClick={() => setPlaying(true)} aria-label={a.media_type === 'audio' ? 'Ouvir áudio' : 'Assistir vídeo'}>
            <Icon name={a.media_type === 'audio' ? 'music' : 'play'} size={26} />
          </button>
        )}
        <span className="ann-tag">Anúncio</span>
      </div>
      <div className="ann-text">
        <b>{a.title}</b>
        {a.body && <p>{a.body}</p>}
        <div className="ann-foot">
          {a.author && <small className="muted">{a.author}</small>}
          {a.link && (
            <a className="btn btn-white sm" href={internal ? a.link : externalLink(a.link)} target={internal ? undefined : '_blank'} rel="noreferrer">
              {a.link_label || 'Saiba mais'} <Icon name="chevronRight" size={16} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** Carrossel de anúncios (troca sozinho a cada 7 s). */
export function AnnouncementsCarousel({ list }: { list: Announcement[] }) {
  const [i, setI] = useState(0);
  const hold = useRef(false);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => !hold.current && setI((x) => (x + 1) % list.length), 7000);
    return () => clearInterval(t);
  }, [list.length]);
  if (!list.length) return null;
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <section className="ann-carousel" aria-label={`Anúncios · ${COMMUNITY_NAME}`} onPointerEnter={() => (hold.current = true)} onPointerLeave={() => (hold.current = false)}>
      <h2 className="row-title">Anúncios</h2>
      <AnnouncementCard key={cur.id} a={cur} />
      {list.length > 1 && (
        <div className="ann-dots">
          <button className="icon-btn" onClick={() => setI((x) => (x - 1 + list.length) % list.length)} aria-label="Anúncio anterior">
            <Icon name="chevronLeft" size={18} />
          </button>
          {list.map((a, k) => (
            <button key={a.id} className={`dot ${k === i ? 'on' : ''}`} onClick={() => setI(k)} aria-label={`Anúncio ${k + 1}`} />
          ))}
          <button className="icon-btn" onClick={() => setI((x) => (x + 1) % list.length)} aria-label="Próximo anúncio">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
