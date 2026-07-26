import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Memory Palace — REAL WebGL smoke.
 *
 * Everything else that covers the palace runs in jsdom, which has no WebGL, so
 * the entire 3D walk (canvas sizing, camera rails, floor picking, teardown) has
 * only ever been verified by hand. Headless Chromium renders WebGL 2.0 through
 * SwiftShader, so this drives the actual scene in a real browser.
 *
 * It serves the WORKING TREE (not the deployed site) on an ephemeral port, so
 * it tests the code you just changed. The three.js the module lazy-loads still
 * comes from its usual CDN.
 *
 * The bugs this class of test exists to catch are the ones that reached Aaron by
 * hand in earlier rounds: a canvas that mounts at ~60% width because the
 * container grew after mount, a walk that does not move, floor picking that
 * lands in the wrong room, and a teardown that leaks the GL context.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Sample organizer: 3 rooms, 6 loci, plus one student-built locus and annex so
// the build lane is exercised by the same scene.
const SAMPLE = {
  main: 'The Water Cycle',
  branches: [
    { title: 'Sky Room', items: ['Evaporation', 'Condensation'], mnemonics: ['A kettle the size of a house boils a lake into golden steam', 'A cloud knitting itself from silver wool'] },
    { title: 'Ground Room', items: ['Precipitation', 'Collection'], mnemonics: ['Umbrellas raining upward', 'A bathtub swallowing a river'] },
    { title: 'Ocean Room', items: ['Runoff', 'Infiltration'], mnemonics: ['A skateboard of water racing downhill', 'A sponge city drinking a storm'] },
  ],
  memoryPalace: {
    extraRooms: [{ id: 'xr1', title: 'My Attic' }],
    extraLoci: [{ id: 'xl1', room: 'b0', label: 'My own fact' }, { id: 'xl2', room: 'xr1', label: 'Attic thing' }],
  },
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>palace harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:560px;position:relative}</style></head>
<body><div id="wrap"></div>
<script src="/memory_palace_module.js"></script>
<script>
  window.__events = { locus: [], floor: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.__mount = function (data, extraOpts) {
    var MP = window.AlloModules.MemoryPalace;
    var wrap = document.getElementById('wrap');
    var opts = Object.assign({
      onLocusChange: function (locus, idx, total) {
        window.__events.locus.push({ id: locus && locus.id, label: locus && locus.label, idx: idx, total: total });
      },
      onFloorPlace: function (spot) { window.__events.floor.push(spot); }
    }, extraOpts || {});
    window.__handle = MP.render(wrap, data, opts);
    return !!window.__handle;
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
      // serve the working tree, refusing to climb out of it
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

/** Mount the palace and wait for the GL canvas to appear. */
async function mount(page: import('@playwright/test').Page, data: unknown = SAMPLE, opts: unknown = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).AlloModules?.MemoryPalace);
  await page.evaluate(([d, o]) => (window as any).__mount(d, o), [data, opts] as [unknown, unknown]);
  await page.waitForSelector('#wrap canvas', { timeout: 20000 });
  await page.waitForTimeout(900);   // let three.js settle a few frames
}

// SwiftShader is a software rasteriser, so mounting a scene and especially
// reading pixels back out ("GPU stall due to ReadPixels") is far slower than a
// DOM test. The default 30s budget is not enough for a mount plus two canvas
// screenshots on a modest machine.
test.describe.configure({ timeout: 150_000 });

