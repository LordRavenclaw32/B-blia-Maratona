import { useState, type ImgHTMLAttributes } from 'react';
import type { Book } from '../data/books';
import { fallbackChain, imageUrl } from '../lib/paintings';

type Kind = 'poster' | 'backdrop' | 'thumb';

/** Imagem de livro/episódio; se falhar, tenta as reservas (original, pôster da série, imagem bíblica genérica). */
export function Art({ book, kind, ep, ...rest }: { book: Book; kind: Kind; ep?: number } & ImgHTMLAttributes<HTMLImageElement>) {
  const [step, setStep] = useState(0);
  const chain = [imageUrl(book, kind, ep), ...fallbackChain(book, kind, ep)];
  const src = chain[Math.min(step, chain.length - 1)];
  return (
    <img
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      {...rest}
      src={src}
      onError={() => setStep((s) => (s < chain.length - 1 ? s + 1 : s))}
    />
  );
}
