import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
const REPORT = resolve('reports/moon-mission-enhancement-pass10-2026-09-29/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 2, tliStarted: true, orbitRun: { version: 1, time: 9245.011304324662 },
  tliAccuracy: { onTime: true, offByDeg: 0, side: 'late', beforeGo: false },
  missionXP: 0, missionLog: [], animPaused: true, soundOff: true, difficulty: 'pilot',
  earnedBadges: { first_step: true, mission_complete: true }, ...extra,
} });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-tli-canvas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-tli-canvas]').getAttribute('data-tli-time')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function live(page: Page) { return page.locator('[data-tli-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  time: Number(cv.dataset.tliTime), altitude: Number(cv.dataset.tliAltitude), speed: Number(cv.dataset.tliSpeed), mass: Number(cv.dataset.tliMass), energy: Number(cv.dataset.tliEnergy),
  thrust: Number(cv.dataset.tliThrust), acceleration: Number(cv.dataset.tliAcceleration), plume: cv.dataset.tliPlume, recorded: cv.dataset.tliRecorded,
})); }
async function seek(page: Page, time: number) {
  await page.locator('[data-tli-seek]').evaluate((el: HTMLInputElement, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, time);
  await expect.poll(async () => Math.abs((await live(page)).time - time)).toBeLessThan(0.01);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-tli-workspace]').screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
test('finite burn instruments and both cameras follow the computed state', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page);
  expect((await live(page)).plume).toBe('true'); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  await seek(page, 150.5); const s = await live(page), expected = await page.evaluate(t => { const P = (window as any).MoonMissionPure; return P.tliSample(P.tliProfile(), t); }, s.time);
  expect(s.altitude).toBeCloseTo(expected.altitude, 6); expect(s.speed).toBeCloseTo(expected.speed, 6); expect(s.mass).toBeCloseTo(expected.mass, 6); expect(s.energy).toBeCloseTo(expected.energy, 6); expect(s.thrust).toBeCloseTo(expected.thrust, 6);
  await capture(page, info, 'injection-burn'); await page.locator('[data-tli-view]').selectOption('orbit'); expect(await live(page)).toEqual(s); await capture(page, info, 'injection-midburn-forecast'); expect(errors).toEqual([]);
});
test('cutoff review survives rewind and reload, and plan changes invalidate measured completion', async ({ page }, info) => {
  await mount(page); await page.locator('[data-tli-review]').click(); await expect(page.locator('[data-tli-result]')).toBeVisible();
  const end = await live(page), data = await saved(page); expect(end.time).toBe(342); expect(end.plume).toBe('false'); expect(data.missionXP).toBe(0); expect(data.tliRun.recorded).toBe(true); expect(data.tliResult.outcome).toBe('lunar-distance');
  await capture(page, info, 'injection-lunar-distance'); await seek(page, 80); await mount(page, seed(await saved(page))); expect((await live(page)).time).toBe(80); await expect(page.locator('[data-tli-proceed]')).toBeEnabled();
  await page.locator('[data-tli-plan]').selectOption('300'); await expect(page.locator('[data-tli-result]')).toHaveCount(0); expect((await live(page)).time).toBe(0); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  await page.locator('[data-tli-review]').click(); expect((await saved(page)).tliResult.outcome).toBe('insufficient'); await expect(page.locator('[data-tli-proceed]')).toBeDisabled(); await capture(page, info, 'injection-short-burn');
  await page.locator('[data-tli-plan]').selectOption('342'); await page.locator('[data-tli-review]').click();
  await page.locator('[data-tli-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); }); await expect.poll(async () => (await saved(page)).missionPhase).toBe(3); expect((await saved(page)).missionXP).toBe(25);
});
test('overlong burn has positive orbital energy and explicitly reports escape', async ({ page }, info) => {
  await mount(page); await page.locator('[data-tli-plan]').selectOption('350'); await page.locator('[data-tli-review]').click(); const data = await saved(page);
  expect(data.tliResult.energy).toBeGreaterThan(0); expect(data.tliResult.apogee).toBeNull(); expect(data.tliResult.outcome).toBe('escape');
  await expect(page.locator('[data-tli-value="apogee"]')).toHaveText('Open escape path'); await expect(page.locator('[data-tli-result]')).toContainText('Lunar arrival still requires targeting');
  await capture(page, info, 'injection-escape'); expect(data.missionXP).toBe(0);
});
test('corrupted result and malformed run restart unverified and clear stored evidence', async ({ page }) => {
  await mount(page); await page.locator('[data-tli-review]').click(); const raw = await saved(page);
  for (const extra of [{ tliResult: { ...raw.tliResult, mass: 0 } }, { tliRun: { ...raw.tliRun, version: 99 } }, { tliRun: { ...raw.tliRun, duration: 300 } }]) {
    await mount(page, seed({ ...raw, ...extra })); expect((await live(page)).time).toBe(0); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
    const data = await saved(page); expect(data.tliResult).toBeNull(); expect(data.tliRun.recorded).toBe(false); expect(data.missionXP).toBe(0);
  }
});
test('injection playback freezes while hidden and resumes without catch-up', async ({ page }) => {
  await mount(page); await page.locator('[data-tli-rate]').selectOption('10'); await page.locator('[data-tli-pause]').click(); await expect.poll(async () => (await live(page)).time).toBeGreaterThan(1);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }); const held = await live(page);
  await page.waitForTimeout(500); expect(await live(page)).toEqual(held);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(150); expect((await live(page)).time - held.time).toBeLessThan(4);
  await page.locator('[data-tli-pause]').click(); const paused = await live(page); await page.waitForTimeout(150); expect(await live(page)).toEqual(paused);
});
test('320px keyboard, resize, reload and accessibility preserve the measured burn', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 }); await mount(page); const slider = page.locator('[data-tli-seek]'); await slider.focus(); await page.keyboard.press('ArrowRight'); await expect.poll(async () => (await live(page)).time).toBeGreaterThan(0);
  await page.keyboard.press('End'); await expect(page.locator('[data-tli-result]')).toBeVisible(); const end = await live(page); await page.setViewportSize({ width: 500, height: 850 }); expect(await live(page)).toEqual(end);
  await page.setViewportSize({ width: 320, height: 850 }); await mount(page, seed(await saved(page))); expect(await live(page)).toEqual(end); await capture(page, info, 'injection-phone-320');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') }); const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-tli-workspace]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await writeFile(join(REPORT, 'phone-axe.json'), JSON.stringify(violations, null, 2)); expect(violations).toEqual([]);
});
