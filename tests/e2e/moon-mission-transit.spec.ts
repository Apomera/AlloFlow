import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve('reports/moon-mission-enhancement-pass7-2026-09-29/transit');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 3, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
  earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra } });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  const canvas = data.moonMission.missionPhase === 5 ? '[data-descent-canvas]' : '[data-transit-canvas]';
  await expect(page.locator(canvas)).toBeVisible();
  await expect.poll(async () => page.locator(canvas).getAttribute(data.moonMission.missionPhase === 5 ? 'data-descent-fuel' : 'data-transit-time')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function transit(page: Page) {
  return page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.transitTime),
    earthDistance: Number(cv.dataset.transitEarthDistance), moonDistance: Number(cv.dataset.transitMoonDistance),
    earthSpeed: Number(cv.dataset.transitEarthSpeed), moonSpeed: Number(cv.dataset.transitMoonSpeed), mass: Number(cv.dataset.transitMass),
    propellant: Number(cv.dataset.transitPropellant), thrust: Number(cv.dataset.transitThrust), engine: cv.dataset.transitEngine, plume: cv.dataset.transitPlume }));
}
async function profile(page: Page) {
  return page.evaluate(() => { const P = (window as any).MoonMissionPure, plan = P.cleanTransitPlayback((window as any).__toolData.moonMission).transitPlan;
    const p = P.transitProfile(plan); return { plan, summary: p.summary, events: p.events, first: p.samples[0] }; });
}
async function sample(page: Page, time: number) {
  return page.evaluate(seconds => { const P = (window as any).MoonMissionPure;
    return P.transitSample(P.transitProfile(P.cleanTransitPlayback((window as any).__toolData.moonMission).transitPlan), seconds); }, time);
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-transit-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await transit(page)).time - time)).toBeLessThan(0.11); return time;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
}
async function painted(page: Page) {
  await expect.poll(async () => page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; let opaque = 0, total = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) { const i = (y * cv.width + x) * 4; total++;
      if (data[i + 3] > 100) opaque++; colors.add(Array.from(data.slice(i, i + 3)).join(',')); }
    return opaque / total > 0.9 && colors.size > 12;
  }), { message: 'transit must remain painted when paused or resized' }).toBe(true);
}
async function accessible(page: Page, info: TestInfo) {
  const axePath = resolve('node_modules/axe-core/axe.min.js'); if (!existsSync(axePath)) return;
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => { const result = await (window as any).axe.run({ include: [['[data-transit-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description, targets: item.nodes.flatMap((node: any) => node.target) })); });
  await info.attach('transit-accessibility', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));

test('moving-Moon coast readouts follow position and separately named speed frames', async ({ page }, info) => {
  await mount(page); await expect(page.locator('[data-transit-proceed]')).toBeDisabled();
  await capture(page, info, 'transit-departure');
  const p = await profile(page), time = await seek(page, 36 * 3600), live = await transit(page), expected = await sample(page, time);
  for (const field of ['earthDistance', 'moonDistance', 'earthSpeed', 'moonSpeed', 'mass', 'propellant', 'thrust'] as const) expect(live[field]).toBeCloseTo(expected[field], 6);
  expect(live.earthDistance).toBeCloseTo(Math.hypot(expected.x, expected.y), 6);
  expect(live.moonDistance).toBeCloseTo(Math.hypot(expected.x - expected.moonX, expected.y - expected.moonY), 6);
  expect(live.moonSpeed).toBeCloseTo(Math.hypot(expected.vx - expected.moonVx, expected.vy - expected.moonVy), 6);
  expect(Math.hypot(expected.moonX - p.first.moonX, expected.moonY - p.first.moonY)).toBeGreaterThan(1e7);
  expect(Math.abs(live.earthSpeed - live.moonSpeed)).toBeGreaterThan(10);
  expect(live.engine).toBe('off'); expect(live.plume).toBe('off'); expect(live.thrust).toBe(0); expect(live.propellant).toBe(p.first.propellant);
  await expect(page.locator('[data-transit-readouts]')).toContainText('Earth-relative speed');
  await expect(page.locator('[data-transit-readouts]')).toContainText('Moon-relative speed');
  await expect(page.locator('[data-transit-plan-note]')).toContainText('separate arrival and mass preset');
  await painted(page); await capture(page, info, 'transit-system-coast');
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  const end = await saved(page); expect(end.transitRun.recorded).toBe(true); expect(end.transitResult.outcome).toBe('encounter'); expect(end.missionXP).toBe(0);
  expect((await transit(page)).time).toBeCloseTo(p.summary.duration, 6);
  await page.locator('[data-transit-view]').selectOption('moon'); await painted(page); await capture(page, info, 'transit-nominal-encounter');
});

test('a speed error misses the corridor and a finite correction spends SPS fuel to restore encounter', async ({ page }, info) => {
  await mount(page); await page.locator('[data-transit-preset="error"]').click(); await page.locator('[data-transit-result]').click();
  await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); const missed = await saved(page);
  expect(missed.transitResult.outcome).not.toBe('encounter'); expect(missed.transitResult.propellantUsed).toBe(0);
  await page.locator('[data-transit-view]').selectOption('moon'); await capture(page, info, 'transit-speed-error');
  await page.locator('[data-transit-preset="corrected"]').click();
  const reset = await saved(page); expect(reset.transitResult).toBeNull(); expect(reset.transitRun).toEqual({ version: 1, time: 0, recorded: false }); expect(reset.transitPaused).toBe(true);
  await page.locator('[data-transit-milestone="burn"]').click(); await expect(page.locator('[data-transit-rate]')).toHaveValue('1');
  const burn = await transit(page), expected = await sample(page, burn.time), p = await profile(page);
  expect(burn.time).toBeGreaterThan(p.events.ignition.time); expect(burn.time).toBeLessThan(p.events.cutoff.time);
  expect(burn.engine).toBe('on'); expect(burn.plume).toBe('on'); expect(burn.thrust).toBeGreaterThan(90000);
  expect(burn.mass).toBeCloseTo(expected.mass, 6); expect(burn.propellant).toBeCloseTo(expected.propellant, 6);
  expect(burn.mass).toBeLessThan(p.first.mass); expect(burn.propellant).toBeLessThan(p.first.propellant);
  await page.locator('[data-transit-view]').selectOption('system'); await capture(page, info, 'transit-correction-burn');
  await page.locator('[data-transit-milestone="cutoff"]').click();
  const cutoff = await transit(page); expect(cutoff.engine).toBe('off'); expect(cutoff.plume).toBe('off'); expect(cutoff.thrust).toBe(0); expect(cutoff.mass).toBeLessThan(burn.mass);
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  const corrected = await saved(page); expect(corrected.transitResult.outcome).toBe('encounter'); expect(corrected.transitResult.propellantUsed).toBeGreaterThan(0);
  expect(corrected.transitResult.actualBurn).toBeGreaterThan(0); expect(corrected.missionXP).toBe(0);
  await page.locator('[data-transit-view]').selectOption('moon'); await capture(page, info, 'transit-corrected-encounter');
});

test('review and reload retain arrival, then advancing rewards the mission only once', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await page.locator('[data-transit-result]').click(); const arrived = await saved(page);
  await seek(page, 3600); const reviewing = await saved(page), readings = await transit(page);
  expect(reviewing.transitResult).toEqual(arrived.transitResult); expect(reviewing.transitRun.recorded).toBe(true);
  await mount(page, { moonMission: reviewing }); expect(await transit(page)).toEqual(readings); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  await page.locator('[data-transit-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(4); const advanced = await saved(page);
  expect(advanced.missionXP).toBe(15); expect(advanced.transitAwarded).toBe(true); await expect(page.locator('[data-loi-canvas]')).toBeVisible();
  await mount(page, { moonMission: { ...advanced, missionPhase: 3 } }); await page.locator('[data-transit-proceed]').click();
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(4); expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
});

test('legacy choices and malformed saved results cannot bypass measured arrival', async ({ page }) => {
  await mount(page, seed({ mccChoice: 'corrected', coastSlowest: { v: 1, toMoonKm: 38000 },
    transitRun: { version: 99, time: 'corrupt', recorded: true }, transitResult: { version: 1, outcome: 'encounter' } }));
  await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); expect((await transit(page)).time).toBe(0);
  expect((await saved(page)).transitResult).toBeNull(); expect((await saved(page)).missionXP).toBe(0);
  await expect(page.locator('[data-transit-workspace]')).toContainText('earlier correction decision');
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled(); expect((await saved(page)).missionXP).toBe(0);
});

test('paused transit stays readable at 320px and keyboard End records exact encounter', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  await seek(page, 36 * 3600); const fixed = await transit(page), pixels = await page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL());
  await page.waitForTimeout(250); expect(await transit(page)).toEqual(fixed);
  expect(await page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL())).toBe(pixels);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(async () => page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  await painted(page); expect(await transit(page)).toEqual(fixed); await mount(page, { moonMission: await saved(page) }); expect(await transit(page)).toEqual(fixed);
  await page.getByText('Tune the departure and correction', { exact: true }).click();
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })); expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  const bounds = await page.locator('[data-transit-workspace] button, [data-transit-workspace] select, [data-transit-workspace] input').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height }; }));
  for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); expect(box.height).toBeGreaterThanOrEqual(32); }
  await accessible(page, info); await capture(page, info, 'transit-paused-320');
  const p = await profile(page), slider = page.locator('[data-transit-seek]'); await slider.focus(); await page.keyboard.press('End');
  await expect.poll(async () => (await transit(page)).time).toBeCloseTo(p.summary.duration, 6);
  await expect(page.locator('[data-transit-proceed]')).toBeEnabled(); expect((await saved(page)).transitRun.recorded).toBe(true);
  await page.getByRole('slider', { name: 'Departure speed error', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  const changed = await saved(page); expect(changed.transitPlan.speedError).toBeGreaterThan(0); expect(changed.transitRun.time).toBe(0);
  expect(changed.transitRun.recorded).toBe(false); expect(changed.transitResult).toBeNull(); expect(changed.transitPaused).toBe(true);
  await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); expect(changed.missionXP).toBe(0);
});

