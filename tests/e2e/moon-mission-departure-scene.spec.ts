import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DEPARTURE_SCENE_REPORT_DIR || 'reports/moon-mission-enhancement-pass50-2026-10-11/browser/scene');
const MAIN = '[data-departure-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    const P = (window as any).MoonMissionPure, insertion = P.loiProfile();
    (window as any).__mount({ moonMission: { missionPhase: 8, missionXP: 0, missionLog: [], animPaused: true,
      departurePaused: true, returnPaused: true, soundOff: true, difficulty: 'pilot',
      earnedBadges: { first_step: true, mission_complete: true }, loiPlan: insertion.controls,
      loiRun: { version: 1, time: insertion.summary.duration, recorded: true },
      loiResult: { version: 1, ...insertion.summary }, ...value } });
  }, extra);
  if (await page.locator(MAIN).count() === 0) await page.locator('[data-departure-toggle]').click();
  await expect(page.locator(MAIN)).toBeVisible();
  await expect(page.locator(MAIN)).toHaveAttribute('data-departure-sun-angle', '45');
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-departure-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-departure-time'))).toBeCloseTo(time, 6);
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const n of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ n, 16777619);
    return hash >>> 0;
  });
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const p = P.departureProfile(d.departurePlan, P.departureFuel(d)), s = P.departureSample(p, Number(cv.dataset.departureTime));
    const scratch = document.createElement('canvas'); scratch.width = cv.width / 2; scratch.height = cv.height / 2;
    const picture = P.drawDeparture(scratch.getContext('2d'), scratch.width, scratch.height, s, p, d.departureView);
    return { time: Number(cv.dataset.departureTime), sample: s, picture, phase: cv.dataset.departureSun,
      fraction: Number(cv.dataset.departureSunFraction), angle: Number(cv.dataset.departureSunAngle),
      plume: cv.dataset.departurePlume, view: d.departureView, summary: p.summary, cutoff: p.cutoffTime };
  });
}
// Geometric reference is independent of the renderer's coordinate helpers.
function referenceSun(s: any) {
  const a = Math.PI / 4, sx = 149597870700 * Math.cos(a) - s.x, sy = 149597870700 * Math.sin(a) - s.y;
  const range = Math.hypot(sx, sy), r = Math.hypot(s.x, s.y);
  const solar = Math.asin(695700000 / range), lunar = Math.asin(1737400 / r);
  const separation = Math.atan2(Math.abs(-s.x * sy + s.y * sx), -s.x * sx - s.y * sy);
  const phase = separation <= lunar - solar ? 'total' : separation < lunar + solar ? 'partial' : 'sunlit';
  let fraction = phase === 'total' ? 0 : 1;
  if (phase === 'partial') {
    const count = 8192, dx = 2 * solar / count; let covered = 0;
    for (let i = 0; i < count; i++) {
      const x = -solar + (i + 0.5) * dx;
      covered += 2 * Math.min(Math.sqrt(Math.max(0, solar * solar - x * x)),
        Math.sqrt(Math.max(0, lunar * lunar - (x - separation) ** 2))) * dx;
    }
    fraction = Math.max(0, Math.min(1, 1 - covered / (Math.PI * solar * solar)));
  }
  return { phase, fraction, directionX: sx / range, directionY: sy / range };
}
async function verifyLive(page: Page, row: any) {
  const s = row.sample, p = row.picture, c = p.spacecraft, solar = referenceSun(s);
  const ux = s.vx / Math.hypot(s.vx, s.vy), uy = -s.vy / Math.hypot(s.vx, s.vy);
  expect(p.scaleX).toBe(p.scaleY); expect(p.scale).toBe(p.scaleX);
  expect((p.craft.x - p.cx) / p.scale).toBeCloseTo(s.x, 5);
  expect((p.cy - p.craft.y) / p.scale).toBeCloseTo(s.y, 5);
  expect(p.moonRadius / p.scale).toBeCloseTo(1737400, 6);
  expect(c.centerX).toBeCloseTo(p.craft.x, 10); expect(c.centerY).toBeCloseTo(p.craft.y, 10);
  expect(c.thrustX * ux + c.thrustY * uy).toBeCloseTo(1, 12);
  expect(c.exhaustX * ux + c.exhaustY * uy).toBeCloseTo(-1, 12);
  expect((c.nozzleX - c.centerX) * ux + (c.nozzleY - c.centerY) * uy).toBeCloseTo(-38.5 * c.scale, 9);
  expect((c.portX - c.centerX) * ux + (c.portY - c.centerY) * uy).toBeCloseTo(38.5 * c.scale, 9);
  expect((c.portX + c.nozzleX) / 2).toBeCloseTo(c.centerX, 10);
  expect((c.portY + c.nozzleY) / 2).toBeCloseTo(c.centerY, 10);
  const expectedPlume = s.engineOn === true && s.thrust > 0;
  expect(c.plumeVisible).toBe(expectedPlume); expect(c.engineVisible).toBe(expectedPlume);
  expect(p.plumeVisible).toBe(expectedPlume); expect(row.plume).toBe(expectedPlume ? 'on' : 'off');
  expect(row.angle).toBe(45); expect(p.sunAngle).toBe(45);
  expect(row.phase).toBe(solar.phase); expect(p.sunlight.phase).toBe(solar.phase);
  expect(Math.abs(row.fraction - solar.fraction)).toBeLessThan(0.00005);
  expect(c.sunlight.fraction).toBe(row.fraction);
  const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
  expect(c.sunlight.x).toBeCloseTo(solar.directionX * cos - solar.directionY * sin, 12);
  expect(c.sunlight.y).toBeCloseTo(-solar.directionX * sin - solar.directionY * cos, 12);
  const label = solar.phase === 'total' ? 'Total eclipse' : solar.phase === 'partial' ? 'Partial eclipse' : 'Full sunlight';
  await expect(page.locator('[data-departure-value="sun"]')).toContainText(label);
  await expect(page.locator('[data-departure-value="sun"]')).toContainText((row.fraction * 100).toFixed(1) + '%');
  const end = s.earth.hit || s.earth.target;
  expect(p.radioEnd.x).toBeCloseTo(p.cx + end.x * p.scale, 9);
  expect(p.radioEnd.y).toBeCloseTo(p.cy - end.y * p.scale, 9);
  expect(p.radioBlocked).toBe(!s.earth.visible);
}
async function capture(page: Page, info: TestInfo, name: string, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(selector).screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-departure-workspace]']] },
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations
    .map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}
