import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_HISTORY_REPORT_DIR || 'reports/moon-mission-enhancement-pass21-2026-10-03/browser/history');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true,
  descentPredictionOpen: false, animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42,
  landingRewarded: true, lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-descent-history]')).toHaveCount(1);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
}
async function open(page: Page) {
  await page.locator('[data-descent-history] > summary').click(); await expect(page.locator('[data-descent-history]')).toHaveAttribute('open', '');
}
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function receipts(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  const clip = await page.locator('[data-descent-history]').evaluate((root: HTMLElement) => {
    const b = root.getBoundingClientRect();
    return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  });
  expect(clip.width).toBeGreaterThan(0); expect(clip.height).toBeGreaterThan(0);
  await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-history]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2)); expect(violations).toEqual([]);
}
async function recording(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
    const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
    for (let i = 0; i < 6000 && !s.contact; i++) {
      P.descentStep(s, s.elapsed >= 2 && s.elapsed < 6 ? { throttle: 1, left: true } : {}, 1 / 60); P.recordDescent(rec, s, !!s.contact);
    }
    if (!s.contact) throw Error('fixture must reach physical contact');
    return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel),
      fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  });
}
async function check(page: Page, mobile = false) {
  const result = await page.locator('[data-descent-history]').evaluate((root: HTMLDetailsElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission, time = Number(root.dataset.descentHistoryTime);
    const recorded = root.dataset.descentHistorySourceKind === 'recorded';
    const row = recorded ? d.landingResult.recording.samples.find((r: any) => r.t === time) : null;
    const state = row ? { alt: row.alt, vVel: row.v, hVel: row.h, fuel: row.fuel, thrust: row.throttle, tilt: row.tilt,
      x: row.x, elapsed: row.t, contact: row.alt <= 0 } : (document.querySelector('[data-descent-canvas]') as any)._descentState();
    const geometry = row ? P.descentHistoryGeometry(P.descentHistory(state, d.landingResult.recording)) : null;
    const charts: any[] = [];
    for (const name of ['velocity', 'throttle', 'tilt']) {
      const svg = root.querySelector('[data-descent-history-chart="' + name + '"]') as SVGSVGElement, m = svg.getScreenCTM()!;
      const plot = geometry ? geometry[name] : null;
      const axes = [];
      for (let i = 0; i < 5; i++) {
        const node = root.querySelector('[data-descent-history-ruler="' + name + '-time-' + i + '"]') as HTMLElement;
        if (getComputedStyle(node).display === 'none') continue;
        const b = node.getBoundingClientRect(), point = new DOMPoint(20 + 100 * i, 200).matrixTransform(m);
        axes.push({ i, value: Number(node.dataset.value), x: i === 0 ? b.left : i === 4 ? b.right : (b.left + b.right) / 2,
          expectedX: point.x, expectedValue: geometry?.timeTicks[i].value });
      }
      for (let i = 0; i < 3; i++) {
        const node = root.querySelector('[data-descent-history-ruler="' + name + '-value-' + i + '"]') as HTMLElement,
          b = node.getBoundingClientRect(), point = new DOMPoint(20, 20 + 90 * i).matrixTransform(m);
        axes.push({ i, value: Number(node.dataset.value), y: (b.top + b.bottom) / 2, expectedY: point.y, expectedValue: plot?.ticks[i].value });
      }
      const paths = (name === 'velocity' ? ['vertical', 'lateral'] : [name]).map(key => {
        const node = root.querySelector('[data-descent-history-path="' + key + '"]')!, numbers = node.getAttribute('points')!.split(/\s+/).map(Number);
        const points = []; for (let i = 0; i < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] });
        return { key, points, expected: plot?.curves[key].points,
          marker: root.querySelector('[data-descent-history-marker="' + key + '"]')!.getAttribute('d'), expectedMarker: plot?.curves[key].dot };
      });
      charts.push({ name, first: Number(svg.dataset.timeFirst), last: Number(svg.dataset.timeLast), min: Number(svg.dataset.valueMin), max: Number(svg.dataset.valueMax), axes, paths });
    }
    return { state, geometry, charts, rootTime: time, points: Number(root.dataset.descentHistoryPoints) };
  });
  expect(result.rootTime).toBe(result.state.elapsed);
  for (const chart of result.charts) {
    expect(chart.last).toBe(result.state.elapsed);
    for (const axis of chart.axes) {
      if (axis.x !== undefined) expect(Math.abs(axis.x - axis.expectedX)).toBeLessThan(1);
      else expect(Math.abs(axis.y - axis.expectedY)).toBeLessThan(1);
      if (result.geometry) expect(axis.value).toBeCloseTo(axis.expectedValue, 9);
    }
    expect(chart.axes.filter(a => a.x !== undefined)).toHaveLength(mobile ? 3 : 5);
    for (const curve of chart.paths) {
      expect(curve.points).toHaveLength(result.points);
      expect(curve.points.every(p => p.x >= 20 && p.x <= 420 && p.y >= 20 && p.y <= 200)).toBe(true);
      if (result.geometry) { expect(curve.points).toEqual(curve.expected!.map(p => ({ x: p.x, y: p.y }))); expect(curve.marker).toBe(curve.expectedMarker); }
      else {
        const end = curve.points[curve.points.length - 1], s = result.state;
        const value = curve.key === 'vertical' ? s.vVel : curve.key === 'lateral' ? s.hVel : curve.key === 'throttle' ? (s.fuel > 0 ? s.thrust * 100 : 0) : s.tilt * 180 / Math.PI;
        expect(end.x).toBe(420); expect(end.y).toBeCloseTo(200 - (value - chart.min) / (chart.max - chart.min) * 180, 10);
      }
    }
  }
  return result;
}

