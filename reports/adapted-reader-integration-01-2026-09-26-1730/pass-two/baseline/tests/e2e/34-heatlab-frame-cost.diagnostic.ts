import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * DIAGNOSTIC (see 33-stem-idle-repaint.diagnostic.ts for why these are not
 * .spec.ts). Run deliberately:
 *   npx playwright test tests/e2e/34-heatlab-frame-cost.diagnostic.ts --workers=1
 *
 * heatLab measured ~6,600 canvas draw-ops per second — the highest in the
 * library by a factor of four. That number alone says nothing about whether it
 * HURTS, and "110 operations per frame" is a proxy, not a verdict.
 *
 * The work is real: the conduction view draws a 20 cm bar as N=90 temperature
 * cells, each a fillStyle assignment plus a fillRect, and the temperatures
 * genuinely change every frame because a diffusion step runs between draws. In
 * race mode there are two bars, so ~180 cells a frame.
 *
 * So the question this answers is the only one that matters: on hardware like a
 * school Chromebook, does the frame fit in its budget? A 60fps frame has 16.7ms.
 * If the callback lands comfortably inside that even throttled, the op count is
 * a curiosity and changing another team's tool would be churn. If it does not,
 * there is a known cheap fix — render the 90 cells to a 90px offscreen canvas
 * once and drawImage it scaled — and this is the evidence for doing it.
 *
 * ─── ANSWER (2026-08-05) ──────────────────────────────────────────────────
 *   1x throttle:  median 0.8ms,  p95  1.4ms  -> 61 fps
 *   6x throttle:  median 3.9ms,  p95 12.8ms  -> 58 fps
 *
 * Comfortable. 3.9ms of a 16.7ms budget on hardware six times slower than this
 * machine, still holding ~58fps. Ninety fillRects is simply cheap work for a
 * canvas, and the alarming-sounding 6,600 ops/s is 6,600 CHEAP ops.
 *
 * NO FIX MADE, deliberately. The offscreen-canvas optimisation described above
 * is real and would work, but it would buy a few milliseconds nobody is short
 * of, in a tool this session does not own, at the cost of touching a rendering
 * path with no test coverage. The op count was worth checking and is not worth
 * acting on. Re-run this if the bar ever gains cells or the sim gains bars.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_heatlab.js',
  toolId: 'heatLab',
  appStyles: true,
  width: 1000,
  height: 800,
});

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test('heatLab frame cost, throttled', async ({ page }) => {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.heatLab, null, { timeout: 15000 });

  // Time the rAF callback itself. Wrapping requestAnimationFrame measures the
  // tool's own work, not the browser's compositing around it.
  await page.evaluate(() => {
    (window as any).__frames = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => raf((t) => {
      const t0 = performance.now();
      cb(t);
      (window as any).__frames.push(performance.now() - t0);
    })) as any;
  });

  await page.evaluate(() => (window as any).__mount({}));
  await page.evaluate(() => {
    const w = document.getElementById('wrap')!;
    w.style.display = 'block'; w.style.height = 'auto';
  });
  await page.waitForTimeout(1200);

  const client = await page.context().newCDPSession(page);
  for (const rate of [1, 6]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    await page.evaluate(() => { (window as any).__frames = []; });
    await page.waitForTimeout(2000);
    const stats = await page.evaluate(() => {
      const f = ((window as any).__frames as number[]).slice().sort((a, b) => a - b);
      if (!f.length) return null;
      return {
        frames: f.length,
        median: +f[Math.floor(f.length / 2)].toFixed(2),
        p95: +f[Math.floor(f.length * 0.95)].toFixed(2),
        worst: +f[f.length - 1].toFixed(2),
      };
    });
    const fps = stats ? Math.round(stats.frames / 2) : 0;
    console.log(`throttle ${rate}x: ${JSON.stringify(stats)}  -> ~${fps} fps achieved`);
    if (rate === 6 && stats) {
      // 16.7ms is the 60fps budget. Report against it rather than asserting a
      // pass/fail on someone else's design decision.
      const verdict = stats.median < 8 ? 'comfortable'
        : stats.median < 16.7 ? 'inside budget but not roomy'
          : 'OVER BUDGET — drops frames on hardware like this';
      console.log(`   6x median ${stats.median}ms against a 16.7ms frame budget: ${verdict}`);
    }
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  expect(true).toBe(true);
});
