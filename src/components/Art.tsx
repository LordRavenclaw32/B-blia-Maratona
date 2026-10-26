import { useState, type ImgHTMLAttributes } from 'react';
import type { Book } from '../data/books';
import { useCovers } from '../lib/covers';
import { fallbackChain, imageUrl } from '../lib/paintings';

type Kind = 'poster' | 'backdrop' | 'thumb';

/**
 * Imagem de livro/episódio. Usa a capa personalizada do usuário quando houver; se a imagem falhar,
 * tenta as reservas (original, pôster da série, imagem bíblica genérica).
 */
export function Art({ book, kind, ep, style, ...rest }: { book: Book; kind: Kind; ep?: number } & ImgHTMLAttributes<HTMLImageElement>) {
  const [step, setStep] = useState(0);
  const cover = useCovers().coverOf(book, ep);
  const chain = [...(cover ? [cover.url] : []), imageUrl(book, kind, ep), ...fallbackChain(book, kind, ep)];
  const src = chain[Math.min(step, chain.length - 1)];
  const usingCover = !!cover && step === 0;
  return (
    <img
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      {...rest}
      style={usingCover && cover.filter !== 'none' ? { ...style, filter: cover.filter } : style}
      src={src}
      onError={() => setStep((s) => (s < chain.length - 1 ? s + 1 : s))}
    />
  );
}
