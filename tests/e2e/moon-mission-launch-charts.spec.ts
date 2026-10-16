import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass68-2026-10-14/browser/launch-charts');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, moonMission?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: data || { missionPhase: 1, animPaused: true, launchPaused: true, soundOff: true,
      missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
  }, moonMission);
  await expect(page.locator('[data-launch-canvas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function launch(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({ ...cv.dataset }));
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
function physical(data: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('launchHorizon')));
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-launch-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs(Number((await launch(page)).launchTime) - time)).toBeLessThan(0.11);
  return time;
}
async function milestone(page: Page, name: string, time: number) {
  await page.locator('[data-launch-milestone="' + name + '"]').click();
  await expect.poll(async () => Math.abs(Number((await launch(page)).launchTime) - time)).toBeLessThan(1e-6);
}

async function inspectCharts(page: Page) {
  return page.locator('[data-launch-instruments]').evaluate(async host => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const cv = document.querySelector('[data-launch-canvas]') as HTMLCanvasElement;
    const data = { ...cv.dataset }, time = Number(data.launchTime), sample = P.launchSample(profile, Math.max(0, time));
    const expectedTime = time < 0 ? 'T\u2212' + (-time).toFixed(1) + ' s' : 'T+' + time.toFixed(1) + ' s';
    const box = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top,
      bottom: r.bottom, width: r.width, height: r.height }; };
    const label = (el: Element) => ({ text: el.textContent || '', fontSize: parseFloat(getComputedStyle(el).fontSize), box: box(el) });
    const charts = ['altitude', 'speed'].map(key => {
      const figure = host.querySelector('[data-launch-chart="' + key + '"]')!;
      const svg = figure.querySelector('svg')!, plot = figure.querySelector('[data-launch-chart-plot]')!;
      const dot = figure.querySelector('[data-launch-chart-dot]')!;
      const increment = key === 'altitude' ? 50 : 2;
      const peak = Math.max(...profile.samples.map((row: any) => row[key] / 1000));
      const expectedMaximum = Math.max(increment, Math.ceil(peak / increment) * increment);
      const expectedReading = (sample[key] / 1000).toFixed(key === 'altitude' ? 1 : 3) + (key === 'altitude' ? ' km' : ' km/s');
      const expectedX = 20 + 560 * Math.max(0, time) / profile.summary.duration;
      const expectedY = 140 - 128 * (sample[key] / 1000) / expectedMaximum;
      const curve = svg.querySelector('polyline[clip-path]')!;
      const points = (curve.getAttribute('points') || '').trim().split(/\s+/).map(point => point.split(',').map(Number));
      // The oracle matches rendered points to the physical sample table; it does
      // not call chart helpers or assume their decimation stride.
      let maximumXError = 0, maximumYError = 0;
      const mismatches: any[] = [];
      points.forEach(([x, y]) => {
        let closest = profile.samples[0], nearest = Infinity;
        for (const row of profile.samples) {
          const distance = Math.abs(x - (20 + 560 * row.time / profile.summary.duration));
          if (distance < nearest) { nearest = distance; closest = row; }
        }
        const yError = Math.abs(y - (140 - 128 * (closest[key] / 1000) / expectedMaximum));
        maximumXError = Math.max(maximumXError, nearest); maximumYError = Math.max(maximumYError, yError);
        if (nearest > 0.0051 || yError > 0.0051) mismatches.push({ x, y, nearest, yError });
      });
      const playhead = svg.querySelector('[data-launch-playhead]')!, trace = svg.querySelector('[data-launch-trace]')!;
      return { key, figure: box(figure), caption: box(figure.querySelector('figcaption')!), plot: box(plot), svg: box(svg), dot: box(dot),
        dotHidden: dot.getAttribute('aria-hidden'), role: svg.getAttribute('role'), viewBox: svg.getAttribute('viewBox'),
        preserveAspectRatio: svg.getAttribute('preserveAspectRatio'), maximum: Number(svg.getAttribute('data-launch-chart-maximum')),
        divisor: Number(svg.getAttribute('data-launch-chart-divisor')), ariaLabel: svg.getAttribute('aria-label') || '',
        title: key === 'altitude' ? 'Altitude' : 'Inertial speed', expectedMaximum, expectedReading, expectedX, expectedY,
        reading: label(figure.querySelector('[data-launch-chart-reading]')!), timeLabel: label(figure.querySelector('[data-launch-chart-time]')!),
        instrumentReading: host.querySelector('[data-launch-value="' + key + '"]')!.textContent,
        yAxis: box(figure.querySelector('[data-launch-chart-axis="y"]')!),
        xAxis: box(figure.querySelector('[data-launch-chart-axis="x"]')!),
        yTicks: Array.from(figure.querySelectorAll('[data-launch-chart-axis="y"] [data-launch-chart-tick]')).map(label),
        xTicks: Array.from(figure.querySelectorAll('[data-launch-chart-axis="x"] span')).map(label),
        strokes: Array.from(svg.querySelectorAll('[stroke]')).map(el => ({ effect: el.getAttribute('vector-effect'), width: el.getAttribute('stroke-width') })),
        playhead: [Number(playhead.getAttribute('x1')), Number(playhead.getAttribute('x2'))], traceWidth: Number(trace.getAttribute('width')),
        pointCount: points.length, first: points[0], last: points[points.length - 1], maximumXError, maximumYError, mismatches };
    });
    return { data, time, expectedTime, duration: profile.summary.duration, sampleCount: profile.samples.length,
      instrumentTime: host.querySelector('[data-launch-value="time"]')!.textContent, charts,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth },
      roleImages: host.querySelectorAll('[role="img"]').length,
      sample: { altitude: sample.altitude, speed: sample.speed, stage: sample.stage, engineOn: sample.engineOn, thrust: sample.thrust } };
  });
}

