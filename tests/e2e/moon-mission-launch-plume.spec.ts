import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass69-2026-10-14/browser/launch-plume');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    const begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo, fill = proto.fill, rect = proto.fillRect;
    const gradient = proto.createLinearGradient, add = CanvasGradient.prototype.addColorStop;
    proto.beginPath = function (...args: any[]) { this.__mm69Path = []; return begin.apply(this, args); };
    for (const [name, original] of [['moveTo', move], ['lineTo', line]]) {
      proto[name] = function (x: number, y: number) { if (this.__mm69Path) this.__mm69Path.push([x, y]); return original.call(this, x, y); };
    }
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) this.canvas.__mm69 = { jets: [] };
      return rect.call(this, x, y, ...args);
    };
    proto.createLinearGradient = function (...args: any[]) { const result = gradient.apply(this, args); result.__mm69Stops = []; return result; };
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm69Stops) (this as any).__mm69Stops.push([offset, color]); return add.call(this, offset, color);
    };
    proto.fill = function (...args: any[]) {
      const stops = this.fillStyle?.__mm69Stops, first = stops?.[0]?.[1]?.replace(/\s+/g, '');
      if (this.canvas.__mm69 && first && /^rgba\((255,120,0|172,205,255),/.test(first)) {
        const m = this.getTransform();
        this.canvas.__mm69.jets.push({ mouth: this.__mm69Path.slice(0, 2), rotation: Math.atan2(m.b, m.a), color: first });
      }
      return fill.apply(this, args);
    };
  });
}

