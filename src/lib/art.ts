import type { Book, Scene } from '../data/books';

/**
 * Gerador procedural de arte (SVG) — cada livro tem paleta, cenário e emblema próprios;
 * cada episódio recebe uma composição única derivada de uma semente determinística.
 */

type Kind = 'poster' | 'backdrop' | 'thumb';

const SIZES: Record<Kind, [number, number]> = {
  poster: [400, 600],
  backdrop: [1600, 900],
  thumb: [640, 360],
};

// ───────────── utilidades ─────────────
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

const f = (n: number) => Math.round(n * 10) / 10;

// ───────────── emblemas (viewBox 100×100) ─────────────
// `L` = cor clara (preenchimento principal), `D` = cor escura (detalhes)
const MOTIFS: Record<string, (D: string) => string> = {
  tree: () =>
    `<path d="M46 96V64Q38 58 28 60Q38 53 46 56V50h8v8Q62 52 73 55Q62 58 54 65V96Z"/><circle cx="50" cy="36" r="21"/><circle cx="31" cy="44" r="14"/><circle cx="69" cy="44" r="14"/><circle cx="39" cy="23" r="12"/><circle cx="61" cy="23" r="12"/><circle cx="58" cy="40" r="3.4" fill="#e63946"/>`,
  tablets: (D) =>
    `<path d="M12 92V32a17 17 0 0 1 34 0v60Z"/><path d="M54 92V32a17 17 0 0 1 34 0v60Z"/><g stroke="${D}" stroke-width="3" stroke-linecap="round" opacity=".55"><path d="M20 40h18M20 50h18M20 60h18M20 70h18M20 80h12M62 40h18M62 50h18M62 60h18M62 70h18M62 80h12"/></g>`,
  altar: (D) =>
    `<path d="M50 4C58 18 70 26 66 42 64 52 57 56 50 56 43 56 35 51 35 42 35 34 42 30 43 20 47 26 47 30 49 33 52 24 51 14 50 4Z"/><rect x="18" y="58" width="64" height="12" rx="2"/><rect x="22" y="72" width="56" height="10" rx="2"/><rect x="14" y="84" width="72" height="12" rx="2"/><path d="M18 64h64M22 77h56M14 90h72" stroke="${D}" stroke-width="1.5" opacity=".4"/>`,
  flame: (D) =>
    `<path d="M50 4C61 25 80 35 76 62 74 82 60 96 50 96 40 96 24 86 24 62 24 46 37 38 39 22 46 32 46 39 48 44 53 31 51 17 50 4Z"/><path d="M50 50C55 60 63 66 61 78 60 86 55 90 50 90 45 90 39 86 39 78 39 70 45 66 46 58 48 63 49 66 50 50Z" fill="${D}" opacity=".35"/>`,
  tent: (D) =>
    `<path d="M6 90 50 14 94 90Z"/><path d="M50 14 30 90h40Z" fill="${D}" opacity=".18"/><path d="M42 90 50 60 58 90Z" fill="${D}" opacity=".7"/><path d="M50 14V4M50 4l12 4-12 4" stroke="currentColor" stroke-width="2.5" fill="none"/>`,
  scroll: (D) =>
    `<rect x="24" y="16" width="52" height="68" rx="2"/><rect x="16" y="10" width="68" height="10" rx="5"/><rect x="16" y="80" width="68" height="10" rx="5"/><g stroke="${D}" stroke-width="2.6" stroke-linecap="round" opacity=".5"><path d="M32 32h36M32 42h36M32 52h36M32 62h28M32 72h20"/></g>`,
  walls: (D) =>
    `<path d="M4 94V50h6v-6h6v6h6v-6h6v6h6V40h6v-6h6v6h6V22h4v-6h4v6h4v6h6v-6h6v6h6v12h6v6h6v-6h6v6h6v44Z"/><path d="M44 94V74a6 6 0 0 1 12 0v20Z" fill="${D}" opacity=".7"/><rect x="18" y="62" width="5" height="8" fill="${D}" opacity=".6"/><rect x="77" y="62" width="5" height="8" fill="${D}" opacity=".6"/>`,
  sword: (D) =>
    `<path d="M50 2 57 14V66H43V14Z"/><path d="M50 8V64" stroke="${D}" stroke-width="2" opacity=".4"/><rect x="24" y="64" width="52" height="8" rx="3"/><rect x="45" y="72" width="10" height="16" rx="2"/><circle cx="50" cy="93" r="6"/>`,
  wheat: () =>
    `<path d="M49 96 51 96 52 22 48 22Z"/>${[0, 1, 2, 3, 4, 5]
      .map((i) => {
        const y = 26 + i * 11;
        return `<ellipse cx="41" cy="${y}" rx="5" ry="10" transform="rotate(-28 41 ${y})"/><ellipse cx="59" cy="${y}" rx="5" ry="10" transform="rotate(28 59 ${y})"/>`;
      })
      .join('')}<ellipse cx="50" cy="12" rx="5" ry="11"/>`,
  sling: (D) =>
    `<path d="M14 8C26 40 34 58 44 70" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M86 8C74 40 66 58 56 70" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="74" rx="14" ry="9"/><circle cx="50" cy="72" r="7" fill="${D}" opacity=".55"/><circle cx="22" cy="90" r="5"/><circle cx="36" cy="93" r="4.5"/><circle cx="64" cy="93" r="4.5"/><circle cx="78" cy="90" r="5"/>`,
  crown: (D) =>
    `<path d="M10 76 16 30 34 52 50 20 66 52 84 30 90 76Z"/><rect x="10" y="78" width="80" height="12" rx="3"/><circle cx="16" cy="28" r="5"/><circle cx="50" cy="18" r="6"/><circle cx="84" cy="28" r="5"/><circle cx="30" cy="84" r="3.4" fill="${D}" opacity=".6"/><circle cx="50" cy="84" r="4" fill="#e63946"/><circle cx="70" cy="84" r="3.4" fill="${D}" opacity=".6"/>`,
  temple: (D) =>
    `<path d="M6 34 50 8 94 34Z"/><rect x="10" y="36" width="80" height="6"/>${[16, 31, 46, 61, 76]
      .map((x) => `<rect x="${x}" y="44" width="8" height="40"/>`)
      .join('')}<rect x="6" y="86" width="88" height="5"/><rect x="2" y="92" width="96" height="5"/><circle cx="50" cy="25" r="4" fill="${D}" opacity=".5"/>`,
  harp: (D) =>
    `<path d="M22 12C10 30 14 62 30 80H70C86 62 90 30 78 12 72 22 74 40 66 54 58 66 42 66 34 54 26 40 28 22 22 12Z"/><rect x="18" y="80" width="64" height="10" rx="4"/><rect x="24" y="14" width="52" height="6" rx="3"/><g stroke="${D}" stroke-width="1.6" opacity=".6"><path d="M36 20V60M44 20V64M50 20V66M56 20V64M64 20V60"/></g>`,
  storm: (D) =>
    `<path d="M24 56C12 56 8 46 12 38 16 30 26 30 28 32 30 18 44 12 54 16 62 8 80 12 82 26 92 28 96 40 90 48 86 54 80 56 76 56Z"/><path d="M52 50 38 76H50L42 98 66 66H54L62 50Z" fill="#fff6c2"/><path d="M24 56H76" stroke="${D}" stroke-width="2" opacity=".2"/>`,
  lamp: (D) =>
    `<path d="M50 8C55 18 62 22 60 32 58 38 54 40 50 40 46 40 42 38 40 32 39 24 45 20 46 14 48 18 49 20 50 8Z" fill="#ffd166"/><path d="M8 58C8 48 28 44 50 44 64 44 76 46 84 50L96 44 92 58C92 72 74 80 50 80 26 80 8 72 8 58Z"/><ellipse cx="50" cy="52" rx="16" ry="4" fill="${D}" opacity=".5"/><rect x="34" y="82" width="32" height="8" rx="3"/>`,
  hourglass: (D) =>
    `<rect x="18" y="4" width="64" height="8" rx="3"/><rect x="18" y="88" width="64" height="8" rx="3"/><path d="M24 12H76C76 34 58 42 56 50 58 58 76 66 76 88H24C24 66 42 58 44 50 42 42 24 34 24 12Z"/><path d="M34 22H66C62 32 54 38 50 44 46 38 38 32 34 22ZM50 56C54 66 66 72 68 82H32C34 72 46 66 50 56Z" fill="${D}" opacity=".45"/>`,
  heart: (D) =>
    `<path d="M50 90C20 68 6 52 6 34 6 20 16 10 29 10 38 10 46 15 50 23 54 15 62 10 71 10 84 10 94 20 94 34 94 52 80 68 50 90Z"/><path d="M28 22C20 24 16 30 16 36" stroke="${D}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".25"/>`,
  drop: (D) =>
    `<path d="M50 4C62 26 82 46 82 64 82 82 68 96 50 96 32 96 18 82 18 64 18 46 38 26 50 4Z"/><path d="M32 66C32 76 38 82 46 84" stroke="${D}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".3"/>`,
  wheel: (D) =>
    `<circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="10"/>${[0, 45, 90, 135]
      .map((a) => `<rect x="47.5" y="6" width="5" height="88" transform="rotate(${a} 50 50)"/>`)
      .join('')}${[0, 60, 120, 180, 240, 300]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return `<circle cx="${f(50 + Math.cos(r) * 44)}" cy="${f(50 + Math.sin(r) * 44)}" r="3" fill="${D}"/>`;
      })
      .join('')}`,
  lion: (D) => {
    const pts: string[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = i % 2 ? 36 : 47;
      pts.push(`${f(50 + Math.cos(a) * r)},${f(52 + Math.sin(a) * r)}`);
    }
    return `<polygon points="${pts.join(' ')}"/><circle cx="50" cy="54" r="26" fill="${D}" opacity=".25"/><circle cx="50" cy="54" r="24"/><circle cx="41" cy="48" r="3" fill="${D}"/><circle cx="59" cy="48" r="3" fill="${D}"/><path d="M44 60h12l-6 7Z" fill="${D}"/><path d="M50 67v5M43 73q7 5 14 0" stroke="${D}" stroke-width="2" fill="none"/>`;
  },
  fish: (D) =>
    `<path d="M4 50C18 26 48 20 70 38L92 22 86 50 92 78 70 62C48 80 18 74 4 50Z"/><circle cx="22" cy="46" r="4" fill="${D}"/><path d="M36 34C42 42 42 58 36 66" stroke="${D}" stroke-width="2.5" fill="none" opacity=".4"/>`,
  plumb: (D) =>
    `<rect x="14" y="6" width="72" height="7" rx="3"/><rect x="48.5" y="13" width="3" height="46"/><path d="M50 58C60 58 66 66 66 74 66 84 56 92 50 98 44 92 34 84 34 74 34 66 40 58 50 58Z"/><path d="M42 72h16" stroke="${D}" stroke-width="2" opacity=".4"/>`,
  star: (D) => {
    const pts: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 4 === 0 ? 48 : i % 2 === 0 ? 26 : 12;
      pts.push(`${f(50 + Math.cos(a) * r)},${f(50 + Math.sin(a) * r)}`);
    }
    return `<polygon points="${pts.join(' ')}"/><circle cx="50" cy="50" r="7" fill="#fff"/><circle cx="50" cy="50" r="12" fill="none" stroke="${D}" stroke-width="1" opacity=".2"/>`;
  },
  tower: (D) =>
    `<path d="M28 96 34 30H66L72 96Z"/><path d="M26 30V14h8v6h8v-6h8v6h8v-6h8v6h8v10Z"/><path d="M44 96V80a6 6 0 0 1 12 0v16Z" fill="${D}" opacity=".7"/><rect x="46" y="44" width="8" height="12" rx="4" fill="${D}" opacity=".6"/><path d="M50 14V2" stroke="currentColor" stroke-width="2.5"/>`,
  menorah: (D) =>
    `<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M50 30V86"/><path d="M38 30C38 52 62 52 62 30"/><path d="M26 30C26 66 74 66 74 30"/><path d="M14 30C14 80 86 80 86 30"/></g><rect x="30" y="86" width="40" height="8" rx="3"/>${[14, 26, 38, 50, 62, 74, 86]
      .map((x) => `<path d="M${x} 26C${x + 4} 20 ${x + 3} 14 ${x} 8 ${x - 3} 14 ${x - 4} 20 ${x} 26Z" fill="#ffd166"/>`)
      .join('')}<circle cx="50" cy="30" r="3" fill="${D}" opacity=".4"/>`,
  sun: (D) => {
    const rays: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const a1 = a - 0.09;
      const a2 = a + 0.09;
      const r1 = 30;
      const r2 = i % 2 ? 40 : 48;
      rays.push(
        `<path d="M${f(50 + Math.cos(a1) * r1)} ${f(50 + Math.sin(a1) * r1)}L${f(50 + Math.cos(a) * r2)} ${f(50 + Math.sin(a) * r2)}L${f(50 + Math.cos(a2) * r1)} ${f(50 + Math.sin(a2) * r1)}Z"/>`,
      );
    }
    return `${rays.join('')}<circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="18" fill="${D}" opacity=".12"/>`;
  },
  dove: (D) =>
    `<path d="M14 62C24 48 40 44 50 50 54 30 70 14 92 10 82 22 76 36 70 48 78 48 84 52 88 56 76 60 66 64 58 72 46 84 28 84 16 76L6 80 12 68Z"/><circle cx="24" cy="60" r="2.5" fill="${D}"/><path d="M50 50C56 54 60 60 58 72" stroke="${D}" stroke-width="2" fill="none" opacity=".3"/><path d="M14 62 4 60 12 66Z" fill="#f4a261"/>`,
  cross: (D) =>
    `<rect x="42" y="4" width="16" height="92" rx="2"/><rect x="16" y="26" width="68" height="15" rx="2"/><path d="M50 8V92M20 33H80" stroke="${D}" stroke-width="1.5" opacity=".25"/>`,
  ship: (D) =>
    `<path d="M6 66H94L80 88H20Z"/><rect x="48" y="8" width="4" height="58"/><path d="M53 12C72 24 76 44 70 60H53Z"/><path d="M47 18C34 30 30 46 34 60H47Z" opacity=".85"/><path d="M52 8l12 4-12 4Z" fill="#e63946"/><path d="M20 76h60" stroke="${D}" stroke-width="2" opacity=".35"/>`,
  letter: (D) =>
    `<rect x="6" y="22" width="88" height="60" rx="5"/><path d="M8 26 50 58 92 26" fill="none" stroke="${D}" stroke-width="3" opacity=".4"/><circle cx="50" cy="60" r="11" fill="#b5172b"/><path d="M45 60h10M50 55v10" stroke="#ffd7d7" stroke-width="2"/>`,
  anchor: (D) =>
    `<circle cx="50" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="5"/><rect x="46" y="22" width="8" height="66"/><rect x="28" y="32" width="44" height="7" rx="3"/><path d="M10 58C14 80 32 92 50 92 68 92 86 80 90 58L80 64C76 76 64 82 50 82 36 82 24 76 20 64Z"/><path d="M6 60 16 52 20 66ZM94 60 84 52 80 66Z"/><path d="M50 26V86" stroke="${D}" stroke-width="1.5" opacity=".3"/>`,
  shield: (D) =>
    `<path d="M50 4 90 16C90 54 76 80 50 96 24 80 10 54 10 16Z"/><path d="M50 14 80 23C80 52 69 72 50 85 31 72 20 52 20 23Z" fill="${D}" opacity=".25"/><rect x="46" y="24" width="8" height="52" rx="2"/><rect x="30" y="40" width="40" height="8" rx="2"/>`,
  chain: (D) =>
    `<g fill="none" stroke="currentColor" stroke-width="7"><rect x="4" y="38" width="34" height="24" rx="12"/><rect x="62" y="38" width="34" height="24" rx="12"/></g><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M34 50h8M58 50h8"/></g><path d="M44 36 50 50 56 36M44 64 50 50 56 64" stroke="#fff3b0" stroke-width="3" fill="none"/><circle cx="50" cy="50" r="3" fill="${D}" opacity=".3"/>`,
  trumpet: (D) =>
    `<path d="M6 82C14 74 30 66 46 54 60 42 70 28 74 10 82 14 92 18 96 26 86 30 80 40 74 52 64 70 44 84 14 92Z"/><path d="M74 10C80 6 92 12 96 26" stroke="${D}" stroke-width="2" fill="none" opacity=".4"/><path d="M24 80C38 70 52 62 62 48" stroke="${D}" stroke-width="2" fill="none" opacity=".25"/>`,
  alpha: () =>
    `<text x="27" y="72" font-family="Georgia,'Times New Roman',serif" font-size="58" font-weight="700" text-anchor="middle">A</text><text x="73" y="72" font-family="Georgia,'Times New Roman',serif" font-size="58" font-weight="700" text-anchor="middle">Ω</text><rect x="10" y="84" width="80" height="3" rx="1.5"/><rect x="10" y="14" width="80" height="3" rx="1.5"/>`,
  jar: (D) =>
    `<rect x="34" y="6" width="32" height="8" rx="3"/><path d="M38 14H62C62 22 60 24 66 30 82 40 88 54 84 70 80 86 66 94 50 94 34 94 20 86 16 70 12 54 18 40 34 30 40 24 38 22 38 14Z"/><path d="M22 52H78M20 64H80" stroke="${D}" stroke-width="2.4" opacity=".35"/><path d="M58 40 52 54 60 66" stroke="${D}" stroke-width="2" fill="none" opacity=".5"/>`,
  mountain: (D) =>
    `<path d="M2 92 36 26 50 46 64 18 98 92Z"/><path d="M36 26 28 42 36 38 42 44 46 40ZM64 18 54 38 62 34 68 40 74 34Z" fill="#fff" opacity=".85"/><path d="M50 46 40 92" stroke="${D}" stroke-width="1.5" opacity=".2"/>`,
  key: (D) =>
    `<circle cx="28" cy="50" r="20"/><circle cx="28" cy="50" r="8" fill="${D}" opacity=".65"/><rect x="44" y="45" width="52" height="10" rx="2"/><rect x="74" y="55" width="8" height="16" rx="1"/><rect x="86" y="55" width="8" height="12" rx="1"/>`,
};

