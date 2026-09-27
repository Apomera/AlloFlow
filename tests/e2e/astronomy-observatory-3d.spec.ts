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

test('observing workflow preserves the instant across clocks, places and both sky views', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsBortle: 2 });
  const instant = await page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs);
  await page.getByLabel('Clock time zone', { exact: true }).selectOption('UTC');
  await expect(page.getByLabel('Local time', { exact: true })).toHaveValue('03:00');
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-12-22');
  await page.getByLabel('Observing site', { exact: true }).selectOption('sydney');
  await expect(page.getByLabel('Local time', { exact: true })).toHaveValue('14:00');
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs)).toBe(instant);
  await page.getByLabel('Observing site', { exact: true }).selectOption('custom');
  const latitude = page.getByLabel('Latitude (°, north positive)', { exact: true });
  await latitude.fill('');
  const retainedLatitude = await page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).lat);
  await latitude.pressSequentially('-');
  await expect(latitude).toHaveValue('-');
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).lat)).toBe(retainedLatitude);
  await latitude.pressSequentially('33.86');
  await page.getByLabel('Longitude (°, east positive)', { exact: true }).fill('151.20');
  await page.getByRole('button', { name: 'Open this place and time in the Sky Map', exact: true }).click();
  await expect(page.getByLabel('Hours from selected time', { exact: true })).toBeVisible();
  await expect(page.locator('#astronomy-sky-carried-place')).toContainText('-33.86°, 151.20°');
  await expect(page.getByLabel('Sky darkness (Bortle class)', { exact: true })).toHaveValue('2');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.skyAnchorUtc)).toBe(instant);
  await page.getByRole('button', { name: 'day ▶', exact: true }).click();
  await page.getByRole('button', { name: 'Open this place and time in the 3D Observatory', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs)).toBe(instant + 86400000);
  await expect(latitude).toHaveValue('-33.86');
  await expect(page.getByLabel('Longitude (°, east positive)', { exact: true })).toHaveValue('151.2');
  expect(errors).toEqual([]);
});

test('observing workflow keeps valid sky while local time or coordinates are incomplete', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { errors } = await mountObservatory(page, { obsSite: 'custom', obsLat: 45, obsLon: -69, obsTz: 'America/New_York', obsLive: false, obsDate: '2026-03-08', obsTime: '01:30' });
  const instant = await page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs);
  const time = page.getByLabel('Local time', { exact: true });
  await time.fill('02:30');
  await expect(time).toHaveValue('02:30');
  await expect(time).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#astronomy-clock-error')).toContainText('The sky keeps the last valid time');
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs)).toBe(instant);
  await time.fill('03:30');
  await expect(page.locator('#astronomy-clock-error')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).utcMs)).toBe(instant + 3600000);
  const latitude = page.getByLabel('Latitude (°, north positive)', { exact: true });
  await latitude.fill('-999');
  await latitude.press('Tab');
  await expect(latitude).toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => page.evaluate(() => (window as any).__alloAstroPure.observatoryResolve((window as any).__toolData.astronomy).lat)).toBe(45);
  await latitude.press('Escape');
  await expect(latitude).toHaveValue('45');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

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
// Secondary controls live behind a disclosure so the sky comes first; a user
// opens it before changing layers, landscape, guides or deep time.
async function openSettings(page) {
  const toggle = page.getByRole('button', { name: /Sky settings/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}
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
  await sky.screenshot({ path: 'scratch/observatory-lake-evening.png' });
  expect(errors).toEqual([]);
});

