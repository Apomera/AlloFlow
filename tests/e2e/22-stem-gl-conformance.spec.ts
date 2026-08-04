import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * STEM Lab — WebGL conformance battery.
 *
 * 31 STEM tools render through three.js, and every other test around them runs in
 * jsdom, which has no WebGL and no layout. The bespoke specs (18–21) pin what is
 * unique about four of them. This one runs the SAME battery over a manifest, so
 * covering a tool costs one table row rather than a new file.
 *
 * Every check here is a bug that actually shipped in this codebase:
 *
 *   live context      — Geometry World mounted a canvas whose scene was dead; the
 *                       throw was swallowed and it just showed nothing.
 *   non-blank         — same failure, seen from the pixels: Galaxy's upscale
 *                       recursion killed 3-D on two quality tiers.
 *   stable size       — Geometry World's canvas grew ~8px every 220ms forever, a
 *                       ResizeObserver feeding its own output back in.
 *   fits parent       — the other half of that bug.
 *   focusable app     — Moon Mission's lunar EVA had role="application" and canvas
 *                       -bound key handlers with no tabIndex, so a keyboard-only
 *                       student could never walk. Pointer lock hid it from anyone
 *                       testing with a mouse.
 *   releases on unmount — a dead canvas left behind stacked over the live one.
 *
 * ADDING A TOOL: append to MANIFEST. If its 3-D lives behind state (most do), give
 * the toolData that reaches it — probe the running tool rather than reading it off
 * the source, which cost me two wrong guesses on Moon Mission alone.
 */

interface ToolEntry {
  id: string;
  file: string;
  /** State needed to reach the 3D view. Empty = it renders by default. */
  state?: Record<string, unknown>;
  /** Tools that also mount 2D canvases; the battery always targets the GL one. */
  note?: string;
  /**
   * Scripts loaded BEFORE the tool. The makeBayViewer family (cephalopodLab,
   * autoRepair, firstResponse, weldLab, optics, heatLab, nuclearLab,
   * consciousness, rocks) each capture window.StemLab.makeBayViewer at module
   * load, so the real host has to be on the page first or they permanently
   * fall back to their 2D view and the battery measures nothing.
   */
  preScripts?: string[];
}

