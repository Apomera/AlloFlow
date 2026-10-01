import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass8-2026-09-29/return');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 8, animPaused: true, soundOff: true,
  missionXP: 0, missionLog: [], difficulty: 'pilot', earnedBadges: { first_step: true, mission_complete: true }, lunarSamples: [], quizCorrect: 0, ...extra } });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-teicoast-canvas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-teicoast-canvas]').getAttribute('data-return-elapsed')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function profile(page: Page) {
  return page.evaluate(() => { const p = (window as any).MoonMissionPure.returnProfile((window as any).__toolData.moonMission.entryAngle); return { summary: p.summary, events: p.events }; });
}
async function live(page: Page) {
  return page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.returnElapsed), altitude: Number(cv.dataset.returnAltitude) * 1000,
    speed: Number(cv.dataset.returnSpeed), radialSpeed: Number(cv.dataset.returnRadialSpeed), tangentialSpeed: Number(cv.dataset.returnTangentialSpeed),
    gamma: Number(cv.dataset.returnAngle), x: Number(cv.dataset.returnX), y: Number(cv.dataset.returnY), vx: Number(cv.dataset.returnVx), vy: Number(cv.dataset.returnVy),
    separated: cv.dataset.returnSeparated === 'true', complete: cv.dataset.returnComplete === 'true', plume: cv.dataset.returnPlume }));
}
async function seek(page: Page, time: number) {
  const selected = Math.round(time * 10) / 10;
  await page.locator('[data-return-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, selected);
  await expect.poll(async () => Math.abs((await live(page)).time - selected)).toBeLessThan(0.11);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
}
async function painted(page: Page) {
  await expect.poll(async () => page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; let opaque = 0, count = 0; const colors = new Set<string>();
    for (let y = 20; y < cv.height; y += 20) for (let x = 20; x < cv.width; x += 20) { const i = (y * cv.width + x) * 4; count++; if (pixels[i + 3] > 100) opaque++; colors.add(Array.from(pixels.slice(i, i + 3)).join(',')); }
    return opaque / count > 0.95 && colors.size > 12;
  })).toBe(true);
}
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));

test('both return cameras use measured positions, distinct speed components and no engine plume', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(page.locator('[data-entry-begin]')).toBeDisabled(); await seek(page, 24 * 3600);
  const actual = await live(page), expected = await page.evaluate(time => { const P = (window as any).MoonMissionPure; return P.returnSample(P.returnProfile(), time); }, actual.time);
  for (const key of ['x', 'y', 'vx', 'vy', 'speed', 'radialSpeed', 'tangentialSpeed', 'gamma'] as const) expect(actual[key]).toBeCloseTo(expected[key], 6);
  expect(actual.plume).toBe('off'); expect(actual.separated).toBe(false); expect(actual.complete).toBe(false);
  expect(actual.speed).toBeCloseTo(Math.hypot(actual.radialSpeed, actual.tangentialSpeed), 7);
  await expect(page.locator('[data-return-readouts]')).toContainText('Earth-relative speed');
  await expect(page.locator('[data-return-readouts]')).toContainText('Radial closing speed');
  await painted(page); await capture(page, info, 'return-whole-orbit');
  await page.locator('[data-return-view]').selectOption('approach'); await painted(page); expect(await live(page)).toEqual(actual);
  await page.locator('[data-return-milestone="final"]').click(); const p = await profile(page);
  expect((await live(page)).time).toBeCloseTo(p.summary.duration - 900, 6);
  await expect(page.locator('[data-return-rate]')).toHaveValue('60'); await capture(page, info, 'return-final-approach');
  await page.locator('[data-return-milestone="separation"]').click(); await expect(page.locator('[data-return-rate]')).toHaveValue('1');
  const separated = await live(page); expect(separated.separated).toBe(true); expect(separated.complete).toBe(false);
  expect(separated.time).toBeCloseTo(p.summary.duration - 833, 6); expect(separated.plume).toBe('off');
  await capture(page, info, 'return-sm-separation'); expect(errors).toEqual([]);
});