export const MOTIF_NAMES = Object.keys(MOTIFS);

// ───────────── cenários ─────────────
function ridge(W: number, H: number, base: number, amp: number, r: () => number, rough = 1): string {
  const steps = 14;
  const pts: [number, number][] = [];
  const p1 = r() * 6;
  const p2 = r() * 6;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const y = base - amp * (0.55 * Math.sin(i * 0.7 + p1) + 0.35 * Math.sin(i * 1.7 + p2) * rough + 0.25 * (r() - 0.5) * rough);
    pts.push([x, y]);
  }
  let d = `M0 ${H}L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += `Q${f(x0)} ${f(y0)} ${f(mx)} ${f((y0 + y1) / 2)}`;
    if (i === pts.length - 1) d += `T${f(x1)} ${f(y1)}`;
  }
  return `${d}L${W} ${H}Z`;
}

function peaks(W: number, H: number, base: number, amp: number, r: () => number): string {
  let d = `M0 ${H}L0 ${f(base)}`;
  let x = 0;
  while (x < W) {
    const w = W * (0.08 + r() * 0.14);
    const h = amp * (0.4 + r() * 0.6);
    d += `L${f(x + w / 2)} ${f(base - h)}L${f(x + w)} ${f(base - r() * amp * 0.2)}`;
    x += w;
  }
  return `${d}L${W} ${H}Z`;
}

function skyline(W: number, H: number, base: number, amp: number, r: () => number): string {
  let d = `M0 ${H}`;
  let x = 0;
  while (x < W) {
    const w = W * (0.03 + r() * 0.06);
    const h = amp * (0.25 + r() * 0.75);
    const top = base - h;
    if (r() > 0.75) {
      // torre com ameias
      const m = w / 5;
      d += `L${f(x)} ${f(top)}L${f(x + m)} ${f(top)}L${f(x + m)} ${f(top - m)}L${f(x + 2 * m)} ${f(top - m)}L${f(x + 2 * m)} ${f(top)}L${f(x + 3 * m)} ${f(top)}L${f(x + 3 * m)} ${f(top - m)}L${f(x + 4 * m)} ${f(top - m)}L${f(x + 4 * m)} ${f(top)}L${f(x + w)} ${f(top)}`;
    } else if (r() > 0.7) {
      // cúpula
      d += `L${f(x)} ${f(top)}Q${f(x + w / 2)} ${f(top - w * 0.8)} ${f(x + w)} ${f(top)}`;
    } else {
      d += `L${f(x)} ${f(top)}L${f(x + w)} ${f(top)}`;
    }
    x += w;
  }
  return `${d}L${W} ${f(base)}L${W} ${H}Z`;
}

function waves(W: number, H: number, base: number, amp: number, r: () => number): string {
  const n = 8 + Math.floor(r() * 5);
  const seg = W / n;
  let d = `M0 ${H}L0 ${f(base)}`;
  for (let i = 0; i < n; i++) {
    const x = i * seg;
    d += `Q${f(x + seg / 4)} ${f(base - amp * (0.6 + r() * 0.6))} ${f(x + seg / 2)} ${f(base)}T${f(x + seg)} ${f(base)}`;
  }
  return `${d}L${W} ${H}Z`;
}

function stars(W: number, H: number, n: number, r: () => number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = r() * H * 0.6;
    const rad = r() * 1.6 + 0.4;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad * (W / 640))}" opacity="${f(0.3 + r() * 0.7)}"/>`;
  }
  return `<g fill="#fff">${s}</g>`;
}