function checkCharts(scene: Awaited<ReturnType<typeof inspectCharts>>) {
  expect(scene.roleImages).toBe(2); expect(scene.instrumentTime).toBe(scene.expectedTime);
  expect(scene.overflow.scroll).toBeLessThanOrEqual(scene.overflow.width + 1);
  expect(Number(scene.data.launchAltitude)).toBeCloseTo(scene.sample.altitude, 6);
  expect(Number(scene.data.launchSpeed)).toBeCloseTo(scene.sample.speed, 6);
  for (const chart of scene.charts) {
    expect(chart.role).toBe('img'); expect(chart.viewBox).toBe('0 0 600 160'); expect(chart.preserveAspectRatio).toBe('none');
    expect(chart.divisor).toBe(1000); expect(chart.maximum).toBe(chart.expectedMaximum);
    expect(chart.plot.height).toBeCloseTo(160, 2); expect(chart.svg.height).toBeCloseTo(160, 2);
    expect(chart.svg.width).toBeCloseTo(chart.plot.width, 2);
    expect(chart.reading.text).toBe(chart.expectedReading); expect(chart.reading.text).toBe(chart.instrumentReading);
    expect(chart.timeLabel.text).toBe(scene.expectedTime); expect(chart.reading.fontSize).toBeGreaterThanOrEqual(16);
    expect(chart.ariaLabel).toContain(chart.title); expect(chart.ariaLabel).toContain(chart.expectedReading); expect(chart.ariaLabel).toContain(scene.expectedTime);
    expect(chart.dotHidden).toBe('true'); expect(chart.dot.width).toBeCloseTo(8, 2); expect(chart.dot.height).toBeCloseTo(8, 2);
    expect(chart.dot.left + chart.dot.width / 2 - chart.plot.left).toBeCloseTo(chart.plot.width * chart.expectedX / 600, 1);
    expect(chart.dot.top + chart.dot.height / 2 - chart.plot.top).toBeCloseTo(chart.expectedY, 1);
    for (const cursor of chart.playhead) expect(cursor).toBeCloseTo(chart.expectedX, 6);
    expect(chart.traceWidth).toBeCloseTo(chart.expectedX - 20, 6);
    expect(chart.pointCount).toBeGreaterThan(20); expect(chart.pointCount).toBeLessThanOrEqual(scene.sampleCount + 1);
    expect(chart.first[0]).toBe(20); expect(chart.last[0]).toBe(580); expect(chart.mismatches).toEqual([]);
    expect(chart.maximumXError).toBeLessThanOrEqual(0.0051); expect(chart.maximumYError).toBeLessThanOrEqual(0.0051);
    expect(chart.strokes.length).toBeGreaterThanOrEqual(5);
    chart.strokes.forEach(stroke => expect(stroke.effect).toBe('non-scaling-stroke'));
    expect(chart.yTicks.map(tick => Number(tick.text))).toEqual([chart.maximum, chart.maximum / 2, 0]);
    expect(chart.xTicks.map(tick => tick.text)).toEqual(['0 s', 'Flight time', scene.duration.toFixed(0) + ' s']);
    expect(chart.caption.bottom).toBeLessThanOrEqual(chart.plot.top);
    expect(chart.yAxis.right).toBeLessThanOrEqual(chart.plot.left - 7.9);
    expect(chart.xAxis.top).toBeGreaterThanOrEqual(chart.plot.bottom - 0.1);
    for (const tick of [...chart.yTicks, ...chart.xTicks, chart.timeLabel]) {
      expect(tick.fontSize).toBeGreaterThanOrEqual(11);
      expect(tick.box.left).toBeGreaterThanOrEqual(chart.figure.left);
      expect(tick.box.right).toBeLessThanOrEqual(chart.figure.right);
      expect(tick.box.top).toBeGreaterThanOrEqual(chart.figure.top);
      expect(tick.box.bottom).toBeLessThanOrEqual(chart.figure.bottom);
    }
    for (let i = 1; i < chart.xTicks.length; i++) expect(chart.xTicks[i - 1].box.right).toBeLessThanOrEqual(chart.xTicks[i].box.left);
    for (let i = 1; i < chart.yTicks.length; i++) expect(chart.yTicks[i - 1].box.bottom).toBeLessThanOrEqual(chart.yTicks[i].box.top);
    expect(chart.figure.left).toBeGreaterThanOrEqual(0); expect(chart.figure.right).toBeLessThanOrEqual(scene.overflow.width + 1);
  }
  const [a, b] = scene.charts.map(chart => chart.figure);
  expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'chart cards remain distinct').toBe(true);
}

