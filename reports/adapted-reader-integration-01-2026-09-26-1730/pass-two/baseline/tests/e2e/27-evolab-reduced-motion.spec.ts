import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// EvoLab read prefers-reduced-motion ONCE when its script loaded and never
// again, so a learner who turned the preference on mid-lesson kept getting
// full creature animation until the page was reloaded — which is exactly the
// moment they cannot afford it.
//
// Every consumer of that flag sits inside its rAF frame body, so the fix is
// the subscription alone: flip the variable and motion stops on the next
// frame. This spec proves that end to end rather than trusting the wiring.
test.describe.configure({ timeout: 180_000 });

test.describe('EvoLab — reduced motion is live, not frozen at load', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_evolab.js',
    toolId: 'evoLab',
    width: 1100,
    height: 820,
  });

  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  // SelectionSandbox owns the creature loop whose motion this asserts.
  // The namespace is 'evoLab' with a capital L — the tool reads
  // ctx.toolData['evoLab']. Lower-case 'evolab' silently yields {}, the view
  // falls back to the menu, and no canvas ever mounts.
  const SANDBOX = { evoLab: { view: 'selectionSandbox' } };

  test('turning reduced motion ON mid-session stops the creature animation', async ({ page }) => {
    // Start with the preference OFF and flip it while the scene is already
    // running: that is the case the old code got wrong. Starting with it on
    // would pass either way and prove nothing.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(page, SANDBOX);

    // Count rAF callbacks actually scheduled rather than trusting a flag the
    // tool sets about itself. The creature loop reschedules every frame, so a
    // running scene climbs steadily and a stopped one flatlines.
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
    // Guard: if nothing was animating, the rest of this test proves nothing.
    expect(before, 'the sandbox was not animating to begin with — test proves nothing')
      .toBeGreaterThan(0);

    // Flip the preference the way an OS accessibility toggle would.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => (window as any).__rafCount);

    // The loop itself keeps ticking (it still drives non-motion UI); what must
    // stop is the creature movement inside it. Measure the CANVAS PIXELS —
    // that needs no cooperation from the tool, so it cannot pass by reading a
    // probe the tool does not expose. (A first draft compared
    // `window.__evoCreatures`, which does not exist: [] equals [], and the
    // assertion would have passed with the bug fully present.)
    const sample = () => page.evaluate(() => {
      const cv = document.querySelector('#wrap canvas') as HTMLCanvasElement | null;
      if (!cv) return null;
      const g = cv.getContext('2d');
      if (!g) return null;
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      // Cheap content digest: sum every 97th byte (prime stride, so it does
      // not align with the RGBA period and miss a whole channel).
      let sum = 0;
      for (let i = 0; i < d.length; i += 97) sum += d[i];
      return sum;
    });

    const s1 = await sample();
    expect(s1, 'no readable 2D canvas in the sandbox').not.toBeNull();
    await page.waitForTimeout(800);
    const s2 = await sample();
    expect(s2, `canvas kept changing after reduced motion was enabled (${s1} -> ${s2})`)
      .toBe(s1);

    // And the frame loop must not have spun up harder than before.
    expect(after, `frame rate climbed after reduced motion was enabled (${after} vs ${before})`)
      .toBeLessThanOrEqual(before * 2);
  });
});