test('recorded arrival survives review and reload, then passes the same boundary state into entry', async ({ page }, info) => {
  await mount(page); await page.locator('[data-return-arrival]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  const p = await profile(page), end = await live(page), state = await saved(page);
  expect(end.altitude).toBeCloseTo(122000, 5); expect(end.speed).toBeCloseTo(11030, 6); expect(end.gamma).toBeCloseTo(-6.5, 8);
  expect(end.radialSpeed).toBeCloseTo(-1248.63144786, 6); expect(state.returnRun.recorded).toBe(true); expect(state.missionXP).toBe(0);
  expect(state.returnResult.duration).toBe(p.summary.duration); await capture(page, info, 'return-entry-interface');
  await seek(page, 1000); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  const reviewed = await saved(page); await mount(page, seed(reviewed));
  expect((await live(page)).time).toBeCloseTo(1000, 6); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  await page.locator('[data-return-arrival]').click(); expect((await saved(page)).missionXP).toBe(0);
  await page.locator('[data-entry-begin]').click(); await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  const entry = await saved(page); expect(entry.entryRun.angle).toBe(-6.5); expect(entry.entryRun.recorded).toBe(false); expect(entry.missionXP).toBe(0);
  const initial = await page.evaluate(() => { const P = (window as any).MoonMissionPure; return P.entrySample(P.entryProfile(-6.5), 0); });
  expect(initial.altitude).toBeCloseTo(end.altitude, 5); expect(initial.speed).toBeCloseTo(end.speed, 6); expect(initial.gamma * 180 / Math.PI).toBeCloseTo(end.gamma, 8);
});

test('planner changes clear arrival and maintain the new selected angle through the handoff', async ({ page }, info) => {
  await mount(page); await page.locator('[data-return-arrival]').click();
  await page.locator('[data-entry-preset="reference"]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  await page.locator('[data-entry-preset="shallow"]').click(); await expect(page.locator('[data-entry-begin]')).toBeDisabled();
  const reset = await saved(page); expect(reset.returnResult).toBeNull(); expect(reset.returnRun).toEqual({ version: 1, angle: -5, time: 0, recorded: false });
  await expect(page.locator('[data-entry-predicted-outcome]')).toHaveAttribute('data-entry-predicted-outcome', 'skip');
  await page.locator('[data-return-arrival]').click(); expect((await live(page)).gamma).toBeCloseTo(-5, 8);
  await capture(page, info, 'return-shallow-interface');
  await page.locator('[data-entry-begin]').click(); await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  expect((await saved(page)).entryRun.angle).toBe(-5); expect((await saved(page)).missionXP).toBe(0);
});

test('legacy and malformed saved arrival claims stay blocked until a measured review', async ({ page }) => {
  await mount(page); const p = await profile(page);
  for (const extra of [
    { reentryStatus: 4 },
    { returnRun: { version: 2, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary } },
    { returnRun: { version: 1, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary, interfaceSpeed: 99999 } },
    { entryAngle: -5, returnRun: { version: 1, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary } },
  ]) { await mount(page, seed(extra)); await expect(page.locator('[data-entry-begin]')).toBeDisabled(); expect((await saved(page)).missionPhase).toBe(8); }
  await page.locator('[data-return-arrival]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
});

test('the clock slows automatically, freezes when hidden and resumes without wall-time catch-up', async ({ page }) => {
  await mount(page); const p = await profile(page);
  await mount(page, seed({ returnRun: { version: 1, angle: -6.5, time: p.summary.duration - 1000, recorded: false }, returnPlaybackRate: 3600 }));
  await page.locator('[data-return-play-pause]').click(); await expect(page.locator('[data-return-rate]')).toHaveValue('60');
  await expect(page.locator('[data-return-view]')).toHaveValue('approach');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const before = await live(page); await page.waitForTimeout(500); expect(await live(page)).toEqual(before);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await live(page)).time).toBeGreaterThan(before.time);
  await page.locator('[data-return-play-pause]').click(); const stopped = await live(page); await page.waitForTimeout(500); expect(await live(page)).toEqual(stopped);
  expect(stopped.time - before.time).toBeLessThan(60);
});

test('320px keyboard, pause, resize, reload and accessibility preserve the physical coast', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await seek(page, 36 * 3600);
  const before = await live(page); await page.setViewportSize({ width: 390, height: 1000 }); await painted(page); expect(await live(page)).toEqual(before);
  const state = await saved(page); await page.setViewportSize({ width: 320, height: 1000 }); await mount(page, seed(state));
  expect(await live(page)).toEqual(before); await page.locator('[data-return-seek]').focus(); await page.keyboard.press('End');
  await expect(page.locator('[data-entry-begin]')).toBeEnabled(); const end = await live(page); expect(end.complete).toBe(true); expect(end.separated).toBe(true);
  expect(end.time).toBe((await profile(page)).summary.duration); await painted(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); expect(overflow).toBe(false);
  await page.locator('[data-return-model-note] summary').click();
  const axe = resolve('node_modules/axe-core/axe.min.js'); if (existsSync(axe)) {
    await page.addScriptTag({ path: axe }); const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-return-workspace]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
    await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'phone-axe.json'), JSON.stringify(violations, null, 2)); expect(violations).toEqual([]);
  }
  await capture(page, info, 'return-phone-320');
});
