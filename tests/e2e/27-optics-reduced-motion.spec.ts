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
