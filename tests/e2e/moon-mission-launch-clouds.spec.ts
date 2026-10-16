import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass71-2026-10-14/browser/launch-clouds');
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
    proto.beginPath = function (...args: any[]) { this.__mm71Path = []; return begin.apply(this, args); };
    for (const [name, original] of [['moveTo', move], ['lineTo', line]]) {
      proto[name] = function (x: number, y: number) { if (this.__mm71Path) this.__mm71Path.push([x, y]); return original.call(this, x, y); };
    }
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        this.canvas.__mm71Clouds = []; const m = this.getTransform();
        this.canvas.__mm71Frame = { a: m.a, d: m.d, e: m.e, f: m.f };
      }
      return rect.call(this, x, y, ...args);
    };
    proto.fill = function (...args: any[]) {
      const p = this.__mm71Path;
      if (this.canvas.__mm71Clouds && p?.length === 258 && p[0][0] === -2.4 && p[128][0] === 2.4) {
        const m = this.getTransform();
        this.canvas.__mm71Clouds.push({ matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, alpha: this.globalAlpha });
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
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('launchHorizon') && key !== 'launchCamera' && key !== 'launchDebris' && !key.startsWith('launchCloud')));
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
    const profile = P.launchProfile(), sample = P.launchSample(profile, Math.max(0, time));
    const clouds = (cv as any)._mmLaunchClouds || [], nativeClouds = (cv as any).__mm71Clouds || [], nativeFrame = (cv as any).__mm71Frame;
    const width = cv.clientWidth, height = cv.clientHeight, altitude = time < 0 ? 0 : sample.altitude / 1000;
    const tick = time >= 0 ? 300 + time * 2 : (time + 5) * 60;
    const expected = [[1.6, 0.16, 1], [2.4, 0.86, 0.8], [3.8, 0.3, 1.2], [5.5, 0.7, 1.05], [8, 0.1, 0.9]].flatMap((c, seed) => {
      const size = height * 0.045 * c[2], y = Number(data.launchHorizonCenter) - (c[0] - altitude) * height * 0.09 * c[2];
      const x = width * c[1] + Math.sin(tick * 0.003 + c[0]) * 6;
      return y < -3 * size || y > height + 3 * size ? [] : [{ x, y, size, seed }];
    });
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < pixels.length; i++) { checksum = Math.imul(checksum ^ pixels[i], 16777619) >>> 0; if (i % 4 === 3 && pixels[i] === 255) opaque++; }
    return { data, time, clouds, nativeClouds, nativeFrame, expected, sample: { altitude: sample.altitude, speed: sample.speed },
      width: cv.width, height: cv.height, cssWidth: cv.clientWidth, cssHeight: cv.clientHeight,
      opaque, checksum, pixels: cv.width * cv.height, overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.clouds.length).toBeGreaterThan(0);
  expect(value.clouds).toHaveLength(value.expected.length); expect(value.nativeClouds).toHaveLength(value.expected.length);
  for (let i = 0; i < value.clouds.length; i++) {
    const cloud = value.clouds[i], expected = value.expected[i], native = value.nativeClouds[i];
    for (const key of ['x', 'y', 'size']) expect(Number.isFinite(cloud[key]), 'finite cloud ' + key).toBe(true);
    expect(cloud.size).toBeGreaterThan(0);
    expect(cloud.seed).toBe(expected.seed);
    for (const key of ['x', 'y', 'size'] as const) expect(cloud[key]).toBeCloseTo(expected[key], 8);
    // The native matrix records the actual silhouette, independently of the
    // renderer diagnostics. Canvas may quantize its transform to float32.
    const frame = value.nativeFrame;
    expect(Math.abs(native.matrix.a / frame.a - expected.size)).toBeLessThan(0.0001);
    expect(Math.abs((native.matrix.e - frame.e) / frame.a - expected.x)).toBeLessThan(0.0001);
    expect(Math.abs((native.matrix.f - frame.f) / frame.d - expected.y)).toBeLessThan(0.0001);
    expect(native.matrix.b).toBe(0); expect(native.matrix.c).toBe(0); expect(native.alpha).toBe(1);
  }
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

