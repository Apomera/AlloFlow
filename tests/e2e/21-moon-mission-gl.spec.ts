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
      var soundEl = document.getElementById('eva-lrv-sound');
      return {
        lost: lost,
        focused: document.activeElement === c,
        steps: stepsEl ? parseInt(String(stepsEl.textContent), 10) : null,
        o2: o2El ? String(o2El.textContent) : null,
        lrvSound: c.dataset.lrvSound || null,
        lrvAudioLevel: Number(c.dataset.lrvAudioLevel || 0),
        lrvTrackCount: Number(c.dataset.lrvTrackCount || 0),
        lrvTrackCap: Number(c.dataset.lrvTrackCap || 0),
        lrvSoundPressed: soundEl ? soundEl.getAttribute('aria-pressed') : null,
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

    // Wait on the OBSERVABLE, not on wall-clock. The HUD ticks a step every 20 frames
    // and SwiftShader renders this scene at ~13fps, so a fixed 1200ms window buys about
    // 16 frames — under the 20 a step costs. The old fixed wait passed or failed on
    // timing luck. The 8s ceiling still fails loudly if movement breaks completely or
    // the frame rate collapses several times below where it sits today.
    await page.keyboard.down('KeyW');
    const walked = await page.waitForFunction(
      (b: number) => {
        const e = (window as any).__eva();
        return e && e.steps !== null && e.steps > b ? e.steps : false;
      },
      before.steps, { timeout: 8000 },
    ).catch(() => null);
    await page.keyboard.up('KeyW');

    expect(walked, 'W did not move the astronaut — movement is mouse-gated').not.toBeNull();
  });

  test('arrow keys walk too, for students who never learned WASD', async ({ page }) => {
    // Game conventions are not universal, and WASD assumes a QWERTY layout.
    await harness.mount(page, AT_EVA, EVA_READY);
    await page.evaluate(() => (window as any).__focusEva());

    const before = await page.evaluate(() => (window as any).__eva());
    await page.keyboard.down('ArrowUp');
    const walked = await page.waitForFunction(
      (b: number) => {
        const e = (window as any).__eva();
        return e && e.steps !== null && e.steps > b ? e.steps : false;
      },
      before.steps, { timeout: 8000 },
    ).catch(() => null);
    await page.keyboard.up('ArrowUp');

    expect(walked, 'ArrowUp does not walk').not.toBeNull();
  });

  test('LRV drive sonification is opt-in and B exposes stable UI state', async ({ page }) => {
    await harness.mount(page, AT_EVA, EVA_READY);
    expect(await page.evaluate(() => (window as any).__focusEva())).toBe(true);

    const before = await page.evaluate(() => (window as any).__eva());
    expect(before.lrvSound).toBe('off');
    expect(before.lrvSoundPressed).toBe('false');
    expect(before.lrvAudioLevel).toBe(0);
    expect(before.lrvTrackCount).toBe(0);
    expect(before.lrvTrackCap).toBeGreaterThan(0);

    await page.keyboard.press('KeyB');
    await page.waitForFunction(() => {
      const e = (window as any).__eva();
      return e && e.lrvSound === 'on' && e.lrvSoundPressed === 'true';
    }, null, { timeout: 5000 });

    await page.keyboard.press('KeyB');
    await page.waitForFunction(() => {
      const e = (window as any).__eva();
      return e && e.lrvSound === 'off' && e.lrvSoundPressed === 'false';
    }, null, { timeout: 5000 });
  });

  test('every rock you pick up stays in the bag', async ({ page }) => {
    // THE state bug. The collection handler lives inside the EVA render loop, whose
    // closure captures ctx.toolData ONCE at canvas mount and never sees a later
    // commit. It rebuilt the array from that frozen snapshot on every pickup, so
    // each rock REPLACED the one before it: the bag never held more than one, and
    // "collect 4 samples" (a quest hook), Lunar Geologist and Sample Return were all
    // unreachable no matter how long a student explored. Nothing in jsdom can reach
    // this — the loop needs WebGL and real rAF frames.
    //
    // Determinism comes from pinning Math.random into a narrow band before the page
    // loads: the orb scatter is `8 + (rand - 0.5) * 60`, so a band around 0.4133
    // parks every sample within half a unit of the astronaut's spawn at (3, 3),
    // inside the 2-unit pickup radius. It stays a BAND rather than a constant so
    // three.js still generates distinct object UUIDs.
    await page.addInitScript(() => {
      let n = 1;
      Math.random = function () {
        n = (n * 1103515245 + 12345) % 2147483648;
        return 0.4105 + (n % 1000) / 1000 * 0.006;
      };
    });
    await harness.mount(page, AT_EVA, EVA_READY);
    expect(await page.evaluate(() => (window as any).__focusEva())).toBe(true);

    const bag = () => page.evaluate(() =>
      ((((window as any).__toolData || {}).moonMission || {}).lunarSamples || []).map((s: any) => String(s.name)));

    expect(await bag(), 'started the EVA with rocks already collected').toEqual([]);

    // Hold F down rather than tapping it: the pickup cooldown is 60 FRAMES, and
    // SwiftShader renders this scene at ~13fps, so a fixed tap interval collects on
    // some presses and not others. Holding lets the loop bank one rock per cooldown
    // however fast it happens to be running — and the wait is on the BAG reaching three
    // rather than on a wall-clock guess, because 12s at 13fps is 156 frames and three
    // pickups need 180. The 40s ceiling still fails if collection is broken outright.
    await page.keyboard.down('KeyF');
    await page.waitForFunction(
      () => ((((window as any).__toolData || {}).moonMission || {}).lunarSamples || []).length >= 3,
      null, { timeout: 40000 },
    ).catch(() => null);
    await page.keyboard.up('KeyF');
    await page.waitForTimeout(300);

    const names = await bag();
    expect(names.length, 'pressing F never collected anything — the orbs are out of reach')
      .toBeGreaterThan(0);
    expect(names.length, 'the collection is being REPLACED rather than appended: ' + JSON.stringify(names))
      .toBeGreaterThanOrEqual(3);
    expect(new Set(names).size, 'the same rock was banked twice: ' + JSON.stringify(names))
      .toBe(names.length);
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

  test('the optional LRV can be reached, boarded, driven, and exited by keyboard', async ({ page }) => {
    await harness.mount(page, AT_EVA, EVA_READY);
    expect(await page.evaluate(() => (window as any).__focusEva())).toBe(true);

    const evaCanvas = page.locator('canvas[data-eva-canvas="true"]');
    const geologyAction = page.locator('#eva-gt-action');
    await expect(page.locator('#eva-geology-traverse')).toBeVisible();
    await expect(geologyAction).toHaveText('Start optional traverse');
    await geologyAction.click();
    await expect(geologyAction).toHaveText('Restart traverse');
    await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-status')).toBe('active');
    await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-step')).toBe('1');
    expect(await page.evaluate(() => document.activeElement?.matches('canvas[data-eva-canvas="true"]')))
      .toBe(true);

    // From the EVA spawn, W+D follows a diagonal that passes within the rover's
    // three-metre boarding radius. Wait on the accessible control, not a fixed
    // duration, so SwiftShader frame rate cannot make this flaky.
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    const reached = await page.waitForFunction(() => {
      const action = document.getElementById('eva-lrv-action');
      return action && /Board LRV/i.test(String(action.textContent)) ? true : false;
    }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    await page.keyboard.up('KeyD');
    await page.keyboard.up('KeyW');
    expect(reached, 'the visible LRV control never reported boarding range').toBe(true);

    await page.keyboard.press('KeyV');
    await expect(page.locator('#eva-mode')).toContainText('LRV');
    await expect(page.locator('#eva-lrv-action')).toContainText('Exit LRV');
    await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-step')).toBe('2');

    await page.keyboard.down('KeyW');
    const drove = await page.waitForFunction(() => {
      const speed = document.getElementById('eva-lrv-speed');
      const text = speed ? String(speed.textContent) : '';
      return text && !/^Parked$/i.test(text) && Number.parseFloat(text) > 0 ? text : false;
    }, null, { timeout: 8000 }).catch(() => null);
    await page.keyboard.up('KeyW');
    expect(drove, 'the boarded LRV never reported forward speed').not.toBeNull();

    await page.keyboard.press('KeyF');
    const sampleGuard = await page.evaluate(() => (window as any).__events.toasts
      .some((t: any) => /on-foot|exit before collecting|samples stay/i.test(String(t.message))));
    expect(sampleGuard, 'F while boarded did not explain that sampling is on foot').toBe(true);

    await page.keyboard.press('KeyV');
    await expect(page.locator('#eva-mode')).toContainText('On foot');

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

  test('the trans-Earth coast paints its own 2D canvas', async ({ page }) => {
    // Phase 8 is 2D, not WebGL, so expectCanvas is off — the harness would otherwise
    // sit waiting for a GL context that this phase never creates. Worth a browser
    // check anyway: a ref callback that throws is swallowed into a blank rectangle,
    // and no jsdom test renders past phase 0.
    await harness.mount(page, { moonMission: { missionPhase: 8 } }, undefined, { expectCanvas: false });
    await page.waitForTimeout(1500); // let the coast animate past its opening frames

    const canvas = page.locator('canvas[data-teicoast-canvas="true"]');
    expect(await canvas.count(), 'trans-Earth coast canvas never mounted').toBe(1);

    const shot = await canvas.screenshot({ timeout: 60000 });
    expect(shot.length, 'the coast canvas is blank').toBeGreaterThan(6000);

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
