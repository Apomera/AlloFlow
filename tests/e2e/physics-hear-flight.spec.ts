import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// "Hear the flight" in real React and layout. Headless Chromium cannot be listened to, so a
// recording AudioContext stands in for the speakers and the spec asserts what was scheduled.
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    (window as any).__tick = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); };
    const log: any = { osc: [] };
    (window as any).__audioLog = log;
    const param = () => { const p: any = { calls: [] }; for (const m of ['setValueAtTime', 'exponentialRampToValueAtTime', 'linearRampToValueAtTime', 'cancelScheduledValues']) p[m] = (...a: any[]) => { p.calls.push([m, ...a]); }; return p; };
    class FakeAC {
      currentTime = 5; state = 'running'; destination = {};
      createOscillator() { const o: any = { type: '', frequency: param(), started: 0, stopped: 0, connect() {}, disconnect() {}, start() { o.started++; }, stop() { o.stopped++; } }; log.osc.push(o); return o; }
      createGain() { return { gain: param(), connect() {} }; }
      createStereoPanner() { return { pan: param(), connect() {} }; }
      resume() {}
    }
    (window as any).AudioContext = FakeAC;
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => { if ((window as any).StemLab) delete (window as any).StemLab.audioContext; });
}
async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
  await page.waitForTimeout(60);
}
async function launchAndLand(page: Page) {
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any; let n = 0; while (cv._launched && n++ < 20000) (window as any).__tick(1000 / 60); });
  await page.waitForTimeout(80);
}
const hear = (page: Page) => page.locator('[data-physics-hear]');

test('plays the landed flight with pitch peaking at the apex, then stops on a second press', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 1 });
  await expect(hear(page)).toBeDisabled();
  await expect(hear(page)).toHaveAttribute('aria-describedby', 'physics-hear-help');
  await expect(page.locator('#physics-hear-help')).toContainText('pitch rises with height');
  // While the ball is in the air the button waits.
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.evaluate(() => (window as any).__tick(1000 / 60));
  await expect(hear(page)).toBeDisabled();
  await page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any; let n = 0; while (cv._launched && n++ < 20000) (window as any).__tick(1000 / 60); });
  await expect(hear(page)).toBeEnabled();
  await expect(hear(page)).toContainText('Hear the last flight');
  const box = await hear(page).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  // The tool's own launch and impact beeps share the context; start reading after them.
  const before = await page.evaluate(() => (window as any).__audioLog.osc.length);
  await hear(page).click();
  await expect(hear(page)).toContainText('Stop the sound');
  const sched = await page.evaluate((from) => {
    const all = (window as any).__audioLog, log = { osc: all.osc.slice(from) }, main = log.osc[0];
    const ramps = main.frequency.calls.filter((c: any[]) => c[0] === 'exponentialRampToValueAtTime');
    const peak = ramps.reduce((a: any[], c: any[]) => (c[1] > a[1] ? c : a), ramps[0]);
    return { oscillators: log.osc.length, started: log.osc.every((o: any) => o.started === 1), peakHz: peak[1], peakAt: peak[2] - 5.06, endAt: ramps[ramps.length - 1][2] - 5.06,
      cueHz: log.osc.slice(1).map((o: any) => o.frequency.calls[0][1]) };
  }, before);
  expect(sched.oscillators).toBe(4);
  expect(sched.started).toBe(true);
  expect(sched.peakHz).toBeCloseTo(880, 0);
  expect(sched.endAt).toBeCloseTo(3.61, 1);                       // the real 3.61 s flight time
  expect(sched.peakAt / sched.endAt).toBeCloseTo(0.5, 1);         // symmetric vacuum arc
  expect(sched.cueHz).toEqual([200, 1320, 150]);                  // launch tick, apex tick, impact thud

  await hear(page).click();
  await expect(hear(page)).toContainText('Hear the last flight');
  const stopped = await page.evaluate((from) => (window as any).__audioLog.osc.slice(from).every((o: any) => o.stopped >= 2), before);
  expect(stopped).toBe(true);
});

test('plays the selected recorded flight when one is open, and a new launch stops the sound', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, simSpeed: 1 });
  await launchAndLand(page);
  await setState(page, { simSpeed: 0 });
  await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-sample-inspector]')).toBeVisible();
  await expect(hear(page)).toContainText('Hear the selected flight');
  await hear(page).click();
  await expect(hear(page)).toContainText('Stop the sound');
  await setState(page, { simSpeed: 1 });
  await page.getByRole('button', { name: 'Launch!' }).click();
  const cleared = await page.evaluate(() => !(document.getElementById('physicsCanvas') as any)._hearing);
  expect(cleared).toBe(true);
});