async function capture(page: Page, info: TestInfo, name: string) {
  const target = page.locator('[data-launch-instruments]');
  await target.scrollIntoViewIfNeeded();
  await target.evaluate(async () => { await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
  const bounds = await target.evaluate(el => { const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  const plots = await target.locator('[data-launch-chart-plot]').evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; }));
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  const png = readPng(await page.screenshot({ path, fullPage: true, clip: bounds }));
  expect(Math.abs(png.width - bounds.width)).toBeLessThanOrEqual(1); expect(Math.abs(png.height - bounds.height)).toBeLessThanOrEqual(1);
  const contents = plots.map(plot => {
    let bright = 0, samples = 0, minimum = 255, maximum = 0;
    const left = Math.ceil(plot.x - bounds.x) + 1, top = Math.ceil(plot.y - bounds.y) + 1;
    const right = Math.min(png.width, Math.floor(plot.x - bounds.x + plot.width) - 1);
    const bottom = Math.min(png.height, Math.floor(plot.y - bounds.y + plot.height) - 1);
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const value = Math.max(...png.at(x, y)); samples++; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
      if (value > 130) bright++;
    }
    return { samples, bright, minimum, maximum };
  });
  for (const plot of contents) {
    expect(plot.samples, 'saved screenshot contains both full chart interiors').toBeGreaterThan(20000);
    expect(plot.bright, 'saved plot contains a visible trace, marker or cursor').toBeGreaterThan(40);
    expect(plot.maximum - plot.minimum, 'saved plot is not blank').toBeGreaterThan(70);
  }
  await writeFile(path.replace(/\.png$/, '-pixels.json'), JSON.stringify({ width: png.width, height: png.height, plots: contents }, null, 2));
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-launch-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}

