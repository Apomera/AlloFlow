import { test, expect as baseExpect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>Astronomy observatory harness</title>
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
  window.__toasts = [];
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
      setStemLabTool: function () {}, setStemLabTab: function () {}, addToast: function (m) { window.__toasts.push(String(m)); },
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

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
// Software WebGL (SwiftShader) is slow; every step gets generous budgets.
test.describe.configure({ timeout: 240000 });
const expect = baseExpect.configure({ timeout: 60000 });

// A fixed Maine summer evening: dark enough for stars, Moon and Milky Way.
const EVENING = { obsLive: false, obsDate: '2026-07-04', obsTime: '23:30' };

async function mountObservatory(page, state = {}) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}/__harness`);
  await page.evaluate(state => (window as any).__mount({ tab: 'observatory', ...state }), state);
  const sky = page.locator('#astronomy-observatory-3d');
  await sky.scrollIntoViewIfNeeded();
  await expect.poll(() => sky.evaluate((el: any) => !!el.__observatoryDebug?.().ready), { timeout: 60000 }).toBe(true);
  return { sky, errors };
}
const debug = (sky) => sky.evaluate((el: any) => el.__observatoryDebug());
test.afterEach(async ({ page }) => {
  await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
});

test('computes a real catalog sky from local assets for a fixed place and time', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => requests.push(r.url()));
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  const info = await debug(sky);
  expect(info.fallback).toBe(false);
  expect(info.utc).toBe('2026-07-05T03:30:00.000Z');
  expect(info.sun.alt).toBeLessThan(-12);
  expect(info.starsUp).toBeGreaterThan(3000);
  expect(info.linesDrawn).toBeGreaterThan(20);
  // The default view faces south from a northern site, so only the S marker is on screen.
  expect(info.labels).toContain('S');
  expect(info.labels).not.toContain('N');
  expect(info.camera.yaw).toBe(180);
  expect(requests.some(url => url.includes('/stem_lab/assets/astronomy/hyg-v41-naked-eye.json'))).toBe(true);
  expect(requests.some(url => url.includes('/vendor/three-r128/three.min.js'))).toBe(true);
  expect(requests.some(url => /cdnjs|jsdelivr|unpkg|noaa\.gov/.test(url))).toBe(false);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('2026-07-04 23:30 (UTC-04:00)');
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Fully dark sky');
  await page.screenshot({ path: 'scratch/observatory-lake-evening.png', clip: (await sky.boundingBox())! });
  expect(errors).toEqual([]);
});

test('place, hemisphere, daylight and time steps change the computed sky', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const maine = await debug(sky);
  await page.getByLabel('Observing site', { exact: true }).selectOption('sydney');
  await expect.poll(async () => (await debug(sky)).camera.yaw).toBe(0);
  const sydney = await debug(sky);
  expect(sydney.utc).not.toBe(maine.utc);
  expect(Math.abs(sydney.sun.alt - maine.sun.alt)).toBeGreaterThan(5);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  await page.getByLabel('Observing site', { exact: true }).selectOption('portland');
  await page.getByLabel('Local time', { exact: true }).fill('13:00');
  await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(40);
  const noon = await debug(sky);
  expect(noon.limit).toBeLessThanOrEqual(0);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Daylight');
  await page.screenshot({ path: 'scratch/observatory-daylight.png', clip: (await sky.boundingBox())! });
  await page.getByRole('button', { name: 'Shift time +1 d', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsDate)).toBe('2026-07-05');
  expect((await debug(sky)).utc).toBe('2026-07-05T17:00:00.000Z');
  expect(errors).toEqual([]);
});

test('landscapes swap without leaking GPU resources and aurora appears only where the model allows', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { ...EVENING, obsSite: 'tromso', obsDate: '2026-12-21', obsTime: '22:00', obsAurora: 5 });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const first = await debug(sky);
  expect(first.env).toContain('arctic');
  expect(first.auroraVisible).toBe(true);
  expect(first.aurora.level).toBe(5);
  await page.screenshot({ path: 'scratch/observatory-arctic-aurora.png', clip: (await sky.boundingBox())! });
  for (const env of ['coast', 'desert', 'forest', 'lake', 'arctic']) {
    await page.getByLabel('Landscape (representative)', { exact: true }).selectOption(env);
    await expect.poll(async () => (await debug(sky)).env).toContain(env);
    await expect(sky.locator('canvas')).toHaveCount(1);
    const info = await debug(sky);
    expect(info.geometries).toBeLessThanOrEqual(first.geometries + 6);
    if (env === 'coast' || env === 'desert') await page.screenshot({ path: `scratch/observatory-${env}.png`, clip: (await sky.boundingBox())! });
  }
  await page.getByLabel('Observing site', { exact: true }).selectOption('quito');
  await page.getByLabel(/Simulated aurora activity/).fill('9');
  await expect.poll(async () => (await debug(sky)).aurora.level).toBe(9);
  expect((await debug(sky)).auroraVisible).toBe(false);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('stays below this horizon');
  expect(errors).toEqual([]);
});

test('shower layer places the radiant from real coordinates and only shows meteors when it is up', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-08-12', obsTime: '23:30', obsShower: 'perseids' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const info = await debug(sky);
  expect(info.radiant.alt).toBeGreaterThan(10);
  expect(info.radiant.az).toBeGreaterThan(0);
  expect(info.radiant.az).toBeLessThan(90);
  expect(info.rate).toBeGreaterThan(0);
  await expect.poll(async () => (await debug(sky)).meteors).toBeGreaterThan(0);
  await page.getByRole('button', { name: '🔎 Radiant', exact: true }).click();
  const found = await debug(sky);
  expect(Math.abs(found.camera.yaw - info.radiant.az)).toBeLessThan(1);
  expect(found.labels.some(l => /Radiant .* simulated/.test(l))).toBe(true);
  await page.screenshot({ path: 'scratch/observatory-perseids.png', clip: (await sky.boundingBox())! });
  await page.getByLabel('Local time', { exact: true }).fill('14:00');
  await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  expect((await debug(sky)).rate).toBe(0);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Perseids Radiant');
  expect(errors).toEqual([]);
});

test('time-lapse advances inside the renderer and commits the reached time on pause', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { ...EVENING, obsRate: '1h' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const before = await debug(sky);
  await page.getByRole('button', { name: 'Play time-lapse', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).playMs).toBeGreaterThan(600000);
  expect(await page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).toBe('23:30');
  const during = await debug(sky);
  expect(during.playing).toBe(true);
  expect(during.utc).not.toBe(before.utc);
  await page.getByRole('button', { name: 'Pause time-lapse', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).not.toBe('23:30');
  const state = await page.evaluate(() => (window as any).__toolData.astronomy);
  expect(state.obsLive).toBe(false);
  expect(state.obsPlaying).toBe(false);
  const after = await debug(sky);
  expect(after.playMs).toBe(0);
  expect(after.playing).toBe(false);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText(`${state.obsDate} ${state.obsTime}`);
  expect(errors).toEqual([]);
});

test('keyboard, pointer, find and layer controls work at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1100 });
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  await sky.focus();
  await sky.press('ArrowRight');
  expect((await debug(sky)).camera.yaw).toBe(185);
  await sky.press('Home');
  expect((await debug(sky)).camera.yaw).toBe(180);
  await page.getByRole('button', { name: 'Face north', exact: true }).click();
  expect((await debug(sky)).camera.yaw).toBe(0);
  const box = (await sky.boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .55, { steps: 4 });
  await page.mouse.up();
  expect((await debug(sky)).camera.yaw).not.toBe(0);
  const info = await debug(sky);
  if (info.moon.alt > 0) {
    await page.getByRole('button', { name: '🔎 Moon', exact: true }).click();
    expect(Math.abs((await debug(sky)).camera.yaw - info.moon.az)).toBeLessThan(1);
  }
  await page.getByRole('button', { name: 'Constellation lines', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsLayers.lines)).toBe(false);
  await page.getByRole('button', { name: 'Compass points', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).labels.includes('N')).toBe(false);
  await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('cygnus');
  await page.getByRole('button', { name: '🔎 Cygnus', exact: true }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('falls back to built-in bright stars when the catalog asset is unavailable, and disposes on navigation', async ({ page }) => {
  await page.route('**/hyg-v41-naked-eye.json', route => route.fulfill({ status: 500, body: 'nope' }));
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(0);
  const info = await debug(sky);
  expect(info.fallback).toBe(true);
  expect(info.catalog).toBeLessThan(100);
  // Partial patterns would look broken, so lines stay hidden on the fallback even where a few resolve.
  expect(info.linesVisible).toBe(false);
  await expect(page.getByText('Built-in bright stars only')).toBeVisible();
  await page.evaluate(() => { (window as any).__oldSky = document.getElementById('astronomy-observatory-3d'); });
  await page.getByRole('tab', { name: /Meteors/ }).click();
  expect(await page.evaluate(() => !!(window as any).__oldSky.__observatoryDebug)).toBe(false);
  await expect(page.locator('#astronomy-observatory-3d')).toHaveCount(0);
  // The injected 500 is the only acceptable console error here.
  expect(errors.filter(e => !/status of 500/.test(e))).toEqual([]);
});

test('reduced motion keeps the scene still and disables time-lapse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sky, errors } = await mountObservatory(page, { ...EVENING, obsShower: 'perseids', obsDate: '2026-08-12' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  await page.waitForTimeout(300);
  const info = await debug(sky);
  expect(info.raf).toBe(false);
  await expect(page.getByRole('button', { name: 'Play time-lapse', exact: true })).toBeDisabled();
  await expect(page.getByText('Reduced motion is on')).toBeVisible();
  expect(errors).toEqual([]);
});
