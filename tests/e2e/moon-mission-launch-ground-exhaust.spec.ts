import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass72-2026-10-14/browser/launch-ground-exhaust');
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
    proto.beginPath = function (...args: any[]) { this.__mm72Path = []; return begin.apply(this, args); };
    for (const [name, original] of [['moveTo', move], ['lineTo', line]]) {
      proto[name] = function (x: number, y: number) { if (this.__mm72Path) this.__mm72Path.push([x, y]); return original.call(this, x, y); };
    }
    proto.createLinearGradient = function (...args: any[]) { const result = gradient.apply(this, args); result.__mm72Stops = []; return result; };
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm72Stops) (this as any).__mm72Stops.push([offset, color]); return add.call(this, offset, color);
    };
    const record = (ctx: any, kind: string, points?: number[][]) => {
      const m = ctx.getTransform();
      ctx.canvas.__mm72.events.push({ kind, points: points?.slice(), alpha: ctx.globalAlpha,
        matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
    };
    proto.fillRect = function (x: number, y: number, width: number, height: number) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        const m = this.getTransform(); this.canvas.__mm72 = { events: [], frame: { a: m.a, d: m.d, e: m.e, f: m.f } };
      }
      if (this.canvas.__mm72 && this.fillStyle === '#4b5563' && width > 0 && height > 0) record(this, 'pad', [[x, y], [width, height]]);
      return rect.call(this, x, y, width, height);
    };
    proto.fill = function (...args: any[]) {
      const p = this.__mm72Path, stops = this.fillStyle?.__mm72Stops;
      // Identify the drawn connected silhouette independently of diagnostics.
      if (this.canvas.__mm72 && p?.length === 322 && p[0][0] < 0 && p[160][0] === -p[0][0] &&
          p[161][0] === p[160][0] && p[321][0] === p[0][0]) record(this, 'exhaust', p);
      if (this.canvas.__mm72 && p?.length === 4 && stops?.length === 17) {
        const width = p[1][0] - p[0][0], height = p[2][1] - p[0][1];
        if (width > 0 && Math.abs(height / width - 12 / 6.6) < 1e-8) record(this, 'rocket', p);
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
    const sample = P.launchSample(P.launchProfile(), Math.max(0, time));
    const width = cv.clientWidth, height = cv.clientHeight, lift = sample.altitude * 1.2 / 9.25;
    const g = (cv as any)._mmLaunchGroundExhaust || null;
    const expected = time >= 0 && lift < height ? P.launchGroundExhaustGeometry(time, width, height, sample.altitude, sample.engineOn) : null;
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < pixels.length; i++) { checksum = Math.imul(checksum ^ pixels[i], 16777619) >>> 0; if (i % 4 === 3 && pixels[i] === 255) opaque++; }
    return { data, time, g, expected, native: (cv as any).__mm72, width: cv.width, height: cv.height,
      cssWidth: width, cssHeight: height, sample: { altitude: sample.altitude, speed: sample.speed },
      opaque, checksum, pixels: cv.width * cv.height, overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  const events = value.native.events, exhaust = events.filter((e: any) => e.kind === 'exhaust');
  if (!value.expected?.visible) {
    expect(exhaust).toHaveLength(0); expect(value.g === null || !value.g.visible).toBe(true); return;
  }
  expect(value.g).toEqual(value.expected); expect(exhaust).toHaveLength(1);
  const g = value.g, native = exhaust[0], frame = value.native.frame;
  expect(g.x).toBeCloseTo(value.cssWidth / 2, 8);
  expect(g.y).toBeCloseTo(value.cssHeight * 0.8 + value.sample.altitude * 1.2 / 9.25, 8);
  expect(g.scale).toBeCloseTo(value.cssHeight / 400, 8);
  expect(g.span).toBeCloseTo(20 + 240 * (1 - Math.exp(-Math.min(value.time, 90) / 6)), 8);
  for (const key of ['x', 'y', 'scale', 'span', 'opacity', 'heat']) expect(Number.isFinite(g[key]), 'finite exhaust ' + key).toBe(true);
  expect(Math.abs(native.matrix.a / frame.a - g.scale)).toBeLessThan(0.0001);
  expect(Math.abs((native.matrix.e - frame.e) / frame.a - g.x)).toBeLessThan(0.0001);
  expect(Math.abs((native.matrix.f - frame.f) / frame.d - g.y)).toBeLessThan(0.0001);
  expect(native.matrix.b).toBe(0); expect(native.matrix.c).toBe(0); expect(native.alpha).toBeCloseTo(g.opacity, 7);
  const points = g.top.concat(g.bottom.slice().reverse()).map((p: any) => [p.x, p.y]);
  expect(native.points).toEqual(points);
  const padIndex = events.findIndex((e: any) => e.kind === 'pad'), exhaustIndex = events.findIndex((e: any) => e.kind === 'exhaust');
  const rocketIndex = events.findIndex((e: any) => e.kind === 'rocket');
  expect(padIndex).toBeGreaterThanOrEqual(0); expect(exhaustIndex).toBeGreaterThan(padIndex); expect(rocketIndex).toBeGreaterThan(exhaustIndex);
  const pad = events[padIndex]; expect(pad.points[0][1]).toBeCloseTo(g.y - value.cssHeight * 0.005, 7);
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

async function nativeExhaust(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const draw = (time: number, alpha: number, engine = true, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 400); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      let arcs = 0, ellipses = 0, clips = 0, fillPaths = 0, softRadials = 0, hardRadials = 0;
      const arc = ctx.arc, ellipse = ctx.ellipse, clipNative = ctx.clip, fill = ctx.fill, radial = ctx.createRadialGradient;
      ctx.arc = function (...args: Parameters<typeof arc>) { arcs++; return arc.apply(ctx, args); };
      ctx.ellipse = function (...args: Parameters<typeof ellipse>) { ellipses++; return ellipse.apply(ctx, args); };
      ctx.clip = function (...args: any[]) { clips++; return (clipNative as any).apply(ctx, args); };
      ctx.fill = function (...args: any[]) { fillPaths++; return (fill as any).apply(ctx, args); };
      ctx.createRadialGradient = function (...args: Parameters<typeof radial>) {
        const g = radial.apply(ctx, args), add = g.addColorStop;
        g.addColorStop = function (offset: number, color: string) {
          if (offset === 1) { if (/,[\s]*0\)$/.test(color)) softRadials++; else hardRadials++; }
          return add.call(g, offset, color);
        }; return g;
      };
      const geometry = P.launchGroundExhaustGeometry(time, 634, 395, 0, engine);
      const before = state(), pose = P.drawLaunchGroundExhaust(ctx, geometry), after = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0, softPixels = 0, gapColumns = 0;
      let minX = cv.width, maxX = -1, warm = 0, warmCount = 0;
      for (let x = 0; x < cv.width; x++) {
        let first = -1, last = -1;
        for (let y = 0; y < cv.height; y++) {
          const k = (y * cv.width + x) * 4, a = rgba[k + 3];
          if (a > 0) { painted++; alphaSum += a; maxAlpha = Math.max(maxAlpha, a); minX = Math.min(minX, x); maxX = Math.max(maxX, x); if (x >= 320) rightOfClip++; }
          if (a > 0 && a < alpha * geometry.opacity * 255 * 0.2) softPixels++;
          if (a > alpha * geometry.opacity * 255 * 0.7 && alpha > 0) { if (first < 0) first = y; last = y; }
          if (Math.abs(x - 320) <= 18 && y >= 300 && y <= 318 && a > 150) { warm += rgba[k] - rgba[k + 2]; warmCount++; }
        }
        if (first >= 0) for (let y = first; y <= last; y++) if (rgba[(y * cv.width + x) * 4 + 3] === 0) { gapColumns++; break; }
      }
      for (let i = 0; i < rgba.length; i++) checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
      return { before, after, pose: !!pose, geometry, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        softPixels, gapColumns, minX, maxX, warmth: warm / Math.max(1, warmCount), arcs, ellipses, clips, fillPaths, softRadials, hardRadials };
    };
    return { phases: [0.5, 3, 10].map(time => ({ time, first: draw(time, 1), repeat: draw(time, 1) })),
      off: draw(3, 1, false), full: draw(3, 1), faded: draw(3, 0.37), transparent: draw(3, 0), clipped: draw(3, 1, true, true),
      onset: [0, 0.001, 0.01, 0.1, 0.5, 1.2].map(t => P.launchGroundExhaustGeometry(t, 640, 400, 0, true)),
      fade: [12, 20, 40, 80, 90].map(t => P.launchGroundExhaustGeometry(t, 640, 400, 0, true)) };
  });
}