async function mount(page: Page, moonMission?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: data || { missionPhase: 1, animPaused: true, launchPaused: true, soundOff: true,
      missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
  }, moonMission);
  await expect(page.locator('[data-launch-canvas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function launch(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({ ...cv.dataset }));
}
function physical(data: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('launchHorizon')));
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-launch-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs(Number((await launch(page)).launchTime) - time)).toBeLessThan(0.11);
  return time;
}
async function scene(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const P = (window as any).MoonMissionPure, data = { ...cv.dataset }, time = Number(data.launchTime);
    const sample = P.launchSample(P.launchProfile(), Math.max(0, time));
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < pixels.length; i++) { checksum = Math.imul(checksum ^ pixels[i], 16777619) >>> 0; if (i % 4 === 3 && pixels[i] === 255) opaque++; }
    return { data, sample: { stage: sample.stage, engineCount: sample.engineCount, engineOn: sample.engineOn,
      thrust: sample.thrust, altitude: sample.altitude, pressure: sample.pressure, speed: sample.speed, pitch: sample.pitch },
      jets: (cv as any).__mm69?.jets || [],
      time, width: cv.width, height: cv.height, opaque, checksum, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  const active = value.time >= 0 && value.sample.engineOn && value.sample.thrust > 0;
  expect(value.data.launchPlumeActive).toBe(String(active));
  expect(value.data.launchPlumeFuel).toBe(value.sample.stage === 1 ? 'kerosene' : 'hydrogen');
  expect(Number(value.data.launchPlumeEngines)).toBe(active ? value.sample.engineCount : 0);
  expect(Number(value.data.launchPlumeJets)).toBe(active ? value.sample.stage === 3 ? 1 : 3 : 0);
  expect(value.jets).toHaveLength(active ? value.sample.stage === 3 ? 1 : 3 : 0);
  for (const jet of value.jets) {
    expect(jet.rotation, 'native plume paths share the vehicle attitude').toBeCloseTo(value.sample.pitch, 8);
    expect(jet.mouth[0][1]).toBeCloseTo(jet.mouth[1][1], 9);
    expect(jet.mouth[1][0]).toBeGreaterThan(jet.mouth[0][0]);
  }
  expect(Number(value.data.launchPlumeExpansion)).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(Number(value.data.launchPlumeExpansion))).toBe(true);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.opaque).toBe(value.pixels);
  expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
}
async function capture(page: Page, info: TestInfo, name: string) {
  const target = page.locator('[data-launch-workspace]'), cv = target.locator('[data-launch-canvas]');
  await cv.scrollIntoViewIfNeeded();
  await scene(page);
  const bounds = await target.evaluate(el => { const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  const box = await cv.evaluate(el => { const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  const png = readPng(await page.screenshot({ path, fullPage: true, clip: bounds }));
  expect(Math.abs(png.width - bounds.width)).toBeLessThanOrEqual(1); expect(Math.abs(png.height - bounds.height)).toBeLessThanOrEqual(1);
  let bright = 0, samples = 0, minimum = 255, maximum = 0;
  for (let y = Math.ceil(box.y - bounds.y) + 4; y < Math.min(png.height, Math.floor(box.y - bounds.y + box.height) - 4); y += 2) {
    for (let x = Math.ceil(box.x - bounds.x) + 4; x < Math.min(png.width, Math.floor(box.x - bounds.x + box.width) - 4); x += 2) {
      const value = Math.max(...png.at(x, y)); samples++; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
      if (value > 110) bright++;
    }
  }
  expect(samples).toBeGreaterThan(10000); expect(bright).toBeGreaterThan(100); expect(maximum - minimum).toBeGreaterThan(70);
  await writeFile(path.replace(/\.png$/, '-pixels.json'), JSON.stringify({ width: png.width, height: png.height, samples, bright, minimum, maximum }, null, 2));
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-launch-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}

async function nativePlumes(page: Page) {
  const result = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), scale = 3, cx = 320, nozzle = 32;
    const first = P.launchSample(profile, 10), second = P.launchSample(profile, profile.events.stage1.time + 20);
    const third = P.launchSample(profile, profile.events.stage2.time + 15);
    const sea = { ...first, pressure: 101325 }, vacuum = { ...first, pressure: 0 };
    const cases = { sea, vacuum, repeat: vacuum, fast: { ...vacuum, speed: 100000, airSpeed: 100000 },
      centerCutoff: { ...vacuum, engineCount: 4, thrust: vacuum.thrust * 4 / 5 },
      hydrogen: { ...second, pressure: 0 }, single: { ...third, pressure: 0 },
      coast: { ...second, engineOn: false, engineCount: 0, thrust: 0 } };
    const rows = Object.entries(cases).map(([name, sample]: [string, any]) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 600; (cv as any).__mm69 = { jets: [] };
      const ctx = cv.getContext('2d', { willReadFrequently: true })!, geometry = P.launchPlumeGeometry(sample, scale, 10);
      P.drawLaunchPlume(ctx, cx, nozzle, geometry);
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let checksum = 2166136261, painted = 0, aboveNozzle = 0, crossSectionMin = cv.width, crossSectionMax = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const index = (y * cv.width + x) * 4;
        for (let k = 0; k < 4; k++) checksum = Math.imul(checksum ^ rgba[index + k], 16777619) >>> 0;
        if (rgba[index + 3]) { painted++; if (y < nozzle) aboveNozzle++; }
        if (y === nozzle + 70 && rgba[index + 3] > 2) { crossSectionMin = Math.min(crossSectionMin, x); crossSectionMax = Math.max(crossSectionMax, x); }
      }
      // Mouth locations come from the Saturn bell dimensions, independent of
      // the plume helper. Native paths and pixels must meet those same exits.
      const offsets = sample.stage === 3 ? [0] : [-0.33 * 10.1 * scale, 0, 0.33 * 10.1 * scale];
      const half = (sample.stage === 1 ? 3.7 : 2.1) * scale / 2;
      const mouths = offsets.map(offset => { const index = ((nozzle + 2) * cv.width + Math.floor(cx + offset)) * 4;
        return { center: cx + offset, left: cx + offset - half, right: cx + offset + half, rgba: Array.from(rgba.slice(index, index + 4)) }; });
      return { name, stage: sample.stage, geometry: { active: geometry.active, fuel: geometry.fuel, engineCount: geometry.engineCount,
        expansion: geometry.expansion, length: geometry.length, weights: geometry.jets.map((jet: any) => jet.weight) },
        jets: (cv as any).__mm69.jets, mouths, painted, aboveNozzle, checksum,
        crossSection: crossSectionMax < crossSectionMin ? 0 : crossSectionMax - crossSectionMin + 1 };
    });
    return { scale, nozzle, rows };
  });
  const rows = Object.fromEntries(result.rows.map(row => [row.name, row]));
  for (const row of result.rows) {
    expect(row.aboveNozzle, row.name + ': exhaust begins at the bell exit').toBe(0);
    if (!row.geometry.active) { expect(row.painted).toBe(0); expect(row.jets).toHaveLength(0); continue; }
    expect(row.painted).toBeGreaterThan(200); expect(row.jets).toHaveLength(row.mouths.length);
    row.jets.forEach((jet: any, i: number) => {
      expect(jet.mouth[0][0]).toBeCloseTo(row.mouths[i].left, 8); expect(jet.mouth[1][0]).toBeCloseTo(row.mouths[i].right, 8);
      expect(jet.mouth[0][1]).toBe(result.nozzle); expect(jet.mouth[1][1]).toBe(result.nozzle);
      expect(row.mouths[i].rgba[3], 'each projected mouth has visible native exhaust').toBeGreaterThan(5);
    });
  }
  expect(rows.vacuum.crossSection, 'lower ambient pressure visibly widens the exhaust').toBeGreaterThan(rows.sea.crossSection);
  expect(rows.vacuum.checksum).toBe(rows.repeat.checksum); expect(rows.vacuum.checksum).toBe(rows.fast.checksum);
  expect(rows.vacuum.geometry.weights).toEqual([1, 3, 1]); expect(rows.centerCutoff.geometry.weights).toEqual([1, 2, 1]);
  expect(rows.centerCutoff.mouths[1].rgba[3]).toBeLessThan(rows.vacuum.mouths[1].rgba[3]);
  expect(rows.centerCutoff.mouths[1].rgba[3]).toBeGreaterThan(10);
  for (const index of [0, 2]) expect(Math.abs(rows.centerCutoff.mouths[index].rgba[3] - rows.vacuum.mouths[index].rgba[3])).toBeLessThanOrEqual(1);
  expect(rows.vacuum.mouths[1].rgba[0]).toBeGreaterThan(rows.vacuum.mouths[1].rgba[2]);
  expect(rows.hydrogen.mouths[1].rgba[2]).toBeGreaterThan(rows.hydrogen.mouths[1].rgba[0]);
  expect(rows.hydrogen.mouths[1].rgba[3]).toBeLessThan(rows.vacuum.mouths[1].rgba[3]);
  expect(rows.single.jets).toHaveLength(1);
  return result;
}

