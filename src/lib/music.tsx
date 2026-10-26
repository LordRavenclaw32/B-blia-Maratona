import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AUTH_EVENT, getSpotifyAuth, spotifyApi, spotifyToken } from './spotifyAuth';

/**
 * Player de louvor em segundo plano.
 * - Spotify: com login → Web Playback SDK (músicas completas, volume e controles); sem login → player incorporado.
 * - YouTube / YouTube Music: IFrame API, pulando automaticamente vídeos bloqueados para incorporação.
 */

export type MusicSource = 'spotify' | 'youtube';

export interface ParsedMusic {
  source: MusicSource;
  /** spotify:playlist:ID | yt:video:list */
  uri: string;
  videoId?: string;
  list?: string;
  label: string;
  /** link para abrir no site/app oficial */
  openUrl: string;
}

export interface NowPlaying {
  title: string;
  artist?: string;
  image?: string;
}

export const MUSIC_PRESETS: { name: string; url: string }[] = [
  { name: 'Louvor e Adoração', url: 'https://open.spotify.com/playlist/4zAsoMuYnI86Z9kThONwSm' },
  { name: 'O que toca nas igrejas', url: 'https://open.spotify.com/playlist/0IY9lNvf7bBJ0ZLyrq0vrH' },
];

export function parseMusicUrl(raw: string): ParsedMusic | null {
  const text = raw.trim();
  if (!text) return null;
  const sp =
    text.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)/) ??
    text.match(/^spotify:(playlist|album|track|artist|episode|show):([A-Za-z0-9]+)$/);
  if (sp) {
    const kind = sp[1] === 'playlist' ? 'playlist' : sp[1] === 'album' ? 'álbum' : sp[1] === 'track' ? 'música' : sp[1];
    return { source: 'spotify', uri: `spotify:${sp[1]}:${sp[2]}`, label: `Spotify · ${kind}`, openUrl: `https://open.spotify.com/${sp[1]}/${sp[2]}` };
  }
  let url: URL | null = null;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/(^|\.)youtu\.?be(\.com)?$|youtube\.com$/.test(url.hostname)) return null;
  let list = url.searchParams.get('list') ?? undefined;
  let videoId = url.searchParams.get('v') ?? undefined;
  if (url.hostname.includes('youtu.be')) videoId = url.pathname.slice(1) || undefined;
  const embed = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/);
  if (embed) videoId = embed[1];
  // YouTube Music: music.youtube.com/browse/VLPL… (playlist) ou /browse/MPRE… (álbum, não incorporável)
  const browse = url.pathname.match(/\/browse\/VL([\w-]+)/);
  if (browse) list = browse[1];
  if (!videoId && !list) return null;
  const music = url.hostname.startsWith('music.');
  const openUrl = list ? `https://music.youtube.com/playlist?list=${list}` : `https://music.youtube.com/watch?v=${videoId}`;
  return { source: 'youtube', uri: `yt:${videoId ?? ''}:${list ?? ''}`, videoId, list, label: `${music ? 'YouTube Music' : 'YouTube'} · ${list ? 'playlist' : 'vídeo'}`, openUrl };
}

// ───────── carregamento das APIs ─────────
type SpotifyController = {
  togglePlay(): void;
  destroy(): void;
  addListener(ev: string, cb: (e: { data: { isPaused: boolean } }) => void): void;
};
type SpotifyEmbedApi = { createController(el: HTMLElement, opts: Record<string, unknown>, cb: (c: SpotifyController) => void): void };

interface SdkState {
  paused: boolean;
  track_window: { current_track: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } } | null };
}
interface SdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(v: number): Promise<void>;
  activateElement?(): Promise<void>;
  addListener(ev: string, cb: (arg: never) => void): void;
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
    onSpotifyIframeApiReady?: (api: SpotifyEmbedApi) => void;
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (opts: Record<string, unknown>) => SdkPlayer };
    onYouTubeIframeAPIReady?: () => void;
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
  }
}

function loadScript(src: string) {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

let embedApi: Promise<SpotifyEmbedApi> | null = null;
function loadSpotifyEmbed(): Promise<SpotifyEmbedApi> {
  embedApi ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    loadScript('https://open.spotify.com/embed/iframe-api/v1');
  });
  return embedApi;
}

let sdkReady: Promise<void> | null = null;
function loadSpotifySdk(): Promise<void> {
  sdkReady ??= new Promise((resolve) => {
    if (window.Spotify?.Player) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    loadScript('https://sdk.scdn.co/spotify-player.js');
  });
  return sdkReady;
}

