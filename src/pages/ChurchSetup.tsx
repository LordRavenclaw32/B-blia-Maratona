import { useEffect, useMemo, useRef, useState } from 'react';
import { BFMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { useUI } from '../components/ui';
import { BOOKS } from '../data/books';
import { VERSIONS } from '../lib/api';
import { accessHash, DEMO_SLUG, demoConfig, LS_DEMO, planDays, type ChurchConfig } from '../lib/church';

/** Configurador do app de uma igreja: monte, teste neste aparelho e baixe o arquivo para publicar. */

type Form = ChurchConfig & { codigo?: string };

const COLORS = ['#e50914', '#1e6bd6', '#0f8a5f', '#7b3fe4', '#d4a017', '#e0592a', '#0e7490', '#be185d', '#334155'];

const PLAN_PRESETS: { name: string; livros: string[]; per: number }[] = [
  { name: 'Atos', livros: ['at'], per: 1 },
  { name: 'Evangelhos', livros: ['mt', 'mc', 'lc', 'jo'], per: 2 },
  { name: 'Novo Testamento', livros: BOOKS.filter((b) => b.testament === 'NT').map((b) => b.id), per: 2 },
  { name: 'Salmos e Provérbios', livros: ['sl', 'pv'], per: 3 },
  { name: 'Bíblia em 1 ano', livros: BOOKS.map((b) => b.id), per: 4 },
];

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isoToday(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function blank(): Form {
  return {
    slug: '',
    nome: '',
    app: { nome: '', subtitulo: '' },
    cor: '#1e6bd6',
    cidade: '',
    pastor: '',
    boasVindas: '',
    contato: {},
    cultos: [
      { dia: 'Domingo', hora: '18h', nome: 'Culto da Família' },
      { dia: 'Quarta-feira', hora: '19h30', nome: 'Culto de Oração e Estudo' },
    ],
    avisos: [],
    playlists: [],
    manterPlaylistsPadrao: true,
    plano: { titulo: 'Maratona de Atos', descricao: 'Um capítulo por dia, todos juntos.', inicio: isoToday(), capitulosPorDia: 1, livros: ['at'] },
    versoes: [],
    creditoBibliaFlix: true,
  };
}

function fileToLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('Falha ao ler a logo'));
      r.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 384 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function ListEditor<T extends Record<string, string | undefined>>({
  items,
  onChange,
  fields,
  empty,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  fields: { key: keyof T & string; label: string; type?: string; wide?: boolean }[];
  empty: T;
  addLabel: string;
}) {
  return (
    <div className="list-editor">
      {items.map((it, i) => (
        <div key={i} className="le-row">
          {fields.map((f) => (
            <input
              key={f.key}
              className={f.wide ? 'wide' : ''}
              type={f.type ?? 'text'}
              value={it[f.key] ?? ''}
              placeholder={f.label}
              aria-label={f.label}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))}
            />
          ))}
          <button className="icon-btn" type="button" aria-label="Remover" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      ))}
      <button className="chip ghost" type="button" onClick={() => onChange([...items, { ...empty }])}>
        <Icon name="plus" size={14} /> {addLabel}
      </button>
    </div>
  );
}

