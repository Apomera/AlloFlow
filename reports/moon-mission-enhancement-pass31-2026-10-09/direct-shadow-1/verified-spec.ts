import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_SHADOW_REPORT_DIR || 'reports/moon-mission-enhancement-pass31-2026-10-09/browser/shadow');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('2D descent shadow projects the hardware silhouette and anchors banked contact', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    const context = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return /webgl/i.test(type) ? null : (context as any).apply(this, [type, ...args]);
    };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    const sourceIds = new WeakMap<HTMLCanvasElement, number>(); let nextSource = 0;
    (CanvasRenderingContext2D.prototype as any).drawImage = function(source: any, ...args: any[]) {
      const canvas = this.canvas as HTMLCanvasElement;
      if (!canvas.hasAttribute('data-descent-canvas') || !(source instanceof HTMLCanvasElement))
        return (drawImage as any).apply(this, [source, ...args]);
      if (!sourceIds.has(source)) sourceIds.set(source, ++nextSource);
      const probe = (canvas as any).__shadowProbe || ((canvas as any).__shadowProbe = { calls: 0, imageIds: [], requested: false, capture: null });
      const imageId = sourceIds.get(source)!;
      if (!probe.imageIds.includes(imageId)) probe.imageIds.push(imageId);
      const matrix = this.getTransform(), sx = canvas.width / canvas.offsetWidth, sy = canvas.height / canvas.offsetHeight;
      probe.calls++;
      probe.last = { imageId, args, matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
        alpha: this.globalAlpha, composite: this.globalCompositeOperation,
        width: canvas.offsetWidth, height: canvas.offsetHeight, backingWidth: canvas.width, backingHeight: canvas.height,
        surface: Number(canvas.dataset.descentSideSurfaceY), pivot: Number(canvas.dataset.descentSidePivotY),
        clearance: Number(canvas.dataset.descentSideClearance) };
      if (!probe.requested) return (drawImage as any).apply(this, [source, ...args]);
      probe.requested = false;
      const before = this.getImageData(0, 0, canvas.width, canvas.height).data;
      const returned = (drawImage as any).apply(this, [source, ...args]);
      const after = this.getImageData(0, 0, canvas.width, canvas.height).data;
      let changed = 0, aboveGround = 0, brighterChannels = 0, darkening = 0, alphaChanges = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
        const i = (py * canvas.width + px) * 4;
        let delta = 0;
        for (let ch = 0; ch < 3; ch++) {
          delta += Math.abs(after[i + ch] - before[i + ch]);
          if (after[i + ch] > before[i + ch]) brighterChannels++;
          darkening += before[i + ch] - after[i + ch];
        }
        if (after[i + 3] !== before[i + 3]) alphaChanges++;
        if (delta) {
          changed++; minX = Math.min(minX, (px + .5) / sx); maxX = Math.max(maxX, (px + .5) / sx);
          minY = Math.min(minY, (py + .5) / sy); maxY = Math.max(maxY, (py + .5) / sy);
          // A boundary pixel can intersect the ground clip. Fully sky pixels must remain identical.
          if (py + 1 <= probe.last.surface * sy) aboveGround++;
        }
      }
      const mask = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;
      let covered = 0, opaque = 0, partial = 0, colored = 0, edgeCoverage = 0, checksum = 2166136261;
      for (let py = 0; py < source.height; py++) for (let px = 0; px < source.width; px++) {
        const i = (py * source.width + px) * 4, alpha = mask[i + 3];
        checksum = Math.imul(checksum ^ alpha, 16777619) >>> 0;
        if (alpha) {
          covered++; if (alpha === 255) opaque++; else partial++;
          if (mask[i] || mask[i + 1] || mask[i + 2]) colored++;
          if (px === 0 || py === 0 || px === source.width - 1 || py === source.height - 1) edgeCoverage++;
        }
      }
      probe.capture = { ...probe.last, pixels: { changed, aboveGround, brighterChannels, darkening, alphaChanges,
        bounds: changed ? { minX, minY, maxX, maxY } : null },
        mask: { width: source.width, height: source.height, covered, opaque, partial, colored, edgeCoverage, checksum } };
      return returned;
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 850 });
  const cases = [
    { name: 'high-level', alt: 300, tilt: 0 },
    { name: 'near-level', alt: .5, tilt: 0 },
    { name: 'near-left', alt: .5, tilt: -.35 },
    { name: 'near-right', alt: .5, tilt: .35 },
    { name: 'contact-level', alt: 0, tilt: 0 },
    { name: 'contact-left', alt: 0, tilt: -.35 },
    { name: 'contact-right', alt: 0, tilt: .35 },
  ];
  // Saved presentation fixtures isolate the shadow geometry. They do not describe a newly integrated flight.
  const rows = cases.map((c, i) => ({ t: i, alt: c.alt, tilt: c.tilt, fuel: 50, throttle: 0, v: 0, h: 0, x: 0 }));
  // The official scrubber returns to the outcome at its final index, so contact fixtures precede it.
  rows.push({ t: cases.length, alt: 0, tilt: 0, fuel: 50, throttle: 0, v: 0, h: 0, x: 0 });
  const result = { crashed: false, score: 84, grade: 'B', vVel: 0, hVel: 0, fuel: 50, fuelUnit: 's',
    recording: { version: 1, samples: rows, firstBurn: null, burnSeconds: 0, peakDescent: 0, peakDrift: 0 } };
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
  const saved = await page.evaluate(() => { const d = JSON.parse(JSON.stringify((window as any).__toolData.moonMission)); delete d.landingReviewIndex; return d; });
  const stages: any[] = []; let firstImage: number | undefined, firstChecksum: number | undefined;
  await mkdir(REPORT, { recursive: true });

  async function select(index: number) {
    await page.locator('[data-landing-scrub]').fill(String(index));
    await expect(canvas).toHaveAttribute('data-descent-review-time', rows[index].t.toFixed(3));
  }
  async function inspect() {
    await canvas.evaluate((c: any) => { c.__shadowProbe.capture = null; c.__shadowProbe.requested = true; });
    await expect.poll(() => canvas.evaluate((c: any) => !!c.__shadowProbe.capture)).toBe(true);
    return canvas.evaluate((c: any) => c.__shadowProbe.capture);
  }
  function projection(capture: any, bank: number) {
    const co = Math.cos(bank), si = Math.sin(bank), [a, b, c, d, e, f] = capture.matrix;
    const sx = capture.backingWidth / capture.width, sy = capture.backingHeight / capture.height;
    const pads = [[-24, 2.5], [-10, 2], [10, 2], [24, 2.5]];
    const lowest = pads.reduce((best, p) => p[0] * si + 28 * co + p[1] > best[0] * si + 28 * co + best[1] ? p : best);
    const points = [
      { name: 'left-cabin-roof', u: -9, v: -16 }, { name: 'right-cabin-roof', u: 9, v: -16 },
      { name: 'stage-corner', u: 14, v: 13 }, { name: 'mast', u: 2, v: -22 },
      // Inverse rotation maps the circular pad's world-down radius into the tilted drawing frame.
      { name: 'lowest-pad', u: lowest[0] + lowest[1] * si, v: 28 + lowest[1] * co },
    ].map(p => {
      const rotatedX = p.u * co - p.v * si, worldHeight = capture.surface - capture.pivot - p.u * si - p.v * co;
      // Independent ray/plane intersection using the documented Sun vector, not the production helper.
      const rayParameter = worldHeight / 260;
      const groundX = rotatedX - (-700) * rayParameter, groundZ = 0 - 360 * rayParameter;
      const expectedX = capture.width / 2 + groundX, expectedY = capture.surface - .12 * groundZ;
      const actualX = (a * p.u + c * p.v + e) / sx, actualY = (b * p.u + d * p.v + f) / sy;
      return { ...p, worldHeight, rotatedX, expectedX, expectedY, actualX, actualY,
        error: Math.hypot(actualX - expectedX, actualY - expectedY) };
    });
    return { points, maximumError: Math.max(...points.map(p => p.error)) };
  }
  async function stability() {
    return canvas.evaluate(async (c: HTMLCanvasElement) => {
      const ctx = c.getContext('2d')!, before = ctx.getImageData(0, 0, c.width, c.height).data;
      const probe = (c as any).__shadowProbe, callsBefore = probe.calls, imageBefore = probe.last.imageId;
      await new Promise(resolve => setTimeout(resolve, 180)); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const after = ctx.getImageData(0, 0, c.width, c.height).data;
      let changedBytes = 0; for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changedBytes++;
      return { bytes: before.length, changedBytes, callsBefore, callsAfter: probe.calls,
        imageBefore, imageAfter: probe.last.imageId, imageIds: [...probe.imageIds] };
    });
  }
  async function captureStage(name: string, index: number, completed = false) {
    await select(index); const measured = await inspect(), rays = projection(measured, rows[index].tilt), stable = await stability();
    expect(measured.args).toEqual([-32, -28, 64, 64]);
    expect(measured.alpha).toBeCloseTo(.68, 12); expect(measured.composite).toBe('source-over');
    expect(measured.mask.width).toBe(256); expect(measured.mask.height).toBe(256);
    expect(measured.mask.covered).toBeGreaterThan(4000); expect(measured.mask.covered).toBeLessThan(60000);
    expect(measured.mask.opaque).toBeGreaterThan(1000); expect(measured.mask.partial).toBeGreaterThan(0);
    expect(measured.mask.colored).toBe(0); expect(measured.mask.edgeCoverage).toBe(0);
    if (firstImage === undefined) { firstImage = measured.imageId; firstChecksum = measured.mask.checksum; }
    expect(measured.imageId).toBe(firstImage); expect(measured.mask.checksum).toBe(firstChecksum);
    expect(measured.pixels.aboveGround, name + ' sky unchanged').toBe(0);
    expect(measured.pixels.brighterChannels, name + ' darkening only').toBe(0); expect(measured.pixels.alphaChanges).toBe(0);
    if (rows[index].alt < 1) { expect(measured.pixels.changed, name + ' visible shadow').toBeGreaterThan(30); expect(measured.pixels.darkening).toBeGreaterThan(100); }
    expect(rays.maximumError).toBeLessThan(1e-8);
    const pad = rays.points.find(p => p.name === 'lowest-pad')!;
    expect(pad.worldHeight).toBeCloseTo(measured.clearance, 9);
    if (rows[index].alt === 0) {
      expect(measured.clearance).toBe(0); expect(pad.actualX).toBeCloseTo(measured.width / 2 + pad.rotatedX, 9);
      expect(pad.actualY).toBeCloseTo(measured.surface, 9);
    }
    expect(stable.callsAfter).toBeGreaterThan(stable.callsBefore); expect(stable.changedBytes, name + ' paused pixels').toBe(0);
    expect(stable.imageBefore).toBe(firstImage); expect(stable.imageAfter).toBe(firstImage); expect(stable.imageIds).toEqual([firstImage]);
    expect(await canvas.evaluate((c: any) => c._descentState())).toEqual(held);
    expect((await canvas.evaluate((c: any) => c._descentDustState())).grains).toEqual([]);
    const preserved = await page.evaluate(() => { const d = JSON.parse(JSON.stringify((window as any).__toolData.moonMission)); delete d.landingReviewIndex; return d; });
    expect(preserved).toEqual(saved); expect(errors).toEqual([]);
    const path = join(REPORT, name + '.png'); await canvas.screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
    const stage = { name, screenshot: path, sample: rows[index], measured, rays, stability: stable, errors, ...(completed ? { completed: true } : {}) };
    stages.push(stage); await writeFile(join(REPORT, name + '.json'), JSON.stringify(stage, null, 2));
    await writeFile(join(REPORT, 'progress.json'), JSON.stringify({ stages }, null, 2));
  }
  for (let i = 0; i < cases.length; i++) await captureStage(cases[i].name, i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.setViewportSize({ width: 1100, height: 1000 });
  await expect(canvas).toHaveAttribute('data-descent-hud-layout', 'corners');
  await captureStage('desktop-near-left', 2, true);
});
