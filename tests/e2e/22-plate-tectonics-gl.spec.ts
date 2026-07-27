import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Plate Boundary Simulator — REAL WebGL smoke.
 *
 * The two jsdom suites (plate_tectonics_boundary_evidence,
 * plate_tectonics_responsive_canvas) run without WebGL, so the whole 3D block
 * — plate geometry per mode, the descending slab, the Wadati-Benioff foci and
 * the along-strike clip plane — is invisible to them.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/, so no
 * network. Pattern follows tests/e2e/21-volume-gl.spec.ts.
 *
 * What these pin:
 *   1. Earthquake foci lie ON the slab (depth correlates with distance from
 *      the trench). Before this they were placed at random x, so the dipping
 *      plane the widget claims to teach did not exist in the data at all.
 *   2. The block geometry actually changes with boundary mode — a slab only
 *      for convergent, a ridge for divergent, along-strike offset for
 *      transform.
 *   3. The 2D section stays mounted and queryable while the block is live.
 *   4. The cutaway drives a real clip plane.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>tectonics harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:900px;height:620px}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab = {
    _registry: {}, _order: [],
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return Promise.resolve(window.THREE); },
    getRegisteredTools: function () { return Object.values(this._registry); }
  };
</script>
<script src="/stem_lab/stem_tool_platetectonics.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function () {
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(window.AlloTectonicsInteractive, {
      darkMode: true, isContrast: false,
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      addToast: function () {}
    }));
    return true;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };

  window.__gl = function () { return window.__alloTectGL ? window.__alloTectGL.debug() : null; };

  window.__click = function (sel) {
    var b = document.querySelector(sel);
    if (!b) return false;
    b.click();
    return true;
  };
  window.__setCut = function (pct) {
    var i = document.getElementById('tect-cut');
    if (!i) return false;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, String(pct));
    i.dispatchEvent(new Event('input', { bubbles: true }));
    i.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  // Pick the boundary-type button by its visible label.
  window.__setMode = function (name) {
    var b = Array.from(document.querySelectorAll('button'))
      .find(function (el) { return new RegExp(name, 'i').test(el.textContent || ''); });
    if (!b) return false;
    b.click();
    return true;
  };
  // Foci live ~3s, so only 2-3 exist at once. Sample over time and keep the
  // distinct ones to build up a population big enough to fit a plane to.
  window.__watchSlab = function () {
    if (window.__slabTimer) return true;
    window.__slabSeen = {};
    window.__slabTimer = setInterval(function () {
      var g = window.__gl();
      if (!g || g.state !== 'ready' || !g.slabSample) return;
      g.slabSample.forEach(function (q) {
        window.__slabSeen[q.depthKm.toFixed(4) + ':' + q.distKm.toFixed(4)] = q;
      });
    }, 120);
    return true;
  };
  window.__slabStats = function () { return Object.values(window.__slabSeen || {}); };

  window.__sectionCanvas = function () {
    var c = document.querySelector('canvas[role="img"]:not([data-tect-gl])');
    if (!c) return null;
    return { present: true, visibility: getComputedStyle(c).visibility };
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

async function mount(page: Pg) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).AlloTectonicsInteractive);
  await page.evaluate(() => (window as any).__mount());
  await page.waitForSelector('[data-tect-view="3d"]', { timeout: 30000 });
}

