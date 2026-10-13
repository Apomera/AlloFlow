import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_ORBIT_REPORT_DIR || 'reports/moon-mission-enhancement-pass41-2026-10-10/browser/orbit');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 7, animPaused: true, ascentPaused: true, soundOff: true, missionXP: 0,
  missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra,
} });
async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-ascent-canvas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-ascent-canvas]').getAttribute('data-ascent-time')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function seek(page: Page, seconds: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(time));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await expect.poll(async () => Number(await page.locator('[data-ascent-canvas]').getAttribute('data-ascent-time'))).toBeCloseTo(seconds, 6);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-ascent-canvas]').screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function pixels(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let hash = 2166136261; for (const value of data) hash = Math.imul(hash ^ value, 16777619); return hash >>> 0;
  });
}
async function geometry(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, p = P.ascentProfile(), time = Number(cv.dataset.ascentTime), s = P.ascentSample(p, time);
    const width = cv.width / 2, height = cv.height / 2, g = P.ascentPhysicalOrbitGeometry(width, height, s, p);
    const r = P.ascent.radius + s.altitude;
    const expectedX = r * Math.sin(s.angle), expectedY = r * Math.cos(s.angle);
    const ctx = cv.getContext('2d')!, data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let chartCyan = 0, orbitAmber = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4, red = data[i], green = data[i + 1], blue = data[i + 2];
      if (x / 2 >= g.chart.left && x / 2 <= g.chart.left + g.chart.width && y / 2 >= g.chart.top && y / 2 <= g.chart.top + g.chart.height && red < 130 && green > 165 && blue > 190) chartCyan++;
      if (x / 2 >= g.map.left && x / 2 <= g.map.left + g.map.width && y / 2 >= g.map.top && y / 2 <= g.map.top + g.map.height && red > 210 && green > 120 && green < 205 && blue < 90) orbitAmber++;
    }
    return { width, height, sample: s, map: g.map, chart: g.chart, scale: Number(cv.dataset.ascentMapScale),
      moonRadius: Number(cv.dataset.ascentMoonRadius), moonX: Number(cv.dataset.ascentMoonX), moonY: Number(cv.dataset.ascentMoonY),
      craftX: Number(cv.dataset.ascentCraftX), craftY: Number(cv.dataset.ascentCraftY), expectedX, expectedY,
      radius: P.ascent.radius, altitudeMax: g.altitudeMax, timeMax: g.timeMax, chartCurrent: g.chartCurrent,
      orbit: g.orbit, orbitVisible: cv.dataset.ascentOrbitVisible, chartCyan, orbitAmber };
  });
}
function assertGeometry(row: any) {
  expect(row.moonRadius / row.scale).toBeCloseTo(row.radius, 5);
  expect((row.craftX - row.moonX) / row.scale).toBeCloseTo(row.expectedX, 5);
  expect((row.moonY - row.craftY) / row.scale).toBeCloseTo(row.expectedY, 5);
  expect((row.chartCurrent.x - row.chart.left) / row.chart.width * row.timeMax).toBeCloseTo(row.sample.time, 8);
  expect((row.chart.top + row.chart.height - row.chartCurrent.y) / row.chart.height * row.altitudeMax).toBeCloseTo(row.sample.altitude, 7);
  expect(row.craftX).toBeGreaterThan(row.map.left); expect(row.craftX).toBeLessThan(row.map.left + row.map.width);
  expect(row.craftY).toBeGreaterThan(row.map.top); expect(row.craftY).toBeLessThan(row.map.top + row.map.height);
  if (row.sample.time > 10) expect(row.chartCyan).toBeGreaterThan(25);
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('ascent physical orbit and altitude history preserve measured flight through view selection, cutoff, phone and reload', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await page.addInitScript(() => {
    (window as any).__orbitText = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (this.canvas.dataset.ascentView === 'physical' || text === 'PHYSICAL LUNAR ORBIT') {
        const m = this.measureText(text), w = m.width, scale = this.getTransform().a;
        const left = this.textAlign === 'right' ? x - w : this.textAlign === 'center' ? x - w / 2 : x;
        (window as any).__orbitText.push({ text, left, right: left + w, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent, width: this.canvas.width / scale, height: this.canvas.height / scale });
      }
      return fill.call(this, text, x, y, maxWidth as number);
    };
  });
  await mount(page); await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'surface');
  const original = await flight(page);
  await page.locator('[data-ascent-view-control]').focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ascent-view-control]')).toHaveValue('physical');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'physical');
  expect(await flight(page)).toEqual(original);
  const rows = [];
  for (const time of [0, 10, 120, 300]) {
    await seek(page, time); const row = await geometry(page); assertGeometry(row); expect(row.orbit).toBeNull(); expect(row.orbitVisible).toBe('false'); rows.push(row);
    expect((await saved(page)).missionXP).toBe(0);
  }
  await capture(page, info, 'orbit-powered-1100');
  const paused = await flight(page), still = await pixels(page); await page.waitForTimeout(250); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-view-control]').selectOption('surface');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'surface'); expect(await flight(page)).toEqual(paused);
  await page.locator('[data-ascent-view-control]').selectOption('physical');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'physical'); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-complete-review]').click();
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-orbit-visible', 'true');
  const cutoff = await geometry(page); assertGeometry(cutoff); expect(cutoff.orbitAmber).toBeGreaterThan(100); expect(cutoff.sample.engineOn).toBe(false);
  const completed = await saved(page); expect(completed.ascentRun.recorded).toBe(true); expect(completed.ascentResult.outcome).toBe('orbit'); expect(completed.missionXP).toBe(0);
  expect(cutoff.orbit.perilune).toBeCloseTo(completed.ascentResult.perilune, 5); expect(cutoff.orbit.apolune).toBeCloseTo(completed.ascentResult.apolune, 5);
  rows.push(cutoff); await capture(page, info, 'orbit-insertion-1100'); await accessibility(page, info, 'orbit-a11y-1100');
  await page.locator('[data-ascent-view-control]').selectOption('auto');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'physical');
  const completedFlight = await flight(page); await page.locator('[data-ascent-view-control]').selectOption('physical'); expect(await flight(page)).toEqual(completedFlight);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phone = await geometry(page); assertGeometry(phone); expect(phone.chart.top).toBeGreaterThan(phone.map.top + phone.map.height); rows.push(phone);
  expect(await flight(page)).toEqual(completedFlight); await capture(page, info, 'orbit-insertion-320'); await accessibility(page, info, 'orbit-a11y-320');
  const phonePixels = await pixels(page), stored = await saved(page); await mount(page, { moonMission: stored });
  await expect(page.locator('[data-ascent-view-control]')).toHaveValue('physical');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'physical'); expect(await pixels(page)).toBe(phonePixels); expect(await flight(page)).toEqual(completedFlight);
  await seek(page, 120); const reviewed = await geometry(page); assertGeometry(reviewed); expect(reviewed.orbit).toBeNull();
  expect((await saved(page)).ascentResult).toEqual(completed.ascentResult); expect((await saved(page)).ascentRun.recorded).toBe(true);
  await capture(page, info, 'orbit-review-320');
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator('[data-ascent-canvas]').getAttribute('data-ascent-time'))).toBeGreaterThan(120);
  const bounds = await page.locator('[data-ascent-workspace]').evaluate(el => ({ overflow: document.documentElement.scrollWidth > innerWidth,
    selector: (() => { const b = el.querySelector('[data-ascent-view-control]')!.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height }; })() }));
  expect(bounds.overflow).toBe(false); expect(bounds.selector.left).toBeGreaterThanOrEqual(0); expect(bounds.selector.right).toBeLessThanOrEqual(320); expect(bounds.selector.height).toBeGreaterThanOrEqual(44);
  const text = await page.evaluate(() => (window as any).__orbitText);
  for (const t of text) { expect(t.left, t.text).toBeGreaterThanOrEqual(0); expect(t.right, t.text).toBeLessThanOrEqual(t.width); expect(t.top, t.text).toBeGreaterThanOrEqual(0); expect(t.bottom, t.text).toBeLessThanOrEqual(t.height); }
  await mount(page, seed({ ascentView: { hostile: 'physical' } })); await expect(page.locator('[data-ascent-view-control]')).toHaveValue('auto');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'surface'); expect((await saved(page)).missionXP).toBe(0);
  expect(errors).toEqual([]); await writeFile(join(REPORT, 'orbit-measured.json'), JSON.stringify({ rows, bounds, text, errors }, null, 2));
});
