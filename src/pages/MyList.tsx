import { getBook } from '../data/books';
import { Card } from '../components/Card';
import { useProfile } from '../lib/store';

export function MyList() {
  const profile = useProfile();
  const books = profile.myList.map((id) => getBook(id)!).filter(Boolean);
  return (
    <main className="page">
      <h1 className="page-title">Minha lista</h1>
      {books.length ? (
        <div className="grid">
          {books.map((b) => (
            <Card key={b.id} book={b} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>Você ainda não adicionou nenhuma série à sua lista.</p>
          <p className="muted">Use o botão + em qualquer livro para guardá-lo aqui e maratonar depois.</p>
          <a className="btn btn-white" href="#/browse">
            Explorar livros
          </a>
        </div>
      )}
    </main>
  );
}
