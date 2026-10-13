import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass63-2026-10-12/browser/earth-night-lights');
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
  if (selector.startsWith('#earth-night-')) {
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


async function nightEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    function canvas(size = 420) { const cv = document.createElement('canvas'); cv.width = cv.height = size; return cv; }
    function board(id: string, height: number, title: string, subtitle: string) {
      const cv = canvas(); cv.id = id; cv.width = 1280; cv.height = height; cv.style.cssText = 'display:block;max-width:100%;height:auto';
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#071224'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#f8fafc'; ctx.font = '20px system-ui'; ctx.fillText(title, 24, 30);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '13px system-ui'; ctx.fillText(subtitle, 24, 54); document.body.append(cv); return { cv, ctx };
    }
    const comparison = board('earth-night-comparison', 670, 'Earth at night · selected cities follow geography and local sunlight',
      'Before / after. Geographic city centers replace arbitrary coastline marks. Brightness is illustrative, not a measured 1969 light map.');
    const isolated = board('earth-night-isolated', 590, 'City emission · isolated native Canvas evidence',
      'Four Sun directions; light disappears in daylight, fades at the horizon, and is dimmed by the seeded cloud cover. Lower row: 4× native detail.');
    const catalog = P.earthCityCatalog(), rows: any[] = [], globeRows: any[] = [];
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2], ticks = [1100, 3100, 5300, 1400];
    const D = Math.PI / 180, tilt = 12 * D, r = 170, cx = 210, cy = 210;
    function smooth(value: number) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
    for (let col = 0; col < angles.length; col++) {
      const sun = angles[col], tick = ticks[col], lam0 = (20 - tick * 0.0458) * D;
      const actual = canvas(), ac = actual.getContext('2d')!, result = P.drawEarthCityLights(ac, cx, cy, r, tick, sun);
      const expected = canvas(), ec = expected.getContext('2d')!, cloudCaps = P.earthSphericalClouds(0, 0, 1, tick);
      const expectedLights: any[] = [], production = P.earthCityLights(cx, cy, r, tick, sun);
      let maximumProjectionError = 0, maximumResponseError = 0, maximumTransmissionError = 0, dimmed = 0;
      ec.save(); ec.beginPath(); ec.arc(cx, cy, r, 0, 2 * Math.PI); ec.clip();
      for (const city of catalog) {
        const lat = city.lat * D, dl = city.lon * D - lam0;
        const u = Math.cos(lat) * Math.sin(dl), v = -(Math.cos(tilt) * Math.sin(lat) - Math.sin(tilt) * Math.cos(lat) * Math.cos(dl));
        const z = Math.sin(tilt) * Math.sin(lat) + Math.cos(tilt) * Math.cos(lat) * Math.cos(dl);
        const incidence = u * Math.cos(sun) + v * Math.sin(sun), night = smooth(-incidence / Math.sin(12 * D));
        if (z <= 0 || night === 0) continue;
        // Independent cloud attenuation in the projected frame. The existing
        // cloud cap geometry supplies the seeded footprints; their center-dot
        // angular distances are recomputed here without the new city helper.
        let coverage = 0;
        for (const cap of cloudCaps) {
          const rho = Math.asin(cap.along), cosRho = Math.cos(rho);
          const dot = u * cap.x / cosRho + v * cap.y / cosRho + z * cap.z;
          const distance = Math.acos(Math.max(-1, Math.min(1, dot)));
          coverage = Math.max(coverage, smooth((rho - distance) / (rho * 0.35)));
        }
        const transmission = 1 - 0.72 * coverage, opacity = 0.9 * night * z * transmission;
        const x = cx + r * u, y = cy + r * v, radius = 3 * Math.max(0.45, r * 0.0024);
        const match = production.find((light: any) => light.name === city.name);
        if (!match) throw new Error('Missing visible city: ' + city.name);
        maximumProjectionError = Math.max(maximumProjectionError, Math.abs(match.x - x), Math.abs(match.y - y));
        maximumResponseError = Math.max(maximumResponseError, Math.abs(match.night - night), Math.abs(match.opacity - opacity));
        maximumTransmissionError = Math.max(maximumTransmissionError, Math.abs(match.transmission - transmission));
        if (transmission < 0.99) dimmed++;
        const gradient = ec.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255,243,194,0.95)'); gradient.addColorStop(0.18, 'rgba(255,220,130,0.8)');
        gradient.addColorStop(0.45, 'rgba(255,177,60,0.23)'); gradient.addColorStop(1, 'rgba(255,177,60,0)');
        ec.globalAlpha = opacity; ec.fillStyle = gradient; ec.beginPath(); ec.arc(x, y, radius, 0, Math.PI * 2); ec.fill();
        expectedLights.push({ name: city.name, x, y, u, v, z, night, transmission, opacity, radius });
      }
      ec.restore();
      const ap = ac.getImageData(0, 0, 420, 420).data, ep = ec.getImageData(0, 0, 420, 420).data;
      let visible = 0, alphaSum = 0, daylight = 0, offDisc = 0, mismatches = 0, maximumPixelError = 0;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
        const i = (y * 420 + x) * 4, a = ap[i + 3], u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r;
        if (a) { visible++; alphaSum += a; if (u * Math.cos(sun) + v * Math.sin(sun) > 0.015) daylight++; if (u * u + v * v > 1.02 ** 2) offDisc++; }
        // Compare alpha and premultiplied color: unpremultiplied RGB becomes
        // unstable when an almost transparent edge rounds to a single alpha step.
        let error = Math.abs(a - ep[i + 3]);
        for (let c = 0; c < 3; c++) error = Math.max(error, Math.abs(ap[i + c] * a / 255 - ep[i + c] * ep[i + 3] / 255));
        maximumPixelError = Math.max(maximumPixelError, error); if (error > 1) mismatches++;
      }
      rows.push({ sun, tick, result, expectedCount: expectedLights.length, productionCount: production.length,
        maximumProjectionError, maximumResponseError, maximumTransmissionError, dimmed, visible, alphaSum, daylight, offDisc, mismatches, maximumPixelError });
      isolated.ctx.fillStyle = '#cbd5e1'; isolated.ctx.font = '14px system-ui'; isolated.ctx.fillText('Sun ' + Math.round(sun / D) + '° · ' + expectedLights.length + ' visible cities', col * 320 + 24, 91);
      isolated.ctx.strokeStyle = '#203b59'; isolated.ctx.beginPath(); isolated.ctx.arc(col * 320 + 160, 227, 105, 0, Math.PI * 2); isolated.ctx.stroke();
      isolated.ctx.drawImage(actual, col * 320 + 30, 97, 260, 260);
      const brightest = [...expectedLights].sort((a, b) => b.opacity - a.opacity)[0];
      isolated.ctx.imageSmoothingEnabled = false; isolated.ctx.drawImage(actual, brightest.x - 28, brightest.y - 20, 56, 40, col * 320 + 48, 380, 224, 160);
      isolated.ctx.fillText(brightest.name + ' · 4× native pixels', col * 320 + 24, 561); isolated.ctx.imageSmoothingEnabled = true;
      const pictures: Uint8ClampedArray[] = [];
      for (const enabled of [false, true]) {
        const cv = canvas(), ctx = cv.getContext('2d')!;
        P.drawEarthGlobe(ctx, cx, cy, r, tick, sun, undefined,
          { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true, urbanLights: enabled });
        pictures.push(ctx.getImageData(0, 0, 420, 420).data);
        const top = enabled ? 380 : 90; comparison.ctx.fillStyle = '#cbd5e1'; comparison.ctx.font = '14px system-ui';
        comparison.ctx.fillText((enabled ? 'Geographic cities' : 'Before · coastline marks') + ' · Sun ' + Math.round(sun / D) + '°', col * 320 + 20, top);
        comparison.ctx.drawImage(cv, col * 320 + 35, top + 8, 250, 250);
      }
      let opaque = 0, opacityLoss = 0, nightChanged = 0, dayChanged = 0;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
        const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r; if (u * u + v * v > 0.98 ** 2) continue;
        const i = (y * 420 + x) * 4; opaque++; if (pictures[1][i + 3] !== 255) opacityLoss++;
        if ([0, 1, 2, 3].some(c => Math.abs(pictures[1][i + c] - pictures[0][i + c]) > 1)) {
          const incidence = u * Math.cos(sun) + v * Math.sin(sun); if (incidence > 0.015) dayChanged++; else nightChanged++;
        }
      }
      globeRows.push({ sun, tick, opaque, opacityLoss, nightChanged, dayChanged });
    }
    return { catalogCount: catalog.length, rows, globeRows };
  });
}