test('thins the sky near the horizon by atmospheric extinction', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  const info = await debug(sky);
  // The magnitudes the shader draws with are the ones the CPU computed, not a
  // second curve written in GLSL.
  expect(info.starMagWired).toBe(true);
  // Some stars stand above the horizon but are lost in the air near it.
  expect(info.starsVisible).toBeGreaterThan(500);
  expect(info.starsVisible).toBeLessThan(info.starsUp);
  await sky.evaluate((el: any) => el.__observatoryLookAt(180, 4));
  await sky.screenshot({ path: 'scratch/observatory-horizon-murk.png' });

  // The same air reddens a setting Sun. Jump to sunset and face it.
  await page.getByRole('button', { name: /^Jump to Sunset \d\d:\d\d$/ }).click();
  await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(-1.5);
  const low = await debug(sky);
  expect(low.sunExt).toBeGreaterThan(4);
  await sky.evaluate((el: any, az: number) => el.__observatoryLookAt(az, 3), low.sun.az);
  await sky.scrollIntoViewIfNeeded();
  await sky.screenshot({ path: 'scratch/observatory-low-sun.png' });
  expect(errors).toEqual([]);
});

test('steps around the sky from the keyboard and identifies what it lands on', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  await sky.scrollIntoViewIfNeeded();
  const spoken = page.locator('#astronomy-observatory-described');
  const heard: string[] = [];
  const picks: string[] = [];
  await sky.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('n');
    await expect(spoken).toContainText('named objects up now');
    const text = (await spoken.textContent())!;
    if (heard.length) await expect.poll(async () => (await spoken.textContent()) !== heard[heard.length - 1]).toBe(true);
    heard.push(text);
    const picked = (await debug(sky)).picked;
    expect(picked, 'the stepper identifies the object it just centred').toBeTruthy();
    expect(text.startsWith(picked.name), 'the spoken object matches the selected object').toBe(true);
    picks.push(picked.name);
  }
  // Four presses, four different objects, each with its bearing and altitude spoken.
  expect(new Set(heard).size).toBe(4);
  for (const line of heard) expect(line).toMatch(/, -?\d+\u00B0 [NEWS]/);
  expect(new Set(picks).size).toBe(4);
  // Going back returns to the object before it.
  await page.keyboard.press('p');
  await expect.poll(async () => (await spoken.textContent())).toBe(heard[heard.length - 2]);
  // The camera actually turned: the stepper aims before it identifies.
  const before = (await debug(sky)).camera.yaw;
  await page.getByRole('button', { name: 'Next object', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).camera.yaw).not.toBe(before);
  expect(errors).toEqual([]);
});

