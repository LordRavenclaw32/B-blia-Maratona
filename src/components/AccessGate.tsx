import { useState } from 'react';
import { WELCOME_BACKGROUND } from '../data/customArt';
import { APP_NAME, APP_TAGLINE } from '../lib/brand';
import { CHURCH, tryAccess, whatsappLink } from '../lib/church';
import { assetUrl } from '../lib/paintings';
import { BrandMark } from './Brand';
import { Icon } from './Icon';

/** Tela de código de acesso do app exclusivo para membros da igreja. */
export function AccessGate({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const church = CHURCH!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await tryAccess(code);
    setBusy(false);
    if (ok) onOk();
    else setError(true);
  };

  return (
    <div className="profiles-page center with-bg access-gate" style={{ ['--bg-img' as string]: `url(${assetUrl(WELCOME_BACKGROUND)})` }}>
      <form className="access-box" onSubmit={submit}>
        <BrandMark size={110} className="access-logo" />
        <h1>{APP_NAME}</h1>
        <p className="muted">{APP_TAGLINE}</p>
        <p>
          App exclusivo para membros da <b>{church.nome}</b>. Digite o código de acesso divulgado pela igreja.
        </p>
        <div className={`access-field ${error ? 'shake' : ''}`}>
          <Icon name="key" />
          <input
            value={code}
            onChange={(e) => (setCode(e.target.value), setError(false))}
            placeholder="Código de acesso"
            aria-label="Código de acesso"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
          />
        </div>
        {error && <p className="error">Código incorreto. Confira com a secretaria ou a liderança.</p>}
        {church.acesso?.dica && <p className="muted small">Dica: {church.acesso.dica}</p>}
        <button className="btn btn-primary" disabled={!code.trim() || busy}>
          Entrar
        </button>
        {church.contato?.whatsapp && (
          <a className="link small" href={whatsappLink(church.contato.whatsapp, `Olá! Gostaria do código de acesso do app ${APP_NAME}.`)} target="_blank" rel="noreferrer">
            Não tem o código? Fale com a igreja
          </a>
        )}
      </form>
    </div>
  );
}
