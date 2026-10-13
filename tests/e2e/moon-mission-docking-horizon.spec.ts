import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DOCKING_HORIZON_REPORT_DIR || 'reports/moon-mission-enhancement-pass47-2026-10-10/browser/horizon');
const MAIN = '[data-docking-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function mount(page: Page, fixture: Record<string, unknown> = {}, checkpoint?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ fixture, checkpoint }) => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    const P = (window as any).MoonMissionPure, summary = P.ascentProfile().summary;
    (window as any).__mount({ moonMission: checkpoint || {
      missionPhase: 7, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      ascentRun: { version: 1, time: summary.duration, recorded: true }, ascentResult: { version: 1, ...summary }, ascentPaused: true,
      dockingRun: { ...P.dockingState(), ...fixture }, dockingPaused: true, dockingGuided: false, dockingResult: null,
    } });
  }, { fixture, checkpoint });
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-view', 'overview');
  await expect(page.locator('[data-docking-horizon-note]')).toBeVisible();
}
async function choose(page: Page, mode: 'overview' | 'closeup') {
  await page.getByRole('combobox', { name: 'Docking view', exact: true }).selectOption(mode);
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-view', mode);
  if (mode === 'overview') {
    await expect(page.locator('[data-docking-horizon-note]')).toBeVisible();
    await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-docking-instructions mm-docking-horizon-note');
  } else {
    await expect(page.locator('[data-docking-horizon-note]')).toBeHidden();
    await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-docking-instructions');
    for (const key of ['altitude', 'dip', 'fov', 'eye-y', 'focal'])
      await expect(page.locator(MAIN)).toHaveAttribute('data-docking-horizon-' + key, '');
  }
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let h = 2166136261;
    for (const v of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) h = Math.imul(h ^ v, 16777619);
    return h >>> 0;
  });
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const d = cv.dataset, P = (window as any).MoonMissionPure;
    const width = cv.width / 2, height = cv.height / 2;
    return { width, height, view: d.dockingView,
      altitude: Number(d.dockingHorizonAltitude), dip: Number(d.dockingHorizonDip), fov: Number(d.dockingHorizonFov),
      eyeY: Number(d.dockingHorizonEyeY), focal: Number(d.dockingHorizonFocal),
      geometry: P.dockingHorizonGeometry(width, height),
      pictureScale: Number(d.dockingPictureScale), portX: Number(d.dockingPortX), portY: Number(d.dockingPortY),
      eagleX: Number(d.dockingEaglePortX), eagleY: Number(d.dockingEaglePortY),
      run: JSON.parse(JSON.stringify((window as any).__toolData.moonMission.dockingRun)) };
  });
}
function verifyGeometry(g: any, width: number, height: number) {
  const radius = 1737400, altitude = 110000, focal = height / (2 * Math.tan(Math.PI / 6));
  const dip = Math.acos(radius / (radius + altitude));
  expect(g.radius).toBe(radius); expect(g.altitude).toBe(altitude); expect(g.fieldDegrees).toBe(60);
  expect(g.centerX).toBe(width / 2); expect(g.eyeY).toBe(height / 2);
  expect(g.focal).toBeCloseTo(focal, 11); expect(g.dipDegrees).toBeCloseTo(dip * 180 / Math.PI, 11);
  expect(g.points).toHaveLength(49);
  for (const p of g.points) {
    // A pinhole ray is (horizontal, downward, forward), with the eye at R+h.
    // Its closest distance to the lunar centre must equal R on the silhouette.
    const qx = (p.x - width / 2) / focal, qy = (p.y - height / 2) / focal;
    const closestSquared = (radius + altitude) ** 2 * (1 - qy * qy / (1 + qx * qx + qy * qy));
    expect(closestSquared / (radius * radius)).toBeCloseTo(1, 12);
    expect(qy).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(height / 2 + focal * Math.tan(dip) * Math.sqrt(1 + qx * qx), 10);
  }
  expect(g.points[0].x).toBeLessThanOrEqual(0); expect(g.points[48].x).toBeGreaterThanOrEqual(width);
  expect(g.points[0].y).toBeCloseTo(g.points[48].y, 12);
  expect(g.points[24].y).toBeLessThan(g.points[0].y);
}
function verifyLive(row: any) {
  verifyGeometry(row.geometry, row.width, row.height);
  expect(row.view).toBe('overview'); expect(row.altitude).toBe(110000); expect(row.fov).toBe(60);
  expect(row.dip).toBeCloseTo(Math.acos(1737400 / 1847400) * 180 / Math.PI, 11);
  expect(row.eyeY).toBe(row.height / 2); expect(row.focal).toBeCloseTo(row.height / (2 * Math.tan(Math.PI / 6)), 11);
  // The angular background must not change the equal-axis metre foreground.
  expect((row.eagleX - row.portX) / row.pictureScale).toBeCloseTo(row.run.y, 9);
  expect((row.portY - row.eagleY) / row.pictureScale).toBeCloseTo(row.run.x, 9);
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
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
async function renderEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (d: Uint8ClampedArray) => { let h = 2166136261; for (const v of d) h = Math.imul(h ^ v, 16777619); return h >>> 0; };
    const rows = [[700, 280], [282, 280], [1100, 160], [320, 500]].map(([width, height]) => {
      const cv = document.createElement('canvas'); cv.width = width; cv.height = height;
      const ctx = cv.getContext('2d')!, geometry = P.drawDockingHorizon(ctx, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const focal = height / (2 * Math.tan(Math.PI / 6)), dip = Math.acos(1737400 / 1847400);
      let abovePainted = 0, aboveCount = 0, belowTransparent = 0, belowCount = 0;
      for (let x = 0; x < width; x++) {
        const horizon = height / 2 + Math.tan(dip) * Math.hypot(focal, x + 0.5 - width / 2);
        for (let y = 0; y < height; y++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (y + 0.5 < horizon - 4) { aboveCount++; if (alpha !== 0) abovePainted++; }
          if (y + 0.5 > horizon + 4) { belowCount++; if (alpha !== 255) belowTransparent++; }
        }
      }
      return { width, height, geometry, abovePainted, aboveCount, belowTransparent, belowCount,
        checks: [0, width / 4, width / 2, width * 3 / 4, width].map(x => ({ x, y: P.dockingHorizonAt(geometry, x) })), hash: hash(data) };
    });
    const state = Object.freeze({ ...P.dockingState(), ax: 0, ay: 0 });
    const before = JSON.stringify(state);
    const scenes = [0, 200].map(time => {
      const cv = document.createElement('canvas'); cv.width = 700; cv.height = 280;
      const ctx = cv.getContext('2d')!, result = P.drawDockingPractice(ctx, 700, 280, state, { time, view: 'overview' });
      return { time, result, hash: hash(ctx.getImageData(0, 0, 700, 280).data) };
    });
    const closeup = document.createElement('canvas'); closeup.width = 700; closeup.height = 280;
    const closeupResult = P.drawDockingPractice(closeup.getContext('2d'), 700, 280, state, { time: 200, view: 'closeup' });
    return { rows, scenes, closeupHasHorizon: Object.prototype.hasOwnProperty.call(closeupResult, 'horizon'), inputUnchanged: JSON.stringify(state) === before };
  });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('measured docking horizon follows lunar tangent geometry and preserves contact state across desktop and phone views', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page); await choose(page, 'overview');
  const note = page.locator('[data-docking-horizon-note]');
  for (const text of [/110\s*km/, /19\.9/, /60/, /background/i, /separate equal-distance diagram/i]) await expect(note).toContainText(text);
  const initial = await saved(page), evidence = await renderEvidence(page);
  for (const row of evidence.rows) {
    verifyGeometry(row.geometry, row.width, row.height);
    expect(row.abovePainted).toBe(0); expect(row.belowTransparent).toBe(0);
    expect(row.aboveCount).toBeGreaterThan(1000); expect(row.belowCount).toBeGreaterThan(1000);
    for (const p of row.checks) {
      const f = row.height / (2 * Math.tan(Math.PI / 6)), dip = Math.acos(1737400 / 1847400);
      expect(p.y).toBeCloseTo(row.height / 2 + Math.tan(dip) * Math.hypot(f, p.x - row.width / 2), 10);
    }
  }
  expect(evidence.scenes[0].hash).toBe(evidence.scenes[1].hash);
  expect(evidence.scenes[0].result).toEqual(evidence.scenes[1].result);
  verifyGeometry(evidence.scenes[0].result.horizon, 700, 280);
  expect(evidence.closeupHasHorizon).toBe(false); expect(evidence.inputUnchanged).toBe(true);
  expect(await saved(page)).toEqual(initial);
  const rows = [await inspect(page)]; verifyLive(rows[0]);
  await capture(page, info, 'horizon-overview-1100'); await accessibility(page, info, 'horizon-a11y-1100');
  await page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => { cv.style.height = '160px'; });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.height / 2)).toBe(160);
  const wide = await inspect(page); verifyLive(wide); rows.push(wide);
  expect(wide.geometry.points[0].y).toBeGreaterThan(wide.height);
  await capture(page, info, 'horizon-wide-field-1100');
  await page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => { cv.style.height = '280px'; });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.height / 2)).toBe(280);
  expect(await saved(page)).toEqual(initial);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await inspect(page); verifyLive(phone); rows.push(phone);
  const phonePixels = await pixels(page); await capture(page, info, 'horizon-overview-320');
  await choose(page, 'closeup'); await capture(page, info, 'horizon-closeup-320');
  await page.locator(MAIN).focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  expect(await saved(page)).toEqual(initial);
  await choose(page, 'overview'); expect(await pixels(page)).toBe(phonePixels); expect(await saved(page)).toEqual(initial);
  await mount(page, {}, initial); verifyLive(await inspect(page));
  expect(await saved(page)).toEqual(initial); expect(await pixels(page)).toBe(phonePixels);
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-status', 'docked');
  await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
  const docked = await saved(page); expect(docked.dockingRun.y).toBe(0);
  expect(docked.dockingResult.closingSpeed).toBe(docked.dockingRun.vy);
  expect(docked.dockingRun.propellant).toBeLessThan(initial.dockingRun.propellant);
  expect(docked.missionXP).toBe(0); expect(docked.earnedBadges).toEqual(initial.earnedBadges);
  const contact = await inspect(page); verifyLive(contact); rows.push(contact);
  await capture(page, info, 'horizon-contact-320'); await capture(page, info, 'horizon-workspace-320', true);
  await accessibility(page, info, 'horizon-a11y-320');
  await choose(page, 'closeup'); await choose(page, 'overview'); expect(await saved(page)).toEqual(docked);
  await mount(page, {}, docked); expect(await saved(page)).toEqual(docked); verifyLive(await inspect(page));
  await mount(page, { x: 0, y: -0.03, vx: 0, vy: 0.8, time: 20 });
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-status', 'collision');
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  const failed = await saved(page); expect(failed.dockingResult).toBeNull(); expect(failed.missionXP).toBe(0);
  await choose(page, 'closeup'); await choose(page, 'overview'); expect(await saved(page)).toEqual(failed);
  await page.locator('[data-docking-retry]').click(); await expect(page.locator(MAIN)).toHaveAttribute('data-docking-status', 'flying');
  const retry = await saved(page); expect(retry.ascentResult).toEqual(initial.ascentResult); expect(retry.ascentRun).toEqual(initial.ascentRun);
  expect(retry.dockingRun).toMatchObject({ time: 0, x: 8, y: -120, vx: 0, vy: 0.55, propellant: 40, status: 'flying' });
  const bounds = await page.locator('[data-ascent-workspace]').evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; };
    return { overflow: document.documentElement.scrollWidth > innerWidth,
      select: box(el.querySelector('select[data-docking-view]')!), note: box(el.querySelector('[data-docking-horizon-note]')!) };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.select.height).toBeGreaterThanOrEqual(44);
  for (const region of [bounds.select, bounds.note]) { expect(region.left).toBeGreaterThanOrEqual(0); expect(region.right).toBeLessThanOrEqual(320); }
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'horizon-measured.json'), JSON.stringify({ evidence, rows, bounds, errors }, null, 2));
});
