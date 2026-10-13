import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass62-2026-10-12/browser/earth-cloud-projection');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, departure = false, checkpoint?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ departure, checkpoint }) => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: checkpoint || {
      missionPhase: 2, animPaused: true, orbitPaused: true, tliPaused: true, soundOff: true,
      missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      ...(departure ? { tliStarted: true, tliView: 'burn', tliPlan: { duration: 342 },
        tliRun: { version: 1, duration: 342, orbitTime: 9245.011304324662, time: 150.5, recorded: false } }
        : { orbitRun: { version: 1, time: 7000 }, orbitPlaybackRate: 360 }),
    } });
  }, { departure, checkpoint });
  await expect(page.locator(departure ? '[data-tli-canvas]' : '[data-orbit-canvas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function settled(page: Page, departure = false) {
  return page.locator(departure ? '[data-tli-canvas]' : '[data-orbit-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    let previous = '', repeats = 0;
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261, opaque = 0;
      for (const channel of data) hash = Math.imul(hash ^ channel, 16777619);
      for (let i = 3; i < data.length; i += 4) if (data[i] === 255) opaque++;
      const key = [hash >>> 0, cv.width, cv.height].join(':');
      repeats = key === previous && opaque === cv.width * cv.height && cv.width === cv.offsetWidth * 2 ? repeats + 1 : 0;
      previous = key;
      if (repeats >= 2) return { hash: hash >>> 0, width: cv.width, height: cv.height, opaque };
    }
    throw new Error('The paused Earth view did not settle within 30 frames');
  });
}
async function capture(page: Page, info: TestInfo, name: string, selector: string) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector.startsWith('#earth-cloud-')) {
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else await page.locator(selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, selector: string, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async selector => (await (window as any).axe.run({ include: [[selector]] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })), selector);
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}

