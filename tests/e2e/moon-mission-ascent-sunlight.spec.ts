import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_SUNLIGHT_REPORT_DIR || 'reports/moon-mission-enhancement-pass46-2026-10-10/browser/sunlight');
const MAIN = '[data-ascent-canvas]';
const SUN = { x: Math.cos(17 * Math.PI / 180) * Math.cos(Math.atan2(15, 40)),
  y: Math.sin(17 * Math.PI / 180), z: Math.cos(17 * Math.PI / 180) * Math.sin(Math.atan2(15, 40)) };
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = () => ({ moonMission: { missionPhase: 7, animPaused: true, ascentPaused: true, ascentView: 'surface',
  soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect.poll(() => page.locator(MAIN).getAttribute('data-ascent-time')).not.toBeNull();
  await expect.poll(async () => !!(await saved(page)).ascentRun).toBe(true);
}
async function seek(page: Page, seconds: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(time));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(seconds, 6);
}
async function view(page: Page, mode: 'surface' | 'physical') {
  await page.locator('[data-ascent-view-control]').selectOption(mode);
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', mode);
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-ascent-workspace]' : MAIN).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}

async function physical(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile();
    const sample = P.ascentSample(profile, Number(cv.dataset.ascentTime));
    const g = P.ascentPhysicalOrbitGeometry(cv.width / 2, cv.height / 2, sample, profile);
    return { sample, sun: { x: Number(cv.dataset.ascentSunX), y: Number(cv.dataset.ascentSunY), z: Number(cv.dataset.ascentSunZ) },
      elevation: Number(cv.dataset.ascentSunElevation), preset: cv.dataset.ascentSunPreset,
      scale: Number(cv.dataset.ascentMapScale), moonRadius: Number(cv.dataset.ascentMoonRadius),
      moonX: Number(cv.dataset.ascentMoonX), moonY: Number(cv.dataset.ascentMoonY),
      craftX: Number(cv.dataset.ascentCraftX), craftY: Number(cv.dataset.ascentCraftY),
      map: g.map, chart: g.chart, chartCurrent: g.chartCurrent, altitudeMax: g.altitudeMax, timeMax: g.timeMax,
      orbitVisible: cv.dataset.ascentOrbitVisible, aria: cv.getAttribute('aria-label') };
  });
}
function checkPhysical(row: any) {
  for (const key of ['x', 'y', 'z'] as const) expect(row.sun[key]).toBeCloseTo(SUN[key], 13);
  expect(row.elevation).toBe(17); expect(row.preset).toBe('fixed-launch-sun');
  expect(row.moonRadius / row.scale).toBeCloseTo(1737400, 6);
  expect((row.craftX - row.moonX) / row.scale).toBeCloseTo((1737400 + row.sample.altitude) * Math.sin(row.sample.angle), 5);
  expect((row.moonY - row.craftY) / row.scale).toBeCloseTo((1737400 + row.sample.altitude) * Math.cos(row.sample.angle), 5);
  expect((row.chartCurrent.x - row.chart.left) / row.chart.width * row.timeMax).toBeCloseTo(row.sample.time, 8);
  expect((row.chart.top + row.chart.height - row.chartCurrent.y) / row.chart.height * row.altitudeMax).toBeCloseTo(row.sample.altitude, 6);
  expect(row.aria).toContain('spherical day and night under a fixed Sun preset');
}

