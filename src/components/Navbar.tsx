import { useEffect, useRef, useState } from 'react';
import { avatarUrl } from '../lib/art';
import { navigate, useRoute } from '../lib/router';
import { useStore, useProfile } from '../lib/store';
import { Icon } from './Icon';
import { Logo } from './Brand';
import { TopButtons } from './TopTools';

export { Logo };

const LINKS = [
  { to: '/browse', label: 'Início', key: 'browse' },
  { to: '/series/at', label: 'Antigo Testamento', key: 'series/at' },
  { to: '/series/nt', label: 'Novo Testamento', key: 'series/nt' },
  { to: '/list', label: 'Minha lista', key: 'list' },
  { to: '/diary', label: 'Diário', key: 'diary' },
  { to: '/stats', label: 'Minha maratona', key: 'stats' },
];

export function Navbar() {
  const profile = useProfile();
  const { profiles, actions } = useStore();
  const route = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(route.path[0] === 'search');
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [menu, setMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = route.path.join('/') || 'browse';

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (route.path[0] !== 'search') {
      setQ('');
      if (document.activeElement !== inputRef.current) setSearchOpen(false);
    }
  }, [route.path]);

  const onSearch = (v: string) => {
    setQ(v);
    navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/browse', route.path[0] === 'search');
  };

  return (
    <header className={`navbar ${scrolled ? 'solid' : ''}`}>
      <Logo />
      <nav className="nav-links" aria-label="Principal">
        {LINKS.map((l) => (
          <a key={l.key} href={`#${l.to}`} className={current === l.key ? 'active' : ''}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="nav-right">
        <div className={`search ${searchOpen ? 'open' : ''}`}>
          <button
            className="icon-btn"
            aria-label="Buscar"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <Icon name="search" />
          </button>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            onBlur={() => !q && setSearchOpen(false)}
            placeholder="Livros, episódios, Jo 3:16..."
            aria-label="Buscar"
          />
          {q && (
            <button className="icon-btn clear" aria-label="Limpar busca" onClick={() => onSearch('')}>
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <TopButtons />
        <div className="profile-menu" onMouseLeave={() => setMenu(false)}>
          <button className="avatar-btn" onClick={() => setMenu((m) => !m)} onMouseEnter={() => setMenu(true)} aria-label="Menu do perfil" aria-expanded={menu}>
            <img src={avatarUrl(profile.avatar)} alt="" />
            <Icon name="chevronDown" size={18} className={menu ? 'flip' : ''} />
          </button>
          {menu && (
            <div className="dropdown">
              {profiles
                .filter((p) => p.id !== profile.id)
                .map((p) => (
                  <button
                    key={p.id}
                    className="dd-item"
                    onClick={() => {
                      setMenu(false);
                      navigate(`/profiles?switch=${p.id}`);
                    }}
                  >
                    <img src={avatarUrl(p.avatar)} alt="" /> {p.name}
                    {p.pinHash && <Icon name="lock" size={14} />}
                  </button>
                ))}
              <a className="dd-item" href="#/profiles?manage=1" onClick={() => setMenu(false)}>
                <Icon name="pen" size={18} /> Gerenciar perfis
              </a>
              <a className="dd-item" href="#/settings" onClick={() => setMenu(false)}>
                <Icon name="settings" size={18} /> Configurações
              </a>
              <a className="dd-item" href="#/stats" onClick={() => setMenu(false)}>
                <Icon name="chart" size={18} /> Minha maratona
              </a>
              <hr />
              <button
                className="dd-item center"
                onClick={() => {
                  setMenu(false);
                  actions.logout();
                  navigate('/profiles');
                }}
              >
                Sair do BíbliaFlix
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const route = useRoute();
  const cur = route.path[0] ?? 'browse';
  const items = [
    { to: '/browse', icon: 'home', label: 'Início', on: cur === 'browse' || cur === 'series' },
    { to: '/search', icon: 'search', label: 'Buscar', on: cur === 'search' },
    { to: '/list', icon: 'list', label: 'Minha lista', on: cur === 'list' },
    { to: '/diary', icon: 'pen', label: 'Diário', on: cur === 'diary' },
    { to: '/stats', icon: 'chart', label: 'Progresso', on: cur === 'stats' || cur === 'settings' },
  ];
  return (
    <nav className="tabbar" aria-label="Navegação inferior">
      {items.map((i) => (
        <a key={i.to} href={`#${i.to}`} className={i.on ? 'on' : ''}>
          <Icon name={i.icon} />
          <span>{i.label}</span>
        </a>
      ))}
    </nav>
  );
}