// Independently place the opted-in globe in each real camera. Compare interior
// pixels so the atmosphere, spacecraft, labels and trajectory do not mask a
// missing scene integration or an incorrect camera transform.
async function sceneEarth(page: Page, departure = false) {
  return page.locator(departure ? '[data-tli-canvas]' : '[data-orbit-canvas]').evaluate((cv: HTMLCanvasElement, departure) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const W = cv.width / 2, H = cv.height / 2, expected = document.createElement('canvas');
    expected.width = cv.width; expected.height = cv.height; const ctx = expected.getContext('2d')!; ctx.scale(2, 2);
    let cx: number, cy: number, radius: number, tick: number, angle = 0;
    if (!departure) {
      const seconds = Number(cv.dataset.orbitTime);
      cx = W < 520 ? W * 0.40 : W * 0.34; cy = H * 0.53; radius = Math.min(H * 0.22, W * 0.17);
      tick = ((seconds % 86164) * 360 / 86164) / 0.0458;
      P.drawEarthGlobe(ctx, cx, cy, radius, tick, 0, undefined, { surfaceLight: true, oceanGlint: true, sphericalClouds: true, urbanLights: true });
    } else {
      const profile = P.tliProfile(d.tliPlan), last = profile.samples[profile.samples.length - 1];
      const anchor = Math.atan2(last.y, last.x) / 2, points = profile.samples.map((s: any) => s.y * Math.cos(anchor) - s.x * Math.sin(anchor));
      const length = Math.min(78, Math.max(54, W * 0.17)), margin = Math.max(length * 1.14 + 8, length / 2 + 33);
      const lo = Math.min(...points), hi = Math.max(...points);
      const scale = Math.min(W * 0.88 / 4000000, H * 0.65 / 900000, Math.max(1, W - 2 * margin) / Math.max(1, hi - lo));
      radius = 6371000 * scale; cx = W / 2 - (lo + hi) * scale / 2; cy = H * 0.76 + radius;
      const orbit = P.orbitSnapshot(d.tliRun.orbitTime); angle = anchor + orbit.orbAng;
      tick = (((orbit.time + Number(cv.dataset.tliTime)) % 86164) * 360 / 86164) / 0.0458;
      // Match the scene viewport clip: native filtered cloud rasterization
      // depends on this clip even for coastline pixels inside the globe.
      ctx.save(); ctx.beginPath(); ctx.rect(0, 35, W, H - 75); ctx.clip();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy); ctx.transform(-Math.sin(angle), -Math.cos(angle), -Math.cos(angle), Math.sin(angle), 0, 0);
      P.drawEarthGlobe(ctx, 0, 0, radius, tick, 0, undefined, { surfaceLight: true, oceanGlint: true, sphericalClouds: true, urbanLights: true }); ctx.restore();
    }
    const actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const predicted = ctx.getImageData(0, 0, cv.width, cv.height).data;
    // The existing 500 km ruler label is drawn after the globe. Its baseline
    // is H - 45, so the upper glyphs enter our interior sample on narrow views.
    // Exclude only its rasterized ink, retaining the Earth pixels between and
    // around the glyphs; a broad bottom/right exclusion could hide real errors.
    const overlayLabel = departure ? { text: '500 km', x: W - 16, y: H - 45, font: '12px system-ui' } : null;
    let labelPixels: Uint8ClampedArray | null = null;
    if (overlayLabel) {
      const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height;
      const mc = mask.getContext('2d')!; mc.scale(2, 2); mc.fillStyle = '#fff'; mc.font = overlayLabel.font; mc.textAlign = 'right';
      mc.fillText(overlayLabel.text, overlayLabel.x, overlayLabel.y); labelPixels = mc.getImageData(0, 0, mask.width, mask.height).data;
    }
    let checked = 0, mismatches = 0, maxDifference = 0;
    let excludedLabelPixels = 0, excludedLabelDifferences = 0;
    const examples: any[] = [];
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const px = (x + 0.5) / 2, py = (y + 0.5) / 2;
      if (Math.hypot(px - cx, py - cy) > radius - (departure ? 5 : 8)) continue;
      if (departure && (py < 70 || py > H - 46)) continue;
      const i = (y * cv.width + x) * 4; if (predicted[i + 3] !== 255) continue;
      const difference = Math.max(...[0, 1, 2, 3].map(c => Math.abs(actual[i + c] - predicted[i + c])));
      if (labelPixels && labelPixels[i + 3]) {
        excludedLabelPixels++; if (difference > 1) excludedLabelDifferences++; continue;
      }
      checked++;
      maxDifference = Math.max(maxDifference, difference);
      if (difference > 1) { mismatches++; if (examples.length < 12) examples.push({ x, y, actual: Array.from(actual.slice(i, i + 4)), expected: Array.from(predicted.slice(i, i + 4)) }); }
    }
    return { departure, W, H, cx, cy, radius, tick, angle, checked, mismatches, maxDifference, examples,
      overlayLabel, excludedLabelPixels, excludedLabelDifferences };
  }, departure);
}


