import { useEffect, useRef, useState } from 'react';
import { avatarUrl } from '../lib/art';
import { APP_NAME } from '../lib/brand';
import { churchLink, COMMUNITY_NAME } from '../lib/church';
import { POST_KIND_LABEL, relTime, useCommunity, type Post, type PostComment, type PostKind, type SharedPost } from '../lib/community';
import { parseMedia } from '../lib/media';
import { findRefs, parseRef, splitRefs } from '../lib/refs';
import { MAX_UPLOAD } from '../lib/server';
import { RoleBadge } from '../pages/Community';
import { Icon } from './Icon';
import { MediaPlayer, refLink, RichText } from './RichText';
import { Modal, useUI } from './ui';

/** Publicações da comunidade: devocionais, estudos, orações e testemunhos com mídia, reações, comentários e compartilhamento. */

export type MediaKind = 'image' | 'video' | 'audio';
export interface PickedMedia {
  type: MediaKind;
  blob?: Blob;
  /** link (ex.: YouTube) em vez de arquivo */
  url?: string;
  preview: string;
}

/** Reduz a imagem para no máximo 1600 px (JPEG) antes de enviar. */
export function compressImage(file: File, max = 1600): Promise<Blob> {
  if (file.type === 'image/gif') return Promise.resolve(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob((b) => (b ? resolve(b) : reject(new Error('Imagem inválida'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

/** Gravador de áudio (microfone do aparelho). */
function AudioRecorder({ onDone, onCancel }: { onDone: (blob: Blob) => void; onCancel: () => void }) {
  const { toast } = useUI();
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t));
        const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        r.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop());
          onDone(new Blob(chunks.current, { type: (r.mimeType || 'audio/webm').split(';')[0] }));
        };
        r.start();
        rec.current = r;
        setRunning(true);
        timer = setInterval(() => setSecs((s) => (s >= 299 ? (r.stop(), s) : s + 1)), 1000);
      } catch {
        toast('Não foi possível usar o microfone. Verifique a permissão do navegador.');
        onCancel();
      }
    })();
    return () => {
      clearInterval(timer);
      if (rec.current?.state === 'recording') rec.current.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="recorder">
      <span className={`rec-dot ${running ? 'on' : ''}`} />
      <b>
        {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
      </b>
      <span className="muted small">Gravando… (máx. 5 min)</span>
      <button type="button" className="btn btn-primary sm" disabled={!running} onClick={() => rec.current?.stop()}>
        <Icon name="check" size={16} /> Concluir
      </button>
      <button
        type="button"
        className="btn btn-outline sm"
        onClick={() => {
          if (rec.current) rec.current.onstop = null;
          rec.current?.stop();
          onCancel();
        }}
      >
        Cancelar
      </button>
    </div>
  );
}

