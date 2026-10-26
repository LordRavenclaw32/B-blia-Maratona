import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { refLink } from '../components/RichText';
import { Modal, useUI } from '../components/ui';
import { avatarUrl } from '../lib/art';
import { relTime, useCommunity, type ChatMessage, type CommunityMember, type ConversationSummary, type Role } from '../lib/community';
import { splitRefs } from '../lib/refs';
import { navigate } from '../lib/router';
import { RoleBadge } from './Community';

/** Conversas da igreja: individuais (qualquer membro) e em grupo (criadas por líderes e pastores). */

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Texto da mensagem com links e versículos clicáveis. */
function MessageText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          splitRefs(part).map((s, j) =>
            typeof s === 'string' ? (
              <Fragment key={`${i}-${j}`}>{s}</Fragment>
            ) : (
              <a key={`${i}-${j}`} className="ref-link" href={refLink(s.ref)}>
                {s.text}
              </a>
            ),
          )
        ),
      )}
    </>
  );
}

function NewConversation({ onClose }: { onClose: () => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [list, setList] = useState<CommunityMember[] | null>(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(false);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    c.call<CommunityMember[]>('community').then(setList).catch((e: Error) => toast(e.message));
  }, []);

  const others = (list ?? []).filter((m) => m.id !== c.member?.id && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || (m.grp ?? '').toLowerCase().includes(q.toLowerCase())));
  const groups = [...new Set((list ?? []).map((m) => m.grp).filter(Boolean) as string[])];

  const open = async (id: string) => {
    setBusy(true);
    try {
      const cid = await c.call<string>('open_direct', { p_member: id });
      onClose();
      navigate(`/comunidade/conversa/${cid}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  const createGroup = async () => {
    setBusy(true);
    try {
      const cid = await c.call<string>('create_group', { p_title: title, p_members: picked });
      onClose();
      navigate(`/comunidade/conversa/${cid}`);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} className="studio-modal" label="Nova conversa">
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="studio-form">
        <h2>{group ? 'Novo grupo' : 'Nova conversa'}</h2>
        {c.isLeader && (
          <div className="seg">
            <button className={!group ? 'on' : ''} onClick={() => setGroup(false)}>
              Com uma pessoa
            </button>
            <button className={group ? 'on' : ''} onClick={() => setGroup(true)}>
              Grupo
            </button>
          </div>
        )}
        {group && (
          <>
            <label className="field">
              <span>Nome do grupo</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: Célula Esperança, Liderança, Louvor" />
            </label>
            {groups.length > 0 && (
              <div className="chips">
                {groups.map((g) => (
                  <button
                    key={g}
                    className="chip sm"
                    onClick={() => {
                      setTitle((t) => t || g);
                      setPicked((cur) => [...new Set([...cur, ...(list ?? []).filter((m) => m.grp === g && m.id !== c.member?.id).map((m) => m.id)])]);
                    }}
                  >
                    + {g}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar irmão ou grupo" aria-label="Buscar irmão" />
        <div className="pick-list">
          {!list && <div className="spinner" />}
          {others.map((m) => {
            const on = picked.includes(m.id);
            return (
              <button
                key={m.id}
                className={`pick-row ${on ? 'on' : ''}`}
                disabled={busy}
                onClick={() => (group ? setPicked((cur) => (on ? cur.filter((x) => x !== m.id) : [...cur, m.id])) : open(m.id))}
              >
                <img src={avatarUrl(m.avatar)} alt="" />
                <span>
                  <b>
                    {m.name} <RoleBadge role={m.role} />
                  </b>
                  {m.grp && <small className="muted">{m.grp}</small>}
                </span>
                {group ? <Icon name={on ? 'check' : 'plus'} size={18} /> : <Icon name="chevronRight" size={18} />}
              </button>
            );
          })}
          {list && !others.length && <p className="muted">Ninguém encontrado.</p>}
        </div>
        {group && (
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={busy || !title.trim() || !picked.length} onClick={createGroup}>
              Criar grupo ({picked.length + 1})
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ConversationList() {
  const c = useCommunity();
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    c.call<ConversationSummary[]>('conversation_list')
      .then((l) => (setList(l), setError('')))
      .catch((e: Error) => setError(e.message));
  }, [c.call]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="conv-list">
      <button className="btn btn-primary sm conv-new" onClick={() => setCreating(true)}>
        <Icon name="plus" size={18} /> {c.isLeader ? 'Nova conversa ou grupo' : 'Nova conversa'}
      </button>
      {error && <p className="error">{error}</p>}
      {!list && !error && <div className="spinner" />}
      {list?.length === 0 && <p className="muted">Nenhuma conversa ainda. Toque em “Nova conversa” ou no perfil de um irmão.</p>}
      {list?.map((cv) => (
        <a key={cv.id} className={`conv-row ${cv.unread ? 'unread' : ''}`} href={`#/comunidade/conversa/${cv.id}`}>
          {cv.is_group ? (
            <span className="conv-group-ic">
              <Icon name="user" />
            </span>
          ) : (
            <img src={avatarUrl(cv.avatar ?? 0)} alt="" />
          )}
          <span className="conv-text">
            <b>
              {cv.title} {!cv.is_group && cv.role && <RoleBadge role={cv.role as Role} />}
              {cv.is_group && <small className="muted"> · {cv.members} pessoas</small>}
            </b>
            <small className="muted">
              {cv.last ? `${cv.last.mine ? 'Você: ' : cv.is_group && cv.last.name ? `${cv.last.name.split(' ')[0]}: ` : ''}${cv.last.body}` : 'Sem mensagens'}
            </small>
          </span>
          <span className="conv-meta">
            <small className="muted">{relTime(cv.last_message_at)}</small>
            {cv.unread > 0 && <span className="badge-count">{cv.unread}</span>}
          </span>
        </a>
      ))}
      {creating && <NewConversation onClose={() => setCreating(false)} />}
    </div>
  );
}

