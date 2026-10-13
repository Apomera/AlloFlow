import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass60-2026-10-12/browser/earth-atmosphere');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, checkpoint?: any, departure = false) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ checkpoint, departure }) => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: checkpoint || {
      missionPhase: 2, animPaused: true, orbitPaused: true, tliPaused: true, soundOff: true, missionXP: 0, missionLog: [],
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      ...(departure ? { tliStarted: true, tliView: 'orbit', tliPlan: { duration: 342 },
        tliRun: { version: 1, duration: 342, orbitTime: 9245.011304324662, time: 150.5, recorded: false } }
        : { orbitRun: { version: 1, time: 7000 }, orbitPlaybackRate: 360 }),
    } });
  }, { checkpoint, departure });
  await expect(page.locator(departure ? '[data-tli-canvas]' : '[data-orbit-canvas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function settled(page: Page, departure = false) {
  return page.locator(departure ? '[data-tli-canvas]' : '[data-orbit-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    let previous = '', repeats = 0;
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261, opaque = 0;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
      const key = [hash >>> 0, cv.width, cv.height].join(':');
      repeats = key === previous && opaque === cv.width * cv.height && cv.width === cv.offsetWidth * 2 ? repeats + 1 : 0;
      previous = key;
      if (repeats >= 2) return { hash: hash >>> 0, width: cv.width, height: cv.height, opaque };
    }
    throw new Error('The paused atmosphere scene did not settle');
  });
}
async function capture(page: Page, info: TestInfo, name: string, selector: string) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector.startsWith('#atmosphere-')) {
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else await page.locator(selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-orbit-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}

async function shellEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, rows: any[] = [], globeRows: any[] = [];
    function board(id: string, width: number, height: number, title: string, subtitle: string) {
      const cv = document.createElement('canvas'); cv.id = id; cv.width = width; cv.height = height;
      cv.style.cssText = 'display:block;max-width:100%;height:auto'; document.body.append(cv);
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#071224'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f8fafc'; ctx.font = '20px system-ui'; ctx.fillText(title, 24, 30);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '13px system-ui'; ctx.fillText(subtitle, 24, 55); return ctx;
    }
    const bc = board('atmosphere-globe-board', 960, 640, 'Earth atmosphere · physical scale and shared sunlight',
      'Same opaque globe. Legacy decorative halo above; 0–60 km shell below. Sun: right, down, left.');
    const dc = board('atmosphere-detail-board', 960, 420, 'Atmosphere detail · same model at a larger globe radius',
      'Native pixels near the upper limb, then a 4× detail. Display opacity is illustrative; height is geometric.');
    for (const [column, angle] of [0, Math.PI / 2, Math.PI].entries()) {
      const variants: any[] = [];
      for (const thin of [false, true]) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 480; const ctx = cv.getContext('2d')!; ctx.scale(2, 2);
        P.drawEarthGlobe(ctx, 120, 120, 70, 1100, angle, undefined, { surfaceLight: true, ...(thin ? { thinAtmosphere: true } : {}) });
        variants.push(ctx.getImageData(0, 0, 480, 480).data);
        const top = thin ? 365 : 90; bc.fillStyle = '#cbd5e1'; bc.font = '14px system-ui';
        bc.fillText((thin ? '60 km shell' : 'Legacy halo') + ' · Sun ' + Math.round(angle * 180 / Math.PI) + '°', column * 320 + 24, top);
        bc.drawImage(cv, column * 320 + 40, top + 10, 240, 240);
      }
      let checked = 0, changed = 0, opacityLoss = 0;
      for (let y = 0; y < 480; y++) for (let x = 0; x < 480; x++) {
        if (Math.hypot((x + 0.5) / 2 - 120, (y + 0.5) / 2 - 120) >= 68) continue;
        const i = (y * 480 + x) * 4; checked++;
        if ([0, 1, 2, 3].some(c => variants[0][i + c] !== variants[1][i + c])) changed++;
        if (variants[1][i + 3] !== 255) opacityLoss++;
      }
      globeRows.push({ angle, checked, changed, opacityLoss });
      const strip = document.createElement('canvas'); strip.width = 300; strip.height = 180;
      const sc = strip.getContext('2d')!, stripAngle = [-Math.PI / 2, 0, Math.PI / 2][column];
      const geometry = P.drawEarthGlobeAtmosphere(sc, 150, 1150, 1000, stripAngle);
      const data = sc.getImageData(0, 0, 300, 180).data;
      let visible = 0, alphaSum = 0; for (let i = 3; i < data.length; i += 4) { alphaSum += data[i]; if (data[i]) visible++; }
      dc.fillStyle = '#cbd5e1'; dc.font = '14px system-ui'; dc.fillText(['Day', 'Twilight', 'Night'][column], column * 320 + 24, 90);
      dc.drawImage(strip, column * 320 + 10, 100);
      dc.imageSmoothingEnabled = false; dc.drawImage(strip, 114, 138, 72, 24, column * 320 + 16, 280, 288, 96);
      dc.fillStyle = '#94a3b8'; dc.font = '12px system-ui'; dc.fillText('4× native-pixel detail; radius = 1,000 px', column * 320 + 24, 400);
      globeRows[globeRows.length - 1].strip = { angle: stripAngle, geometry, visible, alphaSum };
    }
    for (const radius of [70, 280]) for (const dpr of [1, 2]) for (const angle of [0, Math.PI / 2, Math.PI]) {
      const outer = radius * (1 + 60000 / 6371000), size = Math.ceil(outer + 4) * 2;
      const cv = document.createElement('canvas'); cv.width = cv.height = size * dpr;
      const ctx = cv.getContext('2d')!; ctx.scale(dpr, dpr);
      const result = P.drawEarthGlobeAtmosphere(ctx, size / 2, size / 2, radius, angle);
      const geometry = P.earthGlobeAtmosphereGeometry(radius), pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let visible = 0, alphaSum = 0, outsideShell = 0, insideGlobe = 0, deepNight = 0, centroidX = 0, centroidY = 0;
      let minimumRadius = Infinity, maximumRadius = -Infinity;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const alpha = pixels[(y * cv.width + x) * 4 + 3]; if (!alpha) continue;
        const dx = (x + 0.5) / dpr - size / 2, dy = (y + 0.5) / dpr - size / 2, r = Math.hypot(dx, dy);
        visible++; alphaSum += alpha; centroidX += alpha * dx; centroidY += alpha * dy;
        minimumRadius = Math.min(minimumRadius, r); maximumRadius = Math.max(maximumRadius, r);
        // 1.5 native pixels cover circular antialiasing; this bound shrinks in
        // model space with DPR and cannot hide a minimum CSS-width glow.
        if (r > outer + 1.5 / dpr) outsideShell++;
        if (r < radius - 1.5 / dpr) insideGlobe++;
        if ((dx * Math.cos(angle) + dy * Math.sin(angle)) / r < -0.3) deepNight++;
      }
      rows.push({ radius, dpr, angle, outer, size, result, geometry, visible, alphaSum, outsideShell, insideGlobe, deepNight,
        minimumRadius, maximumRadius, centroidX: centroidX / alphaSum / radius, centroidY: centroidY / alphaSum / radius });
    }
    return { rows, globeRows };
  });
}

