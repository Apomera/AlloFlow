import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ENTRY_RECORDER_REPORT_DIR || 'reports/moon-mission-enhancement-pass34-2026-10-09/browser/entry-recorder');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const guided = { version: 2, mode: 'guided', bank: 0 };
const keys = ['loadG', 'heatFlux'] as const;
type ChartKey = typeof keys[number];
const units = { loadG: 'g', heatFlux: 'MW/m²' };
const divisors = { loadG: 1, heatFlux: 1e6 };

async function mount(page: Page, options: { version?: number; angle?: number; plan?: typeof guided } = {}) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ plan, version, angle }) => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount({ moonMission: {
      missionPhase: 9, entryAngle: angle, entryPlan: plan,
      entryRun: { version, ...(version === 2 ? { plan } : {}), angle, time: 0, recovery: 0, recorded: false },
      entryPaused: true, animPaused: true, soundOff: true, missionXP: 0,
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
    } });
  }, { plan: options.plan || guided, version: options.version || 2, angle: options.angle ?? -6.5 });
  await expect(page.locator('[data-entry-chart]')).toHaveCount(2);
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}

function protectedEvidence(state: any) {
  return {
    entryOutcome: state.entryOutcome, entryAttempts: state.entryAttempts, entryAwardedXP: state.entryAwardedXP,
    missionXP: state.missionXP, entryCompletionAwarded: state.entryCompletionAwarded,
    flightHistory: state.flightHistory, earnedBadges: state.earnedBadges, missionPhase: state.missionPhase,
    entryPlan: state.entryPlan,
    runEvidence: { version: state.entryRun.version, plan: state.entryRun.plan, angle: state.entryRun.angle, recorded: state.entryRun.recorded },
  };
}

async function clock(page: Page) {
  return page.locator('[data-entry-canvas]').evaluate((canvas: HTMLElement) => Number(canvas.dataset.entryTime));
}

async function profile(page: Page) {
  return page.evaluate(() => {
    const run = (window as any).__toolData.moonMission.entryRun;
    return (window as any).MoonMissionPure.entryProfile(run.angle, run.version === 2 ? { plan: run.plan } : undefined);
  });
}