let ytApi: Promise<void> | null = null;
function loadYouTube(): Promise<void> {
  ytApi ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    loadScript('https://www.youtube.com/iframe_api');
  });
  return ytApi;
}

// ───────── contexto ─────────
export type PlayerMode = 'spotify-sdk' | 'spotify-embed' | 'youtube' | null;

interface MusicState {
  current: ParsedMusic | null;
  mode: PlayerMode;
  url: string;
  playing: boolean;
  volume: number;
  now: NowPlaying | null;
  notice: string | null;
  spotifyConnected: boolean;
  spotifyUser: string | null;
  load(url: string): boolean;
  toggle(): void;
  next(): void;
  prev(): void;
  stop(): void;
  reload(): void;
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
  const [mode, setMode] = useState<PlayerMode>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [volume, setVol] = useState(() => Number(lsGet(LS_VOL) ?? 70));
  const [spotifyConnected, setSpotifyConnected] = useState(() => !!getSpotifyAuth());
  const [spotifyUser, setSpotifyUser] = useState<string | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const embed = useRef<SpotifyController | null>(null);
  const sdk = useRef<{ player: SdkPlayer; device: Promise<string> } | null>(null);
  const yt = useRef<YTPlayer | null>(null);
  const ytErrors = useRef(0);
  const volRef = useRef(volume);
  volRef.current = volume;

  // sessão do Spotify
  useEffect(() => {
    const on = () => setSpotifyConnected(!!getSpotifyAuth());
    window.addEventListener(AUTH_EVENT, on);
    return () => window.removeEventListener(AUTH_EVENT, on);
  }, []);

  useEffect(() => {
    if (!spotifyConnected) {
      setSpotifyUser(null);
      sdk.current?.player.disconnect();
      sdk.current = null;
      return;
    }
    spotifyApi<{ display_name?: string; product?: string }>('/me')
      .then((me) => setSpotifyUser(me ? `${me.display_name ?? 'Conta Spotify'}${me.product === 'premium' ? ' · Premium' : ''}` : null))
      .catch(() => setSpotifyUser(null));
  }, [spotifyConnected]);

  const teardownWidgets = useCallback(() => {
    try {
      embed.current?.destroy();
    } catch {
      /* ignore */
    }
    try {
      yt.current?.destroy();
    } catch {
      /* ignore */
    }
    embed.current = null;
    yt.current = null;
    if (host.current) host.current.innerHTML = '';
  }, []);

  /** Cria (uma vez) o aparelho "BíbliaFlix" no Spotify. */
  const ensureSdk = useCallback(async () => {
    if (sdk.current) return sdk.current;
    await loadSpotifySdk();
    let resolveDevice!: (id: string) => void;
    let rejectDevice!: (e: Error) => void;
    const device = new Promise<string>((res, rej) => {
      resolveDevice = res;
      rejectDevice = rej;
    });
    const player = new window.Spotify!.Player({
      name: 'BíbliaFlix',
      volume: volRef.current / 100,
      getOAuthToken: (cb: (t: string) => void) => spotifyToken().then((t) => t && cb(t)),
    });
    player.addListener('ready', (({ device_id }: { device_id: string }) => resolveDevice(device_id)) as never);
    player.addListener('account_error', (() => rejectDevice(new Error('PREMIUM_REQUIRED'))) as never);
    player.addListener('authentication_error', (() => rejectDevice(new Error('AUTH'))) as never);
    player.addListener('initialization_error', (() => rejectDevice(new Error('INIT'))) as never);
    player.addListener('player_state_changed', ((s: SdkState | null) => {
      if (!s) return;
      setPlaying(!s.paused);
      const t = s.track_window.current_track;
      if (t) setNow({ title: t.name, artist: t.artists.map((a) => a.name).join(', '), image: t.album.images[0]?.url });
    }) as never);
    await player.connect();
    sdk.current = { player, device };
    return sdk.current;
  }, []);

  const mountEmbed = useCallback(
    async (m: ParsedMusic) => {
      const el = host.current;
      if (!el) return;
      const slot = document.createElement('div');
      el.appendChild(slot);
      const api = await loadSpotifyEmbed();
      api.createController(slot, { uri: m.uri, width: '100%', height: 152 }, (c) => {
        embed.current = c;
        c.addListener('playback_update', (e) => setPlaying(!e.data.isPaused));
      });
      setMode('spotify-embed');
    },
    [],
  );

