import { useState } from 'react';
import { COMMUNITY_NAME } from '../lib/church';
import { useCommunity } from '../lib/community';
import { useProfile } from '../lib/store';
import { BrandMark } from './Brand';
import { Icon } from './Icon';

/** Entrada na comunidade da igreja (criar conta ou entrar), exibida nas áreas que precisam do servidor. */
export function CommunityGate({ title, text }: { title: string; text: string }) {
  const c = useCommunity();
  const profile = useProfile();
  const [mode, setMode] = useState<'join' | 'login'>('join');
  const [name, setName] = useState(profile.name);
  const [login, setLogin] = useState('');
  const [pin, setPin] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'join') await c.join(name, login, pin);
      else await c.login(login, pin);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const valid = login.trim().length >= 3 && pin.length >= 4 && (mode === 'login' || (name.trim() && agree));

  return (
    <section className="gate">
      <div className="gate-intro">
        <BrandMark size={72} />
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <ul>
          <li>
            <Icon name="play" size={18} /> Mensagens, séries, vídeos e podcasts · {COMMUNITY_NAME}
          </li>
          <li>
            <Icon name="user" size={18} /> Acompanhe a leitura dos irmãos e incentive com um “Amém”
          </li>
          <li>
            <Icon name="lock" size={18} /> Uma conta por pessoa, protegida por PIN
          </li>
        </ul>
      </div>
      <form className="gate-form panel" onSubmit={submit}>
        <div className="seg" role="tablist">
          <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>
            Criar conta
          </button>
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            Já tenho conta
          </button>
        </div>
        {mode === 'join' && (
          <label className="field">
            <span>Seu nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Como os irmãos te conhecem" />
          </label>
        )}
        <label className="field">
          <span>Celular ou e-mail</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="(11) 98765-4321" autoComplete="username" inputMode="email" />
        </label>
        <label className="field">
          <span>PIN (4 a 8 dígitos)</span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete={mode === 'join' ? 'new-password' : 'current-password'}
            placeholder="••••"
          />
        </label>
        {mode === 'join' && (
          <label className="check small">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Concordo que os líderes da igreja acompanhem meu progresso de leitura. Minhas atividades aparecem para os irmãos (posso desligar depois).</span>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={!valid || busy}>
          {busy ? 'Aguarde…' : mode === 'join' ? 'Entrar na comunidade' : 'Entrar'}
        </button>
        {mode === 'login' && <p className="muted tiny">Esqueceu o PIN? Peça ao pastor para redefinir.</p>}
      </form>
    </section>
  );
}
