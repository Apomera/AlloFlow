import { test, expect, Page } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

/**
 * Communications Studio - text contrast in every app theme, in a REAL browser
 * with the REAL host theme stylesheet (2026-09-23).
 *
 * The host's AppStyles carries global `.theme-dark .bg-slate-50 {...}` and
 * `.theme-dark .text-*` rules that restyle named Tailwind classes inside every
 * tool. jsdom computes no colours and the studio's unit and axe tests disable
 * color-contrast, so this was never measured. The first measurement found the
 * sticky header on `bg-slate-50/95`, which the dark rules do not match: the
 * header stayed light under text the dark theme had turned light (title
 * 1.29:1), and the close confirmation inside it read 1.61:1.
 *
 * Mirrors the app: the root div carries `theme-${theme}` with AppStyles inside
 * it (AlloFlowANTI.txt, the min-h-screen root). Tailwind is compiled from the
 * web app's own config over the module, so the utilities are the app's.
 * Served from the WORKING TREE, so it measures uncommitted changes.
 *
 * Run:  npx playwright test tests/e2e/communications-studio-themes.spec.ts --workers=1
 */

const ROOT = process.cwd();
const WEB = join(ROOT, 'desktop', 'web-app');
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const ROOT_CLASSES = 'min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col';
const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>communications studio themes</title>
<link rel="stylesheet" href="/__tw.css"></head>
<body><div id="app"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/app_styles_module.js"></script>
<script src="/communications_studio_module.js"></script>
<script>
  window.__errors = [];
  window.addEventListener('error', function (e) { window.__errors.push(String(e.message)); });
  window.alloCopyText = function () { return Promise.resolve(true); };
  window.callGemini = function (prompt, json) {
    var names = Array.from(prompt.matchAll(/^(S[0-9]+) [|]/gm), function (m) { return m[1]; });
    if (json && prompt.indexOf('Translate each') === 0) return Promise.resolve(JSON.stringify(names.map(function (c) { return { codename: c, comment: c + ' lee con cuidado.' }; })));
    if (json) return Promise.resolve(JSON.stringify(names.filter(function (c) { return c !== 'S4'; }).map(function (c) {
      return { codename: c, comment: c === 'S2'
        ? 'S2 scored 92% and she demonstrates considerable metacognitive sophistication, articulating interdisciplinary connections and consistently evaluating alternative representational strategies.'
        : c + ' reads with care and is growing in fractions; ask them to explain a number line at home.' };
    })));
    if (prompt.indexOf('back into English') >= 0) return Promise.resolve('Dear families: the interdisciplinary unit emphasized metacognition.');
    if (prompt.indexOf('Translate') === 0) return Promise.resolve('Estimadas familias: la unidad interdisciplinaria enfatiz\\u00f3 la metacognici\\u00f3n.');
    return Promise.resolve('Dear families, the interdisciplinary curriculum emphasized metacognitive strategies, collaborative inquiry, and sustained argumentation across 25 representational modalities.');
  };
  window.__mount = function (theme) {
    var e = React.createElement;
    var root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(e('div', { className: '${ROOT_CLASSES} theme-' + theme },
      e(window.AlloModules.AppStyles.AppStyles, {}),
      e('div', { className: 'p-6 text-lg font-bold' }, 'AlloFlow main UI'),
      e(window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel, { isOpen: true, t: function (k) { return k; }, onClose: function () {} })));
  };
