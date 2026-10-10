import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_RECORDER_REPORT_DIR ||
  'reports/moon-mission-enhancement-pass33-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const PHONE = { width: 320, height: 850 }, DESKTOP = { width: 1100, height: 1000 };

// Deliberately irregular timestamps. An index-based chart click would select
// the wrong row at 12 seconds. These are saved presentation
// fixtures; the workflow does not claim to integrate a new flight.
const SAMPLES = [
  { t: 0, alt: 300, v: -3, h: 4, fuel: 100, throttle: 0, tilt: 0, x: 0 },
  { t: 2, alt: 250, v: 2.5, h: -1.5, fuel: 99.6, throttle: .25, tilt: -.1, x: -2 },
  { t: 17, alt: 120, v: 0, h: 0, fuel: 90, throttle: .35, tilt: 0, x: -5 },
  { t: 39, alt: 4, v: -1.2, h: 2.3, fuel: 61, throttle: .1, tilt: .05, x: 10 },
  { t: 40, alt: 0, v: -.9, h: -.1, fuel: 60, throttle: 0, tilt: 0, x: 11 },
];
function seed() {
  const recording = { version: 1, samples: SAMPLES.map(row => ({ ...row })),
    burnSeconds: 25, peakDescent: 6, peakDrift: 4, firstBurn: { t: 2, alt: 250 } };
  const result = { crashed: false, score: 94, grade: 'A', vVel: .9, hVel: .1,
    fuel: 60, fuelUnit: 's', recording };
  return { moonMission: { missionPhase: 5, descentStarted: true, animPaused: true,
    soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: true,
    earnedBadges: { first_step: true }, landingResult: result, landingAttempts: [
      { crashed: true, score: 0, grade: '\u2014', vVel: 5.4, hVel: 6.3, fuel: 12, fuelUnit: 's' }, result,
    ] } };
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ hasTouch: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function saved(page: Page) {
  return page.evaluate(() => {
    const data = JSON.parse(JSON.stringify((window as any).__toolData.moonMission));
    delete data.landingReviewIndex;
    return data;
  });
}
async function physicalState(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((canvas: HTMLCanvasElement) => ({
    time: canvas.dataset.descentElapsed, alt: canvas.dataset.descentAlt,
    v: canvas.dataset.descentVspeed, h: canvas.dataset.descentHspeed,
    fuel: canvas.dataset.descentFuel, mass: canvas.dataset.descentMass,
    thrust: canvas.dataset.descentThrust, x: canvas.dataset.descentX,
  }));
}
async function selected(page: Page, index: number) {
  const row = SAMPLES[index], last = index === SAMPLES.length - 1;
  const scrub = page.getByRole('slider', { name: 'Inspect recorded time', exact: true });
  await expect(scrub).toHaveValue(String(index));
  expect(await page.evaluate(() => (window as any).__toolData.moonMission.landingReviewIndex))
    .toBe(last ? null : index);
  await expect(scrub).toHaveAttribute('aria-valuetext',
    new RegExp(row.t.toFixed(1).replace('.', '\\.') + ' seconds, altitude ' + row.alt.toFixed(1).replace('.', '\\.') + ' metres'));
  await expect.poll(async () => {
    const value = await page.locator('[data-descent-canvas]').getAttribute('data-descent-review-time');
    return value == null || value === '' ? null : Number(value);
  }).toBe(last ? null : row.t);
  const display = page.locator('[data-landing-selected-sample]');
  await expect(display).toContainText(row.alt.toFixed(1) + ' m');
  await expect(display).toContainText('vertical ' + Math.abs(row.v).toFixed(1) + ' m/s');
  await expect(display).toContainText('drift ' + Math.abs(row.h).toFixed(1) + ' m/s');
  await expect(display).toContainText('throttle ' + Math.round(row.throttle * 100) + '%');
  await expect(display).toContainText('fuel ' + row.fuel.toFixed(1) + ' s');
  const text = (await display.innerText()).replace(/\s+/g, ' ');
  const vertical = row.v === 0 ? 'still' : row.v > 0 ? 'up' : 'down';
  const lateral = row.h === 0 ? 'still' : row.h > 0 ? 'right' : 'left';
  expect(text).toMatch(new RegExp('vertical[^\u00b7]*\\b' + vertical + '\\b', 'i'));
  expect(text).toMatch(new RegExp('drift[^\u00b7]*\\b' + lateral + '\\b', 'i'));
  const marks = await page.locator('[data-landing-plot]').evaluateAll(figures => figures.map(figure => {
    const area = figure.querySelector('[data-landing-plot-area]')!.getBoundingClientRect();
    return {
      label: figure.getAttribute('data-landing-plot'), area: { width: area.width, height: area.height },
      dots: Array.from(figure.querySelectorAll('[data-landing-plot-marker]')).map(dot => {
        const box = dot.getBoundingClientRect(), style = getComputedStyle(dot);
        return { label: dot.getAttribute('data-landing-plot-marker'), width: box.width, height: box.height,
          border: Number.parseFloat(style.borderTopWidth), radius: style.borderRadius,
          x: box.left + box.width / 2 - area.left, y: box.top + box.height / 2 - area.top };
      }),
      cursors: Array.from(figure.querySelectorAll('[data-landing-plot-cursor]')).map(cursor => ({
        x1: Number(cursor.getAttribute('x1')), x2: Number(cursor.getAttribute('x2')),
      })),
    };
  }));
  expect(marks).toHaveLength(2);
  for (const plot of marks) {
    expect(plot.dots).toHaveLength(plot.label === 'Altitude history' ? 1 : 2);
    expect(plot.cursors).toHaveLength(1);
    for (const dot of plot.dots) {
      expect(dot.width).toBeCloseTo(10, 2);
      expect(dot.height).toBeCloseTo(10, 2);
      expect(dot.border).toBe(2);
      expect(dot.radius).toBe('50%');
      expect(Math.abs(dot.x - row.t / 40 * plot.area.width)).toBeLessThanOrEqual(.05);
      const value = dot.label === 'Altitude' ? row.alt : dot.label === 'Downward speed' ? Math.max(0, -row.v) : Math.abs(row.h);
      const ceiling = dot.label === 'Altitude' ? 300 : 8;
      expect(Math.abs(dot.y - (1 - value / ceiling) * plot.area.height)).toBeLessThanOrEqual(.05);
    }
    expect(plot.cursors[0].x1).toBeCloseTo(row.t / 40 * 100, 2);
    expect(plot.cursors[0].x2).toBeCloseTo(row.t / 40 * 100, 2);
  }
  return { index, time: row.t, text, marks };
}
async function layout(page: Page) {
  const recorder = page.locator('[data-landing-recorder]');
  await expect(recorder.getByRole('img')).toHaveCount(2);
  const report = await recorder.evaluate(region => {
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const bounds = box(region);
    const plots = Array.from(region.querySelectorAll('[data-landing-plot]')).map(figure => {
      const text: any[] = [];
      const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest('svg') || !node.textContent?.trim()) continue;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) text.push({
          text: node.textContent.trim(), size: Number.parseFloat(style.fontSize),
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        });
      }
      const svg = figure.querySelector('svg')!;
      return { label: figure.getAttribute('data-landing-plot'), bounds: box(figure),
        area: box(figure.querySelector('[data-landing-plot-area]')!), svg: box(svg),
        viewBox: svg.getAttribute('viewBox'), svgText: svg.querySelectorAll('text').length, text,
        series: Array.from(svg.querySelectorAll('[data-landing-plot-series]')).map(path => ({
          label: path.getAttribute('data-landing-plot-series'), data: path.getAttribute('d'),
          effect: path.getAttribute('vector-effect') || getComputedStyle(path).vectorEffect,
        })),
        limits: Array.from(svg.querySelectorAll('line[stroke-dasharray]:not([data-landing-plot-cursor])')).map(line => ({
          effect: line.getAttribute('vector-effect') || getComputedStyle(line).vectorEffect,
          width: Number.parseFloat(getComputedStyle(line).strokeWidth), y: Number(line.getAttribute('y1')),
        })),
      };
    });
    return { bounds, plots, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      controls: Array.from(region.querySelectorAll('button, input')).map(box) };
  });
  expect(report.scrollWidth).toBeLessThanOrEqual(report.width + 1);
  expect(report.plots).toHaveLength(2);
  for (const plot of report.plots) {
    expect(plot.viewBox?.trim().split(/\s+/).map(Number)).toEqual([0, 0, 100, 100]);
    expect(plot.svgText).toBe(0);
    expect(plot.svg.height).toBeGreaterThanOrEqual(140);
    expect(plot.svg.height).toBeLessThanOrEqual(180);
    expect(plot.area.height).toBeGreaterThanOrEqual(140);
    expect(plot.text.length).toBeGreaterThanOrEqual(5);
    expect(plot.series).toHaveLength(plot.label === 'Altitude history' ? 1 : 2);
    for (const series of plot.series) {
      expect(series.effect).toBe('non-scaling-stroke');
      const points = series.data!.split(/[ML]/).filter(Boolean).map(pair => pair.split(',').map(Number));
      expect(points).toHaveLength(SAMPLES.length);
      for (let index = 0; index < SAMPLES.length; index++) {
        const row = SAMPLES[index];
        const value = series.label === 'Altitude' ? row.alt : series.label === 'Downward speed' ? Math.max(0, -row.v) : Math.abs(row.h);
        const ceiling = series.label === 'Altitude' ? 300 : 8;
        expect(points[index][0]).toBeCloseTo(row.t / 40 * 100, 3);
        expect(points[index][1]).toBeCloseTo((1 - value / ceiling) * 100, 3);
      }
    }
    for (const item of plot.text) {
      expect(item.size, item.text).toBeGreaterThanOrEqual(12);
      expect(item.left, item.text).toBeGreaterThanOrEqual(report.bounds.left - 1);
      expect(item.right, item.text).toBeLessThanOrEqual(report.bounds.right + 1);
      expect(item.top, item.text).toBeGreaterThanOrEqual(plot.bounds.top - 1);
      expect(item.bottom, item.text).toBeLessThanOrEqual(plot.bounds.bottom + 1);
    }
    if (plot.label === 'Speed history') {
      expect(plot.limits).toHaveLength(2);
      expect(plot.limits.map(line => line.y).sort((a, b) => a - b)).toEqual([37.5, 62.5]);
      for (const limit of plot.limits) {
        expect(limit.effect).toBe('non-scaling-stroke');
        expect(limit.width).toBeGreaterThanOrEqual(1);
        expect(limit.y).toBeGreaterThan(0);
        expect(limit.y).toBeLessThan(100);
      }
    }
  }
  for (const box of report.controls) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(report.width + 1);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  return report;
}
async function clickTime(page: Page, label: string, time: number, touch = false) {
  const area = page.locator('[data-landing-plot-area="' + label + '"]');
  await area.scrollIntoViewIfNeeded();
  const box = await area.boundingBox(); expect(box).not.toBeNull();
  const position = { x: Math.max(1, Math.min(box!.width - 1, box!.width * time / 40)), y: box!.height / 2 };
  if (touch) await page.touchscreen.tap(box!.x + position.x, box!.y + position.y);
  else await area.click({ position });
}
async function capture(page: Page, info: TestInfo, name: string, data: unknown) {
  await mkdir(REPORT, { recursive: true });
  const screenshot = join(REPORT, name + '.png'), state = join(REPORT, name + '.json');
  await page.locator('[data-landing-recorder]').screenshot({ path: screenshot });
  await writeFile(state, JSON.stringify(data, null, 2));
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
  await info.attach(name + '-state', { path: state, contentType: 'application/json' });
}