async function isolatedEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const board = document.createElement('canvas'); board.width = 720; board.height = 640;
    board.setAttribute('data-departure-comparison', ''); board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#07111f'; bc.fillRect(0, 0, 720, 640);
    bc.fillStyle = '#f8fafc'; bc.font = '18px system-ui'; bc.fillText('Columbia after LM jettison', 22, 28);
    const sun = { directionX: Math.SQRT1_2, directionY: Math.SQRT1_2, fraction: 1 };
    const cases = [
      { name: 'SPS firing / full sunlight', engineOn: true, thrust: 91188, fraction: 1 },
      { name: 'SPS firing / total eclipse', engineOn: true, thrust: 91188, fraction: 0 },
      { name: 'Cutoff / full sunlight', engineOn: false, thrust: 0, fraction: 1 },
      { name: 'Zero thrust / depleted fuel', engineOn: true, thrust: 0, fraction: 1 },
    ];
    const rows = cases.map((row, index) => {
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 160;
      const ctx = cv.getContext('2d')!, angle = Math.PI, k = 2, x = 300, y = 80;
      const result = P.drawDepartureCSM(ctx, x, y, k, angle,
        { engineOn: row.engineOn, thrust: row.thrust, time: 200, sunlight: { ...sun, fraction: row.fraction } });
      const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let exhaustCount = 0, noseBeyondCount = 0, bodyAlpha = 0, bodySamples = 0, bodyLuminance = 0;
      // Independent local/world inverse rotation. The nozzle is 38.5 art units
      // aft of the marker; inspect well behind it, clear of antialiasing.
      for (let py = 0; py < cv.height; py++) for (let px = 0; px < cv.width; px++) {
        const localX = -(px + 0.5 - x) / k, localY = -(py + 0.5 - y) / k, at = (py * cv.width + px) * 4;
        if (localX > 42 && localX < 84 && Math.abs(localY) < 8 && pixels[at + 3] > 0) exhaustCount++;
        if (localX < -41 && localX > -85 && Math.abs(localY) < 28 && pixels[at + 3] > 0) noseBeyondCount++;
        // Interior service module: 28.3..61 port coordinates minus38.5 center.
        if (localX > -5 && localX < 20 && Math.abs(localY) < 7) {
          bodyAlpha += pixels[at + 3]; bodyLuminance += pixels[at] + pixels[at + 1] + pixels[at + 2]; bodySamples++;
        }
      }
      const rowY = 48 + index * 142; bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui'; bc.fillText(row.name, 22, rowY + 12);
      bc.drawImage(cv, 140, rowY + 10, 450, 120);
      return { ...row, result, exhaustCount, noseBeyondCount, bodyAlpha, bodySamples, bodyLuminance };
    });
    document.querySelector('[data-departure-workspace]')!.appendChild(board);
    const profile = P.departureProfile(undefined, { amount: 0, source: 'preset' });
    const sample = P.departureSample(profile, 200);
    const cv = document.createElement('canvas'); cv.width = 700; cv.height = 360;
    const empty = P.drawDeparture(cv.getContext('2d'), 700, 360, sample, profile, 'burn');
    return { rows, empty: { sample, spacecraft: empty.spacecraft, plumeVisible: empty.plumeVisible } };
  });
}