  const mountYouTube = useCallback(async (m: ParsedMusic) => {
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
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        origin: location.origin,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          e.target.setVolume(volRef.current);
          if (m.list && !m.videoId) e.target.loadPlaylist({ list: m.list, listType: 'playlist', index: 0 });
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
          // 101/150: dono bloqueou a reprodução fora do YouTube; 100: vídeo removido
          ytErrors.current += 1;
          if (m.list && ytErrors.current < 25) {
            setNotice('Algumas faixas não permitem tocar fora do YouTube — pulando para a próxima…');
            e.target.nextVideo();
          } else {
            setNotice('Esta música/playlist não permite reprodução fora do YouTube. Use “Abrir no YouTube Music” ou outra playlist.');
          }
        },
      },
    });
    setMode('youtube');
  }, []);

  const start = useCallback(
    async (m: ParsedMusic) => {
      teardownWidgets();
      setNotice(null);
      setNow(null);
      setPlaying(false);
      if (m.source === 'spotify' && getSpotifyAuth()) {
        try {
          const s = await ensureSdk();
          const device = await Promise.race([s.device, new Promise<string>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 15000))]);
          await s.player.activateElement?.();
          const body = m.uri.includes(':track:') || m.uri.includes(':episode:') ? { uris: [m.uri] } : { context_uri: m.uri };
          await spotifyApi(`/me/player/play?device_id=${device}`, { method: 'PUT', body: JSON.stringify(body) });
          setMode('spotify-sdk');
          return;
        } catch (e) {
          const msg = (e as Error).message;
          setNotice(
            msg === 'PREMIUM_REQUIRED'
              ? 'O Spotify só permite tocar dentro de outros apps para contas Premium. Usando o player do Spotify (completo se você estiver logado no site do Spotify neste navegador).'
              : 'Não foi possível usar sua conta do Spotify aqui. Usando o player do Spotify.',
          );
        }
      }
      if (m.source === 'spotify') await mountEmbed(m);
      else await mountYouTube(m);
    },
    [ensureSdk, mountEmbed, mountYouTube, teardownWidgets],
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
    if (m.source === 'spotify' && getSpotifyAuth()) setMode('spotify-sdk');
    else if (m.source === 'spotify') mountEmbed(m);
    else mountYouTube(m);
  }, []);

  const toggle = useCallback(() => {
    if (mode === 'spotify-sdk') {
      if (sdk.current && (playing || now)) sdk.current.player.togglePlay();
      else if (current) start(current);
    } else if (embed.current) embed.current.togglePlay();
    else if (yt.current) {
      if (yt.current.getPlayerState() === 1) yt.current.pauseVideo();
      else yt.current.playVideo();
    }
  }, [mode, playing, now, current, start]);

  const next = useCallback(() => {
    if (mode === 'spotify-sdk') sdk.current?.player.nextTrack();
    else yt.current?.nextVideo();
  }, [mode]);

  const prev = useCallback(() => {
    if (mode === 'spotify-sdk') sdk.current?.player.previousTrack();
    else yt.current?.previousVideo();
  }, [mode]);

  const stop = useCallback(() => {
    teardownWidgets();
    if (sdk.current && playing) sdk.current.player.togglePlay();
    setCurrent(null);
    setMode(null);
    setNow(null);
    setNotice(null);
    setPlaying(false);
    setUrl('');
    lsSet(LS_URL, null);
  }, [teardownWidgets, playing]);

  const reload = useCallback(() => {
    if (current) start(current);
  }, [current, start]);

  const setVolume = useCallback((v: number) => {
    const n = Math.max(0, Math.min(100, Math.round(v)));
    setVol(n);
    lsSet(LS_VOL, String(n));
    yt.current?.setVolume(n);
    sdk.current?.player.setVolume(n / 100);
  }, []);

  const value = useMemo<MusicState>(
    () => ({
      current,
      mode,
      url,
      playing,
      volume,
      now,
      notice,
      spotifyConnected,
      spotifyUser,
      load,
      toggle,
      next,
      prev,
      stop,
      reload,
      setVolume,
      volumeSupported: mode !== 'spotify-embed',
      mountRef: (el) => {
        host.current = el;
      },
    }),
    [current, mode, url, playing, volume, now, notice, spotifyConnected, spotifyUser, load, toggle, next, prev, stop, reload, setVolume],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic(): MusicState {
  const v = useContext(Ctx);
  if (!v) throw new Error('MusicProvider ausente');
  return v;
}
