import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { useUI } from '../components/ui';
import { Art } from '../components/Art';
import { getBook } from '../data/books';
import { avatarUrl } from '../lib/art';
import { APP_NAME } from '../lib/brand';
import { CHURCH, whatsappLink } from '../lib/church';
import { relTime, ROLE_LABEL, useCommunity, type MemberProfile as Profile } from '../lib/community';
import { navigate } from '../lib/router';
import { describe, RoleBadge } from './Community';
import { Heatmap } from './Stats';

/** Perfil de um irmão: rotina de leitura (maratona), séries em andamento, atividades e botão de conversa. */
export function MemberProfile({ id }: { id: string }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setData(null);
    c.call<Profile>('member_profile', { p_member: id })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <div className="panel c-empty">
        <p>{error}</p>
        <a className="btn btn-gray" href="#/comunidade?aba=irmaos">
          Voltar
        </a>
      </div>
    );
  if (!data) return <div className="spinner" />;

  const m = data.member;
  const s = data.stats;
  const me = m.id === c.member?.id;
  const phone = (m.login ?? '').replace(/\D/g, '');
  const planPct = s?.plan_total ? Math.round((s.plan_read / s.plan_total) * 100) : null;
  const books = Object.entries(s?.detail?.books ?? {})
    .map(([bid, n]) => ({ book: getBook(bid), n }))
    .filter((x): x is { book: NonNullable<ReturnType<typeof getBook>>; n: number } => !!x.book && x.n > 0);
  const order = (s?.detail?.recent ?? []).map((r) => r.book);
  books.sort((a, b) => (order.indexOf(a.book.id) + 1 || 99) - (order.indexOf(b.book.id) + 1 || 99));
  const watching = books.filter((x) => x.n < x.book.chapters);
  const done = books.filter((x) => x.n >= x.book.chapters);

  const chat = async () => {
    setOpening(true);
    try {
      const cid = await c.call<string>('open_direct', { p_member: m.id });
      navigate(`/comunidade/conversa/${cid}`);
    } catch (e) {
      toast((e as Error).message);
      setOpening(false);
    }
  };

  return (
    <div className="member-profile">
      <a className="link" href="#/comunidade?aba=irmaos">
        <Icon name="back" size={18} /> Irmãos
      </a>
      <header className="mp-head">
        <img src={avatarUrl(m.avatar)} alt="" />
        <div>
          <h1>
            {m.name} <RoleBadge role={m.role} />
          </h1>
          <p className="muted">
            {m.grp ? `${m.grp} · ` : ''}
            {ROLE_LABEL[m.role]} desde {new Date(m.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · ativo {relTime(m.last_seen)}
          </p>
          <div className="inline">
            {!me && (
              <button className="btn btn-primary sm" onClick={chat} disabled={opening}>
                <Icon name="letter" size={18} /> Enviar mensagem
              </button>
            )}
            {!me && c.isLeader && phone.length >= 10 && (
              <a className="btn btn-whats sm" href={whatsappLink(phone, `Olá, ${m.name}! Aqui é da ${CHURCH?.nome}, pelo ${APP_NAME}.`)} target="_blank" rel="noreferrer">
                <Icon name="whatsapp" size={18} /> WhatsApp
              </a>
            )}
            {me && (
              <a className="btn btn-gray sm" href="#/stats">
                <Icon name="chart" size={18} /> Minha maratona completa
              </a>
            )}
          </div>
        </div>
      </header>

      {!data.visible ? (
        <div className="panel c-empty">
          <Icon name="lock" size={30} />
          <h2>Rotina privada</h2>
          <p className="muted">{m.name} preferiu não mostrar as leituras para os irmãos. Você ainda pode enviar uma mensagem.</p>
        </div>
      ) : !s ? (
        <p className="muted">{m.name} ainda não sincronizou nenhuma leitura.</p>
      ) : (
        <>
          <div className="kpis">
            <div>
              <b>{s.total}</b>
              <span>capítulos lidos</span>
            </div>
            <div>
              <b>
                {s.streak} <Icon name="flame" size={22} />
              </b>
              <span>dias seguidos</span>
            </div>
            <div>
              <b>{s.last7}</b>
              <span>capítulos nos últimos 7 dias</span>
            </div>
            <div>
              <b>{s.books_done}</b>
              <span>séries concluídas</span>
            </div>
            {planPct != null && (
              <div>
                <b>{planPct}%</b>
                <span>do plano {CHURCH?.plano ? `“${CHURCH.plano.titulo}”` : 'da igreja'}</span>
              </div>
            )}
            <div>
              <b>{s.devotionals}</b>
              <span>devocionais</span>
            </div>
          </div>

          <section className="panel">
            <h2>Rotina de leitura · últimas 12 semanas</h2>
            <Heatmap activity={s.detail?.days ?? {}} goal={3} weeks={12} />
            <p className="muted small">
              {s.last_ref ? (
                <>
                  Última leitura: <b>{s.last_ref}</b> · {relTime(s.last_read_at)}
                </>
              ) : (
                'Sem leituras registradas.'
              )}
            </p>
          </section>

          {watching.length > 0 && (
            <section className="mp-row">
              <h2>Maratonando agora</h2>
              <div className="c-scroll">
                {watching.map(({ book, n }) => (
                  <a key={book.id} className="mp-book" href={`#/comunidade/membro/${m.id}?title=${book.id}`}>
                    <span className="mp-poster">
                      <Art book={book} kind="poster" />
                    </span>
                    <span className="c-title">{book.name}</span>
                    <span className="mp-bar">
                      <i style={{ width: `${Math.round((n / book.chapters) * 100)}%` }} />
                    </span>
                    <small className="muted">
                      {n} de {book.chapters} capítulos
                    </small>
                  </a>
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section className="mp-row">
              <h2>Séries concluídas</h2>
              <div className="chips">
                {done.map(({ book }) => (
                  <span key={book.id} className="chip on">
                    <Icon name="check" size={14} /> {book.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {!!data.activity?.length && (
            <section className="panel">
              <h2>Atividades recentes</h2>
              <ol className="mp-activity">
                {data.activity.map((a) => {
                  const d = describe(a);
                  return (
                    <li key={a.id}>
                      <Icon name={d.icon} size={16} />
                      <span>{d.href ? <a href={d.href}>{d.text}</a> : d.text}</span>
                      <small className="muted">{relTime(a.created_at)}</small>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
