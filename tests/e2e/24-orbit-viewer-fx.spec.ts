import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// StemLab.makeOrbitViewer is shared by five tools (bridgeLab, cityLab,
// fireEcology, machineLab, titration). It gained OPT-IN guarded bloom and an
// opt-in PMREM environment via cfg.bloom / cfg.env, so this spec covers the
// shared infrastructure using machineLab, which opts into both.
//
// What these assert that a screenshot cannot:
//   - the viewer still mounts a live context and renders (the fallback path
//     must survive even if the addons never arrive)
//   - the environment is built PER RENDERER, and actually lights a metal.
//     A PMREM texture belongs to the context that built it: share one and
//     nothing throws, it simply renders as no environment at all.
//   - the composer is released on teardown, not leaked with the context.
const ORBIT = ['vendor/three-r128/OrbitControls.js'];

const PROBES = `
  window.__fxProbe = function () {
    var hit = window.__glCanvas();
    if (!hit) return null;
    hit.el.setAttribute('data-gl-under-test', '1');
    return { lost: hit.gl.isContextLost() };
  };
`;

test.describe.configure({ timeout: 180_000 });

test.describe('makeOrbitViewer — shared post-processing', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_machinelab.js',
    toolId: 'machineLab',
    width: 1280,
    height: 820,
    probes: PROBES,
    extraScripts: ORBIT,
    // makeOrbitViewer lives on the REAL host, and the harness's fallback
    // StemLab stub does not provide it — without this machineLab silently
    // takes its no-op viewer shim and never mounts a canvas at all, which
    // reads as "the scene is broken" rather than "the host is missing".
    preScripts: ['stem_lab/stem_lab_module.js'],
  });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('mounts a live context and renders with FX enabled', async ({ page }) => {
    await harness.mount(page, {});
    const p = await page.evaluate(() => (window as any).__fxProbe());
    expect(p, 'no GL canvas').not.toBeNull();
    expect(p.lost, 'context lost at mount').toBe(false);

    const shot = await page.locator('canvas[data-gl-under-test="1"]').screenshot();
    expect(shot.length, 'rendered a blank surface').toBeGreaterThan(10_000);

    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs, 'page errors').toEqual([]);
  });

  test('the environment is per-renderer and actually lights a metal', async ({ page }) => {
    await harness.mount(page, {});

    // Measure on an OWN offscreen renderer: the viewer re-renders its scene,
    // so a probe drawn into its canvas is overwritten before readPixels sees
    // it. A pure white metal with NO lights can only be lit by the map.
    const probe = await page.evaluate(() => {
      const T = (window as any).THREE;
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      const r = new T.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
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
      if (!tgt || !tgt.texture) return { ok: false, reason: 'PMREM produced no texture', mean: 0 };
      const s = new T.Scene();
      s.environment = tgt.texture;
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
      try { tgt.dispose(); } catch { /* best effort */ }
      geo.dispose(); box.material.dispose();
      r.forceContextLoss(); r.dispose();
      return { ok: true, reason: '', mean };
    });

    expect(probe.ok, probe.reason).toBe(true);
    // A dead (cross-context) environment reads exactly 0; a live one measured
    // ~79 for this gradient, so 4 is a floor with large margin.
    expect(probe.mean, 'the environment put NO light on a pure metal').toBeGreaterThan(4);

    // The probe above proves PMREM works in this BROWSER. It does not prove the
    // VIEWER wired one up — it builds its own texture. So also read the
    // viewer's real state through makeOrbitViewer's debug() API, which now
    // reports whether _attachOrbitEnv ran, produced a texture, and assigned
    // scene.environment. Without this the test passes with cfg.env removed.
    const fx = await page.evaluate(() => {
      // Tools keep their viewers in module scope (machineLab's are SHOP_GL and
      // TREB_GL, both unreachable from here), so makeOrbitViewer registers each
      // one on StemLab._orbitViewers purely as a diagnostic surface.
      const viewers: any[] = ((window as any).StemLab && (window as any).StemLab._orbitViewers) || [];
      return viewers
        .filter((v: any) => v && typeof v.debug === 'function')
        .map((v: any) => { try { return v.debug(); } catch { return null; } })
        .filter(Boolean)
        .map((d: any) => d.fx)
        .filter(Boolean);
    });

    // If no viewer exposed debug() the assertion would be vacuous, so say so.
    expect(fx.length, 'no orbit viewer exposed debug() — cannot verify FX wiring').toBeGreaterThan(0);
    const anyEnv = fx.some((f: any) => f.envTried && f.envTexture && f.sceneEnv);
    expect(anyEnv, `no viewer has a live scene.environment: ${JSON.stringify(fx)}`).toBe(true);
  });

  test('releases its canvas on unmount', async ({ page }) => {
    await harness.mount(page, {});
    await page.evaluate(() => (window as any).__fxProbe());
    await page.evaluate(() => { (window as any).__destroy(); });
    await page.waitForTimeout(500);
    const left = await page.evaluate(() => document.querySelectorAll('#wrap canvas').length);
    expect(left, 'canvases survived unmount').toBe(0);
  });
});
