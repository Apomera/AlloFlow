import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ENTRY_THERMAL_REPORT_DIR || 'reports/moon-mission-enhancement-pass15-2026-10-02/browser/thermal');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const GUIDED = { version: 2, mode: 'guided', bank: 0 };
const BANK180 = { version: 2, mode: 'bank', bank: 180 };
const DEFAULT = { version: 1, thickness: 0.05, conductivity: 0.12, emissivity: 0.85 };
const EXPERIMENT = { version: 1, thickness: 0.07, conductivity: 0.24, emissivity: 0.65 };
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 9, entryAngle: -6.5, entryPlan: GUIDED,
  entryRun: { version: 2, angle: -6.5, plan: GUIDED, time: 80, recovery: 0, recorded: false },
  entryThermalPlan: DEFAULT, entryThermalOpen: true, entryThermalFollow: true,
  entryThermalTime: 0, entryThermalIncludeReport: false, animPaused: true, entryPaused: true,
  soundOff: true, missionXP: 0, entryAwardedXP: 0, entryCompletionAwarded: false,
  earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  lunarSamples: [], quizCorrect: 0, ...extra,
} });

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-entry-thermal-lab]')).toBeVisible();
  await expect.poll(async () => page.locator('[data-entry-thermal-lab]').getAttribute('data-entry-thermal-time')).not.toBeNull();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function evidence(page: Page) {
  const state = await saved(page);
  return Object.fromEntries(['entryAngle', 'entryPlan', 'entryRun', 'entryOutcome', 'entryAttempts',
    'missionXP', 'entryAwardedXP', 'entryCompletionAwarded'].map(key => [key, state[key] ?? null]));
}
async function telemetry(page: Page) {
  return page.locator('[data-entry-thermal-lab]').evaluate((lab: HTMLElement) => ({
    time: Number(lab.dataset.entryThermalTime), following: lab.dataset.entryThermalFollowing === 'true',
    phase: lab.dataset.entryThermalPhase, surfaceT: Number(lab.dataset.entryThermalSurface),
    backT: Number(lab.dataset.entryThermalBack), heatIn: Number(lab.dataset.entryThermalHeatIn),
    heatRadiated: Number(lab.dataset.entryThermalHeatRadiated), storedEnergy: Number(lab.dataset.entryThermalStoredEnergy),
    energyResidual: Number(lab.dataset.entryThermalEnergyResidual), fluxIn: Number(lab.dataset.entryThermalFluxIn),
    fluxRadiated: Number(lab.dataset.entryThermalFluxRadiated), fluxConducted: Number(lab.dataset.entryThermalFluxConducted),
  }));
}
async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((el: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function labTime(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await setRange(page, '[data-entry-thermal-seek]', time);
  await expect.poll(async () => Math.abs((await telemetry(page)).time - time)).toBeLessThan(0.11);
  await expect(page.locator('[data-entry-thermal-follow]')).toHaveAttribute('aria-pressed', 'false');
  return time;
}
async function entryTime(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await setRange(page, '[data-entry-seek]', time);
  await expect.poll(async () => Math.abs((await saved(page)).entryRun.time - time)).toBeLessThan(0.11);
  return time;
}
async function advanced(page: Page) {
  const details = page.locator('[data-entry-thermal-advanced]');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
}
async function parameters(page: Page, values = EXPERIMENT) {
  await advanced(page);
  for (const [key, value] of [['thickness', values.thickness * 1000], ['conductivity', values.conductivity], ['emissivity', values.emissivity]] as const) {
    await setRange(page, '[data-entry-thermal-parameter="' + key + '"]', value);
    await expect.poll(async () => (await saved(page)).entryThermalPlan[key]).toBe(key === 'thickness' ? value / 1000 : value);
  }
}
async function expected(page: Page, seconds?: number) {
  return page.evaluate(selectedTime => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const entry = P.entryThermalSource(d), plan = P.entryThermalPlan(d.entryThermalPlan), profile = P.entryThermalProfile(entry, plan);
    const time = selectedTime ?? (d.entryThermalFollow === false ? d.entryThermalTime : P.cleanEntryState(d).entryRun?.time || 0);
    return { source: profile.source, plan, summary: profile.summary, sample: P.entryThermalSample(profile, time) };
  }, seconds);
}
async function readings(page: Page) {
  const live = await telemetry(page), calculation = await expected(page, live.time), sample = calculation.sample;
  expect(live.surfaceT).toBeCloseTo(sample.surfaceT, 7); expect(live.backT).toBeCloseTo(sample.backT, 7);
  for (const key of ['heatIn', 'heatRadiated', 'storedEnergy', 'energyResidual', 'fluxIn', 'fluxRadiated', 'fluxConducted'] as const) {
    expect(live[key], key).toBeCloseTo(sample[key], 6);
  }
  await expect(page.locator('[data-entry-thermal-value="surface"]').first()).toHaveText((sample.surfaceT - 273.15).toFixed(1) + ' °C');
  await expect(page.locator('[data-entry-thermal-value="back"]').first()).toHaveText((sample.backT - 273.15).toFixed(1) + ' °C');
  for (const key of ['heatIn', 'heatRadiated', 'storedEnergy'] as const) {
    await expect(page.locator('[data-entry-thermal-value="' + key + '"]').first()).toHaveText((sample[key] / 1e6).toFixed(2) + ' MJ/m²');
  }
  const cells = await page.locator('[data-entry-thermal-cell]').evaluateAll(nodes => nodes.map(node => ({
    temperature: Number((node as HTMLElement).dataset.entryThermalTemperature), depth: Number((node as HTMLElement).dataset.entryThermalDepth),
  })));
  expect(cells).toHaveLength(33);
  for (let i = 0; i < cells.length; i++) {
    expect(cells[i].temperature).toBeCloseTo(sample.temperatures[i], 7);
    expect(cells[i].depth).toBeCloseTo(calculation.plan.thickness * i / 32, 10);
  }
  return calculation;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('material controls and independent cooling inspection preserve flight evidence and rewards', async ({ page }, info) => {
  await mount(page);
  const before = await evidence(page);
  await parameters(page);
  await labTime(page, 150);
  const calculation = await readings(page);
  expect((await saved(page)).entryThermalPlan).toEqual(EXPERIMENT);
  expect(await evidence(page)).toEqual(before);
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  const cooling = await labTime(page, calculation.summary.entryDuration + 100);
  const cooled = await readings(page);
  expect(cooled.sample.phase).toBe('cooling'); expect(cooled.sample.fluxIn).toBe(0);
  await expect(page.locator('[data-entry-thermal-value="phase"]')).toContainText('Zero-input cooling');
  expect((await telemetry(page)).time).toBeCloseTo(cooling, 6);
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-entry-thermal-toggle]').click();
  await expect(page.locator('[data-entry-thermal-panel]')).toHaveCount(0);
  await page.locator('[data-entry-thermal-toggle]').click();
  await readings(page);
  expect(await evidence(page)).toEqual(before);
  await capture(page, info, 'thermal-independent-cooling');
});

test('v1 and v2 source plans remain immutable while lab follow and independent clocks diverge', async ({ page }, info) => {
  for (const version of [1, 2]) {
    const entryRun = { version, angle: -6.5, time: 80, recovery: 0, recorded: false,
      ...(version === 2 ? { plan: GUIDED } : {}) };
    await mount(page, seed({ entryRun, entryPlan: BANK180 }));
    const calculation = await readings(page);
    expect(calculation.source.modelVersion).toBe(version);
    if (version === 2) expect(calculation.source.plan).toEqual(GUIDED);
    else expect(calculation.source.plan).toBeUndefined();
    await expect(page.locator('[data-entry-thermal-source]')).not.toContainText('Fixed bank 180');
    await expect(page.locator('[data-entry-thermal-source]')).toContainText(version === 1 ? 'earlier guided lift' : 'Guided lift');
    await entryTime(page, 100);
    await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(100, 6);
    expect((await telemetry(page)).following).toBe(true);
    await labTime(page, 170);
    const manual = await saved(page);
    expect(manual.entryRun.time).toBeCloseTo(100, 6); expect(manual.entryThermalFollow).toBe(false);
    await entryTime(page, 120);
    expect((await telemetry(page)).time).toBeCloseTo(170, 6);
    await page.locator('[data-entry-thermal-follow]').click();
    await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(120, 6);
    await readings(page);
    const followed = await saved(page);
    expect(followed.entryPlan).toEqual(BANK180);
    expect(followed.entryRun.version).toBe(version); expect(followed.entryRun.recorded).toBe(false);
    expect(followed.entryOutcome).toBeNull(); expect(followed.entryAttempts || []).toEqual([]);
    expect(followed.missionXP).toBe(0); expect(followed.entryAwardedXP).toBe(0);
    await capture(page, info, 'thermal-source-follow-v' + version);
  }
});

test('320 px keyboard controls, thermal charts and slab use readable accessible targets', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await mount(page);
  const before = await evidence(page);
  const thickness = page.locator('[data-entry-thermal-parameter="thickness"]');
  await thickness.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await saved(page)).entryThermalPlan.thickness).toBe(0.051);
  await advanced(page);
  const seek = page.locator('[data-entry-thermal-seek]');
  await seek.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await telemetry(page)).following).toBe(false);
  await expect.poll(async () => (await telemetry(page)).time).toBeGreaterThan(80);
  await page.locator('[data-entry-thermal-peak="surface"]').click();
  await readings(page);
  expect(await evidence(page)).toEqual(before);
  const boxes = await page.locator('[data-entry-thermal-lab] button, [data-entry-thermal-parameter], [data-entry-thermal-seek], [data-entry-thermal-advanced] summary').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { height: b.height, left: b.left, right: b.right };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(10);
  for (const b of boxes) { expect(b.height).toBeGreaterThanOrEqual(44); expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(320); }
  const labelBox = await page.locator('[data-entry-thermal-include-report]').evaluate(el => el.closest('label')!.getBoundingClientRect().height);
  expect(labelBox).toBeGreaterThanOrEqual(44);
  const fonts = await page.locator('[data-entry-thermal-source], [data-entry-thermal-chart-axis], [data-entry-thermal-color-scale], [data-entry-thermal-comparison]').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-entry-thermal-lab]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  expect(violations).toEqual([]);
  await capture(page, info, 'thermal-phone-320');
  await writeFile(join(REPORT, 'thermal-phone-axe.json'), JSON.stringify({ violations, boxes, labelBox, fonts }, null, 2));
});