async function inspect(page: Page, expectedProfile: any, name: string) {
  // Read the current model sample and both charts together in one browser task,
  // so animation cannot advance between the physical clock and visual checks.
  const evidence = await page.evaluate(keyList => {
    const P = (window as any).MoonMissionPure;
    const run = (window as any).__toolData.moonMission.entryRun;
    const p = P.entryProfile(run.angle, run.version === 2 ? { plan: run.plan } : undefined);
    const canvas = document.querySelector('[data-entry-canvas]') as HTMLElement;
    const time = Number(canvas.dataset.entryTime), sample = P.entrySample(p, time);
    const charts = keyList.map(key => {
      const figure = document.querySelector('[data-entry-chart="' + key + '"]') as HTMLElement;
      const area = figure.querySelector('[data-entry-chart-area]') as HTMLElement;
      const svg = area.querySelector('svg')!;
      const marker = figure.querySelector('[data-entry-chart-marker]') as HTMLElement;
      const line = figure.querySelector('[data-entry-chart-line]')!;
      const playhead = figure.querySelector('[data-entry-playhead]')!;
      const areaBox = area.getBoundingClientRect(), markerBox = marker.getBoundingClientRect(), box = figure.getBoundingClientRect();
      const labels = Array.from(figure.querySelectorAll('[data-entry-chart-value-axis], [data-entry-chart-axis], [data-entry-chart-current], figcaption'));
      const limit = figure.querySelector('[data-entry-chart-limit]');
      return {
        key, maximum: Number(figure.dataset.entryChartMaximum), divisor: Number(figure.dataset.entryChartDivisor),
        viewBox: svg.getAttribute('viewBox'), aspect: svg.getAttribute('preserveAspectRatio'), description: svg.getAttribute('aria-label'),
        width: areaBox.width, height: areaBox.height, left: box.left, right: box.right,
        marker: { width: markerBox.width, height: markerBox.height,
          x: (markerBox.left + markerBox.width / 2 - areaBox.left) / areaBox.width * 100,
          y: (markerBox.top + markerBox.height / 2 - areaBox.top) / areaBox.height * 100,
          radius: getComputedStyle(marker).borderRadius, border: parseFloat(getComputedStyle(marker).borderLeftWidth) },
        cursor: { x1: Number(playhead.getAttribute('x1')), x2: Number(playhead.getAttribute('x2')), effect: playhead.getAttribute('vector-effect') },
        line: { points: line.getAttribute('points'), effect: line.getAttribute('vector-effect') },
        labelFonts: labels.map(el => parseFloat(getComputedStyle(el).fontSize)),
        labelsAreHtml: labels.every(el => el.namespaceURI === 'http://www.w3.org/1999/xhtml'),
        current: figure.querySelector('[data-entry-chart-current]')!.textContent,
        timeAxis: figure.querySelector('[data-entry-chart-axis]')!.textContent,
        valueAxis: figure.querySelector('[data-entry-chart-value-axis]')!.textContent,
        limit: limit && { y: Number(limit.getAttribute('y1')), effect: limit.getAttribute('vector-effect') },
        text: figure.textContent,
      };
    });
    return { time, sample, charts, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth };
  }, keys);
  expect(evidence.overflow).toBe(false);
  for (const chart of evidence.charts) {
    const key = chart.key as ChartKey, divisor = divisors[key];
    const peak = Math.max(...expectedProfile.samples.map((row: any) => row[key] / divisor));
    expect(chart.maximum).toBeCloseTo(Math.max(peak, key === 'loadG' ? 10 : 0) * 1.08 || 1, 8);
    expect(chart.divisor).toBe(divisor);
    expect(chart.viewBox).toBe('0 0 100 100');
    expect(chart.aspect).toBe('none');
    expect(chart.height).toBeCloseTo(148, 1);
    expect(chart.width).toBeGreaterThan(100);
    expect(chart.left).toBeGreaterThanOrEqual(0);
    expect(chart.right).toBeLessThanOrEqual(evidence.viewport);
    expect(chart.labelFonts.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...chart.labelFonts)).toBeGreaterThanOrEqual(12);
    expect(chart.labelsAreHtml).toBe(true);
    expect(chart.timeAxis).toContain('0 s');
    expect(chart.timeAxis).toContain(expectedProfile.summary.duration.toFixed(1) + ' s');
    expect(chart.valueAxis).toContain(chart.maximum.toFixed(2));
    expect(chart.valueAxis).toContain((chart.maximum / 2).toFixed(2));
    expect(chart.valueAxis).toContain('0.00');
    expect(chart.description).toContain(units[key]);
    expect(chart.current).toContain((evidence.sample[key] / divisor).toFixed(2));
    expect(chart.current).toContain(units[key]);
    expect(chart.current).toContain(evidence.time.toFixed(1) + ' s');
    expect(chart.line.effect).toBe('non-scaling-stroke');
    expect(chart.cursor.effect).toBe('non-scaling-stroke');
    const expectedX = 100 * evidence.time / expectedProfile.summary.duration;
    const expectedY = 100 * (1 - evidence.sample[key] / divisor / chart.maximum);
    expect(chart.cursor.x1).toBeCloseTo(expectedX, 4);
    expect(chart.cursor.x2).toBeCloseTo(expectedX, 4);
    expect(chart.marker.x).toBeCloseTo(expectedX, 1);
    expect(chart.marker.y).toBeCloseTo(expectedY, 1);
    expect(chart.marker.width).toBeCloseTo(10, 2);
    expect(chart.marker.height).toBeCloseTo(10, 2);
    expect(chart.marker.radius).toBe('50%');
    expect(chart.marker.border).toBe(2);
    const points = chart.line.points!.trim().split(/\s+/).map(point => point.split(',').map(Number));
    expect(points.length).toBeGreaterThan(100);
    expect(points.length).toBeLessThanOrEqual(322);
    expect(points[0][0]).toBe(0);
    expect(points[points.length - 1][0]).toBe(100);
    for (const [x, y] of points) {
      const nearest = expectedProfile.samples.reduce((best: any, row: any) =>
        Math.abs(100 * row.time / expectedProfile.summary.duration - x) < Math.abs(100 * best.time / expectedProfile.summary.duration - x) ? row : best);
      expect(Math.abs(x - 100 * nearest.time / expectedProfile.summary.duration)).toBeLessThanOrEqual(0.006);
      expect(Math.abs(y - 100 * (1 - nearest[key] / divisor / chart.maximum))).toBeLessThanOrEqual(0.006);
    }
    const peakSample = expectedProfile.samples.reduce((best: any, row: any) => row[key] > best[key] ? row : best);
    expect(points.some(([x, y]) => Math.abs(x - 100 * peakSample.time / expectedProfile.summary.duration) < 0.0001
      && Math.abs(y - 100 * (1 - peak / chart.maximum)) < 0.0001)).toBe(true);
    if (key === 'loadG') {
      expect(chart.maximum).toBeGreaterThan(10);
      expect(chart.limit).not.toBeNull();
      expect(chart.limit!.y).toBeCloseTo(100 * (1 - 10 / chart.maximum), 4);
      expect(chart.limit!.effect).toBe('non-scaling-stroke');
      expect(chart.text).toMatch(/10\s*g.*teaching threshold/i);
    } else expect(chart.limit).toBeNull();
  }
  await writeFile(join(REPORT, name + '.json'), JSON.stringify(evidence, null, 2));
  return evidence;
}

