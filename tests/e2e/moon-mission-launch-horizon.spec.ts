import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass67-2026-10-14/browser/launch-horizon');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    const begin = proto.beginPath, clip = proto.clip, rectangle = proto.fillRect;
    proto.beginPath = function (...args: any[]) { this.__mm67Path = []; return begin.apply(this, args); };
    ['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'closePath'].forEach(name => {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.__mm67Path) this.__mm67Path.push({ command: name, args });
        return original.apply(this, args);
      };
    });
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        this.canvas.__mm67 = { clips: [] };
      }
      return rectangle.call(this, x, y, ...args);
    };
    proto.clip = function (...args: any[]) {
      if (this.canvas.__mm67) {
        this.canvas.__mm67.clips.push({ path: (this.__mm67Path || []).map((p: any) => ({ command: p.command, args: p.args.slice() })),
          matrix: Array.from(this.getTransform().toFloat64Array()) });
      }
      return clip.apply(this, args);
    };
    // Independent camera-ray/sphere intersection oracle. It never calls the
    // horizon helpers or reads their sampled points. The observer is (0,R+h,0)
    // and pixel rays are (horizontal offset, -downward offset, focal distance).
    (window as any).__mm67MaskOracle = (cv: HTMLCanvasElement, altitude: number) => {
      const W = cv.width, H = cv.height, R = 6371000, distance = R + Math.max(0, altitude);
      const focal = H / (2 * Math.tan(Math.PI / 6)), eye = H * 0.6;
      const hit = (x: number, y: number) => {
        const down = y - eye, norm = Math.hypot(x - W / 2, down, focal);
        const projection = distance * down / norm;
        return projection >= 0 && distance * distance - projection * projection <= R * R;
      };
      const pixels = cv.getContext('2d')!.getImageData(0, 0, W, H).data;
      let tested = 0, ground = 0, sky = 0, mismatches = 0, skipped = 0;
      const examples: any[] = [];
      for (let y = 1; y < H - 1; y += 3) for (let x = 1; x < W - 1; x += 3) {
        // A two-pixel band covers raster antialiasing and polyline sampling.
        if (hit(x + 0.5, y + 0.5 - 2) !== hit(x + 0.5, y + 0.5 + 2)) { skipped++; continue; }
        const expected = hit(x + 0.5, y + 0.5), i = (y * W + x) * 4;
        const actual = pixels[i] === 255 && pixels[i + 1] === 255 && pixels[i + 2] === 255 && pixels[i + 3] === 255;
        tested++; if (expected) ground++; else sky++;
        if (actual !== expected) { mismatches++; if (examples.length < 5) examples.push({ x, y, expected, rgba: Array.from(pixels.slice(i, i + 4)) }); }
      }
      return { tested, ground, sky, mismatches, skipped, examples };
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
async function launch(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({ ...cv.dataset }));
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
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
async function seekAltitude(page: Page, altitude: number) {
  const time = await page.evaluate(altitude => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    let low = 0, high = profile.summary.duration;
    for (let i = 0; i < 45; i++) {
      const middle = (low + high) / 2;
      if (P.launchSample(profile, middle).altitude < altitude) low = middle; else high = middle;
    }
    return (low + high) / 2;
  }, altitude);
  return seek(page, time);
}
async function sceneHorizon(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const P = (window as any).MoonMissionPure, W = cv.width / 2, H = cv.height / 2, d = { ...cv.dataset };
    const time = Number(d.launchTime), sample = P.launchSample(P.launchProfile(), Math.max(0, time));
    const altitude = sample.altitude, radius = 6371000, focal = H / (2 * Math.tan(Math.PI / 6)), eye = H * 0.6;
    const dip = Math.acos(radius / (radius + Math.max(0, altitude)));
    const heightAt = (x: number) => eye + Math.tan(dip) * Math.hypot(focal, x - W / 2);
    const clips = (cv as any).__mm67?.clips || [];
    const groundClips = clips.filter((row: any) => row.path.length >= 20 && row.path[0].command === 'moveTo' &&
      Math.abs(row.path[0].args[0] + 20) < 1e-8 && Math.abs(row.path[0].args[1] - heightAt(-20)) < 1e-6);
    const legacyGroundCircles = clips.filter((row: any) => row.path.some((p: any) => p.command === 'arc' &&
      Math.abs(p.args[0] - W / 2) < 1e-8 && p.args[1] > H && p.args[2] >= W * 2));
    const ground = groundClips[0];
    let nativeMask = null;
    if (ground) {
      const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
      const context = mask.getContext('2d')!;
      context.fillStyle = '#000'; context.fillRect(0, 0, W, H);
      context.beginPath(); ground.path.forEach((p: any) => (context as any)[p.command](...p.args));
      context.clip(); context.fillStyle = '#fff'; context.fillRect(0, 0, W, H);
      nativeMask = (window as any).__mm67MaskOracle(mask, altitude);
    }
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
    return { W, H, data: d, sample: { altitude: sample.altitude, speed: sample.speed, stage: sample.stage, mass: sample.mass },
      expected: { altitude, radius, focal, eye, dipDegrees: dip * 180 / Math.PI, center: heightAt(W / 2), edge: heightAt(0) },
      groundClips, legacyGroundCircles: legacyGroundCircles.length, nativeMask, opaque, pixels: cv.width * cv.height };
  });
}
function checkScene(scene: Awaited<ReturnType<typeof sceneHorizon>>) {
  const { W, H, data, expected } = scene;
  expect(H).toBe(400);
  expect(Number(data.launchAltitude)).toBeCloseTo(scene.sample.altitude, 8);
  expect(Number(data.launchSpeed)).toBeCloseTo(scene.sample.speed, 8);
  expect(Number(data.launchMass)).toBeCloseTo(scene.sample.mass, 8);
  expect(Number(data.launchStage)).toBe(scene.sample.stage);
  expect(Number(data.launchHorizonDip)).toBeCloseTo(expected.dipDegrees, 8);
  expect(Number(data.launchHorizonFocal)).toBeCloseTo(expected.focal, 8);
  expect(Number(data.launchHorizonEye)).toBeCloseTo(expected.eye, 8);
  expect(Number(data.launchHorizonCenter)).toBeCloseTo(expected.center, 8);
  expect(scene.groundClips, 'the measured launch altitude supplies one native surface clip').toHaveLength(1);
  expect(scene.legacyGroundCircles, 'the old viewport-width circle is absent from Earth clipping').toBe(0);
  const path = scene.groundClips[0].path;
  expect(path[path.length - 1].command).toBe('closePath');
  const points = path.slice(0, -3);
  expect(points[0].command).toBe('moveTo');
  expect(points[0].args[0]).toBe(-20);
  expect(points[points.length - 1].args[0]).toBeCloseTo(W + 20, 10);
  expect((points.length - 1) % 2).toBe(0);
  points.forEach((point: any, index: number) => {
    const [x, y] = point.args;
    expect(point.command).toBe(index ? 'lineTo' : 'moveTo');
    const dip = expected.dipDegrees * Math.PI / 180;
    expect(y).toBeCloseTo(expected.eye + Math.tan(dip) * Math.hypot(expected.focal, x - W / 2), 8);
    if (index) { expect(x - points[index - 1].args[0]).toBeGreaterThan(0); expect(x - points[index - 1].args[0]).toBeLessThanOrEqual(16.000000001); }
  });
  expect(points[(points.length - 1) / 2].args[0]).toBeCloseTo(W / 2, 8);
  expect(scene.nativeMask).not.toBeNull();
  expect(scene.nativeMask!.tested).toBeGreaterThan(10000);
  expect(scene.nativeMask!.ground).toBeGreaterThan(300);
  expect(scene.nativeMask!.sky).toBeGreaterThan(1000);
  expect(scene.nativeMask!.mismatches, 'native clip pixels agree with forward ray–sphere intersections').toBe(0);
  expect(scene.opaque).toBe(scene.pixels);
}
async function capture(page: Page, info: TestInfo, name: string, board = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (board) {
    const url = await page.locator('#launch-horizon-board').evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else {
    const target = page.locator('[data-launch-workspace]'), scene = target.locator('canvas').first();
    await scene.scrollIntoViewIfNeeded();
    await scene.evaluate(async () => { await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
    const bounds = await target.evaluate(el => {
      const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    });
    const sceneBounds = await scene.evaluate(el => {
      const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    });
    const png = readPng(await page.screenshot({ path, fullPage: true, clip: bounds }));
    expect(Math.abs(png.width - bounds.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(png.height - bounds.height)).toBeLessThanOrEqual(1);
    let bright = 0, samples = 0, minimum = 255, maximum = 0;
    const left = Math.ceil(sceneBounds.x - bounds.x) + 4, top = Math.ceil(sceneBounds.y - bounds.y) + 4;
    const right = Math.min(png.width, Math.floor(sceneBounds.x - bounds.x + sceneBounds.width) - 4);
    const bottom = Math.min(png.height, Math.floor(sceneBounds.y - bounds.y + sceneBounds.height) - 4);
    for (let y = top; y < bottom; y += 2) for (let x = left; x < right; x += 2) {
      const value = Math.max(...png.at(x, y)); samples++;
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); if (value > 110) bright++;
    }
    await writeFile(path.replace(/\.png$/, '-pixels.json'), JSON.stringify({ name, width: png.width, height: png.height, samples, bright, minimum, maximum }, null, 2));
    expect(samples, 'capture includes scene interior').toBeGreaterThan(10000);
    expect(bright, 'saved scene contains spacecraft, terrain or instruments').toBeGreaterThan(100);
    expect(maximum - minimum, 'saved scene is not blank').toBeGreaterThan(70);
  }
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

test('Launch spherical horizon follows measured altitude and keeps the same camera rays across desktop and phone', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page); await mount(page);
  const native = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, W = 640, H = 400;
    const cases = [0, 35000, 185000].map(altitude => {
      const g = P.launchHorizonGeometry(altitude, W, H), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const drawn = P.launchHorizonPath(ctx, g, true); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const oracle = (window as any).__mm67MaskOracle(cv, altitude);
      const crop = [310, 1014].map(width => {
        const geometry = P.launchHorizonGeometry(altitude, width, H);
        return { width, rays: [-150, -90, 0, 90, 150].map(offset => ({ offset, y: P.launchHorizonAt(geometry, width / 2 + offset) })) };
      });
      return { altitude, drawn, oracle, crop };
    });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!; ctx.fillStyle = '#123456'; ctx.strokeStyle = '#abcdef'; ctx.lineWidth = 7;
    ctx.globalAlpha = 0.37; ctx.translate(3, 4); ctx.rotate(0.2);
    const state = () => ({ alpha: ctx.globalAlpha, fill: ctx.fillStyle, stroke: ctx.strokeStyle, lineWidth: ctx.lineWidth,
      matrix: Array.from(ctx.getTransform().toFloat64Array()) });
    const before = state(); P.launchHorizonPath(ctx, P.launchHorizonGeometry(80000, W, H), true, -12); const after = state();
    return { W, H, cases, before, after };
  });
  expect(native.after).toEqual(native.before);
  native.cases.forEach(row => {
    expect(row.drawn).toBe(true); expect(row.oracle.tested).toBeGreaterThan(20000);
    expect(row.oracle.ground).toBeGreaterThan(2000); expect(row.oracle.sky).toBeGreaterThan(10000);
    expect(row.oracle.mismatches).toBe(0);
    expect(row.crop[0].rays).toEqual(row.crop[1].rays);
  });

  const pad = await sceneHorizon(page); checkScene(pad);
  await capture(page, info, 'launch-horizon-desktop-pad');
  await seekAltitude(page, 35000); const desktop35 = await sceneHorizon(page); checkScene(desktop35);
  await capture(page, info, 'launch-horizon-desktop-35km');
  const time80 = await seekAltitude(page, 80000), desktop80 = await sceneHorizon(page); checkScene(desktop80);
  await capture(page, info, 'launch-horizon-desktop-80km');
  expect(desktop35.expected.center).toBeGreaterThan(pad.expected.center);
  expect(desktop80.expected.center).toBeGreaterThan(desktop35.expected.center);
  await page.locator('[data-launch-result]').click();
  await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const desktopInsertion = await sceneHorizon(page); checkScene(desktopInsertion);
  const insertionSaved = await saved(page);
  expect(insertionSaved.launchResult.outcome).toBe('orbit');
  expect(desktopInsertion.expected.center).toBeGreaterThan(desktop80.expected.center);
  await capture(page, info, 'launch-horizon-desktop-insertion'); await accessibility(page, info, 'launch-horizon-desktop-axe');

  const resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const previousWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(previousWidth);
    const scene = await sceneHorizon(page); checkScene(scene);
    expect(physical(scene.data)).toEqual(physical(desktopInsertion.data)); expect(await saved(page)).toEqual(insertionSaved);
    expect(scene.expected.focal).toBeCloseTo(desktopInsertion.expected.focal, 10);
    expect(scene.expected.center).toBeCloseTo(desktopInsertion.expected.center, 10);
    expect(scene.expected.dipDegrees).toBeCloseTo(desktopInsertion.expected.dipDegrees, 10);
    expect(scene.expected.edge, 'narrower view crops the same horizon, without rescaling Earth').toBeLessThan(desktopInsertion.expected.edge);
    resizeProbes.push({ viewportWidth: width, scene });
  }
  const phoneInsertion = resizeProbes[resizeProbes.length - 1].scene;
  await capture(page, info, 'launch-horizon-phone-insertion');
  await seek(page, time80); const phone80 = await sceneHorizon(page); checkScene(phone80);
  expect(physical(phone80.data)).toEqual(physical(desktop80.data));
  expect(phone80.expected.center).toBeCloseTo(desktop80.expected.center, 10);
  expect(phone80.expected.focal).toBeCloseTo(desktop80.expected.focal, 10);
  expect((await saved(page)).launchResult).toEqual(insertionSaved.launchResult);
  await capture(page, info, 'launch-horizon-phone-80km'); await accessibility(page, info, 'launch-horizon-phone-axe');
  const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const paused = await launch(page); await page.waitForTimeout(180); expect(await launch(page)).toEqual(paused);
  await expect(page.locator('[data-launch-pause]')).toHaveText('Play launch');
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(time80);
  const beforeReload = await launch(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await sceneHorizon(page); checkScene(reloaded);
  expect(await launch(page)).toEqual(beforeReload); expect(await saved(page)).toEqual(reloadSave);
  expect((await saved(page)).launchResult).toEqual(insertionSaved.launchResult);
  expect((await saved(page)).missionXP).toBe(insertionSaved.missionXP); expect((await saved(page)).missionPhase).toBe(1);

  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cv = document.createElement('canvas');
    cv.id = 'launch-horizon-board'; cv.width = 1100; cv.height = 620; document.body.appendChild(cv);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#0b1322'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 25px system-ui'; ctx.fillText('The horizon follows the observer’s altitude', 28, 43);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Earth’s radius and a fixed camera field determine the horizon. A phone crops the same rays.', 28, 72);
    [0, 35000, 185000].forEach((altitude, i) => {
      const x = 28 + i * 358, W = 328, H = 400, g = P.launchHorizonGeometry(altitude, W, H);
      ctx.save(); ctx.translate(x, 100); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke(); ctx.setLineDash([]);
      P.launchHorizonPath(ctx, g, true); ctx.fillStyle = '#24577a'; ctx.fill();
      P.launchHorizonPath(ctx, g, false); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; ctx.font = '12px system-ui'; ctx.fillText('Local horizontal', 12, H * 0.6 - 10);
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 18px system-ui'; ctx.fillText(altitude === 0 ? 'Launch pad' : altitude / 1000 + ' km altitude', 12, 30);
      const dip = Math.acos(6371000 / (6371000 + altitude)) * 180 / Math.PI;
      ctx.font = '15px system-ui'; ctx.fillStyle = '#cbd5e1'; ctx.fillText('Horizon dip ' + dip.toFixed(2) + '°', 12, 56);
      ctx.restore();
    });
    ctx.fillStyle = '#cbd5e1'; ctx.font = '15px system-ui';
    ctx.fillText('Earth mask checked against independent ray–sphere intersections in native Chromium Canvas.', 28, 543);
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px system-ui';
    ctx.fillText('Nominal 60° vertical field; local horizontal at 60% of the frame. Camera framing and air glow remain illustrative.', 28, 580);
  });
  await capture(page, info, 'launch-horizon-comparison', true);
  const evidence = { native, scenes: { pad, desktop35, desktop80, desktopInsertion, phoneInsertion, phone80, reloaded },
    resizeProbes, overflow, errors, screenshotCount: 7, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, nativeClipOracle: 'forward camera-ray/sphere intersection; two-pixel boundary exclusion' };
  const path = join(REPORT, 'launch-horizon-evidence.json'); await writeFile(path, JSON.stringify(evidence, null, 2));
  await info.attach('launch-horizon-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
