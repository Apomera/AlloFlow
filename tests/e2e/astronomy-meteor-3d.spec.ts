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

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.describe.configure({ timeout: 90000 });
async function mountMeteors(page, state = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}/__harness`);
  await page.evaluate(state => (window as any).__mount({ tab: 'meteors', ...state }), state);
  const sky = page.locator('#astronomy-meteor-3d');
  await sky.scrollIntoViewIfNeeded();
  await expect.poll(() => sky.evaluate((el: any) => !!el.__meteorDebug?.().ready)).toBe(true);
  return { sky, errors };
}
test.afterEach(async ({ page }) => {
  await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
});

test('3D uses local Three.js and preserves conditions and formations across 2D comparisons', async ({ page }) => {
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  const { sky, errors } = await mountMeteors(page, { simBortleSim: 2, simZhr: 180 });
  await page.getByLabel('Constellation guide', { exact: true }).selectOption('orion');
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().pattern)).toBe('orion');
  const rate = await page.locator('#astronomy-meteor-rate-status').textContent();
  const before = await sky.evaluate((el: any) => el.__meteorDebug());
  expect(before.guideStars).toBe(7);
  expect(requests.some(url => url.includes('/vendor/three-r128/three.min.js'))).toBe(true);
  expect(requests.some(url => /cdnjs|jsdelivr|unpkg/.test(url))).toBe(false);
  await page.getByRole('button', { name: '2D diagram', exact: true }).click();
  await expect(sky).toHaveCount(0);
  await expect(page.locator('[data-meteor-constellation="orion"] [data-guide-star]')).toHaveCount(7);
  await expect(page.locator('#astronomy-meteor-rate-status')).toHaveText(rate);
  await page.getByRole('button', { name: '3D immersive sky', exact: true }).click();
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug?.().pattern)).toBe('orion');
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).count).toBe(before.count);
  expect(errors).toEqual([]);
});

test('all 15 patterns render without accumulating geometries or canvases', async ({ page }) => {
  const { sky, errors } = await mountMeteors(page);
  const patterns = await page.evaluate(() => Object.entries((window as any).__alloAstroPure.constellationPatterns).map(([id,p]: any) => [id,p.stars.length]));
  for (const [id,count] of patterns) {
    await page.getByLabel('Constellation guide', { exact: true }).selectOption(id);
    await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().pattern)).toBe(id);
    const info = await sky.evaluate((el: any) => el.__meteorDebug());
    expect(info.guideStars).toBe(count);
    expect(info.geometries).toBeLessThanOrEqual(42);
    await expect(sky.locator('canvas')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('playback advances without rerendering tool state, pauses, steps, and disposes on navigation', async ({ page }) => {
  const { sky, errors } = await mountMeteors(page);
  await page.getByRole('button', { name: 'Play meteor simulation', exact: true }).click();
  await sky.scrollIntoViewIfNeeded();
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().elapsed)).toBeGreaterThan(.05);
  expect(await page.evaluate(() => (window as any).__toolData.astronomy.simMeteorFrame)).toBeUndefined();
  await page.getByRole('button', { name: 'Pause meteor simulation', exact: true }).click();
  const paused = await sky.evaluate((el: any) => el.__meteorDebug());
  await page.waitForTimeout(150);
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).elapsed).toBe(paused.elapsed);
  expect(paused.raf).toBe(false);
  await page.getByRole('button', { name: 'Advance one frame', exact: true }).click();
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().sample)).toBe(1);
  await page.evaluate(() => { (window as any).__oldSky = document.getElementById('astronomy-meteor-3d'); });
  await page.getByRole('tab', { name: /Constellations/ }).click();
  expect(await page.evaluate(() => !!(window as any).__oldSky.__meteorDebug)).toBe(false);
  await expect(page.locator('#astronomy-meteor-3d')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('keyboard, pointer and button camera controls work at 320px without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const { sky, errors } = await mountMeteors(page);
  await sky.focus();
  await sky.press('ArrowRight');
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).camera.yaw).toBe(5);
  await sky.press('Home');
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).camera.yaw).toBe(0);
  const box = await sky.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .55, { steps: 4 });
  await page.mouse.up();
  expect(Math.abs((await sky.evaluate((el: any) => el.__meteorDebug())).camera.yaw)).toBeGreaterThan(5);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).camera.zoom).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Center radiant', exact: true }).click();
  expect((await sky.evaluate((el: any) => el.__meteorDebug())).camera.zoom).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
});

test('reduced motion keeps a still sky and allows deliberate stepping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sky, errors } = await mountMeteors(page, { simMeteorPlaying: true });
  await expect(page.getByRole('button', { name: 'Pause meteor simulation', exact: true })).toBeDisabled();
  const state = await sky.evaluate((el: any) => el.__meteorDebug());
  expect(state.elapsed).toBe(0);
  expect(state.raf).toBe(false);
  await page.getByRole('button', { name: 'Advance one frame', exact: true }).click();
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().sample)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Play meteor simulation', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play meteor simulation', exact: true }).click();
  await sky.scrollIntoViewIfNeeded();
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().elapsed)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => sky.evaluate((el: any) => el.__meteorDebug().raf)).toBe(false);
  expect(errors).toEqual([]);
});

test('failed engine load leaves the 2D simulator usable and Retry recovers', async ({ page }) => {
  await page.goto(`${base}/__harness`);
  await page.evaluate(() => {
    (window as any).__originalEnsure = (window as any).StemLab.ensureThree;
    (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Unavailable GPU'));
    (window as any).__mount({tab:'meteors'});
  });
  await expect(page.getByText('The 3D sky could not start.', { exact:false })).toBeVisible();
  await page.getByRole('button', { name: '2D diagram', exact:true }).click();
  await expect(page.getByRole('img', { name:/Perseids meteor shower diagram/ })).toBeVisible();
  await page.getByRole('button', { name: '3D immersive sky', exact:true }).click();
  await expect(page.getByRole('button', { name:'Retry 3D sky', exact:true })).toBeVisible();
  await page.evaluate(() => { (window as any).StemLab.ensureThree = (window as any).__originalEnsure; });
  await page.getByRole('button', { name:'Retry 3D sky', exact:true }).click();
  await expect.poll(() => page.locator('#astronomy-meteor-3d').evaluate((el:any) => !!el.__meteorDebug?.().ready)).toBe(true);
});

test('context loss stops animation and Retry creates one fresh renderer', async ({ page }) => {
  const { sky } = await mountMeteors(page);
  await sky.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    (canvas.getContext('webgl2') || canvas.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();
  });
  await expect(page.getByRole('button', { name:'Retry 3D sky', exact:true })).toBeVisible();
  await page.getByRole('button', { name:'Retry 3D sky', exact:true }).click();
  await expect.poll(() => sky.evaluate((el:any) => !!el.__meteorDebug?.().ready)).toBe(true);
  await expect(sky.locator('canvas')).toHaveCount(1);
});

test('poor conditions produce zero trails, and resetting restores shower defaults', async ({ page }) => {
  const { sky, errors } = await mountMeteors(page,{selectedShower:'ursids',simZhr:5,simBortleSim:9,simRadiantAlt:5});
  expect((await sky.evaluate((el:any)=>el.__meteorDebug())).count).toBe(0);
  await expect(page.locator('#astronomy-meteor-rate-status')).toContainText('0 /hr');
  await page.getByRole('button',{name:'🌠 Geminids',exact:true}).click();
  await page.getByRole('button',{name:'Reset meteor simulation conditions',exact:true}).click();
  await expect(page.locator('#astr-sim-zhr')).toHaveValue('150');
  await expect(page.locator('#astr-sim-bortle')).toHaveValue('4');
  await expect(page.locator('#astr-sim-alt')).toHaveValue('60');
  await expect.poll(()=>sky.evaluate((el:any)=>el.__meteorDebug().count)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a late rejected loader cannot disconnect a newer sky renderer', async ({ page }) => {
  await page.goto(`${base}/__harness`);
  await page.evaluate(() => {
    const app = (window as any).StemLab;
    const original = app.ensureThree.bind(app);
    let first = true;
    app.ensureThree = options => {
      if (first) { first = false; return new Promise((resolve, reject) => { (window as any).__rejectOld = reject; }); }
      return original(options);
    };
    (window as any).__mount({tab:'meteors'});
  });
  await page.waitForFunction(() => !!(window as any).__rejectOld);
  await page.getByRole('button',{name:'2D diagram',exact:true}).click();
  await page.getByRole('button',{name:'3D immersive sky',exact:true}).click();
  const sky = page.locator('#astronomy-meteor-3d');
  await expect.poll(() => sky.evaluate((el:any)=>!!el.__meteorDebug?.().ready)).toBe(true);
  await page.evaluate(()=>(window as any).__rejectOld(new Error('Old request failed')));
  await page.getByRole('button',{name:'Look right',exact:true}).click();
  expect((await sky.evaluate((el:any)=>el.__meteorDebug())).camera.yaw).toBe(12);
});

test('2D playback stops updating after leaving the meteor section', async ({ page }) => {
  await page.goto(`${base}/__harness`);
  await page.evaluate(() => (window as any).__mount({tab:'meteors',simMeteorView:'2d',simMeteorFrame:1001.9}));
  await page.getByRole('button',{name:'Play meteor simulation',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.astronomy.simMeteorFrame)).toBeLessThan(10);
  await page.getByRole('tab',{name:/Constellations/}).click();
  const frame = await page.evaluate(()=>(window as any).__toolData.astronomy.simMeteorFrame);
  await page.waitForTimeout(950);
  expect(await page.evaluate(()=>(window as any).__toolData.astronomy.simMeteorFrame)).toBe(frame);
});
