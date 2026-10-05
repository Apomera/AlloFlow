import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_PREDICTION_REPORT_DIR || 'reports/moon-mission-enhancement-pass17-2026-10-02/browser/predictions');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 5, descentStarted: true, descentPredictionOpen: false, animPaused: true, soundOff: true,
  missionXP: 42, landingRewarded: true, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true }, ...extra,
} });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, data = seed(), legacy = false) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-descent-prediction-toggle]')).toBeVisible();
  await expect(page.locator('[data-flight-value="mass"]')).toContainText(legacy ? 'Not recorded' : 'kg');
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function evidence(page: Page) {
  const d = await saved(page);
  return Object.fromEntries(['missionXP', 'landingResult', 'landingAttempts', 'landingRewarded', 'descentStart', 'descentMode']
    .map(key => [key, d[key] ?? null]));
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-descent-prediction]').screenshot({ path, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function expected(page: Page, recordedIndex?: number) {
  return page.evaluate(index => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    let state: any, commands: any;
    if (index !== undefined) {
      const r = d.landingResult.recording.samples[index];
      state = { alt: r.alt, vVel: r.v, hVel: r.h, fuel: r.fuel, thrust: r.throttle, tilt: r.tilt,
        x: r.x, elapsed: r.t, contact: r.alt <= 0 };
      commands = { throttle: r.throttle, left: false, right: false };
    } else {
      state = (document.querySelector('[data-descent-canvas]') as any)._descentState();
      const root = document.querySelector('[data-descent-prediction]') as HTMLElement;
      commands = { throttle: Number(root.dataset.descentPredictionThrottle),
        left: root.dataset.descentPredictionTilt === 'left', right: root.dataset.descentPredictionTilt === 'right' };
    }
    const profile = P.descentPredictionProfile(state, commands);
    return { profile, geometry: P.descentPredictionGeometry(profile) };
  }, recordedIndex);
}
async function fallback(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
    };
  });
}
async function readings(page: Page, recordedIndex?: number) {
  const { profile: p, geometry: g } = await expected(page, recordedIndex);
  const root = page.locator('[data-descent-prediction]');
  expect(Number(await root.getAttribute('data-descent-prediction-time'))).toBeCloseTo(p.initial.elapsed, 8);
  const svg = root.locator('[data-descent-prediction-diagram]');
  await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  const matrix = await svg.evaluate((el: SVGSVGElement) => { const m = el.getScreenCTM()!; return { a: m.a, d: m.d, b: m.b, c: m.c }; });
  expect(matrix.a).toBeCloseTo(matrix.d, 8); expect(matrix.b).toBe(0); expect(matrix.c).toBe(0);
  expect(Number(await svg.getAttribute('data-metre-scale'))).toBeCloseTo(g.scale, 9);
  for (const key of ['held', 'burn'] as const) {
    const s = p[key].summary, end = root.locator('[data-descent-prediction-end="' + key + '"]');
    await expect(root.locator('[data-descent-prediction-value="' + key + '-time"]')).toHaveText(s.time.toFixed(2) + ' s');
    await expect(root.locator('[data-descent-prediction-value="' + key + '-altitude"]')).toHaveText(s.altitude.toFixed(1) + ' m');
    await expect(root.locator('[data-descent-prediction-value="' + key + '-propellant"]')).toHaveText(s.propellantUsed.toFixed(2) + ' kg');
    await expect(root.locator('[data-descent-prediction-value="' + key + '-fuel"]')).toHaveText(s.fuelRemaining.toFixed(2) + ' hover s');
    await expect(end).toHaveAttribute('data-endpoint', s.kind);
    expect(Number(await end.getAttribute('cx'))).toBeCloseTo(g[key + 'End'].x, 8);
    expect(Number(await end.getAttribute('cy'))).toBeCloseTo(g[key + 'End'].y, 8);
    const points = (await root.locator('[data-descent-prediction-path="' + key + '"]').getAttribute('points'))!
      .split(' ').map(pair => pair.split(',').map(Number));
    expect(points).toHaveLength(p[key].samples.length);
    expect(points.every(point => point.length === 2 && point.every(Number.isFinite))).toBe(true);
  }
  return p;
}