test('Earth night lights follow geographic cities, solar darkness and the rotating globe in live cameras', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const initial = await saved(page), evidence = await nightEvidence(page);
  await writeFile(join(REPORT, 'earth-night-lights-pixels.json'), JSON.stringify(evidence, null, 2));
  expect(evidence.catalogCount).toBe(99);
  for (const row of evidence.rows) {
    expect(row.expectedCount).toBeGreaterThan(5); expect(row.productionCount).toBe(row.expectedCount); expect(row.result.lights).toBe(row.expectedCount);
    expect(row.maximumProjectionError).toBeLessThan(1e-8); expect(row.maximumResponseError).toBeLessThan(1e-8); expect(row.maximumTransmissionError).toBeLessThan(1e-8);
    expect(row.visible).toBeGreaterThan(30); expect(row.alphaSum).toBeGreaterThan(100); expect(row.daylight).toBe(0); expect(row.offDisc).toBe(0);
    expect(row.mismatches).toBe(0); expect(row.maximumPixelError).toBeLessThanOrEqual(1);
  }
  expect(evidence.rows.reduce((sum, row) => sum + row.dimmed, 0)).toBeGreaterThan(0);
  for (const row of evidence.globeRows) {
    expect(row.opaque).toBeGreaterThan(80000); expect(row.opacityLoss).toBe(0); expect(row.nightChanged).toBeGreaterThan(30); expect(row.dayChanged).toBe(0);
  }
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'earth-night-lights-comparison-board', '#earth-night-comparison');
  await capture(page, info, 'earth-night-lights-isolated-board', '#earth-night-isolated');
  await page.locator('#earth-night-comparison, #earth-night-isolated').evaluateAll(nodes => nodes.forEach(node => node.remove()));
  const scenes: any[] = [];
  async function inspect(departure: boolean, label: string) {
    await settled(page, departure); const row = await sceneEarth(page, departure); scenes.push({ label, ...row });
    await writeFile(join(REPORT, 'earth-night-lights-scenes.json'), JSON.stringify(scenes, null, 2));
    expect(row.checked).toBeGreaterThan(1000); expect(row.mismatches).toBe(0);
  }
  await inspect(false, 'parking-desktop'); await capture(page, info, 'night-parking-1100', '[data-orbit-canvas]');
  await accessibility(page, info, '[data-orbit-workspace]', 'earth-night-lights-parking-a11y');
  const first = await saved(page); await mount(page, false, { ...first, orbitRun: { ...first.orbitRun, time: first.orbitRun.time + 3600 } });
  await inspect(false, 'parking-later'); await capture(page, info, 'night-parking-later-1100', '[data-orbit-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(false, 'parking-phone');
  await capture(page, info, 'night-parking-workspace-320', '[data-orbit-workspace]');
  const parkingSave = await saved(page), parkingPixels = await settled(page);
  await mount(page, false, parkingSave); expect(await settled(page)).toEqual(parkingPixels); expect(await saved(page)).toEqual(parkingSave);
  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page, true);
  // Select a valid night-facing orbit cycle with city emission inside the
  // actual close-camera crop. The orbital clock still drives Earth rotation.
  const nightFixture = await page.locator('[data-tli-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const W = cv.width / 2, H = cv.height / 2, profile = P.tliProfile(d.tliPlan), end = profile.samples[profile.samples.length - 1];
    const anchor = Math.atan2(end.y, end.x) / 2, period = P.orbitSnapshot(0).period;
    const points = profile.samples.map((s: any) => s.y * Math.cos(anchor) - s.x * Math.sin(anchor));
    const length = Math.min(78, Math.max(54, W * 0.17)), margin = Math.max(length * 1.14 + 8, length / 2 + 33);
    const lo = Math.min(...points), hi = Math.max(...points);
    const scale = Math.min(W * 0.88 / 4000000, H * 0.65 / 900000, Math.max(1, W - 2 * margin) / Math.max(1, hi - lo));
    const radius = 6371000 * scale, cx = W / 2 - (lo + hi) * scale / 2, cy = H * 0.76 + radius;
    let best: any = { score: 0, lights: [] };
    for (let cycle = 2; cycle <= 60; cycle++) {
      const orbitTime = period * (cycle + (((Math.PI * 1.5 - anchor) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI));
      const tick = (((orbitTime + d.tliRun.time) % 86164) * 360 / 86164) / 0.0458;
      const lights = P.earthCityLights(0, 0, radius, tick, 0).map((light: any) => ({ ...light, screenX: cx + light.y, screenY: cy + light.x }))
        .filter((light: any) => light.screenX > 15 && light.screenX < W - 15 && light.screenY > 70 && light.screenY < H - 46 && light.opacity > 0.01);
      const score = lights.reduce((sum: number, light: any) => sum + light.opacity, 0);
      if (score > best.score) best = { score, orbitTime, tick, lights: lights.map((light: any) => ({ name: light.name, opacity: light.opacity, x: light.screenX, y: light.screenY })) };
    }
    return best;
  });
  expect(nightFixture.score).toBeGreaterThan(0.01); expect(nightFixture.lights.length).toBeGreaterThan(0);
  const departureBase = await saved(page); await mount(page, true, { ...departureBase, tliRun: { ...departureBase.tliRun, orbitTime: nightFixture.orbitTime } });
  await inspect(true, 'departure-desktop'); await capture(page, info, 'night-departure-close-1100', '[data-tli-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(true, 'departure-phone');
  await capture(page, info, 'night-departure-workspace-320', '[data-tli-workspace]');
  await accessibility(page, info, '[data-tli-workspace]', 'earth-night-lights-departure-a11y');
  const phoneSave = await saved(page), phonePixels = await settled(page, true);
  await page.waitForTimeout(200); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await mount(page, true, phoneSave); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await page.locator('[data-tli-view]').selectOption('orbit'); await settled(page, true); await capture(page, info, 'night-departure-orbit-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(phoneSave.missionXP).toBe(0); expect(phoneSave.missionLog).toEqual([]); expect(phoneSave.missionPhase).toBe(2); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'earth-night-lights-measured.json'), JSON.stringify({ evidence, scenes, nightFixture, parkingPixels, phonePixels, bounds, errors }, null, 2));
});
