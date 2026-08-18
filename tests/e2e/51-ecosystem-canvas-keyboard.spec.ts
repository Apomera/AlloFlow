import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// WCAG 2.1.1 — the ecosystem sandbox used to be mouse and touch only.
//
// The canvas has carried tabIndex 0 for a long time, so it LOOKED reachable: a keyboard
// user could focus it, and nothing happened. Placing, erasing and moving species all ran
// through mousedown/mousemove/click, which made the whole Sandbox tab pointer-only.
//
// The keyboard path deliberately reuses the pointer machinery instead of duplicating it:
// arrow keys drive the same canvas._mouseX/_mouseY that the ghost-preview overlay
// renders, and Enter raises the same canvas._pendingClick the draw loop consumes. This
// spec pins the behaviour that reuse is supposed to give.
//
// Effects are measured with canvas.dataset.placeCount, which the tool already maintains.
// Bitmap comparison is NOT usable here — the frame keeps animating even when the
// simulation is paused, so an idle-vs-idle hash differs on its own.

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js',
  toolId: 'ecosystem',
  width: 1280,
  height: 900,
  appStyles: true,
  probes: `
    window.__c = function () { return document.querySelector('canvas[data-eco-canvas]'); };
    window.__placed = function () { var c = window.__c(); return c ? parseInt(c.dataset.placeCount || '0', 10) : -1; };
    window.__setTool = function (t) { var c = window.__c(); if (c) c.dataset.sandboxTool = t; };
    window.__focusCanvas = function () { var c = window.__c(); if (c) { c.focus(); return document.activeElement === c; } return false; };
    window.__cursor = function () {
      var c = window.__c();
      return c ? { x: c._mouseX, y: c._mouseY } : null;
    };
    window.__drag = function () {
      var c = window.__c();
      if (!c) return null;
      return { dragging: !!c._dragging, type: c._dragType || '',
               ex: c._dragEntity ? Math.round(c._dragEntity.x) : null,
               ey: c._dragEntity ? Math.round(c._dragEntity.y) : null };
    };
    window.__box = function () { var c = window.__c(); if (!c) return null; var r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; };
    window.__clickCentre = function () {
      var c = window.__c(); if (!c) return false;
      var r = c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('click', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true }));
      return true;
    };
    // Pick-up only succeeds within 20px of a living animal, and with a paused random
    // population the centre may simply have none — so scan for a real target instead of
    // assuming one. This is setup; the assertion is what happens once something is held.
    window.__pickUpSomewhere = function () {
      var c = window.__c(); if (!c) return null;
      var r = c.getBoundingClientRect();
      for (var y = 10; y < r.height; y += 12) {
        for (var x = 10; x < r.width; x += 12) {
          c.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
          if (c._dragging) return { x: x, y: y, ex: Math.round(c._dragEntity.x) };
        }
      }
      return null;
    };
    window.__aimAtAnimal = function () {
      var c = window.__c(); if (!c) return null;
      var r = c.getBoundingClientRect();
      for (var y = 10; y < r.height; y += 12) {
        for (var x = 10; x < r.width; x += 12) {
          c.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
          if (c._dragging) {
            c._dragging = false; c._dragEntity = null; c._dragType = '';
            c._mouseX = x; c._mouseY = y;
            return { x: x, y: y };
          }
        }
      }
      return null;
    };
    window.__movePointerTo = function (x, y) {
      var c = window.__c(); if (!c) return null;
      var r = c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
      return new Promise(function (res) {
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          res({ dragging: !!c._dragging, ex: c._dragEntity ? Math.round(c._dragEntity.x) : null });
        }); });
      });
    };
    window.__describedBy = function () {
      var c = window.__c(); if (!c) return null;
      var ids = (c.getAttribute('aria-describedby') || '').split(/\\s+/).filter(Boolean);
      return {
        keyshortcuts: c.getAttribute('aria-keyshortcuts'),
        ids: ids,
        missing: ids.filter(function (id) { return !document.getElementById(id); }),
        instructions: (function () {
          var el = document.getElementById('eco-canvas-keys');
          return el ? (el.textContent || '').trim().slice(0, 60) : null;
        })(),
        duplicateInstructionIds: document.querySelectorAll('#wrap [id="eco-canvas-keys"]').length,
      };
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 300_000 });

test.describe('ecosystem canvas keyboard operability', () => {
  test('the sandbox can be driven without a pointer', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true } }, undefined, { expectCanvas: false });
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window as any).__setTool('rabbit'));

    // Baseline through the mouse, so a broken placeCount cannot make this pass vacuously.
    const start = await page.evaluate(() => (window as any).__placed());
    await page.evaluate(() => (window as any).__clickCentre());
    await page.waitForTimeout(400);
    const afterMouse = await page.evaluate(() => (window as any).__placed());
    expect(afterMouse, 'the mouse path did not place — the premise of this spec is wrong')
      .toBeGreaterThan(start);

    expect(await page.evaluate(() => (window as any).__focusCanvas()), 'canvas is not focusable').toBe(true);

    // Aiming must not place on its own.
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const afterArrows = await page.evaluate(() => (window as any).__placed());
    expect(afterArrows, 'moving the cursor placed something by itself').toBe(afterMouse);

    // Enter commits, once per press.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const afterEnter = await page.evaluate(() => (window as any).__placed());
    expect(afterEnter, 'Enter did not place anything from the keyboard').toBe(afterArrows + 5);

    // With no tool selected the canvas must stay inert so arrows still scroll the page.
    await page.evaluate(() => (window as any).__setTool(''));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__placed()),
      'Enter placed something with no tool selected').toBe(afterEnter);
  });

  // The 'move' tool never used the click path — it picks up on mousedown and drops on
  // mouseup — so the first version of the keyboard handler placed and erased but could
  // not move anything. The whole sequence here is keyboard-only: place a prey animal,
  // pick it up, carry it, drop it. The simulation is paused so the target cannot drift
  // out from under the pick-up radius between steps.
  test('the move tool can pick up, carry and drop from the keyboard', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true, simPaused: true } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as any).__focusCanvas())).toBe(true);
    await page.evaluate(() => (window as any).__setTool('move'));

    // Park the keyboard cursor on a real animal. Placing one first is not reliable:
    // placement clamps it into its species' vertical band, so it can land outside the
    // 20px pick-up radius of the cursor that placed it. Everything asserted below is
    // still keyboard-only.
    const spot = await page.evaluate(() => (window as any).__aimAtAnimal());
    expect(spot, 'found no living animal to pick up').not.toBeNull();

    await page.keyboard.press('Enter');
    const held = await page.evaluate(() => (window as any).__drag());
    expect(held.dragging, 'Enter did not pick up the animal under the cursor').toBe(true);

    await page.keyboard.down('Shift');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() => (window as any).__drag());
    expect(moved.ex! - held.ex!, 'the held animal did not follow the arrow keys').toBeGreaterThan(20);

    await page.keyboard.press('Enter');
    const dropped = await page.evaluate(() => (window as any).__drag());
    expect(dropped.dragging, 'the second Enter did not drop it').toBe(false);
  });

  // Dragging used to be applied inside the per-tick loop, and pausing sets the tick
  // count to zero — so with the simulation paused, dragging an animal did nothing at
  // all, for mouse users as much as keyboard ones. Pausing to arrange the scene is
  // exactly when the move tool is most useful, so this is checked through the pointer.
  test('the move tool works while the simulation is paused (mouse path)', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true, simPaused: true } },
      undefined, { expectCanvas: false });
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window as any).__setTool('move'));

    const picked = await page.evaluate(() => (window as any).__pickUpSomewhere());
    expect(picked, 'found no living animal to pick up').not.toBeNull();

    const target = picked.x + 120;
    const dragged = await page.evaluate(
      ([x, y]) => (window as any).__movePointerTo(x, y), [target, picked.y]);
    expect(dragged.dragging, 'the drag was dropped mid-move').toBe(true);
    expect(dragged.ex - picked.ex, 'the animal did not follow the pointer while paused')
      .toBeGreaterThan(80);
  });

  test('the aiming cursor centres first, then steps, and Shift steps further', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true } }, undefined, { expectCanvas: false });
    await page.waitForTimeout(1500);
    const box = await page.evaluate(() => (window as any).__box());
    await page.evaluate(() => (window as any).__focusCanvas());

    // No tool: arrows are left to the page, so the cursor stays unset.
    await page.evaluate(() => (window as any).__setTool(''));
    await page.keyboard.press('ArrowRight');
    expect((await page.evaluate(() => (window as any).__cursor())).x,
      'arrows were captured with no tool selected').toBeLessThan(0);

    await page.evaluate(() => (window as any).__setTool('rabbit'));
    await page.keyboard.press('ArrowRight');
    const first = await page.evaluate(() => (window as any).__cursor());
    // The first press reveals the cursor at centre rather than also jumping, so the
    // student can see where they are starting from.
    expect(Math.abs(first.x - box.w / 2), 'first press should centre the cursor').toBeLessThan(2);

    await page.keyboard.press('ArrowRight');
    const stepped = await page.evaluate(() => (window as any).__cursor());
    const step = stepped.x - first.x;
    expect(step, 'a plain arrow press should move the cursor right').toBeGreaterThan(1);

    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    const shifted = await page.evaluate(() => (window as any).__cursor());
    expect(shifted.x - stepped.x, 'Shift should take a larger step').toBeGreaterThan(step * 2);

    // Escape hides the cursor again.
    await page.keyboard.press('Escape');
    expect((await page.evaluate(() => (window as any).__cursor())).x,
      'Escape should hide the aiming cursor').toBeLessThan(0);
  });

  // Both canvases carry data-eco-canvas, and only the sandbox one was patched first —
  // which is exactly the kind of miss this checks for. The instructions element uses one
  // id in two branches, so the duplicate count matters as much as the dangling check.
  for (const tab of ['sandbox', 'explore']) {
    test(`assistive tech is told the ${tab} canvas is drivable`, async ({ page }) => {
      await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
      await page.waitForTimeout(900);
      const a = await page.evaluate(() => (window as any).__describedBy());
      expect(a, 'no ecosystem canvas on this tab').not.toBeNull();
      expect(a.keyshortcuts, 'canvas should advertise its keys').toContain('Enter');
      // A dangling aria-describedby is worse than none: the description is dropped silently.
      expect(a.missing, 'aria-describedby points at ids that do not exist').toEqual([]);
      expect(a.instructions, 'keyboard instructions element is empty').toMatch(/arrow keys/i);
      expect(a.duplicateInstructionIds, 'eco-canvas-keys is in the DOM more than once').toBe(1);
    });
  }
});
