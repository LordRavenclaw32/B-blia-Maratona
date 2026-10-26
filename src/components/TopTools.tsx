import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { importBibleVersion, removeBibleVersion } from '../lib/api';
import { MUSIC_PRESETS, parseMusicUrl, useMusic } from '../lib/music';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { useVersions } from '../lib/useVersions';
import { Icon } from './Icon';
import { useUI } from './ui';
import { restoreCoverImages, withCoverImages } from '../lib/covers';

type Panel = 'music' | 'settings' | null;

const PanelCtx = createContext<{ panel: Panel; setPanel: (p: Panel) => void } | null>(null);

export function TopPanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    const onHash = () => setPanel(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);
  return <PanelCtx.Provider value={{ panel, setPanel }}>{children}</PanelCtx.Provider>;
}

function usePanel() {
  const v = useContext(PanelCtx);
  if (!v) throw new Error('TopPanelProvider ausente');
  return v;
}

/** Botões da barra superior: louvor (🎵) e configurações rápidas (⚙️). */
export function TopButtons() {
  const { panel, setPanel } = usePanel();
  const music = useMusic();
  return (
    <div className="top-buttons">
      {music.current && (
        <button className={`now-playing ${music.playing ? 'on' : ''}`} onClick={music.toggle} title={music.playing ? 'Pausar louvor' : 'Tocar louvor'} aria-label={music.playing ? 'Pausar louvor' : 'Tocar louvor'}>
          <span className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Icon name={music.playing ? 'pause' : 'play'} size={16} />
        </button>
      )}
      <button className={`icon-btn ${panel === 'music' ? 'on' : ''}`} onClick={() => setPanel(panel === 'music' ? null : 'music')} aria-label="Louvor de fundo" title="Louvor de fundo (YouTube Music)" aria-expanded={panel === 'music'}>
        <Icon name="music" />
      </button>
      <button className={`icon-btn ${panel === 'settings' ? 'on' : ''}`} onClick={() => setPanel(panel === 'settings' ? null : 'settings')} aria-label="Configurações rápidas" title="Configurações" aria-expanded={panel === 'settings'}>
        <Icon name="settings" />
      </button>
    </div>
  );
}

/** Painéis fixos sob a barra superior. O player continua tocando mesmo com o painel fechado. */
export function TopPanels() {
  const { panel, setPanel } = usePanel();
  return (
    <>
      <MusicDock open={panel === 'music'} onClose={() => setPanel(null)} />
      {panel === 'settings' && <QuickSettings onClose={() => setPanel(null)} />}
    </>
  );
}

function MusicDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const music = useMusic();
  const { toast } = useUI();
  const [input, setInput] = useState(music.url);
  const valid = !!parseMusicUrl(input);

  useEffect(() => setInput(music.url), [music.url]);

  const submit = (url = input) => {
    if (!music.load(url)) toast('Cole um link do YouTube Music ou do YouTube');
  };

  const loginYouTube = () => {
    const popup = window.open(
      'https://accounts.google.com/ServiceLogin?service=youtube&continue=' + encodeURIComponent('https://music.youtube.com/'),
      'bf-youtube-login',
      'width=520,height=680',
    );
    if (!popup) toast('Permita pop-ups para entrar no YouTube Music');
    else toast('Depois de entrar, volte aqui e toque em “Recarregar player”');
  };

  return (
    <section className={`top-panel music-dock ${open ? 'open' : 'hidden'}`} aria-label="Louvor de fundo" aria-hidden={!open}>
      <header>
        <b>
          <Icon name="music" size={18} /> Louvor de fundo
        </b>
        <button className="icon-btn" onClick={onClose} aria-label="Minimizar">
          <Icon name="chevronDown" />
        </button>
      </header>

      <div className="accounts">
        <button className="account youtube" onClick={loginYouTube}>
          <YouTubeLogo />
          <span>
            <b>Entrar no YouTube Music</b>
            <small>Use sua conta Google (Premium sem anúncios)</small>
          </span>
        </button>
      </div>

      <form
        className="music-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Link de playlist ou música do YouTube Music" aria-label="Link da música ou playlist" />
        <button className="btn btn-primary sm" disabled={!valid}>
          Tocar
        </button>
      </form>
      <div className="presets">
        {MUSIC_PRESETS.map((p) => (
          <button key={p.url} className={`preset ${music.url === p.url ? 'on' : ''}`} onClick={() => submit(p.url)}>
            <span className="preset-icon">
              <Icon name={music.url === p.url && music.playing ? 'pause' : 'play'} size={18} />
            </span>
            <span>
              <b>{p.name}</b>
              <small>{p.desc}</small>
            </span>
          </button>
        ))}
      </div>
      <a className="chip ghost search-more" href="https://music.youtube.com/search?q=louvor+adora%C3%A7%C3%A3o" target="_blank" rel="noreferrer">
        Buscar mais no YouTube Music ↗
      </a>

      {music.now && (
        <div className="now-card">
          <span className="now-art">
            <Icon name="music" />
          </span>
          <span className="now-text">
            <b>{music.now.title}</b>
            {music.now.artist && <small>{music.now.artist}</small>}
          </span>
        </div>
      )}
      <div className="music-host" ref={music.mountRef} />
      {music.notice && <p className="notice tiny">{music.notice}</p>}

      {music.current && (
        <footer>
          <div className="transport">
            <button className="icon-btn" onClick={music.prev} aria-label="Anterior">
              <Icon name="prev" size={20} />
            </button>
            <button className="round-btn white" onClick={music.toggle} aria-label={music.playing ? 'Pausar' : 'Tocar'}>
              <Icon name={music.playing ? 'pause' : 'play'} size={20} />
            </button>
            <button className="icon-btn" onClick={music.next} aria-label="Próxima">
              <Icon name="next" size={20} />
            </button>
          </div>
          <label className="vol">
            <Icon name="volumeDown" size={18} />
            <input type="range" min={0} max={100} value={music.volume} onChange={(e) => music.setVolume(Number(e.target.value))} aria-label="Volume" />
          </label>
          <div className="footer-links">
            <button className="link" onClick={music.reload}>
              <Icon name="refresh" size={14} /> Recarregar player
            </button>
            <a className="link" href={music.current.openUrl} target="_blank" rel="noreferrer">
              Abrir no YouTube Music ↗
            </a>
            <button className="link" onClick={music.stop}>
              Parar
            </button>
          </div>
        </footer>
      )}
      <p className="muted tiny">Aceita links do YouTube Music (playlist ou música) e do YouTube. Faixas bloqueadas pelas gravadoras para outros sites são puladas.</p>
    </section>
  );
}

function YouTubeLogo() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#FF0000" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="#fff" strokeWidth="1.4" />
      <path d="M10.4 9.3v5.4l4.4-2.7Z" fill="#fff" />
    </svg>
  );
}

