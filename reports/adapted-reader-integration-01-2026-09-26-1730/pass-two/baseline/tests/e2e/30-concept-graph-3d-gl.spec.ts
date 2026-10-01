import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * ConceptGraph3D — REAL WebGL smoke.
 *
 * concept_graph_3d_module.js says it plainly at the top of the file: buildScene()
 * is pure and fully unit-tested, but "the real 3D render still needs a live
 * Canvas/browser smoke (jsdom has no WebGL)". Memory Palace got that smoke in
 * 17-memory-palace-gl.spec.ts; the concept-graph renderer never did, even though
 * it is the shared 3D view for acg/v1 and the one Throughline drives.
 *
 * Serves the WORKING TREE on an ephemeral port so it tests the code you just
 * changed. three.js still lazy-loads from its usual CDN.
 *
 * The design rules in the module header are what this file pins:
 *   1. the 3D scene is a VIEW; the reading-order outline is the a11y source of truth
 *   2. that outline is sr-only while GL is live and VISIBLE if anything fails
 *   3. load failure / no-WebGL degrades, never crashes
 *   4. GL context + rAF are torn down on destroy (this repo has shipped rAF leaks)
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Built through the engine's own adapter in the browser, so this exercises the
// real adaptGenerated -> applyStructureLayout -> buildScene path rather than a
// hand-written graph that could drift from what the app actually produces.
const SAMPLE = {
  main: 'The Water Cycle',
  structureType: 'Key Concept Map',
  branches: [
    { title: 'Evaporation', items: ['Sun heats the surface', 'Vapour rises'] },
    { title: 'Condensation', items: ['Vapour cools', 'Droplets form'] },
    { title: 'Precipitation', items: ['Rain', 'Snow'] },
  ],
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>cg3d harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:560px;position:relative}</style></head>
<body><div id="wrap"></div>
<script src="/concept_graph_engine_module.js"></script>
<script src="/concept_graph_3d_module.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.__buildGraph = function (gen) {
    var E = window.AlloModules.ConceptGraphEngine;
    var g = E.adaptGenerated(gen);
    g = E.applyStructureLayout(g, { structureType: gen.structureType });
    return E.ensureDefaultAxisValues(g);
  };
  window.__mount = function (gen, extraOpts) {
    var CG = window.AlloModules.ConceptGraph3D;
    var wrap = document.getElementById('wrap');
    window.__graph = window.__buildGraph(gen);
    window.__handle = CG.render(wrap, window.__graph, extraOpts || {});
    return { fellBack: !!(window.__handle && window.__handle.fellBack) };
  };
  window.__glLive = function () {
    var c = document.querySelector('#wrap canvas');
    if (!c) return null;
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    return { hasCanvas: true, lost: gl ? gl.isContextLost() : null, w: c.clientWidth, h: c.clientHeight };
  };
