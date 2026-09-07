import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Physics Simulator — behaviour that only a real browser can prove.
 *
 * Every check here is a bug this tool actually shipped (found 2026-09-07):
 *
 *   drag flies forward   — the drag step applied `drag·v·|v|·50` per FRAME with no
 *                          dt, so above 10 m/s the loss exceeded the velocity and
 *                          the ball reversed on frame one and "landed" at -0.2 m.
 *                          Shipped that way for six months; the jsdom suite cannot
 *                          see it because jsdom has no rAF and no canvas.
 *   mass matters in air  — drag is divided by mass, so the Mass slider finally
 *                          changes something a student can observe.
 *   pause is inert       — paused frames still integrated, draining velocity to NaN.
 *   launch counting      — the counter is bumped on the click path, not inside
 *                          `_launch()`, so only a real click proves it.
 *   live-region silence  — the Data panel now refreshes ~4 Hz during flight. A
 *                          status region carrying running metrics re-announces
 *                          itself about once a second and drowns out a screen
 *                          reader (Particle Lab, 2026-09-05). axe cannot see it;
 *                          the only way to know is to count mutations.
 *
 * Self-contained: GlHarness serves the working tree on its own port, so this does
 * not touch playwright.config.ts (whose baseURL is the DEPLOYED site).
 */

test.describe.configure({ timeout: 240_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js',
  toolId: 'physics',
  width: 1100,
  height: 900,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

/** Mount and wait for the 2D canvas to publish its launch hook. */
async function mountPhysics(page: Page) {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(
    () => !!(document.getElementById('physicsCanvas') as any)?._launch,
    null,
    { timeout: 30_000 },
  );
}

async function setState(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((p) => {
    (window as any).__ctx.setLabToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } }));
  }, patch);
  await page.waitForTimeout(250);
}

/** Click Launch and wait for the ball to land; returns the measured flight. */
async function launchAndLand(page: Page) {
  await page.getByRole('button', { name: 'Launch!' }).click();
  return await page.evaluate(async () => {
    const cv = document.getElementById('physicsCanvas') as any;
    const t0 = Date.now();
    while (cv._launched && Date.now() - t0 < 30_000) await new Promise((r) => setTimeout(r, 50));
    return { landed: !cv._launched, range: Number(cv.dataset.lastRange), maxH: Number(cv.dataset.lastMaxH) };
  });
}

test('air drag shortens the flight instead of reversing it, and mass matters in air', async ({ page }) => {
  await mountPhysics(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false });
  const vacuum = await launchAndLand(page);

  await setState(page, { airResist: true });
  const light = await launchAndLand(page);

  await setState(page, { mass: 10 });
  const heavy = await launchAndLand(page);

  expect(vacuum.landed).toBe(true);
  // Closed form at 45°, 25 m/s, g=9.8 is 63.8 m; Euler at dt=0.035 lands just under.
  expect(vacuum.range).toBeGreaterThan(60);
  expect(vacuum.range).toBeLessThan(66);

  // Forward, shorter, and lower — never behind the cannon.
  expect(light.range).toBeGreaterThan(vacuum.range * 0.6);
  expect(light.range).toBeLessThan(vacuum.range);
  expect(light.maxH).toBeLessThan(vacuum.maxH);

  // Same air push slows a heavier ball less, so it carries further.
  expect(heavy.range).toBeGreaterThan(light.range);
  expect(heavy.range).toBeLessThan(vacuum.range);
});

test('the flight runs in real time, not at the display refresh rate', async ({ page }) => {
  // The loop advanced a fixed 0.035s of simulated time per FRAME, so the flight
  // ran at whatever rate the monitor refreshed: measured 2.02x real time at 58fps
  // and it would be ~4x on a 120Hz laptop. Two students on different machines saw
  // different speeds, and the flight time the tool reports did not match a
  // stopwatch — which matters because that number is a taught measurement.
  await mountPhysics(page);
  // A high lob under Moon gravity, so the flight outlasts the sampling window.
  await setState(page, { angle: 80, velocity: 50, gravity: 1.6, mass: 1, airResist: false, simSpeed: 1 });

  const sample = async (ms: number) => await page.evaluate(async (waitMs) => {
    const cv = document.getElementById('physicsCanvas') as any;
    const t0 = performance.now();
    const s0 = cv._ball ? cv._ball.t : 0;
    await new Promise((r) => setTimeout(r, waitMs));
    return {
      wall: (performance.now() - t0) / 1000,
      sim: (cv._ball ? cv._ball.t : 0) - s0,
      flying: !!cv._launched,
    };
  }, ms);

  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.waitForTimeout(150);
  const full = await sample(1500);
  expect(full.flying, 'flight must outlast the window or the ratio is meaningless').toBe(true);
  // Generous band: frame pacing varies on CI, but frame-driven timing sat at 2.02.
  expect(full.sim / full.wall).toBeGreaterThan(0.7);
  expect(full.sim / full.wall).toBeLessThan(1.3);

  // Half speed must still be half of real time, not half of a frame count.
  await setState(page, { simSpeed: 0.5 });
  const half = await sample(1500);
  expect(half.flying).toBe(true);
  expect(half.sim / half.wall).toBeGreaterThan(0.3);
  expect(half.sim / half.wall).toBeLessThan(0.75);
});