test('paints the observatory catalogue behind the flat sky map', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  // The +6 h preview must land at night regardless of when this test runs.
  // Fix only Date; animation frames and asset-loading timers remain live.
  await page.clock.setFixedTime(new Date('2026-07-04T21:30:00.000Z'));
  await page.goto(`${base}/__harness`);
  await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'portland', skyHourOffset: 6, bortleClass: 3 }));
  const field = page.locator('[data-sky-layer="catalog-stars"]');
  await expect.poll(async () => Number((await field.getAttribute('data-catalog-stars')) || 0), { timeout: 60000 }).toBeGreaterThan(200);
  const dark = Number((await field.getAttribute('data-catalog-stars'))!);
  expect(await field.locator('circle').count()).toBe(dark);
  // A brighter sky admits fewer stars, on the same limiting magnitude the
  // Observatory uses.
  await page.evaluate(() => (window as any).__destroy?.());
  await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'portland', skyHourOffset: 6, bortleClass: 8 }));
  await expect.poll(async () => Number((await page.locator('[data-sky-layer="catalog-stars"]').getAttribute('data-catalog-stars')) || 0), { timeout: 60000 }).toBeGreaterThan(0);
  const town = Number((await page.locator('[data-sky-layer="catalog-stars"]').getAttribute('data-catalog-stars'))!);
  expect(town).toBeLessThan(dark);
  // The layer button turns it off.
  await page.getByRole('button', { name: 'Catalogue star field', exact: true }).click();
  await expect(page.locator('[data-sky-layer="catalog-stars"]')).toHaveCount(0);
  await expect(page.locator('[data-sky-layer="stars"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('place, hemisphere, daylight and time steps change the computed sky', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const maine = await debug(sky);
  await page.getByLabel('Observing site', { exact: true }).selectOption('sydney');
  await expect.poll(async () => (await debug(sky)).camera.yaw).toBe(0);
  const sydney = await debug(sky);
  // Changing observing site preserves the instant and changes the local sky.
  expect(sydney.utc).toBe(maine.utc);
  expect(Math.abs(sydney.sun.alt - maine.sun.alt)).toBeGreaterThan(5);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  await page.getByLabel('Observing site', { exact: true }).selectOption('portland');
  await page.getByLabel('Local time', { exact: true }).fill('13:00');
  await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(40);
  const noon = await debug(sky);
  expect(noon.limit).toBeLessThanOrEqual(0);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Daylight');
  await sky.screenshot({ path: 'scratch/observatory-daylight.png' });
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
  await sky.screenshot({ path: 'scratch/observatory-arctic-aurora.png' });
  await openSettings(page);
  for (const env of ['coast', 'desert', 'forest', 'lake', 'arctic']) {
    await page.getByLabel('Landscape (representative)', { exact: true }).selectOption(env);
    await expect.poll(async () => (await debug(sky)).env).toContain(env);
    await expect(sky.locator('canvas')).toHaveCount(1);
    const info = await debug(sky);
    expect(info.geometries).toBeLessThanOrEqual(first.geometries + 6);
    if (env === 'coast' || env === 'desert') await sky.screenshot({ path: `scratch/observatory-${env}.png` });
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
  await sky.screenshot({ path: 'scratch/observatory-perseids.png' });
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
  // Play brings the scene into view because rendering pauses offscreen.
  await expect(sky).toBeInViewport({ ratio: 0.5 });
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
  await openSettings(page);
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

test('observing workflow commits and pauses time-lapse when leaving the section', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { ...EVENING, obsRate: '1h' });
  await page.getByRole('button', { name: 'Play time-lapse', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).playMs).toBeGreaterThan(600000);
  const during = await debug(sky);
  await page.getByLabel('Explore a section', { exact: true }).selectOption('skymap');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsPlaying)).toBe(false);
  const reached = await page.evaluate(() => (window as any).__toolData.astronomy.obsUtcMs);
  expect(reached).toBeGreaterThanOrEqual(Date.parse(during.utc));
  await page.getByLabel('Explore a section', { exact: true }).selectOption('observatory');
  await expect.poll(async () => (await debug(sky)).ready).toBe(true);
  expect((await debug(sky)).playing).toBe(false);
  expect((await debug(sky)).utc).toBe(new Date(reached).toISOString());
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

test('click-to-identify names a real star, guides and pole appear, deep-sky glows and the Moon surface load', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  await expect.poll(async () => (await debug(sky)).moonFace).toBe(true);
  const info = await debug(sky);
  expect(info.deepSky).toEqual(expect.arrayContaining(['m45', 'm42']));
  await expect(page.getByRole('button', { name: '🔎 Pleiades (M45)', exact: true })).toBeVisible();
  // Turn toward the brightest named star on screen and click exactly on it.
  expect(info.brightStar).toBeTruthy();
  await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  await sky.scrollIntoViewIfNeeded();
  const spot = (await debug(sky)).spots.star;
  expect(spot).toBeTruthy();
  const box = (await sky.boundingBox())!;
  await page.mouse.click(box.x + spot.x, box.y + spot.y);
  await expect.poll(async () => (await debug(sky)).picked?.name).toBe(info.brightStar.name);
  await expect(page.locator('#astronomy-observatory-picked')).toContainText(info.brightStar.name);
  await expect(page.locator('#astronomy-observatory-picked')).toContainText(/HIP \d+/);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).picked).toBeNull();
  // Guides: ecliptic, equator and the celestial pole at the site latitude.
  await openSettings(page);
  await page.getByRole('button', { name: 'Ecliptic and equator', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).guides).toBe(true);
  await page.getByRole('button', { name: '🔎 Celestial pole', exact: true }).click();
  const north = await debug(sky);
  expect(north.poleVisible).toBe(true);
  expect(Math.abs(north.camera.yaw)).toBeLessThan(1);
  expect(north.labels).toContain('Celestial pole');
  await sky.screenshot({ path: 'scratch/observatory-guides-pole.png' });
  // Enter identifies what sits at the centre of the view (pole marker is not an object, so aim at the Moon if up).
  if (north.moon.alt > 5) {
    await sky.evaluate((el: any, m: any) => el.__observatoryLookAt(m.az, m.alt), north.moon);
    await sky.focus();
    await sky.press('Enter');
    await expect.poll(async () => (await debug(sky)).picked?.kind).toBe('moon');
  }
  expect(errors).toEqual([]);
});

