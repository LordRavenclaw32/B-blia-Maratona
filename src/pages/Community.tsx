import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommunityGate } from '../components/CommunityGate';
import { Icon } from '../components/Icon';
import { useUI } from '../components/ui';
import { avatarUrl } from '../lib/art';
import { APP_NAME } from '../lib/brand';
import { CHURCH, COMMUNITY_NAME, whatsappLink } from '../lib/church';
import { relTime, ROLE_LABEL, useCommunity, type CommunityMember, type FeedItem, type Post, type Role } from '../lib/community';
import { Composer, PostCard } from '../components/Posts';
import { useRoute, setQuery } from '../lib/router';
import { Chat, ConversationList } from './Conversations';
import { MemberProfile } from './MemberProfile';

/** Relacionamentos: atividades dos irmãos, lista de membros, acompanhamento (líderes) e gestão (pastor). */

type Tab = 'atividades' | 'conversas' | 'irmaos' | 'acompanhamento' | 'gestao';

export function describe(f: Pick<FeedItem, 'kind' | 'data'>): { text: React.ReactNode; href?: string; icon: string } {
  const d = f.data as Record<string, string | number | null>;
  switch (f.kind) {
    case 'join':
      return { text: 'entrou na comunidade. Seja bem-vindo(a)!', icon: 'user' };
    case 'read':
      return { text: <>leu <b>{d.ref}</b></>, href: d.book ? `#/browse?title=${d.book}` : undefined, icon: 'book' };
    case 'complete':
      return { text: <>concluiu a série <b>{d.name}</b> 🎉</>, href: `#/browse?title=${d.book}`, icon: 'trophy' };
    case 'devotional':
      return { text: <>escreveu uma devocional: <b>“{d.title}”</b>{d.verse ? ` · ${d.verse}` : ''}</>, icon: 'pen' };
    case 'streak':
      return { text: <>está há <b>{d.days} dias seguidos</b> lendo a Bíblia 🔥</>, icon: 'flame' };
    case 'launch': {
      const future = d.launch_at && new Date(String(d.launch_at)).getTime() > Date.now();
      return {
        text: <>{future ? 'anunciou o lançamento da série' : 'lançou a série'} <b>{d.title}</b>{future ? ` · estreia ${new Date(String(d.launch_at)).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</>,
        href: `#/mensagens/serie/${d.series}`,
        icon: 'star',
      };
    }
    case 'content':
      return { text: <>publicou {d.kind === 'video' ? 'o vídeo' : d.kind === 'podcast' ? 'o podcast' : 'a mensagem'} <b>{d.title}</b></>, href: `#/mensagens/item/${d.content}`, icon: d.kind === 'podcast' ? 'music' : 'play' };
    default:
      return { text: 'teve uma atividade', icon: 'info' };
  }
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'member') return null;
  return <span className={`role-badge ${role}`}>{ROLE_LABEL[role]}</span>;
}

/** Linha de atividade automática (leituras, séries concluídas, lançamentos…). */
function ActivityItem({ f, onAmen }: { f: FeedItem; onAmen: (f: FeedItem) => void }) {
  const d = describe(f);
  return (
    <li className={`feed-item k-${f.kind}`}>
      <a href={`#/comunidade/membro/${f.member_id}`} aria-label={`Perfil de ${f.name}`}>
        <img src={avatarUrl(f.avatar)} alt="" />
      </a>
      <div className="feed-body">
        <p>
          <a className="feed-name" href={`#/comunidade/membro/${f.member_id}`}>
            <b>{f.name}</b>
          </a>{' '}
          <RoleBadge role={f.role} /> {d.href ? <a href={d.href}>{d.text}</a> : d.text}
        </p>
        <div className="feed-foot">
          <span className="muted small">
            <Icon name={d.icon} size={14} /> {relTime(f.created_at)}
          </span>
          <button className={`amen ${f.mine ? 'on' : ''}`} onClick={() => onAmen(f)} aria-pressed={f.mine}>
            🙏 Amém{f.amens ? ` · ${f.amens}` : ''}
          </button>
        </div>
      </div>
    </li>
  );
}