test('transit clock stops while hidden and resumes without catch-up', async ({ page }) => {
  await mount(page, seed({ animPaused: false, transitPlaybackRate: 1, transitRun: { version: 1, time: 20, recorded: false } }));
  const start = (await transit(page)).time; await expect.poll(async () => (await transit(page)).time).toBeGreaterThan(start + 0.2);
  await page.evaluate(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
  const hidden = await transit(page); await page.waitForTimeout(350); expect(await transit(page)).toEqual(hidden);
  const visible = await page.evaluate(async () => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
    const cv = document.querySelector('[data-transit-canvas]') as HTMLCanvasElement, before = Number(cv.dataset.transitTime);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return { before, after: Number(cv.dataset.transitTime) }; });
  expect(visible.after).toBe(visible.before); await expect.poll(async () => (await transit(page)).time).toBeGreaterThan(hidden.time + 0.1); expect((await saved(page)).missionXP).toBe(0);
});

test('view, true size and playback rate preserve the physical state and saved plan', async ({ page }, info) => {
  await mount(page); await page.locator('[data-transit-preset="corrected"]').click(); await page.locator('[data-transit-milestone="burn"]').click();
  const fixed = await transit(page), plan = (await profile(page)).plan;
  for (const view of ['moon', 'system']) { await page.locator('[data-transit-view]').selectOption(view); await painted(page); expect(await transit(page)).toEqual(fixed); }
  await page.locator('[data-moonmission-true-scale]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-moonmission-true-scale]')).toHaveAttribute('aria-pressed', 'true'); expect(await transit(page)).toEqual(fixed);
  await page.locator('[data-transit-rate]').selectOption('600'); const state = await saved(page);
  expect(state.transitPlaybackRate).toBe(600); expect(state.transitView).toBe('system'); expect(state.trueScale).toBe(true); expect(state.transitPlan).toEqual(plan);
  await mount(page, { moonMission: state }); expect(await transit(page)).toEqual(fixed);
  await expect(page.locator('[data-transit-rate]')).toHaveValue('600'); await expect(page.locator('[data-moonmission-true-scale]')).toHaveAttribute('aria-pressed', 'true');
  await capture(page, info, 'transit-true-size');
});

