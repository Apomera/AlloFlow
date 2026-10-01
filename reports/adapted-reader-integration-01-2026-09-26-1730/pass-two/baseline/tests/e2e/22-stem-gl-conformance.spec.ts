import { test, expect, Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

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
 *   builds a scene    — same failure, seen from the draw calls and the pixels:
 *                       Galaxy's upscale recursion killed 3-D on two quality tiers.
 *   stable size       — Geometry World's canvas grew ~8px every 220ms forever, a
 *                       ResizeObserver feeding its own output back in.
 *   fits parent       — the other half of that bug.
 *   focusable app     — Moon Mission's lunar EVA had role="application" and canvas
 *                       -bound key handlers with no tabIndex, so a keyboard-only
 *                       student could never walk. Pointer lock hid it from anyone
 *                       testing with a mouse.
 *   releases on unmount — a dead canvas left behind stacked over the live one, and
 *                       a context never lost counts against Chromium's per-process cap.
 *
 * HOW THESE CHECKS STAY HONEST (audit 2026-09-22). Every GL fact comes from the
 * harness's recorder (helpers/stem_gl_harness.ts), never from calling getContext here:
 * that call CREATES a live context on a canvas the tool never set up, and for months
 * the molecule row "mounted a live GL context" that only this file had made. So:
 *   - the GL canvas must carry a context the PAGE created (createdBy 'page');
 *   - "builds a scene" needs draw calls on that context AND non-blank pixels, read
 *     with every overlay hidden (a HUD over a dead canvas photographs as content),
 *     and, where a row sets minMeshes, a three.js mesh census;
 *   - a tool that asked StemLab.ensureThree for OrbitControls must have been given
 *     them (the harness stub does not load them; use extraScripts);
 *   - "releases" requires every context the mount created to be LOST after unmount,
 *     read before the harness's own cleanup runs. Counting canvases React had already
 *     removed could not see a leak at all.
 * The gates themselves are proven able to fail in 22b-stem-gl-harness-selftest.
 *
 * Blank-pixel calibration (full battery, 2026-09-22): the 16 real scenes measured a
 * dominant-colour share of 0.05 to 0.97 (molecule highest) with 3 to 170 significant
 * colours; a canvas with no GL output measures 1.00 with one colour. looksBlank()
 * fires at >= 0.995 or < 2 colours.
 *
 * RUN IT (16 to 40 minutes on one worker, depending on load; 37 min measured on
 * 2026-09-22 while other lanes were busy; never alongside another Playwright suite):
 *   npx playwright test tests/e2e/22-stem-gl-conformance.spec.ts --workers=1 --reporter=list
 * Judge the run by its EXIT CODE. Retries are OFF in this file: under the config's
 * retries: 1, a test that failed once and passed on retry was reported "flaky", and
 * flaky does not fail the exit code, so a red battery could exit 0. Piping through
 * tail can also cut the summary; read the last "N failed" line or the exit code.
 * One row: add  -g "molecule"  (the describe titles are "<id> — WebGL conformance").
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
  /** Scripts loaded after the registry, before the tool, e.g. OrbitControls. */
  extraScripts?: string[];
  /** 'document' for long scrolling tools whose root collapses in a flex row. */
  layout?: 'viewport' | 'document';
  /** Floor for the three.js mesh census, for rows whose scene size is known. */
  minMeshes?: number;
  /** Serve the app's compiled CSS: for tools sized by Tailwind classes. */
  appStyles?: boolean;
}

const ORBIT = 'vendor/three-r128/OrbitControls.js';

// Mesh-census floors, from the scenes as first measured with OrbitControls loaded
// (2026-09-22). A floor, not an exact count: the point is that a scene was BUILT.
const MOLECULE_MIN_MESHES = 9; // methane, ball-and-stick: 5 atoms + 4 bonds
const GEOSANDBOX_MIN_MESHES = 2;