async function chartSeek(page: Page, key: ChartKey, fraction: number, touch: boolean, duration: number) {
  const area = page.locator('[data-entry-chart-area="' + key + '"]');
  await area.scrollIntoViewIfNeeded();
  const box = (await area.boundingBox())!;
  const position = { x: box.width * fraction, y: box.height * 0.45 };
  await area.evaluate(node => {
    (window as any).__entryRecorderClick = null;
    node.addEventListener('click', event => {
      const rect = node.getBoundingClientRect();
      (window as any).__entryRecorderClick = { x: (event as MouseEvent).clientX, left: rect.left, width: rect.width };
    }, { once: true, capture: true });
  });
  if (touch) await area.tap({ position });
  else await area.click({ position });
  // Pointer coordinates may be pixel-quantized. First check the requested point,
  // then demand exact physical-time mapping from the real delivered click.
  const tolerance = duration / box.width * 1.1 + 0.02;
  await expect.poll(async () => Math.abs(await clock(page) - duration * fraction)).toBeLessThan(tolerance);
  const delivered = await page.evaluate(() => (window as any).__entryRecorderClick);
  expect(delivered).not.toBeNull();
  const requestedTime = Math.max(0, Math.min(1, (delivered.x - delivered.left) / delivered.width)) * duration;
  await expect.poll(() => clock(page)).toBeCloseTo(requestedTime, 6);
}