test('Launch nozzle plumes follow engine state and pressure through flight, review and phone resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativePlumes(page);
  const profile = await page.evaluate(() => { const p = (window as any).MoonMissionPure.launchProfile(); return { events: p.events, summary: p.summary }; });
  const countdown = await scene(page); checkScene(countdown); expect(countdown.data.launchPlumeActive).toBe('false');
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = { countdown };
  const times = { low: 10, high: profile.events.stage1.time - 10, stage2: profile.events.stage1.time + 20,
    stage3: profile.events.stage2.time + 15 };
  for (const [name, time] of Object.entries(times)) {
    await seek(page, time); scenes[name] = await scene(page); checkScene(scenes[name]);
    expect(scenes[name].data.launchPlumeActive).toBe('true');
    await capture(page, info, 'launch-plume-desktop-' + name);
  }
  expect(scenes.low.sample.engineCount).toBe(5); expect(scenes.high.sample.engineCount).toBe(4);
  expect(Number(scenes.high.data.launchPlumeExpansion)).toBeGreaterThan(Number(scenes.low.data.launchPlumeExpansion));
  expect(scenes.stage2.sample.stage).toBe(2); expect(scenes.stage3.sample.stage).toBe(3);
  for (const name of ['stage1', 'stage2']) {
    await page.locator('[data-launch-milestone="' + name + '"]').click();
    await expect.poll(async () => Number((await launch(page)).launchTime)).toBe(profile.events[name].time);
    scenes[name + 'Coast'] = await scene(page); checkScene(scenes[name + 'Coast']);
    expect(scenes[name + 'Coast'].data.launchPlumeActive).toBe('false');
  }
  await accessibility(page, info, 'launch-plume-desktop-axe');
  await seek(page, times.stage2); const beforeResize = await launch(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value);
    expect(physical(value.data)).toEqual(physical(beforeResize)); expect(await saved(page)).toEqual(beforeSave);
    resizeProbes.push(value);
  }
  scenes.phoneStage2 = await scene(page); await capture(page, info, 'launch-plume-phone-stage2');
  await seek(page, times.high); scenes.phoneHigh = await scene(page); checkScene(scenes.phoneHigh);
  expect(physical(scenes.phoneHigh.data)).toEqual(physical(scenes.high.data));
  await capture(page, info, 'launch-plume-phone-high'); await accessibility(page, info, 'launch-plume-phone-axe');
  const paused = await scene(page); await page.waitForTimeout(180); const still = await scene(page);
  expect(still.checksum).toBe(paused.checksum); expect(still.data).toEqual(paused.data);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1');
  const slow = await scene(page); await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60');
  const fast = await scene(page); expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  expect(slow.data).toEqual(paused.data); expect(fast.data).toEqual(paused.data);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await page.locator('[data-launch-result]').click();
  await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completed = await scene(page); checkScene(completed); expect(completed.data.launchPlumeActive).toBe('false');
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.stage2); const reviewedSave = await saved(page);
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-plume-evidence.json');
  await writeFile(path, JSON.stringify({ native, scenes, resizeProbes, paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum },
    reloaded, completed, errors, screenshotCount: 6, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-plume-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
