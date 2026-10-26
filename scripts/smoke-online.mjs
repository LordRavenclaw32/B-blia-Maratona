// Teste do app publicado (GitHub Pages + servidor real): modo normal, apresentação e app da igreja de demonstração.
// Cria contas temporárias na comunidade e as exclui no final.
import { chromium } from 'playwright';

const BASE = (process.env.SITE_URL || 'https://lordravenclaw32.github.io/BibliaFlix-Maratona/').replace(/\/?$/, '/');
const RUN = Date.now().toString(36);
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? 'PASS' : 'FAIL'} ${m}`);
  if (!c) fails++;
};

async function enter(page, url, name) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const intro = page.locator('.intro');
  if (await intro.count()) await intro.click();
  await page.waitForSelector('input[aria-label="Nome"]');
  await page.fill('input[aria-label="Nome"]', name);
  await page.click('button:has-text("Continuar")');
  await page.waitForSelector('.rows');
}

async function join(page, login) {
  await page.waitForSelector('.gate-form');
  await page.fill('.gate-form input[placeholder="(11) 98765-4321"]', login);
  await page.fill('.gate-form input[type="password"]', String(Math.floor(100000 + Math.random() * 899999)));
  await page.check('.gate-form input[type="checkbox"]');
  await page.click('.gate-form button:has-text("Entrar na comunidade")');
}

async function leave(page) {
  await page.goto(page.url().split('#')[0] + '#/comunidade');
  await page.click('button[aria-label="Meu perfil na comunidade"]');
  await page.click('button:has-text("Excluir conta")');
  await page.waitForSelector('.gate-form');
}

const browser = await chromium.launch();
const errors = [];
const open = async (viewport) => {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => r.url().includes('/rpc/') && r.status() >= 400 && r.text().then((t) => console.log(`  RPC ${r.status()} ${r.url().split('/rpc/')[1]}: ${t.slice(0, 200)}`)).catch(() => undefined));
  page.on('requestfailed', (r) => r.url().includes('supabase') && console.log(`  RPC falhou ${r.url().split('/rpc/')[1]}: ${r.failure()?.errorText}`));
  page.on('dialog', (d) => d.accept());
  return page;
};

const n = await open({ width: 1366, height: 860 });
const c = await open({ width: 390, height: 844 });
try {
  // 1. modo normal (BíbliaFlix) com a Comunidade BíbliaFlix
  await enter(n, BASE + '?igreja=bibliaflix', 'Visitante');
  ok((await n.title()) === 'BíbliaFlix', 'modo normal abre (BíbliaFlix)');
  ok((await n.locator('.row').count()) > 8, 'início com as séries da Bíblia');
  await n.goto(BASE + '?igreja=bibliaflix#/mensagens');
  await join(n, `teste-${RUN}@verificacao`);
  await n.waitForSelector('.c-row, .c-hero', { timeout: 20000 });
  ok((await n.locator('text=Comece por aqui').count()) > 0, 'modo social no app normal: mensagens do servidor');
  await n.goto(BASE + '?igreja=bibliaflix#/comunidade');
  await n.waitForSelector('.feed-item', { timeout: 20000 });
  ok(true, 'relacionamentos (feed) no app normal');
  // publicação privada com imagem (testa o envio de mídia ao servidor real) e exclusão
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await n.click('.composer-closed');
  await n.fill('.composer textarea', `Teste automático ${RUN}`);
  await n.locator('.composer input[type=file][accept="image/*"]').setInputFiles({ name: 'teste.png', mimeType: 'image/png', buffer: png });
  await n.waitForSelector('.composer .media-picked img');
  await n.click('.composer .seg button:has-text("Privado")');
  await n.click('.composer button:has-text("Publicar")');
  const mine = n.locator(`.post-card:has-text("Teste automático ${RUN}")`);
  await mine.locator('.post-image').waitFor({ timeout: 20000 });
  ok((await mine.locator('.post-image').getAttribute('src')).includes('/storage/v1/object/public/midia/'), 'envio de imagem para o servidor');
  ok(await n.evaluate(async (src) => (await fetch(src)).ok, await mine.locator('.post-image').getAttribute('src')), 'imagem publicada acessível');
  await mine.locator('button[aria-label="Opções da publicação"]').click();
  await mine.locator('.dd-item:has-text("Excluir")').click();
  await mine.waitFor({ state: 'detached' });
  ok(true, 'publicação de teste excluída');
  await n.click('.community-tabs button:has-text("Conversas")');
  await n.waitForSelector('.conv-list .conv-new');
  ok(true, 'conversas no app normal');
  await leave(n);
  ok(true, 'conta temporária excluída (app normal)');

  // 2. apresentação comercial
  const p = await open({ width: 1366, height: 860 });
  await p.goto(BASE + '#/apresentacao', { waitUntil: 'networkidle' });
  await p.waitForSelector('.pitch');
  ok((await p.locator('.package').count()) === 2, 'apresentação comercial com os 2 pacotes');

  // 3. app da igreja de demonstração (modo teste) com modo social
  await c.goto(BASE + 'igreja/exemplo/');
  await c.waitForURL(/igreja=exemplo/);
  await enter(c, c.url(), 'Teste');
  ok((await c.title()) === 'Graça Play', 'app da igreja abre (Graça Play)');
  await c.waitForSelector('.ann-card', { timeout: 20000 });
  ok(true, 'igreja: anúncios na tela inicial');
  await c.goto(BASE + '?igreja=exemplo#/mensagens');
  await join(c, `teste-${RUN}@verificacao`);
  await c.waitForSelector('.c-hero', { timeout: 20000 });
  ok((await c.locator('text=Raízes da Fé').count()) > 0, 'igreja: lançamento “Raízes da Fé”');
  ok((await c.locator('.mural .mural-item').count()) >= 1, 'igreja: mural do mês');
  await c.goto(BASE + '?igreja=exemplo#/comunidade');
  await c.waitForSelector('.feed-item', { timeout: 20000 });
  ok((await c.locator('.feed-item').count()) >= 5, 'igreja: feed de atividades dos irmãos');
  ok((await c.locator('.post-card').count()) >= 2, 'igreja: publicações (devocionais e estudos) no feed');
  await c.click('.community-tabs button:has-text("Irmãos")');
  await c.waitForSelector('a.brother');
  await c.click('a.brother:has-text("Ana Paula")');
  await c.waitForSelector('.member-profile .heatmap', { timeout: 20000 });
  ok(true, 'igreja: perfil do irmão com rotina de leitura');
  await c.goto(BASE + '?igreja=exemplo#/comunidade?aba=conversas');
  await c.waitForSelector('.conv-list .conv-new');
  ok(true, 'igreja: conversas');
  await leave(c);
  ok(true, 'conta temporária excluída (igreja)');
} catch (e) {
  console.log('FAIL erro: ' + e.message.split('\n')[0]);
  for (const [name, pg] of [['normal', n], ['igreja', c]]) {
    console.log(`  [${name}] ${pg.url()} :: ${(await pg.locator('.error, .toast').allInnerTexts().catch(() => [])).join(' | ')}`);
    if (process.env.SHOTS) {
      await import('node:fs').then((fs) => fs.mkdirSync(process.env.SHOTS, { recursive: true }));
      await pg.screenshot({ path: `${process.env.SHOTS}/${name}.png`, fullPage: true }).catch(() => undefined);
    }
  }
  fails++;
}
ok(errors.length === 0, 'sem erros de JavaScript ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(fails ? `${fails} FALHA(S)` : 'TUDO OK');
process.exit(fails ? 1 : 0);
