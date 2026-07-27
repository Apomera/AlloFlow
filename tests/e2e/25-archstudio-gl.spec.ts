import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Architecture Studio — REAL WebGL smoke.
 *
 * The tool stores every block as (x, y, z) with a shape, material and
 * rotation — a genuinely 3D model — and then showed it only as a stack of
 * flat floor plans, one grid per storey. A student placed blocks in space
 * and never saw the building.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>archstudio harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:620px;overflow:hidden}</style></head>
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
<script src="/stem_lab/stem_tool_archstudio.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.archStudio || window.StemLab._registry.archstudio;
    window.__toolData = { archStudio: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
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
      setToolData: function () {}, setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
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
    return !!cfg;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloArchGL ? window.__alloArchGL.debug() : null; };
  window.__bucket = function () { return window.__toolData.archStudio; };
  window.__click = function (sel) { var b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  window.__clickLabel = function (re) {
    var b = Array.from(document.querySelectorAll('button'))
      .find(function (el) { return new RegExp(re, 'i').test(el.getAttribute('aria-label') || ''); });
    if (!b) return false; b.click(); return true;
  };
  window.__planCount = function () { return document.querySelectorAll('canvas[data-arch-gl]').length; };
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

/** A 3-storey 2x2 tower plus a wing, in mixed materials. */
function tower() {
  const blocks: Array<Record<string, unknown>> = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 2; x++) {
      for (let z = 0; z < 2; z++) {
        blocks.push({ x, y, z, shape: 'block', material: y === 0 ? 'stone' : 'brick' });
      }
    }
  }
  blocks.push({ x: 3, y: 0, z: 0, shape: 'block', material: 'wood' });
  return blocks;
}

async function mount3d(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ show3d: true }, bucket));
  await page.waitForSelector('canvas[data-arch-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 150_000 });

test.describe('Architecture Studio — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('renders one solid per placed block', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.blockCount).toBe(13);      // 12 tower + 1 wing
    expect(gl.outlineCount).toBe(13);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('the model spans the full extent of the build, including height', async ({ page }) => {
    // The floor plans show one storey at a time, so height was the dimension
    // a student could never see. It has to survive into the scene.
    await mount3d(page, { blocks: tower() });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.extent.h).toBe(3);        // three storeys
    expect(gl.extent.w).toBe(4);        // x spans 0..3 with the wing
    expect(gl.extent.d).toBe(2);
  });

  test('survives materials whose palette colour is a CSS variable', async ({ page }) => {
    // stone, marble and metal are defined as "var(--allo-stem-text, #f1f5f9)"
    // for theming. THREE.Color cannot parse that and throws, which would take
    // the frame loop down, so the 3D layer keeps its own hex table.
    await mount3d(page, {
      blocks: [
        { x: 0, y: 0, z: 0, material: 'stone' },
        { x: 1, y: 0, z: 0, material: 'marble' },
        { x: 2, y: 0, z: 0, material: 'metal' },
        { x: 3, y: 0, z: 0, material: 'glass' }
      ]
    });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.blockCount).toBe(4);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('an empty build does not crash the view', async ({ page }) => {
    await mount3d(page, { blocks: [] });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.blockCount).toBe(0);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('occupies the main viewport, with no spinner left behind', async ({ page }) => {
    // The viewport used to render a spinner gated on a host flag this tool
    // never set, behind which sat a canvas with no ref and no renderer. Both
    // branches were dead, so the primary panel showed nothing, ever.
    await mount3d(page, { blocks: tower() });
    expect(await page.evaluate(() => (window as any).__planCount())).toBe(1);
    expect(await page.evaluate(() => document.body.innerText)).not.toContain('Loading 3D engine');
    // It really is the main viewport, not a thumbnail: the sidebar column this
    // first landed in was 185px, which a building is not readable in.
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.canvas.w).toBeGreaterThan(400);
  });

  test('drag orbits the camera, which the overlay has always claimed', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    const before = await page.evaluate(() => (window as any).__bucket().rot3d);

    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      c.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      c.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 80, r.top + r.height / 2));
      c.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 80, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => (window as any).__bucket().rot3d);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? -38) + 10);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
  });

  test('adding blocks does not remount the canvas', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const c = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
        c.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      });
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__planCount())).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