/** Botões para anexar imagem, vídeo (arquivo ou link) ou áudio (gravar ou arquivo). */
export function MediaPicker({ value, onChange, allow = ['image', 'video', 'audio'] }: { value: PickedMedia | null; onChange: (m: PickedMedia | null) => void; allow?: MediaKind[] }) {
  const { toast } = useUI();
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const audRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [askLink, setAskLink] = useState(false);
  const [link, setLink] = useState('');

  const pick = async (type: MediaKind, file?: File) => {
    if (!file) return;
    try {
      const blob = type === 'image' ? await compressImage(file) : file;
      if (blob.size > MAX_UPLOAD) return toast('Arquivo muito grande (máx. 25 MB). Para vídeos longos, use um link do YouTube.');
      onChange({ type, blob, preview: URL.createObjectURL(blob) });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  if (value)
    return (
      <div className="media-picked">
        <PostMedia type={value.type} url={value.url ?? value.preview} />
        <button type="button" className="link danger small" onClick={() => onChange(null)}>
          <Icon name="trash" size={14} /> Remover mídia
        </button>
      </div>
    );
  if (recording)
    return (
      <AudioRecorder
        onCancel={() => setRecording(false)}
        onDone={(blob) => {
          setRecording(false);
          onChange({ type: 'audio', blob, preview: URL.createObjectURL(blob) });
        }}
      />
    );
  return (
    <div className="media-picker">
      {allow.includes('image') && (
        <button type="button" className="chip" onClick={() => imgRef.current?.click()}>
          <Icon name="image" size={16} /> Imagem
        </button>
      )}
      {allow.includes('video') && (
        <>
          <button type="button" className="chip" onClick={() => vidRef.current?.click()}>
            <Icon name="play" size={16} /> Vídeo
          </button>
          <button type="button" className="chip" onClick={() => setAskLink((v) => !v)}>
            <Icon name="youtube" size={16} /> Link do YouTube
          </button>
        </>
      )}
      {allow.includes('audio') && (
        <>
          <button type="button" className="chip" onClick={() => (typeof MediaRecorder === 'undefined' ? toast('Gravação de áudio não suportada neste navegador') : setRecording(true))}>
            <Icon name="music" size={16} /> Gravar áudio
          </button>
          <button type="button" className="chip ghost" onClick={() => audRef.current?.click()}>
            <Icon name="upload" size={16} /> Arquivo de áudio
          </button>
        </>
      )}
      {askLink && (
        <div className="inline media-link">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/…" aria-label="Link do vídeo" />
          <button
            type="button"
            className="btn btn-gray sm"
            onClick={() => {
              const m = parseMedia(link);
              if (!m || m.type === 'link') return toast('Link não reconhecido');
              onChange({ type: 'video', url: m.url, preview: m.url });
              setAskLink(false);
            }}
          >
            Anexar
          </button>
        </div>
      )}
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => (pick('image', e.target.files?.[0]), (e.target.value = ''))} />
      <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => (pick('video', e.target.files?.[0]), (e.target.value = ''))} />
      <input ref={audRef} type="file" accept="audio/*" hidden onChange={(e) => (pick('audio', e.target.files?.[0]), (e.target.value = ''))} />
    </div>
  );
}

/** Envia a mídia escolhida (se for arquivo) e devolve { media_type, media_url }. */
export async function resolveMedia(media: PickedMedia | null, upload: (b: Blob) => Promise<string>) {
  if (!media) return { media_type: null, media_url: null };
  return { media_type: media.type, media_url: media.url ?? (await upload(media.blob!)) };
}

export function PostMedia({ type, url }: { type: MediaKind; url: string }) {
  if (type === 'image') return <img className="post-image" src={url} alt="" loading="lazy" />;
  if (type === 'audio') return <audio className="media-audio" src={url} controls preload="metadata" />;
  const m = parseMedia(url);
  if (m && m.type !== 'video' && m.type !== 'link' && m.type !== 'audio') return <MediaPlayer url={url} />;
  return <video className="media-frame" src={url} controls preload="metadata" playsInline />;
}

const KINDS: PostKind[] = ['devocional', 'estudo', 'reflexao', 'oracao', 'testemunho'];

