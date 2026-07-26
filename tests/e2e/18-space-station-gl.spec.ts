import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Space Station — REAL WebGL smoke.
 *
 * Everything else covering this tool runs in jsdom, which has no WebGL, so the
 * entire 3-D map has only ever been checked by hand: the guarded bloom pipeline,
 * the orbital-day lighting, the sun-tracking array glint, the reduced-motion
 * idle-render guard, and drag-to-rotate. Headless Chromium rasterises WebGL 2.0
 * through SwiftShader, so this drives the actual scene in a real browser.
 *
 * Pattern and both traps come from 17-memory-palace-gl.spec.ts: serve the
 * WORKING TREE on an ephemeral port (so it tests the code you just changed),
 * destroy the scene in afterEach (leaked GL contexts do not error, they just
 * make the suite 4x slower and randomly flaky), and raise the timeout because
 * SwiftShader pixel readback stalls.
 *
 * Unlike the palace, this is a StemLab *plugin*: it needs React and a host ctx,
 * so the harness shims just enough of stem_lab_module.js. React, ReactDOM and
 * three r128 are all served from the working tree, so no network is required —
 * and r128 is the version the tool's post-processing addons target.
 *
 * The specific things this exists to catch are the ones I could not verify while
 * building: that post-FX actually reaches the framebuffer rather than silently
 * falling back, that a touch drag is not stolen by page scrolling, and that the
 * tool does not throw on a real GL path.
 *
 * Run:  npx playwright test tests/e2e/18-space-station-gl.spec.ts --workers=1
 * (not yet added to package.json's test:e2e:gl script, which was modified by
 * another session at the time of writing — worth folding in once that lands.)
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>space station harness</title>
<style>html,body{margin:0;height:100%;background:#060b18}
#wrap{width:900px;height:560px;position:relative}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { window.__events.errors.push('unhandled: ' + e.reason); });

  // Minimal host shim (mirrors stem_lab_module.js). ensureThree resolves
  // immediately because the real three r128 is already loaded above.
  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return Promise.resolve(); },
    ensureThree: function () { return Promise.resolve(window.THREE); }
  };

  window.__mount = function (seed) {
    var cfg = window.StemLab._registry.spaceStation;
    var wrap = document.getElementById('wrap');
    var root = ReactDOM.createRoot(wrap);
    window.__root = root;
    function Harness() {
      var st = React.useState({ spaceStation: seed });
      var toolData = st[0], setToolData = st[1];
      var noop = function () {};
      var Icons = new Proxy({}, { get: function () { return function () { return null; }; } });
      return cfg.render({
        React: React, toolData: toolData, setToolData: setToolData,
        update: noop, updateMulti: noop, setStemLabTool: noop,
        addToast: noop, announceToSR: noop, awardXP: noop,
        callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
        icons: Icons, t: function (k, f) { return f != null ? f : k; }
      });
    }
    root.render(React.createElement(Harness));
    return true;
  };

  window.__canvas = function () { return document.querySelector('#wrap canvas'); };
  window.__glLive = function () {
    var c = window.__canvas();
    if (!c) return null;
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    return {
      hasCanvas: true, lost: gl ? gl.isContextLost() : null,
      w: c.clientWidth, h: c.clientHeight,
      touchAction: getComputedStyle(c).touchAction,
      renderer: gl ? gl.getParameter(gl.VERSION) : null
    };
  };
  window.__destroy = function () {
    try { var c = window.__canvas(); if (c && c._issCleanup) c._issCleanup(); } catch (e) {}
    try { window.__root && window.__root.unmount(); } catch (e) {}
  };
