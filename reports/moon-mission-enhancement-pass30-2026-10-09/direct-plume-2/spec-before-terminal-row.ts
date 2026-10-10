import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_PLUME_REPORT_DIR || 'reports/moon-mission-enhancement-pass30-2026-10-09/browser/plume');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('2D descent plume follows output and clips banked exhaust at the surface', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 850 });
  const cases = [
    { name: 'high-low', alt: 300, tilt: 0, fuel: 50, throttle: .25, emits: true },
    { name: 'high-full', alt: 300, tilt: 0, fuel: 50, throttle: 1, emits: true },
    { name: 'near-level', alt: .5, tilt: 0, fuel: 50, throttle: 1, emits: true },
    { name: 'near-left', alt: .5, tilt: -.35, fuel: 50, throttle: 1, emits: true },
    { name: 'near-right', alt: .5, tilt: .35, fuel: 50, throttle: 1, emits: true },
    { name: 'empty-fuel', alt: 300, tilt: .35, fuel: 0, throttle: 1, emits: false },
    { name: 'below-threshold', alt: 300, tilt: 0, fuel: 50, throttle: .1, emits: false },
    { name: 'touchdown', alt: 0, tilt: 0, fuel: 50, throttle: 1, emits: false },
  ];
  // Each pair changes only recorded engine output. These are presentation
  // fixtures, not claims about a newly integrated flight trajectory.
  const rows = cases.flatMap((c, i) => [0, c.throttle].map((throttle, j) => ({
    t: i * 2 + j, alt: c.alt, tilt: c.tilt, fuel: c.fuel, throttle, v: 0, h: 0, x: 0,
  })));
  const result = { crashed: false, score: 84, grade: 'B', vVel: 0, hVel: 0, fuel: 50, fuelUnit: 's',
    recording: { version: 1, samples: rows, firstBurn: { t: 1, alt: 300 }, burnSeconds: 7, peakDescent: 0, peakDrift: 0 } };
  const data = { moonMission: { missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true,
    difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
    earnedBadges: { first_step: true, mission_complete: true }, landingResult: result, landingAttempts: [result] } };
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => { Math.random = () => .999; document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(data); }, data);
  const canvas = page.locator('[data-descent-canvas]');
  await expect(canvas).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  const held = await canvas.evaluate((c: any) => c._descentState());
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.moonMission));
  const stages: any[] = [];
  await mkdir(REPORT, { recursive: true });
  async function select(index: number) {
    await page.locator('[data-landing-scrub]').fill(String(index));
    await expect(canvas).toHaveAttribute('data-descent-review-time', rows[index].t.toFixed(3));
    await canvas.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  }
  async function snapshot(name: string, extra: any) {
    const path = join(REPORT, name + '.png');
    await canvas.screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
    const stage = { name, screenshot: path, ...extra }; stages.push(stage);
    await writeFile(join(REPORT, name + '.json'), JSON.stringify(stage, null, 2));
    await writeFile(join(REPORT, 'progress.json'), JSON.stringify({ stages }, null, 2));
  }
  async function compare(bank: number) {
    return canvas.evaluate((c: HTMLCanvasElement, bank: number) => {
      const ctx = c.getContext('2d')!, now = ctx.getImageData(0, 0, c.width, c.height).data;
      const old = (c as any).__plumeReference as Uint8ClampedArray;
      const sx = c.width / c.clientWidth, sy = c.height / c.clientHeight;
      const surface = Number(c.dataset.descentSideSurfaceY), pivot = Number(c.dataset.descentSidePivotY);
      const co = Math.cos(bank), si = Math.sin(bank), cx = c.clientWidth / 2;
      let changed = 0, totalLight = 0, groundChanged = 0, upstreamChanged = 0, nozzleConnected = 0, maxChangedY = -Infinity;
      for (let py = Math.ceil(164 * sy); py < c.height; py++) for (let px = 0; px < c.width; px++) {
        const x = (px + .5) / sx, y = (py + .5) / sy;
        // The footer displays a different time for each paired sample.
        const replayWidth = Math.min(300, c.clientWidth - 24), replayX = (c.clientWidth - replayWidth) / 2;
        if (y >= c.clientHeight - 54 && x >= replayX - 2 && x <= replayX + replayWidth + 2) continue;
        const index = (py * c.width + px) * 4;
        let delta = 0; for (let ch = 0; ch < 4; ch++) delta += Math.abs(now[index + ch] - old[index + ch]);
        if (!delta) continue;
        changed++; totalLight += delta; maxChangedY = Math.max(maxChangedY, y);
        if (y >= surface + 1) groundChanged++;
        const localX = (x - cx) * co + (y - pivot) * si;
        const localY = -(x - cx) * si + (y - pivot) * co;
        if (localY < 20.5) upstreamChanged++;
        if (localY >= 22.25 && localY <= 24.5 && Math.abs(localX) < 2.2) nozzleConnected++;
      }
      return { changed, totalLight, groundChanged, upstreamChanged, nozzleConnected,
        maxChangedY: Number.isFinite(maxChangedY) ? maxChangedY : null, surface, pivot,
        width: c.clientWidth, height: c.clientHeight, backingWidth: c.width, backingHeight: c.height };
    }, bank);
  }
  async function stability() {
    return canvas.evaluate(async (c: HTMLCanvasElement) => {
      const ctx = c.getContext('2d')!, before = ctx.getImageData(0, 0, c.width, c.height).data;
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const after = ctx.getImageData(0, 0, c.width, c.height).data;
      let changedBytes = 0; for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changedBytes++;
      return { comparedAnimationFrames: 2, bytes: before.length, changedBytes };
    });
  }
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    await select(i * 2);
    await canvas.evaluate((c: HTMLCanvasElement) => { (c as any).__plumeReference = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; });
    if (i === 1) await snapshot('high-off', { sample: rows[i * 2] });
    await select(i * 2 + 1);
    const pixels = await compare(c.tilt), stable = await stability();
    expect(pixels.groundChanged, c.name + ' exhaust below surface').toBe(0);
    expect(pixels.upstreamChanged, c.name + ' exhaust inside/upstream of bell').toBe(0);
    expect(stable.changedBytes, c.name + ' paused pixels').toBe(0);
    if (c.emits) {
      expect(pixels.changed, c.name + ' visible exhaust').toBeGreaterThan(80);
      expect(pixels.nozzleConnected, c.name + ' connected nozzle').toBeGreaterThan(3);
    } else expect(pixels.changed, c.name + ' engine cutoff').toBe(0);
    expect(await canvas.evaluate((c: any) => c._descentState())).toEqual(held);
    expect((await canvas.evaluate((c: any) => c._descentDustState())).grains).toEqual([]);
    await snapshot(c.name, { sample: rows[i * 2 + 1], pixels, stability: stable });
  }
  const low = stages.find(s => s.name === 'high-low').pixels, full = stages.find(s => s.name === 'high-full').pixels;
  expect(full.changed).toBeGreaterThan(low.changed * 1.3);
  expect(full.totalLight).toBeGreaterThan(low.totalLight * 1.3);
  await page.setViewportSize({ width: 1100, height: 1000 });
  await select(2); await canvas.evaluate((c: HTMLCanvasElement) => { (c as any).__plumeReference = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; });
  await select(3); const desktop = await compare(0), stable = await stability();
  expect(desktop.changed).toBeGreaterThan(80); expect(desktop.nozzleConnected).toBeGreaterThan(3);
  expect(desktop.groundChanged).toBe(0); expect(desktop.upstreamChanged).toBe(0); expect(stable.changedBytes).toBe(0);
  // Ignore the intended recorder selection when comparing saved mission fields.
  const preserved = await page.evaluate(() => { const d = JSON.parse(JSON.stringify((window as any).__toolData.moonMission)); delete d.landingReviewIndex; return d; });
  const original = JSON.parse(saved); delete original.landingReviewIndex;
  expect(preserved).toEqual(original); expect(errors).toEqual([]);
  await snapshot('desktop-full', { pixels: desktop, stability: stable, errors, completed: true });
});
