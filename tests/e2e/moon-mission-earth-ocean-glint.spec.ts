import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass61-2026-10-12/browser/earth-ocean-glint');
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
  if (selector.startsWith('#earth-glint-')) {
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


async function glintEvidence(page: Page) {
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
    const comparison = board('earth-glint-comparison', 670, 'Ocean sunlight · a reflection tied to the spherical surface',
      'Before / after. The Sun rotates right → down → left → up; geography advances independently.');
    const isolated = board('earth-glint-isolated', 420, 'Ocean reflection · isolated native Canvas evidence',
      'The brightest surface normal bisects the Sun and view directions. Opacity and roughness are illustrative.');
    const rows: any[] = [], geometryRows: any[] = [];
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2], ticks = [1100, 3100, 5300, 1400];
    for (let col = 0; col < angles.length; col++) {
      const angle = angles[col], tick = ticks[col], cx = 210, cy = 210, r = 170;
      const glint = canvas(), gc = glint.getContext('2d')!; P.drawEarthOceanGlint(gc, cx, cy, r, angle);
      const overlay = gc.getImageData(0, 0, 420, 420).data;
      let checked = 0, maxAlphaError = 0, alphaErrorSum = 0, maxPremultipliedError = 0, litPixels = 0;
      let offDisc = 0, nightLeak = 0, peak = 0, peakX = 0, peakY = 0, alphaSum = 0, centroidX = 0, centroidY = 0;
      for (let y = 0; y < 420; y++) for (let x = 0; x < 420; x++) {
        const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r, rr = u * u + v * v, i = (y * 420 + x) * 4;
        const a = overlay[i + 3], incidence = u * Math.cos(angle) + v * Math.sin(angle);
        if (a) {
          litPixels++; alphaSum += a; centroidX += a * u; centroidY += a * v;
          if (rr > 1.02 * 1.02) offDisc++;
          if (incidence < -0.01) nightLeak++;
          if (a > peak) { peak = a; peakX = u; peakY = v; }
        }
        if (rr >= 0.98 * 0.98) continue;
        // Independent spherical normal and half-vector oracle. This deliberately
        // does not call the production glint, cap or surface-light helpers.
        const normalZ = Math.sqrt(1 - rr), halfDot = (incidence + normalZ) / Math.sqrt(2);
        const strength = incidence > 0 ? 0.42 * Math.max(0, halfDot) ** 64 : 0;
        const error = Math.abs(a - 255 * strength); checked++; maxAlphaError = Math.max(maxAlphaError, error); alphaErrorSum += error;
        for (let channel = 0; channel < 3; channel++) {
          maxPremultipliedError = Math.max(maxPremultipliedError, Math.abs(overlay[i + channel] * a / 255 - [236, 244, 250][channel] * strength));
        }
      }
      rows.push({ angle, checked, maxAlphaError, meanAlphaError: alphaErrorSum / checked, maxPremultipliedError,
        litPixels, offDisc, nightLeak, peak, peakX, peakY, peakDistance: Math.hypot(peakX - Math.cos(angle) / Math.sqrt(2), peakY - Math.sin(angle) / Math.sqrt(2)),
        alphaSum, centroidX: centroidX / alphaSum, centroidY: centroidY / alphaSum });
      isolated.ctx.fillStyle = '#cbd5e1'; isolated.ctx.font = '14px system-ui'; isolated.ctx.fillText('Sun ' + Math.round(angle * 180 / Math.PI) + '°', col * 320 + 24, 92);
      isolated.ctx.drawImage(glint, col * 320 + 30, 106, 260, 260);
      const full: Uint8ClampedArray[] = [], bare: Uint8ClampedArray[] = [];
      for (const enabled of [false, true]) {
        const cv = canvas(), ctx = cv.getContext('2d')!;
        P.drawEarthGlobe(ctx, cx, cy, r, tick, angle, undefined, { surfaceLight: true, thinAtmosphere: true, oceanGlint: enabled });
        full.push(ctx.getImageData(0, 0, 420, 420).data);
        const top = enabled ? 380 : 90; comparison.ctx.fillStyle = '#cbd5e1'; comparison.ctx.font = '14px system-ui';
        comparison.ctx.fillText((enabled ? 'Ocean reflection' : 'Before') + ' · Sun ' + Math.round(angle * 180 / Math.PI) + '°', col * 320 + 24, top);
        comparison.ctx.drawImage(cv, col * 320 + 35, top + 8, 250, 250);
        const water = canvas(), wc = water.getContext('2d')!;
        wc.save(); wc.beginPath(); wc.arc(cx, cy, r, 0, Math.PI * 2); wc.clip(); wc.fillStyle = '#397fd1'; wc.fillRect(0, 0, 420, 420);
        if (enabled) P.drawEarthOceanGlint(wc, cx, cy, r, angle);
        wc.fillStyle = P.earthSurfaceGradient(wc, cx, cy, r, angle); wc.fillRect(0, 0, 420, 420); wc.restore();
        bare.push(wc.getImageData(0, 0, 420, 420).data);
      }
      const land = canvas(), ice = canvas(), clouds = canvas(), lc = land.getContext('2d')!, ic = ice.getContext('2d')!, cc = clouds.getContext('2d')!;
      for (const path of P.earthLandPaths(cx, cy, r, tick)) {
        const mask = path.k === 'ice' ? ic : lc; mask.fillStyle = '#fff'; mask.beginPath(); mask.moveTo(path.pts[0][0], path.pts[0][1]);
        for (let i = 1; i < path.pts.length; i++) mask.lineTo(path.pts[i][0], path.pts[i][1]); mask.closePath(); mask.fill();
      }
      cc.filter = 'blur(' + Math.max(0.6, r * 0.012).toFixed(2) + 'px)'; cc.fillStyle = 'rgba(255,255,255,0.5)'; cc.beginPath();
      for (const c of P.earthClouds(cx, cy, r, tick)) {
        cc.moveTo(c.x + c.across * Math.cos(c.rot), c.y + c.across * Math.sin(c.rot));
        cc.ellipse(c.x, c.y, c.across, c.along, c.rot, 0, Math.PI * 2);
      }
      cc.fill();
      const lm = lc.getImageData(0, 0, 420, 420).data, im = ic.getImageData(0, 0, 420, 420).data, cm = cc.getImageData(0, 0, 420, 420).data;

      // Counterfactual ice without exclusion: draw the reflection under the
      // existing translucent ice and clouds. Its visible difference demonstrates
      // that unchanged ice in the real globe actually exercises the exclusion.
      const unmaskedIce: Uint8ClampedArray[] = [];
      for (const enabled of [false, true]) {
        const counter = canvas(), uc = counter.getContext('2d')!;
        uc.save(); uc.beginPath(); uc.arc(cx, cy, r, 0, Math.PI * 2); uc.clip();
        uc.fillStyle = '#397fd1'; uc.fillRect(0, 0, 420, 420);
        if (enabled) P.drawEarthOceanGlint(uc, cx, cy, r, angle);
        uc.fillStyle = 'rgba(236,244,250,0.92)';
        for (const icePath of P.earthLandPaths(cx, cy, r, tick)) {
          if (icePath.k !== 'ice') continue;
          uc.beginPath(); uc.moveTo(icePath.pts[0][0], icePath.pts[0][1]);
          for (let j = 1; j < icePath.pts.length; j++) uc.lineTo(icePath.pts[j][0], icePath.pts[j][1]); uc.closePath(); uc.fill();
        }
        uc.drawImage(clouds, 0, 0); uc.fillStyle = P.earthSurfaceGradient(uc, cx, cy, r, angle);
        uc.fillRect(0, 0, 420, 420); uc.restore(); unmaskedIce.push(uc.getImageData(0, 0, 420, 420).data);
      }
      let iceCounterfactual = 0, maximumIceCounterfactual = 0;
      let opaque = 0, opacityLoss = 0, landChecked = 0, landChanged = 0, iceChecked = 0, iceChanged = 0, nightChecked = 0, nightChanged = 0;
      let waterBrighter = 0, waterDarker = 0, cloudChecked = 0, cloudDelta = 0, clearDelta = 0, maxCloudError = 0;
      for (let y = 3; y < 417; y++) for (let x = 3; x < 417; x++) {
        const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r; if (u * u + v * v > 0.94 * 0.94) continue;
        const i = (y * 420 + x) * 4, incidence = u * Math.cos(angle) + v * Math.sin(angle);
        const difference = Math.max(...[0, 1, 2, 3].map(c => Math.abs(full[1][i + c] - full[0][i + c])));
        const deepMask = (mask: Uint8ClampedArray) => [0, -2, 2, -840, 840].every(offset => mask[i + offset * 4 + 3] === 255);
        opaque++; if (full[1][i + 3] !== 255) opacityLoss++;
        if (deepMask(lm)) { landChecked++; if (difference) landChanged++; }
        if (deepMask(im)) {
          iceChecked++; if (difference) iceChanged++;
          const iceDelta = unmaskedIce[1][i] - unmaskedIce[0][i];
          if (iceDelta >= 2) iceCounterfactual++; maximumIceCounterfactual = Math.max(maximumIceCounterfactual, iceDelta);
        }
        if (incidence < -0.05) { nightChecked++; if (difference) nightChanged++; }
        if (lm[i + 3] || im[i + 3]) continue;
        const increment = full[1][i] - full[0][i], bareIncrement = bare[1][i] - bare[0][i];
        if (increment > 2) waterBrighter++; if (increment < -1) waterDarker++;
        if (cm[i + 3] > 20 && bareIncrement > 8) {
          cloudChecked++; cloudDelta += increment; clearDelta += bareIncrement;
          maxCloudError = Math.max(maxCloudError, Math.abs(increment - bareIncrement * (1 - cm[i + 3] / 255)));
        }
      }
      geometryRows.push({ angle, tick, opaque, opacityLoss, landChecked, landChanged, iceChecked, iceChanged, nightChecked, nightChanged,
        waterBrighter, waterDarker, cloudChecked, cloudDelta, clearDelta, maxCloudError, iceCounterfactual, maximumIceCounterfactual });
    }
    return { rows, geometryRows };
  });
}