async function capture(page: Page, info: TestInfo, name: string) {
  const grid = page.locator('[data-entry-charts]');
  const path = join(REPORT, name + '.png');
  await grid.screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ hasTouch: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('entry recorder charts preserve measured units, touch and keyboard inspection, live playback and completed evidence', async ({ page }, info) => {
  const errors: string[] = [], checkpoints: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('crash', () => errors.push('page crashed'));
  await mkdir(REPORT, { recursive: true });
  async function checkpoint(name: string) {
    checkpoints.push(name);
    await writeFile(join(REPORT, 'entry-recorder-diagnostics.json'), JSON.stringify({ checkpoints, errors }, null, 2));
  }
  try {
    await page.setViewportSize({ width: 320, height: 850 });
    await mount(page);
    const p = await profile(page), duration = p.summary.duration;
    expect(p.version).toBe(2);
    expect(p.summary.outcome).toBe('nominal');
    await page.locator('[data-entry-result]').click();
    await expect(page.locator('[data-entry-complete]')).toBeEnabled();
    const complete = await saved(page), protectedState = protectedEvidence(complete);
    expect(complete.entryOutcome).toMatchObject({ modelVersion: 2, completed: true, terminal: 'splash', plan: guided });
    expect(complete.entryAttempts).toHaveLength(1);
    expect(complete.missionXP).toBe(25);
    await checkpoint('genuine-guided-result');

    await chartSeek(page, 'loadG', 0.18, true, duration);
    await inspect(page, p, 'phone-load-inspection');
    await capture(page, info, 'phone-load-inspection');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('phone-touch-load');
    await chartSeek(page, 'heatFlux', 0.36, true, duration);
    await inspect(page, p, 'phone-heat-inspection');
    await capture(page, info, 'phone-heat-inspection');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('phone-touch-heat');
    const peakLoad = p.samples.reduce((best: any, row: any) => row.loadG > best.loadG ? row : best);
    await page.locator('[data-entry-chart-peak="loadG"]').tap();
    await expect.poll(() => clock(page)).toBeCloseTo(peakLoad.time, 6);
    await inspect(page, p, 'phone-peak-load');
    await capture(page, info, 'phone-peak-load');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('phone-exact-peak-load');

    const slider = page.locator('[data-entry-seek]');
    await slider.focus();
    await page.keyboard.press('Home');
    await expect.poll(() => clock(page)).toBe(0);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => clock(page)).toBeCloseTo(0.1, 4);
    await inspect(page, p, 'phone-keyboard');
    await page.keyboard.press('End');
    // A range with step 0.1 may round the terminal value down by one step.
    await expect.poll(async () => Math.abs(await clock(page) - duration)).toBeLessThanOrEqual(0.11);
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('native-keyboard-home-right-end');

    await page.setViewportSize({ width: 1100, height: 1000 });
    await chartSeek(page, 'heatFlux', 0.231, false, duration);
    const desktop = await inspect(page, p, 'desktop-heat-inspection');
    await capture(page, info, 'desktop-heat-inspection');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('desktop-mouse-heat');

    await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('10');
    await page.locator('[data-entry-pause]').click();
    await expect(page.locator('[data-entry-pause]')).toHaveText('Pause entry');
    await expect.poll(() => clock(page)).toBeGreaterThan(desktop.time + 1);
    const animated = await inspect(page, p, 'desktop-live-playback');
    expect(animated.charts[0].marker.x).toBeGreaterThan(desktop.charts[0].marker.x);
    expect(animated.charts[1].marker.x).toBeGreaterThan(desktop.charts[1].marker.x);
    await page.locator('[data-entry-pause]').click();
    await expect(page.locator('[data-entry-pause]')).toHaveText('Play entry');
    await inspect(page, p, 'desktop-paused-after-playback');
    await capture(page, info, 'desktop-paused-after-playback');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('live-playhead-and-values');

    const peakHeat = p.samples.reduce((best: any, row: any) => row.heatFlux > best.heatFlux ? row : best);
    await page.locator('[data-entry-chart-peak="heatFlux"]').click();
    await expect.poll(() => clock(page)).toBeCloseTo(peakHeat.time, 6);
    await inspect(page, p, 'desktop-peak-heat');
    await capture(page, info, 'desktop-peak-heat');
    expect(protectedEvidence(await saved(page))).toEqual(protectedState);
    await checkpoint('desktop-exact-peak-heat');

    // The same plot must retain its units and extrema on a steep run, skip-out,
    // and an earlier saved physical model. Generate all three through the API.
    for (const fixture of [
      { name: 'steep', angle: -9, version: 2, plan: guided },
      { name: 'skip', angle: -6.5, version: 2, plan: { version: 2, mode: 'bank', bank: 0 } },
      { name: 'earlier-model', angle: -6.5, version: 1, plan: guided },
    ]) {
      await mount(page, fixture);
      const variant = await profile(page);
      expect(variant.version).toBe(fixture.version);
      if (fixture.name === 'steep') expect(variant.summary.peakG).toBeGreaterThan(10);
      if (fixture.name === 'skip') expect(variant.summary.outcome).toBe('skip');
      await page.locator('[data-entry-result]').click();
      await expect.poll(() => clock(page)).toBeCloseTo(variant.summary.duration, 6);
      const resultState = protectedEvidence(await saved(page));
      await page.locator('[data-entry-result]').click();
      expect(protectedEvidence(await saved(page))).toEqual(resultState);
      await page.locator('[data-entry-chart-peak="loadG"]').click();
      const variantPeak = variant.samples.reduce((best: any, row: any) => row.loadG > best.loadG ? row : best);
      await expect.poll(() => clock(page)).toBeCloseTo(variantPeak.time, 6);
      await inspect(page, variant, fixture.name + '-peak-load');
      expect(protectedEvidence(await saved(page))).toEqual(resultState);
      await checkpoint(fixture.name + '-model-and-receipt');
    }
    expect(errors).toEqual([]);
  } catch (error) {
    const path = join(REPORT, 'failure.png');
    try { await page.screenshot({ path, fullPage: false, timeout: 5000 }); await info.attach('failure', { path, contentType: 'image/png' }); } catch {}
    await writeFile(join(REPORT, 'failure.json'), JSON.stringify({ checkpoints, errors, message: String(error) }, null, 2));
    throw error;
  }
});
