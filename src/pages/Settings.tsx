import { useEffect, useRef, useState } from 'react';
import { ABD_BASE, configureApi, testAbd, type SourcePref } from '../lib/api';
import { AVATARS, avatarUrl } from '../lib/art';
import { idbClear, idbCount } from '../lib/idb';
import { navigate } from '../lib/router';
import { useProfile, useStore, type ReaderTheme } from '../lib/store';
import { Icon } from '../components/Icon';
import { useUI } from '../components/ui';
import { useVersions } from '../lib/useVersions';
import { restoreCoverImages, withCoverImages } from '../lib/covers';

export function Settings() {
  const versions = useVersions();
  const profile = useProfile();
  const { actions } = useStore();
  const { toast } = useUI();
  const s = profile.settings;
  const [name, setName] = useState(profile.name);
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(s.token);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [cached, setCached] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    idbCount().then(setCached);
  }, []);

  const exportData = async () => {
    const blob = new Blob([await withCoverImages(actions.exportData())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bibliaflix-${profile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup exportado');
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      await restoreCoverImages(text);
      const n = actions.importData(text);
      toast(`${n} perfil(is) importado(s)`);
    } catch (e) {
      toast(`Arquivo inválido: ${(e as Error).message}`);
    }
  };

  const runTest = async () => {
    setTesting(true);
    configureApi({ token });
    setTest(await testAbd());
    setTesting(false);
  };

  return (
    <main className="page settings">
      <h1 className="page-title">Configurações</h1>

      <section className="panel">
        <h2>Perfil</h2>
        <div className="set-profile">
          <img src={avatarUrl(profile.avatar)} alt="" className="set-avatar" />
          <div className="set-fields">
            <label className="field">
              <span>Nome</span>
              <div className="inline">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
                <button className="btn btn-gray sm" disabled={!name.trim() || name === profile.name} onClick={() => actions.updateProfile(profile.id, { name }).then(() => toast('Nome atualizado'))}>
                  Salvar
                </button>
              </div>
            </label>
            <div className="avatar-grid sm">
              {AVATARS.map((_, i) => (
                <button key={i} className={i === profile.avatar ? 'on' : ''} onClick={() => actions.updateProfile(profile.id, { avatar: i })} aria-label={`Avatar ${i + 1}`}>
                  <img src={avatarUrl(i)} alt="" />
                </button>
              ))}
            </div>
            <label className="field">
              <span>{profile.pinHash ? 'Bloqueio por PIN ativo' : 'Bloqueio por PIN'}</span>
              <div className="inline">
                <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="PIN de 4 dígitos" inputMode="numeric" type="password" />
                <button
                  className="btn btn-gray sm"
                  disabled={pin.length !== 4}
                  onClick={() => actions.updateProfile(profile.id, { pin }).then(() => (setPin(''), toast('PIN definido')))}
                >
                  {profile.pinHash ? 'Trocar' : 'Ativar'}
                </button>
                {profile.pinHash && (
                  <button className="btn btn-outline sm" onClick={() => actions.updateProfile(profile.id, { pin: null }).then(() => toast('PIN removido'))}>
                    Remover
                  </button>
                )}
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Leitura</h2>
        <div className="set-row">
          <div>
            <b>Versão da Bíblia</b>
            <span className="muted">{versions.find((v) => v.id === s.version)?.name}</span>
          </div>
          <div className="seg">
            {versions.map((v) => (
              <button key={v.id} className={s.version === v.id ? 'on' : ''} onClick={() => actions.updateSettings({ version: v.id })} title={v.name}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div>
            <b>Tamanho do texto</b>
            <span className="muted" style={{ fontSize: s.fontSize, fontFamily: 'var(--serif)' }}>
              No princípio era o Verbo
            </span>
          </div>
          <input type="range" min={14} max={34} step={1} value={s.fontSize} onChange={(e) => actions.updateSettings({ fontSize: Number(e.target.value) })} aria-label="Tamanho do texto" />
        </div>
        <div className="set-row">
          <div>
            <b>Tema do leitor</b>
          </div>
          <div className="seg">
            {(['dark', 'sepia', 'light'] as ReaderTheme[]).map((t) => (
              <button key={t} className={s.readerTheme === t ? 'on' : ''} onClick={() => actions.updateSettings({ readerTheme: t })}>
                {t === 'dark' ? 'Escuro' : t === 'sepia' ? 'Sépia' : 'Claro'}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div>
            <b>Meta diária</b>
            <span className="muted">Capítulos por dia</span>
          </div>
          <div className="stepper">
            <button onClick={() => actions.updateSettings({ dailyGoal: Math.max(1, s.dailyGoal - 1) })} aria-label="Diminuir meta">
              −
            </button>
            <b>{s.dailyGoal}</b>
            <button onClick={() => actions.updateSettings({ dailyGoal: Math.min(50, s.dailyGoal + 1) })} aria-label="Aumentar meta">
              +
            </button>
          </div>
        </div>
        <label className="set-row">
          <div>
            <b>Reprodução automática</b>
            <span className="muted">Iniciar o próximo episódio após concluir o atual</span>
          </div>
          <input type="checkbox" className="switch" checked={s.autoplay} onChange={(e) => actions.updateSettings({ autoplay: e.target.checked })} />
        </label>
        <label className="set-row">
          <div>
            <b>Números dos versículos</b>
          </div>
          <input type="checkbox" className="switch" checked={s.showVerseNumbers} onChange={(e) => actions.updateSettings({ showVerseNumbers: e.target.checked })} />
        </label>
      </section>

      <section className="panel">
        <h2>Fonte dos textos</h2>
        <p className="muted small">
          Os capítulos vêm da API <a href="https://www.abibliadigital.com.br" target="_blank" rel="noreferrer">ABíbliaDigital</a> ({ABD_BASE}). Sem token, ela
          limita o número de requisições por hora; se estiver indisponível, o app usa automaticamente uma fonte alternativa em JSON e guarda cada capítulo lido
          para uso offline.
        </p>
        <div className="set-row">
          <div>
            <b>Origem</b>
          </div>
          <div className="seg">
            {(
              [
                ['auto', 'Automática'],
                ['abibliadigital', 'ABíbliaDigital'],
                ['github', 'Alternativa'],
              ] as [SourcePref, string][]
            ).map(([k, l]) => (
              <button key={k} className={s.source === k ? 'on' : ''} onClick={() => actions.updateSettings({ source: k })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Token da ABíbliaDigital (opcional)</span>
          <div className="inline">
            <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="Cole aqui seu token pessoal" type="password" autoComplete="off" />
            <button className="btn btn-gray sm" disabled={token === s.token} onClick={() => (actions.updateSettings({ token }), toast('Token salvo'))}>
              Salvar
            </button>
            <button className="btn btn-outline sm" onClick={runTest} disabled={testing}>
              {testing ? 'Testando…' : 'Testar conexão'}
            </button>
          </div>
        </label>
        {test && <p className={test.ok ? 'ok' : 'error'}>{test.message}</p>}
        <div className="set-row">
          <div>
            <b>Cache offline</b>
            <span className="muted">{cached === null ? '…' : `${cached} item(ns) salvos neste dispositivo`}</span>
          </div>
          <button
            className="btn btn-outline sm"
            onClick={async () => {
              await idbClear();
              setCached(0);
              toast('Cache limpo');
            }}
          >
            Limpar cache
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Backup</h2>
        <p className="muted small">Seus dados ficam apenas neste navegador. Exporte um backup para levar seu progresso a outro dispositivo.</p>
        <div className="inline">
          <button className="btn btn-gray" onClick={exportData}>
            <Icon name="download" /> Exportar dados
          </button>
          <button className="btn btn-gray" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
      </section>

      <section className="panel danger-zone">
        <h2>Zona de perigo</h2>
        {confirmDel ? (
          <div className="inline">
            <span>Excluir o perfil “{profile.name}” e todo o progresso?</span>
            <button
              className="btn btn-danger sm"
              onClick={() => {
                actions.deleteProfile(profile.id);
                navigate('/profiles');
              }}
            >
              Excluir definitivamente
            </button>
            <button className="btn btn-outline sm" onClick={() => setConfirmDel(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={() => setConfirmDel(true)}>
            <Icon name="trash" /> Excluir perfil
          </button>
        )}
      </section>
    </main>
  );
}
