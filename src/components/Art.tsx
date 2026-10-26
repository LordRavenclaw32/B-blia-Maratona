import { useState, type ImgHTMLAttributes } from 'react';
import type { Book } from '../data/books';
import { fallbackUrl, imageUrl } from '../lib/paintings';

type Kind = 'poster' | 'backdrop' | 'thumb';

/** Imagem de livro/episódio com troca automática para a arte reserva se a obra não carregar. */
export function Art({ book, kind, ep, ...rest }: { book: Book; kind: Kind; ep?: number } & ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      {...rest}
      src={failed ? fallbackUrl(book, kind, ep) : imageUrl(book, kind, ep)}
      onError={() => setFailed(true)}
    />
  );
}
