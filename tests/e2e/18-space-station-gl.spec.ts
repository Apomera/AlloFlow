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
    try { var c = window.__canvas(); if (c && c._issInteriorCleanup) c._issInteriorCleanup(); } catch (e) {}
    try { window.__root && window.__root.unmount(); } catch (e) {}
  };
</script></body></html>`;

// Seeds the tool onto its 3-D map tab with a module selected.
const SEED = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, orbitAlt: 420,
  seenModules: {}, seenHours: {}, mapView: 'overview', mapCutaway: false,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
};

const INTERIOR_SEED = {
  ...SEED,
  tab: 'interior', interiorView: '3d', interiorRoom: 'harmony',
  interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
  interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
  interiorGuided: true, interiorNav: { hatches: {}, collisions: 0, railGrabs: 0, railPushOffs: 0, looseHits: 0, cargoCatches: 0, cargoSecures: 0, capillaryAttempts: 0, capillaryUnderfills: 0, capillaryOverflows: 0, capillaryInterruptions: 0, capillaryTransfers: 0, worksiteAttempts: 0, worksiteReactions: 0, worksiteServices: 0, routeStep: 0 },
  lowGImpulse: 10, lowGResult: null,
  researchStep: 0, researchFeedback: '', researchErrors: 0,
  maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {},
  cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false,
  cupolaShutters: false, cupolaObservation: '',
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
  opts: { postFX?: boolean; reducedMotion?: boolean; failThree?: boolean } = {},
  seed: Record<string, unknown> = SEED,
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
  if (opts.failThree) {
    await page.evaluate(() => {
      (window as any).THREE = undefined;
      (window as any).StemLab.ensureThree = () => Promise.reject(new Error('forced WebGL dependency failure'));
    });
  }
  if (opts.postFX === false) {
    await page.evaluate(() => { (window as any).AlloPostFXEnabled = false; });
  }
  await page.addScriptTag({ url: '/stem_lab/stem_tool_spacestation.js' });
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.spaceStation);
  await page.evaluate((s) => (window as any).__mount(s), seed);
  await page.waitForSelector('#wrap canvas', { state: opts.failThree ? 'attached' : 'visible', timeout: 30000 });
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

test.describe('Space Station - real WebGL 3-D interior', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  });

  test('rehydrates route, visited-room, orientation, and crew-pose state across a diagram remount', async ({ page }) => {
    const progressedSeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'unity',
      interiorSeen: { harmony: true, destiny: true, unity: true },
      interiorNav: { ...INTERIOR_SEED.interiorNav, routeStep: 2, orientationRecovered: true },
    };
    await mount(page, { postFX: false, reducedMotion: true }, progressedSeed);

    async function waitForProgressedCanvas() {
      await page.waitForFunction(() => {
        const canvas = (window as any).__canvas?.();
        const state = canvas?._issInteriorState;
        return !!(canvas && state && state.room === 'unity' && canvas.getAttribute('data-iss-webgl') === 'ready');
      }, { timeout: 30000 });
    }
    async function readProgress() {
      return page.evaluate(() => {
        const canvas = (window as any).__canvas();
        const state = canvas._issInteriorState;
        return {
          props: {
            routeStep: canvas._issInteriorRouteStep,
            routeComplete: canvas._issInteriorRouteComplete,
            visited: canvas._issInteriorVisitedRooms,
            orientationDone: canvas._issInteriorOrientationDone,
          },
          state: {
            room: state.room,
            routeIndex: state.routeIndex,
            routeComplete: state.routeComplete,
            manualVisited: state.manualVisited,
            orientationDone: state.orientationDone,
            handPose: state.handPose,
          },
          handPoseAttribute: canvas.getAttribute('data-iss-hand-pose'),
        };
      });
    }

    await waitForProgressedCanvas();
    const expected = {
      props: {
        routeStep: 2,
        routeComplete: false,
        visited: { harmony: true, destiny: true, unity: true },
        orientationDone: true,
      },
      state: {
        room: 'unity',
        routeIndex: 2,
        routeComplete: false,
        manualVisited: { harmony: true, destiny: true, unity: true },
        orientationDone: true,
        handPose: 'tucked',
      },
      handPoseAttribute: 'tucked',
    };
    expect(await readProgress()).toMatchObject(expected);
    await expect(page.locator('[data-iss-interior-orientation]')).toBeVisible();
    await expect(page.locator('[data-iss-interior-route-progress]')).toContainText('3 / 5');

    await page.locator('[data-iss-interior-view="diagram"]').click();
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveCount(0);
    await page.locator('[data-iss-interior-view="3d"]').click();
    await waitForProgressedCanvas();

    expect(await readProgress()).toMatchObject(expected);
    await expect(page.locator('[data-iss-interior-orientation]')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('renders distinct, task-specific visuals in all five connected interior rooms', async ({ page }, testInfo) => {
    await mount(page, { postFX: false, reducedMotion: true }, INTERIOR_SEED);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      return !!(canvas && canvas._issInteriorState && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const rooms = [
      { id: 'harmony', hud: 'HARMONY // WAKE-UP', objective: 'STOW YOUR SLEEP STATION' },
      { id: 'destiny', hud: 'DESTINY // RESEARCH', objective: 'START A PLANT-WATER EXPERIMENT' },
      { id: 'unity', hud: 'UNITY // LOW-G PRACTICE', objective: 'CATCH AND SECURE A FLOATING CARGO POUCH' },
      { id: 'tranquility', hud: 'TRANQUILITY // MAINTENANCE', objective: 'RESTORE CABIN AIRFLOW' },
      { id: 'cupola', hud: 'CUPOLA // SHIFT CLOSEOUT', objective: 'SECURE THE CUPOLA FOR SLEEP' },
    ];
    const frames = new Map<string, Buffer>();

    for (const [roomIndex, room] of rooms.entries()) {
      const routeButton = page.locator('.iss-route-button').nth(roomIndex);
      await routeButton.click();
      await expect(routeButton).toHaveAttribute('aria-pressed', 'true');
      await page.waitForFunction((roomId) =>
        (window as any).__canvas?.()?._issInteriorState?.room === roomId, room.id, { timeout: 30000 });
      await expect(page.locator('[data-iss-interior-room-hud]')).toHaveText(room.hud);
      await expect(page.locator('[data-iss-interior-objective]')).toContainText(room.objective);
      await page.evaluate(() => new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const frame = await page.locator('[data-iss-interior-canvas]').screenshot({
        path: testInfo.outputPath('interior-' + room.id + '.png'),
      });
      expect(frame.length).toBeGreaterThan(2000);
      frames.set(room.id, frame);
    }

    const harmonyFrame = frames.get('harmony');
    expect(harmonyFrame).toBeDefined();
    for (const room of rooms.slice(1)) {
      expect(Buffer.compare(frames.get(room.id)!, harmonyFrame!)).not.toBe(0);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('catches and rail-secures all three Harmony cabin items, clearing airflow and persisting completion', async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const harmonySeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'harmony',
      interiorSeen: { harmony: true },
      interiorNav: {
        ...INTERIOR_SEED.interiorNav,
        flightRoom: 'harmony',
        routeStep: 0,
        stowAttempts: 0,
        stowCatches: 0,
        stowSecures: 0,
        stowWarnings: 0,
        stowComplete: false,
        stowItems: {},
      },
      cabinStow: {},
    };
    await mount(page, { postFX: false, reducedMotion: true }, harmonySeed);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'harmony' &&
        Array.isArray(state.stowSceneItems) && state.stowSceneItems.length === 3 &&
        canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    const stowButton = page.locator('[data-iss-interior-stow-action]');
    const stowReadout = page.locator('[data-iss-interior-stow-readout]');
    const airflow = page.locator('[data-iss-interior-cabin-airflow]');
    const stowChallenge = page.locator('[data-iss-nav-challenge="stow"]');
    const grabButton = page.locator('[data-iss-interior-grab]');
    const flightLog = page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' });

    const itemContract = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      return canvas._issInteriorState.stowSceneItems.map((item: any) => ({
        id: item.id,
        mode: item.mode,
        hasPosition: !!item.position?.isVector3,
        hasVelocity: !!item.velocity?.isVector3,
        hasRestraint: !!item.securePoint?.isVector3,
      }));
    });
    expect(itemContract).toEqual([
      { id: 'bag', mode: 'loose', hasPosition: true, hasVelocity: true, hasRestraint: true },
      { id: 'tablet', mode: 'loose', hasPosition: true, hasVelocity: true, hasRestraint: true },
      { id: 'cloth', mode: 'loose', hasPosition: true, hasVelocity: true, hasRestraint: true },
    ]);

    // The washcloth begins close enough to obstruct the air return, making the
    // hazard visible before the learner clears it. Reduced motion keeps the
    // visual stable but does not disable the cabin physics or safety monitor.
    await expect(airflow).toHaveAttribute('data-state', 'blocked');
    await expect(airflow).toContainText('Airflow blocked');
    await expect(stowChallenge).not.toHaveClass(/is-complete/);
    await expect(flightLog).toContainText('1 airflow warnings');
    const blockedFrame = await canvas.screenshot({ path: testInfo.outputPath('harmony-airflow-blocked.png') });
    expect(blockedFrame.length).toBeGreaterThan(2000);

    await page.evaluate(() => { (window as any).__harmonyStowEvents = []; });
    async function armStowRecorder() {
      await page.evaluate(() => {
        const canvas = (window as any).__canvas();
        const priorHandler = canvas._issInteriorEvent;
        canvas._issInteriorEvent = (event: any) => {
          if (event && String(event.type || '').startsWith('stow-')) {
            (window as any).__harmonyStowEvents.push({ ...event });
          }
          if (typeof priorHandler === 'function') priorHandler(event);
        };
      });
    }

    async function positionForCatch(itemId: string, relativeSpeed: number) {
      return page.evaluate(({ itemId, relativeSpeed }) => {
        const canvas = (window as any).__canvas();
        const state = canvas._issInteriorState;
        const item = state.stowSceneItems.find((candidate: any) => candidate.id === itemId);
        if (!item) throw new Error('Missing Harmony stow item: ' + itemId);
        state.room = 'harmony';
        state.railHeld = false;
        // Put both bodies well inside Harmony's cylindrical hull. Some loose
        // item trajectories legitimately skim an endcap, while the crew's
        // larger collision radius would be clamped away before the key press.
        state.position.set(0, 0, -11);
        state.railAnchor.copy(state.position);
        item.position.set(0.28, 0, -11);
        state.velocity.copy(item.velocity);
        state.velocity.x += relativeSpeed;
        state.angularVelocity = 0;
        return {
          distance: state.position.distanceTo(item.position),
          relativeSpeed: state.velocity.clone().sub(item.velocity).length(),
        };
      }, { itemId, relativeSpeed });
    }

    async function pressStowKey() {
      await armStowRecorder();
      await canvas.focus();
      await page.keyboard.press('x');
    }

    // Reach alone is unsafe. A 0.31 m/s velocity mismatch must reject the
    // nearest catch and leave all canonical item modes unchanged.
    const unsafeSetup = await positionForCatch('cloth', 0.31);
    expect(unsafeSetup.distance).toBeLessThanOrEqual(0.65);
    expect(unsafeSetup.relativeSpeed).toBeGreaterThan(0.2);
    await expect(stowButton).toHaveAttribute('data-iss-interior-stow-item', 'cloth');
    await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'match-motion');
    await pressStowKey();
    await expect(page.locator('[data-iss-interior-event]')).toContainText('MATCH ITEM MOTION');
    const rejected = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        held: state.stowHeldId,
        attempts: state.stowAttempts,
        catches: state.stowCatches,
        secures: state.stowSecures,
        modes: { ...state.stowItems },
      };
    });
    expect(rejected).toEqual({
      held: null,
      attempts: 1,
      catches: 0,
      secures: 0,
      modes: { bag: 'loose', tablet: 'loose', cloth: 'loose' },
    });

    async function catchItem(itemId: string, expectedAttempts: number) {
      const setup = await positionForCatch(itemId, 0.08);
      expect(setup.distance).toBeLessThanOrEqual(0.65);
      expect(setup.relativeSpeed).toBeLessThanOrEqual(0.2);
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-item', itemId);
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'ready-catch');
      await pressStowKey();
      await page.waitForFunction(({ itemId, expectedAttempts }) => {
        const state = (window as any).__canvas()._issInteriorState;
        return state.stowHeldId === itemId && state.stowAttempts === expectedAttempts;
      }, { itemId, expectedAttempts });
      await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'stow');
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-item', itemId);
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'unbraced');
      const caught = await page.evaluate((itemId) => {
        const state = (window as any).__canvas()._issInteriorState;
        const item = state.stowSceneItems.find((candidate: any) => candidate.id === itemId);
        return { held: state.stowHeldId, mode: item.mode, catches: state.stowCatches };
      }, itemId);
      expect(caught).toMatchObject({ held: itemId, mode: 'held' });
    }

    async function moveToRestraint(itemId: string) {
      return page.evaluate((itemId) => {
        const state = (window as any).__canvas()._issInteriorState;
        const item = state.stowSceneItems.find((candidate: any) => candidate.id === itemId);
        if (!item) throw new Error('Missing Harmony restraint: ' + itemId);
        state.position.copy(item.securePoint);
        state.railAnchor.copy(state.position);
        state.velocity.set(0, 0, 0);
        state.angularVelocity = 0;
        state.railHeld = false;
        return state.position.distanceTo(item.securePoint);
      }, itemId);
    }

    async function secureHeldItem(itemId: string, expectedCount: number, expectedAttempts: number) {
      expect(await moveToRestraint(itemId)).toBeLessThanOrEqual(0.001);
      await grabButton.click();
      await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.railHeld === true);
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'ready-secure');
      await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'stow-braced');
      await pressStowKey();
      await page.waitForFunction(({ itemId, expectedCount, expectedAttempts }) => {
        const state = (window as any).__canvas()._issInteriorState;
        const item = state.stowSceneItems.find((candidate: any) => candidate.id === itemId);
        return item?.mode === 'secured' && state.stowSecures === expectedCount && state.stowAttempts === expectedAttempts;
      }, { itemId, expectedCount, expectedAttempts });
      await expect(stowButton).toHaveAttribute('data-iss-interior-stow-count', String(expectedCount));
      if (expectedCount < 3) {
        await grabButton.click();
        await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.railHeld === false);
      }
    }

    await catchItem('cloth', 2);
    await expect(airflow).toHaveAttribute('data-state', 'risk');

    // Being at the correct restraint is still insufficient without a stable
    // handrail brace. This attempt must retain the carried hand pose and item.
    expect(await moveToRestraint('cloth')).toBeLessThanOrEqual(0.001);
    await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'unbraced');
    await pressStowKey();
    await expect(page.locator('[data-iss-interior-event]')).toContainText('BRACE + STOP');
    expect(await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return { held: state.stowHeldId, secures: state.stowSecures, attempts: state.stowAttempts };
    })).toEqual({ held: 'cloth', secures: 0, attempts: 3 });
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'stow');

    await secureHeldItem('cloth', 1, 4);
    await catchItem('bag', 5);
    await secureHeldItem('bag', 2, 6);
    await catchItem('tablet', 7);
    await secureHeldItem('tablet', 3, 8);

    const completed = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const events = (window as any).__harmonyStowEvents || [];
      return {
        complete: state.stowComplete,
        airflow: state.stowAirflowState,
        held: state.stowHeldId,
        attempts: state.stowAttempts,
        catches: state.stowCatches,
        secures: state.stowSecures,
        modes: state.stowSceneItems.map((item: any) => [item.id, item.mode]),
        caughtItems: events.filter((event: any) => event.type === 'stow-caught').map((event: any) => event.item),
        securedItems: events.filter((event: any) => event.type === 'stow-secured').map((event: any) => event.item),
        completionEvents: events.filter((event: any) => event.type === 'stow-complete'),
        cabinCompleteProp: canvas._issInteriorCabinComplete,
        persistedItemsProp: { ...canvas._issInteriorStowItems },
      };
    });
    expect(completed).toMatchObject({
      complete: true,
      airflow: 'clear',
      held: null,
      attempts: 8,
      catches: 3,
      secures: 3,
      modes: [['bag', 'secured'], ['tablet', 'secured'], ['cloth', 'secured']],
      caughtItems: ['cloth', 'bag', 'tablet'],
      securedItems: ['cloth', 'bag', 'tablet'],
      cabinCompleteProp: true,
      persistedItemsProp: { bag: 'secured', tablet: 'secured', cloth: 'secured' },
    });
    expect(completed.completionEvents).toHaveLength(1);
    expect(completed.completionEvents[0]).toMatchObject({
      type: 'stow-complete', room: 'harmony', count: 3, attempt: 8, source: '3d',
    });
    await expect(airflow).toHaveAttribute('data-state', 'clear');
    await expect(airflow).toContainText('Airflow clear');
    await expect(stowButton).toHaveAttribute('data-iss-interior-stow-status', 'complete');
    await expect(stowButton).toHaveAttribute('data-iss-interior-stow-count', '3');
    await expect(stowButton).toBeDisabled();
    await expect(stowReadout).toContainText('Three of three items secured');
    await expect(stowChallenge).toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-interior-objective]')).toContainText('ACTIVITY COMPLETE');
    await expect(flightLog).toContainText('3 cabin items caught');
    await expect(flightLog).toContainText('3 cabin items secured');

    const clearFrame = await canvas.screenshot({ path: testInfo.outputPath('harmony-airflow-clear.png') });
    expect(clearFrame.length).toBeGreaterThan(2000);
    expect(Buffer.compare(blockedFrame, clearFrame)).not.toBe(0);

    // Diagram mode consumes the same canonical completion, then the 3-D
    // remount must restore all item modes, counts, airflow, and job status.
    await page.locator('[data-iss-interior-view="diagram"]').click();
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveCount(0);
    await expect(page.locator('[data-iss-cabin-stow]')).toContainText('Morning stow logged');
    await page.locator('[data-iss-interior-view="3d"]').click();
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'harmony' && state.stowComplete &&
        state.stowSceneItems?.every((item: any) => item.mode === 'secured') &&
        canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const restored = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        complete: state.stowComplete,
        airflow: state.stowAirflowState,
        attempts: state.stowAttempts,
        catches: state.stowCatches,
        secures: state.stowSecures,
        modes: state.stowSceneItems.map((item: any) => [item.id, item.mode]),
      };
    });
    expect(restored).toEqual({
      complete: true,
      airflow: 'clear',
      attempts: 8,
      catches: 3,
      secures: 3,
      modes: [['bag', 'secured'], ['tablet', 'secured'], ['cloth', 'secured']],
    });
    await expect(stowButton).toBeDisabled();
    await expect(airflow).toHaveAttribute('data-state', 'clear');
    await expect(stowChallenge).toHaveClass(/is-complete/);

    // Terminal keyboard input is idempotent: it cannot increment attempts,
    // emit another completion, or reopen any item after the remount.
    const beforeTerminal = await page.evaluate(() => {
      (window as any).__terminalStowEvents = [];
      const canvas = (window as any).__canvas();
      const priorHandler = canvas._issInteriorEvent;
      canvas._issInteriorEvent = (event: any) => {
        if (event && String(event.type || '').startsWith('stow-')) {
          (window as any).__terminalStowEvents.push({ ...event });
        }
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      const state = canvas._issInteriorState;
      return { attempts: state.stowAttempts, catches: state.stowCatches, secures: state.stowSecures };
    });
    await canvas.focus();
    await page.keyboard.press('x');
    const afterTerminal = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        attempts: state.stowAttempts,
        catches: state.stowCatches,
        secures: state.stowSecures,
        complete: state.stowComplete,
        modes: state.stowSceneItems.map((item: any) => item.mode),
        events: (window as any).__terminalStowEvents,
      };
    });
    expect(afterTerminal).toEqual({
      ...beforeTerminal,
      complete: true,
      modes: ['secured', 'secured', 'secured'],
      events: [],
    });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('clips a bulky bag through the Harmony-Destiny hatch, cancels teleports, catches one rim strike, and restores the docked transfer', async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const transferSeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'harmony',
      interiorSeen: { harmony: true },
      interiorNav: {
        ...INTERIOR_SEED.interiorNav,
        flightRoom: 'harmony',
        transferAttempts: 0,
        transferContacts: 0,
        transferCompletions: 0,
        transferComplete: false,
        routeStep: 0,
      },
    };
    await mount(page, { postFX: false, reducedMotion: true }, transferSeed);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'harmony' &&
        state.transferPosition?.isVector3 && state.transferVelocity?.isVector3 &&
        state.transferBagObject && state.transferTether && state.transferClearanceCue &&
        typeof canvas._issInteriorTransferAction === 'function' &&
        canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    const action = page.locator('[data-iss-interior-transfer-action]');
    const readout = page.locator('[data-iss-interior-transfer-readout]');
    const challenge = page.locator('[data-iss-nav-challenge="transfer"]');
    await expect(action).toBeVisible();
    await expect(action).toHaveAttribute('aria-keyshortcuts', 'B');
    await expect(readout).toHaveCount(1);
    await expect(readout).toContainText(/staged/i);
    await expect(challenge).not.toHaveClass(/is-complete/);

    // Keep observing the callback when React replaces it after persisted events.
    await page.evaluate(() => {
      (window as any).__hatchTransferEvents = [];
      const canvas = (window as any).__canvas();
      let handler = canvas._issInteriorEvent;
      const dispatch = (event: any) => {
        if (event && String(event.type || '').startsWith('transfer-')) {
          (window as any).__hatchTransferEvents.push({ ...event });
        }
        if (typeof handler === 'function') handler(event);
      };
      Object.defineProperty(canvas, '_issInteriorEvent', {
        configurable: true,
        get: () => dispatch,
        set: (next) => { if (next !== dispatch) handler = next; },
      });
    });

    // The room is already Harmony from the persisted flight checkpoint. The
    // test never assigns state.room; production transitions own every crossing.
    await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      state.position.copy(state.transferPosition);
      state.railAnchor.copy(state.position);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
    });
    await expect(action).toHaveAttribute('data-iss-interior-transfer-status', 'ready');
    const readyVisual = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const torusRadii = state.transferBagObject.children
        .map((child: any) => Number(child.geometry?.parameters?.radius))
        .filter((radius: number) => Number.isFinite(radius));
      return {
        mode: state.transferMode,
        bag: state.transferBagObject.visible,
        tether: state.transferTether.visible,
        cue: state.transferClearanceCue.visible,
        color: state.transferClearanceCue.material.color.getHex(),
        clearanceRadius: Number(state.transferClearanceCue.geometry.parameters.radius),
        envelopeRadius: Math.max(...torusRadii),
      };
    });
    expect(readyVisual).toMatchObject({ mode: 'staged', bag: true, tether: false, cue: true });
    expect(readyVisual.clearanceRadius).toBeCloseTo(0.70, 6);
    expect(readyVisual.envelopeRadius).toBeCloseTo(0.47, 6);
    expect(readyVisual.color).toBeGreaterThan(0);
    const readyFrame = await canvas.screenshot({ path: testInfo.outputPath('hatch-transfer-ready.png') });

    await canvas.focus();
    await page.keyboard.press('b');
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.transferMode === 'tethered' && state.transferAttempts === 1;
    });
    await expect(action).toHaveAttribute('data-iss-interior-transfer-status', 'tethered');
    const tetheredVisual = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        tether: state.transferTether.visible,
        cue: state.transferClearanceCue.visible,
        color: state.transferClearanceCue.material.color.getHex(),
      };
    });
    expect(tetheredVisual).toMatchObject({ tether: true, cue: true });
    expect(tetheredVisual.color).not.toBe(readyVisual.color);
    const tetheredFrame = await canvas.screenshot({ path: testInfo.outputPath('hatch-transfer-tethered.png') });
    expect(readyFrame.length).toBeGreaterThan(2000);
    expect(tetheredFrame.length).toBeGreaterThan(2000);
    expect(Buffer.compare(readyFrame, tetheredFrame)).not.toBe(0);

    // A 3-D route-button teleport is not a valid way to carry a tethered bag.
    // It cancels the attempt and preserves contact/completion counters.
    await page.locator('[data-iss-interior-room-select="destiny"]').click();
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.room === 'destiny' && state.transferMode === 'staged' &&
        state.transferOutcome === 'cancelled';
    }, null, { timeout: 10000 });
    const cancelled = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__hatchTransferEvents || [];
      return {
        room: state.room, mode: state.transferMode, outcome: state.transferOutcome,
        attempts: state.transferAttempts, contacts: state.transferContacts,
        completions: state.transferCompletions, complete: state.transferComplete,
        bodyCrossed: state.transferBodyCrossed, bagCrossed: state.transferBagCrossed,
        bagZ: state.transferPosition.z, bagSpeed: state.transferVelocity.length(),
        cancelledEvents: events.filter((event: any) => event.type === 'transfer-cancelled'),
      };
    });
    expect(cancelled).toMatchObject({
      room: 'destiny', mode: 'staged', outcome: 'cancelled', attempts: 1,
      contacts: 0, completions: 0, complete: false,
      bodyCrossed: false, bagCrossed: false, bagSpeed: 0,
    });
    expect(cancelled.bagZ).toBeLessThan(-8.45);
    expect(cancelled.cancelledEvents).toHaveLength(1);
    expect(cancelled.cancelledEvents[0]).toMatchObject({
      type: 'transfer-cancelled', room: 'harmony', to: 'destiny', attempt: 1, source: '3d',
    });
    await expect(readout).toContainText(/cancelled/i);
    await expect(challenge).not.toHaveClass(/is-complete/);

    await page.locator('[data-iss-interior-room-select="harmony"]').click();
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.room === 'harmony');
    const clippedAfterCancellation = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.position.copy(state.transferPosition);
      state.railAnchor.copy(state.position);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
      return canvas._issInteriorTransferAction();
    });
    expect(clippedAfterCancellation).toBe(true);
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.transferMode === 'tethered' && state.transferAttempts === 2;
    });

    // The body makes a real centered swept crossing and production changes the
    // room. The off-axis bag then makes its own sweep and strikes the 0.70 m ring.
    await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      state.position.set(0.18, 0, -8.46);
      state.transferPreviousBodyPosition.copy(state.position);
      state.velocity.set(0, 0, 0.78);
      state.angularVelocity = 0;
      state.railHeld = false;
    });
    await page.waitForFunction((bagX) => {
      const state = (window as any).__canvas()._issInteriorState;
      if (state.room !== 'destiny' || !state.transferBodyCrossed ||
          state.transferBagCrossed || state.transferComplete || state.transferMode !== 'tethered') return false;
      state.velocity.set(0, 0, 0);
      state.transferPosition.set(bagX, 0, -8.46);
      state.transferPreviousBagPosition.copy(state.transferPosition);
      state.transferPreviousZ = -8.46;
      state.transferVelocity.set(0, 0, 1.25);
      return true;
    }, 0.76, { timeout: 30000 });
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.transferContacts === 1 && state.transferMode === 'staged' && state.room === 'harmony';
    }, null, { timeout: 30000 });
    await expect(action).toHaveAttribute('data-iss-interior-transfer-status', 'contact');
    const contact = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__hatchTransferEvents || [];
      return {
        room: state.room,
        mode: state.transferMode,
        attempts: state.transferAttempts,
        contacts: state.transferContacts,
        completions: state.transferCompletions,
        complete: state.transferComplete,
        speed: state.transferVelocity.length(),
        tether: state.transferTether.visible,
        cue: state.transferClearanceCue.visible,
        color: state.transferClearanceCue.material.color.getHex(),
        contactEvents: events.filter((event: any) => event.type === 'transfer-contact'),
      };
    });
    expect(contact).toMatchObject({
      room: 'harmony', mode: 'staged', attempts: 2, contacts: 1,
      completions: 0, complete: false, speed: 0,
      tether: false, cue: true,
    });
    expect(contact.color).not.toBe(readyVisual.color);
    expect(contact.color).not.toBe(tetheredVisual.color);
    expect(contact.contactEvents).toHaveLength(1);
    expect(contact.contactEvents[0]).toMatchObject({
      type: 'transfer-contact', room: 'destiny', attempt: 2, contact: 1,
      culprit: 'bag', safeRadius: 0.70, source: '3d',
    });
    expect(contact.contactEvents[0].bodyCrossingRadius).toBeLessThanOrEqual(0.70);
    expect(contact.contactEvents[0].bagCrossingRadius).toBeGreaterThan(0.70);
    await expect(challenge).not.toHaveClass(/is-complete/);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__hatchTransferEvents || [];
      return [state.transferContacts, events.filter((event: any) => event.type === 'transfer-contact').length];
    })).toEqual([1, 1]);

    // Reclip, then make independent centered body and bag sweeps. No test-only
    // room assignment is used to unlock completion.
    const clippedAgain = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.position.copy(state.transferPosition);
      state.railAnchor.copy(state.position);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      return canvas._issInteriorTransferAction();
    });
    expect(clippedAgain).toBe(true);
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.transferMode === 'tethered' && state.transferAttempts === 3;
    });
    await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      state.position.set(0.16, 0, -8.46);
      state.transferPreviousBodyPosition.copy(state.position);
      state.velocity.set(0, 0, 0.78);
      state.angularVelocity = 0;
      state.railHeld = false;
    });
    await page.waitForFunction((bagX) => {
      const state = (window as any).__canvas()._issInteriorState;
      if (state.room !== 'destiny' || !state.transferBodyCrossed ||
          state.transferBagCrossed || state.transferComplete || state.transferMode !== 'tethered') return false;
      state.velocity.set(0, 0, 0);
      state.transferPosition.set(bagX, 0, -8.46);
      state.transferPreviousBagPosition.copy(state.transferPosition);
      state.transferPreviousZ = -8.46;
      state.transferVelocity.set(0, 0, 1.25);
      return true;
    }, 0.24, { timeout: 30000 });
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.transferComplete && state.transferMode === 'docked' && state.transferCompletions === 1;
    }, null, { timeout: 30000 });

    const completed = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__hatchTransferEvents || [];
      return {
        room: state.room,
        mode: state.transferMode,
        attempts: state.transferAttempts,
        contacts: state.transferContacts,
        completions: state.transferCompletions,
        complete: state.transferComplete,
        position: { x: state.transferPosition.x, y: state.transferPosition.y, z: state.transferPosition.z },
        speed: state.transferVelocity.length(),
        tether: state.transferTether.visible,
        cue: state.transferClearanceCue.visible,
        color: state.transferClearanceCue.material.color.getHex(),
        completeEvents: events.filter((event: any) => event.type === 'transfer-complete'),
        eventTypes: events.map((event: any) => event.type),
      };
    });
    expect(completed).toMatchObject({
      room: 'destiny', mode: 'docked', attempts: 3, contacts: 1,
      completions: 1, complete: true, speed: 0,
      tether: false, cue: true,
    });
    expect(completed.color).not.toBe(contact.color);
    expect(completed.color).not.toBe(tetheredVisual.color);
    expect(completed.completeEvents).toHaveLength(1);
    expect(completed.completeEvents[0]).toMatchObject({
      type: 'transfer-complete', room: 'destiny', attempt: 3, completion: 1,
      safeRadius: 0.70, source: '3d',
    });
    expect(completed.completeEvents[0].bodyCrossingRadius).toBeLessThanOrEqual(0.70);
    expect(completed.completeEvents[0].bagCrossingRadius).toBeLessThanOrEqual(0.70);
    expect(completed.eventTypes).toEqual([
      'transfer-attempt', 'transfer-cancelled', 'transfer-attempt',
      'transfer-contact', 'transfer-attempt', 'transfer-complete',
    ]);
    expect(completed.position.z).toBeGreaterThan(-8.45);
    await expect(action).toHaveAttribute('data-iss-interior-transfer-status', 'complete');
    await expect(challenge).toHaveClass(/is-complete/);
    await expect(readout).toContainText(/docked/i);
    const dockedFrame = await canvas.screenshot({ path: testInfo.outputPath('hatch-transfer-docked.png') });
    expect(dockedFrame.length).toBeGreaterThan(2000);
    expect(Buffer.compare(tetheredFrame, dockedFrame)).not.toBe(0);

    // The accessible diagram opens at the saved Destiny flight room. Browsing
    // its Harmony transfer card still cannot move that physical checkpoint.
    await page.locator('[data-iss-interior-view="diagram"]').click();
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveCount(0);
    await expect(page.locator('.iss-route-button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.iss-route-button').first().click();
    await expect(page.locator('.iss-route-button').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-iss-hatch-transfer-diagram]')).toBeVisible();
    for (const choice of ['aligned', 'body-only', 'pull-hard']) {
      await expect(page.locator('[data-iss-hatch-transfer-choice="' + choice + '"]')).toBeVisible();
    }
    await page.locator('[data-iss-interior-view="3d"]').click();
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'destiny' && state.transferComplete &&
        state.transferMode === 'docked' && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });
    const restored = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        room: state.room,
        mode: state.transferMode,
        attempts: state.transferAttempts,
        contacts: state.transferContacts,
        completions: state.transferCompletions,
        complete: state.transferComplete,
        z: state.transferPosition.z,
        tether: state.transferTether.visible,
        cue: state.transferClearanceCue.visible,
        color: state.transferClearanceCue.material.color.getHex(),
      };
    });
    expect(restored).toMatchObject({
      room: 'destiny', mode: 'docked', attempts: 3, contacts: 1,
      completions: 1, complete: true, tether: false, cue: true,
    });
    expect(restored.color).toBe(completed.color);
    expect(restored.z).toBeGreaterThan(-8.45);
    await expect(action).toHaveAttribute('data-iss-interior-transfer-status', 'complete');
    await expect(challenge).toHaveClass(/is-complete/);

    // Terminal state rejects the action and ignores a stale swept crossing.
    const terminal = await page.evaluate(async () => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const events: any[] = [];
      const handler = canvas._issInteriorEvent;
      canvas._issInteriorEvent = (event: any) => {
        if (event && String(event.type || '').startsWith('transfer-')) events.push({ ...event });
        if (typeof handler === 'function') handler(event);
      };
      const accepted = canvas._issInteriorTransferAction();
      state.transferPreviousBodyPosition.set(0, 0, -8.50);
      state.position.set(0, 0, -8.40);
      state.transferPreviousBagPosition.set(0, 0, -8.50);
      state.transferPosition.set(0, 0, -8.40);
      state.transferVelocity.set(0, 0, 1.2);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return {
        accepted,
        mode: state.transferMode,
        attempts: state.transferAttempts,
        contacts: state.transferContacts,
        completions: state.transferCompletions,
        complete: state.transferComplete,
        events,
      };
    });
    expect(terminal).toEqual({
      accepted: false, mode: 'docked', attempts: 3, contacts: 1,
      completions: 1, complete: true, events: [],
    });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    expect(testInfo.retry).toBe(0);
  });

  test('models push controls, drag-free coasting, handrail reach, and teardown', async ({ page }) => {
    await mount(page, { postFX: false, reducedMotion: true }, INTERIOR_SEED);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      return !!(canvas && canvas._issInteriorState && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    await canvas.focus();
    await expect(page.locator('.iss-interior-route-map')).toBeVisible();
    await expect(page.locator('.iss-route-schematic')).toBeVisible();
    await expect(page.locator('[data-iss-interior-objective]')).toContainText('CURRENT ACTIVITY');
    await expect(page.locator('[data-iss-interior-next-label]')).toContainText('DESTINY');
    await expect(page.locator('[data-iss-next-maneuver]')).toBeVisible();
    await expect(page.locator('[data-iss-interior-mode]')).toHaveText('STATIONARY');
    const grabButton = page.locator('[data-iss-interior-grab]');
    expect(await grabButton.evaluate((button) =>
      ({ disabled: (button as HTMLButtonElement).disabled, tabIndex: (button as HTMLButtonElement).tabIndex }))).toEqual({ disabled: false, tabIndex: 0 });
    await expect(grabButton).toHaveAttribute('aria-disabled', 'true');
    const start = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return { x: state.position.x, y: state.position.y, z: state.position.z };
    });

    const motionSample = await page.evaluate(async () => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      canvas._issInteriorSetControl('forward', true);
      await new Promise<void>((resolve) => {
        const check = () => {
          if (state.velocity.length() >= 0.18) {
            canvas._issInteriorSetControl('forward', false);
            resolve();
          } else requestAnimationFrame(check);
        };
        check();
      });
      await nextFrame();
      const coasting = {
        position: { x: state.position.x, y: state.position.y, z: state.position.z },
        speed: state.velocity.length(), mode: state.mode,
        motionGuideVisible: state.motionGuideVisible, brakingCue: state.brakingCue,
      };
      await new Promise<void>((resolve) => {
        const check = () => {
          if (Math.hypot(state.position.x - coasting.position.x, state.position.y - coasting.position.y, state.position.z - coasting.position.z) > 0.02) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
      return {
        coasting,
        later: {
          position: { x: state.position.x, y: state.position.y, z: state.position.z },
          speed: state.velocity.length(),
        },
      };
    });
    const { coasting, later } = motionSample;
    expect(Math.hypot(coasting.position.x - start.x, coasting.position.y - start.y, coasting.position.z - start.z)).toBeGreaterThan(0.03);
    expect(coasting.speed).toBeGreaterThan(0.12);
    expect(coasting.mode).toContain('COASTING');
    expect(coasting.motionGuideVisible).toBe(true);
    expect(coasting.brakingCue).not.toContain('NO DRIFT');
    await expect(page.locator('[data-iss-interior-braking]')).not.toContainText('NO DRIFT');
    expect(Math.hypot(later.position.x - coasting.position.x, later.position.y - coasting.position.y, later.position.z - coasting.position.z)).toBeGreaterThan(0.02);
    expect(Math.abs(later.speed - coasting.speed)).toBeLessThan(0.015);

    // Roll input applies torque rather than directly setting attitude. Once the
    // control is released, angular momentum persists until counter-torque or a rail catch.
    const spin = await page.evaluate(async () => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      canvas.focus();
      canvas._issInteriorSetControl('rollLeft', true);
      await new Promise<void>((resolve) => {
        const check = () => {
          if (Math.abs(state.angularVelocity) >= 0.18) {
            canvas._issInteriorSetControl('rollLeft', false);
            resolve();
          } else requestAnimationFrame(check);
        };
        check();
      });
      const start = { roll: state.roll, rate: state.angularVelocity };
      await new Promise<void>((resolve) => {
        const check = () => {
          if (Math.abs(state.roll - start.roll) > 0.03) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
      return { start, later: { roll: state.roll, rate: state.angularVelocity, mode: state.mode } };
    });
    expect(Math.abs(spin.start.rate)).toBeGreaterThan(0.1);
    expect(Math.abs(spin.later.rate - spin.start.rate)).toBeLessThan(0.02);
    expect(Math.abs(spin.later.roll - spin.start.roll)).toBeGreaterThan(0.03);
    expect(spin.later.mode).toContain('ROTATING');

    // Space only catches a real handrail within reach. Reset and click in one
    // page task so scheduler delays cannot carry the fixture into another module.
    const rejected = await grabButton.evaluate((button) => {
      const state = (window as any).__canvas()._issInteriorState;
      state.room = 'harmony';
      state.position.set(0, 0, -11);
      state.velocity.set(0, 0, 0.21);
      state.mode = 'COASTING + ROTATING // NO DRAG';
      (button as HTMLButtonElement).focus();
      (button as HTMLButtonElement).click();
      return { speed: state.velocity.length(), mode: state.mode, railGrabs: state.railGrabs };
    });
    await expect(grabButton).toBeFocused();
    expect(rejected.speed).toBeGreaterThan(0.12);
    expect(rejected.mode).toContain('COASTING');
    expect(rejected.railGrabs).toBe(0);
    await expect(page.locator('[data-iss-nav-challenge="rail"]')).not.toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-interior-event]')).toContainText('RAIL OUT OF REACH');
    await expect(page.locator('[data-iss-interior-status]')).toContainText('No handrail within reach');

    // Move beside the physical Harmony handrail and give the avatar a
    // controlled 0.21 m/s coast. The catch should now stop motion and score.
    const stopped = await canvas.evaluate(async (node) => {
      const state = (window as any).__canvas()._issInteriorState;
      state.position.set(1.08, -0.99, -12.2);
      state.velocity.set(0, 0, -0.21);
      state.mode = 'COASTING // NO DRAG';
      state.angularVelocity = 0.16;
      (node as HTMLCanvasElement).focus();
      node.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
      const immediate = { speed: state.velocity.length(), angularSpeed: Math.abs(state.angularVelocity), mode: state.mode, railGrabs: state.railGrabs };
      await new Promise<void>((resolve) => {
        let frames = 0;
        const check = () => ++frames >= 8 ? resolve() : requestAnimationFrame(check);
        requestAnimationFrame(check);
      });
      const liveCanvas = (window as any).__canvas();
      const liveState = liveCanvas._issInteriorState;
      const liveControl = document.querySelector('[data-iss-interior-grab]');
      return Object.assign(immediate, {
        settled: {
          sameCanvas: liveCanvas === node,
          railHeld: liveState.railHeld,
          mode: liveState.mode,
          position: { x: liveState.position.x, y: liveState.position.y, z: liveState.position.z },
          control: liveControl ? {
            label: liveControl.textContent,
            ariaDisabled: liveControl.getAttribute('aria-disabled'),
          } : null,
        },
      });
    });
    expect(stopped.settled).toMatchObject({ sameCanvas: true, railHeld: true, mode: 'RAIL HOLD' });
    expect(stopped.settled.position).toEqual({ x: 1.08, y: -0.99, z: -12.2 });
    expect(stopped.settled.control).toEqual({ label: 'Release handrail', ariaDisabled: 'false' });
    await expect(grabButton).toBeEnabled();
    await expect(grabButton).toHaveAttribute('aria-disabled', 'false');
    expect(stopped.speed).toBeLessThan(0.001);
    expect(stopped.angularSpeed).toBeLessThan(0.001);
    expect(stopped.mode).toBe('RAIL HOLD');
    expect(stopped.railGrabs).toBe(1);
    await expect(page.locator('[data-iss-nav-challenge="rail"]')).toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-interior-event]')).toContainText('CONTROLLED RAIL CATCH');

    // A glancing hull contact reflects only the normal component and preserves
    // tangential motion along the wall, instead of reversing the whole velocity.
    await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const priorHandler = canvas._issInteriorEvent;
      (window as any).__interiorCollisionBefore = state.collisions;
      (window as any).__lastInteriorImpact = null;
      canvas._issInteriorEvent = (event: any) => {
        if (event && event.type === 'collision') (window as any).__lastInteriorImpact = event;
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      state.room = 'harmony';
      state.position.set(1.54, 0, -11);
      state.velocity.set(0.45, 0, 0.25);
      state.angularVelocity = 0;
      state.railHeld = false;
      state.pushOffLatch = false;
      state.lastWallEvent = -Infinity;
    });
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return state.collisions > (window as any).__interiorCollisionBefore && !!(window as any).__lastInteriorImpact;
    }, null, { timeout: 30000 });
    const impact = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        before: (window as any).__interiorCollisionBefore,
        collisions: state.collisions,
        position: { x: state.position.x, y: state.position.y, z: state.position.z },
        velocity: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
        lastNormal: state.lastImpactNormal,
        lastNormalSpeed: state.lastNormalImpactSpeed,
        event: (window as any).__lastInteriorImpact,
      };
    });
    expect(impact.collisions).toBeGreaterThan(impact.before);
    expect(Math.hypot(impact.position.x, impact.position.y)).toBeLessThanOrEqual(1.56);
    expect(impact.velocity.x).toBeLessThan(0);
    expect(impact.velocity.z).toBeGreaterThan(0.18);
    expect(Math.hypot(impact.velocity.x, impact.velocity.y, impact.velocity.z)).toBeLessThan(Math.hypot(0.45, 0.25));
    expect(impact.lastNormal.x).toBeGreaterThan(0.95);
    expect(impact.lastNormalSpeed).toBeCloseTo(0.45, 1);
    expect(impact.event.speed).toBeCloseTo(Math.hypot(0.45, 0.25), 1);
    expect(impact.event.normalSpeed).toBeCloseTo(0.45, 1);
    await expect(page.locator('[data-iss-interior-impact-flash]')).toBeAttached();
    expect((await canvas.screenshot()).length).toBeGreaterThan(2000);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);

    await page.evaluate(() => (window as any).__canvas()._issInteriorCleanup());
    const cleaned = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      return { init: canvas._issInteriorInit, state: canvas._issInteriorState, cleanup: canvas._issInteriorCleanup };
    });
    expect(cleaned).toEqual({ init: false, state: null, cleanup: null });
  });

  test('anchors a Harmony rail hold and applies one 10 N s push-off while the control stays held', async ({ page }) => {
    await mount(page, { postFX: false, reducedMotion: true }, INTERIOR_SEED);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      return !!(canvas && canvas._issInteriorState && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });
    const sample = await page.evaluate(async () => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const priorHandler = canvas._issInteriorEvent;
      const events: any[] = [];
      canvas._issInteriorEvent = (event: any) => {
        if (/^rail-/.test(event?.type || '')) events.push({ ...event });
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      state.room = 'harmony';
      state.position.set(1.08, -0.99, -12.2);
      state.velocity.set(0, 0, -0.21);
      state.angularVelocity = 0;
      state.railHeld = false;
      state.pushOffLatch = false;
      const caught = canvas._issInteriorGrabRail();
      const anchor = { x: state.railAnchor.x, y: state.railAnchor.y, z: state.railAnchor.z };
      await new Promise<void>((resolve) => {
        let frames = 0;
        const check = () => ++frames >= 6 ? resolve() : requestAnimationFrame(check);
        requestAnimationFrame(check);
      });
      const grabControl = document.querySelector('[data-iss-interior-grab]');
      const held = {
        caught, railHeld: state.railHeld, mode: state.mode, speed: state.velocity.length(),
        position: { x: state.position.x, y: state.position.y, z: state.position.z },
        handPose: state.handPose,
        handPoseAttribute: canvas.getAttribute('data-iss-hand-pose'),
        control: grabControl ? {
          label: grabControl.textContent,
          ariaDisabled: grabControl.getAttribute('aria-disabled'),
        } : null,
      };
      const before = state.railPushOffs;
      const pushPriorHandler = canvas._issInteriorEvent;
      canvas._issInteriorEvent = (event: any) => {
        if (event?.type === 'rail-push-off') events.push({ ...event });
        if (typeof pushPriorHandler === 'function') pushPriorHandler(event);
      };
      canvas._issInteriorSetControl('forward', true);
      await new Promise<void>((resolve) => {
        const check = () => state.railPushOffs === before + 1 && !state.railHeld ? resolve() : requestAnimationFrame(check);
        check();
      });
      const pushed = { x: state.position.x, y: state.position.y, z: state.position.z, speed: state.velocity.length(), count: state.railPushOffs, latched: state.pushOffLatch };
      await new Promise<void>((resolve) => {
        const check = () => Math.hypot(state.position.x - pushed.x, state.position.y - pushed.y, state.position.z - pushed.z) > 0.04 ? resolve() : requestAnimationFrame(check);
        check();
      });
      const coast = {
        speed: state.velocity.length(), count: state.railPushOffs, latched: state.pushOffLatch, mode: state.mode,
        handPose: state.handPose, handPoseAttribute: canvas.getAttribute('data-iss-hand-pose'),
      };
      canvas._issInteriorSetControl('forward', false);
      canvas._issInteriorEvent = pushPriorHandler;
      return { anchor, held, pushed, coast, events };
    });
    expect(sample.held).toMatchObject({ caught: true, railHeld: true, mode: 'RAIL HOLD', handPose: 'rail', handPoseAttribute: 'rail' });
    expect(sample.held.speed).toBeLessThan(0.001);
    expect(sample.held.position).toEqual(sample.anchor);
    expect(sample.held.control).toEqual({ label: 'Release handrail', ariaDisabled: 'false' });
    expect(sample.pushed.speed).toBeCloseTo(10 / 70, 2);
    expect(sample.pushed).toMatchObject({ count: 1, latched: true });
    expect(sample.coast).toMatchObject({ count: 1, latched: true, handPose: 'tucked', handPoseAttribute: 'tucked' });
    expect(sample.coast.mode).toContain('COASTING FROM RAIL');
    expect(sample.coast.speed).toBeCloseTo(sample.pushed.speed, 3);
    const pushes = sample.events.filter((event) => event.type === 'rail-push-off');
    expect(pushes).toHaveLength(1);
    expect(pushes[0].impulse).toBe(10);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('matches, catches, and secures the Unity cargo pouch with shared momentum', async ({ page }) => {
    await mount(page, { postFX: false, reducedMotion: true }, INTERIOR_SEED);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      return !!(canvas && canvas._issInteriorState && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });
    await page.locator('.iss-route-button').filter({ hasText: 'Unity' }).click();
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.room === 'unity');

    const rejected = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.room = state.cargoRoom = 'unity';
      state.position.set(-0.06, 0.18, -0.25);
      state.cargoPosition.set(-0.66, 0.18, -0.25);
      state.velocity.set(0.31, 0, 0);
      state.cargoVelocity.set(0, 0, 0);
      const result = canvas._issInteriorCargoAction();
      return { result, mode: state.cargoMode, relativeSpeed: state.velocity.clone().sub(state.cargoVelocity).length(), feedback: state.feedbackText };
    });
    expect(rejected).toMatchObject({ result: false, mode: 'loose' });
    expect(rejected.relativeSpeed).toBeGreaterThan(0.2);
    expect(rejected.feedback).toContain('RELATIVE SPEED TOO HIGH');
    await expect(page.locator('[data-iss-interior-event]')).toContainText('RELATIVE SPEED TOO HIGH');

    const caught = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.room = state.cargoRoom = 'unity';
      state.position.set(-0.06, 0.18, -0.25);
      state.cargoPosition.set(-0.66, 0.18, -0.25);
      state.velocity.set(0.15, 0.02, 0);
      state.cargoVelocity.set(0.05, -0.01, 0);
      const before = {
        crew: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
        cargo: { x: state.cargoVelocity.x, y: state.cargoVelocity.y, z: state.cargoVelocity.z },
      };
      const expected = {
        x: (70 * before.crew.x + 5 * before.cargo.x) / 75,
        y: (70 * before.crew.y + 5 * before.cargo.y) / 75,
        z: (70 * before.crew.z + 5 * before.cargo.z) / 75,
      };
      const priorHandler = canvas._issInteriorEvent;
      let event: any = null;
      canvas._issInteriorEvent = (next: any) => {
        if (next?.type === 'cargo-caught') event = { ...next };
        if (typeof priorHandler === 'function') priorHandler(next);
      };
      const result = canvas._issInteriorCargoAction();
      canvas._issInteriorEvent = priorHandler;
      return {
        result, before, expected, event, mode: state.cargoMode,
        crewAfter: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
        cargoAfter: { x: state.cargoVelocity.x, y: state.cargoVelocity.y, z: state.cargoVelocity.z },
        momentumAfter: {
          x: 70 * state.velocity.x + 5 * state.cargoVelocity.x,
          y: 70 * state.velocity.y + 5 * state.cargoVelocity.y,
        },
      };
    });
    expect(caught).toMatchObject({ result: true, mode: 'held' });
    expect(caught.event?.type).toBe('cargo-caught');
    expect(caught.event?.relativeSpeed).toBeLessThanOrEqual(0.2);
    expect(caught.crewAfter.x).toBeCloseTo(caught.expected.x, 6);
    expect(caught.crewAfter.y).toBeCloseTo(caught.expected.y, 6);
    expect(caught.cargoAfter.x).toBeCloseTo(caught.expected.x, 6);
    expect(caught.cargoAfter.y).toBeCloseTo(caught.expected.y, 6);
    expect(caught.momentumAfter.x).toBeCloseTo(70 * caught.before.crew.x + 5 * caught.before.cargo.x, 6);
    expect(caught.momentumAfter.y).toBeCloseTo(70 * caught.before.crew.y + 5 * caught.before.cargo.y, 6);
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveAttribute('data-iss-hand-pose', 'cargo');
    expect(await page.evaluate(() => (window as any).__canvas()._issInteriorState.handPose)).toBe('cargo');

    const cargoButton = page.locator('[data-iss-interior-cargo-action]');
    await expect(cargoButton).toHaveAttribute('data-iss-interior-cargo-status', 'held');
    await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      state.room = 'unity';
      state.position.copy(state.cargoSecurePoint);
      state.velocity.set(0, 0, 0);
      state.cargoVelocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
      state.mode = 'HOLDING CARGO';
    });
    await expect(page.locator('[data-iss-interior-rail-distance]')).toHaveAttribute('data-reachable', 'true');
    await expect(cargoButton).toHaveAttribute('aria-disabled', 'false');

    const securedEvent = await cargoButton.evaluate((button) => {
      const canvas = (window as any).__canvas();
      const priorHandler = canvas._issInteriorEvent;
      let event: any = null;
      canvas._issInteriorEvent = (next: any) => {
        if (next?.type === 'cargo-secured') event = { ...next };
        if (typeof priorHandler === 'function') priorHandler(next);
      };
      (button as HTMLButtonElement).click();
      canvas._issInteriorEvent = priorHandler;
      return event;
    });
    expect(securedEvent).toMatchObject({ type: 'cargo-secured', room: 'unity' });
    expect(securedEvent.speed).toBeLessThan(0.001);
    expect(securedEvent.distance).toBeLessThan(0.001);
    await expect(cargoButton).toHaveAttribute('data-iss-interior-cargo-status', 'secured');
    await expect(cargoButton).toContainText('Pouch secured');
    await expect(page.locator('[data-iss-nav-challenge="cargo"]')).toHaveClass(/is-complete/);
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 pouches secured');

    const persisted = await page.evaluate(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const state = (window as any).__canvas()._issInteriorState;
      return {
        mode: state.cargoMode, secured: state.cargoSecured, count: state.cargoSecures,
        position: { x: state.cargoPosition.x, y: state.cargoPosition.y, z: state.cargoPosition.z },
        target: { x: state.cargoSecurePoint.x, y: state.cargoSecurePoint.y, z: state.cargoSecurePoint.z },
      };
    });
    expect(persisted).toMatchObject({ mode: 'secured', secured: true, count: 1 });
    expect(persisted.position).toEqual(persisted.target);
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveAttribute('data-iss-hand-pose', 'tucked');
    expect(await page.evaluate(() => (window as any).__canvas()._issInteriorState.handPose)).toBe('tucked');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('applies reaction torque unbraced, then services the Tranquility filter while rail-braced', async ({ page }, testInfo) => {
    await mount(page, { postFX: false, reducedMotion: true }, { ...INTERIOR_SEED, interiorRoom: 'tranquility', interiorSeen: { harmony: true, tranquility: true } });
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      return !!(canvas && canvas._issInteriorState && canvas._issInteriorState.room === 'tranquility' && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });
    const canvas = page.locator('[data-iss-interior-canvas]');
    const worksiteButton = page.locator('[data-iss-interior-worksite-action]');

    const reaction = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const priorHandler = canvas._issInteriorEvent;
      const events: any[] = [];
      canvas._issInteriorEvent = (event: any) => {
        if (event?.type === 'worksite-reaction') events.push({ ...event });
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      state.room = 'tranquility';
      state.position.set(-3.4, -1.05, -0.75);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
      state.roll = 0;
      const target = state.worksitePoint.clone().sub(state.position).normalize();
      state.yaw = Math.atan2(-target.x, -target.z);
      state.pitch = Math.asin(target.y);
      const firstResult = canvas._issInteriorWorksiteAction(true);
      const firstRate = state.angularVelocity;
      const repeatedResult = canvas._issInteriorWorksiteAction(true);
      const repeatedRate = state.angularVelocity;
      const attempts = state.worksiteAttempts;
      const reactions = state.worksiteReactions;
      canvas._issInteriorWorksiteAction(false);
      canvas._issInteriorEvent = priorHandler;
      return {
        firstResult, repeatedResult, firstRate, repeatedRate, attempts, reactions,
        distance: state.worksiteDistance, alignment: state.worksiteAlignment,
        event: events[0] || null,
      };
    });

    expect(reaction).toMatchObject({ firstResult: false, repeatedResult: false, attempts: 1, reactions: 1 });
    expect(reaction.distance).toBeLessThanOrEqual(0.72);
    expect(reaction.alignment).toBeGreaterThan(0.99);
    expect(Math.abs(reaction.firstRate)).toBeCloseTo(0.14, 5);
    expect(reaction.repeatedRate).toBeCloseTo(reaction.firstRate, 7);
    expect(reaction.event).toMatchObject({ type: 'worksite-reaction', room: 'tranquility', attempt: 1 });
    expect(Math.abs(reaction.event.angularImpulse)).toBeCloseTo(0.14, 5);
    await expect(page.locator('[data-iss-interior-event]')).toContainText('UNBRACED TORQUE');
    await expect(page.locator('[data-iss-nav-challenge="worksite"]')).toContainText('The tool spun you');

    const braced = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const caught = canvas._issInteriorGrabRail();
      return {
        caught, railHeld: state.railHeld, speed: state.velocity.length(),
        angularSpeed: Math.abs(state.angularVelocity), distance: state.worksiteDistance,
      };
    });
    expect(braced).toMatchObject({ caught: true, railHeld: true });
    expect(braced.speed).toBeLessThan(0.001);
    expect(braced.angularSpeed).toBeLessThan(0.001);
    await expect(worksiteButton).toHaveAttribute('data-iss-interior-worksite-status', 'ready');
    await expect(worksiteButton).toHaveAttribute('aria-disabled', 'false');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'rail');

    await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const priorHandler = canvas._issInteriorEvent;
      (window as any).__worksiteCompleteEvent = null;
      canvas._issInteriorEvent = (event: any) => {
        if (event?.type === 'worksite-complete') (window as any).__worksiteCompleteEvent = { ...event };
        if (typeof priorHandler === 'function') priorHandler(event);
      };
    });
    await worksiteButton.dispatchEvent('pointerdown');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'tool');
    const toolPoseFrame = await canvas.screenshot({ path: testInfo.outputPath('tranquility-tool-pose.png') });
    expect(toolPoseFrame.length).toBeGreaterThan(2000);
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.worksiteComplete === true, null, { timeout: 10000 });
    await worksiteButton.dispatchEvent('pointerup');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'rail');

    const completed = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        complete: state.worksiteComplete,
        progress: state.worksiteProgress,
        attempts: state.worksiteAttempts,
        reactions: state.worksiteReactions,
        services: state.worksiteServices,
        railHeld: state.railHeld,
        event: (window as any).__worksiteCompleteEvent,
      };
    });
    expect(completed).toMatchObject({ complete: true, attempts: 2, reactions: 1, services: 1, railHeld: true });
    expect(completed.progress).toBeCloseTo(1.5, 4);
    expect(completed.event).toMatchObject({ type: 'worksite-complete', room: 'tranquility', duration: 1.5, attempt: 2, braced: true });
    expect(completed.event.maxSpeed).toBeLessThan(0.001);
    expect(completed.event.maxAngularSpeed).toBeLessThan(0.001);

    await expect(worksiteButton).toHaveAttribute('data-iss-interior-worksite-status', 'complete');
    await expect(worksiteButton).toHaveAttribute('aria-disabled', 'true');
    await expect(worksiteButton).toContainText('Filter serviced');
    await expect(page.locator('[data-iss-nav-challenge="worksite"]')).toHaveClass(/is-complete/);
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 reaction-torque events');
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 filters serviced');

    const frame = await canvas.screenshot({ path: testInfo.outputPath('tranquility-worksite.png') });
    expect(frame.length).toBeGreaterThan(2000);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('doses the Destiny wick inside the target band and restores it after remount', async ({ page }, testInfo) => {
    const destinySeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'destiny',
      interiorSeen: { harmony: true, destiny: true },
      researchStep: 1,
    };
    await mount(page, { postFX: false, reducedMotion: true }, destinySeed);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'destiny' && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    const doseButton = page.locator('[data-iss-interior-capillary-action]');
    const positioned = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.room = 'destiny';
      state.position.set(0, 0, -5.45);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
      const target = state.capillaryPoint.clone().sub(state.position).normalize();
      state.yaw = Math.atan2(-target.x, -target.z);
      state.pitch = Math.asin(target.y);
      const priorHandler = canvas._issInteriorEvent;
      (window as any).__capillaryEvents = [];
      canvas._issInteriorEvent = (event: any) => {
        if (event && String(event.type || '').startsWith('capillary-')) {
          (window as any).__capillaryEvents.push({ ...event });
        }
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      return {
        distance: state.position.distanceTo(state.capillaryPoint),
        speed: state.velocity.length(),
        angularSpeed: Math.abs(state.angularVelocity),
      };
    });
    expect(positioned.distance).toBeLessThanOrEqual(0.95);
    expect(positioned.speed).toBeLessThan(0.001);
    expect(positioned.angularSpeed).toBeLessThan(0.001);
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'ready');
    await expect(doseButton).toHaveAttribute('aria-disabled', 'false');

    await doseButton.dispatchEvent('pointerdown');
    await expect(doseButton).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'science');
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const readout = document.querySelector('[data-iss-interior-capillary-readout]');
      if (!state.capillaryActive || state.capillaryDose < 2.7 || !readout || !String(readout.textContent || '').includes('Target band reached')) return false;
      (window as any).__capillaryPriming = {
        dose: state.capillaryDose,
        duration: state.capillaryDuration,
        wetFraction: state.capillaryWetFraction,
        attempts: state.capillaryAttempts,
        active: state.capillaryActive,
      };
      const releaseButton = document.querySelector('[data-iss-interior-capillary-action]');
      releaseButton?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 }));
      return true;
    }, null, { timeout: 10000 });

    const priming = await page.evaluate(() => (window as any).__capillaryPriming);
    expect(priming).toMatchObject({ attempts: 1, active: true });
    expect(priming.dose).toBeGreaterThanOrEqual(2.7);
    expect(priming.dose).toBeLessThan(3.3);
    expect(priming.wetFraction).toBeGreaterThan(0.85);
    expect(priming.wetFraction).toBeLessThanOrEqual(1);

    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryComplete === true, null, { timeout: 5000 });
    const completed = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__capillaryEvents || [];
      return {
        complete: state.capillaryComplete,
        dose: state.capillaryDose,
        duration: state.capillaryDuration,
        outcome: state.capillaryOutcome,
        attempts: state.capillaryAttempts,
        transfers: state.capillaryTransfers,
        active: state.capillaryActive,
        event: events.find((event: any) => event.type === 'capillary-complete') || null,
        eventCount: events.length,
      };
    });
    expect(completed).toMatchObject({ complete: true, outcome: 'complete', attempts: 1, transfers: 1, active: false, eventCount: 1 });
    expect(completed.dose).toBeGreaterThanOrEqual(2.7);
    expect(completed.dose).toBeLessThanOrEqual(3.3);
    expect(completed.event).toMatchObject({ type: 'capillary-complete', room: 'destiny', attempt: 1, stable: true });
    expect(completed.event.dose).toBeGreaterThanOrEqual(2.7);
    expect(completed.event.dose).toBeLessThanOrEqual(3.3);
    expect(completed.event.maxSpeed).toBeLessThanOrEqual(0.02);
    expect(completed.event.maxAngularSpeed).toBeLessThanOrEqual(0.035);

    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'complete');
    await expect(doseButton).toHaveAttribute('aria-disabled', 'true');
    await expect(doseButton).toContainText('Wick primed');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'tucked');
    await expect(page.locator('[data-iss-nav-challenge="capillary"]')).toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-capillary-visual]')).toHaveAttribute('data-iss-capillary-visual', '2');
    await expect(page.locator('[data-iss-interior-objective]')).toContainText('SCIENCE STEP COMPLETE');
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 wick transfers');

    const frame = await canvas.screenshot({ path: testInfo.outputPath('destiny-capillary-complete.png') });
    expect(frame.length).toBeGreaterThan(2000);

    await page.locator('[data-iss-interior-view="diagram"]').click();
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveCount(0);
    await page.locator('[data-iss-interior-view="3d"]').click();
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'destiny' && state.capillaryComplete && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const restored = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return {
        complete: state.capillaryComplete,
        dose: state.capillaryDose,
        attempts: state.capillaryAttempts,
        transfers: state.capillaryTransfers,
        eventCount: ((window as any).__capillaryEvents || []).length,
      };
    });
    expect(restored).toMatchObject({ complete: true, attempts: 1, transfers: 1, eventCount: 1 });
    expect(restored.dose).toBeCloseTo(completed.dose, 4);
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'complete');
    await expect(page.locator('[data-iss-nav-challenge="capillary"]')).toHaveClass(/is-complete/);
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 wick transfers');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('records underfill, motion interruption, and one contained overflow per press', async ({ page }, testInfo) => {
    const destinySeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'destiny',
      interiorSeen: { harmony: true, destiny: true },
    };
    await mount(page, { postFX: false, reducedMotion: true }, destinySeed);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'destiny' && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    const doseButton = page.locator('[data-iss-interior-capillary-action]');
    async function stabilizeAtInjector() {
      return page.evaluate(() => {
        const state = (window as any).__canvas()._issInteriorState;
        state.room = 'destiny';
        state.position.set(0, 0, -5.45);
        state.velocity.set(0, 0, 0);
        state.angularVelocity = 0;
        state.railHeld = false;
        const target = state.capillaryPoint.clone().sub(state.position).normalize();
        state.yaw = Math.atan2(-target.x, -target.z);
        state.pitch = Math.asin(target.y);
        return { distance: state.position.distanceTo(state.capillaryPoint) };
      });
    }
    async function armCapillaryRecorder() {
      await page.evaluate(() => {
        const canvas = (window as any).__canvas();
        const priorHandler = canvas._issInteriorEvent;
        canvas._issInteriorEvent = (event: any) => {
          if (event && String(event.type || '').startsWith('capillary-')) {
            (window as any).__capillaryFailureEvents.push({ ...event });
          }
          if (typeof priorHandler === 'function') priorHandler(event);
        };
      });
    }

    await page.evaluate(() => { (window as any).__capillaryFailureEvents = []; });
    expect((await stabilizeAtInjector()).distance).toBeLessThanOrEqual(0.95);
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'locked');
    await doseButton.dispatchEvent('pointerdown');
    expect(await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return { active: state.capillaryActive, attempts: state.capillaryAttempts };
    })).toEqual({ active: false, attempts: 0 });
    await expect(page.locator('[data-iss-interior-event]')).toContainText('SECURE SAMPLE FIRST');
    await page.locator('[data-iss-research-procedure] button').filter({ hasText: 'Secure the sample' }).click();
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'ready');

    await doseButton.dispatchEvent('pointerdown');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryDose >= 0.2, null, { timeout: 5000 });
    await doseButton.dispatchEvent('pointerout');
    await page.waitForFunction(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return !state.capillaryActive && state.capillaryDose === 0;
    }, null, { timeout: 5000 });
    expect(await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return { attempts: state.capillaryAttempts, events: ((window as any).__capillaryFailureEvents || []).length };
    })).toEqual({ attempts: 0, events: 0 });

    await armCapillaryRecorder();
    await doseButton.dispatchEvent('pointerdown');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryDose >= 1, null, { timeout: 5000 });
    await doseButton.dispatchEvent('pointerup');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryOutcome === 'underfill', null, { timeout: 5000 });
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'underfill');
    await expect(doseButton).toContainText('Underfill');
    await expect(page.locator('[data-iss-nav-challenge="capillary"]')).not.toHaveClass(/is-complete/);
    await expect(page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' })).toContainText('1 wick underfills');

    await stabilizeAtInjector();
    await armCapillaryRecorder();
    await doseButton.dispatchEvent('pointerdown');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryDose >= 0.45, null, { timeout: 5000 });
    await page.evaluate(() => {
      (window as any).__canvas()._issInteriorState.velocity.set(0.08, 0, 0);
    });
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryOutcome === 'interrupted', null, { timeout: 5000 });
    await doseButton.dispatchEvent('pointerup');
    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'interrupted');
    await expect(page.locator('[data-iss-research-procedure]')).toContainText('3-D transfer interrupted');

    await stabilizeAtInjector();
    await armCapillaryRecorder();
    await doseButton.dispatchEvent('pointerdown');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'science');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.capillaryOutcome === 'overflow', null, { timeout: 10000 });
    const repeatedResult = await page.evaluate(() => (window as any).__canvas()._issInteriorCapillaryAction(true));
    expect(repeatedResult).toBe(false);
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__capillaryFailureEvents || [];
      return {
        complete: state.capillaryComplete,
        active: state.capillaryActive,
        latched: state.capillaryPressLatched,
        outcome: state.capillaryOutcome,
        dose: state.capillaryDose,
        attempts: state.capillaryAttempts,
        underfills: state.capillaryUnderfills,
        interruptions: state.capillaryInterruptions,
        overflows: state.capillaryOverflows,
        transfers: state.capillaryTransfers,
        eventTypes: events.map((event: any) => event.type),
        eventAttempts: events.map((event: any) => event.attempt),
      };
    });
    expect(overflow).toMatchObject({
      complete: false,
      active: false,
      latched: true,
      outcome: 'overflow',
      attempts: 3,
      underfills: 1,
      interruptions: 1,
      overflows: 1,
      transfers: 0,
      eventTypes: ['capillary-underfill', 'capillary-interrupted', 'capillary-overflow'],
      eventAttempts: [1, 2, 3],
    });
    expect(overflow.dose).toBeCloseTo(3.3, 3);
    await doseButton.dispatchEvent('pointerup');

    await expect(doseButton).toHaveAttribute('data-iss-interior-capillary-status', 'overflow');
    await expect(doseButton).toContainText('Overflow contained');
    await expect(page.locator('[data-iss-interior-event]')).toContainText('OVERFLOW CONTAINED');
    await expect(page.locator('[data-iss-nav-challenge="capillary"]')).not.toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-nav-challenge="capillary"]')).toContainText('Overflow stayed contained');
    const flightLog = page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' });
    await expect(flightLog).toContainText('1 wick underfills');
    await expect(flightLog).toContainText('1 contained overflows');
    await expect(flightLog).toContainText('0 wick transfers');
    expect(await page.evaluate(() => (window as any).__canvas()._issInteriorState.capillaryPressLatched)).toBe(false);

    const frame = await canvas.screenshot({ path: testInfo.outputPath('destiny-capillary-overflow.png') });
    expect(frame.length).toBeGreaterThan(2000);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('captures a Cupola target only while rail-braced, then secures shutters and restores after remount', async ({ page }, testInfo) => {
    const cupolaSeed = {
      ...INTERIOR_SEED,
      interiorRoom: 'cupola',
      interiorSeen: { harmony: true, destiny: true, unity: true, tranquility: true, cupola: true },
      interiorNav: { ...INTERIOR_SEED.interiorNav, flightRoom: 'cupola', routeStep: 4, routeComplete: false },
      cupolaTarget: 'day',
    };
    await mount(page, { postFX: false, reducedMotion: true }, cupolaSeed);
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'cupola' && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const canvas = page.locator('[data-iss-interior-canvas]');
    const observationButton = page.locator('[data-iss-interior-observation-action]');
    const observationChallenge = page.locator('[data-iss-nav-challenge="observation"]');
    const flightLog = page.locator('.iss-interior-instructions').filter({ hasText: 'Flight log:' });

    const positioned = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      state.room = 'cupola';
      state.position.copy(state.observationPoint);
      state.velocity.set(0, 0, 0);
      state.angularVelocity = 0;
      state.railHeld = false;
      state.roll = 0;
      const target = state.observationTargetPoint.clone().sub(state.position).normalize();
      state.yaw = Math.atan2(-target.x, -target.z);
      state.pitch = Math.asin(target.y);
      return {
        distance: state.position.distanceTo(state.observationPoint),
        speed: state.velocity.length(),
        angularSpeed: Math.abs(state.angularVelocity),
      };
    });
    expect(positioned).toMatchObject({ distance: 0, speed: 0, angularSpeed: 0 });
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'unbraced');

    // A centered camera alone is not enough: the first P press is rejected
    // until the astronaut has a physical Cupola handrail within reach.
    await canvas.focus();
    await page.keyboard.press('p');
    expect(await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      return { active: state.observationActive, attempts: state.observationAttempts, captured: state.observationCaptured };
    })).toEqual({ active: false, attempts: 0, captured: false });
    await expect(page.locator('[data-iss-interior-event]')).toContainText('BRACE ON RAIL');

    const braced = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const caught = canvas._issInteriorGrabRail();
      return {
        caught,
        railHeld: state.railHeld,
        speed: state.velocity.length(),
        angularSpeed: Math.abs(state.angularVelocity),
        distance: state.observationDistance,
        alignment: state.observationAlignment,
      };
    });
    expect(braced).toMatchObject({ caught: true, railHeld: true });
    expect(braced.speed).toBeLessThan(0.001);
    expect(braced.angularSpeed).toBeLessThan(0.001);
    expect(braced.distance).toBeLessThanOrEqual(0.95);
    expect(braced.alignment).toBeGreaterThanOrEqual(0.965);
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'ready');
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'rail');

    async function armObservationRecorder() {
      await page.evaluate(() => {
        const canvas = (window as any).__canvas();
        const priorHandler = canvas._issInteriorEvent;
        canvas._issInteriorEvent = (event: any) => {
          if (event && String(event.type || '').startsWith('observation-')) {
            (window as any).__cupolaObservationEvents.push({ ...event });
          }
          if (typeof priorHandler === 'function') priorHandler(event);
        };
      });
    }
    await page.evaluate(() => { (window as any).__cupolaObservationEvents = []; });
    await armObservationRecorder();

    // Releasing P before the 1.2-second lock produces one blurred frame and
    // resets progress without completing either stage.
    await canvas.focus();
    await page.keyboard.down('p');
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      if (!state.observationActive || state.observationProgress < 0.2 || state.observationProgress >= 1.2) return false;
      canvas.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP', key: 'p', bubbles: true, cancelable: true }));
      return state.observationOutcome === 'blurred';
    }, null, { timeout: 5000 });
    // Clear Playwright's held-key bookkeeping after the in-page release. The
    // duplicate keyup is intentionally inert because the frame is already reset.
    await page.keyboard.up('p');

    const blurred = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__cupolaObservationEvents || [];
      return {
        active: state.observationActive,
        progress: state.observationProgress,
        attempts: state.observationAttempts,
        blurs: state.observationBlurs,
        captures: state.observationCaptures,
        event: events.find((event: any) => event.type === 'observation-blurred') || null,
      };
    });
    expect(blurred).toMatchObject({ active: false, progress: 0, attempts: 1, blurs: 1, captures: 0 });
    expect(blurred.event).toMatchObject({ type: 'observation-blurred', room: 'cupola', target: 'day', attempt: 1 });
    expect(blurred.event.duration).toBeGreaterThanOrEqual(0.2);
    expect(blurred.event.duration).toBeLessThan(1.2);
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'blurred');
    await expect(observationChallenge).not.toHaveClass(/is-complete/);
    await expect(flightLog).toContainText('1 blurred Earth frames');

    // React refreshes the canvas callback after every persisted event, so wrap
    // the live callback again before recording the successful attempt.
    await armObservationRecorder();
    await canvas.focus();
    await page.keyboard.down('p');
    await page.waitForFunction(() => (window as any).__canvas()._issInteriorState.observationCaptured === true, null, { timeout: 10000 });
    await page.keyboard.up('p');

    const captured = await page.evaluate(() => {
      const state = (window as any).__canvas()._issInteriorState;
      const events = (window as any).__cupolaObservationEvents || [];
      return {
        active: state.observationActive,
        captured: state.observationCaptured,
        secured: state.observationSecured,
        outcome: state.observationOutcome,
        progress: state.observationProgress,
        attempts: state.observationAttempts,
        blurs: state.observationBlurs,
        captures: state.observationCaptures,
        event: events.find((event: any) => event.type === 'observation-captured') || null,
      };
    });
    expect(captured).toMatchObject({ active: false, captured: true, secured: false, outcome: 'captured', attempts: 2, blurs: 1, captures: 1 });
    expect(captured.progress).toBeCloseTo(1.2, 4);
    expect(captured.event).toMatchObject({ type: 'observation-captured', room: 'cupola', target: 'day', duration: 1.2, attempt: 2, braced: true, source: '3d' });
    expect(captured.event.minimumAlignment).toBeGreaterThanOrEqual(0.965);
    expect(captured.event.maxSpeed).toBeLessThanOrEqual(0.02);
    expect(captured.event.maxAngularSpeed).toBeLessThanOrEqual(0.02);

    // Capture is intentionally an intermediate stage. The windows remain
    // exposed until a second, distinct P press runs the closeout procedure.
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'captured');
    await expect(observationButton).toContainText('Close shutters');
    await expect(page.locator('[data-iss-interior-objective]')).toContainText('FRAME CAPTURED // CLOSE ALL SEVEN SHUTTERS');
    await expect(observationChallenge).not.toHaveClass(/is-complete/);
    await expect(canvas).toHaveAttribute('data-iss-hand-pose', 'camera');
    await expect(flightLog).toContainText('1 Earth frames captured');
    const captureFrame = await canvas.screenshot({ path: testInfo.outputPath('cupola-frame-captured.png') });
    expect(captureFrame.length).toBeGreaterThan(2000);

    await armObservationRecorder();
    await canvas.focus();
    await page.keyboard.press('p');
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      return state.observationSecured === true && canvas._issInteriorCupolaShutters === true;
    }, null, { timeout: 10000 });

    const secured = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      const events = (window as any).__cupolaObservationEvents || [];
      return {
        captured: state.observationCaptured,
        secured: state.observationSecured,
        outcome: state.observationOutcome,
        pressLatched: state.observationPressLatched,
        shutterProp: canvas._issInteriorCupolaShutters,
        eventTypes: events.map((event: any) => event.type),
        securedEvents: events.filter((event: any) => event.type === 'observation-secured'),
      };
    });
    expect(secured).toMatchObject({
      captured: true,
      secured: true,
      outcome: 'secured',
      pressLatched: false,
      shutterProp: true,
      eventTypes: ['observation-blurred', 'observation-captured', 'observation-secured'],
    });
    expect(secured.securedEvents).toHaveLength(1);
    expect(secured.securedEvents[0]).toMatchObject({ type: 'observation-secured', room: 'cupola', target: 'day', source: '3d' });
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'secured');
    await expect(observationButton).toHaveAttribute('aria-disabled', 'true');
    await expect(observationButton).toContainText('Cupola secured');
    await expect(observationChallenge).toHaveClass(/is-complete/);
    await expect(page.locator('[data-iss-interior-objective]')).toContainText('ACTIVITY COMPLETE');

    const securedFrame = await canvas.screenshot({ path: testInfo.outputPath('cupola-shutters-secured.png') });
    expect(securedFrame.length).toBeGreaterThan(2000);
    expect(Buffer.compare(captureFrame, securedFrame)).not.toBe(0);

    await page.locator('[data-iss-interior-view="diagram"]').click();
    await expect(page.locator('[data-iss-interior-canvas]')).toHaveCount(0);
    await page.locator('[data-iss-interior-view="3d"]').click();
    await page.waitForFunction(() => {
      const canvas = (window as any).__canvas?.();
      const state = canvas?._issInteriorState;
      return !!(canvas && state && state.room === 'cupola' && state.observationCaptured && state.observationSecured && canvas.getAttribute('data-iss-webgl') === 'ready');
    }, { timeout: 30000 });

    const restored = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const state = canvas._issInteriorState;
      return {
        room: state.room,
        captured: state.observationCaptured,
        secured: state.observationSecured,
        outcome: state.observationOutcome,
        progress: state.observationProgress,
        attempts: state.observationAttempts,
        blurs: state.observationBlurs,
        captures: state.observationCaptures,
        capturedProp: canvas._issInteriorCupolaCaptured,
        shutterProp: canvas._issInteriorCupolaShutters,
      };
    });
    expect(restored).toMatchObject({
      room: 'cupola', captured: true, secured: true, outcome: 'secured',
      attempts: 2, blurs: 1, captures: 1, capturedProp: true, shutterProp: true,
    });
    expect(restored.progress).toBeCloseTo(1.2, 4);
    await expect(observationButton).toHaveAttribute('data-iss-interior-observation-status', 'secured');
    await expect(observationChallenge).toHaveClass(/is-complete/);
    await expect(flightLog).toContainText('1 blurred Earth frames');
    await expect(flightLog).toContainText('1 Earth frames captured');

    // A secured remount is terminal: another P press neither reopens the
    // shutters nor emits a duplicate completion event.
    const duplicate = await page.evaluate(() => {
      const canvas = (window as any).__canvas();
      const events: any[] = [];
      const priorHandler = canvas._issInteriorEvent;
      canvas._issInteriorEvent = (event: any) => {
        if (event && String(event.type || '').startsWith('observation-')) events.push({ ...event });
        if (typeof priorHandler === 'function') priorHandler(event);
      };
      return { accepted: canvas._issInteriorObservationAction(true), events, secured: canvas._issInteriorState.observationSecured };
    });
    expect(duplicate).toEqual({ accepted: false, events: [], secured: true });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('shows a usable diagram fallback and shuts down unavailable simulator controls', async ({ page }) => {
    await mount(page, { postFX: false, reducedMotion: true, failThree: true }, INTERIOR_SEED);

    const shell = page.locator('[data-iss-interior-sim]');
    const canvas = page.locator('[data-iss-interior-canvas]');
    const fallback = page.locator('[data-iss-interior-fallback]');
    const controls = page.locator('.iss-interior-controls');
    const controlButtons = controls.locator('button');

    await expect(shell).toHaveAttribute('data-iss-webgl-state', 'unavailable');
    await expect(canvas).toHaveAttribute('data-iss-webgl', 'unavailable');
    await expect(canvas).toBeHidden();
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('3-D view is unavailable');
    await expect(controls).toBeHidden();
    expect(await controlButtons.count()).toBeGreaterThan(0);
    expect(await controlButtons.evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