test('pausing mid-flight freezes the physics instead of draining velocity', async ({ page }) => {
  await mountPhysics(page);
  await setState(page, { angle: 55, velocity: 30, airResist: true, mass: 1, simSpeed: 1 });
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.waitForTimeout(500);
  await setState(page, { simSpeed: 0 });

  const frozen = await page.evaluate(async () => {
    const cv = document.getElementById('physicsCanvas') as any;
    const before = { vx: cv._ball.mVx, vy: cv._ball.mVy };
    const trailBefore = cv._trails[cv._trails.length - 1].length;
    await new Promise((r) => setTimeout(r, 700));
    return {
      vxSame: cv._ball.mVx === before.vx,
      vySame: cv._ball.mVy === before.vy,
      finite: Number.isFinite(cv._ball.mVx) && Number.isFinite(cv._ball.mVy),
      trailGrew: cv._trails[cv._trails.length - 1].length - trailBefore,
    };
  });

  expect(frozen.finite).toBe(true);
  expect(frozen.vxSame).toBe(true);
  expect(frozen.vySame).toBe(true);
  expect(frozen.trailGrew).toBe(0);
});

test('does not narrate the running simulation through a live region', async ({ page }) => {
  await mountPhysics(page);
  // Worst case for churn: both panels open and the slowest speed, so a flight
  // is still running for the whole measurement window.
  await setState(page, { showFlightData: true, showGraphs: true, angle: 60, velocity: 45, airResist: true, simSpeed: 0.25 });

  await page.evaluate(() => {
    const w = window as any;
    w.__liveHits = 0;
    w.__liveObs = new MutationObserver((records) => {
      for (const r of records) {
        const el = (r.target as Element).closest?.('[aria-live], [role="status"], [role="alert"]');
        if (el) w.__liveHits++;
      }
    });
    document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').forEach((el) => {
      w.__liveObs.observe(el, { childList: true, characterData: true, subtree: true });
    });
  });

  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.waitForTimeout(5000);

  const result = await page.evaluate(() => {
    const w = window as any;
    w.__liveObs.disconnect();
    return { hits: w.__liveHits, stillFlying: !!(document.getElementById('physicsCanvas') as any)._launched };
  });

  // The flight must still be running, or the window proved nothing.
  expect(result.stillFlying).toBe(true);
  // Same threshold as the Particle Lab gate: a live region may carry milestones,
  // never a value that moves with the physics step.
  expect(result.hits).toBeLessThanOrEqual(3);
});

test('counts launches and logs each run with a fair-test verdict', async ({ page }) => {
  await mountPhysics(page);
  await setState(page, { angle: 40, velocity: 30, gravity: 9.8, mass: 1, airResist: false });
  await launchAndLand(page);

  // One variable moved — a fair test.
  await setState(page, { angle: 50 });
  await launchAndLand(page);

  // Two variables moved — confounded, and the log must say so.
  await setState(page, { velocity: 40, gravity: 3.7 });
  await launchAndLand(page);

  const state = await page.evaluate(() => {
    const d = (window as any).__toolData.physics;
    return { launchCount: d.launchCount, runs: (d.runLog || []).length };
  });
  expect(state.launchCount).toBe(3);
  expect(state.runs).toBe(3);

  const logText = await page.evaluate(
    () => (document.querySelector('[data-physics-run-log]') as HTMLElement)?.innerText ?? '',
  );
  expect(logText).toContain('a fair test');
  expect(logText).toContain('more than one change');

  // Compare-overlay trails and log rows must identify each other by run number.
  // Numbering comes from a monotonic counter, not the capped log length, or run 9
  // would come back as run 1 and stop matching its trail.
  const linkage = await page.evaluate(() => {
    const d = (window as any).__toolData.physics;
    const cv = document.getElementById('physicsCanvas') as any;
    return {
      logNumbers: (d.runLog || []).map((r: any) => r.n),
      trailNumbers: (cv._trails || []).map((t: any) => t.run),
      runCount: d.runCount,
    };
  });
  expect(linkage.logNumbers).toEqual([1, 2, 3]);
  expect(linkage.trailNumbers).toEqual([1, 2, 3]);
  expect(linkage.runCount).toBe(3);
});
