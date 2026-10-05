import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ENTRY_GUIDANCE_REPORT_DIR || 'reports/moon-mission-enhancement-pass14-2026-10-02/browser/guidance');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
type Plan = { version: 2; mode: 'guided' | 'ballistic' | 'bank'; bank: number };
const guided: Plan = { version: 2, mode: 'guided', bank: 0 };
const bank = (value: number): Plan => ({ version: 2, mode: 'bank', bank: value });
const run = (plan: Plan, extra: Record<string, unknown> = {}) => ({ version: 2, plan, angle: -6.5, time: 0, recovery: 0, recorded: false, ...extra });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 9, entryAngle: -6.5, entryPlan: guided, entryRun: run(guided),
  animPaused: true, entryPaused: true, soundOff: true, missionXP: 0,
  earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  lunarSamples: [], quizCorrect: 0, ...extra,
} });

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    const state = value.moonMission as any;
    // Seed an authentic arrival through the real coast model, rather than bypassing
    // the progression gate with a hand-authored result string.
    if (state.missionPhase === 8 && !state.returnRun) {
      const profile = (window as any).MoonMissionPure.returnProfile(state.entryAngle);
      state.returnRun = { version: 1, angle: profile.angle, time: profile.summary.duration, recorded: true };
      state.returnResult = { version: 1, ...profile.summary };
      state.returnPaused = true;
    }
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-entry-canvas], [data-entry-planner]').first()).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function predicted(page: Page, plan: Plan) {
  return page.evaluate(selected => {
    const P = (window as any).MoonMissionPure, p = P.entryProfile(-6.5, { plan: selected });
    return { summary: p.summary, events: p.events, plan: p.plan };
  }, plan);
}
async function telemetry(page: Page) {
  return page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.entryTime), stage: cv.dataset.entryStage,
    altitude: Number(cv.dataset.entryAltitude), load: Number(cv.dataset.entryLoad),
    gamma: Number(cv.dataset.entryGamma), verticalSpeed: Number(cv.dataset.entryVerticalSpeed),
    bank: cv.dataset.entryBank === '' ? null : Number(cv.dataset.entryBank),
  }));
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
async function setBank(page: Page, value: number) {
  await page.locator('[data-entry-bank]').evaluate((el: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect.poll(async () => (await saved(page)).entryPlan).toEqual(bank(value));
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, selector: string) {
  return page.evaluate(async sel => (await (window as any).axe.run(document.querySelector(sel),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations, selector);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('bank and ballistic predictions follow selected physics while preserving the verified return arrival', async ({ page }, info) => {
  await mount(page, seed({ missionPhase: 8, entryRun: null }));
  const initial = await saved(page);
  await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  for (const selected of [bank(90), bank(0), { version: 2, mode: 'ballistic', bank: 0 } as Plan]) {
    await page.locator('[data-entry-guidance="' + selected.mode + '"]').click();
    if (selected.mode === 'bank') await setBank(page, selected.bank);
    const p = await predicted(page, selected), state = await saved(page);
    await expect(page.locator('[data-entry-predicted-value="peakG"]')).toHaveText(p.summary.peakG.toFixed(1) + ' g');
    await expect(page.locator('[data-entry-predicted-value="peakHeatFlux"]')).toHaveText((p.summary.peakHeatFlux / 1e6).toFixed(2) + ' MW/m²');
    await expect(page.locator('[data-entry-predicted-outcome]')).toHaveAttribute('data-entry-predicted-outcome', p.summary.outcome);
    expect(state.returnRun).toEqual(initial.returnRun);
    expect(state.returnResult).toEqual(initial.returnResult);
    expect(state.entryPlan).toEqual(selected);
    expect(state.entryOutcome == null).toBe(true);
    expect(state.missionXP).toBe(0);
    await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  }
  await expect(page.locator('[data-entry-selected-plan]')).toContainText('zero-lift');
  await page.locator('[data-entry-guidance="bank"]').click();
  await setBank(page, 90);
  await capture(page, info, 'guidance-planner-bank-90');
  await page.locator('[data-entry-begin]').click();
  await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  const begun = await saved(page);
  expect(begun.entryRun).toMatchObject(run(bank(90)));
  expect(begun.entryOutcome).toBeNull();
  expect(begun.missionXP).toBe(0);
  await expect(page.locator('[data-entry-run-plan]')).toContainText('Fixed bank 90°');
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
});

test('320 px bank flight exposes measured geometry, readable labels, keyboard controls and accessible layout', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await mount(page, seed({ missionPhase: 8, entryRun: null }));
  await page.locator('[data-entry-guidance="bank"]').click();
  await setBank(page, 90);
  const plannerTargets = await page.locator('[data-entry-guidance], [data-entry-bank]').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { width: b.width, height: b.height, left: b.left, right: b.right };
  }));
  expect(plannerTargets).toHaveLength(4);
  for (const b of plannerTargets) {
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(320);
  }
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const plannerAxe = await axe(page, '[data-entry-planner]');
  expect(plannerAxe).toEqual([]);
  await capture(page, info, 'guidance-planner-phone-320');
  await page.locator('[data-entry-begin]').click();
  const slider = page.locator('[data-entry-seek]');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(0);
  const p = await predicted(page, bank(90)), time = await seek(page, p.summary.peakGTime);
  const expected = await page.evaluate(({ time, selected }) => {
    const P = (window as any).MoonMissionPure, profile = P.entryProfile(-6.5, { plan: selected });
    const sample = P.entrySample(profile, time), geometry = P.entryTrajectoryGeometry(profile, 600, 240);
    return { sample, point: P.entryTrajectoryPoint(geometry, sample), metersPerPixel: geometry.metersPerPixel };
  }, { time, selected: bank(90) });
  const live = await telemetry(page);
  expect(live.gamma).toBeCloseTo(expected.sample.gamma, 10);
  expect(live.gamma).toBeLessThan(0);
  expect(live.verticalSpeed).toBeCloseTo(expected.sample.verticalSpeed, 6);
  expect(live.verticalSpeed).toBeLessThan(0);
  expect(live.bank).toBeCloseTo(90, 5);
  expect(parseFloat(await page.locator('[data-entry-value="gamma"]').innerText())).toBeCloseTo(expected.sample.gamma * 180 / Math.PI, 1);
  expect(parseFloat(await page.locator('[data-entry-value="verticalSpeed"]').innerText())).toBeCloseTo(expected.sample.verticalSpeed, 0);
  await expect(page.locator('[data-entry-trajectory-reading]')).toContainText('Descending');
  const geometry = await page.locator('[data-entry-trajectory]').evaluate(figure => {
    const el = figure as HTMLElement, svg = el.querySelector('[data-entry-trajectory-svg]') as SVGSVGElement;
    const marker = el.querySelector('[data-entry-trajectory-marker]')!, transform = svg.getScreenCTM()!;
    return { metersPerPixel: Number(el.dataset.entryTrajectoryMetersPerPixel), x: Number(el.dataset.entryTrajectoryX), y: Number(el.dataset.entryTrajectoryY),
      vx: Number(el.dataset.entryTrajectoryVx), vy: Number(el.dataset.entryTrajectoryVy),
      cx: Number(marker.getAttribute('cx')), cy: Number(marker.getAttribute('cy')),
      scaleX: Math.hypot(transform.a, transform.b), scaleY: Math.hypot(transform.c, transform.d) };
  });
  expect(geometry.metersPerPixel).toBeCloseTo(expected.metersPerPixel, 8);
  expect(geometry.scaleX).toBeCloseTo(geometry.scaleY, 10);
  expect(geometry.cx).toBeCloseTo(expected.point.px, 6);
  expect(geometry.cy).toBeCloseTo(expected.point.py, 6);
  expect(geometry.x).toBeCloseTo(expected.point.x, 5);
  expect(geometry.y).toBeCloseTo(expected.point.y, 5);
  expect(Math.hypot(geometry.vx, geometry.vy)).toBeCloseTo(expected.sample.speed, 6);
  const fonts = await page.locator('[data-entry-chart-axis], [data-entry-trajectory-reading], [data-entry-trajectory-scale]').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(fonts).toHaveLength(4);
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
  const controls = await page.locator('[data-entry-instruments] button, [data-entry-seek], select[aria-label="Playback speed"]').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { height: b.height, left: b.left, right: b.right };
  }));
  expect(controls.length).toBeGreaterThanOrEqual(4);
  for (const b of controls) {
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const flightAxe = await axe(page, '[data-entry-workspace]');
  expect(flightAxe).toEqual([]);
  await capture(page, info, 'guidance-flight-phone-320');
  await writeFile(join(REPORT, 'guidance-phone-axe.json'), JSON.stringify({ planner: plannerAxe, flight: flightAxe }, null, 2));
});