function rays(cx: number, cy: number, len: number, color: string, r: () => number): string {
  let s = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.05 + (i / (n - 1)) * 0.9) + (r() - 0.5) * 0.08;
    const w = 0.035 + r() * 0.03;
    const x1 = cx + Math.cos(a - w) * len;
    const y1 = cy + Math.sin(a - w) * len;
    const x2 = cx + Math.cos(a + w) * len;
    const y2 = cy + Math.sin(a + w) * len;
    s += `<path d="M${f(cx)} ${f(cy)}L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z"/>`;
  }
  return `<g fill="${color}" opacity=".10">${s}</g>`;
}

function clouds(W: number, H: number, color: string, r: () => number): string {
  let s = '';
  for (let c = 0; c < 4; c++) {
    const cx = r() * W;
    const cy = H * (0.08 + r() * 0.3);
    const sc = (W / 640) * (24 + r() * 26);
    for (let i = 0; i < 5; i++) {
      s += `<ellipse cx="${f(cx + (i - 2) * sc * 0.9)}" cy="${f(cy + (r() - 0.5) * sc * 0.6)}" rx="${f(sc * (0.9 + r() * 0.5))}" ry="${f(sc * (0.55 + r() * 0.3))}"/>`;
    }
  }
  return `<g fill="${color}" opacity=".55">${s}</g>`;
}

