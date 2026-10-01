import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Every time the descent is left and re-entered — Retry Landing after a crash, or just
 * navigating away and back — the 3D scene is torn down and a new one is built. Browsers
 * cap simultaneous WebGL contexts hard (commonly 8-16) and evict the oldest when you
 * pass it, so a scene that does not release its context takes the flight view out after
 * a handful of attempts and never gets it back. A graded piloting task is exactly where
 * a student retries repeatedly.
 *
 * This counts the browser's own live contexts across repeated mount/unmount cycles
 * rather than reading dispose(): the cap is enforced by the browser, so only its
 * accounting proves anything. Cycling the phase is the fast equivalent of the retry
 * path — both run the same teardown — and avoids spending ~25s of real time per round
 * flying the lander to the surface.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test('re-entering the descent does not accumulate WebGL contexts', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // Record every context the page hands out. One released by dispose() reports
  // isContextLost() === true, so "live" is what counts against the browser's cap.
  await page.addInitScript(() => {
    (window as any).__glAll = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
      const ctx = (orig as any).call(this, type, ...rest);
      if (ctx && /webgl/i.test(type)) (window as any).__glAll.push(ctx);
      return ctx;
    } as any;
  });

  await harness.mount(page, { moonMission: { missionPhase: 5, descentStarted: true } }, undefined, { expectCanvas: false });

  const waitFor3D = () => page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return c && c.dataset.descent3d === 'on';
  }, null, { timeout: 25000 });

  const counts = () => page.evaluate(() => {
    const all = (window as any).__glAll as any[];
    return { created: all.length, live: all.filter((c) => c && !c.isContextLost()).length };
  });

  await waitFor3D();
  const first = await counts();
  expect(first.live, 'the descent never took a WebGL context, so this proves nothing').toBeGreaterThan(0);

  // Leave the phase and come back, IN THE SAME PAGE. harness.mount() reloads the
  // document, which resets both the counter and the browser's context accounting — a
  // remount loop measures four separate fresh pages and can never observe a leak. The
  // harness exposes ctx.setToolData, which re-renders in place, so this drives the real
  // unmount/rebuild the retry path uses. Phase 4 paints its own 2D canvas, so the
  // descent is genuinely torn down in between.
  const ROUNDS = 4;
  const setPhase = (phase: number, started: boolean) => page.evaluate(([p, s]) => {
    (window as any).__ctx.setToolData({ moonMission: { missionPhase: p, descentStarted: s } });
  }, [phase, started] as [number, boolean]);

  for (let i = 0; i < ROUNDS; i++) {
    await setPhase(4, false);
    await page.waitForFunction(() => !document.querySelector('canvas[data-descent-gl="true"]'),
      null, { timeout: 15000 });
    await setPhase(5, true);
    await waitFor3D();
  }

  const after = await counts();
  console.log(`contexts after ${ROUNDS} re-entries: ${after.created} created, ${after.live} live (first mount: ${first.live} live)`);

  // Each re-entry must hand its context back. One live context is the current scene;
  // anything scaling with ROUNDS is the leak that hits the browser cap.
  expect(after.created, 'the scene was never rebuilt, so no teardown was exercised')
    .toBeGreaterThan(first.created);
  expect(after.live, `WebGL contexts accumulated across re-entries (${after.created} created, ${after.live} still live)`)
    .toBeLessThanOrEqual(first.live + 1);

  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors during the re-entry cycle').toEqual([]);
});
