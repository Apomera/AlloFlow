import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_ENERGY_REPORT_DIR || 'reports/moon-mission-enhancement-pass22-2026-10-04/browser/energy');
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
  await expect(page.locator('[data-descent-energy]')).toHaveCount(1);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
}
async function open(page: Page) {
  await page.locator('[data-descent-energy] > summary').click(); await expect(page.locator('[data-descent-energy]')).toHaveAttribute('open', '');
}
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function receipts(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  const clip = await page.locator('[data-descent-energy]').evaluate((root: HTMLElement) => {
    const b = root.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  });
  expect(clip.width).toBeGreaterThan(0); expect(clip.height).toBeGreaterThan(0);
  await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-energy]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2)); expect(violations).toEqual([]);
}
async function recording(page: Page, coast = false) {
  return page.evaluate(coast => {
    const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
    const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
    for (let i = 0; i < 6000 && !s.contact; i++) {
      P.descentStep(s, !coast && s.elapsed >= 2 && s.elapsed < 6 ? { throttle: 1, left: true } : {}, 1 / 60); P.recordDescent(rec, s, !!s.contact);
    }
    if (!s.contact) throw Error('fixture must reach physical contact');
    return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel),
      fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  }, coast);
}
async function check(page: Page, mobile = false) {
  const result = await page.locator('[data-descent-energy]').evaluate((root: HTMLDetailsElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission, time = Number(root.dataset.descentEnergyTime);
    const recorded = root.dataset.descentEnergySourceKind === 'recorded';
    const row = recorded ? d.landingResult.recording.samples.find((r: any) => r.t === time) : null;
    const state = row ? { alt: row.alt, vVel: row.v, hVel: row.h, fuel: row.fuel, thrust: row.throttle, tilt: row.tilt,
      x: row.x, elapsed: row.t, contact: row.alt <= 0 } : (document.querySelector('[data-descent-canvas]') as any)._descentState();
    const model = P.descentEnergy(state, recorded ? d.landingResult.recording : null), geometry = P.descentEnergyGeometry(model);
    const range = Number(root.querySelector('[data-descent-energy-bars]')!.getAttribute('data-energy-range'));
    const bars = ['potential', 'verticalKinetic', 'lateralKinetic'].map(key => ({ key,
      x: Number(root.querySelector('[data-descent-energy-bar="' + key + '"]')!.getAttribute('x2')) }));
    const chart = root.querySelector('[data-descent-energy-chart]') as SVGSVGElement;
    const shown = !(root.querySelector('[data-descent-energy-history]') as HTMLElement).hidden;
    const axes: any[] = [], curves: any[] = [];
    if (shown) {
      const matrix = chart.getScreenCTM()!;
      for (let i = 0; i < 5; i++) {
        const node = root.querySelector('[data-descent-energy-ruler="time-' + i + '"]') as HTMLElement;
        if (getComputedStyle(node).display === 'none') continue;
        const b = node.getBoundingClientRect(), p = new DOMPoint(20 + 100 * i, 200).matrixTransform(matrix);
        axes.push({ value: Number(node.dataset.value), x: i === 0 ? b.left : i === 4 ? b.right : (b.left + b.right) / 2, expectedX: p.x });
      }
      for (let i = 0; i < 3; i++) {
        const node = root.querySelector('[data-descent-energy-ruler="value-' + i + '"]') as HTMLElement,
          b = node.getBoundingClientRect(), p = new DOMPoint(20, 20 + 90 * i).matrixTransform(matrix);
        axes.push({ value: Number(node.dataset.value), y: (b.top + b.bottom) / 2, expectedY: p.y });
      }
      for (const key of ['potential', 'verticalKinetic', 'lateralKinetic', 'total']) {
        const values = root.querySelector('[data-descent-energy-line="' + key + '"]')!.getAttribute('points')!.split(/\s+/).map(Number);
        const points = []; for (let i = 0; i < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
        curves.push({ key, points, dot: root.querySelector('[data-descent-energy-dot="' + key + '"]')!.getAttribute('d') });
      }
    }
    return { state, model, geometry, range, bars, shown, axes, curves,
      first: Number(chart.dataset.timeFirst), last: Number(chart.dataset.timeLast), points: Number(root.dataset.descentEnergyPoints) };
  });
  const s = result.state, e = result.model.current;
  expect(e.potential).toBeCloseTo(1.624 * 1737500 * s.alt / (1737500 + s.alt), 10);
  expect(e.verticalKinetic).toBe(s.vVel * s.vVel / 2); expect(e.lateralKinetic).toBe(s.hVel * s.hVel / 2);
  expect(e.total).toBe(e.potential + e.verticalKinetic + e.lateralKinetic);
  for (const bar of result.bars) expect(bar.x).toBeCloseTo(20 + e[bar.key] / result.range * 400, 10);
  if (result.shown) {
    expect(result.last).toBe(s.elapsed);
    expect(result.axes.filter(a => a.x !== undefined)).toHaveLength(mobile ? 3 : 5);
    for (const axis of result.axes) expect(Math.abs(axis.x !== undefined ? axis.x - axis.expectedX : axis.y - axis.expectedY)).toBeLessThan(1);
    for (const curve of result.curves) {
      expect(curve.points).toHaveLength(result.points);
      expect(curve.points.every(p => p.x >= 20 && p.x <= 420 && p.y >= 20 && p.y <= 200)).toBe(true);
      const end = curve.points[curve.points.length - 1]; expect(end.x).toBe(420);
      expect(end.y).toBeCloseTo(200 - e[curve.key] / result.range * 180, 10);
      if (result.model.history) {
        const expected = result.geometry.curves[curve.key]; expect(curve.points).toEqual(expected.points.map(p => ({ x: p.x, y: p.y })));
        expect(curve.dot).toBe(expected.dot);
      }
    }
  }
  return result;
}
test.describe('fallback flight energy', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
    };
  }));
  test('paused energy is measured, remains optional, and does not operate controls', async ({ page }, info) => {
    await mount(page); const root = page.locator('[data-descent-energy]'), before = await flight(page), saved = await receipts(page);
    await expect(root).not.toHaveAttribute('open', ''); await open(page); await expect(root).toHaveAttribute('data-descent-energy-available', 'true');
    await check(page); await expect(page.locator('[data-descent-energy-history]')).toBeHidden();
    await expect(page.locator('[data-descent-energy-value="power"]')).toHaveText('0.00 W/kg');
    await expect(page.locator('[data-descent-energy-status]')).toContainText('Coasting');
    await page.locator('[data-descent-throttle]').fill('90'); expect(await flight(page)).toEqual(before); expect(await receipts(page)).toEqual(saved);
    await expect(page.locator('[data-descent-energy-value="power"]')).toHaveText('0.00 W/kg');
    expect(await page.evaluate(() => Object.keys((window as any).__toolData.moonMission).filter(k => /descentEnergy/i.test(k)))).toEqual([]);
    await capture(page, info, 'paused-energy'); await axe(page, 'paused');
  });
  test('recorded energy shows conservative coasting, braking power, changing direction, contact and legacy omissions', async ({ page }, info) => {
    await mount(page); const coast = await recording(page, true); await mount(page, seed({ landingResult: coast }));
    await open(page); await expect(page.locator('[data-descent-energy]')).toHaveAttribute('data-descent-energy-contact', 'true');
    const conserved = await check(page); expect(Math.abs(conserved.model.history.delta)).toBeLessThan(.0001);
    await expect(page.locator('[data-descent-energy-value="power"]')).toHaveText('Not modelled at contact');
    await capture(page, info, 'coast-contact-energy');
    const powered = await recording(page); await mount(page, seed({ landingResult: powered, landingAttempts: [powered], landingReviewIndex: 6 }));
    const saved = await receipts(page); await open(page); await expect(page.locator('[data-descent-energy]')).toHaveAttribute('data-descent-energy-source-kind', 'recorded');
    const braking = await check(page); expect(braking.model.power.total).toBeLessThan(0);
    await expect(page.locator('[data-descent-energy-status]')).toContainText('removing mechanical energy');
    await capture(page, info, 'recorded-braking-energy'); await axe(page, 'desktop');
    await page.locator('[data-landing-scrub]').fill('12');
    await expect.poll(async () => Number(await page.locator('[data-descent-energy]').getAttribute('data-descent-energy-time'))).toBe(powered.recording.samples[12].t);
    const rising = await check(page); expect(rising.state.vVel).toBeGreaterThan(0); expect(rising.model.power.total).toBeGreaterThan(0);
    expect(rising.model.history.samples.every(p => p.time <= rising.state.elapsed)).toBe(true);
    await expect(page.locator('[data-descent-energy-status]')).toContainText('adding mechanical energy'); await capture(page, info, 'recorded-rising-energy');
    await page.locator('[data-landing-scrub]').fill('0'); await expect(page.locator('[data-descent-energy-history]')).toBeHidden();
    await expect(page.locator('[data-descent-energy-line="total"]')).toHaveAttribute('points', ''); await check(page);
    await capture(page, info, 'first-recorded-energy');
    await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
    await expect(page.locator('[data-descent-energy]')).toHaveAttribute('data-descent-energy-contact', 'true'); await check(page); expect(await receipts(page)).toEqual(saved);
    await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: 2, fuel: 70 } }));
    const legacy = await receipts(page); await open(page);
    await expect(page.locator('[data-descent-energy]')).toHaveAttribute('data-descent-energy-source-kind', 'unavailable');
    await expect(page.locator('[data-descent-energy-content]')).toBeHidden(); expect(await receipts(page)).toEqual(legacy);
    await capture(page, info, 'legacy-energy');
  });
  test('320 px energy supports keyboard operation, readable rulers and forced colors', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page); const result = await recording(page); await mount(page, seed({ landingResult: result, landingReviewIndex: 6 }));
    const before = await flight(page), saved = await receipts(page), summary = page.locator('[data-descent-energy] > summary');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-energy]')).toHaveAttribute('data-descent-energy-available', 'true');
    await check(page, true); expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const fonts = await page.locator('[data-descent-energy] p, [data-descent-energy] dl, [data-descent-energy] figcaption, [data-descent-energy-ruler]')
      .evaluateAll(nodes => nodes.map(n => parseFloat(getComputedStyle(n).fontSize)));
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); await capture(page, info, 'phone-energy-320'); await axe(page, 'phone');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await check(page, true);
    await expect(page.locator('[data-descent-energy-line="potential"]')).toHaveCSS('stroke-dasharray', 'none');
    await expect(page.locator('[data-descent-energy-line="verticalKinetic"]')).toHaveCSS('stroke-dasharray', '6px, 4px');
    await expect(page.locator('[data-descent-energy-line="lateralKinetic"]')).toHaveCSS('stroke-dasharray', '1px, 4px');
    await expect(page.locator('[data-descent-energy-line="total"]')).toHaveCSS('stroke-dasharray', '9px, 3px');
    await capture(page, info, 'phone-energy-forced'); await axe(page, 'phone-forced');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-energy]')).not.toHaveAttribute('open', '');
    expect(await flight(page)).toEqual(before); expect(await receipts(page)).toEqual(saved);
  });
});
test('live WebGL energy responds to actual engine force and motion and holds while paused', async ({ page }, info) => {
  await mount(page); await open(page); const saved = await receipts(page);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))?.draws || 0).toBeGreaterThan(0);
  await page.locator('[data-descent-throttle]').fill('65'); await page.locator('[data-descent-pause]').click();
  await page.locator('[data-descent-canvas]').focus(); await page.keyboard.down('d');
  await expect.poll(async () => (await flight(page)).elapsed).toBeGreaterThan(1.2);
  await page.locator('[data-descent-pause]').click(); await page.keyboard.up('d');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true'); const held = await flight(page);
  await expect.poll(async () => Number(await page.locator('[data-descent-energy]').getAttribute('data-descent-energy-time'))).toBe(held.elapsed);
  const measured = await check(page); expect(measured.points).toBeGreaterThan(2); expect(held.thrust).toBeGreaterThan(.6); expect(held.tilt).toBeGreaterThan(.3);
  const content = await page.locator('[data-descent-energy-content]').innerHTML(); await page.locator('[data-descent-throttle]').fill('90');
  await page.waitForTimeout(300); expect(await flight(page)).toEqual(held); expect(await page.locator('[data-descent-energy-content]').innerHTML()).toBe(content);
  expect(await receipts(page)).toEqual(saved); await capture(page, info, 'live-webgl-energy'); await axe(page, 'live');
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ contexts: await harness.glContexts(page),
    scene: await harness.glScene(page, '[data-descent-session]'), held, measured }, null, 2));
});