function QuickSettings({ onClose }: { onClose: () => void }) {
  const { actions, profile } = useStore();
  const music = useMusic();
  const { toast } = useUI();
  const versions = useVersions();
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  const backupRef = useRef<HTMLInputElement>(null);
  const bibleRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast('Tela cheia não suportada neste navegador');
    }
  };

  const exportData = async () => {
    const blob = new Blob([await withCoverImages(actions.exportData())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bibliaflix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup salvo');
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      await restoreCoverImages(text);
      const n = actions.importData(text);
      toast(`Backup carregado (${n} perfil${n > 1 ? 's' : ''})`);
    } catch (e) {
      toast(`Backup inválido: ${(e as Error).message}`);
    }
  };

  const importBible = async (file: File) => {
    setBusy(true);
    try {
      const v = await importBibleVersion(file, label || file.name.slice(0, 4), file.name.replace(/\.json$/i, ''));
      actions.updateSettings({ version: v.id });
      setLabel('');
      toast(`Versão ${v.label} importada e selecionada`);
    } catch (e) {
      toast(`Não foi possível importar: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const vol = (d: number) => {
    if (!music.current) return toast('Nenhum louvor tocando');
    music.setVolume(music.volume + d);
  };

  return (
    <section className="top-panel quick-settings" aria-label="Configurações rápidas">
      <header>
        <b>
          <Icon name="settings" size={18} /> Configurações
        </b>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <Icon name="close" />
        </button>
      </header>

      <button className="qs-row" onClick={toggleFull}>
        <Icon name={full ? 'fullscreenExit' : 'fullscreen'} />
        <span>{full ? 'Sair da tela cheia' : 'Tela cheia'}</span>
      </button>

      <div className="qs-row static">
        <Icon name="volumeUp" />
        <span>Volume do louvor</span>
        <div className="qs-vol">
          <button onClick={() => vol(-10)} aria-label="Abaixar volume">
            <Icon name="volumeDown" size={18} />
          </button>
          <b>{music.volume}</b>
          <button onClick={() => vol(10)} aria-label="Aumentar volume">
            <Icon name="volumeUp" size={18} />
          </button>
        </div>
      </div>

      <div className="qs-group">
        <span className="qs-title">Backup</span>
        <div className="qs-actions">
          <button className="btn btn-gray sm" onClick={exportData}>
            <Icon name="download" size={18} /> Fazer backup
          </button>
          <button className="btn btn-gray sm" onClick={() => backupRef.current?.click()}>
            <Icon name="upload" size={18} /> Carregar backup
          </button>
          <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && importData(e.target.files[0]), (e.target.value = ''))} />
        </div>
      </div>

      <div className="qs-group">
        <span className="qs-title">Importar versão da Bíblia (JSON)</span>
        <div className="qs-actions">
          <input className="qs-label" value={label} onChange={(e) => setLabel(e.target.value.slice(0, 8))} placeholder="Sigla (ex.: NAA)" aria-label="Sigla da versão" />
          <button className="btn btn-gray sm" disabled={busy} onClick={() => bibleRef.current?.click()}>
            <Icon name="book" size={18} /> {busy ? 'Importando…' : 'Escolher arquivo'}
          </button>
          <input ref={bibleRef} type="file" accept="application/json,.json" hidden onChange={(e) => (e.target.files?.[0] && importBible(e.target.files[0]), (e.target.value = ''))} />
        </div>
        <p className="muted tiny">Aceita 66 livros com capítulos e versículos (ex.: formato thiagobodruk/biblia) ou lista de {'{ book, chapter, verse, text }'}.</p>
        {versions.filter((v) => v.custom).map((v) => (
          <div key={v.id} className="qs-version">
            <span>
              <b>{v.label}</b> {v.name}
            </span>
            <button
              className="link danger"
              onClick={() => {
                removeBibleVersion(v.id);
                if (profile?.settings.version === v.id) actions.updateSettings({ version: 'nvi' });
              }}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <button
        className="qs-row"
        onClick={() => {
          onClose();
          navigate('/settings');
        }}
      >
        <Icon name="settings" />
        <span>Todas as configurações</span>
      </button>

      <div className="qs-footer">
        <button
          className="btn btn-outline sm"
          onClick={() => {
            onClose();
            actions.logout();
            navigate('/profiles');
          }}
        >
          <Icon name="user" size={18} /> Trocar de conta
        </button>
        <button
          className="btn btn-danger sm"
          onClick={async () => {
            onClose();
            music.stop();
            if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
            actions.logout();
            try {
              sessionStorage.removeItem('mb:intro');
            } catch {
              /* ignore */
            }
            navigate('/profiles');
            window.close();
          }}
        >
          <Icon name="logout" size={18} /> Sair do app
        </button>
      </div>
    </section>
  );
}
