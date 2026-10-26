import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** Player de louvor em segundo plano (Spotify ou YouTube / YouTube Music) via APIs oficiais de incorporação. */

export type MusicSource = 'spotify' | 'youtube';

export interface ParsedMusic {
  source: MusicSource;
  /** spotify:playlist:ID | youtube video/playlist */
  uri: string;
  videoId?: string;
  list?: string;
  label: string;
}

export const MUSIC_PRESETS: { name: string; url: string }[] = [
  { name: 'Louvor e Adoração', url: 'https://open.spotify.com/playlist/4zAsoMuYnI86Z9kThONwSm' },
  { name: 'O que toca nas igrejas', url: 'https://open.spotify.com/playlist/0IY9lNvf7bBJ0ZLyrq0vrH' },
];

export function parseMusicUrl(raw: string): ParsedMusic | null {
  const text = raw.trim();
  if (!text) return null;
  const sp = text.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/) ?? text.match(/^spotify:(playlist|album|track|artist|episode|show):([A-Za-z0-9]+)$/);
  if (sp) return { source: 'spotify', uri: `spotify:${sp[1]}:${sp[2]}`, label: `Spotify · ${sp[1] === 'playlist' ? 'playlist' : sp[1] === 'album' ? 'álbum' : sp[1]}` };
  let url: URL | null = null;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/youtu\.?be/.test(url.hostname)) return null;
  const list = url.searchParams.get('list') ?? undefined;
  let videoId = url.searchParams.get('v') ?? undefined;
  if (url.hostname.includes('youtu.be')) videoId = url.pathname.slice(1) || undefined;
  const embed = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/);
  if (embed) videoId = embed[1];
  if (!videoId && !list) return null;
  const music = url.hostname.startsWith('music.');
  return { source: 'youtube', uri: `yt:${videoId ?? ''}:${list ?? ''}`, videoId, list, label: `${music ? 'YouTube Music' : 'YouTube'} · ${list ? 'playlist' : 'vídeo'}` };
}

// ───────── carregamento das APIs ─────────
type SpotifyController = {
  loadUri(uri: string): void;
  play(): void;
  togglePlay(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  addListener(ev: string, cb: (e: { data: { isPaused: boolean } }) => void): void;
};
type SpotifyApi = { createController(el: HTMLElement, opts: Record<string, unknown>, cb: (c: SpotifyController) => void): void };
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  getVolume(): number;
  getPlayerState(): number;
  destroy(): void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyApi) => void;
    onYouTubeIframeAPIReady?: () => void;
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer; PlayerState: { PLAYING: number } };
  }
}

let spotifyApi: Promise<SpotifyApi> | null = null;
function loadSpotify(): Promise<SpotifyApi> {
  if (!spotifyApi) {
    spotifyApi = new Promise((resolve) => {
      window.onSpotifyIframeApiReady = (api) => resolve(api);
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return spotifyApi;
}

let ytApi: Promise<void> | null = null;
function loadYouTube(): Promise<void> {
  if (!ytApi) {
    ytApi = new Promise((resolve) => {
      if (window.YT?.Player) return resolve();
      window.onYouTubeIframeAPIReady = () => resolve();
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return ytApi;
}

// ───────── contexto ─────────
interface MusicState {
  current: ParsedMusic | null;
  url: string;
  open: boolean;
  playing: boolean;
  volume: number;
  setOpen(v: boolean | ((o: boolean) => boolean)): void;
  load(url: string): boolean;
  toggle(): void;
  stop(): void;
  setVolume(v: number): void;
  volumeSupported: boolean;
  mountRef: (el: HTMLDivElement | null) => void;
}

const Ctx = createContext<MusicState | null>(null);
const LS_URL = 'mb:music:url';
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
  const [url, setUrl] = useState(() => lsGet(LS_URL) ?? '');
  const [current, setCurrent] = useState<ParsedMusic | null>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVol] = useState(() => Number(lsGet(LS_VOL) ?? 70));
  const host = useRef<HTMLDivElement | null>(null);
  const spotify = useRef<SpotifyController | null>(null);
  const yt = useRef<YTPlayer | null>(null);
  const volRef = useRef(volume);
  volRef.current = volume;

  const teardown = useCallback(() => {
    try {
      spotify.current?.destroy();
    } catch {
      /* ignore */
    }
    try {
      yt.current?.destroy();
    } catch {
      /* ignore */
    }
    spotify.current = null;
    yt.current = null;
    if (host.current) host.current.innerHTML = '';
    setPlaying(false);
  }, []);

  const mount = useCallback(
    async (m: ParsedMusic) => {
      const el = host.current;
      if (!el) return;
      teardown();
      const slot = document.createElement('div');
      el.appendChild(slot);
      if (m.source === 'spotify') {
        const api = await loadSpotify();
        api.createController(slot, { uri: m.uri, width: '100%', height: 152 }, (c) => {
          spotify.current = c;
          c.addListener('playback_update', (e) => setPlaying(!e.data.isPaused));
        });
      } else {
        await loadYouTube();
        yt.current = new window.YT!.Player(slot, {
          width: '100%',
          height: 200,
          videoId: m.videoId,
          playerVars: { ...(m.list ? { listType: 'playlist', list: m.list } : {}), playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e: { target: YTPlayer }) => e.target.setVolume(volRef.current),
            onStateChange: (e: { data: number }) => setPlaying(e.data === 1),
          },
        });
      }
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
      mount(m);
      return true;
    },
    [mount],
  );

  // restaura a última playlist (sem tocar sozinha: navegadores exigem um clique)
  useEffect(() => {
    if (url && host.current && !current) {
      const m = parseMusicUrl(url);
      if (m) {
        setCurrent(m);
        mount(m);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    if (spotify.current) spotify.current.togglePlay();
    else if (yt.current) {
      if (yt.current.getPlayerState() === 1) yt.current.pauseVideo();
      else yt.current.playVideo();
    } else setOpen(true);
  }, []);

  const stop = useCallback(() => {
    teardown();
    setCurrent(null);
    setUrl('');
    lsSet(LS_URL, null);
  }, [teardown]);

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
      open,
      playing,
      volume,
      setOpen,
      load,
      toggle,
      stop,
      setVolume,
      volumeSupported: current?.source !== 'spotify',
      mountRef: (el) => {
        host.current = el;
      },
    }),
    [current, url, open, playing, volume, load, toggle, stop, setVolume],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic(): MusicState {
  const v = useContext(Ctx);
  if (!v) throw new Error('MusicProvider ausente');
  return v;
}
