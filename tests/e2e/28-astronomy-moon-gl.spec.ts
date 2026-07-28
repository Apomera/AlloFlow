import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Night Sky & Astronomy, moon tab — REAL WebGL smoke.
 *
 * The tab drew the Moon's disc AS SEEN FROM EARTH and nothing else, while its
 * own prose claimed three things only the geometry can show: that phases come
 * from the Moon orbiting Earth, that tidal locking keeps one face toward us,
 * and that the far side is "NOT the dark side" and gets just as much sunlight.
 * The tool's own quiz lists "Earth's shadow on the Moon" as the wrong answer
 * for what causes phases — the exact misconception a disc-only view leaves in
 * place, since the student never sees where the shadow actually is.
 *
 * These tests pin the geometry, not the picture: the Moon is half lit at every
 * phase including New, and Earth's shadow misses it unless the line of nodes
 * points at the Sun.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>astronomy harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:900px}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_astronomy.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.astronomy;
    window.__toolData = { astronomy: Object.assign({ tab: 'moon' }, bucket || {}) };
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
        window.__toolData[b] = Object.assign({}, window.__toolData[b]); window.__toolData[b][k] = v;
        if (bump) bump();
      },
      updateMulti: function (b, patch) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b], patch); if (bump) bump();
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
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloAstroMoonGL ? window.__alloAstroMoonGL.debug() : null; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.astronomy = Object.assign({}, window.__toolData.astronomy, patch);
    window.__bump && window.__bump();
  };
  window.__bucket = function () { return window.__toolData.astronomy; };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-astro-moon-gl]').length; };
  window.__text = function () { return document.body.innerText; };
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
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type Pg = import('@playwright/test').Page;

// MOON_PHASES indices: 0 new, 2 first quarter, 4 full, 6 last quarter.
const NEW = 0, FIRST_Q = 2, FULL = 4;

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.astronomy);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'moon' }, bucket));
  await page.waitForSelector('canvas[data-astro-moon-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 180_000 });

test.describe('Astronomy moon geometry — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts the Sun-Earth-Moon geometry', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FIRST_Q });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.nearFaceLocked).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('★ New Moon puts the Moon between Earth and Sun, not in shadow', async ({ page }) => {
    // The misconception the quiz names: students think New Moon is Earth's
    // shadow. It is not — the Moon is on the SUNWARD side, nowhere near it.
    await mount(page, { moonPhaseIdx: NEW });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.moonPos.x).toBeGreaterThan(6);   // sunward (+X), between us and the Sun
    expect(gl.inShadow).toBe(false);
    // And essentially none of the lit half faces us.
    expect(gl.litFractionSeen).toBeLessThan(0.02);
  });

  test('★ Full Moon is opposite the Sun and still misses the shadow', async ({ page }) => {
    // Why there is not a lunar eclipse every month. With the nodes tilted away
    // the Moon rides clear of the umbra even at Full.
    await mount(page, { moonPhaseIdx: FULL, moonNodeDeg: 72 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.moonPos.x).toBeLessThan(-6);     // anti-sunward
    expect(gl.litFractionSeen).toBeGreaterThan(0.98);
    expect(gl.inShadow).toBe(false);
    expect(Math.abs(gl.moonY)).toBeGreaterThan(0.1);   // genuinely off the ecliptic
  });

  test('★ pointing the nodes at the Sun produces the eclipse', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FULL, moonNodeDeg: 72 });
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(false);
    await page.evaluate(() => (window as any).__set({ moonNodeDeg: 0 }));
    await page.waitForTimeout(450);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.inShadow).toBe(true);
    expect(Math.abs(gl.moonY)).toBeLessThan(0.01);     // on the node, in the ecliptic
    // And the test is against the cone's width WHERE THE MOON IS, not Earth's
    // radius at the near end — the umbra converges.
    expect(gl.shadowMissRadii).toBeLessThan(gl.umbraRadiusAtMoon);
    expect(gl.umbraRadiusAtMoon).toBeGreaterThan(0.2);
    expect(gl.umbraRadiusAtMoon).toBeLessThan(0.5);
  });

  test('★ eclipses happen in a SEASON, not only at one exact angle', async ({ page }) => {
    // The node line sweeps slowly; eclipses are possible for a window of
    // alignments, not a single instant. A model that only ever eclipsed at
    // exactly 0 would teach that wrong.
    await mount(page, { moonPhaseIdx: FULL, moonNodeDeg: 20 });
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(true);
    await page.evaluate(() => (window as any).__set({ moonNodeDeg: 60 }));
    await page.waitForTimeout(450);
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(false);
  });

  test('★ the lit fraction follows the geometry, not a lookup table', async ({ page }) => {
    // First Quarter must be half lit as SEEN, by the elongation relation, with
    // no phase painted by hand anywhere.
    await mount(page, { moonPhaseIdx: FIRST_Q });
    const q = await page.evaluate(() => (window as any).__gl().litFractionSeen);
    expect(q).toBeGreaterThan(0.45);
    expect(q).toBeLessThan(0.55);
  });

  test('the orbit really is inclined, so most months are not eclipse months', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FULL, moonNodeDeg: 90 });
    const gl = await page.evaluate(() => (window as any).__gl());
    // 7.2 * sin(5.145 deg) = 0.646 Earth radii off the ecliptic at maximum.
    expect(Math.abs(gl.moonY)).toBeGreaterThan(0.6);
    expect(gl.inShadow).toBe(false);
  });

  test('the phase disc survives as the guaranteed floor', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FIRST_Q });
    expect(await page.evaluate(() => document.querySelectorAll('svg').length)).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FIRST_Q });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
  });

  test('drag orbits the camera', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FIRST_Q });
    const before = await page.evaluate(() => (window as any).__bucket().moonRot);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-astro-moon-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().moonRot);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 18) + 10);
  });

  test('stepping through the cycle does not remount the canvas', async ({ page }) => {
    await mount(page, { moonPhaseIdx: NEW });
    for (const i of [1, 2, 3, 4, 5]) {
      await page.evaluate((v) => (window as any).__set({ moonPhaseIdx: v }), i);
      await page.waitForTimeout(160);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { moonPhaseIdx: FIRST_Q });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