async function cloudEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    function canvas(size = 420) { const cv = document.createElement('canvas'); cv.width = cv.height = size; return cv; }
    function board(id: string, height: number, title: string, subtitle: string) {
      const cv = canvas(); cv.id = id; cv.width = 1280; cv.height = height; cv.style.cssText = 'display:block;max-width:100%;height:auto';
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#071224'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#f8fafc'; ctx.font = '20px system-ui'; ctx.fillText(title, 24, 30);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '13px system-ui'; ctx.fillText(subtitle, 24, 54); document.body.append(cv);
      return { cv, ctx };
    }
    const comparison = board('earth-cloud-comparison', 670, 'Cloud footprints · curvature and a gradual passage across the horizon',
      'Before / after. Seeded cloud locations and weather timing stay fixed; each white patch now covers a finite part of the sphere.');
    const geometry = board('earth-cloud-geometry', 730, 'Cloud visibility · native Canvas and an independent spherical oracle',
      'Top: native cap path. Bottom: the surface inequality n · center ≥ cos(radius). The far side remains visible until its final edge sets.');
    const ticks = [1100, 3100, 5300, 1400], globeRows: any[] = [];
    for (let col = 0; col < ticks.length; col++) {
      const tick = ticks[col], cx = 210, cy = 210, r = 170;
      const pictures: Uint8ClampedArray[] = [];
      for (const enabled of [false, true]) {
        const cv = canvas(), ctx = cv.getContext('2d')!;
        P.drawEarthGlobe(ctx, cx, cy, r, tick, 0, undefined,
          { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: enabled });
        pictures.push(ctx.getImageData(0, 0, 420, 420).data);
        const top = enabled ? 380 : 90; comparison.ctx.fillStyle = '#cbd5e1'; comparison.ctx.font = '14px system-ui';
        comparison.ctx.fillText((enabled ? 'Spherical cloud footprints' : 'Before · planar ellipses') + ' · ' + tick, col * 320 + 20, top);
        comparison.ctx.drawImage(cv, col * 320 + 35, top + 8, 250, 250);
      }
      let opaque = 0, opacityLoss = 0, changed = 0, limbChanged = 0;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
        const rr = ((x + 0.5 - cx) / r) ** 2 + ((y + 0.5 - cy) / r) ** 2;
        if (rr > 0.98 ** 2) continue;
        const i = (y * 420 + x) * 4; opaque++; if (pictures[1][i + 3] !== 255) opacityLoss++;
        if ([0, 1, 2, 3].some(c => Math.abs(pictures[1][i + c] - pictures[0][i + c]) > 1)) {
          changed++; if (rr > 0.90 ** 2) limbChanged++;
        }
      }
      const caps = P.earthSphericalClouds(cx, cy, r, tick);
      globeRows.push({ tick, opaque, opacityLoss, changed, limbChanged, cloudCount: caps.length,
        partial: caps.filter((c: any) => c.partial).length, farSide: caps.filter((c: any) => c.z < 0).length });
    }
    const rho = 0.35, r = 170, cx = 210, cy = 210;
    function normal(z: number, angle = 0) { const h = Math.sqrt(1 - z * z); return { u: h * Math.cos(angle), v: h * Math.sin(angle), z, rho }; }
    function append(ctx: CanvasRenderingContext2D, n: any) {
      const unit = P.earthCloudCap(n.u, n.v, n.z, n.rho);
      if (!unit) return false;
      const cap = { ...unit, x: cx + r * unit.x, y: cy + r * unit.y, across: r * unit.across, along: r * unit.along };
      return P.drawEarthCloudCap(ctx, cx, cy, r, cap);
    }
    function contains(x: number, y: number, n: any) {
      const u = (x - cx) / r, v = (y - cy) / r, rr = u * u + v * v;
      return rr <= 1 && u * n.u + v * n.v + Math.sqrt(Math.max(0, 1 - rr)) * n.z >= Math.cos(n.rho);
    }
    function measure(label: string, normals: any[]) {
      const cv = canvas(), ctx = cv.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.beginPath();
      const appended = normals.map(n => append(ctx, n)); ctx.fill();
      const data = ctx.getImageData(0, 0, 420, 420).data;
      const oracle = canvas(), oc = oracle.getContext('2d')!, pixels = oc.createImageData(420, 420);
      let checked = 0, opaqueInterior = 0, emptyInterior = 0, mismatches = 0, maximumError = 0;
      let offDisc = 0, edgePixels = 0, alphaArea = 0, oracleArea = 0, overlapInterior = 0;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
        const i = (y * 420 + x) * 4, a = data[i + 3], dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const inside = normals.some(n => contains(x + 0.5, y + 0.5, n)); alphaArea += a / 255;
        if (inside) { oracleArea++; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = pixels.data[i + 3] = 255; }
        if (dx * dx + dy * dy > (r + 1.5) ** 2 && a > 0) offDisc++;
        if (dx * dx + dy * dy > (r - 2) ** 2) continue;
        // Exclude only the neighborhood where a pixel footprint meets either
        // boundary. This independently tests the sphere inequality at all nine
        // surrounding points; it never uses the production ellipse parameters.
        const probes = [-1.5, 0, 1.5].flatMap(oy => [-1.5, 0, 1.5].map(ox =>
          normals.some(n => contains(x + 0.5 + ox, y + 0.5 + oy, n))));
        if (probes.some(value => value !== inside)) { edgePixels++; continue; }
        const expected = inside ? 255 : 0, error = Math.abs(a - expected);
        checked++; if (inside) opaqueInterior++; else emptyInterior++;
        if (inside && normals.length > 1 && normals.every(n => contains(x + 0.5, y + 0.5, n))) overlapInterior++;
        maximumError = Math.max(maximumError, error); if (error > 1) mismatches++;
      }
      oc.putImageData(pixels, 0, 0);
      return { cv, oracle, row: { label, normals, appended, checked, opaqueInterior, emptyInterior, mismatches,
        maximumError, offDisc, edgePixels, alphaArea, oracleArea, overlapInterior } };
    }
    const cases = [
      { label: 'Fully on the near side', n: normal(0.8) },
      { label: 'Near-side center · partial', n: normal(0.2) },
      { label: 'Center exactly on the limb', n: normal(0) },
      { label: 'Far-side center · partial', n: normal(-0.08) },
      { label: 'Entire footprint hidden', n: normal(-0.36) },
    ];
    const rows: any[] = [];
    for (let col = 0; col < cases.length; col++) {
      const c = cases[col], m = measure(c.label, [c.n]); rows.push(m.row);
      geometry.ctx.fillStyle = '#cbd5e1'; geometry.ctx.font = '13px system-ui'; geometry.ctx.fillText(c.label, col * 256 + 12, 96);
      geometry.ctx.fillText('center z = ' + c.n.z.toFixed(2), col * 256 + 12, 115);
      for (const [source, top] of [[m.cv, 132], [m.oracle, 422]] as const) {
        const px = col * 256 + 18, diameter = 220, scale = diameter / 420;
        geometry.ctx.fillStyle = '#123255'; geometry.ctx.beginPath(); geometry.ctx.arc(px + cx * scale, top + cy * scale, r * scale, 0, Math.PI * 2); geometry.ctx.fill();
        geometry.ctx.drawImage(source, px, top, diameter, diameter);
      }
    }
    geometry.ctx.fillStyle = '#cbd5e1'; geometry.ctx.font = '14px system-ui';
    geometry.ctx.fillText('Native spherical-cap path', 24, 378); geometry.ctx.fillText('Independent per-pixel sphere oracle', 24, 680);
    const union = measure('nonzero-winding union of overlapping near- and far-side caps', [normal(0.16, -0.025), normal(-0.06, 0.025)]);
    // A dense sweep crosses the old z=0.05 center cutoff. A finite cloud should
    // keep changing gradually here and remain visible with its center behind
    // the horizon; only its final projected edge sets at z=-sin(rho).
    const sweep: any[] = [];
    for (let index = 0; index <= 60; index++) {
      const z = 0.08 - index * 0.001, cv = canvas(), ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.beginPath(); append(ctx, normal(z)); ctx.fill();
      const data = ctx.getImageData(0, 0, 420, 420).data; let area = 0;
      for (let i = 3; i < data.length; i += 4) area += data[i] / 255;
      sweep.push({ z, area });
    }
    let maximumStep = 0, increases = 0;
    for (let i = 1; i < sweep.length; i++) { maximumStep = Math.max(maximumStep, Math.abs(sweep[i].area - sweep[i - 1].area)); if (sweep[i].area > sweep[i - 1].area + 1) increases++; }
    return { globeRows, rows, union: union.row, sweep, maximumStep, increases };
  });
}

