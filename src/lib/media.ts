/** Vídeos e podcasts da igreja: reconhece o link e gera o player incorporado e a miniatura. */
export type MediaType = 'youtube' | 'spotify' | 'soundcloud' | 'vimeo' | 'drive' | 'audio' | 'video' | 'link';

export interface Media {
  type: MediaType;
  kind: 'video' | 'podcast';
  embed?: string;
  thumb?: string;
  url: string;
}

export function parseMedia(raw: string): Media | null {
  const text = raw.trim();
  if (!text) return null;
  let u: URL;
  try {
    u = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const url = u.href;

  if (/(^|\.)youtube\.com$|^youtu\.be$|youtube-nocookie\.com$/.test(host)) {
    const id =
      (host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v')) ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1] ?? undefined;
    const list = u.searchParams.get('list');
    if (!id && !list) return null;
    const music = host.startsWith('music.');
    const embed = id
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${list ? `&list=${list}` : ''}`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
    return { type: 'youtube', kind: music ? 'podcast' : 'video', embed, thumb: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined, url };
  }
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/\/(episode|show|playlist|track|album)\/(\w+)/);
    if (!m) return null;
    return { type: 'spotify', kind: 'podcast', embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, url };
  }
  if (host === 'soundcloud.com') {
    return { type: 'soundcloud', kind: 'podcast', embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23e50914&visual=true`, url };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    return id ? { type: 'vimeo', kind: 'video', embed: `https://player.vimeo.com/video/${id}`, url } : null;
  }
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get('id');
    return id ? { type: 'drive', kind: 'video', embed: `https://drive.google.com/file/d/${id}/preview`, url } : null;
  }
  if (/\.(mp3|m4a|aac|ogg|wav|opus)(\?|$)/i.test(u.pathname)) return { type: 'audio', kind: 'podcast', url };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) return { type: 'video', kind: 'video', url };
  return { type: 'link', kind: 'video', url };
}

/** Busca o título e a miniatura públicos do link (YouTube, Spotify, SoundCloud, Vimeo). */
export async function fetchMediaInfo(url: string): Promise<{ title?: string; author?: string; thumb?: string }> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const d = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string; error?: string };
    if (d.error) return {};
    return { title: d.title, author: d.author_name, thumb: d.thumbnail_url };
  } catch {
    return {};
  }
}

export const MEDIA_LABEL: Record<MediaType, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  audio: 'Áudio',
  video: 'Vídeo',
  link: 'Link',
};
