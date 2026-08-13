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
 * it tests the code you just changed. The harness preloads the project-vendored
 * Three.js build, keeping real-WebGL validation deterministic and offline.
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
<script src="/vendor/three-r128/three.min.js"></script>
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
  window.__captureScene = function () {
    if (!window.THREE || window.__capturePatched) return;
    var OriginalRenderer = window.THREE.WebGLRenderer;
    function CapturingRenderer(parameters) {
      var renderer = new OriginalRenderer(parameters);
      var originalRender = renderer.render;
      renderer.render = function (scene, camera) { window.__lastScene = scene; window.__lastCamera = camera; return originalRender.apply(renderer, arguments); };
      return renderer;
    }
    CapturingRenderer.prototype = OriginalRenderer.prototype;
    try { Object.setPrototypeOf(CapturingRenderer, OriginalRenderer); } catch (e) {}
    window.THREE.WebGLRenderer = CapturingRenderer;
    window.__capturePatched = true;
  };
  window.__palaceVisualMetrics = function () {
    var out = { captions: [], roles: {} };
    if (!window.__lastScene) return out;
    window.__lastScene.traverse(function (o) {
      var role = o.userData && o.userData.visualRole;
      if (role) out.roles[role] = (out.roles[role] || 0) + 1;
      if (role === 'locus-caption') out.captions.push({ id: o.userData.locusId, width: o.userData.baseScale && o.userData.baseScale.x, height: o.userData.baseScale && o.userData.baseScale.y, typographyKey: o.userData.typographyKey, depthTest: o.material && o.material.depthTest, renderOrder: o.renderOrder, visible: o.visible });
    });
    return out;
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
  await page.evaluate(async () => {
    await (window as any).AlloModules.MemoryPalace.loadThree({});
    (window as any).__captureScene();
  });
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

  test('keeps multilingual captions bounded while rendering richer gallery depth', async ({ page }) => {
    const longData = {
      main: 'Multilingual memory gallery',
      branches: [
        { title: 'Long terms', items: ['Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(4)] },
        { title: '多言語', items: ['記憶の宮殿で学習内容を鮮明に整理して長期記憶へ結び付ける'.repeat(4)] },
      ],
    };
    await mount(page, longData);
    await page.evaluate(() => { document.body.classList.add('theme-contrast'); document.documentElement.style.fontSize = '24px'; (window as any).__handle.goTo(1); });
    await page.waitForTimeout(1200);
    const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
    expect(metrics.roles['sky-dome']).toBe(1);
    expect(metrics.roles['frame-molding']).toBe(8);
    expect(metrics.roles['frame-contact-shadow']).toBe(2);
    expect(metrics.roles['architectural-trim']).toBeGreaterThanOrEqual(12);
    expect(metrics.roles['directional-runner']).toBe(2);
    expect(metrics.roles['active-room-light']).toBe(1);
    expect(metrics.captions).toHaveLength(2);
    metrics.captions.forEach((caption: any) => {
      expect(caption.width).toBeGreaterThan(80);
      expect(caption.width).toBeLessThan(370);
      expect(caption.typographyKey).toMatch(/\|1$/);
      expect(caption.visible).toBe(true);
    });
    const active = metrics.captions.find((caption: any) => caption.id === 'b0_i0');
    const distant = metrics.captions.find((caption: any) => caption.id === 'b1_i0');
    expect(active.depthTest).toBe(false); expect(active.renderOrder).toBe(24);
    expect(distant.depthTest).toBe(true); expect(distant.renderOrder).toBe(12);
    expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
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

  test('keeps compact controls clear, accessible, zoomable, and wall-aware', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page);
    await page.evaluate(() => {
      const wrap = document.getElementById('wrap') as HTMLElement;
      wrap.style.width = '390px'; wrap.style.height = '640px';
      document.documentElement.style.fontSize = '24px';
    });
    await page.waitForTimeout(700);

    const wrap = page.locator('#wrap');
    const viewport = wrap.locator('[data-memory-palace-viewport]');
    await expect(viewport).toHaveAttribute('data-palace-layout', 'compact');
    const helpButton = viewport.locator('[data-palace-action="help"]');
    const routeButton = viewport.locator('[data-palace-action="route"]');
    const zoomIn = viewport.locator('[data-palace-action="zoom-in"]');
    const zoomOut = viewport.locator('[data-palace-action="zoom-out"]');
    const reset = viewport.locator('[data-palace-action="reset-view"]');
    for (const control of [helpButton, routeButton, zoomIn, zoomOut, reset]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await routeButton.click();
    const routePanel = viewport.locator('[data-palace-overlay="route"]');
    await expect(routePanel).toBeVisible();
    await helpButton.click();
    const helpPanel = viewport.locator('[data-palace-overlay="help"]');
    await expect(helpPanel).toBeVisible();
    await expect(routePanel).toBeHidden();
    await expect(helpButton).toHaveAttribute('aria-expanded', 'true');
    const panelBox = (await helpPanel.boundingBox())!;
    const dockBox = (await viewport.locator('[data-palace-overlay="dock"]').boundingBox())!;
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(dockBox.y - 2);

    await page.keyboard.press('Escape');
    await expect(helpPanel).toBeHidden();
    await expect(helpButton).toBeFocused();

    const baseFov = await page.evaluate(() => (window as any).__lastCamera.fov);
    await zoomIn.click();
    expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBeLessThan(baseFov);
    await zoomOut.click();
    await reset.click();
    expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(58);

    await page.evaluate(() => (window as any).__handle.goTo(1));
    const canvas = wrap.locator('canvas');
    await canvas.focus();
    await page.keyboard.down('w');
    await page.waitForTimeout(2200);
    const collisionState = await page.evaluate((data) => {
      const MP = (window as any).AlloModules.MemoryPalace;
      const palace = MP.buildPalace(data);
      const cue = document.querySelector('[data-palace-overlay="free-nav"]');
      return {
        local: MP.worldToRoomLocal(palace.rooms[1], (window as any).__lastCamera.position.x, (window as any).__lastCamera.position.z),
        blocked: cue?.getAttribute('data-blocked'),
        text: cue?.textContent || '',
      };
    }, SAMPLE);
    await page.keyboard.up('w');
    const clearance = -360 + 5 + 28;
    expect(collisionState.local.lz).toBeGreaterThanOrEqual(clearance - 0.2);
    expect(collisionState.blocked).toBe('true');
    expect(collisionState.text).toMatch(/Wall ahead/i);
    expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  });

});
