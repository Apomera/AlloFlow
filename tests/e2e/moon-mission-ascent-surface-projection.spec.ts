import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_SURFACE_REPORT_DIR || 'reports/moon-mission-enhancement-pass42-2026-10-10/browser/surface');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = () => ({ moonMission: { missionPhase: 7, animPaused: true, ascentPaused: true, ascentView: 'surface',
  soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'surface');
  await expect.poll(() => page.locator('[data-ascent-canvas]').getAttribute('data-ascent-surface-scale')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function seek(page: Page, time: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, seconds) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(seconds));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator('[data-ascent-canvas]').getAttribute('data-ascent-time'))).toBeCloseTo(time, 6);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-ascent-canvas]').screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function pixels(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261; for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619); return hash >>> 0;
  });
}
async function geometry(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile(), time = Number(cv.dataset.ascentTime), sample = P.ascentSample(profile, time);
    const width = cv.width / 2, height = cv.height / 2, g = P.ascentSurfaceGeometry(width, height, sample, profile);
    const image = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const craftX = Number(cv.dataset.ascentCraftX), craftY = Number(cv.dataset.ascentCraftY);
    let markerWhite = 0;
    for (let y = Math.floor((craftY - 5) * 2); y <= Math.ceil((craftY + 5) * 2); y++) for (let x = Math.floor((craftX - 5) * 2); x <= Math.ceil((craftX + 5) * 2); x++) {
      const i = (y * cv.width + x) * 4;
      if (image[i] > 180 && image[i + 1] > 180 && image[i + 2] > 180 && Math.max(image[i], image[i + 1], image[i + 2]) - Math.min(image[i], image[i + 1], image[i + 2]) < 35) markerWhite++;
    }
    const point = g.surfacePoints[Math.floor(g.surfacePoints.length * 0.65)];
    let groundGray = 0;
    for (let y = Math.floor((point.y + 4) * 2); y < Math.ceil((point.y + 8) * 2); y++) for (let x = Math.floor(point.x * 2); x < Math.ceil((point.x + 4) * 2); x++) {
      const i = (y * cv.width + x) * 4;
      if (image[i] > 55 && image[i + 1] > 55 && image[i + 2] > 55 && Math.max(image[i], image[i + 1], image[i + 2]) - Math.min(image[i], image[i + 1], image[i + 2]) < 35) groundGray++;
    }
    return { width, height, sample, R: P.ascent.radius, geometry: g, markerWhite, groundGray,
      scale: Number(cv.dataset.ascentSurfaceScale), originX: Number(cv.dataset.ascentOriginX), originY: Number(cv.dataset.ascentOriginY),
      craftX, craftY, artX: Number(cv.dataset.ascentArtX), artY: Number(cv.dataset.ascentArtY), attitude: Number(cv.dataset.ascentAttitude) };
  });
}
function check(row: any) {
  const r = row.R + row.sample.altitude, angle = row.sample.angle;
  const x = (row.craftX - row.originX) / row.scale, y = (row.originY - row.craftY) / row.scale;
  expect(x).toBeCloseTo(r * Math.sin(angle), 6); expect(y).toBeCloseTo(r * Math.cos(angle) - row.R, 6);
  expect(Math.hypot(x, y + row.R)).toBeCloseTo(r, 6);
  expect(row.attitude).toBeCloseTo(angle + row.sample.pitch, 12);
  expect(row.markerWhite).toBeGreaterThan(5); expect(row.groundGray).toBeGreaterThan(15);
  expect(row.craftX).toBeGreaterThan(0); expect(row.craftX).toBeLessThan(row.width);
  expect(row.craftY).toBeGreaterThan(54); expect(row.craftY).toBeLessThan(row.height - 55);
  expect(row.artX).toBeCloseTo(row.geometry.artX, 9); expect(row.artY).toBeCloseTo(row.geometry.artY, 9);
}
async function plumeClipping(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile(), sample = P.ascentSample(profile, 4);
    const width = cv.width / 2, height = cv.height / 2, g = P.ascentSurfaceGeometry(width, height, sample, profile);
    const render = (firing: boolean) => {
      const scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = cv.height;
      const ctx = scratch.getContext('2d')!; ctx.scale(2, 2);
      P.drawAscentScene(ctx, width, height, { ...sample, engineOn: firing, thrust: firing ? sample.thrust : 0 }, profile, { view: 'surface', time: sample.time });
      return ctx.getImageData(0, 0, scratch.width, scratch.height).data;
    };
    const burning = render(true), off = render(false); let belowGroundDifferences = 0, skyDifferences = 0;
    for (let x = 0; x < cv.width; x++) {
      const dx = (x / 2 - g.originX) / g.pictureScale;
      const ground = g.originY + (P.ascent.radius - Math.sqrt(P.ascent.radius ** 2 - dx ** 2)) * g.pictureScale;
      for (let y = 110; y < cv.height - 112; y++) {
        const i = (y * cv.width + x) * 4;
        if (burning[i] === off[i] && burning[i + 1] === off[i + 1] && burning[i + 2] === off[i + 2]) continue;
        if (y / 2 > ground + 3) belowGroundDifferences++; else if (y / 2 < ground - 3) skyDifferences++;
      }
    }
    return { belowGroundDifferences, skyDifferences };
  });
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