function columns(W: number, H: number, base: number, colH: number, color: string): string {
  const n = 9;
  const gap = W / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = i * gap + gap * 0.3;
    s += `<rect x="${f(x)}" y="${f(base - colH)}" width="${f(gap * 0.32)}" height="${f(colH)}"/><rect x="${f(x - gap * 0.06)}" y="${f(base - colH - gap * 0.08)}" width="${f(gap * 0.44)}" height="${f(gap * 0.08)}"/>`;
  }
  return `<g fill="${color}">${s}<rect x="0" y="${f(base)}" width="${W}" height="${f(H - base)}"/><rect x="0" y="${f(base - colH - gap * 0.2)}" width="${W}" height="${f(gap * 0.12)}"/></g>`;
}

function wheatField(W: number, H: number, base: number, color: string, r: () => number): string {
  let s = '';
  const n = 70;
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const h = (H - base) * (0.4 + r() * 0.8);
    const lean = (r() - 0.5) * h * 0.25;
    s += `<path d="M${f(x)} ${H}Q${f(x + lean / 2)} ${f(H - h / 2)} ${f(x + lean)} ${f(H - h)}" stroke-width="${f(W / 400)}"/><ellipse cx="${f(x + lean)}" cy="${f(H - h)}" rx="${f(W / 260)}" ry="${f(W / 100)}" stroke="none"/>`;
  }
  return `<g stroke="${color}" fill="${color}" opacity=".85">${s}</g>`;
}

