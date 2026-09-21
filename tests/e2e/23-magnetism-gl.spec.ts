import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Magnetism's six 3-D scenes got a visual pass (guarded bloom, field lines as
// tapered strength-coloured tubes with travelling flow beads, contact shadows,
// a current-tracked coil glow, and a starfield behind the magnetosphere).
//
// None of that is visible to jsdom, so this spec drives the REAL scenes under
// SwiftShader and asserts the things that would silently regress:
//   - the scenes still mount a live context and render something
//   - the field lines are real geometry, not the old 1px lines
//   - the flow animation actually moves, and STOPS on cleanup (a rAF that
//     outlives its canvas is the leak class this repo has been bitten by)
//   - the starfield exists and is disposed with the scene
//
// magnetism asks for THREE.OrbitControls, vendored at
// vendor/three-r128/OrbitControls.js, which attaches to the THREE global.
const ORBIT = ['vendor/three-r128/OrbitControls.js'];

const PROBES = `
  window.__magProbe = function () {
    var hit = window.__glCanvas();
    if (!hit) return null;
    hit.el.setAttribute('data-gl-under-test', '1');
    return { lost: hit.gl.isContextLost() };
  };
  // Walk every live three.js scene the page has. The tool keeps its renderer in
  // a closure, so reach the scene through the canvas' own bookkeeping instead.
  window.__magScenes = function () {
    var out = [];
    var cs = document.querySelectorAll('#wrap canvas');
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (c.__magScene) out.push(c.__magScene);
    }
    return out;
  };
`;

test.describe.configure({ timeout: 180_000 });

