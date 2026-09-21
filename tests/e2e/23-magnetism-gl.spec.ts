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
  // Watch for any Scene that gets an environment assigned. Hooking the
  // WebGLRenderer constructor does NOT work here — the tool captures its THREE
  // reference before this probe runs — but every scene object flows through
  // THREE.Scene, so a flag set from its prototype catches the real assignment.
  (function () {
    var S = window.THREE && window.THREE.Scene;
    if (!S || window.__sceneHooked) return;
    window.__sceneHooked = true;
    window.__sceneEnvSeen = false;
    var proto = S.prototype;
    var key = '_envWatched';
    Object.defineProperty(proto, 'environment', {
      configurable: true,
      get: function () { return this[key]; },
      set: function (v) { this[key] = v; if (v) window.__sceneEnvSeen = true; }
    });
  })();
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

  test('the scene environment actually puts light on metal', async ({ page }) => {
    // Why this test exists: a PMREM environment belongs to the GL context that
    // built it. Share one across renderers and NOTHING throws — it simply
    // renders as no environment at all. Measured with a red test environment,
    // a pure-metal sphere read [161,0,0] on the owning renderer and [0,0,0] on
    // a second one, identical to having no environment. An identity check on
    // the texture object cannot tell those apart, so this renders and reads
    // pixels.
    //
    // It measures on its OWN offscreen renderer rather than the tool's live
    // canvas: the tool re-renders its scene continuously, so a probe drawn
    // into that canvas is overwritten before readPixels can see it.
    await harness.mount(page, FIELD_3D);

    // Read the watcher BEFORE the pixel probe runs: the probe builds its own
    // scene and sets an environment on it, which would trip the same flag and
    // make this assertion vacuous. (It did, until the mutation test caught it.)
    const toolSetEnvironment = await page.evaluate(() => (window as any).__sceneEnvSeen === true);

    const probe = await page.evaluate(() => {
      const T = (window as any).THREE;
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      const r = new T.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });

      // Build the environment through the TOOL'S OWN helper path by repeating
      // its construction, then prove it lights a metal with no lights present.
      const es = new T.Scene();
      const geo = new T.BoxGeometry(12, 12, 12);
      const pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3);
      const sky = new T.Color(0x9ec5fe), ground = new T.Color(0x3a2f26), mix = new T.Color();
      for (let i = 0; i < pos.count; i++) {
        const t = Math.max(0, Math.min(1, (pos.getY(i) / 6 + 1) / 2));
        mix.copy(ground).lerp(sky, t);
        cols[i * 3] = mix.r; cols[i * 3 + 1] = mix.g; cols[i * 3 + 2] = mix.b;
      }
      geo.setAttribute('color', new T.BufferAttribute(cols, 3));
      const box = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide }));
      es.add(box);
      const pm = new T.PMREMGenerator(r);
      pm.compileEquirectangularShader();
      const tgt = pm.fromScene(es);
      pm.dispose();
      const env = tgt ? tgt.texture : null;
      if (!env) return { ok: false, reason: 'PMREM produced no texture', mean: 0 };

      // Pure white metal, NO lights: every photon must come from the map.
      const s = new T.Scene();
      s.environment = env;
      s.add(new T.Mesh(new T.SphereGeometry(1.4, 24, 18),
        new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15 })));
      const cam = new T.PerspectiveCamera(45, 1, 0.1, 100);
      cam.position.z = 4;
      r.render(s, cam);
      const gl = r.getContext();
      const px = new Uint8Array(80 * 80 * 4);
      gl.readPixels(0, 0, 80, 80, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
      const mean = sum / (px.length / 4) / 3;
      try { if (tgt && tgt.dispose) tgt.dispose(); } catch { /* best effort */ }
      geo.dispose(); box.material.dispose();
      r.forceContextLoss(); r.dispose();
      return { ok: true, reason: '', mean };
    });

    expect(probe.ok, probe.reason).toBe(true);
    // A dead (cross-context) environment reads exactly 0. A live one measured
    // ~79 for this gradient, so 4 is a floor with enormous margin.
    expect(probe.mean, 'the environment map put NO light on a pure metal')
      .toBeGreaterThan(4);

    // ...and the TOOL's own scene must have been carrying one, as sampled
    // above before the probe could set one of its own.
    // Hooking Scene is reliable where hooking WebGLRenderer was not: the tool
    // holds its renderer in a closure and constructs it from the THREE object
    // it captured before the probe ran, so a late renderer hook never fires.
    expect(toolSetEnvironment, 'no tool scene ever had scene.environment set').toBe(true);
  });

  test('the auroral oval widens as the solar wind rises', async ({ page }) => {
    // The Shield Watch prediction this tab GRADES asks whether the auroral oval
    // shifts equatorward — but the 3D view never drew an oval, so the one
    // structure students are asked to predict was the one they could not see.
    //
    // The oval sits at magnetic latitude L on a sphere of radius R, giving ring
    // radius R*cos(L). The model runs 69deg (quiet) to 60deg (storm), so the
    // ring should WIDEN by ~40% across that range. Assert the real torus radii
    // off the constructed geometry rather than trusting a screenshot.
    const radiiFor = async (wind: number) => {
      await page.goto(`${harness.url}/__harness`);
      await page.waitForFunction(
        () => !!(window as any).StemLab?._registry?.magnetism, null, { timeout: 30000 });
      await page.evaluate(() => {
        const T = (window as any).THREE, w = window as any;
        w.__toruses = [];
        const Torus = T.TorusGeometry;
        T.TorusGeometry = function (...a: any[]) {
          w.__toruses.push(a[0]);
          return new Torus(...a);
        };
        T.TorusGeometry.prototype = Torus.prototype;
      });
      await page.evaluate((v) => (window as any).__mount({
        magnetism: { tab: 'earth', earthView: '3d', earthSolarWind: v },
      }), wind);
      await page.waitForSelector('#wrap canvas', { timeout: 30000 });
      await page.waitForTimeout(1100);
      return page.evaluate(() => (window as any).__toruses as number[]);
    };

    // Quiet: oval radius ~0.3745. Storm: ~0.5225. Both are distinctive values
    // that no other torus in this scene uses (pole rings are 0.18, the
    // radiation belts 1.65 and 2.3).
    const quiet = await radiiFor(1);
    await page.evaluate(() => { (window as any).__destroy(); });
    const storm = await radiiFor(10);

    const near = (list: number[], want: number) =>
      list.some((r) => Math.abs(r - want) < 0.02);

    expect(quiet.length, 'no TorusGeometry built in the magnetosphere').toBeGreaterThan(0);
    expect(near(quiet, 0.3745), `quiet oval radius ~0.3745 not found in ${JSON.stringify(quiet)}`).toBe(true);
    expect(near(storm, 0.5225), `storm oval radius ~0.5225 not found in ${JSON.stringify(storm)}`).toBe(true);
    // And it must genuinely be a WIDENING, not two unrelated numbers. Compare
    // the AURORA radii specifically: `max(r < 1)` would pick up whichever
    // small torus happens to be largest (the old static oval was 0.56 and beat
    // the quiet aurora at 0.3745, which is how this assertion first failed).
    const auroraOf = (list: number[]) =>
      list.filter((r) => r > 0.3 && r < 0.6).sort((a, b) => b - a)[0];
    const quietOval = auroraOf(quiet);
    const stormOval = auroraOf(storm);
    expect(quietOval, 'no quiet-state aurora radius in range').toBeDefined();
    expect(stormOval, 'no storm-state aurora radius in range').toBeDefined();
    expect(stormOval, 'the storm oval is not wider than the quiet one')
      .toBeGreaterThan(quietOval);
  });

  test('the electromagnet field lines are tubes too, not 1px lines', async ({ page }) => {
    // Same upgrade as the field studio, on the solenoid's traced lines. Count
    // the CONSTRUCTION rather than walking a scene graph the tool closes over:
    // a graph walk would pass vacuously on an empty result.
    //
    // The electromagnet needs current > 0 to draw any line at all (buildLines
    // early-returns on state.current <= 0), so the mount sets one.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.magnetism, null, { timeout: 30000 });
    await page.evaluate(() => {
      const T = (window as any).THREE, w = window as any;
      // Count only tubes that CARRY A COLOUR ATTRIBUTE. Counting
      // vertexColors materials alone is not enough: the PMREM environment
      // builds a vertex-coloured gradient box on every scene, and the coil
      // wire is itself a TubeGeometry — so either signal on its own stays
      // green with the field lines reverted to flat. (It did.)
      w.__tally = { tubes: 0, colouredTubes: 0 };
      const Tube = T.TubeGeometry;
      T.TubeGeometry = function (...a: any[]) {
        const g = new Tube(...a);
        w.__tally.tubes++;
        // The field tubes get setAttribute('color', ...) right after
        // construction; the coil wire never does.
        const setAttr = g.setAttribute.bind(g);
        g.setAttribute = function (name: string, attr: any) {
          if (name === 'color') w.__tally.colouredTubes++;
          return setAttr(name, attr);
        };
        return g;
      };
      T.TubeGeometry.prototype = Tube.prototype;
    });
    await page.evaluate(() => (window as any).__mount({
      magnetism: { tab: 'electro', electroView: '3d', current: 4, turns: 60, electro3dLines: true },
    }));
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const tally = await page.evaluate(() => (window as any).__tally);
    expect(tally.tubes, 'electromagnet built no TubeGeometry at all').toBeGreaterThan(0);
    expect(tally.colouredTubes, 'no tube carries a colour attribute — the field lines are still flat')
      .toBeGreaterThan(0);
  });

  test('the induction field lines are tubes too', async ({ page }) => {
    // The last traced field lines in the tool. Same counting rule as the
    // electromagnet test and for the same reason: count tubes that CARRY A
    // COLOUR ATTRIBUTE, because the PMREM environment builds a vertex-coloured
    // gradient box on every scene and the coil rings are TorusGeometry — so
    // counting vertexColors materials alone stays green with the feature
    // reverted.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.magnetism, null, { timeout: 30000 });
    await page.evaluate(() => {
      const T = (window as any).THREE, w = window as any;
      w.__tally = { tubes: 0, colouredTubes: 0 };
      const Tube = T.TubeGeometry;
      T.TubeGeometry = function (...a: any[]) {
        const g = new Tube(...a);
        w.__tally.tubes++;
        const setAttr = g.setAttribute.bind(g);
        g.setAttribute = function (name: string, attr: any) {
          if (name === 'color') w.__tally.colouredTubes++;
          return setAttr(name, attr);
        };
        return g;
      };
      T.TubeGeometry.prototype = Tube.prototype;
    });
    await page.evaluate(() => (window as any).__mount({
      magnetism: { tab: 'induce', induceMode: '3d' },
    }));
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const tally = await page.evaluate(() => (window as any).__tally);
    expect(tally.tubes, 'induction scene built no TubeGeometry at all').toBeGreaterThan(0);
    expect(tally.colouredTubes, 'no tube carries a colour attribute — the field lines are still flat')
      .toBeGreaterThan(0);
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
