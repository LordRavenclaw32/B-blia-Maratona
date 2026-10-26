import { useEffect, useState } from 'react';

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [p, q] = raw.split('?');
  return { path: p ? p.split('/').filter(Boolean).map(decodeURIComponent) : [], query: new URLSearchParams(q ?? '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string, replace = false) {
  const hash = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : '/' + to}`;
  if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Atualiza um parâmetro de query mantendo o caminho atual. */
export function setQuery(key: string, value: string | null, replace = false) {
  const r = parse();
  if (value === null) r.query.delete(key);
  else r.query.set(key, value);
  const qs = r.query.toString();
  navigate(`/${r.path.map(encodeURIComponent).join('/')}${qs ? '?' + qs : ''}`, replace);
}