test.describe('fallback measured flight history', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
    };
  }));

  test('paused startup waits for measured history and does not operate or save controls', async ({ page }, info) => {
    await mount(page); const before = await flight(page), saved = await receipts(page), root = page.locator('[data-descent-history]');
    await expect(root).not.toHaveAttribute('open', ''); await open(page);
    await expect(root).toHaveAttribute('data-descent-history-available', 'false');
    await expect(page.locator('[data-descent-history-source-label]')).toContainText('Waiting for a second measured state');
    await expect(page.locator('[data-descent-history-content]')).toBeHidden();
    await page.locator('[data-descent-throttle]').fill('80'); expect(await flight(page)).toEqual(before); expect(await receipts(page)).toEqual(saved);
    expect(await page.evaluate(() => Object.keys((window as any).__toolData.moonMission).filter(k => /descentHistory/i.test(k)))).toEqual([]);
    await capture(page, info, 'paused-start'); await axe(page, 'paused-start');
  });

  test('signed recorded history ends at inspection, follows scrubbing and preserves contact and legacy receipts', async ({ page }, info) => {
    await mount(page); const result = await recording(page); await mount(page, seed({ landingResult: result, landingAttempts: [result] }));
    const saved = await receipts(page); await open(page); await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-available', 'true');
    await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-contact', 'true');
    await check(page); await capture(page, info, 'recorded-contact');
    await page.locator('[data-landing-scrub]').fill('12');
    await expect.poll(async () => Number(await page.locator('[data-descent-history]').getAttribute('data-descent-history-time'))).toBe(result.recording.samples[12].t);
    const burn = await check(page); expect(burn.state.vVel).toBeGreaterThan(0); expect(burn.state.hVel).toBeLessThan(0);
    expect(burn.geometry!.history.samples.every((p: any) => p.time <= burn.state.elapsed)).toBe(true);
    await expect(page.locator('[data-descent-history-value="vertical"]')).toContainText('up'); await expect(page.locator('[data-descent-history-value="lateral"]')).toContainText('left');
    await capture(page, info, 'recorded-direction-change'); await axe(page, 'desktop');
    await page.locator('[data-landing-scrub]').fill('0');
    await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-available', 'false');
    await expect(page.locator('[data-descent-history-source-label]')).toContainText('first recorded sample');
    await expect(page.locator('[data-descent-history-path="vertical"]')).toHaveAttribute('points', '');
    await capture(page, info, 'first-recorded-sample');
    await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
    await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-contact', 'true'); await check(page); expect(await receipts(page)).toEqual(saved);
    await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: 2, fuel: 70 } }));
    const legacy = await receipts(page); await open(page);
    await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-source-kind', 'unavailable');
    await expect(page.locator('[data-descent-history-content]')).toBeHidden();
    await expect(page.locator('[data-descent-history-source-label]')).toContainText('no measured flight recording');
    expect(await receipts(page)).toEqual(legacy); await capture(page, info, 'legacy-no-history');
  });

  test('320 px history keeps HTML rulers aligned with keyboard, reduced motion and forced colors', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page); const result = await recording(page); await mount(page, seed({ landingResult: result, landingReviewIndex: 12 }));
    const before = await flight(page), saved = await receipts(page), summary = page.locator('[data-descent-history] > summary');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-history]')).toHaveAttribute('data-descent-history-available', 'true');
    await check(page, true); expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const fonts = await page.locator('[data-descent-history] p, [data-descent-history] dl, [data-descent-history] figcaption, [data-descent-history-ruler]')
      .evaluateAll(nodes => nodes.map(n => parseFloat(getComputedStyle(n).fontSize)));
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const charts = await page.locator('[data-descent-history-chart]').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().height)); expect(Math.min(...charts)).toBe(150);
    await capture(page, info, 'phone-320'); await axe(page, 'phone');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await check(page, true);
    await expect(page.locator('[data-descent-history-path="lateral"]')).toHaveCSS('stroke-dasharray', '6px, 4px');
    await expect(page.locator('[data-descent-history-path="vertical"]')).toHaveCSS('stroke-dasharray', 'none');
    await capture(page, info, 'phone-forced-colors'); await axe(page, 'phone-forced');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-history]')).not.toHaveAttribute('open', '');
    expect(await flight(page)).toEqual(before); expect(await receipts(page)).toEqual(saved);
  });
});