type Filter = 'tudo' | 'publicacoes' | 'atividades';

/** Feed da comunidade: publicações dos irmãos (devocionais, estudos, orações…) e atividades de leitura. */
function Feed() {
  const c = useCommunity();
  const { openDevotional } = useUI();
  const [acts, setActs] = useState<FeedItem[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [more, setMore] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('tudo');

  const load = useCallback(
    async (older = false) => {
      try {
        const lastAct = older && acts?.length ? acts[acts.length - 1].id : null;
        const lastPost = older && posts?.length ? posts[posts.length - 1].created_at : null;
        const [a, p] = await Promise.all([c.call<FeedItem[]>('feed', { p_before: lastAct }), c.call<Post[]>('posts_feed', { p_before: lastPost, p_member: null })]);
        setActs((cur) => (older ? [...(cur ?? []), ...a] : a));
        setPosts((cur) => (older ? [...(cur ?? []), ...p] : p));
        setMore(a.length === 40 || p.length === 25);
        setError('');
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [c.call, acts, posts],
  );

  useEffect(() => {
    c.syncNow().finally(() => load());
    const onPost = (e: Event) => setPosts((cur) => [(e as CustomEvent<Post>).detail, ...(cur ?? [])]);
    window.addEventListener('bf:post', onPost);
    return () => window.removeEventListener('bf:post', onPost);
  }, []);

  const amen = async (f: FeedItem) => {
    setActs((cur) => cur!.map((x) => (x.id === f.id ? { ...x, mine: !x.mine, amens: x.amens + (x.mine ? -1 : 1) } : x)));
    try {
      const n = await c.call<number>('react', { p_activity: f.id });
      setActs((cur) => cur!.map((x) => (x.id === f.id ? { ...x, amens: n } : x)));
    } catch {
      load();
    }
  };

  const inspire = (p: Post) =>
    openDevotional({ bookId: p.book ?? undefined, verse: p.verse ?? undefined, inspired: { postId: p.id, name: p.member.name, title: p.title ?? null } });

  if (error) return <p className="error">{error}</p>;
  if (!acts || !posts) return <div className="spinner" />;
  type Entry = { at: string; post?: Post; act?: FeedItem };
  const entries: Entry[] = [
    ...(filter !== 'atividades' ? posts.map((p) => ({ at: p.created_at, post: p })) : []),
    ...(filter !== 'publicacoes' ? acts.map((a) => ({ at: a.created_at, act: a })) : []),
  ].sort((x, y) => y.at.localeCompare(x.at));

  return (
    <>
      <Composer onPosted={(p) => setPosts((cur) => [p, ...(cur ?? [])])} />
      <div className="chips feed-filter">
        {(
          [
            ['tudo', 'Tudo'],
            ['publicacoes', 'Publicações'],
            ['atividades', 'Leituras e atividades'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button key={k} className={`chip sm ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      {!entries.length && <p className="muted">Nada por aqui ainda. Que tal publicar a primeira devocional?</p>}
      <ol className="feed">
        {entries.map((e) =>
          e.post ? (
            <li key={`p${e.post.id}`} className="feed-post">
              <PostCard
                post={e.post}
                onChange={(np) => setPosts((cur) => cur!.map((x) => (x.id === np.id ? np : x)))}
                onRemove={(id) => setPosts((cur) => cur!.filter((x) => x.id !== id))}
                onInspire={inspire}
              />
            </li>
          ) : (
            <ActivityItem key={`a${e.act!.id}`} f={e.act!} onAmen={amen} />
          ),
        )}
      </ol>
      {more && (
        <button className="btn btn-outline sm feed-more" onClick={() => load(true)}>
          Carregar mais
        </button>
      )}
    </>
  );
}

function useMembers() {
  const c = useCommunity();
  const [list, setList] = useState<CommunityMember[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    c.call<CommunityMember[]>('community')
      .then((l) => (setList(l), setError('')))
      .catch((e: Error) => setError(e.message));
  }, [c.call]);
  useEffect(() => {
    c.syncNow().finally(reload);
  }, [reload]);
  return { list, error, reload };
}

function Brothers() {
  const { list, error } = useMembers();
  const c = useCommunity();
  if (error) return <p className="error">{error}</p>;
  if (!list) return <div className="spinner" />;
  return (
    <div className="brothers">
      {list.map((m) => (
        <a key={m.id} href={`#/comunidade/membro/${m.id}`} className={`brother ${m.id === c.member?.id ? 'me' : ''}`}>
          <img src={avatarUrl(m.avatar)} alt="" />
          <div>
            <b>
              {m.name} <RoleBadge role={m.role} />
            </b>
            <small className="muted">{m.grp ?? 'Membro desde ' + new Date(m.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</small>
          </div>
          {m.total != null ? (
            <div className="brother-stats">
              <span title="Capítulos lidos">
                <Icon name="book" size={14} /> {m.total}
              </span>
              <span title="Dias seguidos">
                <Icon name="flame" size={14} /> {m.streak ?? 0}
              </span>
            </div>
          ) : (
            <small className="muted">privado</small>
          )}
        </a>
      ))}
    </div>
  );
}

type Status = 'em-dia' | 'atencao' | 'inativo';
function statusOf(m: CommunityMember): Status {
  if (!m.last_read_at) return 'inativo';
  const days = (Date.now() - new Date(m.last_read_at).getTime()) / 86400000;
  return days <= 2 ? 'em-dia' : days <= 7 ? 'atencao' : 'inativo';
}
const STATUS_LABEL: Record<Status, string> = { 'em-dia': 'Em dia', atencao: 'Atenção', inativo: 'Inativo' };

function FollowUp() {
  const { list, error } = useMembers();
  const [grp, setGrp] = useState('');
  const [st, setSt] = useState<Status | ''>('');
  const groups = useMemo(() => [...new Set((list ?? []).map((m) => m.grp).filter(Boolean) as string[])].sort(), [list]);
  if (error) return <p className="error">{error}</p>;
  if (!list) return <div className="spinner" />;
  const rows = list.filter((m) => (!grp || m.grp === grp) && (!st || statusOf(m) === st));
  const active = list.filter((m) => statusOf(m) !== 'inativo').length;
  const weekAvg = list.length ? list.reduce((s, m) => s + (m.last7 ?? 0), 0) / list.length : 0;
  const plan = list.filter((m) => m.plan_total).map((m) => (m.plan_read ?? 0) / (m.plan_total || 1));
  const planAvg = plan.length ? plan.reduce((a, b) => a + b, 0) / plan.length : 0;

  const csv = () => {
    const head = ['Nome', 'Contato', 'Grupo', 'Papel', 'Situação', 'Capítulos 7 dias', 'Sequência', 'Plano lido', 'Plano total', 'Total lido', 'Livros concluídos', 'Devocionais', 'Última leitura', 'Quando'];
    const lines = rows.map((m) =>
      [m.name, m.login ?? '', m.grp ?? '', ROLE_LABEL[m.role], STATUS_LABEL[statusOf(m)], m.last7 ?? 0, m.streak ?? 0, m.plan_read ?? 0, m.plan_total ?? 0, m.total ?? 0, m.books_done ?? 0, m.devotionals ?? 0, m.last_ref ?? '', m.last_read_at ? new Date(m.last_read_at).toLocaleString('pt-BR') : '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `acompanhamento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <div className="kpis">
        <div>
          <b>{list.length}</b>
          <span>membros</span>
        </div>
        <div>
          <b>{active}</b>
          <span>leram nos últimos 7 dias</span>
        </div>
        <div>
          <b>{weekAvg.toFixed(1)}</b>
          <span>capítulos por pessoa na semana</span>
        </div>
        {CHURCH?.plano && (
          <div>
            <b>{Math.round(planAvg * 100)}%</b>
            <span>do plano “{CHURCH.plano.titulo}”</span>
          </div>
        )}
      </div>
      <div className="toolbar">
        <div className="chips">
          {(['', 'em-dia', 'atencao', 'inativo'] as const).map((s) => (
            <button key={s || 'todos'} className={`chip ${st === s ? 'on' : ''}`} onClick={() => setSt(s)}>
              {s ? STATUS_LABEL[s] : 'Todos'} ({s ? list.filter((m) => statusOf(m) === s).length : list.length})
            </button>
          ))}
        </div>
        <div className="inline">
          {groups.length > 0 && (
            <select value={grp} onChange={(e) => setGrp(e.target.value)} aria-label="Grupo">
              <option value="">Todos os grupos</option>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          )}
          <button className="btn btn-gray sm" onClick={csv}>
            <Icon name="download" size={16} /> Exportar planilha
          </button>
        </div>
      </div>
      <div className="follow-table" role="table">
        <div className="ft-row ft-head" role="row">
          <span>Membro</span>
          <span>Situação</span>
          <span>7 dias</span>
          <span>Sequência</span>
          <span>Plano</span>
          <span>Última leitura</span>
          <span />
        </div>
        {rows.map((m) => {
          const s = statusOf(m);
          const planPct = m.plan_total ? Math.round(((m.plan_read ?? 0) / m.plan_total) * 100) : null;
          const phone = (m.login ?? '').replace(/\D/g, '');
          return (
            <div key={m.id} className="ft-row" role="row">
              <a className="ft-name" href={`#/comunidade/membro/${m.id}`}>
                <img src={avatarUrl(m.avatar)} alt="" />
                <span>
                  <b>{m.name}</b> <RoleBadge role={m.role} />
                  <small className="muted">{m.grp ?? m.login}</small>
                </span>
              </a>
              <span>
                <span className={`status ${s}`}>{STATUS_LABEL[s]}</span>
              </span>
              <span data-label="7 dias">{m.last7 ?? 0} cap.</span>
              <span data-label="Sequência">
                <Icon name="flame" size={14} /> {m.streak ?? 0}
              </span>
              <span data-label="Plano">
                {planPct == null ? '—' : (
                  <span className="mini-bar" title={`${m.plan_read}/${m.plan_total} capítulos`}>
                    <i style={{ width: `${planPct}%` }} />
                    <small>{planPct}%</small>
                  </span>
                )}
              </span>
              <span data-label="Última leitura" className="small">
                {m.last_ref ? <>{m.last_ref} · </> : null}
                <span className="muted">{relTime(m.last_read_at)}</span>
              </span>
              <span>
                {phone.length >= 10 && (
                  <a
                    className="icon-btn whats"
                    href={whatsappLink(phone, s === 'em-dia' ? `Olá, ${m.name}! Que alegria ver sua constância na leitura da Palavra no ${APP_NAME}. Continue firme!` : `Olá, ${m.name}! Sentimos sua falta na leitura bíblica no ${APP_NAME}. Vamos juntos colocar em dia? Estou orando por você.`)}
                    target="_blank"
                    rel="noreferrer"
                    title="Mandar mensagem no WhatsApp"
                  >
                    <Icon name="whatsapp" size={20} />
                  </a>
                )}
              </span>
            </div>
          );
        })}
        {!rows.length && <p className="muted">Nenhum membro neste filtro.</p>}
      </div>
    </>
  );
}

function Management() {
  const c = useCommunity();
  const { toast } = useUI();
  const { list, error, reload } = useMembers();
  const [codes, setCodes] = useState<{ pastor_code: string; leader_code: string } | null>(null);
  if (error) return <p className="error">{error}</p>;
  if (!list) return <div className="spinner" />;

  const act = async (fn: string, args: Record<string, unknown>, msg: string) => {
    try {
      await c.call(fn, args);
      toast(msg);
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <>
      <section className="panel">
        <h2>
          <Icon name="key" size={20} /> Códigos de acesso da liderança
        </h2>
        <p className="muted small">
          Membros entram com o celular/e-mail e PIN. Para virar <b>líder</b> ou <b>pastor</b>, a pessoa usa o código em “Relacionamentos → Meu perfil”. Gere novos códigos para invalidar os
          antigos.
        </p>
        {codes ? (
          <div className="codes">
            {(
              [
                ['Pastor(a)', codes.pastor_code],
                ['Líder', codes.leader_code],
              ] as const
            ).map(([label, code]) => (
              <button key={label} className="code-box" onClick={() => navigator.clipboard?.writeText(code).then(() => toast('Código copiado'))}>
                <small>{label}</small>
                <b>{code.replace(/(.{5})/, '$1-')}</b>
                <Icon name="copy" size={16} />
              </button>
            ))}
            <p className="muted tiny">Anote agora: por segurança, os códigos não ficam visíveis depois.</p>
          </div>
        ) : (
          <button
            className="btn btn-gray sm"
            onClick={async () => {
              if (!confirm('Gerar novos códigos? Os códigos atuais deixam de funcionar.')) return;
              try {
                setCodes(await c.call('rotate_codes'));
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          >
            <Icon name="refresh" size={16} /> Gerar novos códigos
          </button>
        )}
      </section>
      <section className="panel">
        <h2>
          <Icon name="user" size={20} /> Membros e níveis de acesso
        </h2>
        <div className="manage-list">
          {list.map((m) => (
            <div key={m.id} className="manage-row">
              <img src={avatarUrl(m.avatar)} alt="" />
              <span className="manage-name">
                <b>{m.name}</b>
                <small className="muted">{m.login}</small>
              </span>
              {m.id === c.member?.id ? (
                <span className="role-badge pastor">Você</span>
              ) : (
                <>
                  <select value={m.role} onChange={(e) => act('set_role', { p_member: m.id, p_role: e.target.value }, `${m.name}: ${ROLE_LABEL[e.target.value as Role]}`)} aria-label={`Papel de ${m.name}`}>
                    <option value="member">Membro</option>
                    <option value="leader">Líder</option>
                    <option value="pastor">Pastor(a)</option>
                  </select>
                  <button
                    className="icon-btn"
                    title="Redefinir PIN"
                    onClick={() => {
                      const pin = prompt(`Novo PIN para ${m.name} (4 a 8 dígitos):`)?.replace(/\D/g, '');
                      if (pin && pin.length >= 4) act('reset_member_pin', { p_member: m.id, p_pin: pin }, 'PIN redefinido');
                    }}
                  >
                    <Icon name="key" size={18} />
                  </button>
                  <button className="icon-btn" title="Remover da comunidade" onClick={() => confirm(`Remover ${m.name} da comunidade?`) && act('remove_member', { p_member: m.id }, 'Membro removido')}>
                    <Icon name="trash" size={18} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function MyCard() {
  const c = useCommunity();
  const { toast } = useUI();
  const m = c.member!;
  const [grp, setGrp] = useState(m.grp ?? '');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <aside className="panel my-card">
      <div className="my-head">
        <img src={avatarUrl(m.avatar)} alt="" />
        <div>
          <b>{m.name}</b>
          <span className={`role-badge ${m.role}`}>{ROLE_LABEL[m.role]}</span>
        </div>
        <button className="icon-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Meu perfil na comunidade">
          <Icon name={open ? 'close' : 'settings'} size={20} />
        </button>
      </div>
      {open && (
        <div className="my-body">
          <label className="check small">
            <input type="checkbox" checked={m.share_activity} onChange={(e) => c.updateMe({ share: e.target.checked }).catch((err: Error) => toast(err.message))} />
            <span>Mostrar minhas leituras e devocionais para os irmãos</span>
          </label>
          <label className="field">
            <span>Grupo / célula / ministério</span>
            <div className="inline">
              <input value={grp} onChange={(e) => setGrp(e.target.value)} placeholder="Ex.: Célula Esperança" maxLength={40} />
              <button className="btn btn-gray sm" disabled={grp === (m.grp ?? '')} onClick={() => c.updateMe({ grp }).then(() => toast('Grupo salvo'))}>
                Salvar
              </button>
            </div>
          </label>
          {m.role !== 'pastor' && (
            <form
              className="field"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const role = await c.elevate(code);
                  setCode('');
                  toast(`Acesso de ${ROLE_LABEL[role]} liberado`);
                } catch (err) {
                  toast((err as Error).message);
                }
              }}
            >
              <span>Sou líder ou pastor(a)</span>
              <div className="inline">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código da liderança" autoCapitalize="characters" />
                <button className="btn btn-gray sm" disabled={code.trim().length < 6}>
                  Liberar
                </button>
              </div>
            </form>
          )}
          <div className="inline">
            <button className="btn btn-outline sm" onClick={() => c.logout()}>
              <Icon name="logout" size={16} /> Sair da conta
            </button>
            <button className="link danger small" onClick={() => confirm('Excluir sua conta da comunidade? Seu progresso local continua no aparelho.') && c.leave()}>
              Excluir conta
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Community({ path = [] }: { path?: string[] }) {
  const c = useCommunity();
  const route = useRoute();
  if (!c.session)
    return (
      <main className="page community">
        <CommunityGate title="Relacionamentos" text={`Leia junto com os irmãos · ${COMMUNITY_NAME}: veja quem está lendo, incentive com um “Amém” e cresça em comunidade.`} />
      </main>
    );
  if (path[0] === 'membro' && path[1])
    return (
      <main className="page community">
        <MemberProfile key={path[1]} id={path[1]} />
      </main>
    );
  if (path[0] === 'conversa' && path[1])
    return (
      <main className="page community chat-page">
        <Chat key={path[1]} id={path[1]} />
      </main>
    );
  const tabs: [Tab, string][] = [
    ['atividades', 'Atividades'],
    ['conversas', 'Conversas'],
    ['irmaos', 'Irmãos'],
    ...(c.isLeader ? ([['acompanhamento', 'Acompanhamento']] as [Tab, string][]) : []),
    ...(c.isPastor ? ([['gestao', 'Gestão']] as [Tab, string][]) : []),
  ];
  const q = route.query.get('aba') as Tab | null;
  const tab = tabs.some(([k]) => k === q) ? q! : 'atividades';
  return (
    <main className="page community">
      <div className="page-head">
        <div>
          <h1 className="page-title">Relacionamentos</h1>
          <p className="muted">{c.member?.church_name ?? COMMUNITY_NAME}</p>
        </div>
        {c.isLeader && (
          <a className="btn btn-primary sm" href="#/estudio">
            <Icon name="pen" size={18} /> Estúdio
          </a>
        )}
      </div>
      <div className="community-layout">
        <div className="community-main">
          <div className="seg community-tabs" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setQuery('aba', k === 'atividades' ? null : k, true)} role="tab" aria-selected={tab === k}>
                {label}
                {k === 'conversas' && c.unread > 0 && <span className="badge-count">{c.unread}</span>}
              </button>
            ))}
          </div>
          {tab === 'atividades' && <Feed />}
          {tab === 'conversas' && <ConversationList />}
          {tab === 'irmaos' && <Brothers />}
          {tab === 'acompanhamento' && c.isLeader && <FollowUp />}
          {tab === 'gestao' && c.isPastor && <Management />}
        </div>
        <MyCard />
      </div>
    </main>
  );
}
