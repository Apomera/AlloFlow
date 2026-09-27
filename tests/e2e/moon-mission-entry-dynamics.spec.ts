import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve('reports/moon-mission-enhancement-pass3-2026-09-27/entry');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
});
// Isolate entry rewards from the independent deferred mission-badge checks.
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 9, entryAngle: -6.5, animPaused: true, soundOff: true,
  missionXP: 0, earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra,
} });

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-entry-canvas], [data-entry-planner]').first()).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function telemetry(page: Page) {
  return page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.entryTime), stage: cv.dataset.entryStage,
    altitude: Number(cv.dataset.entryAltitude), speed: Number(cv.dataset.entrySpeed),
    load: Number(cv.dataset.entryLoad), heat: Number(cv.dataset.entryHeatFlux),
    recovery: Number(cv.dataset.entryRecovery),
  }));
}
async function profile(page: Page, angle = -6.5) {
  return page.evaluate(value => {
    const P = (window as any).MoonMissionPure, p = P.entryProfile(value);
    return { summary: p.summary, events: p.events, constants: P.entry };
  }, angle);
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-entry-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await telemetry(page)).time - time)).toBeLessThan(0.11);
  return time;
}
async function painted(page: Page) {
  await expect.poll(async () => {
    const pixels = await page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const image = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height);
    let opaque = 0, total = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) {
      const i = (y * cv.width + x) * 4; total++;
      if (image.data[i + 3] > 100) opaque++;
      colors.add(Array.from(image.data.slice(i, i + 3)).join(','));
    }
    return { opaque: opaque / total, colors: colors.size };
    });
    return pixels.opaque > 0.9 && pixels.colors > 12;
  }, { message: 'The entry canvas should repaint a varied opaque scene after resize' }).toBe(true);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('entry presets predict the same trajectories and begin without awarding a result', async ({ page }, info) => {
  await mount(page, seed({ missionPhase: 8, entryPaused: true, entryMigrationNote: 'Earlier animation' }));
  for (const [id, angle, outcome] of [
    ['shallow', -5, 'skip'], ['steep', -9, 'steep'], ['reference', -6.5, 'nominal'],
  ] as const) {
    await page.locator('[data-entry-preset="' + id + '"]').click();
    await expect(page.locator('[data-entry-predicted-outcome]')).toHaveAttribute('data-entry-predicted-outcome', outcome);
    const p = await profile(page, angle);
    await expect(page.locator('[data-entry-predicted-value="peakG"]')).toHaveText(p.summary.peakG.toFixed(1) + ' g');
    await expect(page.locator('[data-entry-predicted-value="peakHeatFlux"]')).toHaveText((p.summary.peakHeatFlux / 1e6).toFixed(2) + ' MW/m²');
    expect((await saved(page)).missionXP).toBe(0);
  }
  await capture(page, info, 'entry-planner-reference');
  await page.locator('[data-entry-begin]').click();
  await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'entry');
  const state = await saved(page);
  expect(state.entryRun).toMatchObject({ version: 1, angle: -6.5, time: 0, recovery: 0, recorded: false });
  expect(state.entryOutcome).toBeNull();
  expect(state.entryPaused).toBe(false);
  expect(state.entryMigrationNote).toBeNull();
  expect(state.animPaused).toBe(true);
  expect(state.missionXP).toBe(0);
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
});

