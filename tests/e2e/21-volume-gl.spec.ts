import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * 3D Volume Explorer — REAL WebGL smoke.
 *
 * The four jsdom suites around this tool (volume_freeform_builder,
 * stem_volume_accessibility, volume_displacement_lab,
 * volume_predictor_commit_then_check) all run without WebGL, so they exercise
 * only the CSS block layer. Every line of the VolGL renderer — the instanced
 * voxels, the analytic overlay, the cross-section clip plane, the camera
 * mapping and the freeform raycast — is invisible to them.
 *
 * Serves the WORKING TREE on an ephemeral port with React UMD and three r128
 * out of vendor/, so it needs no network. Pattern follows
 * tests/e2e/18-geometry-world-gl.spec.ts.
 *
 * What these pin:
 *   1. The CSS/GL handoff contract: DOM cubes stay queryable while hidden.
 *   2. The instanced stack matches the voxel model exactly (volume is the
 *      whole point of the tool — an off-by-one here is a wrong answer).
 *   3. The analytic overlay appears ONLY where it teaches (not on a prism).
 *   4. The cross-section is a real clip plane, not deleted geometry.
 *   5. Camera presets map onto the shared rotation state.
 *   6. The stable ref does not remount the canvas on re-render.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>volume harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:640px;position:relative;display:block}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { toasts: [], errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });

  // Real host module, not a stub: the tools get makeVoxelBatch from it, so a
  // hand-rolled StemLab would bypass the very code under test (and its two
  // r128 traps). Only the CDN-facing bits are replaced.
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_volume.js"></script>
<script>
  var e = React.createElement;

  // Stateful ctx mirroring the host bridge. The volume tool writes through
  // ctx.setToolData(fn) exclusively, so the functional form is what matters.
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.volume;
    if (!cfg) return false;
    window.__toolData = { _volume: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      setToolData: function (fn) {
        window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
        if (bump) bump();
      },
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function (m, k) { window.__events.toasts.push({ message: String(m), kind: k }); },
      awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, callTTS: null, callImagen: null,
      gradeLevel: '5th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {},
      activeSessionCode: null, studentNickname: 'Tester', isTeacherMode: false
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

  window.__destroy = function () {
    if (window.__root) { window.__root.unmount(); window.__root = null; }
  };

  // ── Probes ──
  window.__gl = function () { return window.__alloVolGL ? window.__alloVolGL.debug() : null; };
  window.__bucket = function () { return window.__toolData._volume; };

  // The CSS/GL contract: cubes present in the DOM, but hidden from sight,
  // hit-testing and the a11y tree whenever GL is live.
  window.__cssLayer = function () {
    var cube = document.querySelector('[data-volume-cube="true"]');
    var stage = cube ? cube.parentElement : null;
    return {
      cubeCount: document.querySelectorAll('[data-volume-cube="true"]').length,
      stageVisibility: stage ? getComputedStyle(stage).visibility : null,
      canvasCount: document.querySelectorAll('canvas[data-volume-gl="true"]').length,
      canvasVisibility: (function () {
        var c = document.querySelector('canvas[data-volume-gl="true"]');
        return c ? getComputedStyle(c).visibility : null;
      })()
    };
  };

  window.__clickBtn = function (attr) {
    var b = document.querySelector('[' + attr + ']');
    if (!b) return false;
    b.click();
    return true;
  };

  // Synthesise the pointerdown/pointerup pair the picker listens for, at a
  // point in canvas-local coordinates.
  window.__pickAt = function (fx, fy) {
    var c = document.querySelector('canvas[data-volume-gl="true"]');
    if (!c) return false;
    var r = c.getBoundingClientRect();
    var x = r.left + r.width * fx, y = r.top + r.height * fy;
    var mk = function (type) {
      return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
    };
    c.dispatchEvent(mk('pointerdown'));
    c.dispatchEvent(mk('pointerup'));
    return true;
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

/** Mount and wait for VolGL to reach 'ready' (ensureThree resolves a microtask
 *  later, then onReady bumps state and the canvas becomes visible). */
async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.volume);
  await page.evaluate((b) => (window as any).__mount(b), bucket);
  await page.waitForSelector('canvas[data-volume-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(
    () => (window as any).__gl()?.state === 'ready',
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(400);   // let the rAF loop apply the first model
}

// SwiftShader is a software rasteriser; mounting plus readback does not fit the
// default 30s budget.
test.describe.configure({ timeout: 150_000 });

test.describe('Volume Explorer — real WebGL', () => {
  // Chromium caps live WebGL contexts per process and silently kills the oldest
  // past the limit; the symptom is not an error but the suite crawling.
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts one live GL canvas with the voxel stack uploaded', async ({ page }) => {
    await mount(page);

    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.canvas.w).toBeGreaterThan(400);
    expect(gl.canvas.h).toBeGreaterThan(200);
    expect(gl.clippingOn).toBe(true);

    // Default slider dims are 3x2x2 -> 12 unit cubes. The instanced stack and
    // the wireframe cage must agree, or the cubes stop being countable.
    expect(gl.instanceCount).toBe(12);
    expect(gl.edgeCount).toBe(12);

    const layer = await page.evaluate(() => (window as any).__cssLayer());
    expect(layer.canvasCount).toBe(1);

    const errs = await page.evaluate(() => (window as any).__events.errors);
    expect(errs).toEqual([]);
  });

  test('CSS cubes stay in the DOM but hidden while GL is live', async ({ page }) => {
    // The contract the four jsdom suites depend on. If the CSS stage were
    // removed (or left visible), either those suites break or the learner can
    // click cubes they cannot see.
    await mount(page);

    const layer = await page.evaluate(() => (window as any).__cssLayer());
    expect(layer.cubeCount).toBe(12);          // still queryable
    expect(layer.stageVisibility).toBe('hidden');
    expect(layer.canvasVisibility).toBe('visible');
  });

  test('toggling to Blocks reveals the CSS stage and hides the canvas', async ({ page }) => {
    await mount(page);
    await page.evaluate(() => (window as any).__clickBtn('data-volume-gl-toggle'));
    await page.waitForTimeout(300);

    const layer = await page.evaluate(() => (window as any).__cssLayer());
    expect(layer.stageVisibility).toBe('visible');
    expect(layer.canvasCount).toBe(0);         // canvas unmounts entirely
    expect(await page.evaluate(() => (window as any).__bucket().glMode)).toBe(false);
  });

  test('the instanced stack tracks the dimensions', async ({ page }) => {
    await mount(page, { dims: { l: 4, w: 3, h: 2 } });
    expect((await page.evaluate(() => (window as any).__gl())).instanceCount).toBe(24);

    await mount(page, { dims: { l: 5, w: 4, h: 3 } });
    expect((await page.evaluate(() => (window as any).__gl())).instanceCount).toBe(60);
  });

  test('the layer slider truncates the stack', async ({ page }) => {
    // 4x3x5 = 60 cubes, but only 2 layers visible -> 24.
    await mount(page, { dims: { l: 4, w: 3, h: 5 }, showLayers: 2 });
    expect((await page.evaluate(() => (window as any).__gl())).instanceCount).toBe(24);
  });

  test('the analytic overlay appears only where it disagrees with the cubes', async ({ page }) => {
    // On a prism the smooth solid IS the cube stack, so drawing it is pure haze.
    await mount(page, { shape: 'prism' });
    expect((await page.evaluate(() => (window as any).__gl())).hasAnalytic).toBe(false);

    // On a cylinder it is the whole point: students see the voxel stack fall
    // short of pi*r^2*h.
    await mount(page, { shape: 'cylinder', dims: { l: 6, w: 6, h: 4 } });
    const cyl = await page.evaluate(() => (window as any).__gl());
    expect(cyl.hasAnalytic).toBe(true);
    expect(cyl.analyticShape).toBe('CylinderGeometry');

    await mount(page, { shape: 'cone', dims: { l: 6, w: 6, h: 4 } });
    expect((await page.evaluate(() => (window as any).__gl())).hasAnalytic).toBe(true);

    await mount(page, { shape: 'pyramid', dims: { l: 6, w: 6, h: 4 } });
    expect((await page.evaluate(() => (window as any).__gl())).hasAnalytic).toBe(true);
  });

  test('the Formula shape button toggles the overlay off and on', async ({ page }) => {
    await mount(page, { shape: 'cylinder', dims: { l: 6, w: 6, h: 4 } });
    expect((await page.evaluate(() => (window as any).__gl())).hasAnalytic).toBe(true);

    await page.evaluate(() => (window as any).__clickBtn('data-volume-analytic-toggle'));
    await page.waitForTimeout(300);
    expect((await page.evaluate(() => (window as any).__gl())).hasAnalytic).toBe(false);
  });

  test('cross-section cuts with a real clip plane, keeping the cubes above it', async ({ page }) => {
    // The CSS path deletes every cube above the cut, so the cut face is never
    // visible. Here the geometry stays and the plane slices it.
    await mount(page, { dims: { l: 4, w: 4, h: 4 } });
    const off = await page.evaluate(() => (window as any).__gl());
    expect(off.instanceCount).toBe(64);
    expect(off.clipConstant).toBeGreaterThan(1000);   // effectively disabled

    await mount(page, { dims: { l: 4, w: 4, h: 4 }, showCrossSection: true, crossSectionLayer: 1 });
    const on = await page.evaluate(() => (window as any).__gl());
    expect(on.instanceCount).toBe(64);                // geometry NOT deleted
    expect(on.clipConstant).toBeCloseTo(1.5, 5);      // mid-layer, not between
  });

  test('camera presets drive the shared rotation state', async ({ page }) => {
    await mount(page, { dims: { l: 4, w: 4, h: 4 } });
    const iso = await page.evaluate(() => (window as any).__gl());

    await page.evaluate(() => (window as any).__clickBtn('data-volume-camera="top"'));
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => (window as any).__gl());

    // Top view: camera almost directly overhead, and clearly higher than iso.
    expect(top.camera.y).toBeGreaterThan(iso.camera.y);
    expect(Math.abs(top.camera.x)).toBeLessThan(0.5);
    expect(Math.abs(top.camera.z)).toBeLessThan(0.5);
  });

  test('freeform: clicking the ground places a block the CSS layer agrees with', async ({ page }) => {
    // Exercises the raycast picker end to end, and proves GL picking writes
    // through the same toggleFreeformCube the CSS layer uses.
    await mount(page, { mode: 'freeform', positions: [], rotation: { x: -90, y: 0 }, scale: 1 });
    expect((await page.evaluate(() => (window as any).__gl())).instanceCount).toBe(0);

    await page.evaluate(() => (window as any).__pickAt(0.5, 0.5));
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => (window as any).__gl());
    expect(after.instanceCount).toBe(1);
    // Same block visible to the CSS/DOM layer the jsdom suites assert on.
    expect((await page.evaluate(() => (window as any).__cssLayer())).cubeCount).toBe(1);
    expect((await page.evaluate(() => (window as any).__bucket().positions)).length).toBe(1);
  });

  test('a drag rotates instead of placing a block', async ({ page }) => {
    // The picker and the rotate-drag share the same pointer stream; only a
    // short, still press may count as a click.
    await mount(page, { mode: 'freeform', positions: [], rotation: { x: -90, y: 0 } });

    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-volume-gl="true"]') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const mk = (type: string, x: number, y: number) =>
        new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      c.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      c.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 60, r.top + r.height / 2 + 40));
    });
    await page.waitForTimeout(300);

    expect((await page.evaluate(() => (window as any).__gl())).instanceCount).toBe(0);
  });

  test('re-renders do not remount the canvas', async ({ page }) => {
    // The inline-callback-ref bug that blanked DNA, Ecosystem and Geometry
    // World: a fresh ref identity each render tears the GL context down.
    await mount(page, { dims: { l: 3, w: 3, h: 3 } });

    for (const h of [4, 5, 6, 5, 4]) {
      await page.evaluate((hh) => {
        (window as any).__toolData = {
          ...(window as any).__toolData,
          _volume: { ...(window as any).__toolData._volume, dims: { l: 3, w: 3, h: hh } }
        };
        document.querySelector('[data-volume-camera="front"]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      }, h);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);

    const layer = await page.evaluate(() => (window as any).__cssLayer());
    expect(layer.canvasCount).toBe(1);                 // never stacked a second one

    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);

    const errs = await page.evaluate(() => (window as any).__events.errors);
    expect(errs).toEqual([]);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page);
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
    expect(await page.evaluate(() => document.querySelectorAll('canvas').length)).toBe(0);
  });
});