test('paused control comparisons are numerical, update immediately, and persist only the panel preference', async ({ page }, info) => {
  await fallback(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(page.locator('[data-descent-prediction-panel]')).toHaveCount(0);
  const original = await flight(page), receipt = await evidence(page);
  await page.locator('[data-descent-prediction-toggle]').click();
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  const first = await readings(page);
  expect(first.held.summary.kind).toBe('contact'); expect(first.burn.summary.kind).toBe('arrest');
  await page.locator('[data-descent-throttle]').fill('65');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-throttle', '0.65');
  const higher = await readings(page); expect(higher.held.summary.kind).toBe('arrest');
  const cv = page.locator('[data-descent-canvas]'); await cv.focus(); await page.keyboard.down('a');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-tilt', 'left');
  const tilted = await readings(page); expect(tilted.held.summary.lateral).toBeLessThan(higher.held.summary.lateral);
  await page.keyboard.up('a'); await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-tilt', 'center');
  expect(await flight(page)).toEqual(original); expect(await evidence(page)).toEqual(receipt);
  await capture(page, info, 'prediction-paused-controls');
  await page.locator('[data-descent-prediction-toggle]').click();
  await expect(page.locator('[data-descent-prediction-panel]')).toHaveCount(0);
  await page.locator('[data-descent-prediction-toggle]').click(); await readings(page);
  const d = await saved(page); await mount(page, { moonMission: { ...d, animPaused: true } });
  await expect(page.locator('[data-descent-prediction-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  expect(await evidence(page)).toEqual(receipt); expect(errors).toEqual([]);
});

test('active prediction clocks follow the flight and leave the original impact and once-only outcome intact', async ({ page }, info) => {
  await mount(page, seed({ descentPredictionOpen: true }));
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  const projection = await readings(page), before = await evidence(page);
  await page.locator('[data-descent-pause]').click();
  await expect.poll(async () => Number(await page.locator('[data-descent-prediction]').getAttribute('data-descent-prediction-time'))).toBeGreaterThan(.5);
  await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 90000 });
  const d = await saved(page), last = d.landingResult.recording.samples.at(-1);
  expect(d.landingAttempts).toHaveLength(1); expect(d.missionXP).toBe(before.missionXP);
  expect(last.t).toBeCloseTo(projection.held.summary.time, 3);
  expect(d.landingResult.vVel).toBeCloseTo(Math.abs(projection.held.summary.vertical), 5);
  await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  const after = await evidence(page);
  await page.locator('[data-descent-prediction-toggle]').click(); await page.locator('[data-descent-prediction-toggle]').click();
  await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  expect(await evidence(page)).toEqual(after);
  await capture(page, info, 'prediction-actual-contact');
});

test('recorded sample projections preserve the landing receipt and omit missing legacy measurements', async ({ page }, info) => {
  await fallback(page);
  await mount(page);
  const receipt = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const s = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
    const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
    for (let i = 0; i < 3000 && !(s as any).contact; i++) { P.descentStep(s, {}, 1 / 60); P.recordDescent(rec, s, !!(s as any).contact); }
    return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel),
      fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  });
  await mount(page, seed({ landingResult: receipt, landingAttempts: [receipt], descentPredictionOpen: true }));
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-source', 'recorded');
  const before = await evidence(page), rows = receipt.recording.samples, index = Math.floor(rows.length / 3);
  await page.locator('[data-landing-scrub]').fill(String(index));
  await expect.poll(async () => Number(await page.locator('[data-descent-prediction]').getAttribute('data-descent-prediction-time'))).toBeCloseTo(rows[index].t, 8);
  await readings(page, index);
  await expect(page.locator('[data-descent-prediction-label="held"]')).toHaveText('Hold inspected throttle, center tilt');
  await expect(page.locator('[data-descent-prediction-command="held"]')).toContainText('hypothetical future command');
  expect(await evidence(page)).toEqual(before); await capture(page, info, 'prediction-recorded-sample');
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  expect(await evidence(page)).toEqual(before);
  const legacy = { crashed: false, score: 84, grade: 'B', vVel: 1.5, hVel: 2, fuel: 70 };
  await mount(page, seed({ landingResult: legacy, landingAttempts: [legacy], descentPredictionOpen: true }), true);
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'false');
  await expect(page.locator('[data-descent-prediction-status]')).toHaveText('No forecast is calculated.');
  await expect(page.locator('[data-descent-prediction-plot]')).toBeHidden();
  expect((await saved(page)).landingResult).toMatchObject(legacy); expect((await saved(page)).missionXP).toBe(42);
  await capture(page, info, 'prediction-legacy-measurements');
});

test('320 px keyboard controls and equal-axis paths remain accessible in the fallback view', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await fallback(page);
  await mount(page); const before = await flight(page), receipt = await evidence(page), toggle = page.locator('[data-descent-prediction-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  await readings(page);
  const box = await toggle.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  const fonts = await page.locator('[data-descent-prediction] p, [data-descent-prediction] dl, [data-descent-prediction] h5')
    .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-prediction]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  expect(violations).toEqual([]); expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  await capture(page, info, 'prediction-phone-320');
  await writeFile(join(REPORT, 'phone-axe.json'), JSON.stringify({ violations, box, fonts }, null, 2));
});
