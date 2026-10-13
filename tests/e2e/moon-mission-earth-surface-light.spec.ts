import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass59-2026-10-12/browser/earth-surface');
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
  if (selector === '#earth-surface-board') {
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

async function surfaceBoard(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const board = document.createElement('canvas'); board.id = 'earth-surface-board'; board.width = 960; board.height = 820;
    board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#071224'; bc.fillRect(0, 0, 960, 820);
    bc.fillStyle = '#f8fafc'; bc.font = '20px system-ui'; bc.fillText('Earth surface · fixed directional sunlight', 24, 30);
    bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui';
    bc.fillText('Legacy globe / Sun-aligned globe / same lighting on a uniform ocean. Sun rotates right → down → left.', 24, 54);
    const rows: any[] = [];
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      const col = rows.length, variants: any[] = [];
      for (const kind of ['legacy', 'surface', 'ocean']) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 400;
        const ctx = cv.getContext('2d')!, cx = 200, cy = 200, radius = 150;
        if (kind === 'ocean') {
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
          ctx.fillStyle = '#397fd1'; ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = P.earthSurfaceGradient(ctx, cx, cy, radius, angle); ctx.fillRect(0, 0, 400, 400); ctx.restore();
        } else P.drawEarthGlobe(ctx, cx, cy, radius, 1100, angle, undefined, kind === 'surface' ? { surfaceLight: true } : undefined);
        const data = ctx.getImageData(0, 0, 400, 400).data;
        let opaque = 0, opaqueLoss = 0, samples = 0, maxError = 0, totalError = 0, farExteriorAlpha = 0;
        let litRed = 0, shadedRed = 0, litCount = 0, shadedCount = 0;
        for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
          const u = (x + 0.5 - cx) / radius, v = (y + 0.5 - cy) / radius;
          const dist = Math.hypot(u, v), off = (y * 400 + x) * 4;
          if (dist < 0.96) { opaque++; if (data[off + 3] !== 255) opaqueLoss++; }
          if (kind === 'ocean' && dist > 1.02 && data[off + 3]) farExteriorAlpha++;
          if (kind !== 'ocean' || dist > 0.94) continue;
          // Independent hemispherical-normal dot product and the documented
          // display exposure. No production light helper is used as the oracle.
          const incidence = u * Math.cos(angle) + v * Math.sin(angle);
          const exposure = 0.08 + 0.92 * Math.sqrt(Math.max(0, incidence));
          // Check away from the square-root cusp; fixed gradient stops approximate
          // it most coarsely immediately beside the terminator.
          if (Math.abs(incidence) > 0.08) {
            const error = Math.max(...[57, 127, 209].map((base, c) => Math.abs(data[off + c] - Math.round(base * exposure))));
            maxError = Math.max(maxError, error); totalError += error; samples++;
          }
          if (incidence > 0.65) { litRed += data[off]; litCount++; }
          if (incidence < -0.65) { shadedRed += data[off]; shadedCount++; }
        }
        const rowIndex = variants.length, top = 90 + rowIndex * 240;
        bc.fillStyle = '#cbd5e1'; bc.font = '14px system-ui'; bc.fillText(kind + ' · Sun ' + Math.round(angle * 180 / Math.PI) + '°', col * 320 + 24, top);
        bc.drawImage(cv, col * 320 + 50, top + 8, 220, 220);
        variants.push({ kind, opaque, opaqueLoss, samples, maxError, meanError: samples ? totalError / samples : null,
          farExteriorAlpha, litRed: litCount ? litRed / litCount : null, shadedRed: shadedCount ? shadedRed / shadedCount : null });
      }
      rows.push({ angle, variants });
    }
    document.body.append(board); return rows;
  });
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
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy); ctx.transform(-Math.sin(angle), -Math.cos(angle), -Math.cos(angle), Math.sin(angle), 0, 0);
      P.drawEarthGlobe(ctx, 0, 0, radius, tick, 0, undefined, { surfaceLight: true, oceanGlint: true, sphericalClouds: true, urbanLights: true }); ctx.restore();
    }
    const actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const predicted = ctx.getImageData(0, 0, cv.width, cv.height).data;
    // The existing 500 km ruler label is drawn after the globe. Its baseline
    // is H - 45, so the upper glyphs enter our interior sample on narrow views.
    // Exclude only its rasterized ink, retaining the Earth pixels between and
    // around the glyphs; a broad bottom/right exclusion could hide real errors.
    const label = departure ? { text: '500 km', x: W - 16, y: H - 45, font: '12px system-ui' } : null;
    let labelPixels: Uint8ClampedArray | null = null;
    if (label) {
      const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height;
      const mc = mask.getContext('2d')!; mc.scale(2, 2); mc.fillStyle = '#fff'; mc.font = label.font; mc.textAlign = 'right';
      mc.fillText(label.text, label.x, label.y); labelPixels = mc.getImageData(0, 0, mask.width, mask.height).data;
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
      label, excludedLabelPixels, excludedLabelDifferences };
  }, departure);
}

