import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ENTRY_DYNAMICS_REPORT_DIR || 'reports/moon-mission-enhancement-pass16-2026-10-02/browser/dynamics');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const GUIDED = { version: 2, mode: 'guided', bank: 0 };
const BALLISTIC = { version: 2, mode: 'ballistic', bank: 0 };
const BANK90 = { version: 2, mode: 'bank', bank: 90 };
const BANK180 = { version: 2, mode: 'bank', bank: 180 };
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 9, entryAngle: -6.5, entryPlan: GUIDED,
  entryRun: { version: 2, angle: -6.5, plan: GUIDED, time: 80, recovery: 0, recorded: false },
  entryDynamicsOpen: true, entryDynamicsView: 'forces', entryThermalOpen: false,
  animPaused: true, entryPaused: true, soundOff: true, missionXP: 0,
  entryAwardedXP: 0, entryCompletionAwarded: false,
  earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  lunarSamples: [], quizCorrect: 0, ...extra,
} });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-entry-dynamics]')).toBeVisible();
  await expect.poll(async () => page.locator('[data-entry-dynamics]').getAttribute('data-entry-dynamics-time')).not.toBeNull();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function evidence(page: Page) {
  const state = await saved(page);
  return Object.fromEntries(['entryAngle', 'entryPlan', 'entryRun', 'entryOutcome', 'entryAttempts',
    'missionXP', 'entryAwardedXP', 'entryCompletionAwarded'].map(key => [key, state[key] ?? null]));
}
async function time(page: Page) {
  return Number(await page.locator('[data-entry-dynamics]').getAttribute('data-entry-dynamics-time'));
}
async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((el: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function entryTime(page: Page, seconds: number) {
  const next = Math.round(seconds * 10) / 10;
  await setRange(page, '[data-entry-seek]', next);
  await expect.poll(async () => Math.abs((await time(page)) - next)).toBeLessThan(0.11);
  return time(page);
}
async function expected(page: Page, selectedTime?: number) {
  return page.evaluate(seconds => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const source = P.entryDynamicsSource(d), profile = P.entryDynamicsProfile(source);
    const sample = P.entryDynamicsSample(profile, seconds ?? P.cleanEntryState(d).entryRun?.time ?? 0);
    return { source: profile.source, summary: profile.summary, sample };
  }, selectedTime);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  if ((page.viewportSize()?.width || 0) <= 320) await page.locator('[data-entry-dynamics]').screenshot({ path });
  else await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function forceReadings(page: Page) {
  const calculation = await expected(page, await time(page)), row = calculation.sample;
  const svg = page.locator('[data-entry-dynamics-diagram="forces"]');
  const scale = Number(await svg.getAttribute('data-acceleration-scale'));
  expect(scale).toBeGreaterThan(0); await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  for (const key of ['drag', 'lift', 'gravity', 'netPlane'] as const) {
    const vector = row.forces[key], glyph = svg.locator('[data-entry-dynamics-vector="' + key + '"]');
    const actual = await glyph.evaluate((el: SVGGElement) => {
      const line = el.querySelector('line')!, polygon = el.querySelector('polygon')!;
      return { x: Number(el.dataset.x), y: Number(el.dataset.y), magnitude: Number(el.dataset.magnitude),
        force: Number(el.dataset.forceMagnitude), visibility: el.getAttribute('visibility'),
        x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')),
        x2: Number(line.getAttribute('x2')), y2: Number(line.getAttribute('y2')), head: polygon.getAttribute('points') || '' };
    });
    expect(actual.x).toBeCloseTo(vector.x, 8); expect(actual.y).toBeCloseTo(vector.y, 8);
    expect(actual.magnitude).toBeCloseTo(vector.magnitude, 8); expect(actual.force).toBeCloseTo(vector.forceMagnitude, 6);
    expect(actual.x1).toBe(300); expect(actual.y1).toBe(180);
    expect(actual.x2 - actual.x1).toBeCloseTo(scale * vector.x, 8);
    expect(actual.y2 - actual.y1).toBeCloseTo(-scale * vector.y, 8);
    if (vector.magnitude > 1e-9) {
      expect(actual.visibility).toBe('visible'); const tip = actual.head.split(' ')[0].split(',').map(Number);
      expect(tip).toHaveLength(2); expect(tip[0]).toBeCloseTo(actual.x2, 8); expect(tip[1]).toBeCloseTo(actual.y2, 8);
    } else expect(actual.visibility).toBe('hidden');
    await expect(page.locator('[data-entry-dynamics-value="' + key + '"]')).toHaveText(
      vector.magnitude.toFixed(2) + ' m/s² · ' + (vector.forceMagnitude / 1000).toFixed(2) + ' kN');
  }
  const bank = page.locator('[data-entry-dynamics-diagram="bank"]'), bankScale = Number(await bank.getAttribute('data-lift-scale'));
  expect(Number(await bank.getAttribute('data-plane'))).toBeCloseTo(row.liftPlane, 8);
  expect(Number(await bank.getAttribute('data-lateral'))).toBeCloseTo(row.liftLateral, 8);
  expect(Number(await bank.getAttribute('data-full-lift'))).toBeCloseTo(row.liftMagnitude, 8);
  const full = bank.locator('[data-entry-dynamics-vector="fullLift"] line');
  expect(Number(await full.getAttribute('x2')) - 150).toBeCloseTo(bankScale * row.liftLateral, 8);
  expect(Number(await full.getAttribute('y2')) - 110).toBeCloseTo(-bankScale * row.liftPlane, 8);
  await expect(page.locator('[data-entry-dynamics-value="aeroLoadG"]')).toHaveText(row.aeroLoadG.toFixed(2) + ' g');
  await expect(page.locator('[data-entry-dynamics-value="reportedLoadG"]')).toHaveText(row.reportedLoadG.toFixed(2) + ' g');
  return calculation;
}
async function energyReadings(page: Page) {
  const calculation = await expected(page, await time(page)), row = calculation.sample, e = row.energy;
  for (const key of ['kinetic', 'potential', 'dragWork', 'initial'] as const) {
    await expect(page.locator('[data-entry-dynamics-value="' + key + '"]')).toHaveText((e[key] / 1e6).toFixed(3) + ' MJ/kg');
  }
  await expect(page.locator('[data-entry-dynamics-value="residual"]')).toHaveText((e.residual >= 0 ? '+' : '') + e.residual.toFixed(1) + ' J/kg');
  await expect(page.locator('[data-entry-dynamics-value="dragPower"]')).toHaveText(e.dragPower.toFixed(0) + ' W/kg');
  await expect(page.locator('[data-entry-dynamics-value="totalDragWork"]')).toHaveText((e.totalDragWork / 1e9).toFixed(3) + ' GJ');
  const svg = page.locator('[data-entry-dynamics-diagram="energy"]');
  const minimum = Number(await svg.getAttribute('data-energy-min')), maximum = Number(await svg.getAttribute('data-energy-max'));
  expect(maximum).toBeGreaterThan(minimum); expect(maximum).toBeGreaterThanOrEqual(e.initial);
  await expect(svg.locator('[data-entry-dynamics-trace]')).toHaveCount(3);
  const cursor = 10 + 580 * row.time / calculation.summary.duration;
  expect(Number(await svg.locator('[data-entry-dynamics-playhead]').getAttribute('x1'))).toBeCloseTo(cursor, 7);
  for (const key of ['kinetic', 'potential', 'dragWork'] as const) {
    const marker = svg.locator('[data-entry-dynamics-energy-marker="' + key + '"]');
    expect(Number(await marker.getAttribute('cx'))).toBeCloseTo(cursor, 7);
    expect(Number(await marker.getAttribute('cy'))).toBeCloseTo(170 - 160 * (e[key] - minimum) / (maximum - minimum), 7);
    const points = (await svg.locator('[data-entry-dynamics-trace="' + key + '"]').getAttribute('points'))!
      .split(' ').map(pair => pair.split(',').map(Number));
    expect(points.length).toBeGreaterThan(2); expect(points.every(p => p.length === 2 && p.every(Number.isFinite))).toBe(true);
    expect(points[0][0]).toBeCloseTo(10, 3); expect(points[points.length - 1][0]).toBeCloseTo(590, 3);
  }
  expect(Math.abs(e.initial - e.kinetic - e.potential - e.dragWork - e.residual)).toBeLessThan(1e-6);
  await expect(page.locator('[data-entry-dynamics-energy-note]')).toContainText('not the vehicle’s absorbed heat');
  return calculation;
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('full lift, signed projection and physical glyph scales distinguish bank from ballistic motion', async ({ page }, info) => {
  const rows: Record<string, any> = {};
  for (const [name, plan] of [['bank90', BANK90], ['ballistic', BALLISTIC], ['bank180', BANK180]] as const) {
    await mount(page, seed({ entryPlan: GUIDED,
      entryRun: { version: 2, angle: -6.5, plan, time: 20, recovery: 0, recorded: false } }));
    const calculation = await expected(page); await entryTime(page, calculation.summary.peakDragPowerTime);
    const rendered = await forceReadings(page), row = rendered.sample; rows[name] = row;
    expect(row.forces.drag.x * row.velocity.x + row.forces.drag.y * row.velocity.y).toBeLessThan(0);
    expect(Math.abs(row.forces.lift.x * row.velocity.x + row.forces.lift.y * row.velocity.y)).toBeLessThan(1e-6);
    expect(row.forces.gravity.x).toBe(0); expect(row.forces.gravity.y).toBeLessThan(0);
    expect(row.forces.netPlane.x).toBeCloseTo(row.forces.drag.x + row.forces.lift.x, 8);
    expect(row.forces.netPlane.y).toBeCloseTo(row.forces.drag.y + row.forces.lift.y + row.forces.gravity.y, 8);
    await expect(page.locator('[data-entry-complete]')).toBeDisabled(); expect((await saved(page)).missionXP).toBe(0);
    await capture(page, info, 'dynamics-forces-' + name);
  }
  expect(rows.bank90.bank).toBe(90); expect(rows.bank90.liftLateral).toBeGreaterThan(0);
  expect(Math.abs(rows.bank90.liftPlane)).toBeLessThan(1e-8);
  expect(rows.bank90.aeroLoadG).toBeGreaterThan(rows.bank90.forces.drag.magnitude / 9.80665);
  expect(rows.ballistic.liftMagnitude).toBe(0); expect(rows.ballistic.liftLateral).toBe(0);
  expect(rows.bank180.bank).toBe(180); expect(rows.bank180.liftPlane).toBeLessThan(0);
});

test('force and energy views share the entry clock while thermal inspection stays independent', async ({ page }, info) => {
  await mount(page, seed({ entryPlan: BANK180, entryThermalOpen: true, entryThermalFollow: true }));
  const before = await evidence(page);
  await page.locator('[data-entry-dynamics-tab="energy"]').click();
  await energyReadings(page); expect(await evidence(page)).toEqual(before);
  await page.locator('[data-entry-dynamics-toggle]').click();
  await expect(page.locator('[data-entry-dynamics-panel]')).toHaveCount(0);
  await page.locator('[data-entry-dynamics-toggle]').click();
  await expect(page.locator('[data-entry-dynamics-tab="energy"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await evidence(page)).toEqual(before);
  await entryTime(page, 100); await energyReadings(page);
  await expect.poll(async () => Number(await page.locator('[data-entry-thermal-lab]').getAttribute('data-entry-thermal-time'))).toBeCloseTo(100, 6);
  await setRange(page, '[data-entry-thermal-seek]', 170);
  await expect.poll(async () => (await saved(page)).entryThermalFollow).toBe(false);
  expect(await time(page)).toBeCloseTo(100, 6); expect((await saved(page)).entryRun.time).toBeCloseTo(100, 6);
  await entryTime(page, 120); await energyReadings(page);
  expect(Number(await page.locator('[data-entry-thermal-lab]').getAttribute('data-entry-thermal-time'))).toBeCloseTo(170, 6);
  const inspected = await evidence(page);
  await page.locator('[data-entry-dynamics-tab="forces"]').click(); await forceReadings(page);
  expect(await evidence(page)).toEqual(inspected);
  await expect(page.locator('[data-entry-dynamics-source]')).toContainText('Guided lift');
  await expect(page.locator('[data-entry-dynamics-source]')).not.toContainText('Fixed bank 180');
  await page.locator('[data-entry-thermal-follow]').click();
  await expect.poll(async () => Number(await page.locator('[data-entry-thermal-lab]').getAttribute('data-entry-thermal-time'))).toBeCloseTo(120, 6);
  await page.locator('[data-entry-dynamics-tab="energy"]').click(); await capture(page, info, 'dynamics-energy-shared-clock');
  const state = await saved(page); await mount(page, { moonMission: state });
  await expect(page.locator('[data-entry-dynamics-tab="energy"]')).toHaveAttribute('aria-pressed', 'true');
  await energyReadings(page); expect(await evidence(page)).toEqual(inspected);
  expect((await saved(page)).entryDynamicsOpen).toBe(true); expect((await saved(page)).entryDynamicsView).toBe('energy');
});

test('earlier v1 source remains inspectable without a reconstructed bank or receipt changes', async ({ page }, info) => {
  await mount(page, seed({ entryPlan: BANK180,
    entryRun: { version: 1, angle: -6.5, time: 80, recovery: 0, recorded: false } }));
  const before = await evidence(page); const calculation = await forceReadings(page);
  expect(calculation.source.modelVersion).toBe(1); expect(calculation.source.plan).toBeUndefined();
  await expect(page.locator('[data-entry-dynamics-diagram="bank"]')).toHaveAttribute('data-bank', '');
  await expect(page.locator('[data-entry-dynamics-value="bank"]')).toHaveText('Earlier signed in-plane lift');
  await expect(page.locator('[data-entry-dynamics-source]')).not.toContainText('Fixed bank 180');
  await page.locator('[data-entry-dynamics-tab="energy"]').click(); await energyReadings(page);
  expect(await evidence(page)).toEqual(before); await capture(page, info, 'dynamics-v1-energy');
});

test('320 px diagrams and keyboard view controls retain accessible targets and readable units', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 }); await mount(page);
  const before = await evidence(page), toggle = page.locator('[data-entry-dynamics-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-entry-dynamics-panel]')).toHaveCount(0);
  await toggle.focus(); await page.keyboard.press('Enter'); await forceReadings(page);
  await capture(page, info, 'dynamics-phone-forces-320');
  await page.locator('[data-entry-dynamics-tab="energy"]').focus(); await page.keyboard.press('Space');
  await energyReadings(page); expect(await evidence(page)).toEqual(before);
  const boxes = await page.locator('[data-entry-dynamics] button').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { height: b.height, left: b.left, right: b.right };
  }));
  expect(boxes).toHaveLength(3);
  for (const b of boxes) { expect(b.height).toBeGreaterThanOrEqual(44); expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(320); }
  const fonts = await page.locator('[data-entry-dynamics-source], [data-entry-dynamics-energy-axis], [data-entry-dynamics-energy-ledger], [data-entry-dynamics-energy-note]')
    .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-entry-dynamics]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  expect(violations).toEqual([]); await capture(page, info, 'dynamics-phone-energy-320');
  await writeFile(join(REPORT, 'dynamics-phone-axe.json'), JSON.stringify({ violations, boxes, fonts }, null, 2));
});