test('live WebGL history samples actual motion and engine response, then holds during inspection', async ({ page }, info) => {
  await mount(page); await open(page); const saved = await receipts(page);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))?.draws || 0).toBeGreaterThan(0);
  await page.locator('[data-descent-throttle]').fill('65'); await page.locator('[data-descent-pause]').click();
  await page.locator('[data-descent-canvas]').focus(); await page.keyboard.down('d');
  await expect.poll(async () => (await flight(page)).elapsed).toBeGreaterThan(1.2);
  await page.locator('[data-descent-pause]').click(); await page.keyboard.up('d');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true'); const held = await flight(page);
  await expect.poll(async () => Number(await page.locator('[data-descent-history]').getAttribute('data-descent-history-time'))).toBe(held.elapsed);
  const measured = await check(page); expect(measured.points).toBeGreaterThan(2); expect(held.thrust).toBeGreaterThan(.6); expect(held.tilt).toBeGreaterThan(.3);
  const content = await page.locator('[data-descent-history-content]').innerHTML(); await page.locator('[data-descent-throttle]').fill('90');
  await page.waitForTimeout(300); expect(await flight(page)).toEqual(held); expect(await page.locator('[data-descent-history-content]').innerHTML()).toBe(content);
  expect(await receipts(page)).toEqual(saved); await capture(page, info, 'live-webgl-history'); await axe(page, 'live');
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ contexts: await harness.glContexts(page),
    scene: await harness.glScene(page, '[data-descent-session]'), held, measured }, null, 2));
});