async function nativeClouds(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const draw = (seed: number, alpha: number, light: any, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 400); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const before = state(), pose = P.drawLaunchCloud(ctx, 317, 196, 70, seed, light), after = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      const bottoms: number[] = [], topEdge: number[] = [];
      let leftLuma = 0, rightLuma = 0, leftCount = 0, rightCount = 0;
      for (let x = 0; x < cv.width; x++) {
        let bottom = -1, top = -1;
        for (let y = 0; y < cv.height; y++) {
          const k = (y * cv.width + x) * 4, a = rgba[k + 3];
          if (a > 0) { painted++; alphaSum += a; maxAlpha = Math.max(maxAlpha, a); if (x >= 320) rightOfClip++; }
          if (a > alpha * 255 * 0.8) { if (top < 0) top = y; bottom = y; }
          if (a > alpha * 255 * 0.9) {
            const luma = (rgba[k] + rgba[k + 1] + rgba[k + 2]) / 3;
            if (x < 320) { leftLuma += luma; leftCount++; } else { rightLuma += luma; rightCount++; }
          }
        }
        if (x >= 280 && x <= 360 && bottom >= 0) bottoms.push(bottom);
        if (top >= 0) topEdge.push(top);
      }
      for (let i = 0; i < rgba.length; i++) checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
      return { before, after, pose, painted, checksum, maxAlpha, alphaSum, rightOfClip, bottoms,
        topRange: topEdge.length ? Math.max(...topEdge) - Math.min(...topEdge) : 0,
        leftLuma: leftLuma / Math.max(1, leftCount), rightLuma: rightLuma / Math.max(1, rightCount) };
    };
    const right = { x: 1, y: -0.6 }, left = { x: -1, y: -0.6 };
    return { variants: [1, 2, 3].map(seed => ({ seed, first: draw(seed, 1, right), repeat: draw(seed, 1, right) })),
      right: draw(1, 1, right), left: draw(1, 1, left), faded: draw(1, 0.37, right), transparent: draw(1, 0, right), clipped: draw(1, 1, right, true) };
  });
}

test('Launch cumulus keeps coherent shaded shapes through ascent, review, pause and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeClouds(page);
  for (const row of native.variants) {
    expect(row.first.after).toEqual(row.first.before); expect(row.first.painted).toBeGreaterThan(5000);
    expect(row.first.checksum).toBe(row.repeat.checksum); expect(row.first.topRange).toBeGreaterThan(20);
    expect(row.first.bottoms.length).toBeGreaterThan(60);
    expect(Math.max(...row.first.bottoms) - Math.min(...row.first.bottoms)).toBeLessThanOrEqual(2);
  }
  expect(new Set(native.variants.map(row => row.first.checksum)).size).toBe(3);
  expect(native.faded.after).toEqual(native.faded.before); expect(native.faded.maxAlpha).toBeLessThan(native.right.maxAlpha);
  expect(native.faded.maxAlpha).toBeGreaterThan(85);
  // Interior highlights are separate paints: inherited Canvas alpha applies
  // to each one, so the resulting cloud is not whole-object opacity scaling.
  expect(native.faded.alphaSum / native.right.alphaSum).toBeGreaterThan(0.35);
  expect(native.faded.alphaSum / native.right.alphaSum).toBeLessThan(0.75);
  expect(native.transparent.after).toEqual(native.transparent.before); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.after).toEqual(native.clipped.before); expect(native.clipped.rightOfClip).toBe(0);
  expect(native.clipped.painted).toBeGreaterThan(1000); expect(native.clipped.painted).toBeLessThan(native.right.painted);
  expect(native.right.checksum).not.toBe(native.left.checksum);
  expect(native.right.rightLuma - native.right.leftLuma).toBeGreaterThan(native.left.rightLuma - native.left.leftLuma);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      let lo = 0, hi = profile.events.stage1.time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { countdown: -5, low: 10, twoKm: atHeight(2000), sixKm: atHeight(6000) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const [name, time] of Object.entries(times)) {
    await seek(page, time); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'launch-clouds-desktop-' + name);
  }
  await accessibility(page, info, 'launch-clouds-desktop-axe');
  await seek(page, times.low); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneLow = await scene(page); await capture(page, info, 'launch-clouds-phone-low');
  await seek(page, times.countdown); scenes.phoneCountdown = await scene(page); checkScene(scenes.phoneCountdown);
  await capture(page, info, 'launch-clouds-phone-countdown'); await accessibility(page, info, 'launch-clouds-phone-axe');
  await seek(page, times.low); const paused = await scene(page); await page.waitForTimeout(180); const still = await scene(page);
  expect(still.checksum).toBe(paused.checksum); expect(still.data).toEqual(paused.data);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, times.sixKm); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.low); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-clouds-evidence.json');
  await writeFile(path, JSON.stringify({ native, times, scenes, resizeProbes, paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum },
    reloaded, revisited, errors, screenshotCount: 6, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-clouds-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