test('jump buttons land on the computed sunset, and the Sky Map hands its place and time to the observatory', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, EVENING);
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const sunsetButton = page.getByRole('button', { name: /^Jump to Sunset \d\d:\d\d$/ });
  const label = (await sunsetButton.getAttribute('aria-label'))!;
  const time = label.match(/(\d\d:\d\d)$/)![1];
  await sunsetButton.click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).toBe(time);
  const atSunset = await debug(sky);
  expect(atSunset.sun.alt).toBeGreaterThan(-1.5);
  expect(atSunset.sun.alt).toBeLessThan(0.3);
  // A Sun on the horizon is seen through tens of airmasses, and is drawn accordingly.
  expect(atSunset.sunExt).toBeGreaterThan(2);
  await sky.screenshot({ path: 'scratch/observatory-sunset.png' });
  // Sky Map → Observatory hand-off.
  await page.evaluate(() => (window as any).__destroy());
  await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'sydney', skyHourOffset: 3 }));
  await page.getByRole('button', { name: 'Open this place and time in the 3D Observatory', exact: true }).click();
  const state = await page.evaluate(() => (window as any).__toolData.astronomy);
  expect(state.tab).toBe('observatory');
  expect(state.obsSite).toBe('sydney');
  expect(state.obsTz).toBe('Australia/Sydney');
  expect(state.obsLive).toBe(false);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  expect(errors).toEqual([]);
});

test('tour steps aim the camera, describe-view names what is in front of it, and picking a pattern star highlights its figure', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1500 });
  const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  // Tour appears once the catalog is cached, with a ★ Find button for the current step.
  await expect(page.locator('#astronomy-observatory-tour')).toContainText(/Tonight's tour · 1 \/ \d/);
  const before = (await debug(sky)).camera;
  await page.getByRole('button', { name: /^🔎 ★ / }).first().click();
  const after = (await debug(sky)).camera;
  expect(after.yaw !== before.yaw || after.pitch !== before.pitch).toBe(true);
  await page.getByRole('button', { name: 'Next ›', exact: true }).click();
  await expect(page.locator('#astronomy-observatory-tour')).toContainText(/· 2 \/ \d/);
  // Describe the view from the tour target.
  await page.getByRole('button', { name: /Describe this view/ }).click();
  const described = page.locator('#astronomy-observatory-described');
  await expect(described).toContainText(/^Facing [NESW]+, \d+° up/);
  await expect(described).toContainText('In view');
  // Identify Betelgeuse by clicking on it: the Orion figure gets highlighted.
  await openSettings(page);
  await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('orion');
  await page.getByRole('button', { name: '🔎 Orion', exact: true }).click();
  await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('');
  await sky.scrollIntoViewIfNeeded();
  const spots = (await debug(sky)).spots.byName;
  const target = ['Betelgeuse', 'Rigel'].find(n => spots[n]);
  expect(target, 'an Orion star on screen').toBeTruthy();
  const box = (await sky.boundingBox())!;
  await page.mouse.click(box.x + spots[target!].x, box.y + spots[target!].y);
  await expect.poll(async () => (await debug(sky)).picked?.name).toBe(target);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('orion');
  await expect(page.locator('#astronomy-observatory-picked')).toContainText('Part of Orion');
  await sky.screenshot({ path: 'scratch/observatory-identify-orion.png' });
  expect(errors).toEqual([]);
});

