import { useEffect, useMemo, useRef, useState } from 'react';
import { CommunityGate } from '../components/CommunityGate';
import { Icon } from '../components/Icon';
import { MediaPlayer, RichText } from '../components/RichText';
import { Modal, useUI } from '../components/ui';
import { COMMUNITY_NAME } from '../lib/church';
import { MONTHS, monthKey, monthLabel, ROLE_LABEL, seasonsOf, useCommunity, type Content, type Series } from '../lib/community';
import { fetchMediaInfo, MEDIA_LABEL, parseMedia } from '../lib/media';
import { findRefs } from '../lib/refs';
import { setQuery, useRoute } from '../lib/router';
import { thumbOf } from './Messages';

/** Estúdio da liderança: séries e lançamentos, mural do mês, mensagens completas e importação de vídeos/podcasts. */

const AUTHOR_ROLES = ['Pastor', 'Pastora', 'Líder', 'Convidado(a)', 'Ministério de louvor', 'Missionário(a)'];

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');

function imageToDataUrl(file: File, max = 1100): Promise<string> {
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
      resolve(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

function ImagePicker({ value, onChange, label, wide = true }: { value?: string | null; onChange: (v: string | null) => void; label: string; wide?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const { toast } = useUI();
  return (
    <div className="field">
      <span>{label}</span>
      <div className="inline">
        <button type="button" className={`img-pick ${wide ? 'wide' : ''}`} onClick={() => ref.current?.click()}>
          {value ? <img src={value} alt="" /> : <Icon name="image" size={28} />}
        </button>
        <div className="setup-hint">
          <button type="button" className="btn btn-gray sm" onClick={() => ref.current?.click()}>
            <Icon name="upload" size={16} /> {value ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {value && (
            <button type="button" className="link small" onClick={() => onChange(null)}>
              Remover
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onChange(await imageToDataUrl(f).catch((err: Error) => (toast(err.message), value ?? null)));
        }}
      />
    </div>
  );
}

function sundaysOf(key: string): string[] {
  const [y, m] = key.split('-').map(Number);
  const out: string[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() === 0) out.push(`Culto de ${String(d.getDate()).padStart(2, '0')}/${String(m).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

type SeriesDraft = Partial<Series> & { title: string; kind: 'serie' | 'mural'; seasons: string[] };

function SeriesEditor({ initial, onClose }: { initial: SeriesDraft; onClose: () => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [s, setS] = useState<SeriesDraft>(initial);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<SeriesDraft>) => setS((cur) => ({ ...cur, ...p }));
  const mural = s.kind === 'mural';

  const save = async () => {
    if (!s.title.trim()) return toast('Dê um título');
    setBusy(true);
    try {
      await c.call('save_series', {
        p: { ...s, seasons: s.seasons.map((x) => x.trim()).filter(Boolean), launch_at: s.launch_at ?? '', month: mural ? s.month ?? monthKey() : null },
      });
      await c.refreshCatalog();
      toast(s.id ? 'Série atualizada' : s.launch_at && new Date(s.launch_at) > new Date() ? 'Lançamento agendado e anunciado na comunidade' : 'Série publicada');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} className="studio-modal" label={mural ? 'Mural do mês' : 'Série'}>
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="studio-form">
        <h2>{s.id ? 'Editar' : 'Nova'} {mural ? 'mural do mês' : 'série / lançamento'}</h2>
        {mural ? (
          <div className="form-grid">
            <label>
              <span>Mês</span>
              <input
                type="month"
                value={s.month ?? monthKey()}
                onChange={(e) => {
                  const key = e.target.value;
                  set({ month: key, title: s.title.startsWith('Mural de ') || !s.title ? `Mural de ${MONTHS[Number(key.slice(5)) - 1]}` : s.title, seasons: sundaysOf(key) });
                }}
              />
            </label>
            <label>
              <span>Título</span>
              <input value={s.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label>
              <span>Tema do mês</span>
              <input value={s.subtitle ?? ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Ex.: Gratidão que transforma" />
            </label>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              <span>Título da série *</span>
              <input value={s.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Raízes da Fé" />
            </label>
            <label>
              <span>Subtítulo</span>
              <input value={s.subtitle ?? ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Uma jornada por Gênesis" />
            </label>
            <label>
              <span>Autor(es)</span>
              <input value={s.author ?? ''} onChange={(e) => set({ author: e.target.value })} placeholder="Pr. Daniel e convidados" />
            </label>
            <label>
              <span>Lançamento (opcional)</span>
              <input type="datetime-local" value={toLocalInput(s.launch_at)} onChange={(e) => set({ launch_at: fromLocalInput(e.target.value) || null })} />
            </label>
          </div>
        )}
        <label className="field">
          <span>Descrição</span>
          <textarea rows={3} value={s.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="Sobre o que é esta série, para quem é, o que esperar." />
        </label>
        <div className="field">
          <span>{mural ? 'Cultos do mês (temporadas)' : 'Temporadas'}</span>
          <div className="list-editor">
            {s.seasons.map((t, i) => (
              <div key={i} className="le-row">
                <input value={t} onChange={(e) => set({ seasons: s.seasons.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Temporada ${i + 1}`} aria-label={`Temporada ${i + 1}`} />
                <button type="button" className="icon-btn" aria-label="Remover" onClick={() => set({ seasons: s.seasons.filter((_, j) => j !== i) })}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
            <button type="button" className="chip ghost" onClick={() => set({ seasons: [...s.seasons, ''] })}>
              <Icon name="plus" size={14} /> Adicionar {mural ? 'culto' : 'temporada'}
            </button>
          </div>
        </div>
        <ImagePicker label="Capa" value={s.cover} onChange={(cover) => set({ cover })} />
        {!mural && s.launch_at && new Date(s.launch_at) > new Date() && (
          <p className="muted small">
            <Icon name="star" size={14} /> Os membros verão a capa, a contagem regressiva e poderão salvar o lançamento na agenda. Os episódios só abrem na estreia.
          </p>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            <Icon name="check" /> {busy ? 'Salvando…' : s.id ? 'Salvar' : mural ? 'Criar mural' : s.launch_at ? 'Agendar lançamento' : 'Publicar série'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

type ContentDraft = Partial<Content> & { title: string; kind: Content['kind']; season: number; position: number; verses: string[] };

function ContentEditor({ initial, onClose }: { initial: ContentDraft; onClose: () => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [x, setX] = useState<ContentDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [verse, setVerse] = useState('');
  const set = (p: Partial<ContentDraft>) => setX((cur) => ({ ...cur, ...p }));
  const series = c.catalog?.series ?? [];
  const sr = series.find((s) => s.id === x.series_id);
  const detected = useMemo(() => findRefs(x.body ?? '').map((r) => r.label), [x.body]);
  const verses = [...new Set([...x.verses, ...detected])];
  const media = x.media_url ? parseMedia(x.media_url) : null;

  const fetchInfo = async () => {
    if (!x.media_url) return;
    const info = await fetchMediaInfo(x.media_url);
    if (!info.title) return toast('Não foi possível obter o título automaticamente');
    set({ title: x.title || info.title, author: x.author || info.author || '', thumb: x.thumb || info.thumb || null });
  };

  const save = async () => {
    if (!x.title.trim()) return toast('Dê um título');
    if (x.kind !== 'mensagem' && !media) return toast('Cole o link do vídeo ou podcast');
    setBusy(true);
    try {
      await c.call('save_content', { p: { ...x, verses, series_id: x.series_id || '', publish_at: x.publish_at ?? '' } });
      await c.refreshCatalog();
      toast(x.id ? 'Conteúdo atualizado' : 'Publicado para a igreja');
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} className="studio-modal wide" label="Conteúdo">
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="studio-form">
        <h2>{x.id ? 'Editar conteúdo' : 'Novo conteúdo'}</h2>
        <div className="seg">
          {(['mensagem', 'video', 'podcast'] as const).map((k) => (
            <button key={k} type="button" className={x.kind === k ? 'on' : ''} onClick={() => set({ kind: k })}>
              {k === 'mensagem' ? 'Mensagem escrita' : k === 'video' ? 'Vídeo' : 'Podcast'}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label>
            <span>Série</span>
            <select value={x.series_id ?? ''} onChange={(e) => set({ series_id: e.target.value || null, season: 1 })}>
              <option value="">Avulso (sem série)</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kind === 'mural' ? `Mural · ${monthLabel(s.month)}` : s.title}
                </option>
              ))}
            </select>
          </label>
          {sr && (
            <label>
              <span>{sr.kind === 'mural' ? 'Culto' : 'Temporada'}</span>
              <select value={x.season} onChange={(e) => set({ season: Number(e.target.value) })}>
                {Array.from({ length: Math.max(sr.seasons.length, x.season, 1) + 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {sr.seasons[n - 1] || `${sr.kind === 'mural' ? 'Culto' : 'Temporada'} ${n}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          {sr && (
            <label>
              <span>Ordem do episódio</span>
              <input type="number" min={0} value={x.position} onChange={(e) => set({ position: Number(e.target.value) || 0 })} />
            </label>
          )}
          <label>
            <span>Momento</span>
            <select value={x.phase ?? ''} onChange={(e) => set({ phase: (e.target.value || null) as Content['phase'] })}>
              <option value="">—</option>
              <option value="pre">Antes da pregação (preparação)</option>
              <option value="pos">Depois da pregação (aprofundamento)</option>
            </select>
          </label>
        </div>
        {x.kind !== 'mensagem' && (
          <label className="field">
            <span>Link do {x.kind === 'video' ? 'vídeo' : 'podcast'} (YouTube, Spotify, SoundCloud, Vimeo, Drive ou MP3)</span>
            <div className="inline">
              <input value={x.media_url ?? ''} onChange={(e) => set({ media_url: e.target.value })} onBlur={fetchInfo} placeholder="https://youtu.be/…" />
              <button type="button" className="btn btn-gray sm" onClick={fetchInfo} disabled={!media}>
                Buscar título
              </button>
            </div>
            {x.media_url && <small className={media ? 'ok' : 'error'}>{media ? `${MEDIA_LABEL[media.type]} reconhecido` : 'Link não reconhecido'}</small>}
          </label>
        )}
        <div className="form-grid">
          <label>
            <span>Título *</span>
            <input value={x.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: O Deus que provê" />
          </label>
          <label>
            <span>Autor</span>
            <input value={x.author ?? ''} onChange={(e) => set({ author: e.target.value })} placeholder="Pr. Daniel / convidado" />
          </label>
          <label>
            <span>Função do autor</span>
            <input list="author-roles" value={x.author_role ?? ''} onChange={(e) => set({ author_role: e.target.value })} placeholder="Pastor, Líder, Convidado(a)…" />
            <datalist id="author-roles">
              {AUTHOR_ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Publicar em</span>
            <input type="datetime-local" value={toLocalInput(x.publish_at)} onChange={(e) => set({ publish_at: fromLocalInput(e.target.value) || undefined })} />
          </label>
        </div>
        <label className="field">
          <span>Resumo</span>
          <input value={x.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} placeholder="Uma frase que convide a ler/assistir" maxLength={220} />
        </label>
        <div className="field">
          <span className="studio-body-head">
            {x.kind === 'mensagem' ? 'Mensagem completa' : 'Anotações / esboço (opcional)'}
            <button type="button" className="chip sm" onClick={() => setPreview((v) => !v)}>
              {preview ? 'Editar' : 'Pré-visualizar'}
            </button>
          </span>
          {preview ? (
            <div className="studio-preview">{x.body ? <RichText text={x.body} /> : <p className="muted">Nada escrito ainda.</p>}</div>
          ) : (
            <textarea
              rows={x.kind === 'mensagem' ? 14 : 5}
              value={x.body ?? ''}
              onChange={(e) => set({ body: e.target.value })}
              placeholder={'Escreva a mensagem. Citações como Jo 3:16, Rm 8:28 ou Salmos 23 viram links para a Bíblia.\n\n## Subtítulo\n> Destaque/citação'}
            />
          )}
          <small className="muted">Linha em branco separa parágrafos · “## ” cria subtítulo · “&gt; ” cria destaque.</small>
        </div>
        <div className="field">
          <span>Passagens citadas ({verses.length})</span>
          <div className="chips">
            {verses.map((v) => (
              <span key={v} className="chip on sm">
                {v}
                {x.verses.includes(v) && (
                  <button type="button" aria-label={`Remover ${v}`} onClick={() => set({ verses: x.verses.filter((y) => y !== v) })}>
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="inline">
            <input value={verse} onChange={(e) => setVerse(e.target.value)} placeholder="Adicionar passagem (ex.: Fp 4:13)" />
            <button
              type="button"
              className="btn btn-gray sm"
              onClick={() => {
                const r = findRefs(verse)[0];
                if (!r) return toast('Passagem não reconhecida');
                set({ verses: [...x.verses, r.label] });
                setVerse('');
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
        <ImagePicker label="Miniatura (opcional)" value={x.thumb} onChange={(thumb) => set({ thumb })} />
        {media && x.media_url && (
          <div className="studio-media">
            <MediaPlayer url={x.media_url} />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            <Icon name="check" /> {busy ? 'Salvando…' : x.publish_at && new Date(x.publish_at) > new Date() ? 'Agendar' : x.id ? 'Salvar' : 'Publicar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ImportRow {
  url: string;
  title: string;
  author: string;
  thumb?: string;
  kind: 'video' | 'podcast';
  ok: boolean;
}

function ImportEditor({ onClose }: { onClose: () => void }) {
  const c = useCommunity();
  const { toast } = useUI();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [seriesId, setSeriesId] = useState('');
  const [busy, setBusy] = useState(false);
  const series = c.catalog?.series ?? [];

  const analyze = async () => {
    const urls = [...new Set(text.split(/\s+/).map((u) => u.trim()).filter(Boolean))].slice(0, 40);
    if (!urls.length) return toast('Cole pelo menos um link');
    setBusy(true);
    const out = await Promise.all(
      urls.map(async (url): Promise<ImportRow> => {
        const m = parseMedia(url);
        if (!m) return { url, title: '', author: '', kind: 'video', ok: false };
        const info = await fetchMediaInfo(m.url);
        return { url: m.url, title: info.title ?? '', author: info.author ?? '', thumb: info.thumb ?? m.thumb, kind: m.kind, ok: true };
      }),
    );
    setRows(out);
    setBusy(false);
  };

  const save = async () => {
    const list = rows!.filter((r) => r.ok && r.title.trim());
    if (!list.length) return toast('Preencha os títulos');
    setBusy(true);
    try {
      for (const [i, r] of list.entries())
        await c.call('save_content', { p: { kind: r.kind, title: r.title, author: r.author, thumb: r.thumb ?? null, media_url: r.url, series_id: seriesId, season: 1, position: i, verses: [] } });
      await c.refreshCatalog();
      toast(`${list.length} conteúdo(s) importado(s)`);
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} className="studio-modal wide" label="Importar vídeos e podcasts">
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="studio-form">
        <h2>Importar vídeos e podcasts</h2>
        <p className="muted small">Cole um ou vários links (um por linha): YouTube, Spotify (episódios), SoundCloud, Vimeo, Google Drive ou arquivos MP3/MP4.</p>
        {!rows ? (
          <>
            <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://www.youtube.com/watch?v=…\nhttps://open.spotify.com/episode/…'} />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={analyze}>
                {busy ? 'Analisando…' : 'Continuar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>Adicionar à série</span>
              <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
                <option value="">Avulsos (aparecem em Vídeos/Podcasts)</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind === 'mural' ? `Mural · ${monthLabel(s.month)}` : s.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="import-list">
              {rows.map((r, i) => (
                <div key={r.url} className={`import-row ${r.ok ? '' : 'bad'}`}>
                  {r.thumb ? <img src={r.thumb} alt="" /> : <span className="import-ph"><Icon name={r.kind === 'podcast' ? 'music' : 'play'} /></span>}
                  {r.ok ? (
                    <div>
                      <input value={r.title} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Título" aria-label="Título" />
                      <div className="inline">
                        <input value={r.author} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, author: e.target.value } : x)))} placeholder="Autor" aria-label="Autor" />
                        <select value={r.kind} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, kind: e.target.value as ImportRow['kind'] } : x)))} aria-label="Tipo">
                          <option value="video">Vídeo</option>
                          <option value="podcast">Podcast</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <span className="error small">Link não reconhecido: {r.url}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRows(null)}>
                Voltar
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={save}>
                <Icon name="download" /> {busy ? 'Importando…' : `Importar ${rows.filter((r) => r.ok).length}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

type Editing = { type: 'series'; d: SeriesDraft } | { type: 'content'; d: ContentDraft } | { type: 'import' } | null;

export function Studio() {
  const c = useCommunity();
  const { toast } = useUI();
  const route = useRoute();
  const [editing, setEditing] = useState<Editing>(null);
  const cat = c.catalog;

  const newContent = (p: Partial<ContentDraft> = {}): ContentDraft => ({
    title: '',
    kind: 'mensagem',
    season: 1,
    position: 0,
    verses: [],
    author: c.member?.name,
    author_role: c.member?.role === 'pastor' ? 'Pastor' : 'Líder',
    ...p,
  });

  // links diretos: #/estudio?serie=<id> e #/estudio?conteudo=<id>
  const qSerie = route.query.get('serie');
  const qContent = route.query.get('conteudo');
  useEffect(() => {
    if (!cat) return;
    const s = qSerie && cat.series.find((x) => x.id === qSerie);
    const x = qContent && cat.contents.find((y) => y.id === qContent);
    if (s) setEditing({ type: 'series', d: { ...s } });
    else if (x) setEditing({ type: 'content', d: { ...x } });
  }, [qSerie, qContent, !!cat]);

  const close = () => {
    setEditing(null);
    if (qSerie) setQuery('serie', null, true);
    if (qContent) setQuery('conteudo', null, true);
  };

  if (!c.session)
    return (
      <main className="page studio">
        <CommunityGate title="Estúdio da liderança" text="Entre com sua conta da igreja. Pastores e líderes liberam o estúdio com o código da liderança." />
      </main>
    );
  if (!c.isLeader)
    return (
      <main className="page studio">
        <div className="panel c-empty">
          <Icon name="lock" size={34} />
          <h2>Área de pastores e líderes</h2>
          <p className="muted">Se você é líder ou pastor(a), use o código da liderança em Relacionamentos → ⚙️ Meu perfil.</p>
          <a className="btn btn-primary" href="#/comunidade">
            Ir para Relacionamentos
          </a>
        </div>
      </main>
    );

  const remove = async (fn: 'delete_series' | 'delete_content', id: string, title: string) => {
    if (!confirm(`Excluir “${title}”?${fn === 'delete_series' ? ' Os episódios da série também serão excluídos.' : ''}`)) return;
    try {
      await c.call(fn, { p_id: id });
      await c.refreshCatalog();
      toast('Excluído');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const loose = cat?.contents.filter((x) => !x.series_id) ?? [];
  const thisMonth = cat?.series.find((s) => s.kind === 'mural' && s.month === monthKey());

  return (
    <main className="page studio">
      <div className="page-head">
        <div>
          <span className="kick">{ROLE_LABEL[c.member!.role]} · {COMMUNITY_NAME}</span>
          <h1 className="page-title">Estúdio</h1>
          <p className="muted">Crie séries e lançamentos, monte o mural do mês, publique mensagens e importe vídeos e podcasts.</p>
        </div>
      </div>
      <div className="studio-actions">
        <button className="studio-action" onClick={() => setEditing({ type: 'series', d: { title: '', kind: 'serie', seasons: ['Temporada 1'], author: c.member?.name } })}>
          <Icon name="star" size={26} />
          <b>Nova série / lançamento</b>
          <small>Mensagens temáticas com temporadas e data de estreia</small>
        </button>
        <button
          className="studio-action"
          onClick={() =>
            thisMonth
              ? setEditing({ type: 'content', d: newContent({ series_id: thisMonth.id, phase: 'pre' }) })
              : setEditing({ type: 'series', d: { title: `Mural de ${MONTHS[new Date().getMonth()]}`, kind: 'mural', month: monthKey(), seasons: sundaysOf(monthKey()) } })
          }
        >
          <Icon name="calendar" size={26} />
          <b>{thisMonth ? 'Postar no mural do mês' : 'Criar mural do mês'}</b>
          <small>Mensagens antes e depois da pregação de cada culto</small>
        </button>
        <button className="studio-action" onClick={() => setEditing({ type: 'content', d: newContent() })}>
          <Icon name="pen" size={26} />
          <b>Nova mensagem</b>
          <small>Texto completo com passagens e versículos citados</small>
        </button>
        <button className="studio-action" onClick={() => setEditing({ type: 'import' })}>
          <Icon name="download" size={26} />
          <b>Importar vídeos e podcasts</b>
          <small>YouTube, Spotify, SoundCloud, Vimeo, Drive, MP3</small>
        </button>
      </div>

      {!cat ? (
        <div className="spinner" />
      ) : (
        <>
          {cat.series.map((s) => (
            <section key={s.id} className="panel studio-series">
              <div className="studio-series-head">
                {s.cover ? <img src={s.cover} alt="" /> : <span className="studio-cover-ph"><Icon name={s.kind === 'mural' ? 'calendar' : 'star'} /></span>}
                <div>
                  <span className="kick">{s.kind === 'mural' ? `Mural · ${monthLabel(s.month)}` : s.launch_at && new Date(s.launch_at) > new Date() ? `Lançamento · ${new Date(s.launch_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Série'}</span>
                  <h2>{s.title}</h2>
                  {s.subtitle && <p className="muted small">{s.subtitle}</p>}
                </div>
                <div className="inline">
                  <a className="icon-btn" href={`#/mensagens/serie/${s.id}`} title="Ver como membro">
                    <Icon name="play" size={18} />
                  </a>
                  <button className="icon-btn" title="Editar série" onClick={() => setEditing({ type: 'series', d: { ...s } })}>
                    <Icon name="pen" size={18} />
                  </button>
                  <button className="icon-btn" title="Excluir série" onClick={() => remove('delete_series', s.id, s.title)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
              {seasonsOf(s, cat.contents).map((season) => (
                <div key={season.n} className="studio-season">
                  <h3>{season.title}</h3>
                  {season.items.map((x) => (
                    <StudioItem key={x.id} x={x} s={s} onEdit={() => setEditing({ type: 'content', d: { ...x } })} onDelete={() => remove('delete_content', x.id, x.title)} />
                  ))}
                  <button
                    className="chip ghost"
                    onClick={() => setEditing({ type: 'content', d: newContent({ series_id: s.id, season: season.n, position: season.items.length, phase: s.kind === 'mural' ? 'pre' : null }) })}
                  >
                    <Icon name="plus" size={14} /> Adicionar em “{season.title}”
                  </button>
                </div>
              ))}
            </section>
          ))}
          {loose.length > 0 && (
            <section className="panel studio-series">
              <h2>Avulsos (vídeos, podcasts e mensagens)</h2>
              {loose.map((x) => (
                <StudioItem key={x.id} x={x} onEdit={() => setEditing({ type: 'content', d: { ...x } })} onDelete={() => remove('delete_content', x.id, x.title)} />
              ))}
            </section>
          )}
          {!cat.series.length && !loose.length && <p className="muted">Nada publicado ainda. Comece criando uma série ou o mural do mês.</p>}
        </>
      )}

      {editing?.type === 'series' && <SeriesEditor initial={editing.d} onClose={close} />}
      {editing?.type === 'content' && <ContentEditor initial={editing.d} onClose={close} />}
      {editing?.type === 'import' && <ImportEditor onClose={close} />}
    </main>
  );
}

function StudioItem({ x, s, onEdit, onDelete }: { x: Content; s?: Series; onEdit: () => void; onDelete: () => void }) {
  const thumb = thumbOf(x, s);
  const scheduled = new Date(x.publish_at) > new Date();
  return (
    <div className="studio-item">
      {thumb ? <img src={thumb} alt="" /> : <span className="studio-thumb-ph"><Icon name={x.kind === 'podcast' ? 'music' : x.kind === 'video' ? 'play' : 'book'} size={18} /></span>}
      <div>
        <b>{x.title}</b>
        <small className="muted">
          {x.kind === 'mensagem' ? 'Mensagem' : x.kind === 'video' ? 'Vídeo' : 'Podcast'}
          {x.phase ? ` · ${x.phase === 'pre' ? 'Antes' : 'Depois'} da pregação` : ''}
          {x.author ? ` · ${x.author}` : ''}
          {scheduled ? ` · agendado ${new Date(x.publish_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
        </small>
      </div>
      <a className="icon-btn" href={`#/mensagens/item/${x.id}`} title="Ver">
        <Icon name="play" size={16} />
      </a>
      <button className="icon-btn" title="Editar" onClick={onEdit}>
        <Icon name="pen" size={16} />
      </button>
      <button className="icon-btn" title="Excluir" onClick={onDelete}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}
