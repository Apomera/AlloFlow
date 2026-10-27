import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Woodland sounds are opt-in: no audio context before the click, calls pan by
// where each bird is, a caption names what was heard, and Off stops new calls.
test.use({ video: 'off', trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const RESIDENTS = ['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal', 'darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', 'americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];

test('calls play spatially from real residents, are captioned, and stop when turned off', async ({ page }) => {
  await page.addInitScript(() => {
    const rec = { contexts: 0, started: 0, pans: [] as number[], freqs: [] as number[] };
    (window as any).__audioRec = rec;
    const param = () => ({ value: 0, setValueAtTime(v: number) { rec.freqs.push(v); }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = (extra: any = {}) => Object.assign({ connect(n: any) { return n; }, disconnect() {} }, extra);
    class FakeContext {
      state = 'running'; destination = node();
      constructor() { rec.contexts++; }
      get currentTime() { return performance.now() / 1000; }
      resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createGain() { return node({ gain: param() }); }
      createBiquadFilter() { return node({ type: '', frequency: { value: 0 } }); }
      createOscillator() { return node({ type: 'sine', frequency: param(), start() { rec.started++; }, stop() {} }); }
      createStereoPanner() { const pan = { value: 0 }; const n = node({ pan }); setTimeout(() => rec.pans.push(pan.value), 0); return n; }
    }
    (window as any).AudioContext = FakeContext; (window as any).webkitAudioContext = FakeContext;
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 100, timeout: 60_000 });
  // Record the visible-call cues the sound layer sends the scene.
  await page.locator('[data-birdlab-3d-canvas]').evaluate((n: any) => {
    const c = n._birdlab3d, cue = c.cueSong; (window as any).__cues = [];
    c.cueSong = (id: string, notes: any[], delay: number) => { const ok = cue(id, notes, delay); (window as any).__cues.push({ id, notes: notes.length, delay, ok }); return ok; };
  });
  const card = page.locator('[data-birdlab-woodland-sounds]'), toggle = page.locator('[data-birdlab-sounds-toggle]');
  await expect(card).toHaveAttribute('data-birdlab-woodland-sounds', 'off');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as any).__audioRec.contexts)).toBe(0);
  const axe = () => page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-woodland-sounds]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(await axe()).toEqual([]);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const heard = page.locator('[data-birdlab-heard]');
  await expect.poll(async () => heard.getAttribute('data-birdlab-heard'), { timeout: 45_000 }).not.toBe('');
  expect(RESIDENTS).toContain(await heard.getAttribute('data-birdlab-heard'));
  expect(await axe()).toEqual([]);
  await expect(heard).toHaveText(/^Heard: .+, (ahead|behind|to your).*, about \d+ m away\. .+\.$/);
  const rec = await page.evaluate(() => (window as any).__audioRec);
  expect(rec.contexts).toBe(1); expect(rec.started).toBeGreaterThan(0);
  expect(rec.pans.length).toBeGreaterThan(0); expect(rec.pans.every((v: number) => v >= -1 && v <= 1)).toBe(true);
  expect(rec.freqs.some((f: number) => f > 1000)).toBe(true);
  // Each call is cued for its bird to show, timed with the synthesis.
  const cues = await page.evaluate(() => (window as any).__cues);
  expect(cues.map((c: any) => c.id)).toContain(await heard.getAttribute('data-birdlab-heard'));
  for (const c of cues) { expect(c.notes).toBeGreaterThan(0); expect(c.delay).toBe(.05); expect(c.ok).toBe(c.id !== 'mourningDove'); }
  await toggle.click();
  await expect(card).toHaveAttribute('data-birdlab-woodland-sounds', 'off');
  await expect(page.locator('[data-birdlab-heard]')).toHaveCount(0);
  const stopped = await page.evaluate(() => (window as any).__audioRec.started);
  await page.waitForTimeout(4000);
  expect(await page.evaluate(() => (window as any).__audioRec.started)).toBe(stopped);
});
