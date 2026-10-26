import { APP_NAME, BF_BOOK_LINES, BF_BOOK_PAGES, BF_LETTERS } from '../lib/brand';

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

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <a href="#/browse" className={`logo ${small ? 'sm' : ''}`} aria-label={`${APP_NAME} — início`}>
      <BFMark size={small ? 34 : 44} />
      <span className="logo-word">
        BÍBLIA<b>FLIX</b>
      </span>
    </a>
  );
}
