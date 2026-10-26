import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Navbar';
import { VERSIONS, type VersionId } from '../lib/api';
import { AVATARS, avatarUrl } from '../lib/art';
import { navigate, useRoute } from '../lib/router';
import { hashPin, useStore, type Profile } from '../lib/store';

function PinPad({ profile, onOk, onCancel }: { profile: Profile; onOk: () => void; onCancel: () => void }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => refs.current[0]?.focus(), []);

  const check = async (pin: string) => {
    if ((await hashPin(pin, profile.id)) === profile.pinHash) onOk();
    else {
      setError(true);
      setDigits(['', '', '', '']);
      setTimeout(() => refs.current[0]?.focus(), 0);
    }
  };

  const set = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError(false);
    if (d && i < 3) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) check(next.join(''));
  };

  return (
    <div className="pin-screen">
      <button className="icon-btn pin-close" onClick={onCancel} aria-label="Cancelar">
        <Icon name="close" size={32} />
      </button>
      <p className="muted">O bloqueio de perfil está ativado.</p>
      <h1>Insira seu PIN para acessar este perfil.</h1>
      <img className="pin-avatar" src={avatarUrl(profile.avatar)} alt="" />
      <div className={`pin-inputs ${error ? 'shake' : ''}`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={1}
            value={d}
            aria-label={`Dígito ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => e.key === 'Backspace' && !digits[i] && i > 0 && refs.current[i - 1]?.focus()}
          />
        ))}
      </div>
      {error && <p className="error">PIN incorreto. Tente novamente.</p>}
    </div>
  );
}

function ProfileForm({ existing, onDone, first }: { existing?: Profile; onDone: (p?: Profile) => void; first?: boolean }) {
  const { actions } = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [avatar, setAvatar] = useState(existing?.avatar ?? Math.floor(Math.random() * AVATARS.length));
  const [version, setVersion] = useState<VersionId>(existing?.settings.version ?? 'nvi');
  const [usePin, setUsePin] = useState(!!existing?.pinHash);
  const [pin, setPin] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = name.trim().length > 0 && (!usePin || pin.length === 4 || (existing?.pinHash && pin === ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (existing) {
      await actions.updateProfile(existing.id, { name, avatar, version, pin: usePin ? (pin ? pin : undefined) : null });
      onDone();
    } else {
      const p = await actions.createProfile({ name, avatar, pin: usePin ? pin : undefined, version });
      onDone(p);
    }
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <h1>{existing ? 'Editar perfil' : first ? 'Crie seu perfil de leitor' : 'Adicionar perfil'}</h1>
      <p className="muted">
        {first
          ? 'Sua conta fica salva somente neste dispositivo. Organize seu progresso, sua lista e suas devocionais.'
          : 'Adicione um perfil para outra pessoa que vai maratonar a Bíblia.'}
      </p>
      <div className="pf-main">
        <img className="pf-avatar" src={avatarUrl(avatar)} alt="Avatar escolhido" />
        <div className="pf-fields">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" maxLength={24} autoFocus aria-label="Nome" />
          <label className="pf-label">Versão preferida</label>
          <div className="seg">
            {VERSIONS.map((v) => (
              <button type="button" key={v.id} className={version === v.id ? 'on' : ''} onClick={() => setVersion(v.id)} title={v.name}>
                {v.label}
              </button>
            ))}
          </div>
          <label className="pf-label">Escolha um ícone</label>
          <div className="avatar-grid">
            {AVATARS.map((_, i) => (
              <button type="button" key={i} className={i === avatar ? 'on' : ''} onClick={() => setAvatar(i)} aria-label={`Avatar ${i + 1}`}>
                <img src={avatarUrl(i)} alt="" />
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} />
            <span>Proteger perfil com PIN de 4 dígitos</span>
          </label>
          {usePin && (
            <input
              className="pin-field"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              type="password"
              placeholder={existing?.pinHash ? 'Novo PIN (deixe vazio para manter)' : 'PIN de 4 dígitos'}
              aria-label="PIN"
            />
          )}
        </div>
      </div>
      <div className="pf-actions">
        <button className="btn btn-white" type="submit" disabled={!valid}>
          {existing ? 'Salvar' : 'Continuar'}
        </button>
        {!first && (
          <button className="btn btn-outline" type="button" onClick={() => onDone()}>
            Cancelar
          </button>
        )}
        {existing &&
          (confirmDelete ? (
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => {
                actions.deleteProfile(existing.id);
                onDone();
              }}
            >
              Confirmar exclusão
            </button>
          ) : (
            <button className="btn btn-outline" type="button" onClick={() => setConfirmDelete(true)}>
              Excluir perfil
            </button>
          ))}
      </div>
    </form>
  );
}

export function Profiles() {
  const { profiles, actions, profile: active } = useStore();
  const route = useRoute();
  const [manage, setManage] = useState(route.query.get('manage') === '1');
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [pinFor, setPinFor] = useState<Profile | null>(null);

  const enter = (p: Profile) => {
    if (manage) return setEditing(p);
    if (p.pinHash && active?.id !== p.id) return setPinFor(p);
    actions.login(p.id);
    navigate('/browse');
  };

  useEffect(() => {
    const sw = route.query.get('switch');
    if (sw) {
      const p = profiles.find((x) => x.id === sw);
      if (p) enter(p);
    }
  }, [route.query.get('switch')]);

  if (pinFor)
    return (
      <PinPad
        profile={pinFor}
        onCancel={() => setPinFor(null)}
        onOk={() => {
          actions.login(pinFor.id);
          setPinFor(null);
          navigate('/browse');
        }}
      />
    );

  if (!profiles.length || editing)
    return (
      <div className="profiles-page">
        <header className="profiles-top">
          <Logo />
        </header>
        {!profiles.length && (
          <section className="welcome">
            <h2>Troque a maratona de séries pela maratona da Palavra.</h2>
            <ul>
              <li>66 livros viram séries, com episódios, resumos e obras de arte bíblica clássica</li>
              <li>Acompanhe seu progresso, sequência de dias e conquistas</li>
              <li>Escreva devocionais e compartilhe sua jornada</li>
            </ul>
          </section>
        )}
        <ProfileForm
          first={!profiles.length}
          existing={editing && editing !== 'new' ? editing : undefined}
          onDone={(p) => {
            setEditing(null);
            if (p) {
              actions.login(p.id);
              navigate('/browse');
            }
          }}
        />
      </div>
    );

  return (
    <div className="profiles-page center">
      <header className="profiles-top">
        <Logo />
      </header>
      <h1 className="who">{manage ? 'Gerenciar perfis:' : 'Quem está lendo?'}</h1>
      <div className="profile-list">
        {profiles.map((p) => (
          <button key={p.id} className="profile-tile" onClick={() => enter(p)}>
            <span className="pt-avatar">
              <img src={avatarUrl(p.avatar)} alt="" />
              {manage && (
                <span className="pt-edit">
                  <Icon name="pen" size={34} />
                </span>
              )}
            </span>
            <span className="pt-name">
              {p.name} {p.pinHash && <Icon name="lock" size={14} />}
            </span>
          </button>
        ))}
        {profiles.length < 6 && (
          <button className="profile-tile add" onClick={() => setEditing('new')}>
            <span className="pt-avatar">
              <Icon name="plus" size={64} />
            </span>
            <span className="pt-name">Adicionar perfil</span>
          </button>
        )}
      </div>
      <button className="btn btn-outline manage" onClick={() => setManage((m) => !m)}>
        {manage ? 'Concluído' : 'Gerenciar perfis'}
      </button>
    </div>
  );
}