/** Switch to the block view and wait for the renderer to come up. */
async function show3d(page: Pg) {
  await page.evaluate(() => (window as any).__click('[data-tect-view="3d"]'));
  await page.waitForSelector('canvas[data-tect-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(500);
}

test.describe.configure({ timeout: 150_000 });

test.describe('Plate Boundary Simulator — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('defaults to the 2D section and only builds GL on request', async ({ page }) => {
    await mount(page);
    // The block is opt-in: unlike Volume, 3D does not strictly dominate here.
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-tect-gl]').length)).toBe(0);
    expect((await page.evaluate(() => (window as any).__sectionCanvas())).visibility).toBe('visible');
  });

  test('mounts one live GL canvas with the convergent block built', async ({ page }) => {
    await mount(page);
    await show3d(page);

    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.canvas.w).toBeGreaterThan(200);

    // Convergent: overriding + subducting plate, plus a descending slab.
    expect(gl.plateCount).toBe(2);
    expect(gl.hasSlab).toBe(true);
    expect(gl.slabDipDeg).toBe(45);

    const errs = await page.evaluate(() => (window as any).__events.errors);
    expect(errs).toEqual([]);
  });

  test('the 2D section stays mounted and queryable behind the block', async ({ page }) => {
    await mount(page);
    await show3d(page);
    const sec = await page.evaluate(() => (window as any).__sectionCanvas());
    expect(sec.present).toBe(true);       // never unmounted
    expect(sec.visibility).toBe('hidden');
  });

  test('earthquake foci lie on the slab, not scattered', async ({ page }) => {
    // The core correctness fix, and the reason the 3D view earns its place.
    // Every convergent focus must sit on the descending slab, so its distance
    // from the trench is predicted by its depth to within the seismogenic
    // layer thickness (+/- 11 km). Before this, x was drawn from a fixed
    // random band independent of depth, so residuals ran to hundreds of km
    // and the dipping plane simply was not in the data.
    await mount(page);
    await show3d(page);
    expect(await page.evaluate(() => (window as any).__gl().mode)).toBe('convergent');

    await page.evaluate(() => (window as any).__watchSlab());
    await page.waitForFunction(
      () => ((window as any).__slabStats() || []).length >= 12,
      null,
      { timeout: 90000 }
    );
    const foci: Array<{ depthKm: number; distKm: number }> =
      await page.evaluate(() => (window as any).__slabStats());

    expect(foci.length).toBeGreaterThanOrEqual(12);

    // Every focus sits on the slab surface to within the seismogenic layer
    // half-thickness. tan(45 deg) == 1, so the predicted distance IS the depth.
    const residuals = foci.map((q) => Math.abs(q.distKm - q.depthKm));
    expect(Math.max(...residuals)).toBeLessThanOrEqual(11.001);

    // ...and the population must actually span depth, or a shallow cluster
    // would satisfy the residual check without showing any dip at all.
    const depths = foci.map((q) => q.depthKm);
    expect(Math.max(...depths)).toBeGreaterThan(200);

    // The relationship is the point: deeper foci sit further from the trench.
    // Pearson r over the sample should be essentially 1 for a planar slab.
    const n = foci.length;
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const md = mean(depths), mx = mean(foci.map((q) => q.distKm));
    let num = 0, dd = 0, dx = 0;
    for (let i = 0; i < n; i++) {
      const a = depths[i] - md, b = foci[i].distKm - mx;
      num += a * b; dd += a * a; dx += b * b;
    }
    expect(num / Math.sqrt(dd * dx)).toBeGreaterThan(0.99);
  });

  test('boundary mode rebuilds the block geometry', async ({ page }) => {
    await mount(page);
    await show3d(page);
    expect((await page.evaluate(() => (window as any).__gl())).hasSlab).toBe(true);

    // Divergent: no descending slab; two plates plus the ridge between them.
    await page.evaluate(() => (window as any).__setMode('Divergent'));
    await page.waitForTimeout(600);
    const div = await page.evaluate(() => (window as any).__gl());
    expect(div.hasSlab).toBe(false);
    expect(div.plateCount).toBe(3);

    // Transform: two plates, no slab, no ridge.
    await page.evaluate(() => (window as any).__setMode('Transform'));
    await page.waitForTimeout(600);
    const tr = await page.evaluate(() => (window as any).__gl());
    expect(tr.hasSlab).toBe(false);
    expect(tr.plateCount).toBe(2);
  });

  test('the cutaway slider drives a real clip plane', async ({ page }) => {
    await mount(page);
    await show3d(page);

    // Full extent = effectively disabled.
    expect((await page.evaluate(() => (window as any).__gl())).clipConstant).toBeGreaterThan(1000);

    await page.evaluate(() => (window as any).__setCut(0));
    await page.waitForTimeout(600);
    expect((await page.evaluate(() => (window as any).__gl())).clipConstant).toBeCloseTo(0, 3);
  });

  test('rotate buttons move the camera without a mouse', async ({ page }) => {
    await mount(page);
    await show3d(page);
    const before = await page.evaluate(() => (window as any).__gl().camera);

    await page.evaluate(() => (window as any).__click('[aria-label="Turn left"]'));
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => (window as any).__gl().camera);

    const moved = Math.abs(after.x - before.x) + Math.abs(after.z - before.z);
    expect(moved).toBeGreaterThan(1);
  });

  test('switching back to the section reveals it and drops the canvas', async ({ page }) => {
    await mount(page);
    await show3d(page);
    await page.evaluate(() => (window as any).__click('[data-tect-view="2d"]'));
    await page.waitForTimeout(400);

    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-tect-gl]').length)).toBe(0);
    expect((await page.evaluate(() => (window as any).__sectionCanvas())).visibility).toBe('visible');
  });

  test('simulation ticks do not remount the canvas', async ({ page }) => {
    // The sim calls setState continuously; an inline ref would rebuild the
    // scene every tick. This widget already carries scars from that bug.
    await mount(page);
    await show3d(page);
    await page.waitForTimeout(2500);   // many sim ticks

    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-tect-gl]').length)).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('the depth scale is built and can be turned off', async ({ page }) => {
    // Without it the block is a tilted line of dots with no way to say how
    // deep anything is, so the depth colours stay a legend lookup instead of
    // something readable off the model.
    await mount(page);
    await show3d(page);

    // 4 ticks (surface / 70 / 300 / 700) = 4 lines + 4 labels, plus the two
    // band planes at the 70 and 300 km class boundaries, plus trench and arc.
    const on = await page.evaluate(() => (window as any).__gl());
    expect(on.scaleCount).toBe(12);

    await page.evaluate(() => (window as any).__click('[data-tect-scale-toggle]'));
    await page.waitForTimeout(500);
    expect((await page.evaluate(() => (window as any).__gl())).scaleCount).toBe(0);

    // Toggling it away must not disturb the geology.
    const off = await page.evaluate(() => (window as any).__gl());
    expect(off.hasSlab).toBe(true);
    expect(off.plateCount).toBe(2);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('the depth scale drops its labels when the mode changes', async ({ page }) => {
    // Label sprites own a CanvasTexture each and the scale is rebuilt on every
    // mode change, so a leak here compounds over a lesson.
    await mount(page);
    await show3d(page);
    expect((await page.evaluate(() => (window as any).__gl())).scaleCount).toBe(12);

    // Divergent and transform have no trench or arc, so only the 4 ticks and
    // 2 band planes remain.
    await page.evaluate(() => (window as any).__setMode('Divergent'));
    await page.waitForTimeout(600);
    expect((await page.evaluate(() => (window as any).__gl())).scaleCount).toBe(10);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page);
    await show3d(page);
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