async function runRecorderWorkflow(page: Page, info: TestInfo, errors: string[],
  checkpoint: (event: string, detail?: unknown) => Promise<void>) {
  // Recorder behavior is independent of WebGL availability. Force the supported
  // 2D renderer so this workflow spends its work on visible chart interactions.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(PHONE);
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    Math.random = () => .999;
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(data);
  }, seed());
  const cv = page.locator('[data-descent-canvas]');
  await expect(cv).toHaveAttribute('data-descent-paused', 'true');
  await expect(cv).toHaveAttribute('data-descent-alt', '0');
  await expect(page.locator('[data-landing-attempts] tbody tr')).toHaveCount(2);
  const originalData = await saved(page), originalFlight = await physicalState(page);
  const preserved = async (label?: string) => {
    if (label) await checkpoint(label + ':saved:before');
    const currentData = await saved(page);
    if (label) await checkpoint(label + ':saved:after');
    expect(currentData).toEqual(originalData);
    if (label) await checkpoint(label + ':physical:before');
    const currentFlight = await physicalState(page);
    if (label) await checkpoint(label + ':physical:after', currentFlight);
    expect(currentFlight).toEqual(originalFlight);
  };
  const phoneLayout = await layout(page);
  await capture(page, info, 'phone-touchdown', { layout: phoneLayout, selected: await selected(page, 4) });

  await clickTime(page, 'Altitude history', 12, true);
  const neutral = await selected(page, 2); await preserved();
  await capture(page, info, 'phone-neutral-frame', { layout: await layout(page), selected: neutral });

  const scrub = page.getByRole('slider', { name: 'Inspect recorded time', exact: true });
  await scrub.focus(); await page.keyboard.press('Home'); await selected(page, 0);
  await page.keyboard.press('ArrowRight');
  const negativeDrift = await selected(page, 1); await preserved();
  await capture(page, info, 'phone-up-left-frame', { layout: await layout(page), selected: negativeDrift });
  await checkpoint('keyboard-end:before');
  await page.keyboard.press('End');
  await checkpoint('keyboard-end:after');
  await selected(page, 4);
  await checkpoint('keyboard-end:selected');
  await preserved('keyboard-end:preserved');
  await checkpoint('keyboard-end:preserved:after');

  await page.setViewportSize(DESKTOP);
  const desktopLayout = await layout(page);
  for (let index = 0; index < 2; index++)
    expect(desktopLayout.plots[index].svg.height).toBeCloseTo(phoneLayout.plots[index].svg.height, 1);
  await clickTime(page, 'Speed history', 30);
  const nearTouchdown = await selected(page, 3); await preserved();
  await capture(page, info, 'desktop-near-touchdown', { layout: desktopLayout, selected: nearTouchdown });
  await clickTime(page, 'Speed history', 40); await selected(page, 4); await preserved();
  await clickTime(page, 'Altitude history', 0); await selected(page, 0);
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await selected(page, 4); await preserved();
  await capture(page, info, 'desktop-touchdown', { layout: await layout(page), selected: await selected(page, 4) });

  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: 'Download flight CSV', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('moon-mission-descent.csv');
  const csvPath = join(REPORT, 'saved-landing.csv'); await download.saveAs(csvPath);
  const csv = await readFile(csvPath, 'utf8');
  const expected = ['time_s,altitude_m,vertical_velocity_m_s,lateral_velocity_m_s,hover_fuel_s,throttle_percent,tilt_deg,displacement_m',
    ...SAMPLES.map(row => [row.t, row.alt, row.v, row.h, row.fuel, row.throttle * 100, row.tilt * 180 / Math.PI, row.x]
      .map(value => value.toFixed(3)).join(','))].join('\n');
  expect(csv).toBe(expected);
  await preserved(); expect(errors).toEqual([]);
  await info.attach('flight-recording-csv', { path: csvPath, contentType: 'text/csv' });
}

