import { APP_NAME, BF_BOOK_LINES, BF_BOOK_PAGES, BF_LETTERS, CHURCH_LOGO } from '../lib/brand';
import { CHURCH } from '../lib/church';

export function BFMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`bf-mark ${className}`} aria-hidden="true">
      <path className="bf-letters" fillRule="evenodd" d={BF_LETTERS} />
      <path className="bf-book" d={BF_BOOK_PAGES} />
      <path className="bf-lines" d={BF_BOOK_LINES} />
      <path className="bf-lines" d="M50 70v27.5" />
    </svg>
  );
}

/** Marca do app: logo da igreja (quando houver) ou o monograma BF. */
export function BrandMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  if (CHURCH_LOGO) return <img src={CHURCH_LOGO} width={size} height={size} className={`church-mark ${className}`} alt="" aria-hidden="true" />;
  return <BFMark size={size} className={className} />;
}

/** Nome do app no estilo do logo: "BÍBLIA" + "FLIX" em destaque, ou o nome do app da igreja. */
export function BrandWord({ className = '' }: { className?: string }) {
  if (!CHURCH)
    return (
      <span className={className}>
        BÍBLIA<b>FLIX</b>
      </span>
    );
  const words = APP_NAME.toUpperCase().split(/\s+/);
  const last = words.length > 1 ? words.pop() : undefined;
  return (
    <span className={`${className} church-word`}>
      {words.join(' ')}
      {last && (
        <>
          {' '}
          <b>{last}</b>
        </>
      )}
    </span>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a href="#/browse" className={`logo ${small ? 'sm' : ''} ${CHURCH ? 'is-church' : ''}`} aria-label={`${APP_NAME} — início`}>
      <BrandMark size={small ? 34 : 44} />
      <BrandWord className="logo-word" />
    </a>
  );
}
