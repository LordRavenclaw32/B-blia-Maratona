import { useEffect, useState } from 'react';
import { episodeOfChapter, getBook } from './data/books';
import { Navbar, TabBar } from './components/Navbar';
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
    const t = setTimeout(onDone, 2100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="intro" onClick={onDone} aria-hidden="true">
      <div className="intro-logo">
        <span>M</span>
      </div>
    </div>
  );
}

function Routes() {
  const { profile } = useStore();
  const route = useRoute();
  const [head, ...rest] = route.path;

  useEffect(() => {
    if (!profile && head !== 'profiles') navigate('/profiles', true);
    else if (profile && !head) navigate('/browse', true);
  }, [profile, head]);

  useEffect(() => {
    if (head !== 'read') window.scrollTo(0, 0);
  }, [head, rest[0]]);

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
    default:
      page = <Browse />;
  }

  return (
    <>
      <Navbar />
      {page}
      <footer className="site-footer">
        <p>
          Maratona Bíblica · Textos bíblicos via <a href="https://www.abibliadigital.com.br" target="_blank" rel="noreferrer">ABíbliaDigital</a>. Seus dados
          ficam salvos apenas neste dispositivo.
        </p>
      </footer>
      <TabBar />
      {titleBook && <TitleModal book={titleBook} />}
    </>
  );
}

export default function App() {
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('mb:intro');
    } catch {
      return false;
    }
  });
  const done = () => {
    try {
      sessionStorage.setItem('mb:intro', '1');
    } catch {
      /* ignore */
    }
    setIntro(false);
  };
  return (
    <StoreProvider>
      <UIProvider>
        {intro ? <Intro onDone={done} /> : <Routes />}
      </UIProvider>
    </StoreProvider>
  );
}
