import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

/**
 * Educator Hub dialog tools - text contrast on every tab in every app theme,
 * in a REAL browser with the REAL host theme stylesheet (2026-09-23).
 *
 * Six tools share one dialog shell whose sticky header was `bg-slate-50/95`.
 * The host's `.theme-dark .bg-slate-50` rule does not match the `/95`
 * variant, so in dark mode the header stayed light while the title, subtitle
 * and unselected tab labels were turned light: 1.1-1.28:1, every tab of
 * every tool (6-20 failures per tool). Light and high contrast were clean.
 * Communications Studio hit the same thing and has its own deeper spec.
 *
 * Mirrors the app root (the min-h-screen div carrying theme-${theme}, with
 * AppStyles inside it); Tailwind is compiled from the web app's own config
 * over the modules. Served from the WORKING TREE.
 *
 * Run:  npx playwright test tests/e2e/educator-hub-dialogs-themes.spec.ts --workers=1
 */

const ROOT = process.cwd();
const WEB = join(ROOT, 'desktop', 'web-app');
const MIME: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8' };

const TOOLS = [
  { key: 'DisproAnalyzer', file: 'dispro_analyzer_module.js', panel: 'DisproAnalyzerPanel' },
  { key: 'FamilyAnnouncements', file: 'family_announcements_module.js', panel: 'FamilyAnnouncementsPanel' },
  { key: 'MeetingDocs', file: 'meeting_docs_module.js', panel: 'MeetingDocsPanel' },
  { key: 'MtssTriage', file: 'mtss_triage_module.js', panel: 'MtssTriagePanel' },
  { key: 'SpedTimelines', file: 'sped_timelines_module.js', panel: 'SpedTimelinesPanel' },
  { key: 'UdlWalkthrough', file: 'udl_walkthrough_module.js', panel: 'UdlWalkthroughPanel' },
];

// The host passes these (AlloFlowANTI.txt CDNModuleGate mounts); its t()
// returns undefined for a missing key, so tools show their English fallback.
const harness = (tool: { key: string; file: string; panel: string }) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${tool.key} themes</title><link rel="stylesheet" href="/__tw.css"></head>
<body><div id="app"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/app_styles_module.js"></script>
<script src="/${tool.file}"></script>
<script>
  window.__errors = [];
  window.addEventListener('error', function (e) { window.__errors.push(String(e.message)); });
  window.__mount = function (theme) {
    var e = React.createElement;
    var P = window.AlloModules['${tool.key}']['${tool.panel}'];
    ReactDOM.createRoot(document.getElementById('app')).render(e('div', { className: 'min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col theme-' + theme },
      e(window.AlloModules.AppStyles.AppStyles, {}),
      e('div', { className: 'p-6 text-lg font-bold' }, 'AlloFlow main UI'),
      e(P, { isOpen: true, onClose: function () {}, t: function () { return undefined; }, addToast: function () {},
        callGemini: function () { return Promise.resolve(''); }, onOpenEligibility: function () {} })));
  };
</script></body></html>`;

let server: Server;
let base = '';
let twCss = '';

test.beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hub-dialog-themes-'));
  const input = join(dir, 'in.css');
  const harnessFile = join(dir, 'harness.html');
  const out = join(dir, 'tw.css');
  await writeFile(input, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  await writeFile(harnessFile, harness(TOOLS[0]));
  execFileSync(process.execPath, [join(WEB, 'node_modules', 'tailwindcss', 'lib', 'cli.js'), '-i', input, '-o', out,
    '--content', [...TOOLS.map((t) => join(ROOT, t.file)), harnessFile].join(',')], { cwd: WEB, stdio: 'pipe' });
  twCss = await readFile(out, 'utf8');

  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    const tool = TOOLS.find((t) => url === `/__harness/${t.key}`);
    if (tool) { res.writeHead(200, { 'content-type': MIME['.html'] }); res.end(harness(tool)); return; }
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

for (const tool of TOOLS) {
  for (const theme of ['light', 'dark', 'contrast']) {
    test(`${tool.key}, ${theme} theme: text on every tab passes WCAG AA contrast`, async ({ page }) => {
      await page.goto(`${base}/__harness/${tool.key}`);
      await page.evaluate((t) => (window as any).__mount(t), theme);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await page.addScriptTag({ path: join(WEB, 'node_modules', 'axe-core', 'axe.min.js') });
      const tabs = dialog.locator('[role="tab"]');
      const tabCount = await tabs.count();
      // Every one of these tools is tabbed; a count of 0 means the shell changed.
      expect(tabCount).toBeGreaterThan(1);
      const failures: string[] = [];
      let checked = 0;
      for (let i = 0; i < tabCount; i++) {
        const label = ((await tabs.nth(i).textContent()) || '').trim();
        await tabs.nth(i).click();
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
        const result = await page.evaluate(async () => {
          const r = await (window as any).axe.run(document.querySelector('[role="dialog"]'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
          return {
            checked: r.passes.reduce((n: number, p: any) => n + p.nodes.length, 0),
            violations: r.violations.flatMap((v: any) => v.nodes.map((n: any) => `${(n.any[0] && n.any[0].message || '').slice(0, 110)} :: ${n.html.slice(0, 80)}`)),
          };
        });
        checked += result.checked;
        result.violations.forEach((v: string) => failures.push(`[${label}] ${v}`));
      }
      // Sparse tabs measure 13-15 elements; 8 per tab still rules out an empty scan.
      expect(checked).toBeGreaterThan(8 * tabCount);
      expect(failures).toEqual([]);
      expect(await page.evaluate(() => (window as any).__errors)).toEqual([]);
    });
  }
}