function sceneLayers(scene: Scene, W: number, H: number, pal: [string, string, string], r: () => number): string {
  const far = mix(pal[0], pal[1], 0.45);
  const mid = mix(pal[0], '#000000', 0.15);
  const near = mix(pal[0], '#000000', 0.55);
  const light = pal[2];
  switch (scene) {
    case 'garden':
      return `<path d="${ridge(W, H, H * 0.7, H * 0.06, r)}" fill="${far}" opacity=".7"/><path d="${ridge(W, H, H * 0.8, H * 0.05, r)}" fill="${mid}"/>${treeLine(W, H, H * 0.86, near, r)}<path d="${ridge(W, H, H * 0.92, H * 0.03, r)}" fill="${near}"/>`;
    case 'desert':
      return `<path d="${ridge(W, H, H * 0.72, H * 0.05, r, 0.3)}" fill="${mix(far, light, 0.15)}" opacity=".7"/><path d="${ridge(W, H, H * 0.82, H * 0.06, r, 0.3)}" fill="${mid}"/><path d="${ridge(W, H, H * 0.92, H * 0.05, r, 0.2)}" fill="${near}"/>`;
    case 'sea':
      return `<path d="${waves(W, H, H * 0.72, H * 0.02, r)}" fill="${far}" opacity=".6"/><path d="${waves(W, H, H * 0.8, H * 0.035, r)}" fill="${mid}"/><path d="${waves(W, H, H * 0.9, H * 0.04, r)}" fill="${near}"/><path d="M0 ${f(H * 0.72)}H${W}" stroke="${light}" stroke-width="${f(W / 500)}" opacity=".25"/>`;
    case 'mountain':
      return `<path d="${peaks(W, H, H * 0.74, H * 0.3, r)}" fill="${far}" opacity=".7"/><path d="${peaks(W, H, H * 0.84, H * 0.2, r)}" fill="${mid}"/><path d="${ridge(W, H, H * 0.93, H * 0.03, r)}" fill="${near}"/>`;
    case 'city':
      return `<path d="${ridge(W, H, H * 0.78, H * 0.05, r)}" fill="${far}" opacity=".6"/><path d="${skyline(W, H, H * 0.86, H * 0.2, r)}" fill="${mid}"/><path d="${ridge(W, H, H * 0.94, H * 0.02, r)}" fill="${near}"/>`;
    case 'night':
      return `${stars(W, H, 90, r)}<circle cx="${f(W * (0.15 + r() * 0.2))}" cy="${f(H * 0.18)}" r="${f(H * 0.05)}" fill="#fff8dc" opacity=".9"/><path d="${ridge(W, H, H * 0.78, H * 0.05, r)}" fill="${far}" opacity=".5"/><path d="${ridge(W, H, H * 0.88, H * 0.04, r)}" fill="${near}"/>`;
    case 'temple':
      return `<path d="${ridge(W, H, H * 0.76, H * 0.03, r)}" fill="${far}" opacity=".5"/>${columns(W, H, H * 0.9, H * 0.22, mid)}<rect x="0" y="${f(H * 0.93)}" width="${W}" height="${f(H * 0.07)}" fill="${near}"/>`;
    case 'field':
      return `<path d="${ridge(W, H, H * 0.74, H * 0.04, r, 0.4)}" fill="${far}" opacity=".6"/><path d="${ridge(W, H, H * 0.84, H * 0.03, r, 0.4)}" fill="${mid}"/>${wheatField(W, H, H * 0.82, near, r)}`;
    case 'storm':
      return `${clouds(W, H, mix(pal[0], '#000000', 0.3), r)}<path d="${peaks(W, H, H * 0.82, H * 0.12, r)}" fill="${mid}"/><path d="${ridge(W, H, H * 0.92, H * 0.03, r)}" fill="${near}"/>`;
    case 'dawn':
    default:
      return `${rays(W * 0.5, H * 0.95, H * 1.2, light, r)}<path d="${ridge(W, H, H * 0.76, H * 0.05, r)}" fill="${far}" opacity=".65"/><path d="${ridge(W, H, H * 0.86, H * 0.04, r)}" fill="${mid}"/><path d="${ridge(W, H, H * 0.94, H * 0.02, r)}" fill="${near}"/>`;
  }
}