test('completed report and replay retain own physics, precontact limits and once-only entry rewards', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, seed({ entryPlan: BANK180, entryDynamicsView: 'energy' }));
  await page.locator('[data-entry-result]').click(); await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const completed = await saved(page); expect(completed.entryOutcome.plan).toEqual(GUIDED);
  expect(completed.missionXP).toBe(25); expect(completed.entryAttempts).toHaveLength(1); await energyReadings(page);
  await expect(page.locator('[data-entry-dynamics-endpoint-note]')).toContainText('immediately before water contact');
  await page.locator('[data-entry-result]').click(); expect((await saved(page)).missionXP).toBe(25);
  await page.locator('[data-entry-complete]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(10); expect((await saved(page)).missionXP).toBe(75);
  await expect(page.locator('[data-entry-dynamics-panel]')).toBeVisible(); await energyReadings(page);
  const report = await page.locator('[data-moonmission-report-text]').inputValue();
  const calculatedReport = await page.evaluate(receipt => (window as any).MoonMissionPure.entryDynamicsReport(receipt), completed.entryOutcome);
  expect(calculatedReport).not.toBe(''); expect(report).toContain(calculatedReport);
  expect(report).toContain('Guided lift'); expect(report).not.toContain('Fixed bank 180');
  expect(report).toContain('Stagnation heat flux estimates power per area');
  expect(report).toContain('accumulated heat load estimates energy per area');
  const before = await evidence(page); await page.locator('[data-entry-dynamics-tab="forces"]').click(); await forceReadings(page);
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  await capture(page, info, 'dynamics-completed-precontact');
  await page.getByRole('button', { name: /Fly Another Mission/ }).click(); const replay = await saved(page);
  expect(replay.missionPhase).toBe(0); expect(replay.entryDynamicsOpen).toBe(false); expect(replay.entryDynamicsView).toBe('forces');
  expect(replay.flightHistory).toHaveLength(1); expect(replay.flightHistory[0].entry).toEqual(completed.entryOutcome);
  const archivedReport = await page.evaluate(summary => (window as any).MoonMissionPure.flightReport(summary), replay.flightHistory[0]);
  expect(archivedReport).toContain(calculatedReport); expect(archivedReport).not.toContain('Fixed bank 180'); expect(errors).toEqual([]);
  await mount(page, { moonMission: { ...completed, missionPhase: 10, missionXP: 75, entryRun: null,
    entryDynamicsOpen: true, entryDynamicsView: 'energy' } });
  const receiptOnly = await expected(page);
  expect(await time(page)).toBeCloseTo(receiptOnly.summary.duration, 8);
  await energyReadings(page);
  await expect(page.locator('[data-entry-dynamics-endpoint-note]')).toContainText('immediately before water contact');
  expect((await saved(page)).entryOutcome).toEqual(completed.entryOutcome);
  expect((await saved(page)).missionXP).toBe(75); expect(errors).toEqual([]);
});