test('an integrated lunar impact stays blocked and replanning clears its result', async ({ page }, info) => {
  await mount(page, seed({ transitPlan: { angleError: 0.02 } }));
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeDisabled();
  const state = await saved(page), p = await profile(page), end = await transit(page);
  expect(state.transitResult.outcome).toBe('impact'); expect(state.transitResult.impactBody).toBe('moon');
  expect(p.events.impact).not.toBeNull(); expect(end.time).toBeCloseTo(p.events.impact.time, 6);
  expect(end.engine).toBe('off'); expect(end.thrust).toBe(0); expect(state.missionXP).toBe(0);
  await expect(page.locator('[data-transit-outcome="impact"]')).toContainText('Surface impact');
  await page.locator('[data-transit-view]').selectOption('moon'); await capture(page, info, 'transit-lunar-impact');
  await page.locator('[data-transit-preset="nominal"]').click();
  const reset = await saved(page); expect(reset.transitResult).toBeNull(); expect(reset.transitRun.recorded).toBe(false); expect(reset.transitRun.time).toBe(0);
});

test('fresh descent uses its own tank and drift while retaining actual descent-event costs', async ({ page }) => {
  const readings: Array<{ fuel: number; drift: number }> = [];
  for (const mccChoice of [null, 'corrected', 'skipped']) {
    await mount(page, seed({ missionPhase: 5, descentStarted: true, mccChoice }));
    readings.push(await page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({ fuel: Number(cv.dataset.descentFuel), drift: Number(cv.dataset.descentHspeed) })));
  }
  expect(readings[0]).toEqual(readings[1]); expect(readings[0]).toEqual(readings[2]);
  await mount(page, seed({ missionPhase: 5, descentStarted: true, mccChoice: 'skipped', decisionLog: [
    { title: 'Program Alarm 1202!', chosen: 'Manual', quality: 'adequate', effects: { hoverFuel: 8, drift: 3, note: 'Manual control costs fuel and adds drift' } }] }));
  const events = await page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({ fuel: Number(cv.dataset.descentFuel), drift: Number(cv.dataset.descentHspeed) }));
  expect(events.fuel).toBe(readings[0].fuel - 8); expect(events.drift).toBe(readings[0].drift + 3);
});
