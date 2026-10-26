import { CHURCH, nsKey } from './church';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Player de louvor em segundo plano com YouTube / YouTube Music (IFrame API oficial).
 * Faixas que as gravadoras bloqueiam fora do YouTube são puladas automaticamente.
 */

export interface ParsedMusic {
  uri: string;
  videoId?: string;
  list?: string;
  label: string;
  /** link para abrir no YouTube Music */
  openUrl: string;
}

export interface NowPlaying {
  title: string;
  artist?: string;
}

const DEFAULT_PRESETS: { name: string; desc: string; url: string }[] = [
  { name: 'Louvores Clássicos', desc: 'Hinos e louvores que marcaram gerações', url: 'https://youtu.be/XpIDU2R_j2M' },
  { name: 'Gospel 2026', desc: 'Playlist com os louvores mais tocados', url: 'https://www.youtube.com/watch?v=ldK43s9UyQI&list=PLveUSFqkZWtOQ252_YytOiV-ckTFMKCeg' },
];

/** Playlists sugeridas: as da igreja primeiro, depois as padrão (se mantidas). */
export const MUSIC_PRESETS: { name: string; desc: string; url: string }[] = [
  ...(CHURCH?.playlists ?? []).filter((p) => p.url).map((p) => ({ name: p.nome, desc: p.descricao ?? `Louvores da ${CHURCH!.nome}`, url: p.url })),
  ...(CHURCH && CHURCH.manterPlaylistsPadrao === false && CHURCH.playlists?.length ? [] : DEFAULT_PRESETS),
];

export function parseMusicUrl(raw: string): ParsedMusic | null {
  const text = raw.trim();
  if (!text) return null;
  let url: URL | null = null;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/(^|\.)youtu\.be$|(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$/.test(url.hostname)) return null;
  let list = url.searchParams.get('list') ?? undefined;
  let videoId = url.searchParams.get('v') ?? undefined;
  if (url.hostname.includes('youtu.be')) videoId = url.pathname.slice(1) || undefined;
  const embed = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/);
  if (embed) videoId = embed[1];
  // YouTube Music: music.youtube.com/browse/VLPL… (playlist)
  const browse = url.pathname.match(/\/browse\/VL([\w-]+)/);
  if (browse) list = browse[1];
  if (!videoId && !list) return null;
  const music = url.hostname.startsWith('music.');
  const openUrl = list ? `https://music.youtube.com/playlist?list=${list}` : `https://music.youtube.com/watch?v=${videoId}`;
  return { uri: `yt:${videoId ?? ''}:${list ?? ''}`, videoId, list, label: `${music ? 'YouTube Music' : 'YouTube'} · ${list ? 'playlist' : 'vídeo'}`, openUrl };
}

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  setVolume(v: number): void;
  getPlayerState(): number;
  getVideoData?(): { title?: string; author?: string };
  loadPlaylist(opts: { list: string; listType: 'playlist'; index?: number }): void;
  destroy(): void;
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
  }
}

let ytApi: Promise<void> | null = null;
function loadYouTube(): Promise<void> {
  ytApi ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return ytApi;
}

interface MusicState {
  current: ParsedMusic | null;
  url: string;
  playing: boolean;
  volume: number;
  now: NowPlaying | null;
  notice: string | null;
  load(url: string): boolean;
  toggle(): void;
  next(): void;
  prev(): void;
  stop(): void;
  reload(): void;
  setVolume(v: number): void;
  mountRef: (el: HTMLDivElement | null) => void;
}

const Ctx = createContext<MusicState | null>(null);
const LS_URL = nsKey('mb:music:url');
const LS_VOL = 'mb:music:vol';

function lsGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState(() => {
    const saved = lsGet(LS_URL) ?? '';
    return parseMusicUrl(saved) ? saved : '';
  });
  const [current, setCurrent] = useState<ParsedMusic | null>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [volume, setVol] = useState(() => Number(lsGet(LS_VOL) ?? 70));
  const host = useRef<HTMLDivElement | null>(null);
  const yt = useRef<YTPlayer | null>(null);
  const ytErrors = useRef(0);
  const volRef = useRef(volume);
  volRef.current = volume;

  const teardown = useCallback(() => {
    try {
      yt.current?.destroy();
    } catch {
      /* ignore */
    }
    yt.current = null;
    if (host.current) host.current.innerHTML = '';
  }, []);

  const start = useCallback(
    async (m: ParsedMusic, autoplay = true) => {
      teardown();
      setNotice(null);
      setNow(null);
      setPlaying(false);
      const el = host.current;
      if (!el) return;
      const slot = document.createElement('div');
      el.appendChild(slot);
      await loadYouTube();
      ytErrors.current = 0;
      yt.current = new window.YT!.Player(slot, {
        width: '100%',
        height: 200,
        host: 'https://www.youtube.com',
        videoId: m.videoId,
        playerVars: {
          ...(m.list ? { listType: 'playlist', list: m.list } : {}),
          autoplay: autoplay ? 1 : 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: location.origin,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(volRef.current);
            if (m.list && !m.videoId && autoplay) e.target.loadPlaylist({ list: m.list, listType: 'playlist', index: 0 });
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            setPlaying(e.data === 1);
            if (e.data === 1) {
              ytErrors.current = 0;
              setNotice(null);
              const d = e.target.getVideoData?.();
              if (d?.title) setNow({ title: d.title, artist: d.author });
            }
          },
          onError: (e: { data: number; target: YTPlayer }) => {
            // 101/150: o dono bloqueou a reprodução fora do YouTube; 100: vídeo removido
            ytErrors.current += 1;
            if (m.list && ytErrors.current < 25) {
              setNotice('Algumas faixas não permitem tocar fora do YouTube — pulando para a próxima…');
              e.target.nextVideo();
            } else {
              setNotice('Este conteúdo não permite reprodução fora do YouTube. Use “Abrir no YouTube Music” ou escolha outra playlist.');
            }
          },
        },
      });
    },
    [teardown],
  );

  const load = useCallback(
    (raw: string) => {
      const m = parseMusicUrl(raw);
      if (!m) return false;
      setUrl(raw);
      lsSet(LS_URL, raw);
      setCurrent(m);
      start(m);
      return true;
    },
    [start],
  );

  // restaura a última playlist sem tocar sozinha (os navegadores exigem um clique)
  useEffect(() => {
    if (!url || current) return;
    const m = parseMusicUrl(url);
    if (!m) return;
    setCurrent(m);
    start(m, false);
  }, []);

  const toggle = useCallback(() => {
    if (!yt.current) {
      if (current) start(current);
      return;
    }
    if (yt.current.getPlayerState() === 1) yt.current.pauseVideo();
    else yt.current.playVideo();
  }, [current, start]);

  const next = useCallback(() => yt.current?.nextVideo(), []);
  const prev = useCallback(() => yt.current?.previousVideo(), []);

  const stop = useCallback(() => {
    teardown();
    setCurrent(null);
    setNow(null);
    setNotice(null);
    setPlaying(false);
    setUrl('');
    lsSet(LS_URL, null);
  }, [teardown]);

  const reload = useCallback(() => {
    if (current) start(current);
  }, [current, start]);

  const setVolume = useCallback((v: number) => {
    const n = Math.max(0, Math.min(100, Math.round(v)));
    setVol(n);
    lsSet(LS_VOL, String(n));
    yt.current?.setVolume(n);
  }, []);

  const value = useMemo<MusicState>(
    () => ({
      current,
      url,
      playing,
      volume,
      now,
      notice,
      load,
      toggle,
      next,
      prev,
      stop,
      reload,
      setVolume,
      mountRef: (el) => {
        host.current = el;
      },
    }),
    [current, url, playing, volume, now, notice, load, toggle, next, prev, stop, reload, setVolume],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic(): MusicState {
  const v = useContext(Ctx);
  if (!v) throw new Error('MusicProvider ausente');
  return v;
}