// Methane exactly as the tool's own preset list has it. The viewer opens EMPTY
// (d.atoms defaults to []), so an unseeded row renders lights and no molecule.
const METHANE = {
  atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' },
    { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' },
    { el: 'H', x: 200, y: 220, color: '#60a5fa' }],
  bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
  formula: 'CH₄',
};

// Verified by mounting each one: these reach a live GL canvas with no state at all,
// unless the row says otherwise.
const MANIFEST: ToolEntry[] = [
  { id: 'solarSystem', file: 'stem_lab/stem_tool_solarsystem.js' },
  // Unstyled, its canvas ran 31px past its parent (1278 vs 1247) and failed "fits
  // parent"; with the app's CSS it fits. That failure was the harness, not the tool.
  { id: 'galaxy', file: 'stem_lab/stem_tool_galaxy.js', appStyles: true },
  { id: 'geometryWorld', file: 'stem_lab/stem_tool_geometryworld.js', note: 'also mounts a 2D HUD canvas' },
  // Both ask StemLab.ensureThree for OrbitControls. Without them molecule's initThree
  // returns before creating a renderer (so this row tested nothing), and geoSandbox
  // builds a scene with no camera controls, which is not the tool students get.
  {
    id: 'molecule', file: 'stem_lab/stem_tool_molecule.js', extraScripts: [ORBIT],
    state: { molecule: METHANE }, minMeshes: MOLECULE_MIN_MESHES,
    // Its canvas is sized by Tailwind's w-full h-full; unstyled it is the browser's
    // default 300x150, which is not the view a student gets.
    appStyles: true,
    note: 'methane in the viewer; needs OrbitControls or it never builds a renderer',
  },
  {
    id: 'geoSandbox', file: 'stem_lab/stem_tool_geosandbox.js', extraScripts: [ORBIT],
    minMeshes: GEOSANDBOX_MIN_MESHES,
    note: 'default plot; needs OrbitControls for the camera the app gives it',
  },
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
    id: 'treeLab',
    file: 'stem_lab/stem_tool_treelab.js',
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'procedural tree on the Grow tab; reaches 3D on a default mount',
  },
  {
    id: 'nuclearLab',
    file: 'stem_lab/stem_tool_nuclearlab.js',
    preScripts: ['stem_lab/stem_lab_module.js'],
    // Its root sets container-type: inline-size, whose intrinsic width is 0, so in
    // the default flex #wrap the whole lab collapsed to 0px and every canvas was
    // invisible (all five checks timed out, 2026-09-22). Block flow is how the app
    // lays it out; 31-nuclearlab-charts does the same by hand.
    // appStyles too: the viewer's box gets position:relative from a Tailwind class, so
    // unstyled the absolute mount node filled #wrap and the "reactor" canvas was
    // 1280x18091, the whole document, instead of the 260px-tall view.
    layout: 'document', appStyles: true,
    note: 'reactor core 3D on a default mount (section 20 of a long page); also mounts 2D charts',
  },
  // Nutrient Body Map lives behind the hub; the glass figure builds on the
  // shared bay viewer once view=bodyMap is set (verified by mounting).
  {
    id: 'nutritionLab',
    file: 'stem_lab/stem_tool_nutritionlab.js',
    state: { nutritionLab: { view: 'bodyMap', bm_nutrient: 'iron' } },
    preScripts: ['stem_lab/stem_lab_module.js'],
    note: 'body map on the shared viewer; hub view has no canvas',
  },
  // Migration opens on its 3D Flight tab, so the corridor builds with no state.
  // NOT a bay-viewer tool: it constructs its own WebGLRenderer and only uses
  // StemLab.ensureThree to fetch three, so no preScripts are needed. Its GL
  // canvas carries role="presentation" + aria-hidden while the keyboard
  // handlers live on the focusable stage wrapper, so the focusable-app check
  // passes by having no role="application" canvas at all — which is the right
  // shape, not a gap.
  {
    id: 'migration',
    file: 'stem_lab/stem_tool_migration.js',
    note: '3D flight corridor on the default tab; other tabs mount 2D canvases',
  },
  {
    id: 'raptorHunt',
    file: 'stem_lab/stem_tool_raptorhunt.js',
    state: {
      raptorHunt: {
        activeSection: 'hunt',
        selectedSpecies: 'peregrine',
        activeMission: 'open',
        flightSession: { speciesId: 'peregrine', missionId: 'open' },
        huntTutorialDismissed: true,
        graphicsQuality: 'balanced',
      },
    },
    note: 'active flight session with weather, target feedback, and keyboard controls',
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
// evaStarted flag, and I guessed it wrong twice from the source first. Several
// (anatomy, magnetism, particleLab3d, probability, and molecule/geoSandbox above) ask
// for THREE.OrbitControls, which is vendored at vendor/three-r128/OrbitControls.js and
// attaches to the THREE global. Pass it via extraScripts: the first check below fails
// a row whose tool asked for it and did not get it.

// Everything read from the harness's GL recorder; nothing here calls getContext.
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
    var live = 0;
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('role') === 'application') {
        apps.push({ tabIndex: all[i].tabIndex, focusable: all[i].tabIndex >= 0 });
      }
      var rec = window.__glRecord(all[i]);
      if (rec && !rec.ctx.isContextLost()) live++;
    }
    return {
      lost: hit.gl.isContextLost(),
      createdBy: hit.rec.createdBy,
      draws: hit.rec.draws,
      box: { w: Math.round(cr.width), h: Math.round(cr.height) },
      parentBox: { w: Math.round(pr.width), h: Math.round(pr.height) },
      appCanvases: apps,
      glCount: live
    };
  };
  // For failure messages: what the page had instead of a GL canvas.
  window.__conformWhy = function () {
    return {
      canvases: [].map.call(document.querySelectorAll('#wrap canvas'), function (c) {
        var b = c.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height);
      }),
      contexts: window.__glContexts(),
      ensureThree: window.__harnessNotes.ensureThree
    };
  };