test('curved lunar ascent surface preserves measured coordinates, clipped exhaust, state and responsive replay', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as any).__surfaceText = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (this.canvas.dataset.ascentView === 'surface' || text === 'CURVED SURFACE TRACK') {
        const m = this.measureText(text), scale = this.getTransform().a;
        const left = this.textAlign === 'right' ? x - m.width : this.textAlign === 'center' ? x - m.width / 2 : x;
        (window as any).__surfaceText.push({ text, left, right: left + m.width, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent, width: this.canvas.width / scale, height: this.canvas.height / scale });
      }
      return fill.call(this, text, x, y, maxWidth as number);
    };
  });
  await mount(page); const rows: any[] = [];
  for (const time of [0, 4, 15, 120, 300]) {
    await seek(page, time); const row = await geometry(page); check(row); rows.push(row);
    expect((await saved(page)).missionXP).toBe(0);
    if ([0, 4, 120].includes(time)) await capture(page, info, 'surface-' + (time === 0 ? 'liftoff' : time === 4 ? 'rise' : 'burn') + '-1100');
  }
  const clipping = await plumeClipping(page); expect(clipping.belowGroundDifferences).toBe(0); expect(clipping.skyDifferences).toBeGreaterThan(20);
  await page.locator('[data-ascent-complete-review]').click();
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-engine', 'off');
  const cutoff = await geometry(page); check(cutoff); expect(cutoff.geometry.worldY).toBeLessThan(0); rows.push(cutoff);
  await capture(page, info, 'surface-cutoff-1100'); await accessibility(page, info, 'surface-a11y-1100');
  const completed = await saved(page), measured = await flight(page), still = await pixels(page);
  expect(completed.ascentRun.recorded).toBe(true); expect(completed.missionXP).toBe(0);
  await page.waitForTimeout(250); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-view-control]').selectOption('physical');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'physical'); expect(await flight(page)).toEqual(measured);
  await page.locator('[data-ascent-view-control]').selectOption('surface');
  await expect(page.locator('[data-ascent-canvas]')).toHaveAttribute('data-ascent-view', 'surface'); expect(await pixels(page)).toBe(still);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phone = await geometry(page); check(phone); rows.push(phone); expect(await flight(page)).toEqual(measured);
  await capture(page, info, 'surface-cutoff-320'); await accessibility(page, info, 'surface-a11y-320');
  const phonePixels = await pixels(page); await mount(page, { moonMission: await saved(page) });
  expect(await flight(page)).toEqual(measured); expect(await pixels(page)).toBe(phonePixels);
  await seek(page, 4); check(await geometry(page)); await capture(page, info, 'surface-rise-320');
  expect((await saved(page)).ascentResult).toEqual(completed.ascentResult); expect((await saved(page)).ascentRun.recorded).toBe(true);
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator('[data-ascent-canvas]').getAttribute('data-ascent-time'))).toBeGreaterThan(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
  const text = await page.evaluate(() => (window as any).__surfaceText);
  for (const t of text) { expect(t.left, t.text).toBeGreaterThanOrEqual(0); expect(t.right, t.text).toBeLessThanOrEqual(t.width); expect(t.top, t.text).toBeGreaterThanOrEqual(0); expect(t.bottom, t.text).toBeLessThanOrEqual(t.height); }
  expect(errors).toEqual([]); await writeFile(join(REPORT, 'surface-measured.json'), JSON.stringify({ rows, clipping, text, errors, overflow }, null, 2));
});
