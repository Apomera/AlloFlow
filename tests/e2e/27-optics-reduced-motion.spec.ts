import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Optics' polarization view animates the wave through two polarizer disks.
// Whether it honours a reduced-motion preference turned on MID-SESSION cannot
// be settled by reading the source: the read sits in a render path, so it
// depends on whether anything re-renders after the preference flips. Static
// analysis got this wrong twice, so this spec asks the running tool.
test.describe.configure({ timeout: 180_000 });

test.describe('Optics — reduced motion mid-session', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_optics.js',
    toolId: 'opticsLab',
    width: 1100,
    height: 860,
  });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  // The namespace is ctx.toolData.opticsLab; 'polarization' is the animated
  // mode (OPTICS_DEFAULTS.mode lists it alongside reflection/refraction/...).
  const POLARIZATION = { opticsLab: { mode: 'polarization', polAnimate: true } };

  test('turning reduced motion ON mid-session settles the polarization view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(page, POLARIZATION);

    // The polarization view renders through OpticsGL — a WebGL scene — so
    // getImageData on the canvas returns nothing usable and the SVG paths are
    // static furniture. Measure rAF scheduling instead: it is renderer
    // agnostic and is what actually stops when motion is suppressed.
    await page.evaluate(() => {
      const w = window as any;
      w.__rafCount = 0;
      const raf = w.requestAnimationFrame.bind(w);
      w.requestAnimationFrame = (cb: any) => { w.__rafCount++; return raf(cb); };
    });
    await page.waitForTimeout(1200);

    const before = await page.evaluate(() => {
      const w = window as any; const n = w.__rafCount; w.__rafCount = 0; return n;
    });
    // Guard: prove the view IS animating before asserting that it stops.
    expect(before, 'the polarization view was not animating to begin with — test proves nothing')
      .toBeGreaterThan(0);

    // Flip the preference the way an OS accessibility toggle would.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => {
      const w = window as any; const n = w.__rafCount; w.__rafCount = 0; return n;
    });

    // Some frames may already be queued when the preference flips, so allow a
    // small tail rather than demanding an immediate hard zero.
    expect(after, `the view kept animating after reduced motion was enabled (${after} frames vs ${before} before)`)
      .toBeLessThan(Math.max(3, before * 0.25));
  });

  test('the light wave is solid geometry, not a 1px line', async ({ page }) => {
    // The wave locus IS the lesson in this scene, and it was a THREE.Line —
    // which WebGL renders at one pixel whatever linewidth asks for. Count the
    // construction rather than walking a scene graph the tool closes over: a
    // graph walk would pass vacuously on an empty result.
    //
    // The ZERO is the load-bearing half. Other furniture in this scene (the
    // axis, the disc rims, the field comb) is legitimately still Line /
    // LineSegments, so counting meshes alone would stay green with the wave
    // reverted.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.opticsLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const T = (window as any).THREE, w = window as any;
      w.__tally = { indexedMeshes: 0, wavePlainLines: 0 };
      const Mesh = T.Mesh;
      T.Mesh = function (geo: any, mat: any) {
        // The wave tube is the only indexed BufferGeometry mesh built here.
        if (geo && geo.index && geo.attributes && geo.attributes.position) w.__tally.indexedMeshes++;
        return new Mesh(geo, mat);
      };
      T.Mesh.prototype = Mesh.prototype;
      const Line = T.Line;
      T.Line = function (geo: any, mat: any) {
        // A wave-locus line has one vertex per wave sample and no index.
        const n = geo && geo.attributes && geo.attributes.position
          ? geo.attributes.position.count : 0;
        if (n > 100 && !(geo && geo.index)) w.__tally.wavePlainLines++;
        return new Line(geo, mat);
      };
      T.Line.prototype = Line.prototype;
    });
    await page.evaluate(() => (window as any).__mount({
      opticsLab: { mode: 'polarization', polAnimate: true },
    }));
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1200);

    const tally = await page.evaluate(() => (window as any).__tally);
    expect(tally.wavePlainLines, 'the wave locus is still a plain 1px THREE.Line').toBe(0);
    expect(tally.indexedMeshes, 'no indexed tube mesh was built for the wave')
      .toBeGreaterThan(0);
  });

  test('the wave is thicker on screen than a 1px line would be', async ({ page }) => {
    // Construction counts prove a Mesh was BUILT; only pixels prove it is
    // visible. readPixels is no good here: the renderer does not set
    // preserveDrawingBuffer, so the buffer is cleared after compositing and
    // reads back empty (measured: 0 non-background pixels while the scene was
    // rendering fine). A screenshot captures the COMPOSITED frame instead.
    await harness.mount(page, { opticsLab: { mode: 'polarization', polAnimate: false } });
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const shot = await page.locator('#wrap canvas').first().screenshot({ timeout: 30000 });
    const amber = await page.evaluate(async (b64: string) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      if (!g) return null;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      // The beam is amber (0xfbbf24) against a dark scene; the slate axis and
      // disc rims are not red-dominant, so they do not register.
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 150 && d[i + 1] > 100 && d[i + 2] < 90) n++;
      }
      return n;
    }, shot.toString('base64'));

    expect(amber, 'could not decode the canvas screenshot').not.toBeNull();
    // Guard: something must have rendered at all.
    expect(amber!, 'nothing amber rendered — the beam is missing entirely').toBeGreaterThan(0);
    // The floor is MEASURED, not guessed. Same scene, same camera, same
    // screenshot path:
    //   original THREE.Line locus .... 306 px
    //   tube at r=0.14 .............. 1345 px
    // 800 sits well clear of the line and well under the tube, so it catches
    // a revert to the 1px locus without being brittle about antialiasing or
    // a small radius tweak.
    expect(amber!, `the beam covers only ${amber} px — a 1px line measured 306`)
      .toBeGreaterThan(800);
  });

  test('refraction rays are solid, so width 2 vs 1 actually reads as intensity', async ({ page }) => {
    // The refraction scene passed `width: 2` for the strong incident and
    // refracted rays and `width: 1` for the weak partial reflection, straight
    // into LineBasicMaterial.linewidth — which WebGL ignores. Every ray drew
    // one pixel and the intensity encoding the code was already expressing
    // never reached the screen.
    //
    // Measure the composited frame: readPixels is useless here because the
    // renderer does not set preserveDrawingBuffer.
    await harness.mount(page, {
      opticsLab: { mode: 'refraction', refrShow3D: true, refrN1: 1, refrN2: 1.52, refrTheta1: 30 },
    });
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(1500);

    const shot = await page.locator('#wrap canvas').first().screenshot({ timeout: 30000 });
    const counts = await page.evaluate(async (b64: string) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      if (!g) return null;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      // Incident ray is amber 0xfbbf24; refracted is cyan 0x22d3ee.
      let amber = 0, cyan = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        if (r > 150 && gg > 100 && b < 90) amber++;
        else if (r < 110 && gg > 140 && b > 170) cyan++;
      }
      return { amber, cyan };
    }, shot.toString('base64'));

    expect(counts, 'could not decode the refraction canvas').not.toBeNull();
    // Guard: the rays must have rendered at all before any size claim.
    expect(counts!.amber, 'no amber incident ray rendered').toBeGreaterThan(0);
    expect(counts!.cyan, 'no cyan refracted ray rendered').toBeGreaterThan(0);
    // The floor is MEASURED, not guessed. Same scene, same camera, same
    // screenshot path:
    //   original 1px THREE.Line rays .... 44 px (amber)
    //   cylinders at 0.075/width step ... 328 px
    // 150 sits well clear of the line and well under the tube, so it catches a
    // revert without being brittle about antialiasing or a radius tweak.
    expect(counts!.amber, `incident ray covers ${counts!.amber} px — a 1px line measured 44`)
      .toBeGreaterThan(150);
    expect(counts!.cyan, `refracted ray covers ${counts!.cyan} px — a 1px line measured far less`)
      .toBeGreaterThan(150);
  });

  test("Snell's window rays are visible, not 1px lines", async ({ page }) => {
    // The window scene teaches with two fans of rays converging on an
    // underwater eye: amber (0xfcd34d) sky light entering through the window
    // cone, teal (0x5eead4) light reflected from below outside it. Both were
    // THREE.Line, i.e. one pixel wide whatever WebGL is asked for.
    //
    // Colour classes are chosen against the scene's OWN furniture: the water
    // is blue (0x60a5fa / 0x93c5fd), which a loose "cyan-ish" test would count
    // as teal. Teal has green ABOVE blue; those blues do not. The pale-amber
    // window rim (0xfde68a) has blue 138, so it stays out of the amber class.
    await harness.mount(page, {
      opticsLab: { mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1.0 },
    });
    await page.waitForSelector('canvas[data-optics-window-gl="true"]', { timeout: 30000 });
    await page.waitForTimeout(1800);

    const shot = await page.locator('canvas[data-optics-window-gl="true"]').first()
      .screenshot({ timeout: 30000 });
    const px = await page.evaluate(async (b64: string) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      if (!g) return null;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let amber = 0, teal = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        if (r > 180 && gg > 150 && b < 110 && r > gg) amber++;
        else if (gg > 140 && gg > b && r < 130) teal++;
      }
      return { amber, teal };
    }, shot.toString('base64'));

    expect(px, 'could not decode the window canvas').not.toBeNull();
    // Guard: both fans must have rendered at all before any size claim.
    expect(px!.amber, 'no amber sky rays rendered').toBeGreaterThan(0);
    expect(px!.teal, 'no teal reflected rays rendered').toBeGreaterThan(0);
    // Floors are MEASURED on this canvas, same camera, same screenshot path:
    //                      1px lines   all cylinders   teal-only (shipped)
    //   amber sky fan        1000       ~434              983
    //   teal reflected        235       ~114              448
    // (~ = the old reading minus the readout's share, not re-measured.)
    // Re-measured 2026-09-23 when the 3D readout moved OUT of the scene into a
    // header band. The original table (teal 404 lines / 619 shipped) was taken
    // with the readout floating over the canvas, and its teal text ("Sky inside
    // cone") passes this teal class: it alone was 170 px, so both numbers held
    // it and the floor measured part of the readout, not the rays.
    // The teal floor proves the reflected fan got thicker. The amber floor
    // guards one specific, measured failure: cylinders too thin for this
    // canvas (r=0.045 is under a pixel) rasterise with gaps and the sky fan
    // breaks into dotted rays — it halved to 463 px. It does NOT forbid a
    // thicker sky fan: at r=0.11 the fan passes this floor. Keeping the sky
    // fan as lines is a legibility judgement (the rays stay distinct near the
    // eye instead of merging), not something this test enforces.
    expect(px!.teal, `teal rays cover ${px!.teal} px — 1px lines measured 235`)
      .toBeGreaterThan(340);
    expect(px!.amber, `amber sky fan covers ${px!.amber} px — sub-pixel cylinders measured 463`)
      .toBeGreaterThan(800);
  });

  test('the polarization scene frees its GL context when the view unmounts', async ({ page }) => {
    // Optics does NOT route through StemLab.releaseGl (unlike most GL tools);
    // each of its five renderers calls forceContextLoss() directly. That is a
    // valid alternative, but nothing had ever measured it — so this counts real
    // contexts created against real webglcontextlost events, the same way the
    // magnetism leak test does. Browsers cap live contexts per process, so a
    // leak here breaks the 3D views after a few mode switches.
    await page.goto(`${harness.url}/__harness`);
    await page.waitForFunction(
      () => !!(window as any).StemLab?._registry?.opticsLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const w = window as any;
      w.__gl = { made: 0, lost: 0 };
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: any[]) {
        const ctx = orig.call(this, type, ...rest);
        if (ctx && /webgl/i.test(String(type)) && !(this as any).__glCounted) {
          (this as any).__glCounted = true;
          w.__gl.made++;
          this.addEventListener('webglcontextlost', () => { w.__gl.lost++; });
        }
        return ctx;
      };
    });

    await page.evaluate(() => (window as any).__mount({
      opticsLab: { mode: 'polarization', polAnimate: true },
    }));
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
    await page.waitForTimeout(900);
    await page.evaluate(() => { (window as any).__destroy(); });
    await page.waitForTimeout(700);

    const gl = await page.evaluate(() => (window as any).__gl);
    // Guard first: if nothing built a context the rest proves nothing.
    expect(gl.made, 'the polarization view created no WebGL context').toBeGreaterThan(0);
    expect(gl.made - gl.lost, `${gl.made - gl.lost} of ${gl.made} GL contexts were never released`)
      .toBe(0);
  });
});