/** Caixa de publicação no topo do feed. */
export function Composer({ onPosted, sharedFrom, onCancel }: { onPosted: (p: Post) => void; sharedFrom?: SharedPost; onCancel?: () => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [open, setOpen] = useState(!!sharedFrom);
  const [kind, setKind] = useState<PostKind>(sharedFrom ? 'reflexao' : 'devocional');
  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [vis, setVis] = useState<'public' | 'private'>('public');
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!body.trim() && !media && !sharedFrom) return toast('Escreva algo ou anexe uma mídia');
    setBusy(true);
    try {
      const m = await resolveMedia(media, c.upload);
      const verseRef = verse.trim() || findRefs(body)[0]?.label || '';
      const p = await c.call<Post>('save_post', { p: { kind, title, body, verse: verseRef, visibility: sharedFrom ? 'public' : vis, shared_from: sharedFrom?.id ?? '', ...m } });
      onPosted(p);
      setTitle('');
      setVerse('');
      setBody('');
      setMedia(null);
      setOpen(!!sharedFrom);
      toast(p.visibility === 'public' ? 'Publicado para os irmãos' : 'Salvo como privado (só você vê)');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button className="composer-closed" onClick={() => setOpen(true)}>
        <img src={avatarUrl(c.member?.avatar ?? 0)} alt="" />
        <span>Compartilhe uma devocional, estudo, oração ou testemunho…</span>
        <Icon name="image" size={20} />
      </button>
    );

  return (
    <div className="composer panel">
      {!sharedFrom && (
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`chip sm ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
              {POST_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      {!sharedFrom && <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" maxLength={120} aria-label="Título" />}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={sharedFrom ? 3 : 5}
        placeholder={sharedFrom ? 'Diga algo sobre esta publicação (opcional)…' : 'O que Deus falou com você? Versículos como Jo 3:16 viram links.'}
        aria-label="Texto da publicação"
      />
      {sharedFrom && <SharedEmbed s={sharedFrom} />}
      {!sharedFrom && (
        <>
          <input value={verse} onChange={(e) => setVerse(e.target.value)} placeholder="Versículo base (opcional, ex.: Sl 23:1)" maxLength={160} aria-label="Versículo" />
          <MediaPicker value={media} onChange={setMedia} />
        </>
      )}
      <div className="composer-foot">
        {!sharedFrom ? (
          <div className="seg small" role="radiogroup" aria-label="Visibilidade">
            <button type="button" className={vis === 'public' ? 'on' : ''} onClick={() => setVis('public')}>
              <Icon name="globe" size={14} /> Público
            </button>
            <button type="button" className={vis === 'private' ? 'on' : ''} onClick={() => setVis('private')}>
              <Icon name="lock" size={14} /> Privado
            </button>
          </div>
        ) : (
          <span className="muted small">
            <Icon name="globe" size={14} /> Público para {COMMUNITY_NAME}
          </span>
        )}
        <div className="inline">
          <button type="button" className="btn btn-outline sm" onClick={() => (onCancel ? onCancel() : setOpen(false))}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary sm" disabled={busy} onClick={publish}>
            {busy ? (media?.blob ? 'Enviando mídia…' : 'Publicando…') : sharedFrom ? 'Compartilhar no feed' : 'Publicar'}
          </button>
        </div>
      </div>
      {!sharedFrom && <p className="muted tiny">Público: os irmãos podem ver, dizer Amém/Amei, comentar e compartilhar. Privado: só você vê.</p>}
    </div>
  );
}

function SharedEmbed({ s }: { s: SharedPost }) {
  return (
    <div className="shared-embed">
      <div className="post-author small">
        <img src={avatarUrl(s.member.avatar)} alt="" />
        <b>{s.member.name}</b> <span className="muted">· {POST_KIND_LABEL[s.kind]}</span>
      </div>
      {s.title && <b className="shared-title">{s.title}</b>}
      {s.body && <p className="shared-body">{s.body.length > 280 ? `${s.body.slice(0, 280)}…` : s.body}</p>}
      {s.media_type && s.media_url && <PostMedia type={s.media_type} url={s.media_url} />}
    </div>
  );
}

function Comments({ post, onCount }: { post: Post; onCount: (n: number) => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [list, setList] = useState<PostComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    c.call<PostComment[]>('post_comments_list', { p_post: post.id }).then(setList).catch((e: Error) => toast(e.message));
  }, [post.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const l = await c.call<PostComment[]>('add_comment', { p_post: post.id, p_body: text });
      setList(l);
      onCount(l.length);
      setText('');
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await c.call('remove_comment', { p_comment: id }).catch(() => undefined);
    const l = (list ?? []).filter((x) => x.id !== id);
    setList(l);
    onCount(l.length);
  };

  return (
    <div className="comments">
      {!list && <div className="spinner small" />}
      {list?.map((cm) => (
        <div key={cm.id} className="comment">
          <a href={`#/comunidade/membro/${cm.member.id}`}>
            <img src={avatarUrl(cm.member.avatar)} alt="" />
          </a>
          <div>
            <p>
              <a href={`#/comunidade/membro/${cm.member.id}`}>
                <b>{cm.member.name}</b>
              </a>{' '}
              <RoleBadge role={cm.member.role} /> <LinkedText text={cm.body} />
            </p>
            <small className="muted">
              {relTime(cm.created_at)}
              {(cm.mine || post.mine || c.isLeader) && (
                <button className="link small" onClick={() => remove(cm.id)}>
                  · remover
                </button>
              )}
            </small>
          </div>
        </div>
      ))}
      {post.visibility === 'public' && (
        <form className="comment-form" onSubmit={send}>
          <img src={avatarUrl(c.member?.avatar ?? 0)} alt="" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário…" maxLength={2000} aria-label="Comentário" />
          <button className="icon-btn" disabled={busy || !text.trim()} aria-label="Enviar comentário">
            <Icon name="send" size={18} />
          </button>
        </form>
      )}
    </div>
  );
}

