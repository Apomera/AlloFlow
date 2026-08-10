import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>Astronomy visual harness</title>
<style>
  html,body{margin:0;min-height:100%;background:#0f172a}
  *,*::before,*::after{box-sizing:border-box}
  #wrap{width:100%;max-width:1180px;margin:0 auto}
</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], rejections: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { window.__events.rejections.push(String(e.reason)); });
</script>
<script src="/stem_lab/stem_tool_astronomy.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.astronomy;
    window.__toolData = { astronomy: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      setToolData: function (fn) {
        window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
        if (bump) bump();
      },
      update: function (b, k, v) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b]);
        window.__toolData[b][k] = v;
        if (bump) bump();
      },
      updateMulti: function (b, patch) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b], patch);
        if (bump) bump();
      },
      setStemLabTool: function () {}, setStemLabTab: function () {}, addToast: function () {},
      awardXP: function () {}, getXP: function () { return 0; }, announceToSR: function () {},
      celebrate: function () {}, beep: function () {}, callGemini: null,
      gradeLevel: '8th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {}
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      window.__bump = bump;
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return !!cfg;
  };
  window.__destroy = function () {
    if (window.__root) { window.__root.unmount(); window.__root = null; }
  };
</script>
</body></html>`;

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(HARNESS);
      return;
    }
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
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

type Pg = import('@playwright/test').Page;

function collectBrowserIssues(page: Pg) {
  const issues: string[] = [];
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`);
  });
  return issues;
}

async function mount(page: Pg, tab: 'constellations' | 'skymap') {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.astronomy);
  await page.evaluate((activeTab) => (window as any).__mount({ tab: activeTab }), tab);
  await page.waitForSelector(tab === 'constellations'
    ? '#astronomy-constellation-gallery'
    : '#astronomy-sky-map-diagram');
  await page.waitForTimeout(120);
}

async function expectNoDocumentOverflow(page: Pg) {
  const size = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(size.documentWidth, JSON.stringify(size)).toBeLessThanOrEqual(size.innerWidth + 1);
  expect(size.bodyWidth, JSON.stringify(size)).toBeLessThanOrEqual(size.innerWidth + 1);
}

async function expectNoRuntimeIssues(page: Pg, issues: string[]) {
  const events = await page.evaluate(() => (window as any).__events);
  expect(events.errors).toEqual([]);
  expect(events.rejections).toEqual([]);
  expect(issues).toEqual([]);
}

async function selectVisibleSkyTarget(page: Pg) {
  const target = page.getByLabel('Sky map target');
  const values = await target.locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  for (const value of values) {
    await target.selectOption(value);
    const status = page.locator('#astronomy-sky-target-status');
    await expect(status).not.toHaveText('Overview shows all enabled sky layers.');
    if ((await status.innerText()).includes('highlighted:')) return value;
  }
  throw new Error('The target selector did not contain an above-horizon body');
}

test.describe.configure({ timeout: 120_000 });