async function parkingEarth(page: Page) {
  return page.locator('[data-orbit-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, W = cv.width / 2, H = cv.height / 2;
    const cx = W < 520 ? W * 0.40 : W * 0.34, cy = H * 0.53, radius = Math.min(H * 0.22, W * 0.17);
    const time = Number(cv.dataset.orbitTime), tick = (time % 86164) * (360 / 86164) / 0.0458;
    const off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height; const oc = off.getContext('2d')!; oc.scale(2, 2);
    P.drawEarthGlobe(oc, cx, cy, radius, tick, 0, undefined, { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true, urbanLights: true });
    const actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const expected = oc.getImageData(0, 0, cv.width, cv.height).data;
    let checked = 0, mismatches = 0, maxDifference = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (Math.hypot((x + 0.5) / 2 - cx, (y + 0.5) / 2 - cy) > radius - 8) continue;
      const i = (y * cv.width + x) * 4; checked++;
      const difference = Math.max(...[0, 1, 2, 3].map(c => Math.abs(actual[i + c] - expected[i + c])));
      maxDifference = Math.max(maxDifference, difference); if (difference > 1) mismatches++;
    }
    return { W, H, cx, cy, radius, time, tick, checked, mismatches, maxDifference, sunAngle: 0, engine: cv.dataset.orbitEngine };
  });
}