`;

test.describe.configure({ timeout: 150_000, retries: 0 });

for (const tool of MANIFEST) {
  test.describe(`${tool.id} — WebGL conformance`, () => {
    const harness = new GlHarness({
      toolFile: tool.file, toolId: tool.id, width: 1280, height: 820, probes: PROBES,
      preScripts: tool.preScripts, extraScripts: tool.extraScripts, layout: tool.layout,
      appStyles: tool.appStyles,
    });

    test.beforeAll(async () => { await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    // Chromium caps live WebGL contexts per PROCESS and kills the oldest silently.
    test.afterEach(async ({ page }) => { await harness.destroy(page); });

    const conform = async (page: Page) => {
      const c = await page.evaluate(() => (window as any).__conform());
      if (!c) {
        const why = await page.evaluate(() => (window as any).__conformWhy());
        expect(c, `${tool.id}: no canvas carries a GL context the page created\n${JSON.stringify(why, null, 1)}`).not.toBeNull();
      }
      return c;
    };

    test('mounts a live GL context the tool created, without throwing', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      const c = await conform(page);

      expect(c.createdBy, `${tool.id}: the only GL context was created by test code, not the tool`).toBe('page');
      expect(c.lost, `${tool.id}: context lost at mount`).toBe(false);

      const orbit = await page.evaluate(() => ({
        asked: (window as any).__harnessNotes.ensureThree.some((n: { orbit: boolean }) => n.orbit),
        present: !!((window as any).THREE && (window as any).THREE.OrbitControls),
      }));
      expect(!orbit.asked || orbit.present,
        `${tool.id} asked StemLab.ensureThree for OrbitControls, which the harness stub does not load, `
        + `so this row is testing a tool the app never runs. Add '${ORBIT}' to its extraScripts.`).toBe(true);

      const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
        .filter((m: string) => !/ResizeObserver loop/.test(m));
      expect(errs, `${tool.id}: page errors`).toEqual([]);
    });

    test('builds a scene: draw calls and non-blank pixels on its own canvas', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      const c = await conform(page);
      expect(c.draws, `${tool.id}: the GL context has issued no draw calls (it only clears, or never renders)`).toBeGreaterThan(0);

      const scene = await harness.glScene(page);
      const px = await harness.glPixels(page);
      const stats = px ? { ...px, png: undefined } : null;
      test.info().annotations.push({ type: 'gl-evidence', description: JSON.stringify({ draws: c.draws, scene, pixels: stats }) });
      expect(px, `${tool.id}: no GL canvas to photograph`).not.toBeNull();
      // Overlays hidden and the CSS background flattened, so only GL output counts.
      expect(looksBlank(px!), `${tool.id}: canvas pixels are blank\n${JSON.stringify(stats)}`).toBe(false);
      if (tool.minMeshes) {
        expect(scene?.visibleMeshes ?? 0,
          `${tool.id}: three.js scene has too few visible meshes\n${JSON.stringify(scene)}`).toBeGreaterThanOrEqual(tool.minMeshes);
      }
    });

    test('holds a stable size and stays inside its parent', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      await conform(page);

      const samples: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        samples.push(JSON.stringify((await page.evaluate(() => (window as any).__conform())).box));
        await page.waitForTimeout(200);
      }
      const distinct = [...new Set(samples)];
      expect(distinct.length, `${tool.id}: canvas size unstable\n${distinct.join('\n')}`).toBe(1);

      const c = await page.evaluate(() => (window as any).__conform());
      expect(c.box.w * c.box.h, `${tool.id}: GL canvas has no area (${c.box.w}x${c.box.h})`).toBeGreaterThan(0);
      expect(c.box.w, `${tool.id}: canvas wider than parent`).toBeLessThanOrEqual(c.parentBox.w + 1);
      expect(c.box.h, `${tool.id}: canvas taller than parent`).toBeLessThanOrEqual(c.parentBox.h + 1);
    });

    test('any canvas claiming role="application" is keyboard reachable', async ({ page }) => {
      // Moon Mission's EVA had the role, canvas-bound key handlers, and no tabIndex,
      // so the whole moonwalk was mouse-only. Pointer lock hid it completely from
      // anyone testing with a mouse.
      await harness.mount(page, tool.state || {});
      // Must be the 3D view: with no GL canvas this check would pass on any page.
      const c = await conform(page);

      c.appCanvases.forEach((a: { tabIndex: number; focusable: boolean }) => {
        expect(a.focusable,
          `${tool.id}: a canvas declares role="application" but tabIndex=${a.tabIndex}, so keyboard users cannot reach it`).toBe(true);
      });
    });

    test('releases every GL context it created on unmount', async ({ page }) => {
      await harness.mount(page, tool.state || {});
      const c = await conform(page);
      expect(c.glCount, `${tool.id}: no live GL context to release`).toBeGreaterThan(0);

      // Unmount ONLY: the harness's own cleanup (destroy, in afterEach) would lose
      // every context itself and hide a leak. Tools release on a deferred tick.
      await harness.unmount(page);
      const leaked = await harness.leakedAfterUnmount(page);
      expect(leaked, `${tool.id}: GL context(s) still live after unmount; the tool never `
        + `lost them (renderer.forceContextLoss / StemLab.releaseGl). Created by:\n`
        + leaked.map((l) => `  #${l.id} ${l.type} ${l.width}x${l.height} ${l.creator.join(' <- ')}`).join('\n')).toEqual([]);
      expect(await page.evaluate(() => document.querySelectorAll('#wrap canvas').length),
        `${tool.id}: canvas left behind after unmount`).toBe(0);
    });
  });
}