test('nominal playback follows heating and chute events, preserves reviewed results, and pays once', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const p = await profile(page);
  const heatTime = await seek(page, p.summary.peakHeatTime);
  const expected = await page.evaluate(time => {
    const P = (window as any).MoonMissionPure;
    return P.entrySample(P.entryProfile(-6.5), time);
  }, heatTime);
  await expect(page.locator('[data-entry-value="heat"]')).toHaveText((expected.heatFlux / 1e6).toFixed(2) + ' MW/m²');
  expect((await telemetry(page)).heat).toBeCloseTo(expected.heatFlux, 3);
  await painted(page);
  await capture(page, info, 'entry-nominal-heating');
  await seek(page, p.events.drogue.time + p.constants.drogueInflationSeconds * 0.35);
  await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'drogue');
  await capture(page, info, 'entry-drogue-inflating');
  await seek(page, p.events.main.time + p.constants.mainInflationSeconds * 0.35);
  await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'main');
  await capture(page, info, 'entry-main-inflating');
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="splash"]')).toBeVisible();
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const done = await saved(page);
  expect(done.entryAttempts).toHaveLength(1);
  expect(done.entryOutcome).toMatchObject({ modelVersion: 1, completed: true, outcome: 'nominal', terminal: 'splash' });
  expect(done.entryOutcome.duration).toBeCloseTo(p.summary.duration, 5);
  expect(done.missionXP).toBe(25);
  await page.locator('[data-entry-result]').click();
  await seek(page, heatTime);
  const reviewed = await saved(page);
  expect(reviewed.entryOutcome).toEqual(done.entryOutcome);
  expect(reviewed.entryAttempts).toEqual(done.entryAttempts);
  expect(reviewed.missionXP).toBe(25);
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  // Navigate through the harness again to recreate the module and DOM from the save.
  await mount(page, { moonMission: reviewed });
  await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(heatTime, 1);
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  expect((await saved(page)).missionXP).toBe(25);
  await page.locator('[data-entry-result]').click();
  await capture(page, info, 'entry-splashdown-recovery');
  await page.locator('[data-entry-complete]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(10);
  expect((await saved(page)).missionXP).toBe(75);
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('steep entry reports its higher physical load and heating before splashdown', async ({ page }, info) => {
  await mount(page, seed({ entryAngle: -9 }));
  const steep = await profile(page, -9), reference = await profile(page);
  expect(steep.summary.peakG).toBeGreaterThan(reference.summary.peakG * 2);
  expect(steep.summary.peakHeatFlux).toBeGreaterThan(reference.summary.peakHeatFlux);
  await seek(page, steep.summary.peakGTime);
  expect((await telemetry(page)).load).toBeGreaterThan(10);
  await capture(page, info, 'entry-steep-load');
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="splash"]')).toContainText('exceeds');
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const state = await saved(page);
  expect(state.entryOutcome.outcome).toBe('steep');
  expect(state.entryOutcome.peakG).toBeCloseTo(steep.summary.peakG, 0);
  expect(state.missionXP).toBe(10);
});

test('skip-out never unlocks splashdown; retry history survives and improved entry pays only the difference', async ({ page }, info) => {
  await mount(page, seed({ entryAngle: -5 }));
  const p = await profile(page, -5);
  expect(p.events.drogue).toBeNull();
  expect(p.events.main).toBeNull();
  expect(p.events.splash).toBeNull();
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="skip"]')).toBeVisible();
  await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'skip');
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  expect((await telemetry(page)).altitude).toBeCloseTo(122000, 3);
  expect((await saved(page)).missionXP).toBe(10);
  await capture(page, info, 'entry-shallow-skip');
  await page.locator('[data-entry-retry]').click();
  await expect(page.locator('[data-entry-planner]')).toBeVisible();
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  await page.locator('[data-entry-preset="reference"]').click();
  await page.locator('[data-entry-begin]').click();
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="splash"]')).toBeVisible();
  const improved = await saved(page);
  expect(improved.entryAttempts.map((attempt: any) => attempt.outcome)).toEqual(['skip', 'nominal']);
  expect(improved.missionXP).toBe(25);
  await page.locator('[data-entry-result]').click();
  expect((await saved(page)).missionXP).toBe(25);
  expect((await saved(page)).entryAttempts).toHaveLength(2);
});

