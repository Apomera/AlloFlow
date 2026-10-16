import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass74-2026-10-15/browser/launch-surface');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any, rect = proto.fillRect, draw = proto.drawImage;
    proto.fillRect = function (x: number, y: number, width: number, height: number) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        const m = this.getTransform(); this.canvas.__mm74 = { draws: [], frame: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } };
      }
      return rect.call(this, x, y, width, height);
    };
    proto.drawImage = function (source: any, ...args: any[]) {
      if (this.canvas.__mm74) {
        if (source === this.canvas._mmLaunchSurfaceRaster?.canvas) {
          this.canvas.__mm74SurfaceDrawCount = (this.canvas.__mm74SurfaceDrawCount || 0) + 1;
        }
        const m = this.getTransform(); this.canvas.__mm74.draws.push({ source, args, alpha: this.globalAlpha,
          smoothing: this.imageSmoothingEnabled, matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
      }
      return draw.call(this, source, ...args);
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
    const g = (cv as any)._mmLaunchSurface, cache = (cv as any)._mmLaunchSurfaceRaster;
    const hash = (bytes: ArrayLike<number>) => { let result = 2166136261;
      for (let i = 0; i < bytes.length; i++) result = Math.imul(result ^ bytes[i], 16777619) >>> 0; return result; };
    const compact = (field: any) => {
      if (!field) return null;
      const { pixels, antialiasedPixels, ...metadata } = field;
      return { ...metadata, pixelLength: pixels.length, checksum: hash(pixels), antialiasLength: antialiasedPixels.length,
        antialiasChecksum: hash(antialiasedPixels), observedAntialiasCount: antialiasedPixels.reduce((sum: number, flag: number) => sum + flag, 0) };
    };
    const expected = P.launchSurfaceGeometry(sample.altitude / 1000 * 1000, sample.downrange, width, height);
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0; for (let i = 3; i < rgba.length; i += 4) if (rgba[i] === 255) opaque++;
    const probes: any[] = [];
    if (g?.columns && g?.rows) {
      const indices = new Set<number>(), marked: number[] = [];
      for (const yf of [0.1, 0.3, 0.6, 0.9]) for (const xf of [0.1, 0.5, 0.9]) {
        const column = Math.min(g.columns - 1, Math.floor(g.columns * xf)), row = Math.min(g.rows - 1, Math.floor(g.rows * yf));
        indices.add(row * g.columns + column);
      }
      for (let i = 0; i < g.antialiasedPixels.length; i++) if (g.antialiasedPixels[i]) marked.push(i);
      if (marked.length) for (const i of [0, Math.floor(marked.length / 2), marked.length - 1]) indices.add(marked[i]);
      for (const index of indices) {
        const column = index % g.columns, row = Math.floor(index / g.columns);
        const x = (column + 0.5) * width / g.columns, y = g.top + (row + 0.5) * (height - g.top) / g.rows;
        const point = P.launchSurfacePoint(sample.altitude / 1000 * 1000, sample.downrange, width, height, x, y);
        const antialiased = !!g.antialiasedPixels[index], subsamples: any[] = [];
        if (antialiased) for (const sy of [0.25, 0.75]) for (const sx of [0.25, 0.75]) {
          const subX = (column + sx) * width / g.columns, subY = g.top + (row + sy) * (height - g.top) / g.rows;
          subsamples.push({ x: subX, y: subY,
            point: P.launchSurfacePoint(sample.altitude / 1000 * 1000, sample.downrange, width, height, subX, subY) });
        }
        probes.push({ column, row, x, y, point, antialiased, subsamples,
          rgba: Array.from(g.pixels.slice(index * 4, index * 4 + 4)) });
      }
    }
    const surfaceDraws = ((cv as any).__mm74?.draws || []).filter((event: any) => cache && event.source === cache.canvas)
      .map(({ source, ...event }: any) => ({ ...event, sourceWidth: source.width, sourceHeight: source.height }));
    let raster: any = null;
    if (g?.opacity > 0 && cache) {
      const bytes = cache.canvas.getContext('2d').getImageData(0, 0, cache.canvas.width, cache.canvas.height).data;
      let maxDifference = 0; for (let i = 0; i < bytes.length; i++) maxDifference = Math.max(maxDifference, Math.abs(bytes[i] - g.pixels[i]));
      raster = { checksum: hash(bytes), length: bytes.length, maxDifference, matchesField: cache.field === g,
        width: cache.canvas.width, height: cache.canvas.height };
    }
    return { data, time, g: compact(g), expected: compact(expected), probes, raster,
      native: { frame: (cv as any).__mm74?.frame, surfaceDraws }, width: cv.width, height: cv.height,
      cssWidth: width, cssHeight: height, sample: { altitude: sample.altitude, downrange: sample.downrange, speed: sample.speed },
      opaque, checksum: hash(rgba), pixels: cv.width * cv.height, overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}

function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.g).toEqual(value.expected);
  const g = value.g, R = 6371000, D = R + value.sample.altitude, focal = value.cssHeight * Math.sqrt(3) / 2;
  const smooth = (value: number) => { const u = Math.max(0, Math.min(1, value)); return u * u * (3 - 2 * u); };
  expect(g.opacity).toBeGreaterThanOrEqual(0); expect(g.opacity).toBeLessThanOrEqual(1);
  expect(g.opacity).toBeCloseTo(smooth((value.sample.altitude - 1500) / 100), 10);
  expect(g.coastBlend).toBeCloseTo(smooth((value.sample.altitude - 1500) / 4500), 10);
  expect(g.columns * g.rows).toBeLessThanOrEqual(56000);
  expect(g.pixelLength).toBe(g.columns * g.rows * 4);
  expect(g.antialiasLength).toBe(g.columns * g.rows); expect(g.antialiasCount).toBe(g.observedAntialiasCount);
  if (!g.opacity) { expect(value.native.surfaceDraws).toHaveLength(0); return; }
  expect(value.native.surfaceDraws).toHaveLength(1);
  const actual = value.native.surfaceDraws[0];
  expect(actual.args).toEqual([0, g.top, g.width, g.height - g.top]);
  expect(actual.alpha).toBeCloseTo(g.opacity, 8); expect(actual.matrix).toEqual(value.native.frame);
  expect(actual.sourceWidth).toBe(g.columns); expect(actual.sourceHeight).toBe(g.rows);
  expect(value.raster.matchesField).toBe(true); expect(value.raster.length).toBe(g.pixelLength);
  expect(value.raster.maxDifference).toBe(0);
  expect(value.raster.checksum).toBe(g.checksum);
  expect(g.landPixels + g.waterPixels).toBeGreaterThan(0);
  let surfaceProbes = 0;
  const checkPoint = (x: number, y: number, point: any) => {
    // Independent near-root ray/sphere intersection; no renderer helper is used by this oracle.
    const ray = [x - value.cssWidth / 2, value.cssHeight * 0.6 - y, focal];
    const length = Math.hypot(...ray), direction = ray.map(v => v / length), b = D * direction[1];
    const discriminant = b * b - (D * D - R * R);
    if (discriminant < 0 || b >= 0) { expect(point).toBeNull(); return false; }
    const distance = -b - Math.sqrt(discriminant), position = direction.map((v, i) => distance * v + (i === 1 ? D : 0));
    const normal = position.map(v => v / R);
    expect(point).not.toBeNull(); surfaceProbes++;
    expect(point.distance).toBeCloseTo(distance, 4);
    for (let i = 0; i < 3; i++) {
      expect(point.normal[i]).toBeCloseTo(normal[i], 8); expect(point.view[i]).toBeCloseTo(-direction[i], 8);
    }
    expect(point.longitude).toBeCloseTo(Math.atan2(position[0], position[1]) + value.sample.downrange / R, 8);
    expect(point.latitude).toBeCloseTo(Math.asin(position[2] / R), 8);
    expect(point.east).toBeCloseTo(point.longitude * R, 6); expect(point.north).toBeCloseTo(point.latitude * R, 6);
    expect(point.mu).toBeCloseTo(-normal.reduce((sum, n, i) => sum + n * direction[i], 0), 8);
    const sun = [0.2, 0.47, Math.sqrt(3) / 2], sunLength = Math.hypot(...sun);
    for (let i = 0; i < 3; i++) expect(point.sun[i]).toBeCloseTo(sun[i] / sunLength, 8);
    expect(point.landFraction).toBeGreaterThanOrEqual(0); expect(point.landFraction).toBeLessThanOrEqual(1);
    expect(point.coastBlend).toBeCloseTo(g.coastBlend, 10);
    expect(point.glint).toBeGreaterThanOrEqual(0); expect(point.glint).toBeLessThanOrEqual(1);
    expect(point.glint).toBeCloseTo(point.reflection.strength * (1 - point.landFraction), 10);
    if (point.landFraction === 1) expect(point.glint).toBe(0);
    return true;
  };
  for (const probe of value.probes) {
    if (!checkPoint(probe.x, probe.y, probe.point)) { expect(probe.rgba[3]).toBe(0); expect(probe.antialiased).toBe(false); continue; }
    if (probe.antialiased) {
      expect(probe.subsamples).toHaveLength(4);
      for (const sub of probe.subsamples) expect(checkPoint(sub.x, sub.y, sub.point)).toBe(true);
      const average = new Uint8ClampedArray([0, 1, 2, 3].map(channel =>
        probe.subsamples.reduce((sum: number, sub: any) => sum + sub.point.rgba[channel], 0) / 4));
      expect(probe.rgba).toEqual(Array.from(average));
    } else {
      expect(probe.subsamples).toHaveLength(0); expect(probe.rgba).toEqual(probe.point.rgba);
    }
  }
  if (g.antialiasCount) expect(value.probes.some((probe: any) => probe.antialiased)).toBe(true);
  expect(surfaceProbes).toBeGreaterThan(0);
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

async function nativeSurface(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      ctx.imageSmoothingEnabled = false; ctx.imageSmoothingQuality = 'low';
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 400); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        smoothing: ctx.imageSmoothingEnabled, smoothingQuality: ctx.imageSmoothingQuality,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const geometry = P.launchSurfaceGeometry(80000, 320000, 634, 395);
      const before = state(); P.drawLaunchSurface(ctx, geometry); const after = state();
      const cache = (cv as any)._mmLaunchSurfaceRaster;
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      P.drawLaunchSurface(ctx, geometry);
      const reused = (cv as any)._mmLaunchSurfaceRaster;
      return { before, after, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        cacheFieldMatches: cache?.field === geometry, cacheReused: !!cache && reused === cache,
        canvasReused: !!cache && reused?.canvas === cache.canvas, fieldReused: !!cache && reused?.field === geometry };
    };
    return { full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

async function surfacePerformance(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cases: any[] = [];
    for (const width of [1100, 390]) for (const altitude of [20000, 80000, 185000]) {
      const height = 400, downrange = 320000, samples: number[] = [];
      P.launchSurfaceGeometry(altitude, downrange, width, height);
      let field: any;
      for (let i = 0; i < 8; i++) {
        const started = performance.now(); field = P.launchSurfaceGeometry(altitude, downrange, width, height);
        samples.push(performance.now() - started);
      }
      const sorted = samples.slice().sort((a, b) => a - b);
      cases.push({ width, height, altitude, downrange, warmupBuilds: 1, measuredBuilds: samples.length,
        medianMs: (sorted[3] + sorted[4]) / 2, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], samplesMs: samples,
        columns: field.columns, rows: field.rows, antialiasCount: field.antialiasCount,
        landPixels: field.landPixels, waterPixels: field.waterPixels });
    }
    return { clock: 'performance.now', assertionPolicy: 'record timings without machine-dependent thresholds', cases };
  });
}