function treeLine(W: number, H: number, base: number, color: string, r: () => number): string {
  let s = '';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const h = H * (0.06 + r() * 0.08);
    const w = h * 0.55;
    s += `<rect x="${f(x - w * 0.06)}" y="${f(base - h * 0.4)}" width="${f(w * 0.12)}" height="${f(h * 0.5)}"/><ellipse cx="${f(x)}" cy="${f(base - h * 0.6)}" rx="${f(w / 2)}" ry="${f(h / 2)}"/>`;
  }
  return `<g fill="${color}">${s}</g>`;
}

const SCENES: Scene[] = ['garden', 'desert', 'sea', 'mountain', 'city', 'night', 'temple', 'field', 'storm', 'dawn'];


// ───────────── arte por episódio ─────────────
const strip = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Palavras-chave do título/sinopse → emblema do episódio. */
const EP_MOTIFS: [RegExp, string][] = [
  [/diluvio|arca de noe|naufragio|navio|barco|pescador/, 'ship'],
  [/torre|vigia/, 'tower'],
  [/peixe|ventre/, 'fish'],
  [/leao|leoes/, 'lion'],
  [/cruz|paixao|consumado|crucific/, 'cross'],
  [/ressuscit|tumulo|ele vive|emaus|ressurreicao/, 'sun'],
  [/pentecostes|espirito|pomba|batismo/, 'dove'],
  [/fogo|fornalha|carmelo|sarça|sarca|holocausto|chama/, 'flame'],
  [/mandamento|lei|alianca do sinai|tabuas|livro da alianca/, 'tablets'],
  [/estrela|magos|nasce|nascimento|belem/, 'star'],
  [/templo|tabernaculo|tenda da|casa do senhor|santuario/, 'temple'],
  [/muralha|muros|jerico|reconstru/, 'walls'],
  [/rei|rainha|coroa|trono|reino|realeza|davi/, 'crown'],
  [/golias|funda|gigante/, 'sling'],
  [/espada|batalha|guerra|combate|armadura|exercito/, 'sword'],
  [/trombeta|shofar/, 'trumpet'],
  [/carta|cartas|bilhete/, 'letter'],
  [/amor|amado|coracao|casamento|noiva/, 'heart'],
  [/lampada|luz|candelabro|resplandece/, 'lamp'],
  [/mar |mar$|aguas|rio|chuva|agua/, 'drop'],
  [/monte|montanha|sinai|nebo/, 'mountain'],
  [/deserto|tenda|acampamento|jornada|nuvem/, 'tent'],
  [/colheita|campos|trigo|semeador|eira/, 'wheat'],
  [/jardim|arvore|videira|figueira|criacao/, 'tree'],
  [/tempo|dias|fim/, 'hourglass'],
  [/cantico|louvor|salmo|harpa|musica/, 'harp'],
  [/visao|visoes|sonho|rodas|querubins/, 'wheel'],
  [/rolo|escriba|palavra|livro/, 'scroll'],
  [/tempestade|redemoinho|trovao/, 'storm'],
  [/oleiro|barro|vaso|cisterna/, 'jar'],
  [/cadeia|prisao|preso|escravo|carcere|cativ/, 'chain'],
  [/ancora|esperanca/, 'anchor'],
  [/chave|porta/, 'key'],
  [/sacrificio|oferta|altar|expiacao|pascoa|cordeiro/, 'altar'],
];