export function ChurchSetup() {
  const { toast } = useUI();
  const [f, setF] = useState<Form>(() => {
    const d = demoConfig();
    return d ? { ...blank(), ...d, slug: d.slugReal ?? '' } : blank();
  });
  const [bookQ, setBookQ] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const slug = f.slug || slugify(f.app?.nome || f.nome);
  const set = (patch: Partial<Form>) => setF((cur) => ({ ...cur, ...patch }));
  const setContato = (k: string, v: string) => set({ contato: { ...f.contato, [k]: v } });
  const plan = f.plano!;
  const setPlan = (patch: Partial<NonNullable<Form['plano']>>) => set({ plano: { ...plan, ...patch } });

  const days = useMemo(() => (plan.livros.length ? planDays(plan) : []), [plan]);
  const appName = f.app?.nome || f.nome || 'Nome do app';

  useEffect(() => {
    document.title = 'Configurar app da igreja';
  }, []);

  const clean = async (): Promise<ChurchConfig> => {
    const { codigo, ...rest } = f;
    const out: ChurchConfig & Record<string, unknown> = { ...rest, slug };
    delete out.slugReal;
    const hash = codigo?.trim() ? await accessHash(slug, codigo) : f.acesso?.hash;
    out.acesso = hash ? { hash, dica: f.acesso?.dica || undefined } : undefined;
    out.cultos = f.cultos?.filter((c) => c.dia || c.hora);
    out.avisos = f.avisos?.filter((a) => a.titulo);
    out.playlists = f.playlists?.filter((p) => p.url);
    out.contato = Object.fromEntries(Object.entries(f.contato ?? {}).filter(([, v]) => v));
    if (!plan.livros.length) delete out.plano;
    return JSON.parse(JSON.stringify(out)) as ChurchConfig;
  };

  const testDemo = async () => {
    if (!f.nome.trim()) return toast('Informe o nome da igreja');
    const cfg = { ...(await clean()), slugReal: slug };
    try {
      localStorage.setItem(LS_DEMO, JSON.stringify(cfg));
    } catch {
      return toast('Sem espaço no navegador: use uma logo menor');
    }
    location.href = `${location.pathname}?igreja=${DEMO_SLUG}#/browse`;
  };

  const exportFile = async () => {
    if (!f.nome.trim()) return toast('Informe o nome da igreja');
    download(`${slug}.json`, JSON.stringify(await clean(), null, 2));
    toast(`Arquivo ${slug}.json baixado`);
  };

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Form;
      if (!data.nome) throw new Error('arquivo sem "nome"');
      setF({ ...blank(), ...data, codigo: '' });
      toast('Configuração carregada');
    } catch (e) {
      toast(`Arquivo inválido: ${(e as Error).message}`);
    }
  };

  const books = BOOKS.filter((b) => !bookQ || b.name.toLowerCase().includes(bookQ.toLowerCase()));
  const toggleBook = (id: string) => setPlan({ livros: plan.livros.includes(id) ? plan.livros.filter((x) => x !== id) : [...plan.livros, id] });
  const link = new URL(`igreja/${slug}/`, new URL('./', location.href)).href;

  return (
    <main className="page church-setup" style={{ ['--red' as string]: f.cor }}>
      <div className="page-head">
        <div>
          <span className="kick">BíbliaFlix para igrejas</span>
          <h1 className="page-title">Configurar app da igreja</h1>
          <p className="muted">Preencha, teste neste aparelho e baixe o arquivo da igreja para publicar.</p>
        </div>
        <div className="inline">
          <a className="btn btn-outline sm" href="#/apresentacao">
            <Icon name="back" size={18} /> Apresentação
          </a>
          <button className="btn btn-gray sm" onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={18} /> Abrir arquivo
          </button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && importFile(e.target.files[0]), (e.target.value = ''))} />
        </div>
      </div>

      <div className="setup-layout">
        <div className="setup-form">
          <section className="panel">
            <h2>1. Identidade</h2>
            <div className="form-grid">
              <label>
                <span>Nome da igreja *</span>
                <input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Igreja Batista Central" />
              </label>
              <label>
                <span>Nome do app</span>
                <input value={f.app?.nome ?? ''} onChange={(e) => set({ app: { ...f.app, nome: e.target.value } })} placeholder="Batista Central Play" />
              </label>
              <label>
                <span>Subtítulo</span>
                <input value={f.app?.subtitulo ?? ''} onChange={(e) => set({ app: { ...f.app, subtitulo: e.target.value } })} placeholder="A maratona bíblica da nossa igreja" />
              </label>
              <label>
                <span>Endereço do link</span>
                <input value={f.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} placeholder={slug || 'batista-central'} />
              </label>
              <label>
                <span>Cidade</span>
                <input value={f.cidade ?? ''} onChange={(e) => set({ cidade: e.target.value })} placeholder="São Paulo · SP" />
              </label>
              <label>
                <span>Pastor(a) / liderança</span>
                <input value={f.pastor ?? ''} onChange={(e) => set({ pastor: e.target.value })} placeholder="Pr. João e Pra. Maria" />
              </label>
            </div>
            <label className="field">
              <span>Mensagem de boas-vindas</span>
              <textarea rows={2} value={f.boasVindas ?? ''} onChange={(e) => set({ boasVindas: e.target.value })} placeholder="Que alegria ter você aqui! Vamos ler a Palavra juntos." />
            </label>
            <div className="setup-brand">
              <div>
                <span className="qs-title">Logo</span>
                <div className="inline">
                  <button className="logo-drop" type="button" onClick={() => logoRef.current?.click()}>
                    {f.logo ? <img src={f.logo} alt="Logo" /> : <Icon name="image" size={30} />}
                  </button>
                  <div className="setup-hint">
                    <button className="btn btn-gray sm" type="button" onClick={() => logoRef.current?.click()}>
                      <Icon name="upload" size={16} /> {f.logo ? 'Trocar logo' : 'Enviar logo'}
                    </button>
                    {f.logo && (
                      <button className="link small" type="button" onClick={() => set({ logo: undefined })}>
                        Remover
                      </button>
                    )}
                    <small className="muted">PNG com fundo transparente fica melhor.</small>
                  </div>
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) set({ logo: await fileToLogo(file).catch((err: Error) => (toast(err.message), f.logo)) });
                  }}
                />
              </div>
              <div>
                <span className="qs-title">Cor principal</span>
                <div className="color-row">
                  {COLORS.map((c) => (
                    <button key={c} type="button" className={`swatch ${f.cor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ cor: c })} aria-label={`Cor ${c}`} />
                  ))}
                  <input type="color" value={f.cor ?? '#e50914'} onChange={(e) => set({ cor: e.target.value })} aria-label="Outra cor" />
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>2. Plano de leitura da igreja</h2>
            <div className="chips">
              {PLAN_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={`chip ${plan.livros.join() === p.livros.join() ? 'on' : ''}`}
                  onClick={() => setPlan({ livros: p.livros, capitulosPorDia: p.per, titulo: p.name === 'Bíblia em 1 ano' ? 'Bíblia em 1 ano' : `Maratona de ${p.name}` })}
                >
                  {p.name}
                </button>
              ))}
              <button type="button" className="chip ghost" onClick={() => setPlan({ livros: [] })}>
                Sem plano
              </button>
            </div>
            <div className="form-grid">
              <label>
                <span>Título</span>
                <input value={plan.titulo} onChange={(e) => setPlan({ titulo: e.target.value })} />
              </label>
              <label>
                <span>Início</span>
                <input type="date" value={plan.inicio} onChange={(e) => setPlan({ inicio: e.target.value })} />
              </label>
              <label>
                <span>Capítulos por dia</span>
                <input type="number" min={1} max={20} value={plan.capitulosPorDia} onChange={(e) => setPlan({ capitulosPorDia: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
            </div>
            <label className="field">
              <span>Descrição</span>
              <input value={plan.descricao ?? ''} onChange={(e) => setPlan({ descricao: e.target.value })} />
            </label>
            <div className="field">
              <span>Livros ({plan.livros.length}) — toque para incluir ou tirar</span>
              <input value={bookQ} onChange={(e) => setBookQ(e.target.value)} placeholder="Filtrar livros" aria-label="Filtrar livros" />
              <div className="chips book-chips">
                {books.map((b) => (
                  <button key={b.id} type="button" className={`chip sm ${plan.livros.includes(b.id) ? 'on' : ''}`} onClick={() => toggleBook(b.id)}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            {days.length > 0 && (
              <p className="muted small">
                {days.length} dias · termina em {days[days.length - 1].date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </section>

          <section className="panel">
            <h2>3. Cultos e avisos</h2>
            <span className="qs-title">Cultos e reuniões</span>
            <ListEditor
              items={f.cultos ?? []}
              onChange={(cultos) => set({ cultos: cultos as Form['cultos'] })}
              fields={[
                { key: 'dia', label: 'Dia' },
                { key: 'hora', label: 'Horário' },
                { key: 'nome', label: 'Nome (opcional)', wide: true },
              ]}
              empty={{ dia: '', hora: '', nome: '' }}
              addLabel="Adicionar culto"
            />
            <span className="qs-title">Avisos e eventos</span>
            <ListEditor
              items={f.avisos ?? []}
              onChange={(avisos) => set({ avisos: avisos as Form['avisos'] })}
              fields={[
                { key: 'titulo', label: 'Título', wide: true },
                { key: 'data', label: 'Data', type: 'date' },
                { key: 'texto', label: 'Descrição', wide: true },
                { key: 'link', label: 'Link (opcional)' },
              ]}
              empty={{ titulo: '', data: isoToday(7), texto: '', link: '' }}
              addLabel="Adicionar aviso"
            />
          </section>

          <section className="panel">
            <h2>4. Contato e redes</h2>
            <div className="form-grid">
              {(
                [
                  ['whatsapp', 'WhatsApp (com DDD)', '11987654321'],
                  ['instagram', 'Instagram', '@suaigreja'],
                  ['youtube', 'YouTube', 'youtube.com/@suaigreja'],
                  ['site', 'Site', 'suaigreja.com.br'],
                  ['email', 'E-mail', 'contato@suaigreja.com.br'],
                  ['pix', 'Chave Pix (dízimos e ofertas)', 'CNPJ, e-mail ou telefone'],
                ] as const
              ).map(([k, label, ph]) => (
                <label key={k}>
                  <span>{label}</span>
                  <input value={f.contato?.[k] ?? ''} onChange={(e) => setContato(k, e.target.value)} placeholder={ph} />
                </label>
              ))}
            </div>
            <label className="field">
              <span>Endereço</span>
              <input value={f.contato?.endereco ?? ''} onChange={(e) => setContato('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </label>
          </section>

          <section className="panel">
            <h2>5. Louvor</h2>
            <ListEditor
              items={(f.playlists ?? []) as unknown as Record<string, string>[]}
              onChange={(pl) => set({ playlists: pl as unknown as Form['playlists'] })}
              fields={[
                { key: 'nome', label: 'Nome da playlist' },
                { key: 'url', label: 'Link do YouTube / YouTube Music', wide: true },
              ]}
              empty={{ nome: '', url: '' }}
              addLabel="Adicionar playlist"
            />
            <label className="check">
              <input type="checkbox" checked={f.manterPlaylistsPadrao !== false} onChange={(e) => set({ manterPlaylistsPadrao: e.target.checked })} />
              <span>Manter também as playlists Louvores Clássicos e Gospel 2026</span>
            </label>
          </section>

          <section className="panel">
            <h2>6. Bíblia e acesso</h2>
            <span className="qs-title">Versões disponíveis no app</span>
            <div className="chips">
              {VERSIONS.map((v) => {
                const on = !f.versoes?.length || f.versoes.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    onClick={() => {
                      const cur = f.versoes?.length ? f.versoes : VERSIONS.map((x) => x.id);
                      const next = on ? cur.filter((x) => x !== v.id) : [...cur, v.id];
                      if (next.length) set({ versoes: next.length === VERSIONS.length ? [] : next, versaoPadrao: next.includes(f.versaoPadrao ?? '') ? f.versaoPadrao : next[0] });
                    }}
                    title={v.name}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
            <p className="muted tiny">NVI, ARA e ARC têm direitos autorais das editoras. Para uso comercial, a igreja pode importar a versão que tiver licença pelo menu ⚙️.</p>
            <div className="form-grid">
              <label>
                <span>Código de acesso (opcional)</span>
                <input value={f.codigo ?? ''} onChange={(e) => set({ codigo: e.target.value })} placeholder={f.acesso?.hash ? 'Código já definido — digite para trocar' : 'Ex.: central2026'} />
              </label>
              <label>
                <span>Dica do código</span>
                <input value={f.acesso?.dica ?? ''} onChange={(e) => set({ acesso: { ...f.acesso, dica: e.target.value } })} placeholder="Peça na secretaria" />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.creditoBibliaFlix !== false} onChange={(e) => set({ creditoBibliaFlix: e.target.checked })} />
              <span>Mostrar “tecnologia BíbliaFlix” no rodapé</span>
            </label>
          </section>
        </div>

        <aside className="setup-preview">
          <div className="phone">
            <div className="phone-bar">
              {f.logo ? <img src={f.logo} alt="" /> : <BFMark size={30} />}
              <b>{appName.toUpperCase()}</b>
            </div>
            <div className="phone-hero">
              <span className="kick">{f.cidade || 'Sua cidade'}</span>
              <h3>{f.nome || 'Nome da igreja'}</h3>
              <p>{f.app?.subtitulo || 'A maratona bíblica da nossa igreja'}</p>
              {days[0] && (
                <div className="phone-plan">
                  <small>Plano da igreja · Dia 1</small>
                  <b>{plan.titulo}</b>
                  <span className="btn btn-primary sm">
                    <Icon name="play" size={14} /> Ler agora
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="setup-actions">
            <button className="btn btn-primary" onClick={testDemo}>
              <Icon name="play" /> Testar neste aparelho
            </button>
            <button className="btn btn-gray" onClick={exportFile}>
              <Icon name="download" /> Baixar {slug ? `${slug}.json` : 'arquivo da igreja'}
            </button>
          </div>
          <div className="panel setup-steps">
            <h2>Publicar</h2>
            <ol>
              <li>Baixe o arquivo da igreja.</li>
              <li>
                No GitHub, abra a pasta <b>igrejas/</b> → <b>Add file → Upload files</b> e envie o arquivo.
              </li>
              <li>Em cerca de 2 minutos o app da igreja estará no ar:</li>
            </ol>
            <code className="setup-link">{slug ? link : '—'}</code>
            <p className="muted tiny">Para atualizar avisos ou plano depois, edite e envie o arquivo de novo com o mesmo nome.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