/** Texto curto com versículos clicáveis. */
function LinkedText({ text }: { text: string }) {
  return (
    <>
      {splitRefs(text).map((seg, i) =>
        typeof seg === 'string' ? (
          <span key={i}>{seg}</span>
        ) : (
          <a key={i} className="ref-link" href={refLink(seg.ref)}>
            {seg.text}
          </a>
        ),
      )}
    </>
  );
}

export function PostCard({ post, onChange, onRemove, onInspire }: { post: Post; onChange: (p: Post) => void; onRemove: (id: string) => void; onInspire?: (p: Post) => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [showComments, setShowComments] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const verse = post.verse ? parseRef(post.verse) : null;
  const long = (post.body?.length ?? 0) > 700;

  const react = async (type: 'amem' | 'amei') => {
    const on = post.my_reactions.includes(type);
    onChange({ ...post, [type]: post[type] + (on ? -1 : 1), my_reactions: on ? post.my_reactions.filter((x) => x !== type) : [...post.my_reactions, type] });
    try {
      onChange(await c.call<Post>('react_post', { p_post: post.id, p_type: type }));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const shareOut = async () => {
    setMenu(false);
    const text = `${post.title ? `${post.title}\n\n` : ''}${post.body ?? ''}${post.verse ? `\n\n${post.verse}` : ''}\n\n— ${post.member.name}, no ${APP_NAME}\n${churchLink()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title ?? APP_NAME, text });
        return;
      } catch {
        /* cancelado */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer');
  };

  const setVisibility = async (visibility: 'public' | 'private') => {
    setMenu(false);
    try {
      onChange(await c.call<Post>('save_post', { p: { ...post, id: post.id, shared_from: '', inspired_by: '', visibility } }));
      toast(visibility === 'public' ? 'Agora é público' : 'Agora é privado (só você vê)');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const remove = async () => {
    setMenu(false);
    if (!confirm('Excluir esta publicação?')) return;
    try {
      await c.call('remove_post', { p_post: post.id });
      onRemove(post.id);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <article className={`post-card k-${post.kind}`}>
      <header className="post-author">
        <a href={`#/comunidade/membro/${post.member.id}`}>
          <img src={avatarUrl(post.member.avatar)} alt="" />
        </a>
        <div>
          <a href={`#/comunidade/membro/${post.member.id}`}>
            <b>{post.member.name}</b>
          </a>{' '}
          <RoleBadge role={post.member.role} />
          <small className="muted">
            {post.shared ? 'compartilhou' : POST_KIND_LABEL[post.kind]} · {relTime(post.created_at)} ·{' '}
            {post.visibility === 'public' ? <Icon name="globe" size={12} /> : <Icon name="lock" size={12} />} {post.visibility === 'public' ? 'Público' : 'Privado'}
          </small>
        </div>
        {(post.mine || c.isLeader) && (
          <div className="post-menu">
            <button className="icon-btn" onClick={() => setMenu((v) => !v)} aria-label="Opções da publicação">
              <Icon name="menu" size={18} />
            </button>
            {menu && (
              <div className="dropdown">
                {post.mine && post.visibility === 'private' && (
                  <button className="dd-item" onClick={() => setVisibility('public')}>
                    <Icon name="globe" size={16} /> Tornar público
                  </button>
                )}
                {post.mine && post.visibility === 'public' && (
                  <button className="dd-item" onClick={() => setVisibility('private')}>
                    <Icon name="lock" size={16} /> Tornar privado
                  </button>
                )}
                <button className="dd-item" onClick={remove}>
                  <Icon name="trash" size={16} /> {post.mine ? 'Excluir' : 'Remover (liderança)'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      {post.inspired && (
        <p className="post-inspired muted small">
          <Icon name="pen" size={12} /> Inspirado na devocional de <b>{post.inspired.name}</b>
          {post.inspired.title ? ` · “${post.inspired.title}”` : ''}
        </p>
      )}
      {post.title && <h3 className="post-title">{post.title}</h3>}
      {verse && (
        <a className="chip sm post-verse" href={refLink(verse)}>
          <Icon name="book" size={12} /> {verse.label}
        </a>
      )}
      {post.body && (
        <div className={`post-body ${long && !expanded ? 'clamped' : ''}`}>
          <RichText text={post.body} />
        </div>
      )}
      {long && (
        <button className="link small" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ver menos' : 'Ler tudo'}
        </button>
      )}
      {post.media_type && post.media_url && (
        <div className="post-media">
          <PostMedia type={post.media_type} url={post.media_url} />
        </div>
      )}
      {post.shared && <SharedEmbed s={post.shared} />}
      <footer className="post-actions">
        {post.visibility === 'public' ? (
          <>
            <button className={`react ${post.my_reactions.includes('amem') ? 'on' : ''}`} onClick={() => react('amem')} aria-pressed={post.my_reactions.includes('amem')}>
              🙏 Amém{post.amem ? ` · ${post.amem}` : ''}
            </button>
            <button className={`react ${post.my_reactions.includes('amei') ? 'on love' : ''}`} onClick={() => react('amei')} aria-pressed={post.my_reactions.includes('amei')}>
              ❤️ Amei{post.amei ? ` · ${post.amei}` : ''}
            </button>
            <button className={`react ${showComments ? 'on' : ''}`} onClick={() => setShowComments((v) => !v)}>
              💬 Comentar{post.comments ? ` · ${post.comments}` : ''}
            </button>
            <div className="post-menu">
              <button className="react" onClick={() => (setMenu(false), setSharing((v) => !v))}>
                ↗ Compartilhar{post.shares ? ` · ${post.shares}` : ''}
              </button>
              {sharing && (
                <div className="dropdown up">
                  <button
                    className="dd-item"
                    onClick={() => {
                      setSharing(false);
                      setMenu(false);
                      setShareModal(true);
                    }}
                  >
                    <Icon name="share" size={16} /> Compartilhar no feed
                  </button>
                  {onInspire && (
                    <button
                      className="dd-item"
                      onClick={() => {
                        setSharing(false);
                        onInspire(post.shared ? ({ ...post, ...post.shared } as Post) : post);
                      }}
                    >
                      <Icon name="pen" size={16} /> Escrever devocional a partir desta
                    </button>
                  )}
                  <button
                    className="dd-item"
                    onClick={() => {
                      setSharing(false);
                      shareOut();
                    }}
                  >
                    <Icon name="whatsapp" size={16} /> Enviar (WhatsApp e outros)
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="muted small">
            <Icon name="lock" size={14} /> Só você vê esta publicação
          </span>
        )}
      </footer>
      {showComments && <Comments post={post} onCount={(n) => onChange({ ...post, comments: n })} />}
      {shareModal && (
        <Modal onClose={() => setShareModal(false)} className="studio-modal" label="Compartilhar no feed">
          <button className="modal-close" onClick={() => setShareModal(false)} aria-label="Fechar">
            <Icon name="close" />
          </button>
          <div className="studio-form">
            <h2>Compartilhar no feed</h2>
            <Composer
              sharedFrom={post.shared ?? post}
              onCancel={() => setShareModal(false)}
              onPosted={(p) => {
                setShareModal(false);
                onChange({ ...post, shares: post.shares + 1 });
                window.dispatchEvent(new CustomEvent('bf:post', { detail: p }));
              }}
            />
          </div>
        </Modal>
      )}
    </article>
  );
}
