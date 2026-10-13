import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DOCKING_SURFACE_REPORT_DIR || 'reports/moon-mission-enhancement-pass53-2026-10-11/browser/surface');
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

// Raw metre-space ray/sphere intersection, independent of the normalized-radius helper.
function independentHit(width: number, height: number, x: number, y: number) {
  const R = 1737400, D = R + 110000, f = height / (2 * Math.tan(Math.PI / 6));
  const ray = [x - width / 2, f, height / 2 - y], length = Math.hypot(...ray);
  const direction = ray.map(v => v / length), b = 2 * D * direction[2], c = D * D - R * R;
  const discriminant = b * b - 4 * c;
  if (b >= 0 || discriminant < 0) return null;
  const range = (-b - Math.sqrt(discriminant)) / 2;
  return { range, point: [range * direction[0], range * direction[1], D + range * direction[2]] };
}
async function settledPixels(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  let prior = -1, equal = 0;
  for (let frame = 0; frame < 30; frame++) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    const current = await pixels(page);
    equal = current === prior ? equal + 1 : 0; prior = current;
    if (equal >= 2) return current;
  }
  throw new Error('The paused docking canvas did not settle within 30 frames');
}
async function surfaceEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (d: Uint8ClampedArray) => { let h = 2166136261; for (const v of d) h = Math.imul(h ^ v, 16777619); return h >>> 0; };
    const board = document.createElement('section'); board.id = 'surface-evidence-board';
    board.style.cssText = 'position:relative;width:940px;padding:20px;box-sizing:border-box;background:#020815;color:#e2e8f0;font:14px system-ui;';
    const title = document.createElement('h2'); title.textContent = 'Spherical lunar surface — isolated projection'; board.append(title);
    const rows = [[700, 280], [900, 160], [320, 500]].map(([width, height], index) => {
      const label = document.createElement('p'); label.textContent = ['Standard view', 'Wide view', 'Tall view'][index] + ' · ' + width + ' × ' + height;
      const cv = document.createElement('canvas'); cv.width = width; cv.height = height;
      cv.style.cssText = 'display:block;max-width:none;background:#020815;'; board.append(label, cv);
      const ctx = cv.getContext('2d')!, geometry = P.drawDockingHorizon(ctx, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const focal = height / (2 * Math.tan(Math.PI / 6)), dip = Math.acos(1737400 / 1847400);
      let abovePainted = 0, aboveCount = 0, belowTransparent = 0, belowCount = 0, sum = 0, sum2 = 0;
      const levels = new Set<number>();
      for (let x = 0; x < width; x++) {
        const horizon = height / 2 + Math.tan(dip) * Math.hypot(focal, x + 0.5 - width / 2);
        for (let y = 0; y < height; y++) {
          const offset = (y * width + x) * 4, alpha = data[offset + 3];
          if (y + 0.5 < horizon - 4) { aboveCount++; if (alpha !== 0) abovePainted++; }
          if (y + 0.5 > horizon + 4) {
            belowCount++; if (alpha !== 255) belowTransparent++;
            const value = data[offset]; sum += value; sum2 += value * value; levels.add(value);
          }
        }
      }
      const probes = [0.1, 0.5, 0.9].flatMap(px => [0.1, 0.51, 0.8, 0.92, 0.99].map(py => {
        const x = width * px, y = height * py, hit = P.dockingSurfaceRay(geometry, x, y);
        return { x, y, hit, material: hit ? P.dockingSurfaceMaterial(Object.freeze({ ...hit.normal })) : null };
      }));
      return { width, height, geometry, abovePainted, aboveCount, belowTransparent, belowCount,
        levels: levels.size, deviation: Math.sqrt(sum2 / belowCount - Math.pow(sum / belowCount, 2)), probes, hash: hash(data) };
    });
    document.body.append(board);
    // Rendering another aspect ratio evicts the single raster. Returning to the
    // first dimensions must reproduce exactly the same fixed surface markings.
    const repeated = document.createElement('canvas'); repeated.width = 700; repeated.height = 280;
    P.drawDockingHorizon(repeated.getContext('2d'), 700, 280);
    const repeatedHash = hash(repeated.getContext('2d')!.getImageData(0, 0, 700, 280).data);
    const state = Object.freeze({ ...P.dockingState(), ax: 0, ay: 0 }), before = JSON.stringify(state);
    const scenes = [0, 200].map(time => {
      const cv = document.createElement('canvas'); cv.width = 700; cv.height = 280;
      const result = P.drawDockingPractice(cv.getContext('2d'), 700, 280, state, { time, view: 'overview' });
      return { time, result, hash: hash(cv.getContext('2d')!.getImageData(0, 0, 700, 280).data) };
    });
    const closeup = document.createElement('canvas'); closeup.width = 700; closeup.height = 280;
    const closeupResult = P.drawDockingPractice(closeup.getContext('2d'), 700, 280, state, { time: 200, view: 'closeup' });
    const geometry = P.dockingHorizonGeometry(700, 280), horizon = P.dockingHorizonAt(geometry, 350);
    const near = [horizon + 3, horizon + 4].map(y => P.dockingSurfaceRay(geometry, 350, y).point);
    const low = [269, 270].map(y => P.dockingSurfaceRay(geometry, 350, y).point);
    const spacing = (p: any[]) => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y, p[1].z - p[0].z);
    return { rows, repeatedHash, scenes, inputUnchanged: JSON.stringify(state) === before,
      nearHorizonMetresPerPixel: spacing(near), lowerMetresPerPixel: spacing(low),
      closeupHasHorizon: Object.prototype.hasOwnProperty.call(closeupResult, 'horizon') };
  });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('projected docking surface keeps crater markings on the sphere and preserves paused, resized, reloaded, and contact states', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page); await choose(page, 'overview');
  const note = page.locator('[data-docking-horizon-note]');
  for (const text of [/110\s*km/, /19\.9/, /60/, /separate equal-distance diagram/i,
    /Procedural crater markings follow the curved surface and foreshorten toward the horizon\./,
    /Surface colors and star exposure are illustrative; terrain height and cast shadows are omitted\./]) await expect(note).toContainText(text);
  const initial = await saved(page), evidence = await surfaceEvidence(page);
  let hitCount = 0, missCount = 0;
  for (const row of evidence.rows) {
    verifyGeometry(row.geometry, row.width, row.height);
    expect(row.abovePainted).toBe(0); expect(row.belowTransparent).toBe(0);
    expect(row.aboveCount).toBeGreaterThan(1000); expect(row.belowCount).toBeGreaterThan(1000);
    expect(row.levels).toBeGreaterThan(10); expect(row.deviation).toBeGreaterThan(2);
    for (const sample of row.probes) {
      const expected = independentHit(row.width, row.height, sample.x, sample.y);
      if (!expected) { expect(sample.hit).toBeNull(); expect(sample.material).toBeNull(); missCount++; continue; }
      hitCount++; expect(sample.hit).not.toBeNull();
      expect(Math.abs(sample.hit.range / expected.range - 1)).toBeLessThan(1e-10);
      const actual = [sample.hit.point.x, sample.hit.point.y, sample.hit.point.z];
      for (let i = 0; i < 3; i++) expect(Math.abs(actual[i] - expected.point[i])).toBeLessThan(0.001);
      expect(Math.hypot(...actual) / 1737400).toBeCloseTo(1, 11);
      const normal = sample.hit.normal; expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 11);
      expect(sample.material.albedo).toBeGreaterThanOrEqual(0.30); expect(sample.material.albedo).toBeLessThanOrEqual(0.70);
      for (const channel of sample.material.rgb) { expect(Number.isInteger(channel)).toBe(true); expect(channel).toBeGreaterThan(0); expect(channel).toBeLessThan(255); }
    }
  }
  expect(hitCount).toBeGreaterThan(5); expect(missCount).toBeGreaterThan(5);
  expect(evidence.nearHorizonMetresPerPixel).toBeGreaterThan(evidence.lowerMetresPerPixel * 2);
  expect(evidence.repeatedHash).toBe(evidence.rows[0].hash);
  expect(evidence.scenes[0].hash).toBe(evidence.scenes[1].hash);
  expect(evidence.scenes[0].result).toEqual(evidence.scenes[1].result);
  expect(evidence.scenes[0].result.engineVisible).toBe(false); expect(evidence.scenes[0].result.plumeVisible).toBe(false);
  expect(evidence.closeupHasHorizon).toBe(false); expect(evidence.inputUnchanged).toBe(true);
  const boardPath = join(REPORT, 'surface-projection-board-' + info.project.name + '.png');
  await page.locator('#surface-evidence-board').screenshot({ path: boardPath });
  await info.attach('surface-projection-board', { path: boardPath, contentType: 'image/png' });
  await page.locator('#surface-evidence-board').evaluate(el => el.remove());
  expect(await saved(page)).toEqual(initial);
  const rows = [await inspect(page)]; verifyLive(rows[0]);
  const desktopPixels = await settledPixels(page);
  await capture(page, info, 'surface-overview-1100'); await accessibility(page, info, 'surface-a11y-1100');
  await page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => { cv.style.height = '160px'; });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.height / 2)).toBe(160);
  const wide = await inspect(page); verifyLive(wide); rows.push(wide);
  await page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => { cv.style.height = '280px'; });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.height / 2)).toBe(280);
  expect(await settledPixels(page)).toBe(desktopPixels); expect(await saved(page)).toEqual(initial);
  await choose(page, 'closeup'); await capture(page, info, 'surface-closeup-1100');
  await choose(page, 'overview'); expect(await settledPixels(page)).toBe(desktopPixels);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await inspect(page); verifyLive(phone); rows.push(phone);
  const phonePixels = await settledPixels(page); await capture(page, info, 'surface-overview-320');
  await capture(page, info, 'surface-workspace-320', true); await accessibility(page, info, 'surface-a11y-320');
  await choose(page, 'closeup'); await page.locator(MAIN).focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  expect(await saved(page)).toEqual(initial); await choose(page, 'overview');
  expect(await settledPixels(page)).toBe(phonePixels); expect(await saved(page)).toEqual(initial);
  await mount(page, {}, initial); verifyLive(await inspect(page));
  const reloadPixels = await settledPixels(page);
  await writeFile(join(REPORT, 'surface-reload-pixels.json'), JSON.stringify({ phonePixels, reloadPixels, identical: phonePixels === reloadPixels }, null, 2));
  expect(await saved(page)).toEqual(initial); expect(reloadPixels).toBe(phonePixels);
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-status', 'docked');
  await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
  const docked = await saved(page); expect(docked.dockingRun.y).toBe(0);
  expect(docked.dockingResult.closingSpeed).toBe(docked.dockingRun.vy);
  expect(docked.dockingRun.propellant).toBeLessThan(initial.dockingRun.propellant);
  expect(docked.missionXP).toBe(0); expect(docked.earnedBadges).toEqual(initial.earnedBadges);
  const contact = await inspect(page); verifyLive(contact); rows.push(contact);
  await capture(page, info, 'surface-contact-320');
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
  await writeFile(join(REPORT, 'surface-measured.json'), JSON.stringify({ evidence, rows, hitCount, missCount, bounds, errors }, null, 2));
});
