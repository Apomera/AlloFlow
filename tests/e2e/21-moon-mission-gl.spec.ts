import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Moon Mission — REAL WebGL smoke for the lunar EVA.
 *
 * The 3-D moonwalk lives behind mission phase 7, so nothing that renders the default
 * view touches it at all: the tool boots at phase 0 and every jsdom test around it
 * stops there. That makes it precisely the kind of surface that rots unnoticed.
 *
 * The keyboard test is the one that matters most here. Geometry World's EVA-equivalent
 * gated ALL movement on engine.isLocked — true only after a MOUSE click grabs pointer
 * lock — so a keyboard-only student could never walk, despite every key handler being
 * wired. Reading the source, Moon Mission looks built correctly: keydown is bound to
 * the canvas itself (focusable via role="application") rather than document, arrow
 * keys are accepted alongside WASD, and no pointer-lock gate stands in the way. This
 * pins that, so it cannot regress into the Geometry World shape.
 *
 * Movement is asserted through the HUD's step counter — a text observable — rather
 * than by diffing screenshots. Galaxy taught me that input-driven pixel comparison is
 * not reliable under the Playwright runner even when the interaction genuinely works.
 */

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js',
  toolId: 'moonMission',
  width: 1280,
  height: 820,
  probes: `
    window.__eva = function () {
      var c = document.querySelector('canvas[data-eva-canvas="true"]');
      if (!c) return null;
      var r = c.getBoundingClientRect();
      var p = c.parentElement ? c.parentElement.getBoundingClientRect() : r;
      var gl = null, lost = null;
      try { gl = c.getContext('webgl2') || c.getContext('webgl'); lost = gl ? gl.isContextLost() : null; } catch (e) {}
      var stepsEl = document.getElementById('eva-steps');
      var o2El = document.getElementById('eva-o2');
      return {
        lost: lost,
        focused: document.activeElement === c,
        steps: stepsEl ? parseInt(String(stepsEl.textContent), 10) : null,
        o2: o2El ? String(o2El.textContent) : null,
        box: { w: Math.round(r.width), h: Math.round(r.height) },
        parentBox: { w: Math.round(p.width), h: Math.round(p.height) }
      };
    };
    window.__focusEva = function () {
      var c = document.querySelector('canvas[data-eva-canvas="true"]');
      if (c) { c.focus(); return document.activeElement === c; }
      return false;
    };
  `,
});

// Phase 6 is the moonwalk (the UI labels it "Phase 7" because it counts from 1),
// and the surface is additionally gated behind d.evaStarted — the student has to
// press "Step Onto the Moon" first. Both established by probing the running tool,
// after guessing wrong twice from the source alone.
const AT_EVA = { moonMission: { missionPhase: 6, evaStarted: true } };
const EVA_READY = 'document.querySelector(\'canvas[data-eva-canvas="true"]\')';

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe.configure({ timeout: 150_000 });

test.describe('Moon Mission — real WebGL EVA', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('phase 6 brings up a live lunar surface', async ({ page }) => {
    await harness.mount(page, AT_EVA, EVA_READY);
    const eva = await page.evaluate(() => (window as any).__eva());

    expect(eva, 'EVA canvas never mounted at phase 6').not.toBeNull();
    expect(eva.lost, 'GL context lost').toBe(false);
    expect(eva.box.w).toBeGreaterThan(200);
    expect(eva.box.h).toBeGreaterThan(150);

    // A dead scene clears flat and PNG-compresses to a few KB.
    const shot = await page.locator('canvas[data-eva-canvas="true"]').screenshot({ timeout: 60000 });
    expect(shot.length, 'lunar surface is blank').toBeGreaterThan(15000);
  });

  test('a keyboard-only student can walk on the Moon', async ({ page }) => {
    // THE test. Geometry World wired every movement key and then gated the whole
    // movement block on pointer lock, so none of them did anything without a mouse.
    // Asserted via the HUD step counter, which only advances when the astronaut
    // actually moves — no pixel diffing.
    await harness.mount(page, AT_EVA, EVA_READY);

    expect(await page.evaluate(() => (window as any).__focusEva()), 'EVA canvas is not focusable').toBe(true);
    const before = await page.evaluate(() => (window as any).__eva());
    expect(before.steps, 'step counter missing from HUD').not.toBeNull();

    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1200);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => (window as any).__eva());
    expect(after.steps, 'W did not move the astronaut — movement is mouse-gated')
      .toBeGreaterThan(before.steps);
  });

  test('arrow keys walk too, for students who never learned WASD', async ({ page }) => {
    // Game conventions are not universal, and WASD assumes a QWERTY layout.
    await harness.mount(page, AT_EVA, EVA_READY);
    await page.evaluate(() => (window as any).__focusEva());

    const before = await page.evaluate(() => (window as any).__eva());
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => (window as any).__eva());
    expect(after.steps, 'ArrowUp does not walk').toBeGreaterThan(before.steps);
  });

  test('the EVA canvas stays put and fits its parent', async ({ page }) => {
    // Geometry World's canvas climbed ~8px every 220ms because a ResizeObserver fed
    // its own output back in. This one declares display:block, which is the fix.
    await harness.mount(page, AT_EVA, EVA_READY);

    const samples: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      samples.push(JSON.stringify((await page.evaluate(() => (window as any).__eva())).box));
      await page.waitForTimeout(220);
    }
    expect([...new Set(samples)].length, 'canvas size unstable:\n' + [...new Set(samples)].join('\n')).toBe(1);

    const eva = await page.evaluate(() => (window as any).__eva());
    expect(eva.box.w).toBeLessThanOrEqual(eva.parentBox.w + 1);
    expect(eva.box.h).toBeLessThanOrEqual(eva.parentBox.h + 1);
  });

  test('mounts the EVA without throwing', async ({ page }) => {
    await harness.mount(page, AT_EVA, EVA_READY);
    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs).toEqual([]);
  });

  test('boots at phase 0 with no 3D surface and no errors', async ({ page }) => {
    // The default path every other test already covers — here only to confirm the
    // EVA is genuinely phase-gated rather than always present.
    await harness.mount(page, { moonMission: { missionPhase: 0 } }, undefined, { expectCanvas: false });
    expect(await page.evaluate(() => !!document.querySelector('canvas[data-eva-canvas="true"]'))).toBe(false);

    const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs).toEqual([]);
  });

  test('releases the EVA canvas on unmount', async ({ page }) => {
    await harness.mount(page, AT_EVA, EVA_READY);
    expect(await page.evaluate(() => !!(window as any).__eva())).toBe(true);

    await harness.destroy(page);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => !!document.querySelector('canvas[data-eva-canvas="true"]'))).toBe(false);
  });
});