</script></body></html>`;

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

async function mount(
  page: import('@playwright/test').Page,
  gen: unknown = SAMPLE,
  opts: Record<string, unknown> = {},
) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).AlloModules?.ConceptGraph3D
    && !!(window as any).AlloModules?.ConceptGraphEngine);
  const res = await page.evaluate(([g, o]) => (window as any).__mount(g, o), [gen, opts] as [unknown, unknown]);
  return res as { fellBack: boolean };
}

// SwiftShader software rasterisation plus canvas screenshots is far slower than a
// DOM test; the default 30s budget does not cover a mount and two readbacks.
test.describe.configure({ timeout: 150_000 });

test.describe('ConceptGraph3D — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__handle?.destroy(); } catch { /* already gone */ } }).catch(() => {});
  });

  test('mounts a live GL canvas that fills its container', async ({ page }) => {
    const res = await mount(page);
    expect(res.fellBack).toBe(false);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl).not.toBeNull();
    expect(gl.lost).toBe(false);
    const wrap = (await page.locator('#wrap').boundingBox())!;
    expect(gl.w).toBeGreaterThan(wrap.width - 8);
    expect(gl.h).toBeGreaterThan(400);
  });

  test('refits the canvas when the window resizes', async ({ page }) => {
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const before = await page.evaluate(() => (window as any).__glLive());
    expect(before.w).toBeGreaterThan(880);
    await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '520px'; });
    await page.setViewportSize({ width: 700, height: 700 });   // fires window resize
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => (window as any).__glLive());
    expect(after.w).toBeLessThan(540);
    expect(after.w).toBeGreaterThan(500);
    expect(after.lost).toBe(false);
  });

  // The container-only case: the window never changes, so this passes ONLY via the
  // ResizeObserver. Before that was added the canvas kept its mount-time width,
  // which is how a panel or modal expansion left the scene rendering at the old size.
  test('refits when only its container resizes, window untouched', async ({ page }) => {
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const before = await page.evaluate(() => (window as any).__glLive());
    expect(before.w).toBeGreaterThan(880);
    await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '520px'; });
    await page.waitForTimeout(800);   // observer + the deferred next-frame refit
    const after = await page.evaluate(() => (window as any).__glLive());
    expect(after.w).toBeLessThan(540);
    expect(after.w).toBeGreaterThan(500);
    expect(after.lost).toBe(false);
  });

  test('grows back when the container expands again', async ({ page }) => {
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '480px'; });
    await page.waitForTimeout(800);
    await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '860px'; });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => (window as any).__glLive());
    expect(after.w).toBeGreaterThan(840);
    expect(after.lost).toBe(false);
  });

  test('renders a scene whose pixels change as the camera orbits', async ({ page }) => {
    await mount(page, SAMPLE, { autoRotate: true });
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const canvas = page.locator('#wrap canvas');
    const first = await canvas.screenshot();
    await page.waitForTimeout(1400);   // let the drift camera move
    const second = await canvas.screenshot();
    expect(first.length).toBeGreaterThan(2000);
    // Different vantage => different pixels. The strongest single proof that the
    // scene both renders and animates, and the check a pure unit test cannot make.
    expect(Buffer.compare(first, second)).not.toBe(0);
  });

  test('keeps the reading-order outline sr-only while GL is live, covering every node', async ({ page }) => {
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    // Two lists by design, same as Memory Palace: the sr-only one render() always
    // emits (the a11y source of truth) plus the in-scene outline panel, which starts
    // hidden so it cannot double-announce.
    const ol = page.locator('#wrap ol');
    expect(await ol.count()).toBe(2);
    // 1 main + 3 branches + 6 items, in both
    expect(await ol.first().locator('li').count()).toBe(10);
    expect(await ol.nth(1).locator('li').count()).toBe(10);
    const panelHidden = await page.evaluate(() => {
      const panel = document.querySelector('#wrap [id^="cg3d-outline-panel"]') as HTMLElement | null;
      return panel ? panel.hidden : null;
    });
    expect(panelHidden).toBe(true);
    const text = await page.locator('#wrap').textContent();
    expect(text).toContain('Evaporation');
    expect(text).toContain('Droplets form');
    // sr-only: clipped to a 1px box, not display:none (which would drop it from AT).
    const box = await page.evaluate(() => {
      const el = document.querySelectorAll('#wrap ol')[0]?.parentElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { w: el.getBoundingClientRect().width, display: cs.display, visibility: cs.visibility };
    });
    expect(box).not.toBeNull();
    expect(box!.display).not.toBe('none');
    expect(box!.visibility).not.toBe('hidden');
    expect(box!.w).toBeLessThan(4);
  });

  test('degrades to a VISIBLE outline when WebGL is unavailable', async ({ page }) => {
    // Design rule 3: no-WebGL must fall back, never crash. Stubbed before any app
    // script runs so isWebGLAvailable() sees the same browser the user would.
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (typeof type === 'string' && /webgl/i.test(type)) return null;
        return (real as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const res = await mount(page);
    expect(res.fellBack).toBe(true);
    expect(await page.locator('#wrap canvas').count()).toBe(0);
    const ol = page.locator('#wrap ol');
    expect(await ol.count()).toBe(1);
    expect(await ol.locator('li').count()).toBe(10);
    // The whole point of the fallback: the outline becomes VISIBLE, so a sighted
    // user who cannot get GL still receives the content.
    const width = await page.evaluate(() => {
      const el = document.querySelector('#wrap ol')?.parentElement as HTMLElement | null;
      return el ? el.getBoundingClientRect().width : 0;
    });
    expect(width).toBeGreaterThan(100);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tears the GL context and canvas down on destroy', async ({ page }) => {
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      (window as any).__handle.destroy();
      return { canvases: document.querySelectorAll('#wrap canvas').length };
    });
    expect(after.canvases).toBe(0);
    // rAF must stop too: this repo has shipped zombie loops that kept rendering
    // into a disposed context. A late frame would raise a page error.
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('mounts and tears down without a single console error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
    await mount(page);
    await page.waitForSelector('#wrap canvas', { timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as any).__handle.destroy());
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    const ours = consoleErrors.filter((e) => !/sourcemap|favicon/i.test(e));
    expect(ours).toEqual([]);
  });
});
