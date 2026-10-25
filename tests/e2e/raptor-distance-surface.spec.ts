import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND7_REPORT || 'reports/raptor-distance-round7-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceSurfaceNativeLoader;window.AlloPostFXEnabled=false;'
});
const rootSelector = '[data-raptor-distance-study]';
const cases = [
  { distance: 40, cycles: 4 }, { distance: 60, cycles: 8 },
  { distance: 80, cycles: 20 }, { distance: 120, cycles: 12 },
  { distance: 140, cycles: 8 }, { distance: 200, cycles: 20 },
  { distance: 300, cycles: 4 }, { distance: 300, cycles: 20 }
];

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

function referenceMetrics(distance: number, cycles: number) {
  const angle = 2 * Math.atan(.30 / (2 * distance)) * 180 / Math.PI;
  const frequency = cycles / angle;
  return { angle, frequency,
    humanTransfer: Math.exp(-Math.log(10) * (frequency / 60) ** 2),
    eagleTransfer: Math.exp(-Math.log(10) * (frequency / 140) ** 2) };
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keeps the neutral stripe surface in front of its backing throughout the observation distances', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceSurfaceNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    graphicsQuality: 'low', xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false }
  } }, undefined, { expectCanvas: false });
  await page.locator('[data-raptor-distance-launch]').click();
  await expect(page.locator(rootSelector)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  const evidence = [];

  for (const condition of cases) {
    await setRange(page, 'distance', condition.distance);
    await setRange(page, 'cycles', condition.cycles);
    await expect.poll(() => page.locator(rootSelector).evaluate((root: any) => root._distanceScene.getDiagnostics().settings)).toMatchObject({ ...condition, contrast: 95 });
    const metrics = referenceMetrics(condition.distance, condition.cycles);
    const prediction = metrics.frequency <= 60 ? 'both' : metrics.frequency <= 140 ? 'eagle' : 'neither';
    await page.locator('[data-distance-prediction="' + prediction + '"]').click();
    await page.locator('[data-distance-reveal]').click();
    await expect(page.locator('[data-distance-result]')).toBeVisible();
    const sampled = await page.locator(rootSelector).evaluate((root: any, condition) => {
      // Independent pinhole projection: the 30 cm plaque is centred in a
      // 1024 px image with a .75 degree horizontal field. This does not read
      // a diagnostic bounding box or inspect the expected material's color.
      const projectedWidth = 1024 * .30 / (2 * condition.distance * Math.tan(.75 * Math.PI / 360));
      const x0 = Math.ceil(512 - projectedWidth * .30), x1 = Math.floor(512 + projectedWidth * .30), y = 256;
      const samples = ['reference', 'eagle'].map(name => {
        const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
        const pixels = canvas.getContext('2d')!.getImageData(x0, y, x1 - x0 + 1, 1).data;
        const rgb: number[][] = [], codes: number[] = [], channelSpreads: number[] = [], alphas: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          rgb.push([r, g, b]); codes.push((r + g + b) / 3);
          channelSpreads.push(Math.max(r, g, b) - Math.min(r, g, b)); alphas.push(pixels[i + 3]);
        }
        const mean = codes.reduce((sum, value) => sum + value, 0) / codes.length;
        const spreads = channelSpreads.slice().sort((a, b) => a - b);
        return { name, width: canvas.width, height: canvas.height, rgb, count: codes.length,
          mean, min: Math.min(...codes), max: Math.max(...codes), range: Math.max(...codes) - Math.min(...codes),
          standardDeviation: Math.sqrt(codes.reduce((sum, value) => sum + (value - mean) ** 2, 0) / codes.length),
          meanChannelSpread: channelSpreads.reduce((sum, value) => sum + value, 0) / channelSpreads.length,
          p95ChannelSpread: spreads[Math.ceil(spreads.length * .95) - 1], minAlpha: Math.min(...alphas) };
      });
      const live = (window as any).__glRecorder.records.filter((record: any) => record.mount === (window as any).__glRecorder.mount && !record.ctx.isContextLost());
      const depthBits = live.map((record: any) => record.ctx.getParameter(record.ctx.DEPTH_BITS));
      return { projectedWidth, x0, x1, y, samples, depthBits, diagnostics: root._distanceScene.getDiagnostics() };
    }, condition);
    evidence.push({ ...condition, metrics, ...sampled });
    if (condition.distance === 60) {
      await page.locator('[data-distance-original-panels]').screenshot({ path: resolve(output, 'near-stripes-fixed.jpg'), type: 'jpeg', quality: 90 });
    }
  }

  const human60 = evidence.find(item => item.distance === 60)!.samples.find(sample => sample.name === 'reference')!;
  const eagle140 = evidence.find(item => item.distance === 140)!.samples.find(sample => sample.name === 'eagle')!;
  const rangeRatio = eagle140.range / human60.range;
  // Keep the complete diagnostic series even when the unpatched renderer fails.
  writeFileSync(resolve(output, 'distance-surface-pixels.json'), JSON.stringify({
    method: 'Centre row, central 60% of independently projected plaque width; RGB code values, not physical luminance.',
    thresholds: { eagleMeanChannelSpread: 5, eagleP95ChannelSpread: 8, matchedRangeMinimum: 80, matchedRangeRatio: [.75, 1.25] },
    rangeRatio: Number.isFinite(rangeRatio) ? rangeRatio : String(rangeRatio), evidence, errors
  }, null, 2));

  // A brown backing can have convincing camera/transfer metadata, but it
  // cannot satisfy neutral grayscale pixels in the plaque's clear interior.
  for (const condition of evidence) {
    const eagle = condition.samples.find(sample => sample.name === 'eagle')!;
    const label = condition.distance + ' m / ' + condition.cycles + ' stripe pairs';
    expect(eagle.meanChannelSpread, label + ': neutral plaque rather than brown backing').toBeLessThan(5);
    expect(eagle.p95ChannelSpread, label + ': neutral plaque interior').toBeLessThan(8);
    for (const sample of condition.samples) {
      expect([sample.width, sample.height]).toEqual([1024, 512]);
      expect(sample.count).toBeGreaterThan(40); expect(sample.minAlpha).toBe(255);
    }
  }
  expect(human60.meanChannelSpread, 'Human starter must expose its grayscale stripe surface').toBeLessThan(5);
  expect(human60.range, 'Human 60 m starter must contain visible stripe modulation').toBeGreaterThan(80);
  expect(eagle140.range, 'Matched eagle 140 m image must contain visible stripe modulation').toBeGreaterThan(80);
  expect(referenceMetrics(140, 8).eagleTransfer / referenceMetrics(60, 8).humanTransfer).toBeCloseTo(1, 5);
  // Browser sampling/blur is not a luminance-calibrated measurement. Require
  // broadly comparable actual modulation instead of exact analytic amplitudes.
  expect(rangeRatio).toBeGreaterThanOrEqual(.75); expect(rangeRatio).toBeLessThanOrEqual(1.25);
  expect(errors).toEqual([]);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  await page.locator('[data-raptor-distance-close]').click();
  await expect(page.locator(rootSelector)).toHaveCount(0);
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
});
