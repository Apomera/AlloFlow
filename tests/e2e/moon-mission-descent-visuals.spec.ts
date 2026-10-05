import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_CHART_REPORT_DIR || 'reports/moon-mission-enhancement-pass18-2026-10-03/browser/charts');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true,
  descentPredictionOpen: true, animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42,
  landingRewarded: true, lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test.beforeEach(async ({ page }) => page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
    if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  };
}));
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
}
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function evidence(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  await page.locator('[data-descent-prediction]').screenshot({ path, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
  if (name === 'braking-close-view') {
    const chartPath = join(REPORT, 'braking-close-view-charts.png');
    await page.locator('[data-descent-prediction-plot]').screenshot({ path: chartPath, animations: 'disabled' });
    await info.attach('braking-charts', { path: chartPath, contentType: 'image/png' });
  }
}
async function inspect(page: Page) {
  return page.locator('[data-descent-prediction]').evaluate((root: HTMLElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const cv = document.querySelector('[data-descent-canvas]') as any, recorded = root.dataset.descentPredictionSource === 'recorded';
    const t = Number(root.dataset.descentPredictionTime);
    const r = recorded ? d.landingResult.recording.samples.find((row: any) => Math.abs(row.t - t) < 1e-6) : null;
    const state = r ? { alt: r.alt, vVel: r.v, hVel: r.h, fuel: r.fuel, thrust: r.throttle, tilt: r.tilt,
      x: r.x, elapsed: r.t, contact: r.alt <= 0 } : cv._descentState();
    const commands = { throttle: Number(root.dataset.descentPredictionThrottle),
      left: root.dataset.descentPredictionTilt === 'left', right: root.dataset.descentPredictionTilt === 'right' };
    const p = P.descentPredictionProfile(state, commands), v = P.descentPredictionVisuals(p);
    return { p, v };
  });
}
async function charts(page: Page) {
  const { p, v } = await inspect(page), root = page.locator('[data-descent-prediction]');
  await expect(root).toHaveAttribute('data-descent-prediction-detail-available', v.detail ? 'true' : 'false');
  await expect(page.locator('[data-descent-prediction-detail]')).toHaveCount(1);
  for (const name of ['main', 'detail'] as const) {
    const frame = v[name]; if (!frame) continue;
    const svg = root.locator(name === 'main' ? '[data-descent-prediction-diagram]' : '[data-descent-prediction-detail-diagram]');
    const matrix = await svg.evaluate((el: SVGSVGElement) => { const m = el.getScreenCTM()!; return { a: m.a, b: m.b, c: m.c, d: m.d }; });
    expect(matrix.a).toBeCloseTo(matrix.d, 8); expect(matrix.b).toBe(0); expect(matrix.c).toBe(0);
    expect(Number(await svg.getAttribute('data-metre-scale'))).toBeCloseTo(frame.scale, 9);
    expect(Number(await svg.getAttribute('data-altitude-min'))).toBeCloseTo(frame.minAltitude, 8);
    expect(Number(await svg.getAttribute('data-altitude-max'))).toBeCloseTo(frame.maxAltitude, 8);
    await expect(svg.locator('[data-descent-visual-viewport]')).toHaveCSS('overflow', 'hidden');
    for (const key of ['held', 'burn'] as const) {
      const endpoint = svg.locator('[data-descent-visual-end="' + key + '"]');
      await expect(endpoint).toHaveAttribute('data-endpoint', p[key].summary.kind);
      expect(Number(await endpoint.getAttribute('cx'))).toBeCloseTo(frame[key + 'End'].x, 8);
      expect(Number(await endpoint.getAttribute('cy'))).toBeCloseTo(frame[key + 'End'].y, 8);
      if (!frame[key + 'EndVisible']) await expect(endpoint).toBeHidden();
      const times = await svg.locator('[data-descent-visual-time="' + key + '"]').evaluateAll(nodes => nodes
        .filter(node => getComputedStyle(node).display !== 'none').map(node => Number(node.getAttribute('data-time'))));
      expect(times).toEqual(frame[key + 'Marks'].filter((dot: any) => dot.visible).map((dot: any) => dot.time));
    }
  }
  return { p, v };
}
async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-prediction]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2));
  expect(violations).toEqual([]);
}

test('desktop surface and braking close views keep exact geometry, timing and paused controls', async ({ page }, info) => {
  await mount(page); const before = await flight(page), receipt = await evidence(page);
  const first = await charts(page); expect(first.v.zoom).toBeGreaterThan(10);
  const main = await page.locator('[data-descent-prediction-diagram]').boundingBox(), detail = await page.locator('[data-descent-prediction-detail-diagram]').boundingBox();
  expect(detail!.x).toBeGreaterThan(main!.x + main!.width); expect(detail!.y).toBeCloseTo(main!.y, 0);
  await expect(page.locator('[data-descent-prediction-detail-context]')).toContainText('surface at 0 m is outside');
  await capture(page, info, 'coast-comparison');
  await page.locator('[data-descent-throttle]').fill('65');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-throttle', '0.65');
  const braking = await charts(page); expect(braking.p.held.summary.kind).toBe('arrest');
  expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  await capture(page, info, 'braking-close-view'); await axe(page, 'desktop');
});

test('recorded close view preserves receipts and clears cropped markers at terminal contact', async ({ page }, info) => {
  await mount(page);
  const result = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
    const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
    for (let i = 0; i < 3000 && !s.contact; i++) { P.descentStep(s, {}, 1 / 60); P.recordDescent(rec, s, !!s.contact); }
    return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  });
  await mount(page, seed({ landingResult: result, landingAttempts: [result] })); const receipt = await evidence(page);
  await page.locator('[data-landing-scrub]').fill('10');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-source', 'recorded');
  await expect.poll(async () => Number(await page.locator('[data-descent-prediction]').getAttribute('data-descent-prediction-time'))).toBeCloseTo(result.recording.samples[10].t, 8);
  await charts(page); await expect(page.locator('[data-descent-prediction-command="held"]')).toContainText('hypothetical future command');
  await capture(page, info, 'recorded-braking');
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  const terminal = await charts(page); expect(terminal.v.detail).toBeNull();
  await expect(page.locator('[data-descent-prediction-detail]')).toBeHidden();
  expect(await evidence(page)).toEqual(receipt); await capture(page, info, 'contact-markers');
});

test('320 px stacked charts stay readable with keyboard, reduced motion and forced colors', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page); const before = await flight(page), receipt = await evidence(page);
  await charts(page); const toggle = page.locator('[data-descent-prediction-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await charts(page);
  const sizes = await page.locator('[data-descent-prediction] p, [data-descent-prediction] dl, [data-descent-prediction] figcaption')
    .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const main = await page.locator('[data-descent-prediction-diagram]').boundingBox(), detail = await page.locator('[data-descent-prediction-detail-diagram]').boundingBox();
  expect(detail!.y).toBeGreaterThan(main!.y + main!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await axe(page, 'phone'); await capture(page, info, 'phone-320');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await charts(page);
  await expect(page.locator('[data-descent-prediction-path="burn"]')).toHaveCSS('stroke-dasharray', '7px, 5px');
  await expect(page.locator('[data-descent-prediction-path="held"]')).toHaveCSS('stroke-dasharray', 'none');
  await expect(page.locator('[data-descent-prediction-path="held"]')).toHaveCSS('animation-name', 'none');
  await axe(page, 'phone-forced'); await capture(page, info, 'phone-forced-colors');
  expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
});
