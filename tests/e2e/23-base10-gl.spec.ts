import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Base-ten blocks — REAL WebGL smoke.
 *
 * The CSS path draws every block as a flat div with a repeating-gradient
 * grid, which cannot express the thousand: a cube and a flat both come out as
 * a square with a 10x10 grid, differing only in size and colour. So the one
 * block whose value you are meant to read off its shape is the one the flat
 * renderer cannot draw, while the legend beside it says "Cube = 1000".
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 * Pattern follows tests/e2e/21-volume-gl.spec.ts.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>base10 harness</title>
<style>html,body{margin:0;height:100%;background:#f8fafc}#wrap{width:900px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.relative{position:relative}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab = {
    _registry: {}, _order: [],
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return Promise.resolve(window.THREE); },
    getRegisteredTools: function () { return []; }
  };
</script>
<script src="/stem_lab/stem_tool_manipulatives.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.base10;
    window.__toolData = { _manipulatives: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      setToolData: function (fn) {
        window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
        if (bump) bump();
      },
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function () {}, celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '3rd Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {}
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return true;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloB10GL ? window.__alloB10GL.debug() : null; };
  window.__bucket = function () { return window.__toolData._manipulatives; };
  window.__click = function (sel) { var b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  window.__clickLabel = function (re) {
    var b = Array.from(document.querySelectorAll('button'))
      .find(function (el) { return new RegExp(re, 'i').test(el.getAttribute('aria-label') || ''); });
    if (!b) return false; b.click(); return true;
  };
  // The flat CSS blocks must remain in the DOM as the guaranteed floor.
  window.__flatBlocks = function () {
    var row = document.querySelector('[style*="min-height: 60px"], [style*="minHeight"]');
    return { canvases: document.querySelectorAll('canvas[data-b10-gl]').length, flatRowPresent: !!row };
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
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type Pg = import('@playwright/test').Page;

async function mount(page: Pg, bucket: Record<string, unknown>) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.base10);
  await page.evaluate((b) => (window as any).__mount(b), bucket);
}

async function mountSolid(page: Pg, b10: Record<string, number>) {
  await mount(page, { b10, b10Solid: true });
  await page.waitForSelector('canvas[data-b10-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(350);
}

test.describe.configure({ timeout: 150_000 });

test.describe('Base-ten blocks — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('every block is built from as many unit cubes as it is worth', async ({ page }) => {
    // The claim the whole view rests on. If a thousand block were a labelled
    // box rather than 1000 cubes, this is the assertion that would catch it.
    const cases: Array<[Record<string, number>, number]> = [
      [{ thousands: 0, hundreds: 0, tens: 0, ones: 7 }, 7],
      [{ thousands: 0, hundreds: 0, tens: 4, ones: 0 }, 40],
      [{ thousands: 0, hundreds: 3, tens: 0, ones: 0 }, 300],
      [{ thousands: 1, hundreds: 0, tens: 0, ones: 0 }, 1000],
      [{ thousands: 1, hundreds: 2, tens: 3, ones: 4 }, 1234],
      [{ thousands: 9, hundreds: 9, tens: 9, ones: 9 }, 9999],
    ];
    for (const [b10, expected] of cases) {
      await mountSolid(page, b10);
      const gl = await page.evaluate(() => (window as any).__gl());
      expect(gl.cubeCount, `value ${expected}`).toBe(expected);
      expect(gl.edgeCount, `outlines for ${expected}`).toBe(expected);
      expect(gl.contextLost).toBe(false);
      await page.evaluate(() => (window as any).__destroy());
    }
  });

  test('a thousand is ten flats thick, and a flat is one cube thick', async ({ page }) => {
    // The distinction the flat renderer cannot draw: both come out as a
    // square with a 10x10 grid. Here they differ in the third dimension.
    // Asserts on `extent` (true content size), not `bounds`, which carries
    // minimums so the camera does not crash in on a single unit cube.
    await mountSolid(page, { thousands: 1, hundreds: 0, tens: 0, ones: 0 });
    const cube = await page.evaluate(() => (window as any).__gl().extent);
    expect(cube.h).toBe(10);        // ten unit cubes tall
    expect(cube.d).toBe(10);        // ...and ten deep: a cube, not a slab

    await page.evaluate(() => (window as any).__destroy());
    await mountSolid(page, { thousands: 0, hundreds: 1, tens: 0, ones: 0 });
    const flat = await page.evaluate(() => (window as any).__gl().extent);
    expect(flat.h).toBe(1);         // one unit cube thick
    expect(flat.d).toBe(10);        // but still ten across

    // The cube is exactly ten flats: same footprint, ten times the thickness.
    expect(cube.d).toBe(flat.d);
    expect(cube.h / flat.h).toBe(10);
  });

  test('the flat CSS blocks stay in the DOM as the floor', async ({ page }) => {
    await mountSolid(page, { thousands: 1, hundreds: 1, tens: 1, ones: 1 });
    const layer = await page.evaluate(() => (window as any).__flatBlocks());
    expect(layer.canvases).toBe(1);
    expect(layer.flatRowPresent).toBe(true);
  });

  test('defaults to flat blocks and only builds GL on request', async ({ page }) => {
    await mount(page, { b10: { thousands: 1, hundreds: 0, tens: 0, ones: 0 } });
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-b10-gl]').length)).toBe(0);

    await page.evaluate(() => (window as any).__click('[data-b10-view]'));
    await page.waitForSelector('canvas[data-b10-gl="true"]', { timeout: 30000 });
    expect(await page.evaluate(() => (window as any).__bucket().b10Solid)).toBe(true);
  });

  test('rotate buttons move the camera without a mouse', async ({ page }) => {
    await mountSolid(page, { thousands: 1, hundreds: 2, tens: 0, ones: 0 });
    const before = await page.evaluate(() => (window as any).__gl().camera);
    await page.evaluate(() => (window as any).__clickLabel('Turn left'));
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__gl().camera);
    expect(Math.abs(after.x - before.x) + Math.abs(after.z - before.z)).toBeGreaterThan(1);
  });

  test('changing the count does not remount the canvas', async ({ page }) => {
    // The board is driven by +/- buttons, so an inline ref would rebuild the
    // scene on every click.
    await mountSolid(page, { thousands: 1, hundreds: 1, tens: 1, ones: 1 });
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => (window as any).__clickLabel('^Add$'));
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-b10-gl]').length)).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mountSolid(page, { thousands: 1, hundreds: 0, tens: 0, ones: 0 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