test('responsive landing recorder keeps charts readable and selects actual recorded times without changing the flight', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = [], diagnostics: unknown[] = [];
  const started = Date.now(), diagnosticsPath = join(REPORT, 'recorder-diagnostics.json');
  let writing: Promise<void> = Promise.resolve();
  function checkpoint(event: string, detail?: unknown) {
    diagnostics.push({ event, elapsedMs: Date.now() - started, detail: detail ?? null });
    // Serialize writes so a crash event cannot overwrite a newer checkpoint.
    // Diagnostics must never replace the original test failure.
    writing = writing.then(async () => {
      await writeFile(diagnosticsPath, JSON.stringify({ errors, diagnostics }, null, 2));
    }).catch(() => {});
    return writing;
  }
  page.on('pageerror', error => {
    errors.push(error.message);
    void checkpoint('pageerror', { message: error.message, stack: error.stack });
  });
  page.on('crash', () => { void checkpoint('page-crash'); });
  await checkpoint('workflow:before');
  try {
    await runRecorderWorkflow(page, info, errors, checkpoint);
    await checkpoint('workflow:after');
  } catch (error) {
    const describe = (value: unknown) => value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack } : { message: String(value) };
    await checkpoint('workflow:failed', { error: describe(error), pageClosed: page.isClosed(), url: page.url() });
    // A blocked renderer may answer neither screenshots nor DOM reads. Bound
    // both evidence requests together to five seconds, then rethrow unchanged.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const probes = Promise.allSettled([
        page.screenshot({ path: join(REPORT, 'failure.png'), fullPage: false, timeout: 5000 }),
        page.locator('body').evaluate(body => ({
          text: body.textContent?.slice(0, 3000), active: document.activeElement?.tagName,
          canvasCount: document.querySelectorAll('[data-descent-canvas]').length,
          recorderCount: document.querySelectorAll('[data-landing-recorder]').length,
          sliderValue: (document.querySelector('[data-landing-scrub]') as HTMLInputElement | null)?.value,
          selected: document.querySelector('[data-landing-selected-sample]')?.textContent,
          savedReviewIndex: (window as any).__toolData?.moonMission?.landingReviewIndex,
        }), undefined, { timeout: 5000 }),
      ]).then(results => results.map((result, index) => result.status === 'fulfilled'
        ? { probe: index === 0 ? 'screenshot' : 'dom', status: result.status,
          value: index === 0 ? 'failure.png' : result.value }
        : { probe: index === 0 ? 'screenshot' : 'dom', status: result.status, error: describe(result.reason) }));
      const evidence = await Promise.race([probes, new Promise(resolve => {
        timer = setTimeout(() => resolve({ timedOut: true, timeoutMs: 5000 }), 5000);
      })]);
      await checkpoint('failure-evidence', evidence);
    } catch (diagnosticError) {
      await checkpoint('failure-evidence-error', describe(diagnosticError));
    } finally {
      if (timer) clearTimeout(timer);
    }
    throw error;
  }
});