test('deep time moves the real star field and withholds the solar system', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  await expect.poll(async () => (await debug(sky)).withMotion).toBeGreaterThan(8000);
  await sky.evaluate((el: any) => el.__observatoryLookAt(180, 40));
  const before = await debug(sky);
  expect(before.deepTime).toBe(false);
  expect(before.drift).toBe(0);
  const namedBefore = before.spots.byName;
  expect(Object.keys(namedBefore).length).toBeGreaterThan(2);
  await sky.screenshot({ path: 'scratch/observatory-drift-today.png' });

  await openSettings(page);
  await page.getByLabel(/Deep time: star motion/).fill('100000');
  await expect.poll(async () => (await debug(sky)).drift).toBe(100000);
  const after = await debug(sky);
  expect(after.deepTime).toBe(true);
  // Stars are still there and still bright, but they have moved.
  expect(after.starsUp).toBeGreaterThan(3000);
  const shared = Object.keys(namedBefore).filter(n => after.spots.byName[n]);
  expect(shared.length).toBeGreaterThan(0);
  const moved = shared.map(n => Math.hypot(after.spots.byName[n].x - namedBefore[n].x, after.spots.byName[n].y - namedBefore[n].y));
  expect(Math.max(...moved)).toBeGreaterThan(3);
  // The solar system is withheld at this range rather than drawn wrongly.
  expect(after.planets.every((p: any) => !p.visible)).toBe(true);
  expect(after.labels.some((l: string) => /Moon/.test(l))).toBe(false);
  expect(after.deepSky).toEqual([]);
  // The Moon's glow is painted by the sky shader, so hiding the sprite is not enough.
  expect(before.skyMoonGlow).toBeGreaterThan(0);
  expect(after.skyMoonGlow).toBe(0);
  expect(after.skySunAlt).toBe(-90);
  await expect(page.getByText('Deep-time view')).toBeVisible();
  await expect(page.locator('#astronomy-observatory-tour')).toContainText('The sky in 100,000 years');
  await sky.screenshot({ path: 'scratch/observatory-drift-100k.png' });

  await page.getByRole('button', { name: 'Back to today', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).drift).toBe(0);
  const restored = await debug(sky);
  expect(restored.deepTime).toBe(false);
  const backAgain = shared.map(n => restored.spots.byName[n] ? Math.hypot(restored.spots.byName[n].x - namedBefore[n].x, restored.spots.byName[n].y - namedBefore[n].y) : 0);
  expect(Math.max(...backAgain)).toBeLessThan(1.5);
  expect(errors).toEqual([]);
});

test('star trails draw computed arcs, lengthen with the span, and stay off in daylight', async ({ page }) => {
  const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  expect((await debug(sky)).trails).toBe(false);
  await openSettings(page);
  await page.getByRole('button', { name: 'Star trails', exact: true }).click();
  await expect.poll(async () => (await debug(sky)).trails).toBe(true);
  const four = await debug(sky);
  expect(four.trailHours).toBe(4);
  expect(four.trailStars).toBeGreaterThan(20);
  // Face the pole: the arcs should be visibly concentric there.
  await page.getByRole('button', { name: 'Face north', exact: true }).click();
  await sky.screenshot({ path: 'scratch/observatory-trails-pole.png' });
  await page.getByLabel('Trail length', { exact: true }).selectOption('8');
  await expect.poll(async () => (await debug(sky)).trailHours).toBe(8);
  expect((await debug(sky)).trailStars).toBeGreaterThan(20);
  await sky.evaluate((el: any) => el.__observatoryLookAt(180, 35));
  await sky.screenshot({ path: 'scratch/observatory-trails-south.png' });
  // Daylight washes the trails out along with the stars.
  await page.getByLabel('Local time', { exact: true }).fill('12:00');
  await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  expect((await debug(sky)).trails).toBe(false);
  await expect(page.locator('#astronomy-observatory-summary')).toContainText('Star trails');
  expect(errors).toEqual([]);
});