test('bounded thermal controls and independent time survive reopen without altering entry data', async ({ page }, info) => {
  await mount(page, seed({ entryThermalPlan: { version: 7, thickness: 'large', conductivity: -1, emissivity: 10 },
    entryThermalOpen: false, entryThermalFollow: 'false', entryThermalTime: 1e12, entryThermalIncludeReport: 'true' }));
  const before = await evidence(page);
  await page.locator('[data-entry-thermal-toggle]').click();
  await expect(page.locator('[data-entry-thermal-value="thickness"]').first()).toHaveText('50 mm');
  await parameters(page);
  await labTime(page, 200);
  await page.locator('[data-entry-thermal-include-report]').check();
  const controls = await saved(page), live = await telemetry(page);
  expect(controls.entryThermalPlan).toEqual(EXPERIMENT); expect(controls.entryThermalTime).toBeCloseTo(200, 6);
  expect(controls.entryThermalFollow).toBe(false); expect(controls.entryThermalOpen).toBe(true);
  expect(controls.entryThermalIncludeReport).toBe(true); expect(await evidence(page)).toEqual(before);
  await mount(page, { moonMission: controls });
  await expect(page.locator('[data-entry-thermal-panel]')).toBeVisible();
  await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(200, 6);
  const reopened = await saved(page);
  expect(reopened.entryThermalPlan).toEqual(EXPERIMENT); expect(reopened.entryRun).toEqual(controls.entryRun);
  expect(reopened.entryOutcome).toEqual(controls.entryOutcome); expect(reopened.missionXP).toBe(0);
  expect((await telemetry(page)).surfaceT).toBeCloseTo(live.surfaceT, 7);
  expect((await telemetry(page)).backT).toBeCloseTo(live.backT, 7);
  await readings(page); await capture(page, info, 'thermal-reopened-independent-time');
});