test('Earth surface light follows the shared Sun in parking and departure cameras with opaque readable geography', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const initial = await saved(page), board = await surfaceBoard(page);
  await writeFile(join(REPORT, 'earth-surface-board-pixels.json'), JSON.stringify(board, null, 2));
  for (const row of board) for (const variant of row.variants) {
    expect(variant.opaque).toBeGreaterThan(60000); expect(variant.opaqueLoss).toBe(0);
    if (variant.kind === 'ocean') {
      expect(variant.samples).toBeGreaterThan(40000); expect(variant.maxError).toBeLessThanOrEqual(3);
      expect(variant.meanError).toBeLessThan(1); expect(variant.farExteriorAlpha).toBe(0);
      expect(variant.litRed).toBeGreaterThan(variant.shadedRed * 8);
    }
  }
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'earth-surface-board', '#earth-surface-board');
  await page.locator('#earth-surface-board').evaluate(el => el.remove());
  const rows: any[] = [];
  async function inspect(departure: boolean, label: string) {
    await settled(page, departure); const row = await sceneEarth(page, departure); rows.push({ label, ...row });
    await writeFile(join(REPORT, 'earth-surface-scene-pixels.json'), JSON.stringify(rows, null, 2));
    expect(row.checked).toBeGreaterThan(1000); expect(row.mismatches).toBe(0);
  }
  await inspect(false, 'parking-desktop');
  await capture(page, info, 'surface-parking-1100', '[data-orbit-canvas]');
  await accessibility(page, info, '[data-orbit-workspace]', 'earth-surface-parking-a11y');
  await page.setViewportSize({ width: 320, height: 1000 }); await inspect(false, 'parking-phone');
  await capture(page, info, 'surface-parking-workspace-320', '[data-orbit-workspace]');
  const parkingSave = await saved(page), parkingPixels = await settled(page);
  await mount(page, false, parkingSave); expect(await settled(page)).toEqual(parkingPixels); expect(await saved(page)).toEqual(parkingSave);

  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page, true);
  const clocks = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.tliProfile(), last = profile.samples[profile.samples.length - 1];
    const anchor = Math.atan2(last.y, last.x) / 2, period = P.orbitSnapshot(0).period;
    const clock = (beta: number) => period * (2 + (((beta - anchor + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI));
    return { day: clock(0), twilight: clock(Math.PI / 2), night: clock(Math.PI) };
  });
  const base = await saved(page);
  for (const light of ['day', 'twilight', 'night'] as const) {
    await mount(page, true, { ...base, tliRun: { ...base.tliRun, orbitTime: clocks[light] } });
    await inspect(true, 'departure-' + light); await capture(page, info, 'surface-departure-' + light + '-1100', '[data-tli-canvas]');
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await mount(page, true, { ...base, tliRun: { ...base.tliRun, orbitTime: clocks.twilight } });
  await inspect(true, 'departure-phone'); await capture(page, info, 'surface-departure-workspace-320', '[data-tli-workspace]');
  await accessibility(page, info, '[data-tli-workspace]', 'earth-surface-departure-a11y');
  const phoneSave = await saved(page), phonePixels = await settled(page, true);
  await page.waitForTimeout(200); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await mount(page, true, phoneSave); expect(await settled(page, true)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await page.locator('[data-tli-view]').selectOption('orbit'); await settled(page, true);
  await capture(page, info, 'surface-departure-orbit-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settled(page, true)).toEqual(phonePixels);
  expect(await saved(page)).toEqual(phoneSave);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(phoneSave.missionXP).toBe(0); expect(phoneSave.missionLog).toEqual([]); expect(phoneSave.missionPhase).toBe(2); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'earth-surface-measured.json'), JSON.stringify({ board, rows, clocks, parkingPixels, phonePixels, bounds, errors }, null, 2));
});