test('Launch coastal surface follows spherical Earth and preserves recorded flight through review and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeSurface(page);
  for (const value of Object.values(native)) expect(value.after).toEqual(value.before);
  for (const value of [native.full, native.repeat, native.faded, native.clipped]) {
    expect(value.cacheFieldMatches).toBe(true); expect(value.cacheReused).toBe(true);
    expect(value.canvasReused).toBe(true); expect(value.fieldReused).toBe(true);
  }
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.rightOfClip).toBe(0);
  const performanceProbe = await surfacePerformance(page);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      const index = profile.samples.findIndex((row: any) => row.altitude >= height);
      if (index < 0) return Math.floor(profile.summary.duration * 10) / 10;
      let lo = profile.samples[Math.max(0, index - 1)].time, hi = profile.samples[index].time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { pad: 0, transition: atHeight(3750), coast: atHeight(5000), low: atHeight(20000), middle: atHeight(50000), high: atHeight(80000) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const name of ['pad', 'transition', 'coast', 'low', 'middle'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'launch-surface-desktop-' + name);
  }
  expect(scenes.pad.g.opacity).toBe(0); expect(scenes.coast.g.opacity).toBe(1); expect(scenes.low.g.opacity).toBe(1);
  expect(scenes.transition.g.opacity).toBe(1); expect(Math.abs(scenes.transition.g.coastBlend - 0.5)).toBeLessThan(0.02);
  expect(scenes.coast.g.coastBlend).toBeGreaterThan(0); expect(scenes.coast.g.coastBlend).toBeLessThan(1);
  expect(scenes.low.sample.altitude).toBeCloseTo(20000, -3); expect(scenes.middle.sample.altitude).toBeCloseTo(50000, -3);
  await accessibility(page, info, 'launch-surface-desktop-axe');
  await seek(page, -5); scenes.countdown = await scene(page); checkScene(scenes.countdown); expect(scenes.countdown.g.opacity).toBe(0);
  await seek(page, times.high); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneHigh = await scene(page); await capture(page, info, 'launch-surface-phone-high');
  await seek(page, times.low); scenes.phoneLow = await scene(page); checkScene(scenes.phoneLow);
  await capture(page, info, 'launch-surface-phone-low'); await accessibility(page, info, 'launch-surface-phone-axe');
  const paused = await scene(page);
  const reuse = await page.locator('[data-launch-canvas]').evaluate(async (cv: any) => {
    const field = cv._mmLaunchSurface, cache = cv._mmLaunchSurfaceRaster, pixels = field.pixels,
      beforeDraws = cv.__mm74SurfaceDrawCount || 0;
    await new Promise<void>(done => setTimeout(done, 180));
    return { field: cv._mmLaunchSurface === field, pixels: cv._mmLaunchSurface.pixels === pixels,
      cache: cv._mmLaunchSurfaceRaster === cache, canvas: cv._mmLaunchSurfaceRaster.canvas === cache.canvas,
      observedDraws: (cv.__mm74SurfaceDrawCount || 0) - beforeDraws };
  });
  expect({ field: reuse.field, pixels: reuse.pixels, cache: reuse.cache, canvas: reuse.canvas })
    .toEqual({ field: true, pixels: true, cache: true, canvas: true });
  expect(reuse.observedDraws).toBeGreaterThan(0);
  const still = await scene(page); expect(still.checksum).toBe(paused.checksum); expect(still.data).toEqual(paused.data);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, times.coast); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.middle); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-surface-evidence.json');
  await writeFile(path, JSON.stringify({ native, performanceProbe, times, scenes, resizeProbes, reuse,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-surface-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