test('optional thermal report and replay preserve the experiment source while entry rewards remain once-only', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, seed({ entryPlan: BANK180 }));
  await parameters(page); await labTime(page, 150);
  await page.locator('[data-entry-thermal-include-report]').check();
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const completed = await saved(page);
  expect(completed.entryOutcome.plan).toEqual(GUIDED); expect(completed.missionXP).toBe(25);
  expect(completed.entryAttempts).toHaveLength(1);
  await page.locator('[data-entry-result]').click();
  expect((await saved(page)).missionXP).toBe(25); expect((await saved(page)).entryAttempts).toHaveLength(1);
  await page.locator('[data-entry-complete]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(10);
  expect((await saved(page)).missionXP).toBe(75);
  await expect(page.locator('[data-entry-thermal-panel]')).toBeVisible();
  await expect(page.locator('[data-entry-thermal-source]')).toContainText('Guided lift');
  const report = await page.locator('[data-moonmission-report-text]').inputValue();
  for (const text of ['Independent thermal experiment (calculated preview)', 'Guided lift', '70.0 mm',
    '0.24 W/(m·K)', 'emissivity 0.65', 'At 150.0 s', '300 s of zero-input cooling', 'No ablation']) expect(report).toContain(text);
  expect(report).not.toContain('Fixed bank 180°');
  await parameters(page, { ...EXPERIMENT, thickness: 0.08 });
  await expect(page.locator('[data-moonmission-report-text]')).toHaveValue(/80\.0 mm/);
  const changed = await saved(page);
  expect(changed.entryOutcome).toEqual(completed.entryOutcome); expect(changed.entryAttempts).toEqual(completed.entryAttempts);
  expect(changed.missionXP).toBe(75); await capture(page, info, 'thermal-included-report-debrief');
  await page.getByRole('button', { name: /Fly Another Mission/ }).click();
  const replay = await saved(page);
  expect(replay.missionPhase).toBe(0); expect(replay.flightHistory).toHaveLength(1);
  expect(replay.flightHistory[0].entry).toEqual(completed.entryOutcome);
  expect(replay.flightHistory[0].thermalPreview.source.plan).toEqual(GUIDED);
  expect(replay.flightHistory[0].thermalPreview.plan).toEqual({ ...EXPERIMENT, thickness: 0.08 });
  expect(replay.entryThermalPlan).toEqual(DEFAULT); expect(replay.entryThermalOpen).toBe(false);
  expect(replay.entryThermalFollow).toBe(true); expect(replay.entryThermalTime).toBe(0); expect(replay.entryThermalIncludeReport).toBe(false);
  const archived = replay.flightHistory[0];
  await mount(page, seed({ entryPlan: BANK180, entryThermalPlan: DEFAULT, flightHistory: replay.flightHistory }));
  const archivedReport = await page.evaluate(summary => (window as any).MoonMissionPure.flightReport(summary), archived);
  expect(archivedReport).toContain('Guided lift'); expect(archivedReport).not.toContain('Fixed bank 180°');
  expect(archivedReport).toContain('80.0 mm'); expect(archivedReport).not.toContain('thickness 50.0 mm');
  expect((await saved(page)).missionXP).toBe(0); expect(errors).toEqual([]);
});
