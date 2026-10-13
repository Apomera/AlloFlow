import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_DIRECTOR_REPORT_DIR || 'reports/moon-mission-enhancement-pass43-2026-10-10/browser/director');
const MAIN = '[data-ascent-canvas]', DIRECTOR = '[data-ascent-attitude-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = () => ({ moonMission: { missionPhase: 7, animPaused: true, ascentPaused: true, ascentView: 'surface',
  soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });

async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface');
  await expect(page.locator(DIRECTOR)).toBeVisible();
  await expect.poll(() => page.locator(DIRECTOR).getAttribute('data-director-speed')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function seek(page: Page, seconds: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(time));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(seconds, 6);
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-ascent-workspace]' : DIRECTOR).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function pixels(page: Page) {
  return page.locator(DIRECTOR).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}
async function instruments(page: Page, row: any) {
  const angle = (value: number) => { const fixed = value.toFixed(1); return (fixed === '-0.0' ? '0.0' : fixed) + '°'; };
  await expect(page.locator('[data-ascent-value="pitch"]')).toHaveText(angle(row.sample.pitch * 180 / Math.PI));
  await expect(page.locator('[data-ascent-value="flightPath"]')).toHaveText(row.speed > 1e-8 ? angle(Math.atan2(row.sample.radialSpeed, row.sample.tangentialSpeed) * 180 / Math.PI) : '— (at rest)');
  await expect(page.locator(DIRECTOR)).toHaveAttribute('aria-describedby', 'mm-ascent-attitude-note');
  await expect(page.locator(DIRECTOR)).toHaveAttribute('aria-label', /Local ascent attitude/i);
  await expect(page.locator('#mm-ascent-attitude-note')).toBeVisible();
}
async function measured(page: Page) {
  return page.locator(DIRECTOR).evaluate((cv: HTMLCanvasElement) => {
    const main = document.querySelector('[data-ascent-canvas]') as HTMLCanvasElement;
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile(), sample = P.ascentSample(profile, Number(main.dataset.ascentTime));
    const speed = Math.hypot(sample.radialSpeed, sample.tangentialSpeed), firing = sample.engineOn && sample.thrust > 0;
    const axis = { x: Math.sin(sample.pitch), y: -Math.cos(sample.pitch) };
    const velocity = speed > 1e-8 ? { x: sample.tangentialSpeed / speed, y: -sample.radialSpeed / speed } : null;
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const width = cv.width / 2, height = cv.height / 2, cx = 66, cy = 96;
    let cyan = 0, amber = 0, velocityShaft = 0, thrustShaft = 0;
    // This bounded region includes the compass and vector shafts, excluding the
    // colored footer legends. Color alone cannot make a missing arrow pass.
    for (let y = Math.ceil((cy - 48) * 2); y < Math.floor((cy + 48) * 2); y++) for (let x = Math.ceil((cx - 48) * 2); x < Math.floor((cx + 48) * 2); x++) {
      const i = (y * cv.width + x) * 4, red = data[i], green = data[i + 1], blue = data[i + 2];
      const isCyan = red < 130 && green > 165 && blue > 190, isAmber = red > 210 && green > 120 && green < 205 && blue < 90;
      const dx = x / 2 - cx, dy = y / 2 - cy;
      if (isCyan) {
        cyan++;
        if (velocity && dx * velocity.x + dy * velocity.y >= 8 && dx * velocity.x + dy * velocity.y <= 38 && Math.abs(dx * velocity.y - dy * velocity.x) <= 5) velocityShaft++;
      }
      if (isAmber) {
        amber++;
        if (dx * axis.x + dy * axis.y >= 8 && dx * axis.x + dy * axis.y <= 30 && Math.abs(dx * axis.y - dy * axis.x) <= 5) thrustShaft++;
      }
    }
    const attr = (key: string) => cv.dataset[key];
    return { sample, speed, firing, width, height, cssWidth: cv.getBoundingClientRect().width, cssHeight: cv.getBoundingClientRect().height,
      mainWidth: main.width / 2, mainPitch: main.dataset.ascentPitch, mainPath: main.dataset.ascentFlightPath,
      surfaceThrustVisible: main.dataset.ascentSurfaceThrustVisible, axis, velocity,
      pitch: attr('directorPitch'), path: attr('directorPath'), engine: attr('directorEngine'), recordedSpeed: attr('directorSpeed'),
      axisX: attr('directorAxisX'), axisY: attr('directorAxisY'), velocityX: attr('directorVelocityX'), velocityY: attr('directorVelocityY'),
      thrustX: attr('directorThrustX'), thrustY: attr('directorThrustY'),
      cx: attr('directorCenterX'), cy: attr('directorCenterY'), radius: attr('directorRadius'), axisLength: attr('directorAxisLength'),
      velocityLength: attr('directorVelocityLength'), thrustLength: attr('directorThrustLength'), cyan, amber, velocityShaft, thrustShaft };
  });
}
function check(row: any) {
  expect(row.height).toBe(164); expect(row.cssHeight).toBeCloseTo(164, 6); expect(row.cssWidth).toBeCloseTo(row.width, 6);
  expect(row.width).toBe(row.mainWidth); expect(Number(row.cx)).toBe(66); expect(Number(row.cy)).toBe(96); expect(Number(row.radius)).toBe(44);
  expect(Number(row.axisLength)).toBe(40); expect(Number(row.velocityLength)).toBe(32); expect(Number(row.thrustLength)).toBe(24);
  const pitch = row.sample.pitch * 180 / Math.PI, path = Math.atan2(row.sample.radialSpeed, row.sample.tangentialSpeed) * 180 / Math.PI;
  expect(Number(row.pitch)).toBeCloseTo(pitch, 10); expect(Number(row.mainPitch)).toBeCloseTo(row.sample.pitch, 12);
  expect(Number(row.recordedSpeed)).toBeCloseTo(row.speed, 9);
  expect(Number(row.axisX)).toBeCloseTo(Math.sin(row.sample.pitch), 12); expect(Number(row.axisY)).toBeCloseTo(-Math.cos(row.sample.pitch), 12);
  expect(Math.hypot(Number(row.axisX), Number(row.axisY))).toBeCloseTo(1, 12);
  expect(row.engine).toBe(row.firing ? 'on' : 'off'); expect(row.surfaceThrustVisible).toBe(String(row.firing));
  if (row.speed > 1e-8) {
    expect(Number(row.path)).toBeCloseTo(path, 10); expect(Number(row.mainPath)).toBeCloseTo(path, 10);
    expect(Number(row.velocityX)).toBeCloseTo(row.sample.tangentialSpeed / row.speed, 12);
    expect(Number(row.velocityY)).toBeCloseTo(-row.sample.radialSpeed / row.speed, 12);
    expect(Math.hypot(Number(row.velocityX), Number(row.velocityY))).toBeCloseTo(1, 12);
    expect(row.velocityShaft).toBeGreaterThan(5);
  } else {
    expect(row.path).toBe(''); expect(row.mainPath).toBe(''); expect(row.velocityX).toBe(''); expect(row.velocityY).toBe(''); expect(row.cyan).toBe(0);
  }
  if (row.firing) {
    expect(Number(row.thrustX)).toBeCloseTo(Math.sin(row.sample.pitch), 12); expect(Number(row.thrustY)).toBeCloseTo(-Math.cos(row.sample.pitch), 12);
    expect(row.thrustShaft).toBeGreaterThan(5);
  } else { expect(row.thrustX).toBe(''); expect(row.thrustY).toBe(''); expect(row.amber).toBe(0); }
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

test('local ascent attitude separates measured pitch, velocity and thrust through playback, views and responsive saved reload', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await page.addInitScript(() => {
    (window as any).__directorText = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (this.canvas.hasAttribute('data-ascent-attitude-canvas')) {
        const m = this.measureText(text), scale = this.getTransform().a;
        const left = this.textAlign === 'right' ? x - m.width : this.textAlign === 'center' ? x - m.width / 2 : x;
        (window as any).__directorText.push({ text, left, right: left + m.width, top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent, width: this.canvas.width / scale, height: this.canvas.height / scale });
      }
      return fill.call(this, text, x, y, maxWidth as number);
    };
  });
  await mount(page); const rows: any[] = [];
  for (const time of [0, 4, 120, 300]) {
    await seek(page, time); const row = await measured(page); check(row); await instruments(page, row); rows.push(row);
    expect(row.width).toBe(986); expect((await saved(page)).missionXP).toBe(0);
    if (time === 0 || time === 120) await capture(page, info, 'director-' + (time === 0 ? 'rest' : 'pitch') + '-1100');
  }
  const paused = await flight(page), still = await pixels(page); await page.waitForTimeout(250); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-view-control]').selectOption('physical');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'physical'); expect(await flight(page)).toEqual(paused); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-view-control]').selectOption('surface');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface'); expect(await flight(page)).toEqual(paused); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-complete-review]').click();
  await expect(page.locator(DIRECTOR)).toHaveAttribute('data-director-engine', 'off');
  const cutoff = await measured(page); check(cutoff); await instruments(page, cutoff); rows.push(cutoff);
  expect(cutoff.speed).toBeGreaterThan(1000); expect(cutoff.sample.engineOn).toBe(false);
  const completed = await saved(page), measuredFlight = await flight(page);
  expect(completed.ascentRun.recorded).toBe(true); expect(completed.ascentResult.outcome).toBe('orbit'); expect(completed.missionXP).toBe(0);
  await capture(page, info, 'director-cutoff-1100'); await accessibility(page, info, 'director-a11y-1100');
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(DIRECTOR).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await measured(page); check(phone); await instruments(page, phone); rows.push(phone); expect(await flight(page)).toEqual(measuredFlight);
  await capture(page, info, 'director-cutoff-320'); await accessibility(page, info, 'director-a11y-320');
  const phonePixels = await pixels(page); await mount(page, { moonMission: await saved(page) });
  expect(await flight(page)).toEqual(measuredFlight); expect(await pixels(page)).toBe(phonePixels);
  check(await measured(page)); await seek(page, 4); const replay = await measured(page); check(replay); await instruments(page, replay); rows.push(replay);
  await capture(page, info, 'director-rise-320'); await capture(page, info, 'director-workspace-rise-320', true);
  expect((await saved(page)).ascentResult).toEqual(completed.ascentResult); expect((await saved(page)).ascentRun.recorded).toBe(true);
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeGreaterThan(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
  const text = await page.evaluate(() => (window as any).__directorText);
  expect(text.length).toBeGreaterThan(0);
  for (const t of text) { expect(t.left, t.text).toBeGreaterThanOrEqual(0); expect(t.right, t.text).toBeLessThanOrEqual(t.width); expect(t.top, t.text).toBeGreaterThanOrEqual(0); expect(t.bottom, t.text).toBeLessThanOrEqual(t.height); }
  expect(errors).toEqual([]); await writeFile(join(REPORT, 'director-measured.json'), JSON.stringify({ rows, text, errors, overflow }, null, 2));
});
