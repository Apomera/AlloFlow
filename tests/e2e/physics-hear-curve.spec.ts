import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// "Listen to the curve" in real React and layout. A recording AudioContext stands in for the
// speakers; the spec asserts what was scheduled, and that the buttons work from the keyboard.
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
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
// The sweep oscillator of the n-th sweep started after `from`: its pitch ramp, timed from its start.
const sweep = (page: Page, from: number) => page.evaluate(start => {
  const osc = (window as any).__audioLog.osc.slice(start);
  const main = osc.find((o: any) => o.type === 'sine' && o.frequency.calls.filter((c: any[]) => c[0] === 'exponentialRampToValueAtTime').length > 10);
  const ramps = main.frequency.calls.filter((c: any[]) => c[0] === 'exponentialRampToValueAtTime');
  const t0 = main.frequency.calls.find((c: any[]) => c[0] === 'setValueAtTime')[2];   // the first sample is set, the rest ramp
  return { peakHz: Math.max(...ramps.map((c: any[]) => c[1])), length: ramps[ramps.length - 1][2] - t0, chimes: osc.filter((o: any) => o.type === 'triangle').length };
}, from);
const listen = (page: Page) => page.locator('[data-physics-range-listen-curve]');
const oscCount = (page: Page) => page.evaluate(() => (window as any).__audioLog.osc.length);

test('plays each curve from the keyboard on one shared pitch scale, and switches between them', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 45, velocity: 50, gravity: 9.8, mass: 1, launchHeight: 0, airResist: true, simSpeed: 1, showRangeExplorer: true });
  const panel = page.locator('[data-physics-range-explorer]');
  await expect(listen(page)).toHaveCount(0);                      // nothing to hear before the reveal
  await panel.locator('[data-physics-range-skip]').click();
  await expect(listen(page)).toHaveCount(2);
  await expect(listen(page).nth(0)).toContainText('Listen to the curve');
  await expect(listen(page).nth(1)).toContainText('Listen without air drag');
  await expect(page.locator('#physics-range-listen-help')).toContainText('40.9° through air, 45.0° without drag');
  for (const b of await listen(page).all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  const before = await oscCount(page);
  await listen(page).nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(listen(page).nth(0)).toHaveAttribute('data-playing', 'true');
  await expect(listen(page).nth(0)).toContainText('Stop the sound');
  await expect(listen(page).nth(0)).toBeFocused();               // the label changes, the button stays put
  const drag = await sweep(page, before);
  expect(drag.length).toBeCloseTo(4, 2);
  expect(drag.chimes).toBe(1);
  expect(drag.peakHz).toBeLessThan(0.7 * 880);                    // through air the curve sounds lower

  const mid = await oscCount(page);
  await listen(page).nth(1).click();                              // straight to the other curve
  await expect(listen(page).nth(0)).toHaveAttribute('data-playing', 'false');
  await expect(listen(page).nth(1)).toHaveAttribute('data-playing', 'true');
  const vac = await sweep(page, mid);
  expect(vac.peakHz).toBeCloseTo(880, 0);
  const firstStopped = await page.evaluate(([a, b]) => (window as any).__audioLog.osc.slice(a, b).every((o: any) => o.stopped >= 1), [before, mid]);
  expect(firstStopped).toBe(true);

  await listen(page).nth(1).focus();
  await page.keyboard.press('Space');
  await expect(listen(page).nth(1)).toHaveAttribute('data-playing', 'false');
  await expect(listen(page).nth(1)).toContainText('Listen without air drag');
});

test('the buttons wrap inside a phone-width column', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '358px'; });
  await setState(page, { showRangeExplorer: true, airResist: true, velocity: 25, rangeExplorer: { revealedFor: '25|9.8|drag|1|0' } });
  const panel = page.locator('[data-physics-range-explorer]');
  await expect(listen(page)).toHaveCount(2);
  const pbox = (await panel.boundingBox())!;
  for (const b of await listen(page).all()) {
    const box = (await b.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(pbox.x - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(pbox.x + pbox.width + 0.5);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await listen(page).nth(0).click();
  await expect(listen(page).nth(0)).toContainText('Stop the sound');
  const scroll = await panel.evaluate(el => el.scrollWidth - el.clientWidth);
  expect(scroll).toBeLessThanOrEqual(1);
});
