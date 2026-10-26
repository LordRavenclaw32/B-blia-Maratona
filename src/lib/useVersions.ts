import { useEffect, useState } from 'react';
import { allVersions, VERSIONS_EVENT, type VersionInfo } from './api';

/** Versões disponíveis (NVI, ARA, ARC + importadas), atualizadas ao importar/remover. */
export function useVersions(): VersionInfo[] {
  const [list, setList] = useState(allVersions);
  useEffect(() => {
    const on = () => setList(allVersions());
    window.addEventListener(VERSIONS_EVENT, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(VERSIONS_EVENT, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  return list;
}