test('Launch recorder charts keep measured scales, readable axes and current samples through review and phone resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const profile = await page.evaluate(() => { const p = (window as any).MoonMissionPure.launchProfile(); return { events: p.events, summary: p.summary }; });
  const countdown = await inspectCharts(page); checkCharts(countdown);
  expect(countdown.time).toBe(-5); expect(countdown.data.launchEngine).toBe('off');
  expect(countdown.charts.every(chart => chart.traceWidth === 0)).toBe(true);
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  await milestone(page, 'maxQ', profile.events.maxQ.time);
  const desktopMaxQ = await inspectCharts(page); checkCharts(desktopMaxQ);
  expect(Number(desktopMaxQ.data.launchPressure)).toBeCloseTo(profile.summary.peakQ, 5);
  await capture(page, info, 'launch-charts-desktop-maxq');
  await milestone(page, 'stage1', profile.events.stage1.time);
  const desktopSeparation = await inspectCharts(page); checkCharts(desktopSeparation);
  expect(desktopSeparation.data.launchStage).toBe('2'); expect(desktopSeparation.data.launchEngine).toBe('off');
  expect(Number(desktopSeparation.data.launchThrust)).toBe(0);
  await seek(page, profile.events.stage1.time + 2.1);
  const restarted = await inspectCharts(page); checkCharts(restarted); expect(restarted.data.launchEngine).toBe('on');
  expect(Number(restarted.data.launchThrust)).toBeGreaterThan(500000);
  await page.locator('[data-launch-result]').click();
  await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const desktopInsertion = await inspectCharts(page); checkCharts(desktopInsertion);
  expect(desktopInsertion.time).toBeCloseTo(profile.summary.duration, 6);
  const insertionSaved = await saved(page); expect(insertionSaved.launchResult.outcome).toBe('orbit'); expect(insertionSaved.missionXP).toBe(0);
  await capture(page, info, 'launch-charts-desktop-insertion'); await accessibility(page, info, 'launch-charts-desktop-axe');
  const resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const prior = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(prior);
    const scene = await inspectCharts(page); checkCharts(scene);
    expect(physical(scene.data)).toEqual(physical(desktopInsertion.data)); expect(await saved(page)).toEqual(insertionSaved);
    resizeProbes.push({ width, scene });
  }
  const phoneInsertion = resizeProbes[2].scene;
  await capture(page, info, 'launch-charts-phone-insertion');
  await milestone(page, 'maxQ', profile.events.maxQ.time);
  const phoneMaxQ = await inspectCharts(page); checkCharts(phoneMaxQ); expect(physical(phoneMaxQ.data)).toEqual(physical(desktopMaxQ.data));
  await capture(page, info, 'launch-charts-phone-maxq');
  await milestone(page, 'stage1', profile.events.stage1.time);
  const phoneSeparation = await inspectCharts(page); checkCharts(phoneSeparation);
  expect(physical(phoneSeparation.data)).toEqual(physical(desktopSeparation.data));
  await capture(page, info, 'launch-charts-phone-separation'); await accessibility(page, info, 'launch-charts-phone-axe');
  const reviewedSave = await saved(page); expect(reviewedSave.launchResult).toEqual(insertionSaved.launchResult); expect(reviewedSave.missionXP).toBe(0);
  const paused = await launch(page); await page.waitForTimeout(180); expect(await launch(page)).toEqual(paused);
  await expect(page.locator('[data-launch-pause]')).toHaveText('Play launch');
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(phoneSeparation.time);
  const keyboard = await inspectCharts(page); checkCharts(keyboard);
  const beforeReload = await launch(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await inspectCharts(page); checkCharts(reloaded);
  expect(await launch(page)).toEqual(beforeReload); expect(await saved(page)).toEqual(reloadSave);
  expect(reloadSave.launchResult).toEqual(insertionSaved.launchResult); expect(reloadSave.missionXP).toBe(0); expect(reloadSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const evidence = { scenes: { countdown, desktopMaxQ, desktopSeparation, restarted, desktopInsertion, phoneInsertion, phoneMaxQ, phoneSeparation, keyboard, reloaded },
    resizeProbes, errors, screenshotCount: 5, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    curveOracle: 'Each plotted point matched to the physical launch sample table independently of the renderer stride; SI values converted to labeled units.',
    markerOracle: 'Native DOM center compared with independently computed current launchSample, time fraction and labeled vertical scale.',
    recordedResultAndRewardsPreservedDuringEarlierReview: true };
  const path = join(REPORT, 'launch-charts-evidence.json'); await writeFile(path, JSON.stringify(evidence, null, 2));
  await info.attach('launch-charts-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