test('Earth ocean glint follows the Sun and curved surface while land, ice and clouds keep their material response', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const initial = await saved(page), evidence = await glintEvidence(page);
  await writeFile(join(REPORT, 'earth-ocean-glint-pixels.json'), JSON.stringify(evidence, null, 2));
  for (const row of evidence.rows) {
    expect(row.checked).toBeGreaterThan(80000); expect(row.litPixels).toBeGreaterThan(3000); expect(row.offDisc).toBe(0); expect(row.nightLeak).toBe(0);
    // A cached analytical sprite composites only once. Three 8-bit levels cover
    // its initial alpha rounding, bilinear resampling and color unpremultiplication.
    expect(row.maxAlphaError).toBeLessThanOrEqual(3); expect(row.meanAlphaError).toBeLessThan(0.75);
    expect(row.maxPremultipliedError).toBeLessThanOrEqual(3); expect(row.peak).toBeGreaterThan(95); expect(row.peak).toBeLessThanOrEqual(112);
    expect(row.peakDistance).toBeLessThan(0.07);
    expect(row.centroidX * Math.cos(row.angle) + row.centroidY * Math.sin(row.angle)).toBeGreaterThan(0.62);
    expect(Math.abs(-row.centroidX * Math.sin(row.angle) + row.centroidY * Math.cos(row.angle))).toBeLessThan(0.01);
  }
  for (const row of evidence.geometryRows) {
    expect(row.opaque).toBeGreaterThan(70000); expect(row.opacityLoss).toBe(0); expect(row.landChecked).toBeGreaterThan(1000);
    expect(row.landChanged).toBe(0); expect(row.iceChanged).toBe(0); expect(row.nightChecked).toBeGreaterThan(30000); expect(row.nightChanged).toBe(0);
    expect(row.waterBrighter).toBeGreaterThan(100); expect(row.waterDarker).toBe(0); expect(row.maxCloudError).toBeLessThanOrEqual(3);
  }
  expect(evidence.geometryRows.reduce((sum, r) => sum + r.iceChecked, 0)).toBeGreaterThan(1000);
  const sunUpIce = evidence.geometryRows.find(r => r.angle === -Math.PI / 2)!;
  expect(sunUpIce.iceCounterfactual).toBeGreaterThan(20); expect(sunUpIce.maximumIceCounterfactual).toBeGreaterThanOrEqual(2);
  expect(evidence.geometryRows.reduce((sum, r) => sum + r.cloudChecked, 0)).toBeGreaterThan(50);
  expect(evidence.geometryRows.reduce((sum, r) => sum + r.cloudDelta, 0)).toBeLessThan(evidence.geometryRows.reduce((sum, r) => sum + r.clearDelta, 0) * 0.95);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'earth-ocean-glint-comparison-board', '#earth-glint-comparison');
  await capture(page, info, 'earth-ocean-glint-isolated-board', '#earth-glint-isolated');
  await page.locator('#earth-glint-comparison, #earth-glint-isolated').evaluateAll(nodes => nodes.forEach(node => node.remove()));
  const scenes: any[] = [];
  async function inspect(departure: boolean, label: string) {
    await settled(page, departure); const row = await sceneEarth(page, departure); scenes.push({ label, ...row });
    await writeFile(join(REPORT, 'earth-ocean-glint-scenes.json'), JSON.stringify(scenes, null, 2));
    expect(row.checked).toBeGreaterThan(1000); expect(row.mismatches).toBe(0);
  }
  await inspect(false, 'parking-desktop'); await capture(page, info, 'glint-parking-1100', '[data-orbit-canvas]');
  await accessibility(page, info, '[data-orbit-workspace]', 'earth-ocean-glint-parking-a11y');
  const first = await saved(page); await mount(page, false, { ...first, orbitRun: { ...first.orbitRun, time: first.orbitRun.time + 3600 } });
  await inspect(false, 'parking-later'); await capture(page, info, 'glint-parking-later-1100', '[data-orbit-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(false, 'parking-phone');
  await capture(page, info, 'glint-parking-workspace-320', '[data-orbit-workspace]');
  const parkingSave = await saved(page), parkingPixels = await settled(page);
  await mount(page, false, parkingSave); expect(await settled(page)).toEqual(parkingPixels); expect(await saved(page)).toEqual(parkingSave);
  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page, true);
  // In the close burn camera the top limb faces the Sun at beta=0. The glint
  // maximum lies at radius/sqrt(2), below this narrow horizon crop. Its absence
  // at the visible horizon is geometrically correct, not a camera-fixed glow.
  const betaZeroClock = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, p = P.tliProfile(), end = p.samples[p.samples.length - 1];
    const anchor = Math.atan2(end.y, end.x) / 2, period = P.orbitSnapshot(0).period;
    return period * (2 + (((-anchor + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI));
  });
  const departureBase = await saved(page); await mount(page, true, { ...departureBase, tliRun: { ...departureBase.tliRun, orbitTime: betaZeroClock } });
  await inspect(true, 'departure-desktop'); await capture(page, info, 'glint-departure-close-1100', '[data-tli-canvas]');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(true, 'departure-phone');
  await capture(page, info, 'glint-departure-workspace-320', '[data-tli-workspace]');
  await accessibility(page, info, '[data-tli-workspace]', 'earth-ocean-glint-departure-a11y');
  const phoneSave = await saved(page), phonePixels = await settled(page, true);
  await page.waitForTimeout(200); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await mount(page, true, phoneSave); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await page.locator('[data-tli-view]').selectOption('orbit'); await settled(page, true); await capture(page, info, 'glint-departure-orbit-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(phoneSave.missionXP).toBe(0); expect(phoneSave.missionLog).toEqual([]); expect(phoneSave.missionPhase).toBe(2); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'earth-ocean-glint-measured.json'), JSON.stringify({ evidence, scenes, betaZeroClock, parkingPixels, phonePixels, bounds, errors }, null, 2));
});
