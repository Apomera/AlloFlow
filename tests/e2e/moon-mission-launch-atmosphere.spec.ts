import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass75-2026-10-15/browser/launch-atmosphere');
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
        const m = this.getTransform(); this.canvas.__mm75 = { draws: [], frame: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } };
      }
      return rect.call(this, x, y, width, height);
    };
    proto.drawImage = function (source: any, ...args: any[]) {
      if (this.canvas.__mm75) {
        if (source === this.canvas._mmLaunchAtmosphereRaster?.canvas) {
          this.canvas.__mm75AtmosphereDrawCount = (this.canvas.__mm75AtmosphereDrawCount || 0) + 1;
        }
        const m = this.getTransform(); this.canvas.__mm75.draws.push({ source, args, alpha: this.globalAlpha,
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
    const g = (cv as any)._mmLaunchAtmosphere, cache = (cv as any)._mmLaunchAtmosphereRaster;
    const hash = (bytes: ArrayLike<number>) => { let result = 2166136261;
      for (let i = 0; i < bytes.length; i++) result = Math.imul(result ^ bytes[i], 16777619) >>> 0; return result; };
    const compact = (field: any) => {
      if (!field) return null;
      const { pixels, ...metadata } = field;
      let alphaMin = 255, alphaMax = 0, alphaSum = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        alphaMin = Math.min(alphaMin, pixels[i]); alphaMax = Math.max(alphaMax, pixels[i]); alphaSum += pixels[i];
      }
      return { ...metadata, pixelLength: pixels.length, checksum: hash(pixels), alphaMin, alphaMax, alphaSum };
    };
    const expected = P.launchAtmosphereGeometry(sample.altitude / 1000 * 1000, width, height);
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0; for (let i = 3; i < rgba.length; i += 4) if (rgba[i] === 255) opaque++;
    const atmosphereDraws = ((cv as any).__mm75?.draws || []).filter((event: any) => cache && event.source === cache.canvas)
      .map(({ source, ...event }: any) => ({ ...event, sourceWidth: source.width, sourceHeight: source.height }));
    const probes: any[] = [];
    for (const yf of [0.1, 0.4, 0.65, 0.8]) for (const xf of [0.1, 0.5, 0.9]) {
      const x = width * xf, y = height * yf;
      probes.push({ x, y, point: P.launchAtmospherePoint(sample.altitude / 1000 * 1000, width, height, x, y) });
    }
    let raster: any = null;
    if (g?.columns && g?.rows && cache) {
      const bytes = cache.canvas.getContext('2d').getImageData(0, 0, cache.canvas.width, cache.canvas.height).data;
      // A separate native upload is the pixel oracle, including premultiplication rounding at low alpha.
      const referenceCanvas = document.createElement('canvas'); referenceCanvas.width = g.columns; referenceCanvas.height = g.rows;
      const referenceContext = referenceCanvas.getContext('2d')!, referenceImage = referenceContext.createImageData(g.columns, g.rows);
      referenceImage.data.set(g.pixels); referenceContext.putImageData(referenceImage, 0, 0);
      const referenceBytes = referenceContext.getImageData(0, 0, g.columns, g.rows).data;
      let maxDifference = 0;
      for (let i = 0; i < bytes.length; i++) maxDifference = Math.max(maxDifference, Math.abs(bytes[i] - referenceBytes[i]));
      raster = { checksum: hash(bytes), referenceChecksum: hash(referenceBytes), length: bytes.length, maxDifference,
        matchesField: cache.field === g, width: cache.canvas.width, height: cache.canvas.height };
    }
    return { data, time, g: compact(g), expected: compact(expected), probes, raster,
      native: { frame: (cv as any).__mm75?.frame, atmosphereDraws }, width: cv.width, height: cv.height,
      cssWidth: width, cssHeight: height, sample: { altitude: sample.altitude, downrange: sample.downrange, speed: sample.speed },
      opaque, checksum: hash(rgba), pixels: cv.width * cv.height, overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}

function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.g).not.toBeNull(); expect(value.g).toEqual(value.expected);
  const g = value.g;
  expect(g.width).toBe(value.cssWidth); expect(g.height).toBe(value.cssHeight);
  expect(g.altitude).toBeCloseTo(value.sample.altitude, 6);
  expect(g.columns).toBeGreaterThan(0); expect(g.rows).toBeGreaterThan(0);
  expect(g.columns).toBeLessThanOrEqual(256); expect(g.rows).toBeLessThanOrEqual(200);
  expect(g.columns * g.rows).toBeLessThanOrEqual(51200); expect(g.pixelLength).toBe(g.columns * g.rows * 4);
  expect(g.alphaMin).toBeGreaterThanOrEqual(0); expect(g.alphaMax).toBeLessThanOrEqual(255);
  expect(value.native.atmosphereDraws).toHaveLength(1);
  const actual = value.native.atmosphereDraws[0];
  expect(actual.args).toEqual([0, 0, g.width, g.height]);
  expect(actual.alpha).toBe(1); expect(actual.smoothing).toBe(true); expect(actual.matrix).toEqual(value.native.frame);
  expect(actual.sourceWidth).toBe(g.columns); expect(actual.sourceHeight).toBe(g.rows);
  expect(value.raster.matchesField).toBe(true); expect(value.raster.length).toBe(g.pixelLength);
  expect(value.raster.width).toBe(g.columns); expect(value.raster.height).toBe(g.rows);
  expect(value.raster.maxDifference).toBe(0); expect(value.raster.checksum).toBe(value.raster.referenceChecksum);
  const radius = 6371000, shell = radius + 120000, distance = radius + value.sample.altitude;
  const tangentMu = -Math.sqrt(1 - Math.pow(radius / distance, 2));
  expect(g.minMu).toBeCloseTo(tangentMu, 8); expect(g.maxMu).toBe(1); expect(g.profile).toHaveLength(192);
  expect(g.profile[0].mu).toBeCloseTo(tangentMu, 8); expect(g.profile[191].mu).toBe(1);
  for (let i = 0; i < g.profile.length; i++) {
    expect(Number.isFinite(g.profile[i].column)).toBe(true); expect(g.profile[i].column).toBeGreaterThanOrEqual(0);
    if (i) expect(g.profile[i].mu).toBeGreaterThan(g.profile[i - 1].mu);
  }
  for (const { x, y, point } of value.probes) {
    // Independent normalized camera ray, then intersections with Earth and the 120 km air shell.
    const ray = [x - value.cssWidth / 2, value.cssHeight * 0.6 - y, value.cssHeight * Math.sqrt(3) / 2];
    const norm = Math.hypot(...ray), direction = ray.map(n => n / norm), mu = direction[1];
    expect(point).not.toBeNull(); expect(point.mu).toBeCloseTo(mu, 10);
    for (let i = 0; i < 3; i++) expect(point.direction[i]).toBeCloseTo(direction[i], 10);
    const b = distance * mu, groundDiscriminant = b * b - (distance * distance - radius * radius);
    const blocked = mu < 0 && groundDiscriminant > 0.001;
    expect(point.blocked).toBe(blocked);
    if (blocked) {
      expect(point.column).toBe(0); expect(point.transmission).toEqual([0, 0, 0]); expect(point.rgba[3]).toBe(255);
      continue;
    }
    const outerDiscriminant = b * b - (distance * distance - shell * shell);
    let column = 0;
    if (outerDiscriminant > 0) {
      const entry = Math.max(0, -b - Math.sqrt(outerDiscriminant)), exit = -b + Math.sqrt(outerDiscriminant);
      if (exit > entry) {
        // Uniform high-resolution midpoint quadrature is independent of the production adaptive spacing.
        const step = (exit - entry) / 2048;
        for (let i = 0; i < 2048; i++) {
          const along = entry + (i + 0.5) * step;
          const height = Math.sqrt(distance * distance + along * along + 2 * b * along) - radius;
          column += Math.exp(-Math.max(0, height) / 8000) * step;
        }
      }
    }
    expect(Math.abs(point.column - column)).toBeLessThanOrEqual(Math.max(0.01, column * 0.01));
    for (const [i, beta] of [0.0000069, 0.0000135, 0.0000301].entries()) {
      expect(point.transmission[i]).toBeCloseTo(Math.exp(-beta * point.column), 10);
    }
    expect(point.transmission[0]).toBeGreaterThanOrEqual(point.transmission[1]);
    expect(point.transmission[1]).toBeGreaterThanOrEqual(point.transmission[2]);
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

async function nativeAtmosphere(page: Page) {
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
      const geometry = P.launchAtmosphereGeometry(50000, 634, 395);
      const before = state(); P.drawLaunchAtmosphere(ctx, geometry); const after = state();
      const cache = (cv as any)._mmLaunchAtmosphereRaster;
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      P.drawLaunchAtmosphere(ctx, geometry);
      const reused = (cv as any)._mmLaunchAtmosphereRaster;
      return { before, after, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        cacheFieldMatches: cache?.field === geometry, cacheReused: !!cache && reused === cache,
        canvasReused: !!cache && reused?.canvas === cache.canvas, fieldReused: !!cache && reused?.field === geometry };
    };
    return { full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

async function atmospherePerformance(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cases: any[] = [];
    for (const width of [1100, 390]) for (const altitude of [0, 20000, 80000, 185000]) {
      const height = 400, samples: number[] = []; P.launchAtmosphereGeometry(altitude, width, height);
      let field: any;
      for (let i = 0; i < 8; i++) {
        const started = performance.now(); field = P.launchAtmosphereGeometry(altitude, width, height);
        samples.push(performance.now() - started);
      }
      const sorted = samples.slice().sort((a, b) => a - b);
      cases.push({ width, height, altitude, warmupBuilds: 1, measuredBuilds: samples.length,
        medianMs: (sorted[3] + sorted[4]) / 2, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], samplesMs: samples,
        columns: field.columns, rows: field.rows });
    }
    return { clock: 'performance.now', assertionPolicy: 'record timings without machine-dependent thresholds', cases };
  });
}

test('Launch atmosphere follows viewing altitude and preserves recorded flight through review and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeAtmosphere(page);
  for (const value of Object.values(native)) expect(value.after).toEqual(value.before);
  for (const value of [native.full, native.repeat, native.faded, native.clipped]) {
    expect(value.cacheFieldMatches).toBe(true); expect(value.cacheReused).toBe(true);
    expect(value.canvasReused).toBe(true); expect(value.fieldReused).toBe(true);
  }
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.rightOfClip).toBe(0);
  const performanceProbe = await atmospherePerformance(page);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      const index = profile.samples.findIndex((row: any) => row.altitude >= height);
      if (index < 0) return Math.floor(profile.summary.duration * 10) / 10;
      let lo = profile.samples[Math.max(0, index - 1)].time, hi = profile.samples[index].time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { pad: 0, low: atHeight(20000), middle: atHeight(50000), high: atHeight(80000), orbit: atHeight(185000) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const name of ['pad', 'low', 'middle', 'high', 'orbit'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'launch-atmosphere-desktop-' + name);
  }
  expect(scenes.low.sample.altitude).toBeCloseTo(20000, -3); expect(scenes.middle.sample.altitude).toBeCloseTo(50000, -3);
  expect(scenes.high.sample.altitude).toBeCloseTo(80000, -3); expect(scenes.orbit.sample.altitude).toBeCloseTo(185000, -3);
  await accessibility(page, info, 'launch-atmosphere-desktop-axe');
  await seek(page, -5); scenes.countdown = await scene(page); checkScene(scenes.countdown);
  expect(scenes.countdown.g).toEqual(scenes.pad.g);
  await seek(page, times.orbit); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneOrbit = await scene(page); await capture(page, info, 'launch-atmosphere-phone-orbit');
  await seek(page, times.low); scenes.phoneLow = await scene(page); checkScene(scenes.phoneLow);
  await capture(page, info, 'launch-atmosphere-phone-low'); await accessibility(page, info, 'launch-atmosphere-phone-axe');
  const paused = await scene(page);
  const reuse = await page.locator('[data-launch-canvas]').evaluate(async (cv: any) => {
    const field = cv._mmLaunchAtmosphere, cache = cv._mmLaunchAtmosphereRaster, pixels = field.pixels,
      beforeDraws = cv.__mm75AtmosphereDrawCount || 0;
    await new Promise<void>(done => setTimeout(done, 180));
    return { field: cv._mmLaunchAtmosphere === field, pixels: cv._mmLaunchAtmosphere.pixels === pixels,
      cache: cv._mmLaunchAtmosphereRaster === cache, canvas: cv._mmLaunchAtmosphereRaster.canvas === cache.canvas,
      observedDraws: (cv.__mm75AtmosphereDrawCount || 0) - beforeDraws };
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
  await seek(page, times.middle); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.middle); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-atmosphere-evidence.json');
  await writeFile(path, JSON.stringify({ native, performanceProbe, times, scenes, resizeProbes, reuse,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-atmosphere-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
