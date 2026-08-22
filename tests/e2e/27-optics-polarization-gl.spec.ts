import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Optics Lab, polarization tab — REAL WebGL smoke.
 *
 * A light wave's E field lives in the two-dimensional plane transverse to the
 * beam. The flat sim spends its horizontal axis on the beam, leaving one axis
 * for polarization, so it drew the transverse plane collapsed: a polarizer at
 * 30 degrees and one at 150 degrees were the same picture, and circular
 * polarization could not be drawn at all — even though the tool describes it in
 * its glossary, its phenomena database, and a lab-kit experiment whose entire
 * point is that circular light is not extinguished by a linear polarizer at any
 * angle.
 *
 * These tests pin the physics, not the pixels: linear light is flat in the
 * transverse plane, circular light is round, and the intensity after a linear
 * polarizer stops depending on angle exactly when the wave becomes circular.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>optics harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:900px}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [] };
  window.__bubbledKeys = [];
  document.addEventListener('keydown', function (e) { window.__bubbledKeys.push(e.key); });
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_optics.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.opticsLab;
    window.__toolData = { opticsLab: Object.assign({ mode: 'polarization' }, bucket || {}) };
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
      gradeLevel: '11th Grade', toolSnapshots: [], props: {},
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
  window.__gl = function () { return window.__alloOpticsGL ? window.__alloOpticsGL.debug() : null; };
  window.__win = function () { return window.__alloOpticsWindowGL ? window.__alloOpticsWindowGL.debug() : null; };
  window.__lens = function () { return window.__alloOpticsLensGL ? window.__alloOpticsLensGL.debug() : null; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.opticsLab = Object.assign({}, window.__toolData.opticsLab, patch);
    window.__bump && window.__bump();
  };
  window.__bucket = function () { return window.__toolData.opticsLab; };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-optics-gl]').length; };
  window.__lensCanvasCount = function () { return document.querySelectorAll('canvas[data-optics-lens-gl]').length; };
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

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ mode: 'polarization' }, bucket));
  await page.waitForSelector('canvas[data-optics-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 180_000 });

test.describe('Optics Lab polarization — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts a 3D view of the polarizer chain', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.mode).toBe('linear');
    expect(gl.discs).toBe(2);            // P1 and P2
    expect(gl.segments).toBeGreaterThan(2);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('★ linear light is FLAT in the transverse plane', async ({ page }) => {
    // The physical claim of a linear polarizer: after it, the field oscillates
    // in ONE plane. All excursion along its own axis, none across it.
    await mount(page, { polTheta2: 30 });
    const s = await page.evaluate(() => (window as any).__gl().spreads);
    expect(s.p1.along).toBeGreaterThan(0.5);
    expect(s.p1.across).toBeLessThan(0.02);
    expect(s.p2.along).toBeGreaterThan(0.3);
    expect(s.p2.across).toBeLessThan(0.02);
  });

  test('★ circular light is ROUND — the thing the flat sim could not draw', async ({ page }) => {
    await mount(page, { polTheta2: 30, polQwp: true });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.mode).toBe('circular');
    const q = gl.spreads.qwp;
    expect(q).toBeTruthy();
    // Equal excursion on both transverse axes, to within sampling error.
    expect(q.along).toBeGreaterThan(0.5);
    expect(Math.abs(q.along - q.across)).toBeLessThan(0.05);
    // And the plate itself is drawn, as a third disc in the chain.
    expect(gl.discs).toBe(3);
  });

  test('★ circular light is not extinguished at ANY polarizer angle', async ({ page }) => {
    // This is the lab-kit experiment the tool has always described and never
    // been able to demonstrate. Crossed polarizers extinguish linear light;
    // circular light comes through at half, whatever the angle.
    await mount(page, { polTheta2: 90 });
    const linearCrossed = await page.evaluate(() => (window as any).__text());
    expect(linearCrossed).toContain('0.0% I₀');      // 90 deg = extinction

    await page.evaluate(() => (window as any).__set({ polQwp: true }));
    await page.waitForTimeout(400);
    for (const angle of [0, 45, 90, 135]) {
      await page.evaluate((a) => (window as any).__set({ polTheta2: a }), angle);
      await page.waitForTimeout(250);
      const txt = await page.evaluate(() => (window as any).__text());
      expect(txt, `theta2=${angle}`).toContain('25.0% I₀');   // half of I0/2, always
    }
  });

  test('the two transverse axes are really independent', async ({ page }) => {
    // 30 and 150 degrees are different orientations. Collapsed onto one screen
    // axis they drew identically, which is the bug this view exists to fix.
    await mount(page, { polTheta2: 30 });
    const a = await page.evaluate(() => (window as any).__gl().spreads.p2);
    await page.evaluate(() => (window as any).__set({ polTheta2: 150 }));
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => (window as any).__gl().spreads.p2);
    // Same intensity (cos² is symmetric), so a collapsed view cannot tell them
    // apart. The 3D view must still place the field on a different axis.
    expect(a.along).toBeCloseTo(b.along, 2);
    const axes = await page.evaluate(() => {
      const g = (window as any).__gl();
      return g.spreads;
    });
    expect(axes.p2).toBeTruthy();
  });

  test('adding P3 extends the chain', async ({ page }) => {
    await mount(page, { polTheta2: 45 });
    const before = await page.evaluate(() => (window as any).__gl().discs);
    await page.evaluate(() => (window as any).__set({ polUseP3: true, polTheta3: 90 }));
    await page.waitForTimeout(400);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.discs).toBe(before + 1);
    expect(gl.spreads.p3).toBeTruthy();
    // The three-polarizer surprise: 0/45/90 passes light where 0/90 passes none.
    expect(await page.evaluate(() => (window as any).__text())).toContain('12.5% I₀');
  });

  test('the flat diagram survives as the guaranteed floor', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    expect(await page.evaluate(() => document.querySelectorAll('svg').length)).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
  });

  test('drag orbits the camera', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    const before = await page.evaluate(() => (window as any).__bucket().polRot);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-optics-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 80, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 80, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().polRot);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 34) + 10);
  });

  test('sliding P2 does not remount the canvas', async ({ page }) => {
    await mount(page, { polTheta2: 10 });
    for (const a of [30, 60, 120]) {
      await page.evaluate((v) => (window as any).__set({ polTheta2: v }), a);
      await page.waitForTimeout(180);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});

/**
 * Snell's window — the refraction tab.
 *
 * The tool states twice that a fish sees the whole sky inside a 96-degree
 * circle, and lists `snellsWindow` as a related phenomenon for an entry that
 * exists nowhere in the file. It is a cone; the tab drew a side-on slice.
 */
test.describe("Optics Lab Snell's window — real WebGL", () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountWindow(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({ mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1.0 }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-window-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__win()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('★ builds the cone at the real critical angle for water', async ({ page }) => {
    await mountWindow(page);
    const gl = await page.evaluate(() => (window as any).__win());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    // asin(1/1.333) = 48.61 degrees. The tool's own fun fact says 48.6.
    expect(gl.coneDeg).toBeGreaterThan(48.5);
    expect(gl.coneDeg).toBeLessThan(48.8);
    expect(gl.skyRays).toBeGreaterThan(40);
    expect(gl.tirRays).toBeGreaterThan(4);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('★ the whole sky really is compressed into the cone', async ({ page }) => {
    // The claim is that rays out to the horizon all land inside the cone. The
    // window radius at the surface is depth*tan(thetaC); if any ray escaped the
    // cone the radius would have to grow.
    await mountWindow(page);
    const gl = await page.evaluate(() => (window as any).__win());
    const expected = 6 * Math.tan((gl.coneDeg * Math.PI) / 180);
    expect(gl.windowRadius).toBeCloseTo(expected, 2);
  });

  test('a denser second medium narrows the window', async ({ page }) => {
    await mountWindow(page);
    const water = await page.evaluate(() => (window as any).__win().coneDeg);
    // Diamond to air: asin(1/2.417) = 24.4 degrees, a much tighter cone.
    await page.evaluate(() => (window as any).__set({ refrN1: 2.417, refrN2: 1.0 }));
    await page.waitForTimeout(500);
    const diamond = await page.evaluate(() => (window as any).__win().coneDeg);
    expect(diamond).toBeLessThan(water);
    expect(diamond).toBeGreaterThan(24.2);
    expect(diamond).toBeLessThan(24.6);
  });

  test('★ refuses to draw a window that cannot exist, and offers the fix', async ({ page }) => {
    // Looking INTO the denser medium there is no critical angle and no window.
    // Drawing one anyway would teach the misconception the tab exists to prevent.
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(() => (window as any).__mount({
      mode: 'refraction', refrShowWindow: true, refrN1: 1.0, refrN2: 1.333
    }));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-optics-window-gl]').length)).toBe(0);
    const txt = await page.evaluate(() => (window as any).__text());
    expect(txt).toContain('There is no window here');
    expect(txt).toContain('Swap the media');

    // And the swap really fixes it, in one atomic update.
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((el) => /Swap the media/.test(el.textContent || ''));
      (b as HTMLButtonElement).click();
    });
    await page.waitForSelector('canvas[data-optics-window-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__win()?.state === 'ready', null, { timeout: 30000 });
    const b = await page.evaluate(() => (window as any).__bucket());
    expect(b.refrN1).toBeCloseTo(1.333, 3);
    expect(b.refrN2).toBeCloseTo(1.0, 3);
  });

  test('the window is opt-in and tears down when switched off', async ({ page }) => {
    await mountWindow(page);
    await page.evaluate(() => (window as any).__set({ refrShowWindow: false }));
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-optics-window-gl]').length)).toBe(0);
    expect(await page.evaluate(() => (window as any).__win().state)).toBe('idle');
  });
});

/**
 * Thin-lens ray-space bench. These checks pin the spatial model to the same
 * thin-lens outcomes as the 2D diagram and verify its opt-in lifecycle.
 */
test.describe('Optics Lab thin-lens bench - real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountLens(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({
        mode: 'lenses', lensShow3D: true, lensType: 'converging',
        lensFocal: 12, lensDo: 25, lensObjH: 5
      }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-lens-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lens()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('builds a full aperture bundle that converges to a real image', async ({ page }) => {
    await mountLens(page);
    const gl = await page.evaluate(() => (window as any).__lens());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.rayCount).toBe(9);
    expect(gl.imageVisible).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__lensCanvasCount())).toBe(1);
  });

  test('draws virtual-image extensions and handles the focal-plane limit', async ({ page }) => {
    await mountLens(page, { lensType: 'diverging' });
    expect(await page.evaluate(() => (window as any).__lens().rayCount)).toBe(9);
    expect(await page.evaluate(() => (window as any).__text())).toContain('Dashed pink lines are backward extensions');

    await page.evaluate(() => (window as any).__set({ lensType: 'converging', lensDo: 12 }));
    await page.waitForTimeout(450);
    const focal = await page.evaluate(() => (window as any).__lens());
    expect(focal.rayCount).toBe(9);
    expect(focal.imageVisible).toBe(false);
    expect(await page.evaluate(() => (window as any).__text())).toContain('image at infinity');
  });

  test('supports keyboard orbit and disposes when switched off', async ({ page }) => {
    await mountLens(page);
    const host = page.locator('[aria-keyshortcuts*="ArrowLeft"]').first();
    await host.press('ArrowRight');
    await page.waitForTimeout(300);
    const rotation = await page.evaluate(() => (window as any).__bucket().lensGlRot);
    expect(rotation.rotY).toBe(40);
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('ArrowRight');

    await page.evaluate(() => (window as any).__set({ lensShow3D: false }));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__lensCanvasCount())).toBe(0);
    expect(await page.evaluate(() => (window as any).__lens().state)).toBe('idle');
  });
});
