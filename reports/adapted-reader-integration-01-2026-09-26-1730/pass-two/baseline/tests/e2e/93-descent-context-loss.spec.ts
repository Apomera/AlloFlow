import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * A lost WebGL context used to leave the flight view permanently BLACK behind a live
 * HUD, mid-landing, with no way back — and this is the mission's one graded task, so
 * the flight has to survive it. Context loss is ordinary: a GPU driver reset, a tab
 * restored on a low-memory device, or another page claiming contexts.
 *
 * Forced here with WEBGL_lose_context, which is how the browser itself signals it.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test('a lost GL context falls back to the 2D world and keeps the landing flyable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await harness.mount(page, { moonMission: { missionPhase: 5, descentStarted: true } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return c && c.dataset.descentVspeed !== undefined;
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return c && c.dataset.descent3d === 'on';
  }, null, { timeout: 20000 });

  const read = () => page.evaluate(() => {
    const hud = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return {
      mode: hud.dataset.descent3d,
      alt: Number(hud.dataset.descentAlt),
      glPresent: !!document.querySelector('canvas[data-descent-gl="true"]')
    };
  });

  expect((await read()).mode, '3D never came up, so this proves nothing').toBe('on');

  // Kill the context the way the browser would.
  const killed = await page.evaluate(() => {
    const gl = document.querySelector('canvas[data-descent-gl="true"]') as HTMLCanvasElement;
    const ctx: any = gl.getContext('webgl2') || gl.getContext('webgl');
    const ext = ctx && ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  expect(killed, 'could not force a context loss — WEBGL_lose_context unavailable').toBe(true);

  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement;
    return c && c.dataset.descent3d === 'lost';
  }, null, { timeout: 8000 });

  const afterLoss = await read();
  expect(afterLoss.mode, 'the tool did not notice the context went away').toBe('lost');
  expect(afterLoss.glPresent, 'the dead GL canvas was left in the page').toBe(false);

  // The graded flight must still be running, and still be flyable.
  await page.waitForTimeout(1000);
  const later = await read();
  expect(later.alt, `the descent stopped after the context was lost (${afterLoss.alt} -> ${later.alt})`)
    .toBeLessThan(afterLoss.alt);

  const thrust = await page.evaluate(async () => {
    const btn = document.querySelectorAll('[data-descent-pad] button')[1] as HTMLElement;
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 700));
    const t = Number((document.querySelector('canvas[data-descent-canvas="true"]') as HTMLCanvasElement).dataset.descentThrust);
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
    return t;
  });
  expect(thrust, 'THRUST stopped reaching the engine after the context was lost').toBeGreaterThan(0.3);

  // And the 2D world must actually be painting again, not left a black rectangle.
  const buf = await page.locator('canvas[data-descent-canvas="true"]').screenshot();
  const lit = await page.evaluate(async (data) => {
    const blob = await (await fetch('data:image/png;base64,' + data)).blob();
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 > 20) n++;
    }
    return +(n / (bmp.width * bmp.height)).toFixed(3);
  }, buf.toString('base64'));
  console.log('lit fraction after fallback:', lit);
  expect(lit, 'the flight view is a black rectangle after the fallback').toBeGreaterThan(0.05);

  expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors during context loss').toEqual([]);
});