test('Earth atmosphere shell stays thin, sunlit and outside the globe across desktop and phone views', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const initial = await saved(page), evidence = await shellEvidence(page);
  await writeFile(join(REPORT, 'earth-atmosphere-shell-pixels.json'), JSON.stringify(evidence, null, 2));
  for (const row of evidence.rows) {
    expect(row.geometry.radius).toBe(row.radius); expect(row.geometry.outerRadius).toBeCloseTo(row.outer, 10);
    expect(row.geometry.topHeight).toBe(60000); expect(row.geometry.bands).toBe(8); expect(row.geometry.segments).toBe(128);
    expect(row.result).not.toBeNull(); expect(row.visible).toBeGreaterThan(50); expect(row.alphaSum).toBeGreaterThan(500);
    expect(row.outsideShell).toBe(0); expect(row.insideGlobe).toBe(0); expect(row.deepNight).toBe(0);
    expect(row.centroidX * Math.cos(row.angle) + row.centroidY * Math.sin(row.angle)).toBeGreaterThan(0.45);
    expect(Math.abs(-row.centroidX * Math.sin(row.angle) + row.centroidY * Math.cos(row.angle))).toBeLessThan(0.03);
    const unrotated = evidence.rows.find(r => r.radius === row.radius && r.dpr === row.dpr && r.angle === 0)!;
    expect(Math.abs(row.alphaSum / unrotated.alphaSum - 1)).toBeLessThan(0.03);
  }
  for (const row of evidence.globeRows) { expect(row.checked).toBeGreaterThan(50000); expect(row.changed).toBe(0); expect(row.opacityLoss).toBe(0); }
  const strips = evidence.globeRows.map(row => row.strip);
  expect(strips[0].visible).toBeGreaterThan(300); expect(strips[0].alphaSum).toBeGreaterThan(strips[1].alphaSum);
  expect(strips[1].alphaSum).toBeGreaterThan(0); expect(strips[2].visible).toBe(0);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'earth-atmosphere-comparison-board', '#atmosphere-globe-board');
  await capture(page, info, 'earth-atmosphere-detail-board', '#atmosphere-detail-board');
  await page.locator('#atmosphere-globe-board, #atmosphere-detail-board').evaluateAll(nodes => nodes.forEach(node => node.remove()));
  const scenes: any[] = [];
  async function inspect(label: string) {
    await settled(page); const row = await parkingEarth(page); scenes.push({ label, ...row });
    await writeFile(join(REPORT, 'earth-atmosphere-scenes.json'), JSON.stringify(scenes, null, 2));
    expect(row.checked).toBeGreaterThan(1000); expect(row.mismatches).toBe(0); expect(row.engine).toBe('off'); return row;
  }
  const first = await inspect('desktop'); await capture(page, info, 'atmosphere-parking-1100', '[data-orbit-canvas]');
  await accessibility(page, info, 'earth-atmosphere-a11y-1100');
  const originalPixels = await settled(page), original = await saved(page);
  await mount(page, { ...original, orbitRun: { version: 1, time: first.time + 3600 } });
  const later = await inspect('desktop-later'); expect(later.tick).toBeGreaterThan(first.tick); expect(later.sunAngle).toBe(first.sunAngle);
  expect((await settled(page)).hash).not.toBe(originalPixels.hash);
  await capture(page, info, 'atmosphere-parking-later-1100', '[data-orbit-canvas]');
  const laterSave = await saved(page); await page.setViewportSize({ width: 320, height: 1000 }); await inspect('phone');
  await capture(page, info, 'atmosphere-parking-workspace-320', '[data-orbit-workspace]'); await accessibility(page, info, 'earth-atmosphere-a11y-320');
  const phonePixels = await settled(page); await page.waitForTimeout(200); expect(await settled(page)).toEqual(phonePixels); expect(await saved(page)).toEqual(laterSave);
  await mount(page, laterSave); expect(await settled(page)).toEqual(phonePixels); expect(await saved(page)).toEqual(laterSave);
  await mount(page, initial); await inspect('phone-original-time'); await capture(page, info, 'atmosphere-parking-original-320', '[data-orbit-canvas]');
  const bounds = await page.locator('[data-orbit-workspace]').evaluate(el => {
    const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320); expect(bounds.overflow).toBe(false);
  const progress = await saved(page); expect(progress.missionXP).toBe(0); expect(progress.missionLog).toEqual(initial.missionLog);
  expect(progress.earnedBadges).toEqual(initial.earnedBadges); expect(progress.missionPhase).toBe(2);
  await mount(page, undefined, true); const orbitPixels = await settled(page, true), departureSave = await saved(page);
  await capture(page, info, 'atmosphere-departure-orbit-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('burn'); await settled(page, true);
  await capture(page, info, 'atmosphere-departure-close-320', '[data-tli-canvas]');
  await page.locator('[data-tli-view]').selectOption('orbit'); expect(await settled(page, true)).toEqual(orbitPixels);
  expect(await saved(page)).toEqual(departureSave); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'earth-atmosphere-measured.json'), JSON.stringify({ evidence, scenes, bounds, phonePixels, orbitPixels, errors }, null, 2));
});