test('paused resize and saved-run reload preserve a painted scene and unchanged physics', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page);
  await seek(page, 125);
  const before = await telemetry(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  await painted(page);
  expect(await telemetry(page)).toEqual(before);
  const state = await saved(page);
  await mount(page, { moonMission: state });
  await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(before.time, 2);
  await painted(page);
  expect(await telemetry(page)).toEqual(before);
  await page.getByRole('combobox', { name: 'Playback speed', exact: true }).selectOption('10');
  await page.locator('[data-entry-pause]').click();
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(before.time + 1);
  await page.locator('[data-entry-pause]').click();
  const paused = await telemetry(page);
  await page.waitForTimeout(300);
  expect(await telemetry(page)).toEqual(paused);
  expect((await saved(page)).entryPlaybackRate).toBe(10);
  await capture(page, info, 'entry-paused-phone');
});

test('phone entry controls and charts fit, support keyboard seeking, and retain the completed scene', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  const slider = page.locator('[data-entry-seek]');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(0);
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const boxes = await page.locator('[data-entry-instruments] button, [data-entry-seek], select[aria-label="Playback speed"]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(4);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThanOrEqual(32);
  }
  await expect(page.locator('[data-entry-instruments] svg[role="img"]')).toHaveCount(2);
  await page.locator('[data-entry-result]').click();
  const before = await telemetry(page);
  await page.setViewportSize({ width: 1000, height: 900 });
  await painted(page);
  expect(await telemetry(page)).toEqual(before);
  await capture(page, info, 'entry-completed-resized');
});

test('legacy completed entry migrates malformed history once and retains its already-paid reward', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, seed({
    entryAttempts: {},
    entryOutcome: { outcome: 'nominal', angle: -6.5, peakG: 6.5 },
    reentryStatus: 4, missionXP: 25, animPaused: true,
  }));
  await expect(page.locator('[data-entry-instruments]')).toContainText('earlier summary is retained in entry history');
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  await expect.poll(async () => (await telemetry(page)).time).toBe(0);
  const migrated = await saved(page);
  expect(migrated.entryOutcome).toBeNull();
  expect(migrated.entryRun).toMatchObject({ version: 1, angle: -6.5, time: 0, recovery: 0, recorded: false });
  expect(migrated.entryAttempts).toHaveLength(1);
  expect(migrated.entryAttempts[0]).toMatchObject({ legacy: true, outcome: 'nominal', angle: -6.5, peakG: 6.5 });
  expect(migrated.entryAwardedXP).toBe(25);
  expect(migrated.missionXP).toBe(25);
  await capture(page, info, 'entry-legacy-migration');
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="splash"]')).toBeVisible();
  const complete = await saved(page);
  expect(complete.entryAttempts).toHaveLength(2);
  expect(complete.entryAttempts.filter((attempt: any) => attempt.legacy)).toHaveLength(1);
  expect(complete.entryAttempts[1]).toMatchObject({ modelVersion: 1, completed: true, outcome: 'nominal', terminal: 'splash' });
  expect(complete.missionXP).toBe(25);
  await mount(page, { moonMission: complete });
  await expect(page.locator('[data-entry-terminal="splash"]')).toBeVisible();
  await page.locator('[data-entry-result]').click();
  const restored = await saved(page);
  expect(restored.entryAttempts).toEqual(complete.entryAttempts);
  expect(restored.entryOutcome).toEqual(complete.entryOutcome);
  expect(restored.missionXP).toBe(25);
  expect(errors).toEqual([]);
});

test('active entry holds while document is hidden and resumes with a fresh frame clock', async ({ page }) => {
  await mount(page, seed({ animPaused: false, entryPlaybackRate: 1 }));
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(0.2);
  // Override the visibility signal while keeping RAF scheduled. This exercises the
  // application's hidden-tab guard without relying on flaky window focus changes.
  await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const hidden = await telemetry(page);
  await page.waitForTimeout(350);
  expect(await telemetry(page)).toEqual(hidden);
  const firstVisible = await page.evaluate(async () => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    const canvas = document.querySelector('[data-entry-canvas]') as HTMLCanvasElement;
    const before = Number(canvas.dataset.entryTime);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return { before, after: Number(canvas.dataset.entryTime) };
  });
  expect(firstVisible.after).toBe(firstVisible.before);
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(hidden.time + 0.1);
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  expect((await saved(page)).missionXP).toBe(0);
});
