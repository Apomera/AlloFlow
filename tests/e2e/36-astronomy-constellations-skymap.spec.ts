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

async function mount(page: Pg, tab: 'constellations' | 'skymap' | 'seasons') {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.astronomy);
  await page.evaluate((activeTab) => (window as any).__mount({ tab: activeTab }), tab);
  await page.waitForSelector(tab === 'constellations'
    ? '#astronomy-constellation-gallery'
    : tab === 'seasons'
      ? '#astronomy-season-sun-path'
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
    const initialControlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
    expect(initialControlledIds).toContain('astronomy-sky-map-diagram');
    const selectedValue = await selectVisibleSkyTarget(page);
    expect(selectedValue).not.toBe('');
    const controlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
    expect(controlledIds).toEqual(expect.arrayContaining([
      'astronomy-sky-map-diagram', 'astronomy-sky-target-timeline',
    ]));
    await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
    await expect(page.locator('#astronomy-sky-target-status')).toContainText('highlighted:');
    await expect(page.locator('#astronomy-sky-map-diagram')).toContainText('TARGET');
    const targetDetail = page.locator('#astronomy-sky-target-detail');
    await expect(targetDetail).toBeVisible();
    await expect(targetDetail).toContainText('Altitude');
    await expect(targetDetail).toContainText('Next horizon event');
    await expect(targetDetail).toContainText('Highest in next 12 hours');
    const timeline = page.locator('#astronomy-sky-target-timeline');
    await expect(timeline).toBeVisible();
    await expect(timeline).toHaveAttribute('data-sky-target', selectedValue);
    const timelineFigure = timeline.locator('svg[data-sky-target-timeline]');
    await expect(timelineFigure).toHaveAttribute('role', 'img');
    await expect(timelineFigure).toHaveAttribute('data-duration-hours', '12');
    await expect(timelineFigure.locator('title')).toHaveCount(1);
    await expect(timelineFigure.locator('desc')).toHaveCount(1);
    await expect(timelineFigure.locator('[data-sky-twilight-bands] [data-twilight-band]')).not.toHaveCount(0);
    await expect(timelineFigure.locator('[data-sky-axis="x"]')).toHaveCount(1);
    await expect(timelineFigure.locator('[data-sky-axis="y"]')).toHaveCount(1);
    await expect(timelineFigure.locator('[data-sky-horizon]')).toHaveCount(1);
    await expect(timelineFigure.locator('[data-sky-altitude-path]')).toHaveCount(1);
    await expect(timelineFigure.locator('[data-sky-altitude-sample]')).not.toHaveCount(0);
    const diagram = page.locator('#astronomy-sky-map-diagram');
    await expect(diagram).toHaveAttribute('role', 'img');
    await expect(diagram).toHaveAttribute('aria-label', /north at top, east at left/i);
    await expect(diagram).toHaveAttribute('aria-label', /solid gold motion arc[^.]*next 12 hours/i);
    const targetTrack = diagram.locator('[data-sky-target-track]');
    await expect(targetTrack).toHaveCount(1);
    await expect(targetTrack).toHaveAttribute('data-sky-target', selectedValue);
    await expect(targetTrack).toHaveAttribute('clip-path', 'url(#astronomy-sky-dome-clip)');
    await expect(targetTrack.locator('[data-sky-target-track-segment]')).not.toHaveCount(0);
    const segmentCount = await targetTrack.locator('[data-sky-target-track-segment]').count();
    await expect(targetTrack).toHaveAttribute('data-segment-count', String(segmentCount));
    await expect(targetTrack).toHaveAttribute('data-visible-sample-count', /^\d+$/);
    expect(Number(await targetTrack.getAttribute('data-visible-sample-count'))).toBeGreaterThan(0);
    const segmentContracts = await targetTrack.locator('[data-sky-target-track-segment]').evaluateAll((segments) =>
      segments.map((segment) => ({
        d: segment.getAttribute('d') || '',
        markerEnd: segment.getAttribute('marker-end'),
        pointCount: Number(segment.getAttribute('data-point-count')),
      })));
    for (const segment of segmentContracts) {
      expect(segment.d).toMatch(/^M/i);
      expect(segment.d).not.toMatch(/NaN|Infinity|undefined/i);
      expect(segment.markerEnd).toBe('url(#astronomy-sky-target-track-arrow)');
      expect(segment.pointCount).toBeGreaterThan(1);
    }
    const waypointContracts = await targetTrack.locator('[data-sky-target-track-sample]').evaluateAll((samples) =>
      samples.map((sample) => ({
        hour: Number(sample.getAttribute('data-hour-offset')),
        altitude: Number(sample.getAttribute('data-altitude')),
        azimuth: Number(sample.getAttribute('data-azimuth')),
        x: Number(sample.getAttribute('cx')),
        y: Number(sample.getAttribute('cy')),
      })));
    for (const waypoint of waypointContracts) {
      expect([4, 8, 12]).toContain(waypoint.hour);
      expect([waypoint.altitude, waypoint.azimuth, waypoint.x, waypoint.y].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(waypoint.x - 190, waypoint.y - 190)).toBeLessThanOrEqual(178.01);
    }
    await expect(page.locator('#astronomy-sky-map-help')).toContainText(/solid gold arc traces.*next 12 hours/i);
    await expect(page.locator('#astronomy-sky-focus-legend')).toContainText(/solid gold arc traces its next 12 hours/i);
    await expect(diagram).toBeVisible();

    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });

  test('Bortle preview stays synchronized between Sky Map and Observing', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 1000 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'skymap');

    const darkness = page.locator('#astronomy-sky-darkness');
    const darknessStatus = page.locator('#astronomy-sky-darkness-status');
    const diagram = page.locator('#astronomy-sky-map-diagram');
    await expect(darkness).toHaveValue('5');
    await expect(darkness.locator('option')).toHaveCount(9);
    await darkness.selectOption('9');
    await expect(darkness).toHaveValue('9');
    await expect(darknessStatus).toHaveAttribute('data-bortle-class', '9');
    await expect(diagram).toHaveAttribute('data-bortle-class', '9');
    await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
    const selectedValue = await selectVisibleSkyTarget(page);
    expect(selectedValue).not.toBe('');
    await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);

    await page.locator('#astronomy-tab-observe').click();
    const observeNine = page.getByRole('button', { name: /^Bortle class 9:/ });
    await expect(observeNine).toHaveAttribute('aria-pressed', 'true');
    const observeOne = page.getByRole('button', { name: /^Bortle class 1:/ });
    await observeOne.click();
    await expect(observeOne).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#astronomy-tab-skymap').click();
    await expect(page.locator('#astronomy-sky-darkness')).toHaveValue('1');
    await expect(page.locator('#astronomy-sky-darkness-status')).toHaveAttribute('data-bortle-class', '1');
    await expect(page.locator('#astronomy-sky-map-diagram')).toHaveAttribute('data-bortle-class', '1');
    await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);

    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });
  test('Seasons Sun path updates for the shared observer and stays contained at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1100 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'seasons');

    const observer = page.locator('#astronomy-season-observer');
    const figure = page.locator('#astronomy-season-sun-path');
    const status = page.locator('#astronomy-season-sun-status');
    const conciseStatus = page.locator('#astronomy-season-status');
    await expect(observer).toHaveValue('portland');
    await expect(observer.locator('option')).toHaveCount(6);
    await expect(figure).toHaveAttribute('role', 'img');
    await expect(figure).toHaveAttribute('viewBox', '0 0 360 190');
    await expect(figure).toHaveAttribute('data-solar-state', 'normal');
    await expect(figure).toHaveAttribute('data-date', /^\d{4}-06-15$/);
    await expect(figure.locator('[data-solar-sample]')).toHaveCount(97);
    await expect(figure.locator('[data-solar-axis="x"]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-axis="y"]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-horizon]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-altitude-path]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-daylight-fill]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-noon]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-sunrise]')).toHaveCount(1);
    await expect(figure.locator('[data-solar-sunset]')).toHaveCount(1);
    await expect(status).toContainText(/local solar time/i);
    await expect(status).toContainText(/geometric/i);
    await expect(status).not.toHaveAttribute('role', /.+/);
    await expect(status).not.toHaveAttribute('aria-live', /.+/);
    await expect(observer).toHaveAttribute('aria-describedby', /\bastronomy-season-sun-status\b/);
    await expect(conciseStatus).toHaveAttribute('role', 'status');
    await expect(conciseStatus).toHaveAttribute('aria-live', 'polite');
    await expect(conciseStatus).toHaveAttribute('aria-atomic', 'true');
    await expect(conciseStatus).toContainText(/meteorological/i);
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);

    const portlandDaylight = Number(await figure.getAttribute('data-daylight-hours'));
    const portlandNoon = Number(await figure.getAttribute('data-noon-altitude'));
    expect(Number.isFinite(portlandDaylight)).toBe(true);
    expect(Number.isFinite(portlandNoon)).toBe(true);

    await observer.selectOption('sydney');
    await expect(observer).toHaveValue('sydney');
    await expect(status).toContainText(/Sydney/i);
    await expect(figure).toHaveAttribute('data-date', /^\d{4}-06-15$/);
    const sydneyDaylight = Number(await figure.getAttribute('data-daylight-hours'));
    const sydneyNoon = Number(await figure.getAttribute('data-noon-altitude'));
    expect(sydneyDaylight).toBeLessThan(portlandDaylight);
    expect(sydneyNoon).toBeLessThan(portlandNoon);

    const geometry = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      };
      return {
        observer: bounds('#astronomy-season-observer'),
        figure: bounds('#astronomy-season-sun-path'),
        status: bounds('#astronomy-season-sun-status'),
      };
    });
    for (const box of Object.values(geometry)) {
      expect(box.left).toBeGreaterThanOrEqual(-0.5);
      expect(box.right).toBeLessThanOrEqual(320.5);
      expect(box.width).toBeGreaterThan(0);
    }
    await expectNoDocumentOverflow(page);
    await expectNoRuntimeIssues(page, issues);
  });
  test('Sky Map controls and SVG reflow without horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1100 });
    const issues = collectBrowserIssues(page);
    await mount(page, 'skymap');

    await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
    await expect(page.locator('#astronomy-sky-darkness')).toHaveCount(1);
    await expect(page.locator('#astronomy-sky-darkness-status')).toHaveCount(1);
    await selectVisibleSkyTarget(page);
    const observingWindow = page.locator('#astronomy-sky-target-timeline [data-sky-observing-window]');
    await expect(observingWindow).toHaveCount(1);
    await expect(observingWindow).toHaveAttribute('data-state', /^(available|none|not-applicable)$/);
    await expect(observingWindow).toHaveAttribute('data-kind', /^(sun|moon|planet|star)$/);
    await expect(observingWindow.locator('[data-sky-observing-window-rail]')).toHaveCount(1);
    await expect(observingWindow.locator('[data-sky-observing-window-summary]')).toBeVisible();
    await expect(observingWindow.locator('[data-sky-observing-window-criteria]')).toBeVisible();
    await expect(observingWindow.locator('[data-score], [data-quality-score], [data-sky-quality-score]')).toHaveCount(0);
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
        darkness: bounds('#astronomy-sky-darkness'),
        darknessStatus: bounds('#astronomy-sky-darkness-status'),
        targetDetail: bounds('#astronomy-sky-target-detail'),
        targetTimeline: bounds('#astronomy-sky-target-timeline'),
        targetTimelineFigure: bounds('#astronomy-sky-target-timeline [data-sky-target-timeline]'),
        targetTrack: bounds('#astronomy-sky-map-diagram [data-sky-target-track]'),
        observingWindow: bounds('#astronomy-sky-target-timeline [data-sky-observing-window]'),
        observingWindowRail: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-rail]'),
        observingWindowSummary: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-summary]'),
        observingWindowCriteria: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-criteria]'),
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