// Render to a real browser canvas for exact 1:1 sprite checks. Expectations below
// use independent spherical normals and the stated display transfer curve.
async function lightEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (data: Uint8ClampedArray) => { let h = 2166136261; for (const v of data) h = Math.imul(h ^ v, 16777619); return h >>> 0; };
    const drawMoon = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 320;
      const ctx = cv.getContext('2d')!, metadata = P.drawAscentMoonLight(ctx, 160, 160, 128);
      const data = ctx.getImageData(0, 0, 320, 320).data;
      const points = [[128, 128], [220, 128], [35, 128], [128, 20], [128, 235], [175, 85], [67, 199]].map(([x, y]) => {
        const index = ((y + 32) * 320 + x + 32) * 4;
        const u = (x + 0.5 - 128) / 128, v = (128 - y - 0.5) / 128;
        return { x, y, u, v, actual: [...data.slice(index, index + 4)], light: P.ascentMoonLight(u, v) };
      });
      let outsidePainted = 0, insideOpaque = 0;
      for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
        const distance = Math.hypot(x + 0.5 - 160, y + 0.5 - 160), alpha = data[(y * 320 + x) * 4 + 3];
        if (distance > 130 && alpha !== 0) outsidePainted++;
        if (distance < 120 && alpha === 255) insideOpaque++;
      }
      return { metadata, points, outsidePainted, insideOpaque, hash: hash(data) };
    };
    const first = drawMoon(), warm = drawMoon();
    const attitudes = [-1.4, 0, 0.7, 2.1].map(pitch => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 300;
      const ctx = cv.getContext('2d')!, gradients: any[] = [], original = ctx.createLinearGradient.bind(ctx);
      ctx.createLinearGradient = (x0, y0, x1, y1) => {
        if (Math.abs(Math.hypot(x1 - x0, y1 - y0) - 22) < 1e-9) {
          const matrix = ctx.getTransform(), dx = x1 - x0, dy = y1 - y0;
          gradients.push({ x: matrix.a * dx + matrix.c * dy, y: matrix.b * dx + matrix.d * dy });
        }
        return original(x0, y0, x1, y1);
      };
      const stage = P.drawLunarAscentStage(ctx, 150, 150, 3, pitch, { time: 120, engineOn: false, thrust: 0, sunlight: true });
      return { pitch, stage, gradients, hash: hash(ctx.getImageData(0, 0, 300, 300).data) };
    });
    const profile = P.ascentProfile(), sample = { ...P.ascentSample(profile, 120), engineOn: false, thrust: 0 };
    const before = JSON.stringify({ sample, profile });
    const skies = [0, 200].map(time => {
      const cv = document.createElement('canvas'); cv.width = 700; cv.height = 420;
      const ctx = cv.getContext('2d')!, geometry = P.drawAscentScene(ctx, 700, 420, sample, profile, { view: 'surface', time });
      return { time, geometry, hash: hash(ctx.getImageData(0, 0, 700, 420).data) };
    });
    return { first, warm, attitudes, skies, inputUnchanged: JSON.stringify({ sample, profile }) === before };
  });
}
function checkLight(evidence: any) {
  expect(evidence.first).toEqual(evidence.warm);
  expect(evidence.first.outsidePainted).toBe(0); expect(evidence.first.insideOpaque).toBeGreaterThan(45000);
  expect(evidence.first.metadata.preset).toBe('fixed-launch-sun');
  expect(evidence.first.metadata.launchElevationDeg).toBe(17);
  for (const point of evidence.first.points) {
    const nz = Math.sqrt(1 - point.u * point.u - point.v * point.v);
    const incidence = point.u * SUN.x + point.v * SUN.y + nz * SUN.z;
    const brightness = 0.055 + 0.945 * Math.pow(Math.max(0, incidence), 0.6);
    expect(point.light.incidence).toBeCloseTo(incidence, 13);
    expect(point.light.elevationDeg).toBeCloseTo(Math.asin(incidence) * 180 / Math.PI, 10);
    expect(point.light.daylight).toBe(incidence > 0);
    expect(point.actual).toEqual([Math.round(190 * brightness), Math.round(190 * brightness), Math.round(183 * brightness), 255]);
  }
  const projection = Math.hypot(SUN.x, SUN.y);
  for (const row of evidence.attitudes) {
    expect(row.gradients).toHaveLength(1);
    const gradient = row.gradients[0], length = Math.hypot(gradient.x, gradient.y);
    expect(length).toBeCloseTo(66, 5);
    expect(gradient.x / length).toBeCloseTo(SUN.x / projection, 6);
    expect(gradient.y / length).toBeCloseTo(-SUN.y / projection, 6);
    const light = row.stage.sunlight, c = Math.cos(row.pitch), s = Math.sin(row.pitch);
    expect(c * light.x - s * light.y).toBeCloseTo(SUN.x, 12);
    expect(s * light.x + c * light.y).toBeCloseTo(-SUN.y, 12);
    expect(row.stage.engineVisible).toBe(false); expect(row.stage.plumeVisible).toBe(false);
  }
  expect(new Set(evidence.attitudes.map((row: any) => row.hash)).size).toBe(4);
  expect(evidence.skies[0].hash).toBe(evidence.skies[1].hash);
  expect(evidence.skies[0].geometry).toEqual(evidence.skies[1].geometry);
  expect(evidence.skies[0].geometry.thrustVisible).toBe(false); expect(evidence.inputUnchanged).toBe(true);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('measured ascent sunlight preserves spherical illumination, fixed spacecraft light and recorded flight on desktop and phone', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface');
  await expect(page.locator('[data-ascent-light-note]')).toContainText('17° above the launch horizon');
  await expect(page.locator('[data-ascent-light-note]')).toContainText('illustrative');
  const initial = await saved(page), evidence = await lightEvidence(page); checkLight(evidence); expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'sunlight-liftoff-1100');
  await seek(page, 120); const surfacePixels = await pixels(page), poweredFlight = await flight(page);
  await capture(page, info, 'sunlight-pitch-120s-1100');
  await view(page, 'physical'); expect(await flight(page)).toEqual(poweredFlight);
  const rows = [await physical(page)]; checkPhysical(rows[0]); expect(rows[0].orbitVisible).toBe('false');
  const poweredMap = await pixels(page);
  await view(page, 'surface'); expect(await flight(page)).toEqual(poweredFlight); expect(await pixels(page)).toBe(surfacePixels);
  await view(page, 'physical'); expect(await flight(page)).toEqual(poweredFlight); expect(await pixels(page)).toBe(poweredMap);
  await page.locator('[data-ascent-complete-review]').click(); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-engine', 'off');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-orbit-visible', 'true');
  const completed = await saved(page), completedFlight = await flight(page), cutoff = await physical(page);
  checkPhysical(cutoff); rows.push(cutoff); expect(completed.ascentRun.recorded).toBe(true);
  expect(completed.ascentResult.outcome).toBe('orbit'); expect(completed.missionXP).toBe(0);
  await capture(page, info, 'sunlight-orbit-cutoff-1100'); await accessibility(page, info, 'sunlight-a11y-1100');
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await physical(page); checkPhysical(phone); rows.push(phone);
  expect(phone.chart.top).toBeGreaterThan(phone.map.top + phone.map.height); expect(await flight(page)).toEqual(completedFlight);
  await capture(page, info, 'sunlight-orbit-cutoff-320');
  const stored = await saved(page), phonePixels = await pixels(page);
  await mount(page, { moonMission: stored }); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'physical');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(stored.ascentRun.time, 6);
  expect(await saved(page)).toEqual(stored); expect(await pixels(page)).toBe(phonePixels); checkPhysical(await physical(page));
  await seek(page, 120); const reviewed = await physical(page); checkPhysical(reviewed); rows.push(reviewed); expect(reviewed.orbitVisible).toBe('false');
  const replayFlight = await flight(page); await view(page, 'surface'); expect(await flight(page)).toEqual(replayFlight);
  const replay = await saved(page);
  expect(replay.ascentResult).toEqual(completed.ascentResult); expect(replay.ascentRun.recorded).toBe(true);
  expect(replay.missionXP).toBe(completed.missionXP); expect(replay.earnedBadges).toEqual(completed.earnedBadges); expect(replay.missionLog).toEqual(completed.missionLog);
  await capture(page, info, 'sunlight-surface-replay-320'); await capture(page, info, 'sunlight-workspace-320', true);
  await accessibility(page, info, 'sunlight-a11y-320');
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(120.1, 6);
  const bounds = await page.locator('[data-ascent-workspace]').evaluate(el => {
    const control = el.querySelector('[data-ascent-view-control]')!.getBoundingClientRect();
    const note = el.querySelector('[data-ascent-light-note]')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth,
      control: { left: control.left, right: control.right, height: control.height }, note: { left: note.left, right: note.right } };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.control.left).toBeGreaterThanOrEqual(0); expect(bounds.control.right).toBeLessThanOrEqual(320);
  expect(bounds.control.height).toBeGreaterThanOrEqual(44); expect(bounds.note.left).toBeGreaterThanOrEqual(0); expect(bounds.note.right).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'sunlight-measured.json'), JSON.stringify({ evidence, rows, bounds, errors }, null, 2));
});