test('measured departure spacecraft follows prograde thrust, shuts down the SPS plume and preserves optional review state', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-departure-visual-note');
  const note = page.locator('#mm-departure-visual-note');
  for (const text of ['fixed 45° teaching Sun', 'ring marks the computed position', 'enlarged', 'illustrative']) await expect(note).toContainText(text);
  const initial = await saved(page), rows: any[] = [];
  const evidence = await isolatedEvidence(page);
  for (const row of evidence.rows) {
    expect(row.noseBeyondCount).toBe(0); expect(row.bodySamples).toBeGreaterThan(1000);
    expect(row.bodyAlpha).toBe(255 * row.bodySamples);
    expect(row.result.plumeVisible).toBe(row.engineOn && row.thrust > 0);
    if (row.result.plumeVisible) expect(row.exhaustCount).toBeGreaterThan(1000); else expect(row.exhaustCount).toBe(0);
  }
  expect(evidence.rows[0].exhaustCount).toBe(evidence.rows[1].exhaustCount);
  expect(evidence.rows[0].bodyLuminance).toBeGreaterThan(evidence.rows[1].bodyLuminance);
  expect(evidence.empty.sample.propellant).toBe(0); expect(evidence.empty.sample.engineOn).toBe(false);
  expect(evidence.empty.plumeVisible).toBe(false); expect(evidence.empty.spacecraft.plumeVisible).toBe(false);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'departure-csm-engine-comparison', '[data-departure-comparison]');
  await page.locator('[data-departure-comparison]').evaluate(el => el.remove());

  await seek(page, 200); let row = await inspect(page); await verifyLive(page, row); rows.push(row);
  expect(row.sample.engineOn).toBe(true); expect(row.sample.propellant).toBeLessThan(row.summary.initialFuel);
  await capture(page, info, 'departure-prograde-burn-1100');
  await accessibility(page, info, 'departure-scene-a11y-1100');
  const burnState = await saved(page), burnPixels = await pixels(page); await page.waitForTimeout(150);
  expect(await pixels(page)).toBe(burnPixels); expect(await saved(page)).toEqual(burnState);
  await page.locator('[data-departure-event="cutoff"]').click(); row = await inspect(page); await verifyLive(page, row); rows.push(row);
  expect(row.time).toBeCloseTo(row.cutoff, 9); expect(row.plume).toBe('off');
  await capture(page, info, 'departure-cutoff-1100');
  await page.locator('[data-departure-view-control]').selectOption('escape');
  await page.locator('[data-departure-review]').click(); row = await inspect(page); await verifyLive(page, row); rows.push(row);
  await expect(page.locator('[data-departure-result="escape"]')).toBeVisible();
  expect(row.sample.energy).toBeGreaterThan(0); expect(row.plume).toBe('off');
  await capture(page, info, 'departure-escape-1100');
  const reviewed = await saved(page); expect(reviewed.missionXP).toBe(0); expect(reviewed.departureRun.recorded).toBe(true);

  await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('[data-departure-view-control]').selectOption('burn'); await seek(page, 200);
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  row = await inspect(page); await verifyLive(page, row); rows.push(row);
  await capture(page, info, 'departure-burn-workspace-320', '[data-departure-workspace]');
  await accessibility(page, info, 'departure-scene-a11y-320');
  const phone = await saved(page), phonePixels = await pixels(page); await mount(page, phone);
  expect(await saved(page)).toEqual(phone); expect(await pixels(page)).toBe(phonePixels);
  await page.locator('[data-departure-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-departure-time'))).toBeCloseTo(200.1, 6);
  expect((await saved(page)).departureResult).toEqual(reviewed.departureResult);
  await page.keyboard.press('Home'); expect((await inspect(page)).time).toBe(0);
  await page.keyboard.press('End'); await expect(page.locator('[data-departure-result="escape"]')).toBeVisible();
  await page.locator('[data-departure-view-control]').selectOption('escape');
  row = await inspect(page); await verifyLive(page, row); rows.push(row);
  await capture(page, info, 'departure-escape-320');
  await page.locator('[data-departure-preset="exhaustion"]').click(); await page.locator('[data-departure-review]').click();
  row = await inspect(page); await verifyLive(page, row); rows.push(row);
  const depleted = await saved(page); expect(depleted.departureResult.fuelExhausted).toBe(true);
  expect(row.sample.propellant).toBe(0); expect(row.sample.thrust).toBe(0); expect(row.plume).toBe('off');
  await capture(page, info, 'departure-depleted-workspace-320', '[data-departure-workspace]');
  const bounds = await page.locator('[data-departure-workspace]').evaluate(el => {
    const r = el.getBoundingClientRect(), n = el.querySelector('#mm-departure-visual-note')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, left: r.left, right: r.right, noteLeft: n.left, noteRight: n.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(bounds.noteLeft).toBeGreaterThanOrEqual(0); expect(bounds.noteRight).toBeLessThanOrEqual(320);
  expect(depleted.missionXP).toBe(0); expect(depleted.earnedBadges).toEqual(initial.earnedBadges);
  expect(depleted.missionLog).toEqual(initial.missionLog); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'departure-scene-measured.json'), JSON.stringify({ evidence, rows, bounds, errors }, null, 2));
});