test('guided results retain the flown plan through scrub, reload, report and archive with rewards paid once', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const done = await saved(page);
  expect(done.entryOutcome).toMatchObject({ modelVersion: 2, plan: guided, completed: true, terminal: 'splash', outcome: 'nominal' });
  expect(done.entryAttempts).toHaveLength(1);
  expect(done.missionXP).toBe(25);
  await page.locator('[data-entry-result]').click();
  const p = await predicted(page, guided), time = await seek(page, p.summary.peakHeatTime);
  const reviewed = await saved(page);
  expect(reviewed.entryOutcome).toEqual(done.entryOutcome);
  expect(reviewed.missionXP).toBe(25);
  // Planner settings may change in a saved document; the receipt continues to
  // identify the controller actually flown, independently of that new selection.
  reviewed.entryPlan = bank(180);
  await mount(page, { moonMission: reviewed });
  await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(time, 1);
  await expect(page.locator('[data-entry-run-plan]')).toContainText('Guided lift');
  await expect(page.locator('[data-entry-trajectory-plan]')).toContainText('Guided lift');
  const restored = await saved(page);
  expect(restored.entryPlan).toEqual(bank(180));
  expect(restored.entryRun.plan).toEqual(guided);
  expect(restored.entryOutcome).toEqual(done.entryOutcome);
  expect(restored.entryAttempts).toEqual(done.entryAttempts);
  expect(restored.missionXP).toBe(25);
  await page.locator('[data-entry-result]').click();
  await page.locator('[data-entry-complete]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(10);
  expect((await saved(page)).missionXP).toBe(75);
  const report = await page.locator('[data-moonmission-report-text]').inputValue();
  expect(report).toContain('Guided lift');
  expect(report).not.toContain('Fixed bank 180°');
  await capture(page, info, 'guidance-flown-plan-debrief');
  await page.getByRole('button', { name: /Fly Another Mission/ }).click();
  const archived = await saved(page);
  expect(archived.flightHistory).toHaveLength(1);
  expect(archived.flightHistory[0].entry).toEqual(done.entryOutcome);
  const archiveReport = await page.evaluate(summary => (window as any).MoonMissionPure.flightReport(summary), archived.flightHistory[0]);
  expect(archiveReport).toContain('Guided lift');
  expect(archiveReport).not.toContain('Fixed bank 180°');
  expect(errors).toEqual([]);
});