test('Launch ground exhaust spreads along the pad and remains deterministic through review and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeExhaust(page);
  for (const row of native.phases) {
    const first = row.first;
    expect(first.after).toEqual(first.before); expect(first.painted).toBeGreaterThan(500);
    expect(first.checksum).toBe(row.repeat.checksum); expect(first.gapColumns).toBe(0);
    expect(first.softPixels).toBeGreaterThan(20); expect(first.arcs).toBe(0); expect(first.ellipses).toBe(0);
    expect(first.clips).toBe(1); expect(first.fillPaths).toBe(1); expect(first.softRadials).toBe(7); expect(first.hardRadials).toBe(0);
  }
  for (let i = 1; i < native.phases.length; i++) {
    const now = native.phases[i].first, prior = native.phases[i - 1].first;
    expect(now.maxX - now.minX).toBeGreaterThan(prior.maxX - prior.minX);
  }
  expect(native.full.warmth).toBeGreaterThan(native.off.warmth); expect(native.off.geometry.heat).toBe(0);
  expect(native.off.softRadials).toBe(6); expect(native.off.after).toEqual(native.off.before);
  expect(native.faded.after).toEqual(native.faded.before); expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha);
  // Several translucent paints share caller alpha, rather than group opacity.
  expect(native.faded.alphaSum / native.full.alphaSum).toBeGreaterThan(0.3);
  expect(native.faded.alphaSum / native.full.alphaSum).toBeLessThan(0.8);
  expect(native.transparent.after).toEqual(native.transparent.before); expect(native.transparent.painted).toBe(0);
  expect(native.transparent.clips).toBe(0); expect(native.transparent.fillPaths).toBe(0);
  expect(native.clipped.after).toEqual(native.clipped.before); expect(native.clipped.rightOfClip).toBe(0);
  expect(native.clipped.painted).toBeGreaterThan(1000); expect(native.clipped.painted).toBeLessThan(native.full.painted);
  expect(native.onset[0].opacity).toBe(0); expect(native.onset[1].opacity).toBeLessThan(0.00001);
  for (let i = 1; i < native.onset.length; i++) expect(native.onset[i].opacity).toBeGreaterThan(native.onset[i - 1].opacity);
  for (let i = 1; i < native.fade.length; i++) expect(native.fade[i].opacity).toBeLessThan(native.fade[i - 1].opacity);
  expect(native.fade.at(-1).visible).toBe(false);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      let lo = 0, hi = profile.events.stage1.time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { ignition: 0.5, growing: 3, expanded: 10, departing: atHeight(550), gone: atHeight(2000) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const name of ['ignition', 'growing', 'expanded', 'departing'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]); expect(scenes[name].g?.visible).toBe(true);
    await capture(page, info, 'launch-ground-exhaust-desktop-' + name);
  }
  expect(scenes.departing.g.y).toBeGreaterThan(scenes.departing.cssHeight * 0.95);
  await seek(page, times.gone); scenes.gone = await scene(page); checkScene(scenes.gone);
  expect(scenes.gone.native.events.filter((e: any) => e.kind === 'exhaust')).toHaveLength(0);
  await seek(page, -5); scenes.countdown = await scene(page); checkScene(scenes.countdown); expect(scenes.countdown.g).toBeNull();
  await seek(page, 0); scenes.zero = await scene(page); checkScene(scenes.zero);
  await accessibility(page, info, 'launch-ground-exhaust-desktop-axe');
  await seek(page, times.expanded); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneExpanded = await scene(page); await capture(page, info, 'launch-ground-exhaust-phone-expanded');
  await seek(page, times.growing); scenes.phoneGrowing = await scene(page); checkScene(scenes.phoneGrowing);
  await capture(page, info, 'launch-ground-exhaust-phone-growing'); await accessibility(page, info, 'launch-ground-exhaust-phone-axe');
  await seek(page, times.expanded); const paused = await scene(page); await page.waitForTimeout(180); const still = await scene(page);
  expect(still.checksum).toBe(paused.checksum); expect(still.data).toEqual(paused.data);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, times.gone); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.growing); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-ground-exhaust-evidence.json');
  await writeFile(path, JSON.stringify({ native, times, scenes, resizeProbes, paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum },
    reloaded, revisited, errors, screenshotCount: 6, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-ground-exhaust-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