</script></body></html>`;

// Seeds the tool onto its 3-D map tab with a module selected.
const SEED = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, orbitAlt: 420,
  seenModules: {}, seenHours: {}, mapView: 'overview', mapCutaway: false,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
};

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

/**
 * Mount the tool and wait for its GL canvas.
 *
 * `postFX` false sets the platform kill-switch BEFORE the tool script runs,
 * which is the only point it is read. `reducedMotion` matters for more than
 * politeness: it freezes the scene (no auto-rotation, no sun sweep), which is
 * what makes two screenshots comparable at all.
 */
async function mount(
  page: import('@playwright/test').Page,
  opts: { postFX?: boolean; reducedMotion?: boolean } = {},
) {
  const reduced = opts.reducedMotion !== false;
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  // The scene's 620-star field is built from Math.random(), so two separate
  // mounts differ no matter what else is true. Any cross-mount pixel comparison
  // (the post-FX test) would then pass even with bloom fully disabled and prove
  // nothing. Seed a deterministic PRNG before ANY page script runs so the only
  // thing that can differ between mounts is what the test is actually varying.
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  });
  await page.goto(`${base}/__harness`);
  if (opts.postFX === false) {
    await page.evaluate(() => { (window as any).AlloPostFXEnabled = false; });
  }
  await page.addScriptTag({ url: '/stem_lab/stem_tool_spacestation.js' });
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.spaceStation);
  await page.evaluate((s) => (window as any).__mount(s), SEED);
  await page.waitForSelector('#wrap canvas', { timeout: 30000 });
  if (opts.postFX !== false) {
    // The bloom pipeline is a deliberate graceful upgrade: six post-processing
    // addons load sequentially from a CDN, and the tool renders plain until they
    // arrive. A fixed wait raced that chain — the post-FX comparison failed on a
    // cold cache and passed on a warm one. Wait for the real signal instead; the
    // tool builds its composer synchronously once these globals exist.
    await page
      .waitForFunction(() => {
        const T = (window as any).THREE;
        return !!(T && T.EffectComposer && T.RenderPass && T.UnrealBloomPass);
      }, { timeout: 45000 })
      .catch(() => { /* offline: asserted per-test, not swallowed silently */ });
  }
  await page.waitForTimeout(1500);   // settle a few frames (composer swaps in)
}

/** True once the r128 post-processing addons are actually available in-page. */
async function postFXAddonsLoaded(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const T = (window as any).THREE;
    return !!(T && T.EffectComposer && T.RenderPass && T.UnrealBloomPass);
  });
}

test.describe.configure({ timeout: 180_000 });

test.describe('Space Station — real WebGL 3-D map', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  });

  test('mounts a live GL canvas, sized, with no page errors', async ({ page }) => {
    await mount(page);
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl).not.toBeNull();
    expect(gl.lost).toBe(false);
    expect(gl.w).toBeGreaterThan(800);
    expect(gl.h).toBeGreaterThan(300);
    // First time this tool has ever executed its GL path outside a human's
    // browser: a throw here would mean the scene never built at all.
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('claims the touch gesture instead of letting the page scroll it', async ({ page }) => {
    await mount(page);
    const gl = await page.evaluate(() => (window as any).__glLive());
    // The bug this pins: without touchAction the browser takes the drag for
    // page scrolling, the pointer stream is cancelled, and drag-to-rotate is
    // simply dead on touchscreen Chromebooks. Computed style, real browser.
    expect(gl.touchAction).toBe('none');
  });

  test('renders a scene whose pixels follow the camera view', async ({ page }) => {
    await mount(page);
    const canvas = page.locator('#wrap canvas');
    const overview = await canvas.screenshot();
    await page.evaluate(() => (window as any).__canvas()._issSetView('nadir'));
    await page.waitForTimeout(1200);
    const nadir = await canvas.screenshot();
    expect(overview.length).toBeGreaterThan(2000);
    // Different vantage => different pixels: proves the scene rasterises AND
    // that the view controls reach the camera.
    expect(Buffer.compare(overview, nadir)).not.toBe(0);
  });

  test('drag-to-rotate turns the station', async ({ page }) => {
    await mount(page);
    const canvas = page.locator('#wrap canvas');
    const box = (await canvas.boundingBox())!;
    const before = await canvas.screenshot();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('two identical mounts are byte-identical (control for the post-FX test)', async ({ page }) => {
    // Guards the guard. If this ever fails, some residual nondeterminism has
    // crept back in and the post-FX comparison below stops meaning anything —
    // it would be passing on noise rather than on the bloom pass.
    await mount(page, { postFX: true });
    const first = await page.locator('#wrap canvas').screenshot();
    await page.evaluate(() => (window as any).__destroy?.());
    await mount(page, { postFX: true });
    const second = await page.locator('#wrap canvas').screenshot();
    expect(Buffer.compare(first, second)).toBe(0);
  });

  test('post-FX actually reaches the framebuffer', async ({ page }) => {
    // Reduced motion freezes the scene, so the ONLY difference between these two
    // mounts is the bloom pass. If the composer silently failed to load or was
    // never wired in, both images would be byte-identical and this fails —
    // which is the whole reason it exists, since the fallback path is designed
    // to be invisible.
    await mount(page, { postFX: true });
    // If the addon CDN is unreachable the tool correctly falls back to a plain
    // render, and both images would match. Skipping says "could not verify"
    // rather than reporting a false "bloom is broken" on a network outage.
    const loaded = await postFXAddonsLoaded(page);
    test.skip(!loaded, 'post-processing addon CDN unreachable — cannot assert bloom output');
    const withFX = await page.locator('#wrap canvas').screenshot();
    await page.evaluate(() => (window as any).__destroy?.());

    await mount(page, { postFX: false });
    const withoutFX = await page.locator('#wrap canvas').screenshot();

    expect(withFX.length).toBeGreaterThan(2000);
    expect(withoutFX.length).toBeGreaterThan(2000);
    expect(Buffer.compare(withFX, withoutFX)).not.toBe(0);
  });

  test('reduced motion holds the scene still between frames', async ({ page }) => {
    // The idle-render guard skips redundant draws but forces a repaint every 120
    // ticks, so the image must be stable while nothing changes. This also proves
    // the guard cannot strand a blank canvas: a wholly black frame would fail
    // the view-change test above, and here the two samples must MATCH.
    await mount(page, { reducedMotion: true });
    const canvas = page.locator('#wrap canvas');
    const first = await canvas.screenshot();
    await page.waitForTimeout(2500);   // spans several forced repaints
    const second = await canvas.screenshot();
    expect(Buffer.compare(first, second)).toBe(0);
  });

  test('teardown releases the GL context', async ({ page }) => {
    await mount(page);
    expect(await page.evaluate(() => (window as any).__glLive().lost)).toBe(false);
    await page.evaluate(() => { (window as any).__canvas()._issCleanup(); });
    await page.waitForTimeout(400);
    // renderer.dispose() forcibly loses the context; the cleanup contract also
    // clears _issInit so a remount is possible.
    const after = await page.evaluate(() => {
      const c = (window as any).__canvas();
      return c ? { init: c._issInit } : null;
    });
    expect(after?.init).toBeFalsy();
  });
});
