import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass64-2026-10-13/browser/lunar-crater-relief');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount({ moonMission: { missionPhase: 4, animPaused: true, soundOff: true,
      missionXP: 0, missionLog: [], lunarSamples: [], difficulty: 'pilot', quizCorrect: 0,
      moonLabels: true, lunarAtlasSite: 11, earnedBadges: { first_step: true, mission_complete: true } } });
  });
  await expect(page.locator('[data-lunar-atlas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function capture(page: Page, info: TestInfo, name: string, selector: string) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector.startsWith('#crater-relief-')) {
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else await page.locator(selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-lunar-atlas-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}
async function actualAtlas(page: Page) {
  return page.locator('[data-lunar-atlas]').evaluate(async (cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure;
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      if (cv.width === cv.offsetWidth * 2 && Number(cv.dataset.atlasRadius) > 0) break;
    }
    const expected = document.createElement('canvas'); expected.width = cv.width; expected.height = cv.height;
    const ctx = expected.getContext('2d')!; ctx.scale(2, 2);
    const selected = Number(cv.dataset.atlasSite);
    const labels = document.querySelector('[data-moonmission-moon-labels]')!.getAttribute('aria-pressed') === 'true';
    const result = P.drawLunarAtlas(ctx, cv.width / 2, cv.height / 2, { labels, site: selected });
    const actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const predicted = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let mismatches = 0, maximumError = 0, opaque = 0;
    for (let i = 0; i < actual.length; i += 4) {
      const error = Math.max(...[0, 1, 2, 3].map(c => Math.abs(actual[i + c] - predicted[i + c])));
      if (error) mismatches++; maximumError = Math.max(maximumError, error); if (actual[i + 3] === 255) opaque++;
    }
    return { width: cv.width, height: cv.height, selected, labels, radius: result.moonRadius,
      checked: actual.length / 4, opaque, mismatches, maximumError };
  });
}

test('Lunar crater relief follows the Sun and rim occlusion in native Canvas and the mounted atlas', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  await expect(page.locator('[data-lunar-light-note]')).toContainText('including rim shadows');
  await expect(page.locator('[data-lunar-light-note]')).toContainText('not measured topography');
  const initialState = await page.evaluate(() => JSON.stringify((window as any).__toolData.moonMission));
  const evidence = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, D = Math.PI / 180;
    // Independent geographic fixture. Neither the bowl helper nor the relief
    // helper supplies the expected normals, rim intersections or exposure.
    const landmarks: [number, number, number, string][] = [
      [-11.4, -43.3, 85, 'Tycho'], [-20.1, 9.6, 93, 'Copernicus'], [-38, 8.1, 31, 'Kepler'],
      [-47.4, 23.7, 40, 'Aristarchus'], [46.8, 16.1, 28, 'Proclus'], [-9.3, 51.6, 101, 'Plato'],
      [-68.3, -5.2, 172, 'Grimaldi'], [-14.1, -58.4, 225, 'Clavius'], [26.4, -11.4, 100, 'Theophilus'],
      [61, -8.9, 132, 'Langrenus'], [-1.9, -9.2, 153, 'Ptolemaeus'], [60.4, -25.3, 177, 'Petavius'],
      [-4, 29.7, 81, 'Archimedes'], [-3.2, -24.6, 60, 'Arzachel'], [-7, -60, 110, 'Maginus'], [37, -30, 90, 'Piccolomini'],
    ];
    const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const frames = landmarks.map(([longitude, latitude, diameter, name]) => {
      const lon = longitude * D, lat = latitude * D, angle = diameter / 3474;
      return { name, longitude, latitude, radius: Math.sin(angle), limit: Math.cos(angle),
        up: [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)],
        east: [Math.cos(lon), 0, -Math.sin(lon)],
        north: [-Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon)] };
    });
    function oracle(u: number, v: number, term: number) {
      if (u * u + v * v > 1) return null;
      const normal = [u, v, Math.sqrt(1 - u * u - v * v)];
      const sun = [Math.cos(term * D), 0, -Math.sin(term * D)];
      const frame = [...frames].reverse().find(f => dot(normal, f.up) >= f.limit);
      if (!frame) return null;
      const x = dot(normal, frame.east) / frame.radius, y = dot(normal, frame.north) / frame.radius;
      const r = Math.hypot(x, y), sx = dot(sun, frame.east), sy = dot(sun, frame.north), su = dot(sun, frame.up);
      const depth = r <= 0.65 ? 0.1 : (1 - r) * 0.1 / 0.35;
      const horizontal = Math.hypot(sx, sy);
      // Distance to the rim along the normalized horizontal Sun direction.
      const hx = horizontal ? sx / horizontal : 0, hy = horizontal ? sy / horizontal : 0;
      const perpendicular = x * hy - y * hx;
      const run = Math.sqrt(Math.max(0, 1 - perpendicular * perpendicular)) - x * hx - y * hy;
      const shadow = dot(normal, sun) <= 0 || su <= 0 || (horizontal > 1e-7 && run * su / horizontal < depth - 1e-12);
      const gradient = r > 0.65 ? 0.1 / 0.35 : 0;
      const localNormal = [-gradient * x / Math.max(r, 1e-15), -gradient * y / Math.max(r, 1e-15), 1];
      const incidence = shadow ? 0 : Math.max(0, dot(localNormal, [sx, sy, su]) / Math.hypot(...localNormal));
      return { name: frame.name, x, y, r, incidence, shadow, base: dot(normal, sun) };
    }
    function lightCanvas(term: number, enabled?: boolean) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 576;
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(288, 288, 256, 0, Math.PI * 2); ctx.fill();
      P.drawLunarLighting(ctx, 288, 288, 256, term, enabled === undefined ? undefined : { craterRelief: enabled });
      return cv;
    }
    function board(id: string, height: number, title: string, subtitle: string) {
      const cv = document.createElement('canvas'); cv.id = id; cv.width = 1180; cv.height = height;
      cv.style.cssText = 'display:block;max-width:100%;height:auto'; document.body.append(cv);
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#071224'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#f8fafc'; ctx.font = '20px system-ui'; ctx.fillText(title, 24, 30);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '13px system-ui'; ctx.fillText(subtitle, 24, 54); return { cv, ctx };
    }
    const compare = board('crater-relief-comparison', 820, 'Lunar crater relief · one Sun drives surface and bowl lighting',
      'Uniform white albedo isolates lighting. Shared illustrative crater depth; this is not a measured lunar elevation model.');
    const detail = board('crater-relief-detail', 680, 'Landmark crater detail · sloping walls and rim shadows',
      'Native lighting-mask crops enlarged 12×. Top: spherical surface. Bottom: flat floor and sloping bowl walls.');
    const terms = [P.terminatorLon(), -45, P.terminatorLon() - 180];
    const rows: any[] = [], pictures: HTMLCanvasElement[][] = [];
    for (let c = 0; c < terms.length; c++) {
      const term = terms[c], before = lightCanvas(term, false), after = lightCanvas(term, true), legacy = lightCanvas(term);
      const bp = before.getContext('2d')!.getImageData(0, 0, 576, 576).data;
      const ap = after.getContext('2d')!.getImageData(0, 0, 576, 576).data;
      const lp = legacy.getContext('2d')!.getImageData(0, 0, 576, 576).data;
      let legacyDifferences = 0, protectedPixels = 0, protectedDifferences = 0, checked = 0, mismatches = 0, maximumError = 0, changed = 0;
      let illuminated = 0, shadowed = 0;
      for (let y = 0; y < 576; y++) for (let x = 0; x < 576; x++) {
        const i = (y * 576 + x) * 4;
        if ([0, 1, 2, 3].some(k => bp[i + k] !== lp[i + k])) legacyDifferences++;
        const different = [0, 1, 2, 3].some(k => bp[i + k] !== ap[i + k]); if (different) changed++;
        const u = (x + 0.5 - 288) / 256, v = (288 - y - 0.5) / 256;
        // Protect every pixel outside conservative projected footprint bounds,
        // including the empty canvas, lunar limb, maria and inter-crater terrain.
        if (!frames.some(f => Math.abs(u - f.up[0]) < f.radius + 0.01 && Math.abs(v - f.up[1]) < f.radius + 0.01)) {
          protectedPixels++; if (different) protectedDifferences++;
        }
        const samples = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
          .map(([dx, dy]) => oracle((x + dx - 288) / 256, (288 - y - dy) / 256, term));
        // Keep all four samples inside one crater, away from the rim and the
        // floor/wall join. Native edge antialiasing cannot hide a lighting error.
        if (!samples.every(s => s && s.name === samples[0]?.name && s.r < 0.92 && Math.abs(s.r - 0.65) > 0.06)) continue;
        const exposure = samples.reduce((sum, s) => sum + Math.pow(s!.incidence, 0.55), 0) / 4;
        const a = Math.round(255 * 0.9 * (1 - exposure));
        const expected = [4, 7, 18].map(value => Math.round(255 * (1 - a / 255) + value * a / 255));
        const error = Math.max(...expected.map((value, k) => Math.abs(value - ap[i + k])));
        checked++; maximumError = Math.max(maximumError, error); if (error > 1) mismatches++;
        if (samples.every(s => s!.shadow)) shadowed++; if (samples.every(s => !s!.shadow && s!.incidence > 0.05)) illuminated++;
      }
      pictures.push([before, after]);
      rows.push({ term, legacyDifferences, protectedPixels, protectedDifferences, checked, mismatches, maximumError, changed, illuminated, shadowed });
      for (let row = 0; row < 2; row++) {
        const top = 87 + row * 365; compare.ctx.fillStyle = '#cbd5e1'; compare.ctx.font = '14px system-ui';
        compare.ctx.fillText((row ? 'Crater relief' : 'Spherical surface') + ' · terminator ' + term.toFixed(1) + '°', c * 390 + 24, top);
        compare.ctx.drawImage(pictures[c][row], 32, 32, 512, 512, c * 390 + 28, top + 15, 336, 336);
      }
    }
    const crops = [{ name: 'Theophilus', view: 0 }, { name: 'Copernicus', view: 1 }, { name: 'Langrenus', view: 0 }];
    for (let col = 0; col < crops.length; col++) {
      const crop = crops[col], f = frames.find(frame => frame.name === crop.name)!;
      const px = 288 + 256 * f.up[0], py = 288 - 256 * f.up[1];
      detail.ctx.fillStyle = '#cbd5e1'; detail.ctx.font = '15px system-ui'; detail.ctx.fillText(crop.name, col * 390 + 28, 88);
      detail.ctx.font = '12px system-ui'; detail.ctx.fillText('Terminator ' + terms[crop.view].toFixed(1) + '°', col * 390 + 28, 108);
      for (let row = 0; row < 2; row++) detail.ctx.drawImage(pictures[crop.view][row], px - 12, py - 10, 24, 20, col * 390 + 28, 126 + row * 270, 288, 240);
    }
    const theophilus = frames.find(f => f.name === 'Theophilus')!;
    function probe(x: number) {
      const v = theophilus.up.map((value, i) => Math.sqrt(1 - (x * theophilus.radius) ** 2) * value + x * theophilus.radius * theophilus.east[i]);
      return { x, expected: oracle(v[0], v[1], terms[0]), actual: P.lunarCraterRelief(v[0], v[1], terms[0]) };
    }
    return { rows, theophilus: { westWall: probe(-0.82), eastWall: probe(0.82), shadowedFloor: probe(0.60) } };
  });
  for (const row of evidence.rows) {
    expect(row.legacyDifferences).toBe(0); expect(row.protectedPixels).toBeGreaterThan(300000); expect(row.protectedDifferences).toBe(0);
    expect(row.checked).toBeGreaterThan(80); expect(row.mismatches).toBe(0); expect(row.maximumError).toBeLessThanOrEqual(1);
    expect(row.changed).toBeGreaterThan(20); expect(row.illuminated).toBeGreaterThan(5); expect(row.shadowed).toBeGreaterThan(5);
  }
  for (const probe of Object.values(evidence.theophilus)) {
    expect(probe.actual.name).toBe('Theophilus'); expect(probe.actual.incidence).toBeCloseTo(probe.expected!.incidence, 10);
    expect(probe.actual.shadow).toBe(probe.expected!.shadow);
  }
  expect(evidence.theophilus.westWall.actual.incidence).toBeGreaterThan(evidence.theophilus.westWall.actual.baseIncidence);
  expect(evidence.theophilus.eastWall.actual.shadow).toBe(true); expect(evidence.theophilus.shadowedFloor.actual.shadow).toBe(true);
  await capture(page, info, 'crater-relief-lighting-comparison', '#crater-relief-comparison');
  await capture(page, info, 'crater-relief-wall-shadow-detail', '#crater-relief-detail');
  const desktop = await actualAtlas(page);
  expect(desktop.checked).toBeGreaterThan(300000); expect(desktop.opaque).toBe(desktop.checked); expect(desktop.mismatches).toBe(0);
  await capture(page, info, 'crater-relief-atlas-1100', '[data-lunar-atlas-workspace]');
  await accessibility(page, info, 'crater-relief-a11y-1100');
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(async () => Number(await page.locator('[data-lunar-atlas]').getAttribute('data-atlas-radius'))).toBeLessThan(125);
  const phone = await actualAtlas(page);
  expect(phone.radius).toBeLessThan(desktop.radius); expect(phone.opaque).toBe(phone.checked); expect(phone.mismatches).toBe(0);
  await capture(page, info, 'crater-relief-atlas-320', '[data-lunar-atlas-workspace]');
  await accessibility(page, info, 'crater-relief-a11y-320');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.moonMission))).toBe(initialState);
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'crater-relief-measured.json'), JSON.stringify({ evidence, desktop, phone, errors }, null, 2));
});
