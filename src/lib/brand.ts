// Identidade visual BíbliaFlix: monograma "BF" com a Bíblia aberta logo abaixo das letras.
export const APP_NAME = 'BíbliaFlix';
export const APP_TAGLINE = 'Seu app de maratona bíblica';
export const BRAND_RED = '#e50914';

export const BF_LETTERS =
  'M12 4h24c9 0 14 5 14 13 0 6-3 9-7 11 5 2 8 6 8 13 0 10-6 17-16 17H12Z' +
  'M23 14v11h10c3 0 5-2 5-5.5S36 14 33 14Z' +
  'M23 35v14h11c3.5 0 5.5-2.5 5.5-7s-2-7-5.5-7Z' +
  'M56 4h32v11H68v11h17v11H68v21H56Z';

export const BF_BOOK_PAGES = 'M50 70C40 63.5 25 62.5 8 65.5V93c16-3 31-2 42 4.5Z M50 70c10-6.5 25-7.5 42-4.5V93c-16-3-31-2-42 4.5Z';
export const BF_BOOK_LINES = 'M16 72c9-1.5 17-1 26 1.5M16 79c9-1.5 17-1 26 1.5M16 86c9-1.5 17-1 26 1.5M58 73.5c9-2.5 17-3 26-1.5M58 80.5c9-2.5 17-3 26-1.5M58 87.5c9-2.5 17-3 26-1.5';

/** SVG completo do monograma (viewBox 0 0 100 100). */
export function bfMarkSvg(color = BRAND_RED, lines = '#5c0308'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill-rule="evenodd" fill="${color}" d="${BF_LETTERS}"/><path fill="${color}" d="${BF_BOOK_PAGES}"/><path d="${BF_BOOK_LINES}" stroke="${lines}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M50 70v27.5" stroke="${lines}" stroke-width="2.4"/></svg>`;
}

export function bfMarkUrl(color?: string, lines?: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bfMarkSvg(color, lines))}`;
}
