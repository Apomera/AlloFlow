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
});
