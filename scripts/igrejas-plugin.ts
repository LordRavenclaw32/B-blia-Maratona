import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Igrejas licenciadas: cada arquivo `igrejas/<slug>.json` vira o app próprio daquela igreja.
 * - Gera o módulo `virtual:igrejas` com as configurações (códigos de acesso viram hash).
 * - Publica a logo em `igrejas/<slug>/logo.<ext>` e uma página de entrada em `igreja/<slug>/`
 *   com título e prévia próprios para o link compartilhado no WhatsApp.
 */

const VIRTUAL = 'virtual:igrejas';
const RESOLVED = '\0' + VIRTUAL;
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif' };

type Raw = Record<string, unknown> & {
  slug?: string;
  nome?: string;
  logo?: string;
  app?: { nome?: string; subtitulo?: string };
  boasVindas?: string;
  cor?: string;
  acesso?: { codigo?: string; hash?: string; dica?: string };
};

export function accessHash(slug: string, code: string): string {
  return createHash('sha256').update(`${slug}:${code.trim().toLowerCase()}`).digest('hex');
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function landingPage(c: Raw, slug: string, logoPath: string | undefined, site: string): string {
  const title = c.app?.nome || c.nome || 'BíbliaFlix';
  const desc = c.app?.subtitulo || c.boasVindas || `Maratona bíblica da ${c.nome}: livros como séries, capítulos como episódios.`;
  const abs = (p: string) => (site ? new URL(p, site).href : `../../${p}`);
  const img = logoPath ? abs(logoPath) : abs('icon.svg');
  const color = typeof c.cor === 'string' && /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : '#e50914';
  const target = `../../?igreja=${encodeURIComponent(slug)}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="theme-color" content="#141414" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(img)}" />
${site ? `<meta property="og:url" content="${esc(new URL(`igreja/${slug}/`, site).href)}" />` : ''}
<meta name="twitter:card" content="summary" />
<link rel="icon" href="${esc(logoPath ? `../../${logoPath}` : '../../icon.svg')}" />
<script>location.replace(${JSON.stringify(target)} + location.hash);</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141414;color:#fff;font-family:system-ui,sans-serif}a{color:${color}}</style>
</head>
<body><p>Abrindo <a href="${esc(target)}">${esc(title)}</a>…</p></body>
</html>
`;
}

export function igrejasPlugin(dir = 'igrejas'): Plugin {
  let build = false;
  let site = '';
  const pages: { fileName: string; source: string }[] = [];

  return {
    name: 'bibliaflix-igrejas',
    configResolved(cfg) {
      build = cfg.command === 'build';
      site = (process.env.SITE_URL ?? '').trim();
      if (site && !site.endsWith('/')) site += '/';
    },
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return;
      pages.length = 0;
      const out: Raw[] = [];
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')) : [];
      for (const f of files) {
        const path = join(dir, f);
        this.addWatchFile(path);
        let c: Raw;
        try {
          c = JSON.parse(readFileSync(path, 'utf8')) as Raw;
        } catch (e) {
          this.warn(`${f}: JSON inválido (${(e as Error).message}) — igreja ignorada`);
          continue;
        }
        const slug = slugify(c.slug || basename(f, '.json'));
        if (!slug || !c.nome) {
          this.warn(`${f}: informe ao menos "nome" — igreja ignorada`);
          continue;
        }
        c.slug = slug;

        // código de acesso: só o hash vai para o app
        if (c.acesso?.codigo) {
          c.acesso = { ...c.acesso, hash: accessHash(slug, c.acesso.codigo) };
          delete c.acesso.codigo;
        }

        // logo: data URL embutida ou arquivo dentro de igrejas/
        let logoPath: string | undefined;
        if (typeof c.logo === 'string' && c.logo) {
          let bytes: Buffer | undefined;
          let ext = '';
          const data = c.logo.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
          if (data) {
            ext = data[1] === 'svg+xml' ? 'svg' : data[1] === 'jpeg' ? 'jpg' : data[1];
            bytes = Buffer.from(data[2], 'base64');
          } else if (!/^https?:/.test(c.logo)) {
            const file = join(dir, c.logo);
            if (existsSync(file)) {
              this.addWatchFile(file);
              ext = extname(file).slice(1).toLowerCase();
              bytes = readFileSync(file);
            } else this.warn(`${f}: logo "${c.logo}" não encontrada em ${dir}/`);
          }
          if (bytes && MIME[ext]) {
            if (build) {
              logoPath = `igrejas/${slug}/logo.${ext}`;
              this.emitFile({ type: 'asset', fileName: logoPath, source: bytes });
              c.logo = logoPath;
            } else c.logo = `data:${MIME[ext]};base64,${bytes.toString('base64')}`;
          } else if (!/^https?:/.test(c.logo)) delete c.logo;
          else logoPath = c.logo;
        }

        pages.push({ fileName: `igreja/${slug}/index.html`, source: landingPage(c, slug, logoPath && !/^https?:/.test(logoPath) ? logoPath : undefined, site) });
        out.push(c);
      }
      out.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      return `export default ${JSON.stringify(out)};`;
    },
    generateBundle() {
      for (const p of pages) this.emitFile({ type: 'asset', fileName: p.fileName, source: p.source });
    },
  };
}
