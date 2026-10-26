/**
 * Login do Spotify (OAuth 2.0 com PKCE — sem segredo no navegador) para tocar músicas completas
 * pelo Web Playback SDK. Requer um Client ID de app do Spotify (developer.spotify.com/dashboard).
 */

const LS_AUTH = 'mb:sp:auth';
const LS_CLIENT = 'mb:sp:client';
const SS_VERIFIER = 'mb:sp:verifier';
const SS_STATE = 'mb:sp:state';
const SS_RETURN = 'mb:sp:return';

const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state'];

export interface SpotifyAuth {
  access: string;
  refresh: string;
  /** epoch ms */
  expires: number;
}

export const AUTH_EVENT = 'mb:sp:auth';

function ls(k: string, v?: string | null): string | null {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* armazenamento indisponível */
  }
  return null;
}

export function redirectUri(): string {
  return `${location.origin}${location.pathname}`;
}

export function spotifyClientId(): string {
  return ls(LS_CLIENT) || (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) || '';
}

export function setSpotifyClientId(id: string) {
  ls(LS_CLIENT, id.trim() || null);
}

export function getSpotifyAuth(): SpotifyAuth | null {
  try {
    const raw = ls(LS_AUTH);
    return raw ? (JSON.parse(raw) as SpotifyAuth) : null;
  } catch {
    return null;
  }
}

function saveAuth(a: SpotifyAuth | null) {
  ls(LS_AUTH, a ? JSON.stringify(a) : null);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function logoutSpotify() {
  saveAuth(null);
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(len = 64): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes).slice(0, len);
}

/** Redireciona para o login do Spotify. */
export async function loginSpotify(): Promise<void> {
  const clientId = spotifyClientId();
  if (!clientId) throw new Error('Configure o Client ID do Spotify');
  if (!crypto.subtle) throw new Error('Login exige HTTPS');
  const verifier = randomString(64);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = randomString(16);
  sessionStorage.setItem(SS_VERIFIER, verifier);
  sessionStorage.setItem(SS_STATE, state);
  sessionStorage.setItem(SS_RETURN, location.hash || '#/browse');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES.join(' '),
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function tokenRequest(body: Record<string, string>): Promise<SpotifyAuth> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || `HTTP ${res.status}`);
  const prev = getSpotifyAuth();
  return { access: data.access_token, refresh: data.refresh_token || prev?.refresh || '', expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
}

/** Trata o retorno do login (?code=…) antes de o app renderizar. Devolve uma mensagem de erro, se houver. */
export async function handleSpotifyCallback(): Promise<string | null> {
  const qs = new URLSearchParams(location.search);
  const code = qs.get('code');
  const error = qs.get('error');
  if (!code && !error) return null;
  const back = sessionStorage.getItem(SS_RETURN) || '#/browse';
  const clean = () => history.replaceState(null, '', `${location.pathname}${back}`);
  if (error) {
    clean();
    return error === 'access_denied' ? 'Login no Spotify cancelado' : `Spotify: ${error}`;
  }
  try {
    if (qs.get('state') !== sessionStorage.getItem(SS_STATE)) throw new Error('Estado de login inválido');
    const auth = await tokenRequest({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri(),
      client_id: spotifyClientId(),
      code_verifier: sessionStorage.getItem(SS_VERIFIER) || '',
    });
    saveAuth(auth);
    return null;
  } catch (e) {
    return `Falha no login do Spotify: ${(e as Error).message}`;
  } finally {
    sessionStorage.removeItem(SS_VERIFIER);
    sessionStorage.removeItem(SS_STATE);
    clean();
  }
}

/** Token válido (renova automaticamente). */
export async function spotifyToken(): Promise<string | null> {
  const a = getSpotifyAuth();
  if (!a) return null;
  if (Date.now() < a.expires - 60_000) return a.access;
  if (!a.refresh) return null;
  try {
    const next = await tokenRequest({ grant_type: 'refresh_token', refresh_token: a.refresh, client_id: spotifyClientId() });
    saveAuth(next);
    return next.access;
  } catch {
    saveAuth(null);
    return null;
  }
}

export async function spotifyApi<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  const token = await spotifyToken();
  if (!token) throw new Error('Sessão do Spotify expirada');
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const data = (await res.json().catch(() => null)) as (T & { error?: { message?: string; reason?: string } }) | null;
  if (!res.ok) {
    const reason = data?.error?.reason === 'PREMIUM_REQUIRED' ? 'PREMIUM_REQUIRED' : data?.error?.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(reason), { status: res.status });
  }
  return data;
}
