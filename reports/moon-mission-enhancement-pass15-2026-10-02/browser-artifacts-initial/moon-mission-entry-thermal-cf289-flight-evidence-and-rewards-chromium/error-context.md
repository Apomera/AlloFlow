# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-entry-thermal.spec.ts >> material controls and independent cooling inspection preserve flight evidence and rewards
- Location: tests\e2e\moon-mission-entry-thermal.spec.ts:122:5

# Error details

```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { join, resolve } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve(process.env.MM_ENTRY_THERMAL_REPORT_DIR || 'reports/moon-mission-enhancement-pass15-2026-10-02/browser/thermal');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  8   |   width: 1100, height: 1000, layout: 'document', appStyles: true });
  9   | const GUIDED = { version: 2, mode: 'guided', bank: 0 };
  10  | const BANK180 = { version: 2, mode: 'bank', bank: 180 };
  11  | const DEFAULT = { version: 1, thickness: 0.05, conductivity: 0.12, emissivity: 0.85 };
  12  | const EXPERIMENT = { version: 1, thickness: 0.07, conductivity: 0.24, emissivity: 0.65 };
  13  | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  14  |   missionPhase: 9, entryAngle: -6.5, entryPlan: GUIDED,
  15  |   entryRun: { version: 2, angle: -6.5, plan: GUIDED, time: 80, recovery: 0, recorded: false },
  16  |   entryThermalPlan: DEFAULT, entryThermalOpen: true, entryThermalFollow: true,
  17  |   entryThermalTime: 0, entryThermalIncludeReport: false, animPaused: true, entryPaused: true,
  18  |   soundOff: true, missionXP: 0, entryAwardedXP: 0, entryCompletionAwarded: false,
  19  |   earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  20  |   lunarSamples: [], quizCorrect: 0, ...extra,
  21  | } });
  22  | 
  23  | async function mount(page: Page, data = seed()) {
  24  |   await page.goto(harness.url + '/__harness');
> 25  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
      |              ^ TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
  26  |   await page.evaluate(value => {
  27  |     document.getElementById('wrap')!.style.width = '100%';
  28  |     (window as any).__mount(value);
  29  |   }, data);
  30  |   await expect(page.locator('[data-entry-thermal-lab]')).toBeVisible();
  31  |   await expect.poll(async () => page.locator('[data-entry-thermal-lab]').getAttribute('data-entry-thermal-time')).not.toBeNull();
  32  | }
  33  | async function saved(page: Page) {
  34  |   return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
  35  | }
  36  | async function evidence(page: Page) {
  37  |   const state = await saved(page);
  38  |   return Object.fromEntries(['entryAngle', 'entryPlan', 'entryRun', 'entryOutcome', 'entryAttempts',
  39  |     'missionXP', 'entryAwardedXP', 'entryCompletionAwarded'].map(key => [key, state[key] ?? null]));
  40  | }
  41  | async function telemetry(page: Page) {
  42  |   return page.locator('[data-entry-thermal-lab]').evaluate((lab: HTMLElement) => ({
  43  |     time: Number(lab.dataset.entryThermalTime), following: lab.dataset.entryThermalFollowing === 'true',
  44  |     phase: lab.dataset.entryThermalPhase, surfaceT: Number(lab.dataset.entryThermalSurface),
  45  |     backT: Number(lab.dataset.entryThermalBack), heatIn: Number(lab.dataset.entryThermalHeatIn),
  46  |     heatRadiated: Number(lab.dataset.entryThermalHeatRadiated), storedEnergy: Number(lab.dataset.entryThermalStoredEnergy),
  47  |     energyResidual: Number(lab.dataset.entryThermalEnergyResidual), fluxIn: Number(lab.dataset.entryThermalFluxIn),
  48  |     fluxRadiated: Number(lab.dataset.entryThermalFluxRadiated), fluxConducted: Number(lab.dataset.entryThermalFluxConducted),
  49  |   }));
  50  | }
  51  | async function setRange(page: Page, selector: string, value: number) {
  52  |   await page.locator(selector).evaluate((el: HTMLInputElement, next) => {
  53  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(next));
  54  |     el.dispatchEvent(new Event('input', { bubbles: true }));
  55  |     el.dispatchEvent(new Event('change', { bubbles: true }));
  56  |   }, value);
  57  | }
  58  | async function labTime(page: Page, seconds: number) {
  59  |   const time = Math.round(seconds * 10) / 10;
  60  |   await setRange(page, '[data-entry-thermal-seek]', time);
  61  |   await expect.poll(async () => Math.abs((await telemetry(page)).time - time)).toBeLessThan(0.11);
  62  |   await expect(page.locator('[data-entry-thermal-follow]')).toHaveAttribute('aria-pressed', 'false');
  63  |   return time;
  64  | }
  65  | async function entryTime(page: Page, seconds: number) {
  66  |   const time = Math.round(seconds * 10) / 10;
  67  |   await setRange(page, '[data-entry-seek]', time);
  68  |   await expect.poll(async () => Math.abs((await saved(page)).entryRun.time - time)).toBeLessThan(0.11);
  69  |   return time;
  70  | }
  71  | async function advanced(page: Page) {
  72  |   const details = page.locator('[data-entry-thermal-advanced]');
  73  |   if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  74  | }
  75  | async function parameters(page: Page, values = EXPERIMENT) {
  76  |   await advanced(page);
  77  |   for (const [key, value] of [['thickness', values.thickness * 1000], ['conductivity', values.conductivity], ['emissivity', values.emissivity]] as const) {
  78  |     await setRange(page, '[data-entry-thermal-parameter="' + key + '"]', value);
  79  |     await expect.poll(async () => (await saved(page)).entryThermalPlan[key]).toBe(key === 'thickness' ? value / 1000 : value);
  80  |   }
  81  | }
  82  | async function expected(page: Page, seconds?: number) {
  83  |   return page.evaluate(selectedTime => {
  84  |     const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
  85  |     const entry = P.entryThermalSource(d), plan = P.entryThermalPlan(d.entryThermalPlan), profile = P.entryThermalProfile(entry, plan);
  86  |     const time = selectedTime ?? (d.entryThermalFollow === false ? d.entryThermalTime : P.cleanEntryState(d).entryRun?.time || 0);
  87  |     return { source: profile.source, plan, summary: profile.summary, sample: P.entryThermalSample(profile, time) };
  88  |   }, seconds);
  89  | }
  90  | async function readings(page: Page) {
  91  |   const live = await telemetry(page), calculation = await expected(page, live.time), sample = calculation.sample;
  92  |   expect(live.surfaceT).toBeCloseTo(sample.surfaceT, 7); expect(live.backT).toBeCloseTo(sample.backT, 7);
  93  |   for (const key of ['heatIn', 'heatRadiated', 'storedEnergy', 'energyResidual', 'fluxIn', 'fluxRadiated', 'fluxConducted'] as const) {
  94  |     expect(live[key], key).toBeCloseTo(sample[key], 6);
  95  |   }
  96  |   await expect(page.locator('[data-entry-thermal-value="surface"]').first()).toHaveText((sample.surfaceT - 273.15).toFixed(1) + ' °C');
  97  |   await expect(page.locator('[data-entry-thermal-value="back"]').first()).toHaveText((sample.backT - 273.15).toFixed(1) + ' °C');
  98  |   for (const key of ['heatIn', 'heatRadiated', 'storedEnergy'] as const) {
  99  |     await expect(page.locator('[data-entry-thermal-value="' + key + '"]').first()).toHaveText((sample[key] / 1e6).toFixed(2) + ' MJ/m²');
  100 |   }
  101 |   const cells = await page.locator('[data-entry-thermal-cell]').evaluateAll(nodes => nodes.map(node => ({
  102 |     temperature: Number((node as HTMLElement).dataset.entryThermalTemperature), depth: Number((node as HTMLElement).dataset.entryThermalDepth),
  103 |   })));
  104 |   expect(cells).toHaveLength(33);
  105 |   for (let i = 0; i < cells.length; i++) {
  106 |     expect(cells[i].temperature).toBeCloseTo(sample.temperatures[i], 7);
  107 |     expect(cells[i].depth).toBeCloseTo(calculation.plan.thickness * i / 32, 10);
  108 |   }
  109 |   return calculation;
  110 | }
  111 | async function capture(page: Page, info: TestInfo, name: string) {
  112 |   await mkdir(REPORT, { recursive: true });
  113 |   const path = join(REPORT, name + '-' + info.project.name + '.png');
  114 |   await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
  115 | }
  116 | 
  117 | test.describe.configure({ timeout: 180000, retries: 0 });
  118 | test.beforeAll(async () => harness.start());
  119 | test.afterAll(async () => harness.stop());
  120 | test.afterEach(async ({ page }) => harness.destroy(page));
  121 | 
  122 | test('material controls and independent cooling inspection preserve flight evidence and rewards', async ({ page }, info) => {
  123 |   await mount(page);
  124 |   const before = await evidence(page);
  125 |   await parameters(page);
```