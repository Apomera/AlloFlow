import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The EVA moonwalk is the tool's other WebGL surface and the one a student stays in
 * longest — walking, driving the rover, collecting samples. It handles WebGL creation
 * failure well (a `webglError` panel with a Retry 3D Mode button) but nothing is bound
 * to `webglcontextlost`, so a context lost AFTER init leaves a black canvas with no
 * error state and no way back. The descent already recovers from this; this pins the
 * same contract for the EVA.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test('a lost GL context during the moonwalk offers the student a way back', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // Phase 6 needs evaStarted, and the harness wants a readiness predicate — same
  // constants spec 21 uses, so this mounts the EVA the way the proven suite does.
  await harness.mount(page, { moonMission: { missionPhase: 6, evaStarted: true } },
    `document.querySelector('canvas[data-eva-canvas="true"]')`);
  // Let the scene actually come up, so we kill a live context rather than a pending one.
  await page.waitForTimeout(3000);

  const alive = await page.evaluate(() => {
    const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement;
    const ctx: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
    return !!ctx && !ctx.isContextLost();
  });
  expect(alive, 'the EVA never took a live WebGL context, so this proves nothing').toBe(true);

  const killed = await page.evaluate(() => {
    const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement;
    const ctx: any = cv.getContext('webgl2') || cv.getContext('webgl');
    const ext = ctx && ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  expect(killed, 'could not force a context loss').toBe(true);

  // The student must end up somewhere they can act from: either the existing
  // webglError panel with its Retry control, or a restored/!working canvas. A black
  // canvas with no affordance is the failure this pins.
  await page.waitForFunction(() => {
    const retry = Array.from(document.querySelectorAll('button'))
      .some((b) => /retry 3d mode/i.test(b.textContent || ''));
    const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement | null;
    const ctx: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
    const restored = !!ctx && !ctx.isContextLost();
    return retry || restored;
  }, null, { timeout: 10000 });

  const state = await page.evaluate(() => {
    const retry = Array.from(document.querySelectorAll('button'))
      .find((b) => /retry 3d mode/i.test(b.textContent || ''));
    const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement | null;
    const ctx: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
    return { hasRetry: !!retry, canvasPresent: !!cv, contextLive: !!ctx && !ctx.isContextLost() };
  });
  console.log('after EVA context loss:', JSON.stringify(state));
  expect(state.hasRetry || state.contextLive,
    'the moonwalk went black with no error panel and no way to recover').toBe(true);

  // An unrecoverable panel is barely better than a black canvas, so prove the way back
  // actually works: pressing Retry must rebuild a LIVE context, not just hide the panel.
  if (state.hasRetry && !state.contextLive) {
    await page.getByRole('button', { name: /Retry 3D Mode/i }).first().click();
    await page.waitForSelector('canvas[data-eva-canvas="true"]', { timeout: 25000 });
    await page.waitForFunction(() => {
      const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement;
      const ctx: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
      return !!ctx && !ctx.isContextLost();
    }, null, { timeout: 25000 });

    // And the moonwalk must be usable again, not just painted: the canvas carries every
    // EVA key handler, so it has to be focusable or a keyboard-only student is stuck.
    const usable = await page.evaluate(() => {
      const cv = document.querySelector('canvas[data-eva-canvas="true"]') as HTMLCanvasElement;
      cv.focus();
      return { focused: document.activeElement === cv, tabIndex: cv.tabIndex };
    });
    console.log('after Retry:', JSON.stringify(usable));
    expect(usable.focused, 'the rebuilt EVA canvas cannot take focus, so keys are dead').toBe(true);
  }

  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors during EVA context loss').toEqual([]);
});