test.describe('Astronomy constellation and Sky Map visuals - real Chromium', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('constellation gallery has 15 accessible figures and a working selected detail', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 1000 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'constellations');

    const gallery = page.locator('#astronomy-constellation-gallery');
    const cards = gallery.getByRole('button');
    const figures = gallery.locator('svg[data-constellation-figure]');
    await expect(cards).toHaveCount(15);
    await expect(figures).toHaveCount(15);

    const labelledBy = await figures.evaluateAll((svgs) => svgs.map((svg) => svg.getAttribute('aria-labelledby') || ''));
    expect(new Set(labelledBy).size).toBe(15);
    for (const ids of labelledBy) {
      const [titleId, descId] = ids.split(/\s+/);
      expect(titleId).toBeTruthy();
      expect(descId).toBeTruthy();
      await expect(page.locator(`#${titleId}`)).toHaveCount(1);
      await expect(page.locator(`#${descId}`)).toHaveCount(1);
    }
    expect(await figures.locator('[data-constellation-line="true"]').count()).toBeGreaterThan(40);
    expect(await figures.locator('[data-constellation-star="true"]').count()).toBeGreaterThan(70);

    const orion = gallery.getByRole('button', { name: /^Orion,/ });
    await orion.click();
    await expect(orion).toHaveAttribute('aria-pressed', 'true');
    const detail = page.getByRole('region', { name: 'Orion details' });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole('status')).toHaveText('Orion selected');
    await expect(detail.locator('svg[data-constellation-figure="orion"]')).toHaveCount(1);
    await expect(detail.getByText('Modern Western recognition guide', { exact: true })).toBeVisible();

    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });

  test('constellation cards and detail reflow without horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1100 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'constellations');

    const gallery = page.locator('#astronomy-constellation-gallery');
    await gallery.getByRole('button', { name: /^Cassiopeia,/ }).click();
    const detail = page.getByRole('region', { name: 'Cassiopeia details' });
    await expect(detail).toBeVisible();
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      };
      return {
        gallery: rect('#astronomy-constellation-gallery'),
        detail: rect('#astronomy-constellation-detail'),
      };
    });
    expect(geometry.gallery.left).toBeGreaterThanOrEqual(-0.5);
    expect(geometry.gallery.right).toBeLessThanOrEqual(320.5);
    expect(geometry.detail.left).toBeGreaterThanOrEqual(-0.5);
    expect(geometry.detail.right).toBeLessThanOrEqual(320.5);
    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });

  test('Sky Map layer controls, target halo, status, and diagram stay synchronized', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 1000 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'skymap');

    const layers = page.getByRole('group', { name: 'Sky map layers' });
    const contracts = [
      ['Stars', 'stars'],
      ['Constellation lines', 'constellation-lines'],
      ['Planets', 'planets'],
      ['Sun and Moon', 'sun-moon'],
      ['Ecliptic', 'ecliptic'],
    ] as const;
    await expect(layers.getByRole('button')).toHaveCount(5);
    for (const [label, dataLayer] of contracts) {
      const button = layers.getByRole('button', { name: label, exact: true });
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(0);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
    }

    const target = page.getByLabel('Sky map target');
    await expect(target).toHaveAttribute('aria-controls', 'astronomy-sky-map-diagram');
    const selectedValue = await selectVisibleSkyTarget(page);
    expect(selectedValue).not.toBe('');
    await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
    await expect(page.locator('#astronomy-sky-target-status')).toContainText('highlighted:');
    await expect(page.locator('#astronomy-sky-map-diagram')).toContainText('TARGET');
    const targetDetail = page.locator('#astronomy-sky-target-detail');
    await expect(targetDetail).toBeVisible();
    await expect(targetDetail).toContainText('Altitude');
    await expect(targetDetail).toContainText('Next horizon event');
    await expect(targetDetail).toContainText('Best in next 12 hours');
    const diagram = page.locator('#astronomy-sky-map-diagram');
    await expect(diagram).toHaveAttribute('role', 'img');
    await expect(diagram).toHaveAttribute('aria-label', /north at top, east at left/i);
    await expect(diagram).toBeVisible();

    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });

  test('Sky Map controls and SVG reflow without horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1100 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'skymap');

    await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
    await selectVisibleSkyTarget(page);
    const geometry = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      };
      return {
        controls: bounds('#astronomy-sky-controls'),
        layout: bounds('#astronomy-sky-layout'),
        diagram: bounds('#astronomy-sky-map-diagram'),
        target: bounds('#astronomy-sky-target'),
        targetDetail: bounds('#astronomy-sky-target-detail'),
      };
    });
    for (const box of Object.values(geometry)) {
      expect(box.left).toBeGreaterThanOrEqual(-0.5);
      expect(box.right).toBeLessThanOrEqual(320.5);
      expect(box.width).toBeGreaterThan(0);
    }
    await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });


});
