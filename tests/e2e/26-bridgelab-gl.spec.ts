import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Bridge Engineering Lab — REAL WebGL smoke.
 *
 * The lab runs a method-of-joints solver and an Euler buckling check, then drew
 * the result as a single-plane side elevation. When the buckling margin got
 * thin it told the student to "add lateral bracing" and "shorten the unbraced
 * length" — about the one axis the elevation has no room for, and with no
 * control that could do either. These tests pin both halves of the fix: the
 * second truss plane and its bracing are really drawn, and the bracing really
 * feeds the buckling calculation.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>bridgelab harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:1400px;overflow:hidden}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_bridgelab.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.bridgeLab;
    window.__toolData = { bridgeLab: Object.assign({}, bucket || {}) };
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
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '8th Grade', toolSnapshots: [], props: {},
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
  window.__gl = function () { return window.__alloBridgeGL ? window.__alloBridgeGL.debug() : null; };
  window.__bucket = function () { return window.__toolData.bridgeLab; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.bridgeLab = Object.assign({}, window.__toolData.bridgeLab, patch);
    window.__render();
  };
  window.__render = function () { window.__bump && window.__bump(); };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-bridge-gl]').length; };
  window.__svgCount = function () { return document.querySelectorAll('svg').length; };
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

type Pg = import('@playwright/test').Page;

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.bridgeLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'build' }, bucket));
  await page.waitForSelector('canvas[data-bridge-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 180_000 });

test.describe('Bridge Lab — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('draws BOTH truss planes, not the one the elevation showed', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4, trussStyle: 'warren' });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.trussPlanes).toBe(2);
    // Warren, 4 bays: 4 bottom chord + 3 top chord + 8 diagonals = 15 members,
    // doubled across the two planes.
    expect(gl.memberCount).toBe(30);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('has a deck and spans the real width of the bridge', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.deckPresent).toBe(true);
    expect(gl.extent.w).toBe(30);
    expect(gl.extent.h).toBe(6);
    expect(gl.extent.d).toBeGreaterThan(4);   // two planes, a walkable deck between
  });

  test('bracing slider changes how much bracing is drawn', async ({ page }) => {
    await mount(page, { span: 40, height: 5, nBays: 6, lateralBraceEvery: 1 });
    const tight = await page.evaluate(() => (window as any).__gl().braceCount);
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 3 }));
    await page.waitForTimeout(500);
    const loose = await page.evaluate(() => (window as any).__gl().braceCount);
    expect(tight).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(0);
  });

  test('★ removing bracing really fails the buckling check', async ({ page }) => {
    // This is the point of the whole change. The tool told students to "add
    // lateral bracing"; until now nothing in the model could hear them.
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    const braced = await page.evaluate(() => (window as any).__text());

    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const unbraced = await page.evaluate(() => (window as any).__text());

    expect(braced).not.toContain('BUCKLING FAILURE');
    expect(unbraced).toContain('BUCKLING FAILURE');
    // And it must say WHICH way it is buckling — the sideways mode is the one
    // the elevation could never show.
    expect(unbraced).toContain('buckling SIDEWAYS');
  });

  test('★ the default braces every panel, preserving the previous numbers', async ({ page }) => {
    // Back-compat. With bracing at every joint the out-of-plane length equals
    // the in-plane length, so the Euler check is arithmetically unchanged from
    // before this feature existed and a saved design cannot silently start
    // failing. The tell is the "SIDEWAYS" wording: it appears only when the
    // governing length came from brace spacing rather than the member itself.
    //
    // Note this design DOES buckle, and did before this change too — the stock
    // 30 m / 5000 mm² starting point is deliberately under-built so students
    // have something to fix. What must not change is WHY it buckles.
    // Mounted with NO lateralBraceEvery key at all — the back-compat case, a
    // design saved before this feature existed.
    await mount(page, { span: 30, height: 6, nBays: 4, crossSectionMm2: 5000 });
    expect(await page.evaluate(() => (window as any).__bucket().lateralBraceEvery)).toBeUndefined();
    const txt = await page.evaluate(() => (window as any).__text());
    expect(txt).not.toContain('buckling SIDEWAYS');
    // It buckles, but in-plane — i.e. governed by the member's own length, which
    // is exactly what the pre-change code computed.
    expect(await page.evaluate(() => (window as any).__gl().bowedAxis)).toBe('in-plane');
  });

  test('the failed member is drawn bowed, and only when it fails', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    expect(await page.evaluate(() => (window as any).__gl().bowedMember)).toBeNull();
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.bowedMember).toBeTruthy();
    expect(String(gl.bowedMember)).toMatch(/^TC/);   // a top chord, as the physics says
    // And it bows the way it actually failed, not just some way.
    expect(gl.bowedAxis).toBe('out-of-plane');
  });

  test('the elevation survives underneath as the guaranteed floor', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    // Hidden with visibility, never removed — exports and DOM queries still work.
    expect(await page.evaluate(() => (window as any).__svgCount())).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    // The viewer status flips asynchronously, long after the render that mounted
    // it. Nothing in React was watching, so the overlay sat on top of a working
    // canvas — a dead overlay that every other test in this file would pass
    // straight through, because the scene underneath was genuinely fine.
    await mount(page, { span: 30, height: 6, nBays: 4 });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
    // And the affordance it replaces is really offered.
    expect(await page.evaluate(() => (window as any).__text())).toContain('Drag');
  });

  test('every truss style builds without throwing', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, trussStyle: 'warren' });
    for (const style of ['pratt', 'howe', 'ktruss', 'warren']) {
      await page.evaluate((s) => (window as any).__set({ trussStyle: s }), style);
      await page.waitForTimeout(350);
      const gl = await page.evaluate(() => (window as any).__gl());
      expect(gl.state, `style ${style}`).toBe('ready');
      expect(gl.contextLost, `style ${style}`).toBe(false);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drag orbits the camera, which the overlay claims', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const before = await page.evaluate(() => (window as any).__bucket().rot3d);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-bridge-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().rot3d);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 26) + 10);
  });

  test('changing the span does not remount the canvas', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    for (const span of [36, 44, 52]) {
      await page.evaluate((s) => (window as any).__set({ span: s }), span);
      await page.waitForTimeout(200);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.extent.w).toBe(52);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