test('a star picked from the sky reaches the printed plan with its times', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1500 });
  const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  // Identify a real star by clicking it.
  const info = await debug(sky);
  await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  await sky.scrollIntoViewIfNeeded();
  const spot = (await debug(sky)).spots.star;
  const box = (await sky.boundingBox())!;
  await page.mouse.click(box.x + spot.x, box.y + spot.y);
  const name = info.brightStar.name;
  await expect.poll(async () => (await debug(sky)).picked?.name).toBe(name);
  // Save it, and it appears in the tab's list.
  await page.getByRole('button', { name: /Add to tonight's list/ }).click();
  await expect(page.locator('#astronomy-observatory-targets')).toContainText(name);
  await expect(page.getByRole('button', { name: /On tonight's list/ })).toBeVisible();
  const saved = await page.evaluate(() => (window as any).__toolData.astronomy.obsTargets);
  expect(saved).toHaveLength(1);
  expect(saved[0].name).toBe(name);
  expect(Number.isFinite(saved[0].ra)).toBe(true);
  // It survives into the printed kit with a real timetable.
  await page.getByRole('tab', { name: /Print/ }).click();
  const table = page.locator('table[aria-label="My targets tonight"]');
  await expect(table).toContainText(name);
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('#astro-tonight-plan-heading')).toContainText('Portland, Maine');
  await page.screenshot({ path: 'scratch/observatory-print-plan.png', fullPage: false });
  expect(errors).toEqual([]);
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


test('catalog finder selects the exact HIP star with the keyboard and refreshes its details', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const search = page.getByRole('searchbox', { name: 'Find an object', exact: true });
  await search.fill('HIP 32349');
  await expect(page.getByRole('button', { name: 'Select Sirius', exact: true })).toBeVisible();
  await search.press('Enter');
  await expect.poll(async () => (await debug(sky)).picked?.name).toBe('Sirius');
  await expect(page.locator('#astronomy-observatory-described')).toContainText('Centered and selected');
  const selected = await page.evaluate(() => (window as any).__toolData.astronomy.obsPicked);
  expect(selected.hip).toBe(32349);
  expect((await debug(sky)).camera.yaw).toBeCloseTo(selected.az, 3);
  const next = { obsTime: '23:00' };
  await page.evaluate(next => { Object.assign((window as any).__toolData.astronomy, next); (window as any).__bump(); }, next);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsPicked.alt)).not.toBe(selected.alt);
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Select Sirius', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('catalog finder explains hidden targets and stays inside a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsLayers: { stars: false } });
  await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  const camera = (await debug(sky)).camera;
  const search = page.getByRole('searchbox', { name: 'Find an object', exact: true });
  await search.fill('Sirius');
  const sirius = page.getByRole('button', { name: 'Select Sirius', exact: true });
  await expect(sirius).toContainText('Layer is turned off');
  await sirius.click();
  await expect.poll(async () => (await debug(sky)).picked?.name).toBe('Sirius');
  expect((await debug(sky)).camera).toEqual(camera);
  await expect(page.locator('#astronomy-observatory-described')).toContainText('camera stayed in place');
  await search.fill('Canopus');
  const canopus = page.getByRole('button', { name: 'Select Canopus', exact: true });
  await expect(canopus).toContainText('Below the horizon');
  await canopus.click();
  const selected = await page.evaluate(() => (window as any).__toolData.astronomy.obsPicked);
  expect(selected.name).toBe('Canopus');
  expect(selected.alt).toBeLessThan(0);
  expect((await debug(sky)).camera).toEqual(camera);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const row = await canopus.boundingBox();
  expect(row!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('region', { name: 'Find an object', exact: true }).screenshot({ path: 'reports/sky-lab-review-2026-09-27/finder-mobile.png' });
  expect(errors).toEqual([]);
});