test('Earth cloud projection preserves finite spherical footprints as cloud centers cross the limb', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const initial = await saved(page), evidence = await cloudEvidence(page);
  await writeFile(join(REPORT, 'earth-cloud-projection-pixels.json'), JSON.stringify(evidence, null, 2));
  for (const row of evidence.rows.concat([evidence.union])) {
    expect(row.checked).toBeGreaterThan(80000); expect(row.mismatches).toBe(0); expect(row.maximumError).toBeLessThanOrEqual(1); expect(row.offDisc).toBe(0);
    expect(row.emptyInterior).toBeGreaterThan(60000);
  }
  expect(evidence.rows[0].opaqueInterior).toBeGreaterThan(5000);
  expect(evidence.rows[1].opaqueInterior).toBeGreaterThan(1000);
  expect(evidence.rows[2].opaqueInterior).toBeGreaterThan(100);
  expect(evidence.rows[3].opaqueInterior).toBeGreaterThan(20);
  expect(evidence.rows[3].alphaArea).toBeGreaterThan(100);
  expect(evidence.rows[4].appended).toEqual([false]); expect(evidence.rows[4].alphaArea).toBe(0);
  expect(evidence.rows.slice(0, 4).every(r => r.appended[0])).toBe(true);
  expect(evidence.union.overlapInterior).toBeGreaterThan(100);
  expect(evidence.maximumStep).toBeLessThan(evidence.sweep[0].area * 0.02); expect(evidence.increases).toBe(0);
  for (const row of evidence.globeRows) {
    expect(row.opaque).toBeGreaterThan(80000); expect(row.opacityLoss).toBe(0);
    expect(row.changed).toBeGreaterThan(20); expect(row.limbChanged).toBeGreaterThan(10); expect(row.cloudCount).toBeGreaterThan(100);
  }
  expect(evidence.globeRows.reduce((sum, r) => sum + r.partial, 0)).toBeGreaterThan(10);
  expect(evidence.globeRows.reduce((sum, r) => sum + r.farSide, 0)).toBeGreaterThan(0);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'earth-cloud-projection-comparison-board', '#earth-cloud-comparison');
  await capture(page, info, 'earth-cloud-projection-geometry-board', '#earth-cloud-geometry');
  await page.locator('#earth-cloud-comparison, #earth-cloud-geometry').evaluateAll(nodes => nodes.forEach(node => node.remove()));
  const scenes: any[] = [];
  async function inspect(departure: boolean, label: string) {
    await settled(page, departure); const row = await sceneEarth(page, departure); scenes.push({ label, ...row });
    await writeFile(join(REPORT, 'earth-cloud-projection-scenes.json'), JSON.stringify(scenes, null, 2));
    expect(row.checked).toBeGreaterThan(1000); expect(row.mismatches).toBe(0);
  }
  await inspect(false, 'parking-desktop'); await capture(page, info, 'cloud-parking-1100', '[data-orbit-canvas]');
  await accessibility(page, info, '[data-orbit-workspace]', 'earth-cloud-projection-parking-a11y');
  const first = await saved(page); await mount(page, false, { ...first, orbitRun: { ...first.orbitRun, time: first.orbitRun.time + 3600 } });
  await inspect(false, 'parking-later'); await capture(page, info, 'cloud-parking-later-1100', '[data-orbit-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(false, 'parking-phone');
  await capture(page, info, 'cloud-parking-workspace-320', '[data-orbit-workspace]');
  const parkingSave = await saved(page), parkingPixels = await settled(page);
  await mount(page, false, parkingSave); expect(await settled(page)).toEqual(parkingPixels); expect(await saved(page)).toEqual(parkingSave);
  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page, true);
  // Put the close camera on the sunlit horizon so foreshortened cloud
  // footprints can be inspected at both desktop and phone viewport sizes.
  const betaZeroClock = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, p = P.tliProfile(), end = p.samples[p.samples.length - 1];
    const anchor = Math.atan2(end.y, end.x) / 2, period = P.orbitSnapshot(0).period;
    return period * (2 + (((-anchor + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI));
  });
  const departureBase = await saved(page); await mount(page, true, { ...departureBase, tliRun: { ...departureBase.tliRun, orbitTime: betaZeroClock } });
  await inspect(true, 'departure-desktop'); await capture(page, info, 'cloud-departure-close-1100', '[data-tli-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(true, 'departure-phone');
  await capture(page, info, 'cloud-departure-workspace-320', '[data-tli-workspace]');
  await accessibility(page, info, '[data-tli-workspace]', 'earth-cloud-projection-departure-a11y');
  const phoneSave = await saved(page), phonePixels = await settled(page, true);
  await page.waitForTimeout(200); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await mount(page, true, phoneSave); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await page.locator('[data-tli-view]').selectOption('orbit'); await settled(page, true); await capture(page, info, 'cloud-departure-orbit-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(phoneSave.missionXP).toBe(0); expect(phoneSave.missionLog).toEqual([]); expect(phoneSave.missionPhase).toBe(2); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'earth-cloud-projection-measured.json'), JSON.stringify({ evidence, scenes, betaZeroClock, parkingPixels, phonePixels, bounds, errors }, null, 2));
});