interface ChatData {
  conversation: { id: string; is_group: boolean; title?: string | null; created_by?: string | null };
  members: { id: string; name: string; avatar: number; role: Role }[];
  messages: ChatMessage[];
}

export function Chat({ id }: { id: string }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [data, setData] = useState<ChatData | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<number | null>(null);

  const poll = useCallback(async () => {
    try {
      const d = await c.call<ChatData>('conversation_messages', { p_conv: id, p_after: lastId.current });
      setData(d);
      if (d.messages.length) {
        lastId.current = d.messages[d.messages.length - 1].id;
        setMsgs((cur) => {
          const seen = new Set(cur.map((m) => m.id));
          return [...cur, ...d.messages.filter((m) => !seen.has(m.id))];
        });
      }
      c.refreshUnread();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, c.call]);

  useEffect(() => {
    lastId.current = null;
    setMsgs([]);
    poll();
    const t = setInterval(() => document.visibilityState === 'visible' && poll(), 4000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await c.call<ChatMessage>('send_message', { p_conv: id, p_body: body });
      setText('');
      lastId.current = Math.max(lastId.current ?? 0, m.id);
      setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const others = useMemo(() => (data?.members ?? []).filter((m) => m.id !== c.member?.id), [data, c.member?.id]);
  if (error)
    return (
      <div className="panel c-empty">
        <p>{error}</p>
        <a className="btn btn-gray" href="#/comunidade?aba=conversas">
          Voltar
        </a>
      </div>
    );
  if (!data) return <div className="spinner" />;
  const g = data.conversation.is_group;
  const title = g ? data.conversation.title : others[0]?.name ?? 'Conversa';

  let lastDay = '';
  return (
    <div className="chat">
      <header className="chat-head">
        <a className="icon-btn" href="#/comunidade?aba=conversas" aria-label="Voltar">
          <Icon name="back" />
        </a>
        {g ? (
          <span className="conv-group-ic">
            <Icon name="user" />
          </span>
        ) : (
          others[0] && <img src={avatarUrl(others[0].avatar)} alt="" />
        )}
        <button className="chat-title" onClick={() => (g ? setShowMembers((v) => !v) : others[0] && navigate(`/comunidade/membro/${others[0].id}`))}>
          <b>
            {title} {!g && others[0] && <RoleBadge role={others[0].role} />}
          </b>
          <small className="muted">{g ? `${data.members.length} participantes · ver` : 'Ver perfil e rotina de leitura'}</small>
        </button>
      </header>
      {showMembers && (
        <div className="chat-members">
          {data.members.map((m) => (
            <a key={m.id} href={`#/comunidade/membro/${m.id}`} className="chip">
              <img src={avatarUrl(m.avatar)} alt="" /> {m.name}
            </a>
          ))}
        </div>
      )}
      <div className="chat-body" role="log" aria-live="polite">
        {msgs.length === 0 && <p className="muted chat-empty">Comece a conversa com uma palavra de ânimo. 🙏</p>}
        {msgs.map((m, i) => {
          const day = new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
          const sep = day !== lastDay;
          lastDay = day;
          const showName = g && !m.mine && (i === 0 || msgs[i - 1].member_id !== m.member_id || sep);
          return (
            <Fragment key={m.id}>
              {sep && <div className="chat-day">{day.charAt(0).toUpperCase() + day.slice(1)}</div>}
              <div className={`bubble ${m.mine ? 'mine' : ''}`}>
                {showName && (
                  <span className="bubble-name">
                    {m.name ?? 'Ex-membro'} {m.role && <RoleBadge role={m.role} />}
                  </span>
                )}
                <p>
                  <MessageText text={m.body} />
                </p>
                <time>{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
        />
        <button className="btn btn-primary" disabled={!text.trim() || sending} aria-label="Enviar">
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  );
}