const EP_SCENES: [RegExp, Scene][] = [
  [/mar|aguas|peixe|naufragio|barco|jordao|rio|diluvio/, 'sea'],
  [/deserto|maná|mana|jornada|fugitivo|acampamento/, 'desert'],
  [/noite|sonho|estrela|trevas|cova/, 'night'],
  [/monte|montanha|sinai|carmelo|transfigura/, 'mountain'],
  [/cidade|jerusalem|muro|muralha|babilonia|ninive|roma|sodoma/, 'city'],
  [/templo|tabernaculo|santuario|sacerdote/, 'temple'],
  [/campo|colheita|trigo|eira|vinha/, 'field'],
  [/fogo|juizo|tempestade|guerra|batalha|queda|ira|pragas/, 'storm'],
  [/jardim|criacao|arvore|eden/, 'garden'],
  [/ressur|nasce|luz|novo|restaura|glória|gloria/, 'dawn'],
];

const SCENE_MOOD: Record<Scene, [string, string, string]> = {
  garden: ['#0d2b1d', '#2f7a4c', '#f4c95d'],
  desert: ['#2a1a07', '#b0702b', '#ffe3a3'],
  sea: ['#03141f', '#0f5e7a', '#8be9fd'],
  mountain: ['#141a2e', '#4a5a8a', '#e8eeff'],
  city: ['#1c1408', '#8a5a2a', '#ffd9a0'],
  night: ['#070b1f', '#24346e', '#ffe9a3'],
  temple: ['#20160a', '#8a6a2a', '#ffe28a'],
  field: ['#1f1a06', '#9c8424', '#fff0b0'],
  storm: ['#0b0e16', '#3b4a63', '#d4e2ff'],
  dawn: ['#1c0b05', '#c2571a', '#ffd88a'],
};

function episodeLook(book: Book, ep: number, r: () => number): { motif: string; scene: Scene; pal: [string, string, string] } {
  const e = book.episodes[ep - 1];
  const text = e ? strip(`${e.title} ${e.synopsis}`) : '';
  const title = e ? strip(e.title) : '';
  const motif =
    EP_MOTIFS.find(([re]) => re.test(title))?.[1] ??
    EP_MOTIFS.find(([re]) => re.test(text))?.[1] ??
    (ep % 2 === 0 ? MOTIF_NAMES[Math.floor(r() * MOTIF_NAMES.length)] : book.motif);
  const scene = EP_SCENES.find(([re]) => re.test(text))?.[1] ?? SCENES[(hash(book.id) + ep * 3) % SCENES.length];
  const mood = SCENE_MOOD[scene];
  const t = 0.45 + r() * 0.2;
  const pal: [string, string, string] = [mix(book.palette[0], mood[0], t), mix(book.palette[1], mood[1], t), mix(book.palette[2], mood[2], t * 0.8)];
  return { motif, scene, pal };
}