</script></body></html>`;

let server: Server;
let base = '';
let twCss = '';

test.beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'comms-themes-'));
  const input = join(dir, 'in.css');
  const harness = join(dir, 'harness.html');
  const out = join(dir, 'tw.css');
  await writeFile(input, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  await writeFile(harness, HARNESS);
  execFileSync(process.execPath, [join(WEB, 'node_modules', 'tailwindcss', 'lib', 'cli.js'), '-i', input, '-o', out,
    '--content', `${join(ROOT, 'communications_studio_module.js')},${harness}`], { cwd: WEB, stdio: 'pipe' });
  twCss = await readFile(out, 'utf8');

  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') { res.writeHead(200, { 'content-type': MIME['.html'] }); res.end(HARNESS); return; }
    if (url === '/__tw.css') { res.writeHead(200, { 'content-type': MIME['.css'] }); res.end(twCss); return; }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

const STATES: Record<string, (page: Page) => Promise<void>> = {
  // Per-student list with limit and grade flags, evidence check, notes open,
  // row translations (one stale), a missing student and the retry button.
  'report-card batch': async (page) => {
    const d = page.locator('[role="dialog"]');
    await d.getByRole('tab', { name: 'Report-card comments (batch)' }).click();
    await page.locator('[data-comms-char-limit]').fill('120');
    await d.locator('textarea').first().fill(['S1', 'S2', 'S3', 'S4'].map((c) => `${c} | reads carefully | fractions | Perseverance 3`).join('\n'));
    await d.getByRole('button', { name: 'Draft from my notes' }).click();
    await page.waitForSelector('[data-comms-batch-list]');
    await page.locator('select').nth(1).selectOption('Spanish');
    await page.locator('[data-comms-translate-rows]').click();
    await page.waitForSelector('[data-comms-row-translation]');
    await page.locator('[data-comms-row="S1"] > textarea').fill('S1 now reads chapter books.');
    await page.locator('[data-comms-row-notes="S2"] summary').click();
    await expect(page.locator('[data-comms-retry-missing]')).toBeVisible();
  },
  // Safety and legal banner, name warning, and the close confirmation, which
  // sits inside the sticky header.
  'family reply with flags and the close confirmation': async (page) => {
    const d = page.locator('[role="dialog"]');
    await d.getByRole('tab', { name: 'Reply to a family message' }).click();
    await d.locator('textarea').first().fill("This is Jayden's mom. A boy threatened him and our lawyer is involved.\nThanks,\nRosa");
    await d.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('[data-comms-confirm]')).toBeVisible();
    await expect(page.locator('[data-comms-sensitive]')).toBeVisible();
  },
  // Reading-level box with Simplify, translation with back-check, stale
  // notice gone after a redraft, evidence check, earlier drafts open.
  'translated letter with earlier drafts': async (page) => {
    const d = page.locator('[role="dialog"]');
    await d.locator('textarea').first().fill('Fractions.');
    await d.getByRole('button', { name: 'Draft from my notes' }).click();
    await page.waitForSelector('[data-comms-readability]');
    await page.locator('select').nth(1).selectOption('Spanish');
    await d.getByRole('button', { name: /^Draft in Spanish/ }).click();
    await page.waitForSelector('[data-comms-translation]');
    await page.locator('[data-comms-back-translate]').click();
    await page.waitForSelector('[data-comms-back-check]');
    await page.locator('[data-comms-output]').fill('Dear families, 30 of us learned fractions and she helped.');
    await expect(page.locator('[data-comms-translation-stale]')).toBeVisible();
    await d.getByRole('button', { name: 'Draft from my notes' }).click();
    await page.waitForSelector('[data-comms-versions]');
    await page.locator('[data-comms-versions] summary').click();
  },
};

for (const theme of ['light', 'dark', 'contrast']) {
  for (const [state, drive] of Object.entries(STATES)) {
    test(`${theme} theme, ${state}: every text passes WCAG AA contrast`, async ({ page }) => {
      await page.goto(`${base}/__harness`);
      await page.evaluate((t) => (window as any).__mount(t), theme);
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await drive(page);
      await page.addScriptTag({ path: join(WEB, 'node_modules', 'axe-core', 'axe.min.js') });
      const result = await page.evaluate(async () => {
        const r = await (window as any).axe.run(document.querySelector('[role="dialog"]'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
        return {
          checked: r.passes.reduce((n: number, p: any) => n + p.nodes.length, 0),
          violations: r.violations.flatMap((v: any) => v.nodes.map((n: any) => `${(n.any[0] && n.any[0].message || '').slice(0, 120)} :: ${n.html.slice(0, 90)}`)),
        };
      });
      // A scan that checked almost nothing passes vacuously.
      expect(result.checked).toBeGreaterThan(25);
      expect(result.violations).toEqual([]);
      expect(await page.evaluate(() => (window as any).__errors)).toEqual([]);
    });
  }
}
