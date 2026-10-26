import { useEffect, useState } from 'react';
import { episodeOfChapter, getBook } from './data/books';
import { Navbar, TabBar } from './components/Navbar';
import { BrandMark, BrandWord } from './components/Brand';
import { AccessGate } from './components/AccessGate';
import { CHURCH, IS_DEMO, SHOW_DEMO_BAR, needsAccess, nsKey } from './lib/church';
import { Church } from './pages/Church';
import { ChurchSetup } from './pages/ChurchSetup';
import { Pitch } from './pages/Pitch';
import { Icon } from './components/Icon';
import { TopPanelProvider, TopPanels } from './components/TopTools';
import { MusicProvider } from './lib/music';
import { CoversProvider } from './lib/covers';
import { APP_NAME, APP_TAGLINE } from './lib/brand';
import { TitleModal } from './components/TitleModal';
import { UIProvider } from './components/ui';
import { navigate, useRoute } from './lib/router';
import { StoreProvider, useStore } from './lib/store';
import { Browse } from './pages/Browse';
import { Diary } from './pages/Diary';
import { MyList } from './pages/MyList';
import { Profiles } from './pages/Profiles';
import { Reader } from './pages/Reader';
import { Search } from './pages/Search';
import { Settings } from './pages/Settings';
import { Stats } from './pages/Stats';

function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3300);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="intro" onClick={onDone} role="img" aria-label={`${APP_NAME} — ${APP_TAGLINE}`}>
      <div className="intro-stage">
        <BrandMark className="intro-mark" size={220} />
        <BrandWord className="intro-word" />
        <div className="intro-tag">{APP_TAGLINE}</div>
        {CHURCH && CHURCH.creditoBibliaFlix !== false && <div className="intro-credit">tecnologia BíbliaFlix</div>}
      </div>
    </div>
  );
}

/** Rotas abertas sem perfil: apresentação comercial e configurador (só no BíbliaFlix padrão ou na demonstração). */
const PUBLIC = new Set(!CHURCH || IS_DEMO ? ['apresentacao', 'configurar-igreja'] : []);

function DemoBar() {
  if (!SHOW_DEMO_BAR) return null;
  const base = location.pathname;
  return (
    <div className="demo-bar" role="status">
      <Icon name="church" size={16} />
      <span>
        Demonstração · <b>{CHURCH?.nome}</b>
      </span>
      {IS_DEMO && <a href={`${base}?igreja=bibliaflix#/configurar-igreja`}>Editar</a>}
      <a href={`${base}?igreja=bibliaflix#/apresentacao`} onClick={() => sessionStorage.removeItem('mb:demo-bar')}>
        Sair
      </a>
    </div>
  );
}

function Routes() {
  const { profile } = useStore();
  const route = useRoute();
  const [head, ...rest] = route.path;
  const open = PUBLIC.has(head);

  useEffect(() => {
    if (open) return;
    if (!profile && head !== 'profiles') navigate('/profiles', true);
    else if (profile && !head) navigate('/browse', true);
  }, [profile, head, open]);

  useEffect(() => {
    if (head !== 'read') window.scrollTo(0, 0);
  }, [head, rest[0]]);

  if (head === 'apresentacao' && open) return <Pitch />;
  if (head === 'configurar-igreja' && open) return <ChurchSetup />;
  if (!profile || head === 'profiles') return <Profiles />;

  if (head === 'read') {
    const book = getBook(rest[0]);
    if (book) {
      const chapter = Math.min(Math.max(1, Number(rest[1]) || 1), book.chapters);
      const ep = episodeOfChapter(book, chapter);
      return <Reader key={`${book.id}:${ep.n}`} book={book} chapter={chapter} />;
    }
  }

  const titleId = route.query.get('title');
  const titleBook = getBook(titleId ?? undefined);

  let page;
  switch (head) {
    case 'series':
      page = <Browse key={rest[0]} testament={rest[0] === 'nt' ? 'NT' : 'AT'} />;
      break;
    case 'list':
      page = <MyList />;
      break;
    case 'diary':
      page = <Diary />;
      break;
    case 'stats':
      page = <Stats />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    case 'search':
      page = <Search />;
      break;
    case 'igreja':
      page = CHURCH ? <Church /> : <Browse />;
      break;
    default:
      page = <Browse />;
  }

  return (
    <>
      <Navbar />
      {page}
      <footer className="site-footer">
        <p>
          {CHURCH ? (
            <>
              {APP_NAME} · App oficial da {CHURCH.nome}
              {CHURCH.creditoBibliaFlix !== false && ' · tecnologia BíbliaFlix'}
            </>
          ) : (
            <>
              BíbliaFlix · Seu app de maratona bíblica · <a href="#/apresentacao">Para igrejas</a>
            </>
          )}{' '}
          · Textos bíblicos via <a href="https://www.abibliadigital.com.br" target="_blank" rel="noreferrer">ABíbliaDigital</a>. Seus dados ficam salvos apenas neste dispositivo.
        </p>
      </footer>
      <TabBar />
      {titleBook && <TitleModal book={titleBook} />}
    </>
  );
}

export default function App() {
  const [locked, setLocked] = useState(needsAccess);
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem(nsKey('mb:intro'));
    } catch {
      return false;
    }
  });
  const done = () => {
    try {
      sessionStorage.setItem(nsKey('mb:intro'), '1');
    } catch {
      /* ignore */
    }
    setIntro(false);
  };
  return (
    <StoreProvider>
      <CoversProvider>
      <UIProvider>
        <MusicProvider>
          <TopPanelProvider>
            {intro ? <Intro onDone={done} /> : locked ? <AccessGate onOk={() => setLocked(false)} /> : <Routes />}
            <TopPanels />
            {!intro && <DemoBar />}
          </TopPanelProvider>
        </MusicProvider>
      </UIProvider>
      </CoversProvider>
    </StoreProvider>
  );
}