test.describe('raptorHunt — deterministic celestial atmosphere', () => {
  test.describe.configure({ timeout: 240_000 });
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_raptorhunt.js',
    toolId: 'raptorHunt',
    width: 1280,
    height: 820,
    probes: 'window.AlloPostFXEnabled = false;',
  });
  const flightState = {
    raptorHunt: {
      activeSection: 'hunt',
      selectedSpecies: 'baldEagle',
      activeMission: 'highStoop',
      flightSession: { speciesId: 'baldEagle', missionId: 'highStoop' },
      huntTutorialDismissed: true,
      graphicsQuality: 'balanced',
    },
  };

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('switches rendered atmosphere and preserves semantic bird, camera, and target visuals', async ({ page }) => {
    await harness.mount(page, flightState, "document.querySelector('[data-raptor-canvas=true]')?._rhSnapshot");
    const currentSnapshot = () => page.evaluate(
      () => (document.querySelector('[data-raptor-canvas="true"]') as any)._rhSnapshot(),
    );
    const command = (action: string, value?: Record<string, number | string>) => page.evaluate(
      ({ nextAction, nextValue }) => {
        const canvas = document.querySelector('[data-raptor-canvas="true"]') as any;
        canvas._rhCommand(nextAction, nextValue);
      },
      { nextAction: action, nextValue: value },
    );
    const snapshot = async (dayPhase: number, cloudCover: number) => {
      await command('environment', { dayPhase, cloudCover, windDir: 0, windSpeed: 8 });
      await expect.poll(async () => Math.round((await currentSnapshot()).cloudCover * 100), {
        timeout: 5_000,
      }).toBe(Math.round(cloudCover * 100));
      await page.waitForTimeout(350);
      return currentSnapshot();
    };

    const clearNoon = await snapshot(0.5, 0.05);
    const cadenceStart = clearNoon;
    await page.waitForTimeout(1_200);
    const cadenceEnd = await currentSnapshot();
    const clearNight = await snapshot(0, 0.05);
    const overcastNight = await snapshot(0, 0.95);

    expect(clearNoon.sunOpacity).toBeGreaterThan(clearNoon.moonOpacity);
    expect(clearNoon.sunAltitude).toBeGreaterThan(0);
    expect(clearNoon.moonAltitude).toBeLessThan(0);
    expect(clearNoon.lakeSheenOpacity).toBeGreaterThan(0.1);
    expect(clearNoon.skyColorHex).toBe(clearNoon.backgroundColorHex);
    expect(clearNoon.skyBrightness).toBeGreaterThan(clearNight.skyBrightness);
    expect(clearNoon.sunCameraDistance).toBeCloseTo(700, 1);
    expect(clearNoon.moonCameraDistance).toBeCloseTo(690, 1);
    expect(clearNoon.cameraAltitude).toBeGreaterThan(900);
    expect(clearNoon.skyDomeMargin).toBeGreaterThan(895);
    expect(clearNoon.fogFar).toBeGreaterThan(clearNoon.cameraAltitude + 200);
    expect(clearNoon.highCloudCount).toBeGreaterThan(0);

    expect(clearNoon.raptorSpeciesId).toBe('baldEagle');
    expect(clearNoon.raptorSilhouetteKind).toBe('eagle');
    expect(clearNoon.raptorPlumageMarkKind).toBe('bald-eagle-adult');
    expect(clearNoon.raptorFieldMarkIds).toEqual(expect.arrayContaining(['white-head', 'white-tail']));
    expect(clearNoon.leftPrimaryFeatherCount).toBeGreaterThan(0);
    expect(clearNoon.rightPrimaryFeatherCount).toBe(clearNoon.leftPrimaryFeatherCount);
    expect(clearNoon.taperedPrimaryFeatherCount)
      .toBe(clearNoon.leftPrimaryFeatherCount + clearNoon.rightPrimaryFeatherCount);
    expect(clearNoon.raptorVisualRadius).toBeGreaterThan(1);

    const baselineFlight = await currentSnapshot();
    expect(baselineFlight.cameraMode).toBe('chase');
    expect(baselineFlight.diveActive).toBe(false);
    expect(baselineFlight.cameraDistanceToRaptor).toBeGreaterThan(1);
    expect(baselineFlight.cameraHeightAboveRaptor).toBeGreaterThan(0);
    expect(Math.abs(baselineFlight.raptorNdcX)).toBeLessThan(0.9);
    expect(Math.abs(baselineFlight.raptorNdcY)).toBeLessThan(0.9);

    await command('hold', { key: 'shift', pressed: 1 });
    await expect.poll(async () => (await currentSnapshot()).diveActive, { timeout: 5_000 }).toBe(true);
    // The stoop is gravity-limited (eae303085): the dive FOV widens only once speed
    // passes 0.8 x level speed, about 1.5 s of SIMULATED time for the bald eagle, and
    // the sim clamps dt to 0.05 s a frame. At SwiftShader's few frames a second that is
    // many seconds of wall clock, so the old 5 s poll failed at 70.3 against > 72 on a
    // working dive. The claim is the direction (a stoop widens the view), not the rate.
    try {
      await expect.poll(async () => (await currentSnapshot()).cameraFov, { timeout: 45_000 })
        .toBeGreaterThan(baselineFlight.cameraFov + 2);
    } catch (err) {
      const s = await currentSnapshot();
      throw new Error(`dive FOV never widened past ${baselineFlight.cameraFov + 2}: `
        + JSON.stringify({ speedMph: s.speedMph, cameraFov: s.cameraFov, renderFrames: s.renderFrames,
          baselineSpeedMph: baselineFlight.speedMph }) + '\n' + (err as Error).message);
    }
    const diveFlight = await currentSnapshot();
    expect(diveFlight.cameraMode).toBe('chase');
    expect(diveFlight.cameraDistanceToRaptor).toBeGreaterThan(1);
    expect(diveFlight.cameraHeightAboveRaptor).toBeGreaterThan(0);
    expect(Math.abs(diveFlight.raptorNdcX)).toBeLessThan(0.9);
    expect(Math.abs(diveFlight.raptorNdcY)).toBeLessThan(0.9);
    await command('hold', { key: 'shift', pressed: 0 });
    await expect.poll(async () => (await currentSnapshot()).diveActive, { timeout: 5_000 }).toBe(false);

    expect(clearNight.moonOpacity).toBeGreaterThan(clearNight.sunOpacity);
    expect(clearNight.moonAltitude).toBeGreaterThan(0);
    expect(clearNight.sunAltitude).toBeLessThan(0);
    expect(clearNight.lakeSheenOpacity).toBeLessThan(0.01);
    expect(clearNight.skyColorHex).toBe(clearNight.backgroundColorHex);
    expect(clearNight.skyColorHex).not.toBe(clearNoon.skyColorHex);
    expect(clearNight.starVisibility).toBeGreaterThan(overcastNight.starVisibility);
    expect(overcastNight.fogFar).toBeLessThan(clearNight.fogFar);
    expect(overcastNight.cloudOpacity).toBeGreaterThan(clearNight.cloudOpacity);

    expect(await page.locator('.rh-flight-telemetry,.rh-flight-status,.rh-flight-energy').count()).toBe(0);

    const initialAssist = await currentSnapshot();
    expect(initialAssist.assistEnabled).toBe(true);
    expect(initialAssist.preyCount).toBeGreaterThan(0);
    expect(initialAssist.visibleBeaconCount).toBeLessThanOrEqual(1);
    expect(initialAssist.activeTargetIndex).toBeGreaterThanOrEqual(-1);
    expect(initialAssist.activeTargetIndex).toBeLessThan(initialAssist.preyCount);

    // Two elements carry data-raptor-reticle since 6f0b50fd1 (the React .rh-flight-reticle
    // and the projected .rh-target-tracker); the edge/offscreen state is the tracker's.
    const reticle = page.locator('.rh-target-tracker[data-raptor-reticle="true"]');
    await command('targetProbe', { ndcX: 1.6, ndcY: 1.4, ndcZ: 0 });
    await expect.poll(async () => reticle.getAttribute('data-offscreen'), { timeout: 5_000 }).toBe('true');
    const edgeReticle = await reticle.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hostRect = (element.parentElement as HTMLElement).getBoundingClientRect();
      return {
        display: getComputedStyle(element).display,
        targetEdge: (element as HTMLElement).dataset.targetEdge || '',
        left: rect.left - hostRect.left,
        top: rect.top - hostRect.top,
        right: rect.right - hostRect.left,
        bottom: rect.bottom - hostRect.top,
        hostWidth: hostRect.width,
        hostHeight: hostRect.height,
      };
    });
    expect(edgeReticle.display).not.toBe('none');
    expect(edgeReticle.targetEdge).toContain('right');
    expect(edgeReticle.targetEdge).toContain('top');
    expect(edgeReticle.left).toBeGreaterThanOrEqual(0);
    expect(edgeReticle.top).toBeGreaterThanOrEqual(0);
    expect(edgeReticle.right).toBeLessThanOrEqual(edgeReticle.hostWidth);
    expect(edgeReticle.bottom).toBeLessThanOrEqual(edgeReticle.hostHeight);

    await command('assist');
    await expect.poll(async () => (await currentSnapshot()).assistEnabled, { timeout: 5_000 }).toBe(false);
    expect((await currentSnapshot()).visibleBeaconCount).toBe(0);
    await expect.poll(async () => reticle.evaluate((element) => getComputedStyle(element).display), {
      timeout: 5_000,
    }).toBe('none');
    await command('targetProbe', { clear: 1 });
    await command('assist');
    await expect.poll(async () => (await currentSnapshot()).assistEnabled, { timeout: 5_000 }).toBe(true);
    await expect.poll(async () => (await currentSnapshot()).visibleBeaconCount, { timeout: 5_000 })
      .toBeLessThanOrEqual(1);

    const horizon = await currentSnapshot();
    expect(horizon.distantTerrainCount).toBeGreaterThan(0);
    // The ranges stay fixed in WORLD space for parallax (ed897988b), so the group sits
    // at the origin and its offset from the bird is minus the bird's position. The
    // follow-the-bird contract this used to pin was retired on purpose; see also
    // raptor-cinematic-rendering.spec.ts.
    expect(Math.abs(horizon.distantTerrainOffsetX + horizon.raptorPosition.x)).toBeLessThan(0.01);
    expect(Math.abs(horizon.distantTerrainOffsetZ + horizon.raptorPosition.z)).toBeLessThan(0.01);
    expect(Math.abs(horizon.distantTerrainWorldY)).toBeLessThan(0.01);

    const poolCapacity = {
      rain: horizon.rainCapacity,
      snow: horizon.snowCapacity,
    };
    expect(poolCapacity.rain).toBeGreaterThan(0);
    expect(poolCapacity.snow).toBeGreaterThan(0);
    await command('environment', {
      dayPhase: 0,
      cloudCover: 0.95,
      windDir: Math.PI / 2,
      windSpeed: 12,
      tempC: 14,
      precipitationType: 'rain',
      precipitationIntensity: 0.82,
    });
    await expect.poll(async () => {
      const state = await currentSnapshot();
      return [state.precipitationMode, state.rainVisible, state.snowVisible];
    }, { timeout: 5_000 }).toEqual(['rain', true, false]);
    const rain = await currentSnapshot();
    expect(rain.activePrecipitationCount).toBeGreaterThan(0);
    expect(rain.activePrecipitationCount).toBeLessThanOrEqual(rain.rainCapacity);
    expect(rain.rainCapacity).toBe(poolCapacity.rain);
    expect(rain.snowCapacity).toBe(poolCapacity.snow);
    const rainWeather = await page.locator('[data-raptor-weather="true"]').evaluate((element) => ({
      precipitation: (element as HTMLElement).dataset.precipitation,
      windDirection: (element as HTMLElement).dataset.windDirection,
      label: element.getAttribute('aria-label'),
    }));
    expect(rainWeather.precipitation).toBe('rain');
    expect(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']).toContain(rainWeather.windDirection);
    expect(rainWeather.label).toContain(rainWeather.windDirection);

    await command('environment', {
      dayPhase: 0,
      cloudCover: 0.95,
      windDir: 0,
      windSpeed: 8,
      tempC: -8,
      precipitationType: 'snow',
      precipitationIntensity: 0.72,
    });
    await expect.poll(async () => {
      const state = await currentSnapshot();
      return [state.precipitationMode, state.rainVisible, state.snowVisible];
    }, { timeout: 5_000 }).toEqual(['snow', false, true]);
    const snow = await currentSnapshot();
    expect(snow.activePrecipitationCount).toBeGreaterThan(0);
    expect(snow.activePrecipitationCount).toBeLessThanOrEqual(snow.snowCapacity);
    expect(snow.rainCapacity).toBe(poolCapacity.rain);
    expect(snow.snowCapacity).toBe(poolCapacity.snow);
    await expect.poll(async () => (await currentSnapshot()).precipitationUpdates, { timeout: 5_000 })
      .toBeGreaterThan(rain.precipitationUpdates);

    const waterDelta = cadenceEnd.waterUpdates - cadenceStart.waterUpdates;
    const frameDelta = cadenceEnd.renderFrames - cadenceStart.renderFrames;
    const elapsedSeconds = (cadenceEnd.snapshotTimeMs - cadenceStart.snapshotTimeMs) / 1_000;
    const waterRate = waterDelta / elapsedSeconds;
    expect(elapsedSeconds).toBeGreaterThan(0.8);
    expect(waterDelta).toBeGreaterThanOrEqual(1);
    expect(waterRate).toBeLessThanOrEqual(cadenceEnd.waterHz + 2);
    expect(frameDelta).toBeGreaterThan(0);

    const canvas = page.locator('[data-raptor-canvas="true"]');
    await canvas.evaluate((element: any) => element._rhCommand('pause'));
    const pausedStart = await currentSnapshot();
    await page.waitForTimeout(450);
    const pausedEnd = await currentSnapshot();
    expect(pausedEnd.renderFrames - pausedStart.renderFrames).toBeLessThanOrEqual(1);
    expect(pausedEnd.waterUpdates - pausedStart.waterUpdates).toBe(0);
    await canvas.evaluate((element: any) => element._rhCommand('pause'));
    await expect.poll(async () => (await currentSnapshot()).renderFrames, {
      timeout: 5_000,
    }).toBeGreaterThan(pausedEnd.renderFrames + 2);

    const weatherLocator = page.locator('[data-raptor-weather="true"]');
    const weather = await weatherLocator.evaluate((element) => ({
      display: getComputedStyle(element).display,
      text: element.textContent,
      dayPeriod: (element as HTMLElement).dataset.dayPeriod,
      cloudBand: (element as HTMLElement).dataset.cloudBand,
      precipitation: (element as HTMLElement).dataset.precipitation,
      windDirection: (element as HTMLElement).dataset.windDirection,
      label: element.getAttribute('aria-label'),
    }));
    expect(weather.display).not.toBe('none');
    expect(weather.text).toContain('95%');
    expect(weather.dayPeriod).toBe('night');
    expect(weather.cloudBand).toBe('overcast');
    expect(weather.precipitation).toBe('snow');
    expect(weather.windDirection).toBe('N');
    expect(weather.label).toContain('toward N');

    await page.setViewportSize({ width: 700, height: 820 });
    await expect(weatherLocator).toBeVisible();
    await expect(page.locator('[data-raptor-mission-metric="true"]')).toBeHidden();

    const errors = await page.evaluate(() => (window as any).__events.errors);
    expect(errors).toEqual([]);
  });
});
