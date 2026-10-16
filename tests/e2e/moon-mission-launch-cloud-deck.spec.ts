import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass73-2026-10-14/browser/launch-cloud-deck');
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
    proto.beginPath = function (...args: any[]) { this.__mm73Path = []; return begin.apply(this, args); };
    for (const [name, original] of [['moveTo', move], ['lineTo', line]]) {
      proto[name] = function (x: number, y: number) {
        if (this.__mm73Path) this.__mm73Path.push([x, y]); return original.call(this, x, y);
      };
    }
    proto.fillRect = function (x: number, y: number, width: number, height: number) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        const m = this.getTransform(); this.canvas.__mm73 = { fills: [], frame: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } };
      }
      return rect.call(this, x, y, width, height);
    };
    proto.fill = function (...args: any[]) {
      const p = this.__mm73Path;
      if (this.canvas.__mm73 && p?.length === 49 && p[0][0] === p[48][0] && p[0][1] === p[48][1]) {
        const m = this.getTransform();
        this.canvas.__mm73.fills.push({ points: p.slice(), alpha: this.globalAlpha,
          matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
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
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function launch(page: Page) { return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({ ...cv.dataset })); }
function physical(data: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('launchHorizon') && key !== 'launchCamera' && key !== 'launchDebris'));
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
    const sample = P.launchSample(P.launchProfile(), Math.max(0, time)), width = cv.clientWidth, height = cv.clientHeight;
    const g = (cv as any)._mmLaunchCloudDeck || null;
    const expected = P.launchCloudDeckGeometry(sample.altitude / 1000 * 1000, sample.downrange, width, height);
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i] === 255) opaque++; }
    return { data, time, g, expected, native: (cv as any).__mm73, width: cv.width, height: cv.height,
      cssWidth: width, cssHeight: height, sample: { altitude: sample.altitude, downrange: sample.downrange, speed: sample.speed },
      opaque, checksum, pixels: cv.width * cv.height, overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.g).toEqual(value.expected);
  const g = value.g, frame = value.native.frame, R = 6371000, D = R + value.sample.altitude;
  const focal = value.cssHeight / (2 * Math.tan(Math.PI / 6)), theta = value.sample.downrange / R;
  expect(g.patches.length).toBeLessThan(1000);
  expect(new Set(g.patches.map((patch: any) => patch.id)).size).toBe(g.patches.length);
  let priorDistance = Infinity;
  for (const patch of g.patches) {
    expect(patch.points).toHaveLength(49); expect(patch.points[48]).toEqual(patch.points[0]);
    expect(patch.opacity).toBeGreaterThan(0); expect(patch.opacity).toBeLessThanOrEqual(1);
    expect(patch.distance).toBeLessThanOrEqual(priorDistance + 1e-6); priorDistance = patch.distance;
    const expectedPoints = patch.points.map((p: any) => [p.x, p.y]);
    const fills = value.native.fills.filter((row: any) => JSON.stringify(row.points) === JSON.stringify(expectedPoints));
    // This observes actual native Canvas fills, rather than trusting scene diagnostics.
    expect(fills.length, 'native silhouette for ' + patch.id).toBeGreaterThanOrEqual(1);
    const body = fills[0]; expect(body.alpha).toBeCloseTo(patch.opacity, 6);
    expect(body.matrix).toEqual(frame);
    for (const point of patch.points) {
      for (const key of ['x', 'y', 'longitude', 'latitude']) expect(Number.isFinite(point[key]), 'finite projected ' + key).toBe(true);
      const longitude = point.longitude - theta, latitude = point.latitude;
      const X = R * Math.cos(latitude) * Math.sin(longitude), Y = R * Math.cos(latitude) * Math.cos(longitude), Z = R * Math.sin(latitude);
      expect(Z).toBeGreaterThan(0); expect(D * Y - R * R).toBeGreaterThanOrEqual(-1);
      expect(point.x).toBeCloseTo(value.cssWidth / 2 + focal * X / Z, 6);
      expect(point.y).toBeCloseTo(value.cssHeight * 0.6 + focal * (D - Y) / Z, 6);
      // Independent tangent-cone equation gives the curved horizon at this x.
      const horizon = value.cssHeight * 0.6 + Math.sqrt(D * D - R * R) / R * Math.hypot(focal, point.x - value.cssWidth / 2);
      expect(point.y).toBeGreaterThanOrEqual(horizon - 1e-6);
    }
  }
  expect(value.native.fills.length).toBeGreaterThanOrEqual(g.patches.length);
}
async function capture(page: Page, info: TestInfo, name: string) {
  const target = page.locator('[data-launch-workspace]'), cv = target.locator('[data-launch-canvas]');
  await cv.scrollIntoViewIfNeeded(); await scene(page);
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

async function nativeDeck(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 400); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      let arcs = 0, ellipses = 0;
      const arc = ctx.arc, ellipse = ctx.ellipse;
      ctx.arc = function (...args: Parameters<typeof arc>) { arcs++; return arc.apply(ctx, args); };
      ctx.ellipse = function (...args: Parameters<typeof ellipse>) { ellipses++; return ellipse.apply(ctx, args); };
      const geometry = P.launchCloudDeckGeometry(80000, 320000, 634, 395);
      const before = state(); P.drawLaunchCloudDeck(ctx, geometry); const after = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      return { before, after, geometry, painted, checksum, maxAlpha, alphaSum, rightOfClip, arcs, ellipses };
    };
    return { full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

test('Launch cloud deck follows spherical Earth perspective and remains stable through review and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeDeck(page);
  for (const value of Object.values(native)) {
    expect(value.after).toEqual(value.before); expect(value.arcs).toBe(0); expect(value.ellipses).toBe(0);
  }
  expect(native.full.geometry.patches.length).toBeGreaterThan(0); expect(native.full.painted).toBeGreaterThan(100);
  expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.rightOfClip).toBe(0);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      const index = profile.samples.findIndex((row: any) => row.altitude >= height);
      if (index < 0) return Math.floor(profile.summary.duration * 10) / 10;
      let lo = profile.samples[Math.max(0, index - 1)].time, hi = profile.samples[index].time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { low: atHeight(20000), middle: atHeight(50000), high: atHeight(80000), orbit: atHeight(185000) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const name of ['low', 'middle', 'high', 'orbit'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]);
    expect(scenes[name].g.patches.length, name + ' visible cloud patches').toBeGreaterThan(0);
    await capture(page, info, 'launch-cloud-deck-desktop-' + name);
  }
  expect(scenes.low.sample.altitude).toBeCloseTo(20000, -3); expect(scenes.middle.sample.altitude).toBeCloseTo(50000, -3);
  expect(scenes.high.sample.altitude).toBeCloseTo(80000, -3); expect(scenes.orbit.sample.altitude).toBeGreaterThan(180000);
  await accessibility(page, info, 'launch-cloud-deck-desktop-axe');
  await seek(page, -5); scenes.countdown = await scene(page); checkScene(scenes.countdown); expect(scenes.countdown.g.patches).toEqual([]);
  await seek(page, times.orbit); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneOrbit = await scene(page); await capture(page, info, 'launch-cloud-deck-phone-orbit');
  await seek(page, times.high); scenes.phoneHigh = await scene(page); checkScene(scenes.phoneHigh);
  await capture(page, info, 'launch-cloud-deck-phone-high'); await accessibility(page, info, 'launch-cloud-deck-phone-axe');
  const paused = await scene(page); await page.waitForTimeout(180); const still = await scene(page);
  expect(still.checksum).toBe(paused.checksum); expect(still.data).toEqual(paused.data);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, times.low); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.middle); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-cloud-deck-evidence.json');
  await writeFile(path, JSON.stringify({ native, times, scenes, resizeProbes, paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum },
    reloaded, revisited, errors, screenshotCount: 6, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-cloud-deck-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