test.describe('Memory Palace — real WebGL walk', () => {
  // Chromium caps how many live WebGL contexts a process may hold and silently
  // kills the oldest past that. Every test here mounts a scene, so leaving them
  // alive makes later tests flaky for reasons that have nothing to do with the
  // code under test. Tearing down is also what the real view does on unmount.
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__handle?.destroy(); } catch { /* already gone */ } }).catch(() => {});
  });

  test('mounts a live GL canvas that fills its container', async ({ page }) => {
    await mount(page);
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl).not.toBeNull();
    expect(gl.lost).toBe(false);
    // The historical bug: clientWidth was read once at mount, so the canvas froze
    // at ~60% when the panel expanded afterwards.
    const wrap = await page.locator('#wrap').boundingBox();
    expect(gl.w).toBeGreaterThan((wrap!.width) - 8);
    expect(gl.h).toBeGreaterThan(400);
  });

  test('refits when its container resizes after mount', async ({ page }) => {
    await mount(page);
    await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '520px'; });
    await page.waitForTimeout(700);   // ResizeObserver + next-frame refit
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl.w).toBeLessThan(540);
    expect(gl.w).toBeGreaterThan(500);
  });

  test('renders a scene that actually changes as you walk', async ({ page }) => {
    await mount(page);
    const canvas = page.locator('#wrap canvas');
    const atEntrance = await canvas.screenshot();
    await page.evaluate(() => (window as any).__handle.goTo(3));
    await page.waitForTimeout(1200);   // camera eases along the rail
    const atLocus3 = await canvas.screenshot();
    expect(atEntrance.length).toBeGreaterThan(2000);
    // Different vantage ⇒ different pixels. This is the single strongest proof
    // that the scene renders AND the camera rail moves.
    expect(Buffer.compare(atEntrance, atLocus3)).not.toBe(0);
    const locus = await page.evaluate(() => (window as any).__events.locus);
    expect(locus.length).toBeGreaterThan(0);
    expect(locus[locus.length - 1].idx).toBe(3);
  });

  test('publishes an accessible route list covering every locus', async ({ page }) => {
    await mount(page);
    // Two lists by design: the sr-only one render() always emits (the a11y source
    // of truth, and the visible fallback if GL dies) plus the in-scene route
    // panel, which starts hidden so it cannot double-announce.
    expect(await page.locator('#wrap ol').count()).toBe(2);
    // 6 generated + 2 student-built + the entrance
    expect(await page.locator('#wrap ol').first().locator('li').count()).toBe(9);
    expect(await page.locator('#wrap ol').nth(1).locator('li').count()).toBe(9);
    const panelHidden = await page.evaluate(() => {
      const panel = document.querySelector('#wrap [id^="palace-route-panel"]') as HTMLElement | null;
      return panel ? panel.hidden : null;
    });
    expect(panelHidden).toBe(true);
    const all = await page.evaluate(() => document.querySelector('#wrap')?.textContent || '');
    expect(all).toContain('My own fact');      // student-built loci reach the a11y route
    expect(all).toContain('Attic thing');
    expect(all).toContain('golden steam');     // and generated mnemonics are read out
  });

  test('build mode picks the room under the pointer and rejects the hub', async ({ page }) => {
    await mount(page);
    const box = (await page.locator('#wrap canvas').boundingBox())!;
    // Focus the canvas FIRST (keyboard goes to the body otherwise, so 'o' would
    // silently do nothing) and only then arm build mode, so this focusing click
    // cannot itself place anything.
    await page.locator('#wrap canvas').click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('o');            // overview: look down on the whole palace
    await page.waitForTimeout(1000);
    await page.evaluate(() => { (window as any).__handle.setBuildMode(true); });
    await page.waitForTimeout(200);
    // Scan a grid of clicks. Hits must name a real room; the exact centre is the
    // hub plaza, which is deliberately NOT placeable.
    for (let gx = 1; gx <= 5; gx++) {
      for (let gy = 1; gy <= 3; gy++) {
        await page.mouse.click(box.x + (box.width * gx) / 6, box.y + (box.height * gy) / 4);
      }
    }
    const floor = await page.evaluate(() => (window as any).__events.floor);
    expect(floor.length).toBeGreaterThan(0);
    const hits = floor.filter((f: any) => f && f.roomKey);
    expect(hits.length).toBeGreaterThan(0);
    const keys = [...new Set(hits.map((h: any) => h.roomKey))];
    keys.forEach((k) => expect(['b0', 'b1', 'b2', 'xr1']).toContain(k));
    // every hit reports a spot inside its room, in room-local coordinates
    hits.forEach((h: any) => {
      expect(Number.isFinite(h.lx)).toBe(true);
      expect(Number.isFinite(h.lz)).toBe(true);
      expect(typeof h.roomLabel).toBe('string');
    });
    // The hub plaza in the middle is deliberately not placeable: aiming there
    // reports null so the host can explain why, rather than silently doing nothing.
    expect(floor.some((f: any) => f === null)).toBe(true);
  });

  test('build mode is inert until it is switched on', async ({ page }) => {
    await mount(page);
    const box = (await page.locator('#wrap canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
    await page.waitForTimeout(300);
    const floor = await page.evaluate(() => (window as any).__events.floor);
    expect(floor.length).toBe(0);
  });

  test('tears the GL context down on destroy', async ({ page }) => {
    await mount(page);
    const after = await page.evaluate(() => {
      (window as any).__handle.destroy();
      return { canvases: document.querySelectorAll('#wrap canvas').length };
    });
    expect(after.canvases).toBe(0);
  });

  test('walks the whole route without a single console error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
    await mount(page);
    const total = await page.evaluate(() => (window as any).__events.locus[0]?.total ?? 9);
    for (let i = 0; i < total; i++) {
      await page.evaluate((n) => (window as any).__handle.goTo(n), i);
      await page.waitForTimeout(220);
    }
    await page.evaluate(() => (window as any).__handle.setLocusMnemonic('b0_i0', 'A kettle wearing my sneakers'));
    await page.evaluate(() => (window as any).__handle.destroy());
    const pageErrors = await page.evaluate(() => (window as any).__events.errors);
    expect(pageErrors).toEqual([]);
    // three.js CDN sourcemap chatter is not ours; anything else is
    const ours = consoleErrors.filter((e) => !/sourcemap|favicon/i.test(e));
    expect(ours).toEqual([]);
  });
});
