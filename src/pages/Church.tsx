import { useMemo, useState } from 'react';
import { BrandMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useUI } from '../components/ui';
import { WELCOME_BACKGROUND } from '../data/customArt';
import { APP_NAME } from '../lib/brand';
import {
  CHURCH,
  churchLink,
  dayLabel,
  externalLink,
  instagramLink,
  planDays,
  planTodayIndex,
  whatsappLink,
  type ChurchConfig,
  type PlanDay,
  type ReadingPlan,
} from '../lib/church';
import { useMusic } from '../lib/music';
import { assetUrl } from '../lib/paintings';
import { navigate } from '../lib/router';
import { useProfile, type Profile } from '../lib/store';

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) => d.toLocaleDateString('pt-BR', opts);

function isRead(profile: Profile, day: PlanDay) {
  return day.items.every((it) => profile.progress[it.book.id]?.read.includes(it.chapter));
}

export interface PlanStatus {
  days: PlanDay[];
  index: number;
  today?: PlanDay;
  done: number;
  total: number;
  readChapters: number;
  totalChapters: number;
}

export function usePlan(plan: ReadingPlan | undefined, profile: Profile): PlanStatus | null {
  return useMemo(() => {
    if (!plan?.livros?.length) return null;
    const days = planDays(plan);
    if (!days.length) return null;
    const index = planTodayIndex(plan);
    const today = index >= 0 && index < days.length ? days[index] : undefined;
    const all = days.flatMap((d) => d.items);
    const readChapters = all.filter((it) => profile.progress[it.book.id]?.read.includes(it.chapter)).length;
    return { days, index, today, done: days.filter((d) => isRead(profile, d)).length, total: days.length, readChapters, totalChapters: all.length };
  }, [plan, profile.progress]);
}

export function readDay(profile: Profile, day: PlanDay) {
  const next = day.items.find((it) => !profile.progress[it.book.id]?.read.includes(it.chapter)) ?? day.items[0];
  navigate(`/read/${next.book.id}/${next.chapter}`);
}

/** Card do plano de leitura (usado na página da igreja e no início). */
export function PlanCard({ church, compact = false }: { church: ChurchConfig; compact?: boolean }) {
  const profile = useProfile();
  const st = usePlan(church.plano, profile);
  if (!church.plano || !st) return null;
  const plan = church.plano;
  const pctRead = st.totalChapters ? st.readChapters / st.totalChapters : 0;
  const before = st.index < 0;
  const after = st.index >= st.total;
  const pending = st.days.slice(0, Math.max(0, Math.min(st.index, st.total))).filter((d) => !isRead(profile, d));
  const target = st.today ?? (before ? st.days[0] : pending[0] ?? st.days[st.total - 1]);
  const todayRead = st.today ? isRead(profile, st.today) : false;

  return (
    <section className={`plan-card ${compact ? 'compact' : ''}`}>
      <div className="plan-head">
        <span className="kick">
          <Icon name="calendar" size={14} /> Plano de leitura da igreja
        </span>
        <h2>{plan.titulo}</h2>
        {!compact && plan.descricao && <p className="muted">{plan.descricao}</p>}
      </div>
      <div className="plan-today">
        <div>
          <span className="muted small">
            {before
              ? `Começa em ${fmt(st.days[0].date, { day: '2-digit', month: 'long' })}`
              : after
                ? 'Plano concluído pela igreja'
                : `Hoje · Dia ${st.index + 1} de ${st.total}`}
          </span>
          <b className="plan-ref">{dayLabel(target)}</b>
          {pending.length > 0 && !after && <span className="plan-late">{pending.length} dia(s) para colocar em dia</span>}
        </div>
        <button className={`btn ${todayRead ? 'btn-gray' : 'btn-primary'}`} onClick={() => readDay(profile, target)}>
          <Icon name={todayRead ? 'check' : 'play'} /> {todayRead ? 'Lido hoje' : before ? 'Ler 1º dia' : 'Ler agora'}
        </button>
      </div>
      <div className="plan-progress">
        <div className="bar">
          <i style={{ width: `${Math.round(pctRead * 100)}%` }} />
        </div>
        <span className="muted small">
          {st.readChapters}/{st.totalChapters} capítulos · {Math.round(pctRead * 100)}%
        </span>
      </div>
      {compact && (
        <a className="link small" href="#/igreja">
          Ver plano completo e avisos <Icon name="chevronRight" size={16} />
        </a>
      )}
    </section>
  );
}

