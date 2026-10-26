import type { Book } from '../data/books';
import { painting } from '../lib/paintings';
import { Art } from './Art';
import { useCovers } from '../lib/covers';

/** Fundo de destaque: obras verticais aparecem nítidas à direita sobre uma versão desfocada. */
export function Backdrop({ book, ep, className = '' }: { book: Book; ep?: number; className?: string }) {
  const cover = useCovers().coverOf(book, ep);
  const p = cover ?? painting(book, ep, 'backdrop');
  const portrait = !!p && p.h > p.w * 0.85;
  if (!portrait) {
    return (
      <div className={`bd ${className}`}>
        <Art book={book} ep={ep} kind="backdrop" className="bd-full" />
      </div>
    );
  }
  return (
    <div className={`bd portrait ${className}`}>
      <Art book={book} ep={ep} kind="backdrop" className="bd-blur" aria-hidden="true" />
      <Art book={book} ep={ep} kind="backdrop" className="bd-sharp" />
    </div>
  );
}