test('bank zero skip-out shows an upward measured path at interface and cannot unlock splashdown', async ({ page }, info) => {
  await mount(page, seed({ entryPlan: bank(0), entryRun: run(bank(0)) }));
  const p = await predicted(page, bank(0));
  expect(p.events.drogue).toBeNull();
  expect(p.events.main).toBeNull();
  expect(p.events.splash).toBeNull();
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="skip"]')).toBeVisible();
  await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'skip');
  const live = await telemetry(page);
  expect(live.altitude).toBeCloseTo(122000, 3);
  expect(live.gamma).toBeGreaterThan(0);
  expect(live.verticalSpeed).toBeGreaterThan(0);
  await expect(page.locator('[data-entry-trajectory-reading]')).toContainText('Skip-out · Ascending');
  await expect(page.locator('[data-entry-trajectory-event="drogue"], [data-entry-trajectory-event="main"], [data-entry-trajectory-event="splash"]')).toHaveCount(0);
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  const done = await saved(page);
  expect(done.entryOutcome).toMatchObject({ modelVersion: 2, plan: bank(0), terminal: 'skip', splashSpeed: null });
  expect(done.missionXP).toBe(10);
  await page.locator('[data-entry-result]').click();
  expect((await saved(page)).missionXP).toBe(10);
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  await capture(page, info, 'guidance-bank-zero-skip');
});

test('finite forged v2 evidence and unsupported terminal clocks restart without a completion or reward', async ({ page }, info) => {
  await mount(page);
  const valid = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'guided' }) });
    return { result: P.entryRecordedResult(profile), duration: profile.summary.duration };
  });
  for (const patch of [
    { entryRun: run(guided, { time: valid.duration, recorded: true, recovery: 5 }), entryOutcome: { ...valid.result, duration: valid.duration + 1 } },
    { entryRun: run(guided, { time: valid.duration, recorded: false, recovery: 5 }), entryOutcome: valid.result },
    { entryRun: run(guided, { time: valid.duration, recorded: 'true', recovery: 5 }), entryOutcome: valid.result },
    { entryRun: { ...run(guided, { time: valid.duration, recorded: true }), version: 3 }, entryOutcome: valid.result, reentryStatus: 4 },
    { entryRun: run(guided, { time: valid.duration + 100, recorded: false, recovery: 5 }), entryOutcome: null },
  ]) {
    await mount(page, seed(patch));
    await expect.poll(async () => (await telemetry(page)).time).toBe(0);
    await expect(page.locator('[data-entry-complete]')).toBeDisabled();
    const state = await saved(page);
    expect(state.entryOutcome).toBeNull();
    expect(state.entryRun).toMatchObject(run(guided));
    expect(state.missionXP).toBe(0);
    expect(state.entryAttempts || []).toEqual([]);
    expect(state.entryCompletionAwarded === true).toBe(false);
    await expect(page.locator('[data-entry-instruments]')).toContainText('could not be verified');
  }
  await capture(page, info, 'guidance-rejected-terminal-clock');
});