// Verified by mounting each one: these reach a live GL canvas with no state at all.
const MANIFEST: ToolEntry[] = [
  { id: 'solarSystem', file: 'stem_lab/stem_tool_solarsystem.js' },
  { id: 'galaxy', file: 'stem_lab/stem_tool_galaxy.js' },
  { id: 'geometryWorld', file: 'stem_lab/stem_tool_geometryworld.js', note: 'also mounts a 2D HUD canvas' },
  { id: 'molecule', file: 'stem_lab/stem_tool_molecule.js' },
  { id: 'geoSandbox', file: 'stem_lab/stem_tool_geosandbox.js' },
  { id: 'geologyExplorer', file: 'stem_lab/stem_tool_geologyexplorer.js' },
  { id: 'echoTrainer', file: 'stem_lab/stem_tool_echotrainer.js', note: 'also mounts a 2D canvas' },
  // First entry that needs STATE to reach its 3D. RoadReady opens on a menu; the
  // driving view builds the scene via StemLab.ensureThree({orbit:false}) and a
  // WebGLRenderer. It is the largest STEM tool (32.9k lines) and had no browser
  // coverage at all. State shape taken from the existing jsdom fixture in
  // tests/roadready_canvas_alternatives_a11y.js, then confirmed by running this.
  {
    id: 'roadReady',
    file: 'stem_lab/stem_tool_roadready.js',
    state: { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan' } },
    note: 'also mounts 2D HUD//minimap canvases; needs state to reach the 3D view',
  },
  // First makeBayViewer tool in the battery. Its Body Plan tab builds a
  // schematic octopus on the shared viewer, so the host must load first
  // (preScripts) or CEPH3D captures nothing and the tab renders its 2D
  // fallback instead — which would pass a blank-canvas check by not having
  // a canvas at all.
  {
    id: 'cephalopodLab',
    file: 'stem_lab/stem_tool_cephalopodlab.js',
    state: { cephalopodLab: { activeSection: 'anatomy' } },
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'Body Plan 3D via StemLab.makeBayViewer; needs the host preloaded',
  },
  // The rest of the makeBayViewer family, gates found by PROBING each one
  // (my read-off-the-source guesses were wrong for five of eight).
  {
    id: 'autoRepair',
    file: 'stem_lab/stem_tool_autorepair.js',
    state: { autoRepair: { view: 'underhood' } },
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'under-hood tour; opens on a menu, needs view=underhood',
  },
  {
    id: 'heatLab',
    file: 'stem_lab/stem_tool_heatlab.js',
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'reaches 3D on a default mount; also mounts 4 2D canvases',
  },
  {
    id: 'nuclearLab',
    file: 'stem_lab/stem_tool_nuclearlab.js',
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'reaches 3D on a default mount; also mounts 3 2D canvases',
  },
];

// Still uncovered, with what a probe actually showed — so the next attempt
// starts past my dead ends rather than repeating them:
//
//   firstResponse   `var view = d.view || 'menu'`, but the 3D body sits behind
//                   a further tab; {tab:'place'} and {section:'cpr'} both
//                   rendered ZERO canvases. Find the view id that leaves the
//                   menu, then the tab within it.
//   weldLab         NOT a bay-viewer tool — it builds its own WebGLRenderer
//                   (~line 1720); the makeBayViewer mention at ~2805 is a
//                   comment. Gate is `d.view`, default 'menu'.
//   opticsLab       `state.diffMode` is a sub-mode, not the 3D gate. Zero
//                   canvases on default, view:'3d' and tab:'bench'.
//   consciousnessLab  creates its viewer LAZILY in ensureNetViewer() rather
//                   than at module load, so preScripts alone is not enough —
//                   the view that calls it has to be open.
//   rocks           mounts ONE canvas on default that has no GL context, so
//                   its 3D is a different surface than the landscape mode.

// NOT in the manifest, and why:
//
// coasterLab — the tool is FINE. Driven from a raw chromium.launch() it mounts three
//   canvases (one GL), renders its full UI and logs no errors. But under the
//   Playwright runner its canvas never appears and every check times out. Same class
//   of runner-vs-raw discrepancy as Galaxy's camera drag, and unisolated. Shipping it
//   red would teach people to ignore this file, so it waits until the cause is known.
//   It also has its own harness at C:\tmp\coasterlab-harness from another session.
//
// The other 23 WebGL tools reach their 3-D behind state (a mission phase, a tab, a
// started flag) rather than on a default mount. Each needs its gate discovered by
// PROBING THE RUNNING TOOL — Moon Mission's turned out to be missionPhase 6 AND an
// evaStarted flag, and I guessed it wrong twice from the source first. Six of them
// (anatomy, geoSandbox, magnetism, molecule, particleLab3d, probability) additionally
// ask for THREE.OrbitControls, which is vendored at vendor/three-r128/OrbitControls.js
// and attaches to the THREE global — pass it via extraScripts when adding them.

const PROBES = `
  window.__conform = function () {
    var hit = window.__glCanvas();
    if (!hit) return null;
    var c = hit.el, p = c.parentElement;
    // Mark it so a Playwright locator can screenshot the RIGHT canvas. geometryWorld
    // and coasterLab both mount 2D HUD canvases ahead of the GL one in DOM order, so
    // .first() photographed a transparent overlay and called the scene blank.
    c.setAttribute('data-gl-under-test', '1');
    var cr = c.getBoundingClientRect();
    var pr = p ? p.getBoundingClientRect() : cr;
    // Every canvas claiming to be an interactive application must be reachable by
    // keyboard, or its key handlers are dead for anyone without a mouse.
    var apps = [];
    var all = document.querySelectorAll('#wrap canvas');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('role') === 'application') {
        apps.push({ tabIndex: all[i].tabIndex, focusable: all[i].tabIndex >= 0 });
      }
    }
    return {
      lost: hit.gl.isContextLost(),
      box: { w: Math.round(cr.width), h: Math.round(cr.height) },
      parentBox: { w: Math.round(pr.width), h: Math.round(pr.height) },
      appCanvases: apps,
      glCount: (function () { var n = 0; for (var j = 0; j < all.length; j++) { try { if (all[j].getContext('webgl2') || all[j].getContext('webgl')) n++; } catch (e) {} } return n; })()
    };
  };
`;

test.describe.configure({ timeout: 150_000 });

for (const tool of MANIFEST) {
  test.describe(`${tool.id} — WebGL conformance`, () => {
    const harness = new GlHarness({
      toolFile: tool.file, toolId: tool.id, width: 1280, height: 820, probes: PROBES,
      preScripts: tool.preScripts,
    });

    test.beforeAll(async () => { await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    // Chromium caps live WebGL contexts per PROCESS and kills the oldest silently.
    test.afterEach(async ({ page }) => { await harness.destroy(page); });

    test('mounts a live GL context without throwing', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      const c = await page.evaluate(() => (window as any).__conform());

      expect(c, `${tool.id}: no GL canvas`).not.toBeNull();
      expect(c.lost, `${tool.id}: context lost at mount`).toBe(false);

      const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
        .filter((m: string) => !/ResizeObserver loop/.test(m));
      expect(errs, `${tool.id}: page errors`).toEqual([]);
    });

    test('renders something rather than a blank surface', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      // Tag the GL canvas first, then photograph exactly that one.
      await page.evaluate(() => (window as any).__conform());
      // A dead scene clears to a flat colour, which PNG compresses to a few KB.
      // Real content runs hundreds of KB, so this floor has a large margin.
      const shot = await page.locator('[data-gl-under-test]').screenshot({ timeout: 60000 });
      expect(shot.length, `${tool.id}: canvas looks blank`).toBeGreaterThan(8000);
    });

    test('holds a stable size and stays inside its parent', async ({ page }) => {
      await harness.mount(page, tool.state || {});

      const samples: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        samples.push(JSON.stringify((await page.evaluate(() => (window as any).__conform())).box));
        await page.waitForTimeout(200);
      }
      const distinct = [...new Set(samples)];
      expect(distinct.length, `${tool.id}: canvas size unstable\n${distinct.join('\n')}`).toBe(1);

      const c = await page.evaluate(() => (window as any).__conform());
      expect(c.box.w, `${tool.id}: canvas wider than parent`).toBeLessThanOrEqual(c.parentBox.w + 1);
      expect(c.box.h, `${tool.id}: canvas taller than parent`).toBeLessThanOrEqual(c.parentBox.h + 1);
    });

    test('any canvas claiming role="application" is keyboard reachable', async ({ page }) => {
      // Moon Mission's EVA had the role, canvas-bound key handlers, and no tabIndex,
      // so the whole moonwalk was mouse-only. Pointer lock hid it completely from
      // anyone testing with a mouse.
      await harness.mount(page, tool.state || {});
      const c = await page.evaluate(() => (window as any).__conform());

      c.appCanvases.forEach((a: { tabIndex: number; focusable: boolean }) => {
        expect(a.focusable,
          `${tool.id}: a canvas declares role="application" but tabIndex=${a.tabIndex}, so keyboard users cannot reach it`).toBe(true);
      });
    });

    test('releases its GL canvas on unmount', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      expect(await page.evaluate(() => (window as any).__conform().glCount)).toBeGreaterThan(0);

      await harness.destroy(page);
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => document.querySelectorAll('#wrap canvas').length),
        `${tool.id}: canvas left behind after unmount`).toBe(0);
    });
  });
}