function PlanSchedule({ church }: { church: ChurchConfig }) {
  const profile = useProfile();
  const st = usePlan(church.plano, profile);
  const [all, setAll] = useState(false);
  if (!st) return null;
  const from = Math.max(0, Math.min(st.index, st.total - 1) - 2);
  const list = all ? st.days : st.days.slice(from, from + 7);
  return (
    <section className="panel">
      <div className="page-head">
        <h2>Cronograma</h2>
        <button className="chip" onClick={() => setAll((v) => !v)}>
          {all ? 'Mostrar menos' : `Ver os ${st.total} dias`}
        </button>
      </div>
      <ol className="plan-days">
        {list.map((d) => {
          const read = isRead(profile, d);
          return (
            <li key={d.day} className={`${read ? 'read' : ''} ${d.day - 1 === st.index ? 'today' : ''}`}>
              <button onClick={() => readDay(profile, d)}>
                <span className="pd-check">{read ? <Icon name="check" size={16} /> : d.day}</span>
                <span className="pd-date">{fmt(d.date, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                <span className="pd-ref">{dayLabel(d)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function inviteText() {
  return `Baixe o app da ${CHURCH?.nome}: ${APP_NAME}. Vamos maratonar a Bíblia juntos! ${churchLink()}`;
}

export function Church() {
  const church = CHURCH;
  const music = useMusic();
  const { toast } = useUI();
  if (!church) {
    navigate('/browse', true);
    return null;
  }
  const c = church.contato ?? {};
  const avisos = [...(church.avisos ?? [])].sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999'));
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = avisos.filter((a) => !a.data || a.data >= todayIso);
  const past = avisos.filter((a) => a.data && a.data < todayIso).reverse().slice(0, 3);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      toast(text);
    }
  };

  const invite = async () => {
    const text = inviteText();
    if (navigator.share) {
      try {
        await navigator.share({ title: APP_NAME, text, url: churchLink() });
        return;
      } catch {
        /* cancelado: copia */
      }
    }
    copy(text, 'Convite copiado');
  };

  return (
    <main className="page church-page">
      <header className="page-banner church-banner" style={{ ['--bg-img' as string]: `url(${assetUrl(WELCOME_BACKGROUND)})` }}>
        <BrandMark size={96} className="church-banner-logo" />
        <div>
          <span className="kick">{church.cidade ?? 'Nossa igreja'}</span>
          <h1 className="page-title">{church.nome}</h1>
          {church.pastor && <p className="muted">{church.pastor}</p>}
          {church.boasVindas && <p className="church-welcome">{church.boasVindas}</p>}
          <div className="inline">
            <button className="btn btn-white sm" onClick={invite}>
              <Icon name="share" size={18} /> Convidar alguém
            </button>
            <a className="btn btn-whats sm" href={`https://wa.me/?text=${encodeURIComponent(inviteText())}`} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={18} /> Enviar no WhatsApp
            </a>
          </div>
        </div>
      </header>

      <div className="church-grid">
        <div className="church-col">
          <PlanCard church={church} />
          <PlanSchedule church={church} />

          {(upcoming.length > 0 || past.length > 0) && (
            <section className="panel">
              <h2>
                <Icon name="bell" size={20} /> Avisos
              </h2>
              <div className="notices">
                {[...upcoming, ...past].map((a, i) => (
                  <article key={i} className={`notice ${a.data && a.data < todayIso ? 'past' : ''}`}>
                    {a.data && (
                      <span className="notice-date">
                        <b>{a.data.slice(8, 10)}</b>
                        {fmt(new Date(`${a.data}T12:00:00`), { month: 'short' }).replace('.', '')}
                      </span>
                    )}
                    <div>
                      <h3>{a.titulo}</h3>
                      {a.texto && <p className="muted">{a.texto}</p>}
                      {a.link && (
                        <a className="link small" href={externalLink(a.link)} target="_blank" rel="noreferrer">
                          Saiba mais ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="church-col">
          {!!church.cultos?.length && (
            <section className="panel">
              <h2>
                <Icon name="church" size={20} /> Cultos e reuniões
              </h2>
              <ul className="services">
                {church.cultos.map((s, i) => (
                  <li key={i}>
                    <b>{s.dia}</b>
                    <span>{s.hora}</span>
                    {s.nome && <small className="muted">{s.nome}</small>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!church.playlists?.length && (
            <section className="panel">
              <h2>
                <Icon name="music" size={20} /> Louvores da igreja
              </h2>
              <div className="presets">
                {church.playlists.map((p) => (
                  <button key={p.url} className={`preset ${music.url === p.url ? 'on' : ''}`} onClick={() => (music.url === p.url && music.current ? music.toggle() : music.load(p.url))}>
                    <span className="preset-icon">
                      <Icon name={music.url === p.url && music.playing ? 'pause' : 'play'} size={18} />
                    </span>
                    <span>
                      <b>{p.nome}</b>
                      {p.descricao && <small>{p.descricao}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <h2>
              <Icon name="pin" size={20} /> Contato
            </h2>
            <div className="contact-list">
              {c.whatsapp && (
                <a href={whatsappLink(c.whatsapp, `Olá! Vim pelo app ${APP_NAME}.`)} target="_blank" rel="noreferrer">
                  <Icon name="whatsapp" /> WhatsApp da igreja
                </a>
              )}
              {c.instagram && (
                <a href={instagramLink(c.instagram)} target="_blank" rel="noreferrer">
                  <Icon name="instagram" /> {c.instagram.startsWith('http') ? 'Instagram' : `@${c.instagram.replace(/^@/, '')}`}
                </a>
              )}
              {c.youtube && (
                <a href={externalLink(c.youtube)} target="_blank" rel="noreferrer">
                  <Icon name="youtube" /> Canal no YouTube
                </a>
              )}
              {c.site && (
                <a href={externalLink(c.site)} target="_blank" rel="noreferrer">
                  <Icon name="globe" /> {c.site.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`}>
                  <Icon name="mail" /> {c.email}
                </a>
              )}
              {c.endereco && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.endereco)}`} target="_blank" rel="noreferrer">
                  <Icon name="pin" /> {c.endereco}
                </a>
              )}
              {c.pix && (
                <button onClick={() => copy(c.pix!, 'Chave Pix copiada')}>
                  <Icon name="copy" />
                  <span className="pix">
                    Pix (dízimos e ofertas): <b>{c.pix}</b>
                  </span>
                </button>
              )}
              {!Object.values(c).some(Boolean) && <p className="muted small">A igreja ainda não informou contatos.</p>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