// ───────────── composição ─────────────
function compose(book: Book, kind: Kind, ep?: number): string {
  const [W, H] = SIZES[kind];
  const seed = hash(`${book.id}:${kind}:${ep ?? 0}`);
  const r = rng(seed);
  const pal = book.palette;
  const id = `a${seed.toString(36)}`;

  let scene: Scene = book.scene;
  let mx: number, my: number, ms: number, gx: number, gy: number, rot = 0;
  let pal2: [string, string, string] = pal;
  let motifName = book.motif;

  if (kind === 'poster') {
    mx = W / 2; my = H * 0.36; ms = W * 0.5; gx = W / 2; gy = H * 0.33;
  } else if (kind === 'backdrop') {
    mx = W * 0.73; my = H * 0.42; ms = H * 0.46; gx = W * 0.72; gy = H * 0.38;
  } else {
    // thumb — variações por episódio
    const pos = Math.floor(r() * 3);
    mx = W * [0.26, 0.5, 0.74][pos];
    my = H * (0.38 + r() * 0.1);
    ms = H * (0.42 + r() * 0.18);
    gx = mx + (r() - 0.5) * W * 0.2;
    gy = my - H * 0.05;
    rot = (r() - 0.5) * 16;
    if (ep) {
      const look = episodeLook(book, ep, r);
      scene = look.scene;
      pal2 = look.pal;
      motifName = look.motif;
    }
  }

  const D = mix(pal2[0], '#000000', 0.2);
  const motif = (MOTIFS[motifName] ?? MOTIFS.cross)(D);
  const angle = Math.floor(r() * 360);
  const grain = kind !== 'thumb';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="${id}b" gradientTransform="rotate(${90 + (angle % 40) - 20} .5 .5)"><stop offset="0" stop-color="${mix(pal2[1], pal2[0], 0.25)}"/><stop offset=".55" stop-color="${pal2[0]}"/><stop offset="1" stop-color="${mix(pal2[0], '#000000', 0.5)}"/></linearGradient>
<radialGradient id="${id}g" cx="${f(gx / W)}" cy="${f(gy / H)}" r=".6"><stop offset="0" stop-color="${pal2[2]}" stop-opacity=".75"/><stop offset=".35" stop-color="${pal2[1]}" stop-opacity=".35"/><stop offset="1" stop-color="${pal2[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(pal2[2], '#ffffff', 0.45)}"/><stop offset="1" stop-color="${pal2[2]}"/></linearGradient>
<radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(ms * 0.06)}"/></filter>
${grain ? `<filter id="${id}n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>` : ''}
</defs>
<rect width="${W}" height="${H}" fill="url(#${id}b)"/>
<rect width="${W}" height="${H}" fill="url(#${id}g)"/>
${sceneLayers(scene, W, H, pal2, r)}
<g transform="translate(${f(mx - ms / 2)} ${f(my - ms / 2)}) rotate(${f(rot)} ${f(ms / 2)} ${f(ms / 2)}) scale(${f(ms / 100)})">
<g fill="${pal2[2]}" color="${pal2[2]}" opacity=".55" filter="url(#${id}blur)">${motif}</g>
<g fill="url(#${id}m)" color="${mix(pal2[2], '#ffffff', 0.3)}">${motif}</g>
</g>
<rect width="${W}" height="${H}" fill="url(#${id}v)"/>
${grain ? `<rect width="${W}" height="${H}" filter="url(#${id}n)"/>` : ''}
</svg>`;
}

const cache = new Map<string, string>();

export function artUrl(book: Book, kind: Kind, ep?: number): string {
  const key = `${book.id}|${kind}|${ep ?? 0}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(compose(book, kind, ep))}`;
    cache.set(key, url);
  }
  return url;
}

export function artSvg(book: Book, kind: Kind, ep?: number): string {
  return compose(book, kind, ep);
}

// ───────────── avatares de perfil ─────────────
export const AVATARS: { bg: [string, string]; motif: string }[] = [
  { bg: ['#e50914', '#7a0710'], motif: 'dove' },
  { bg: ['#1f6aa5', '#0a2a4a'], motif: 'fish' },
  { bg: ['#f2b134', '#a2540b'], motif: 'lion' },
  { bg: ['#2f7a4c', '#0d2b1d'], motif: 'tree' },
  { bg: ['#7b2d8b', '#2a0d33'], motif: 'crown' },
  { bg: ['#0f8b8d', '#063d3e'], motif: 'anchor' },
  { bg: ['#d1495b', '#5a1520'], motif: 'heart' },
  { bg: ['#3a5a98', '#121e3a'], motif: 'harp' },
  { bg: ['#c2571a', '#4a1d05'], motif: 'sun' },
  { bg: ['#4a3a8a', '#16112e'], motif: 'star' },
  { bg: ['#8a6b2b', '#2e2209'], motif: 'lamp' },
  { bg: ['#5f7f1f', '#1b2608'], motif: 'wheat' },
];

export function avatarUrl(i: number): string {
  const a = AVATARS[((i % AVATARS.length) + AVATARS.length) % AVATARS.length];
  const key = `avatar|${i}`;
  let url = cache.get(key);
  if (!url) {
    const D = mix(a.bg[1], '#000000', 0.3);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.bg[0]}"/><stop offset="1" stop-color="${a.bg[1]}"/></linearGradient></defs><rect width="100" height="100" rx="6" fill="url(#g)"/><circle cx="78" cy="18" r="30" fill="#fff" opacity=".08"/><g transform="translate(22 22) scale(.56)" fill="#fff" color="#fff">${MOTIFS[a.motif](D)}</g></svg>`;
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(key, url);
  }
  return url;
}