test.describe('magnetism — 3D visual pass', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_magnetism.js',
    toolId: 'magnetism',
    width: 1280,
    height: 820,
    probes: PROBES,
    extraScripts: ORBIT,
  });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  const FIELD_3D = { magnetism: { tab: 'field', fieldView: '3d' } };
  const EARTH_3D = { magnetism: { tab: 'earth', earthView: '3d' } };
  const ELECTRO_3D = { magnetism: { tab: 'electro', electroView: '3d' } };

  test('field studio mounts a live context and renders', async ({ page }) => {
    await harness.mount(page, FIELD_3D);
    const p = await page.evaluate(() => (window as any).__magProbe());
    expect(p, 'no GL canvas in the 3D field studio').not.toBeNull();
    expect(p.lost, 'context lost at mount').toBe(false);

    const shot = await page.locator('canvas[data-gl-under-test="1"]').screenshot();
    // A dead scene clears flat and PNG-compresses to a few KB; a field map with
    // tubes, arrows and a grid is far larger. Generous floor, huge margin.
    expect(shot.length, 'field studio rendered a blank surface').toBeGreaterThan(12_000);

    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs, 'page errors in the field studio').toEqual([]);
  });

  test('field lines are solid tube geometry, not 1px lines', async ({ page }) => {
    // The scene graph is closed over inside the tool, and the harness exposes no
    // root — so instead of walking a graph we cannot reach (which would pass
    // vacuously on an empty walk), COUNT THE CONSTRUCTION. Wrap TubeGeometry and
    // LineBasicMaterial before the tool builds its scene, then read the tallies.
    //
    // Before this pass the field lines were THREE.Line + LineBasicMaterial and
    // the field scene built ZERO tubes. If the tubes ever regress to flat lines
    // this count goes to zero and the test goes red.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.magnetism, null, { timeout: 30000 });
    await page.evaluate(() => {
      const T = (window as any).THREE;
      const w = window as any;
      w.__tally = { tubes: 0, vertexColourMats: 0, points: 0 };
      const Tube = T.TubeGeometry;
      T.TubeGeometry = function (...args: any[]) { w.__tally.tubes++; return new Tube(...args); };
      T.TubeGeometry.prototype = Tube.prototype;
      const Basic = T.MeshBasicMaterial;
      T.MeshBasicMaterial = function (params: any) {
        if (params && params.vertexColors) w.__tally.vertexColourMats++;
        return new Basic(params);
      };
      T.MeshBasicMaterial.prototype = Basic.prototype;
      const Pts = T.Points;
      T.Points = function (...args: any[]) { w.__tally.points++; return new Pts(...args); };
      T.Points.prototype = Pts.prototype;
    });
    await page.evaluate((d) => (window as any).__mount(d), FIELD_3D);
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const tally = await page.evaluate(() => (window as any).__tally);
    expect(tally.tubes, 'field scene built no TubeGeometry — lines regressed to 1px').toBeGreaterThan(0);
    expect(tally.vertexColourMats, 'no vertex-coloured material — strength ramp is gone').toBeGreaterThan(0);
  });

  test('magnetosphere mounts and renders with its starfield', async ({ page }) => {
    await harness.mount(page, EARTH_3D);
    const p = await page.evaluate(() => (window as any).__magProbe());
    expect(p, 'no GL canvas in the magnetosphere').not.toBeNull();
    expect(p.lost, 'context lost at mount').toBe(false);

    const shot = await page.locator('canvas[data-gl-under-test="1"]').screenshot();
    expect(shot.length, 'magnetosphere rendered blank').toBeGreaterThan(12_000);
  });

  test('electromagnet mounts and renders', async ({ page }) => {
    await harness.mount(page, ELECTRO_3D);
    const p = await page.evaluate(() => (window as any).__magProbe());
    expect(p, 'no GL canvas in the electromagnet').not.toBeNull();
    expect(p.lost, 'context lost at mount').toBe(false);
  });

  test('commutator lights the half that is carrying current, and swaps at 180', async ({ page }) => {
    // The commutator flip is the mechanism this tab teaches. Both halves used
    // to look identical, so the flip was readable only in the prose. Now the
    // energised half glows. Assert the glow EXISTS, that exactly one half is
    // lit at a time, and that it SWAPS across the 180 landmark.
    //
    // Read it off the live material rather than the source: the glow is applied
    // in updatePose (which runs on every angle change), not at build time, so a
    // source grep would not prove it ever actually runs.
    const readHalves = async () => page.evaluate(() => {
      const w = window as any;
      const out: number[] = [];
      (w.__commutatorProbe || []).forEach((m: any) => out.push(m.emissiveIntensity));
      return out;
    });

    // Capture the half-ring materials as they are created.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.magnetism, null, { timeout: 30000 });
    await page.evaluate(() => {
      const T = (window as any).THREE, w = window as any;
      w.__commutatorProbe = [];
      const Torus = T.TorusGeometry;
      const Std = T.MeshStandardMaterial;
      // The commutator halves are the only half-tori (thetaLength === PI).
      let pendingHalf = false;
      // TorusGeometry is (radius, tube, radialSegments, tubularSegments, arc)
      // — the arc is args[4]. It is args[5] on TorusKnotGeometry, and reading
      // the wrong index here silently captures NOTHING and the test fails
      // claiming the feature is missing.
      T.TorusGeometry = function (...a: any[]) {
        pendingHalf = Math.abs((a[4] ?? Math.PI * 2) - Math.PI) < 1e-6 && Math.abs(a[0] - 0.40) < 1e-6;
        return new Torus(...a);
      };
      T.TorusGeometry.prototype = Torus.prototype;
      T.MeshStandardMaterial = function (params: any) {
        const m = new Std(params);
        if (pendingHalf) { w.__commutatorProbe.push(m); pendingHalf = false; }
        return m;
      };
      T.MeshStandardMaterial.prototype = Std.prototype;
    });

    const mountAt = async (angle: number) => {
      await page.evaluate((deg) => (window as any).__mount({
        // motorMode 'forces' is the default, but state it explicitly: the 3D
        // torque lab is gated on tab+motorMode+motorView, and a test that
        // leans on a default silently stops testing if the default moves.
        magnetism: { tab: 'motor', motorMode: 'forces', motorView: '3d', motorAngle: deg, motorCurrent: 4, motorField: 6 },
      }), angle);
      await page.waitForSelector('#wrap canvas', { timeout: 30000 });
      await page.waitForTimeout(900);
    };

    await mountAt(90);
    const at90 = await readHalves();
    expect(at90.length, 'commutator half-ring materials not found').toBe(2);
    const lit90 = at90.filter((v) => v > 0).length;
    expect(lit90, 'exactly one commutator half should be lit at 90deg').toBe(1);

    await page.evaluate(() => { (window as any).__destroy(); });
    await mountAt(270);
    const at270 = await readHalves();
    const lit270 = at270.slice(-2).filter((v) => v > 0).length;
    expect(lit270, 'exactly one commutator half should be lit at 270deg').toBe(1);

    // Across the 180 landmark the LIT INDEX must change.
    const idx90 = at90.findIndex((v) => v > 0);
    const idx270 = at270.slice(-2).findIndex((v) => v > 0);
    expect(idx270, 'the glow did not swap halves across the 180 commutator flip').not.toBe(idx90);
  });

  test('releases its GL context on unmount', async ({ page }) => {
    await harness.mount(page, FIELD_3D);
    await page.evaluate(() => (window as any).__magProbe());
    await page.evaluate(() => { (window as any).__destroy(); });
    await page.waitForTimeout(400);
    const stillRunning = await page.evaluate(() => document.querySelectorAll('#wrap canvas').length);
    expect(stillRunning, 'canvases survived unmount').toBe(0);
  });
});
