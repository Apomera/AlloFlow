import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass70-2026-10-14/browser/launch-debris');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    const begin = proto.beginPath, move = proto.moveTo, line = proto.lineTo, fill = proto.fill, stroke = proto.stroke;
    const rect = proto.fillRect, gradient = proto.createLinearGradient, add = CanvasGradient.prototype.addColorStop;
    proto.beginPath = function (...args: any[]) { this.__mm70Path = []; return begin.apply(this, args); };
    for (const [name, original] of [['moveTo', move], ['lineTo', line]]) {
      proto[name] = function (x: number, y: number) { if (this.__mm70Path) this.__mm70Path.push([x, y]); return original.call(this, x, y); };
    }
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) this.canvas.__mm70 = { bodies: [] };
      return rect.call(this, x, y, ...args);
    };
    proto.createLinearGradient = function (...args: any[]) { const result = gradient.apply(this, args); result.__mm70Stops = []; return result; };
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm70Stops) (this as any).__mm70Stops.push([offset, color]); return add.call(this, offset, color);
    };
    const record = (ctx: any, kind: string, points: number[][]) => {
      const m = ctx.getTransform(), scale = Math.hypot(m.a, m.b);
      const x = points.reduce((s, p) => s + p[0], 0) / points.length;
      const y = points.reduce((s, p) => s + p[1], 0) / points.length;
      ctx.canvas.__mm70.bodies.push({ kind, points: points.slice(), alpha: ctx.globalAlpha, scale,
        matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, angle: Math.atan2(m.b, m.a),
        center: { x: (m.a * x + m.c * y + m.e) / scale, y: (m.b * x + m.d * y + m.f) / scale } });
    };
    proto.fill = function (...args: any[]) {
      const points = this.__mm70Path, stops = this.fillStyle?.__mm70Stops;
      if (this.canvas.__mm70 && points?.length === 4 && stops?.length === 17) {
        const width = points[1][0] - points[0][0], height = points[2][1] - points[0][1];
        // Physical section dimensions identify the drawn polygon independently
        // of the separation diagnostics or helper output.
        for (const [kind, ratio] of [['stage1', 38.5 / 10.1], ['stage2', 19.2 / 10.1], ['attached', 12 / 6.6]] as const) {
          if (width > 0 && Math.abs(height / width - ratio) < 1e-8) record(this, kind, points);
        }
      }
      return fill.apply(this, args);
    };
    proto.stroke = function (...args: any[]) {
      const points = this.__mm70Path;
      if (this.canvas.__mm70 && this.strokeStyle === '#9ca3af' && points?.length === 2 && points[0][0] === points[1][0]) record(this, 'les', points);
      return stroke.apply(this, args);
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
    const profile = P.launchProfile(), sample = P.launchSample(profile, Math.max(0, time));
    const camera = (cv as any)._mmLaunchCamera || null, debris = (cv as any)._mmLaunchDebris || [];
    const expected = time < 0 || !camera ? [] : ['stage1', 'stage2', 'les'].flatMap(kind => {
      const event = profile.events[kind], track = P.launchDebrisTrack(event, kind);
      const pose = P.launchDebrisPose(track, sample, camera);
      if (!pose || pose.opacity <= 0) return [];
      // Release attitude plus an illustrative spin, corrected only for the
      // moving local horizon. The live vehicle pitch must not be added again.
      const age = time - event.time, spin = kind === 'stage1' ? 0.012 : kind === 'stage2' ? -0.009 : -0.035;
      const angle = event.pitch + spin * age - (sample.downrange - event.downrange + 408 * age) / 6371000;
      return [{ kind, ...pose, independentAngle: angle }];
    });
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < pixels.length; i++) { checksum = Math.imul(checksum ^ pixels[i], 16777619) >>> 0; if (i % 4 === 3 && pixels[i] === 255) opaque++; }
    return { data, time, camera, debris, expected, bodies: (cv as any).__mm70?.bodies || [],
      sample: { stage: sample.stage, pitch: sample.pitch, altitude: sample.altitude, speed: sample.speed },
      width: cv.width, height: cv.height, opaque, checksum, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque).toBe(value.pixels); expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(Number(value.data.launchAltitude)).toBeCloseTo(value.sample.altitude, 6);
  expect(Number(value.data.launchSpeed)).toBeCloseTo(value.sample.speed, 6);
  expect(value.debris).toHaveLength(value.expected.length);
  if (value.time < 0) { expect(value.debris).toEqual([]); return; }
  const attached = value.bodies.filter((row: any) => row.kind === 'attached'); expect(attached).toHaveLength(1);
  const live = attached[0], camera = value.camera, c = Math.cos(value.sample.pitch), s = Math.sin(value.sample.pitch);
  expect(live.angle).toBeCloseTo(value.sample.pitch, 8);
  const shake = { x: live.matrix.e / live.scale - (camera.x - c * camera.x + s * camera.y),
    y: live.matrix.f / live.scale - (camera.y - s * camera.x - c * camera.y) };
  for (const pose of value.expected) {
    const diagnostics = value.debris.find((row: any) => row.kind === pose.kind); expect(diagnostics).toBeTruthy();
    for (const key of ['age', 'x', 'y', 'angle', 'opacity', 'relativeX', 'relativeY', 'rangeCompression', 'fullHeight', 'topY']) {
      expect(Number.isFinite(diagnostics[key]), pose.kind + ': finite ' + key).toBe(true);
      expect(diagnostics[key], pose.kind + ': ' + key).toBeCloseTo(pose[key], 8);
    }
    expect(pose.angle).toBeCloseTo(pose.independentAngle, 9);
    const rows = value.bodies.filter((row: any) => row.kind === pose.kind); expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.angle, pose.kind + ': native rotation is independent of vehicle pitch').toBeCloseTo(Math.atan2(Math.sin(pose.angle), Math.cos(pose.angle)), 8);
    // Chromium can quantize native Canvas translations to float32. These
    // sub-1024 CSS-pixel coordinates use a 2x backing store: two rounded
    // translations contribute at most about 6.2e-5 CSS px below 2048 device px.
    // Keep 1e-4 CSS px for native x/y only; analytical poses stay double-tight.
    expect(Math.abs(row.matrix.e / row.scale - (pose.x + shake.x)), pose.kind + ': native x').toBeLessThan(1e-4);
    expect(Math.abs(row.matrix.f / row.scale - (pose.y + shake.y)), pose.kind + ': native y').toBeLessThan(1e-4);
    expect(row.alpha).toBeCloseTo(pose.opacity, 6);
  }
}
function relativeBodies(value: Awaited<ReturnType<typeof scene>>) {
  return value.debris.map((row: any) => ({ kind: row.kind, age: row.age, angle: row.angle, opacity: row.opacity,
    relativeX: row.relativeX, relativeY: row.relativeY }));
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

async function nativeDebris(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const rows = ['stage1', 'stage2', 'les'].map(kind => {
      const event = profile.events[kind], track = P.launchDebrisTrack(event, kind);
      const pose = P.launchDebrisPose(track, P.launchSample(profile, event.time + 8), { x: 320, y: 220, topY: 135, fullHeight: 170, width: 640 });
      // Centre the isolated body to inspect native pixels without a page clip.
      const centered = { ...pose, x: 320, y: 220 };
      const draw = () => {
        const cv = document.createElement('canvas'); cv.width = 640; cv.height = 440; (cv as any).__mm70 = { bodies: [] };
        const ctx = cv.getContext('2d')!;
        ctx.globalAlpha = 0.37; ctx.fillStyle = '#123456'; ctx.strokeStyle = '#abcdef'; ctx.lineWidth = 7;
        ctx.translate(3, 4); ctx.rotate(0.2);
        const state = () => ({ alpha: ctx.globalAlpha, fill: ctx.fillStyle, stroke: ctx.strokeStyle, width: ctx.lineWidth,
          matrix: Array.from(ctx.getTransform().toFloat64Array()) });
        const before = state(); P.drawLaunchDebris(ctx, centered); const after = state();
        const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let painted = 0, checksum = 2166136261;
        for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i]) painted++; }
        return { before, after, painted, checksum, bodies: (cv as any).__mm70.bodies };
      };
      return { kind, pose, first: draw(), repeat: draw() };
    });
    return rows;
  });
}

test('Launch released hardware retains its own trajectories and attitude through event boundaries, review and resize', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeDebris(page);
  for (const row of native) { expect(row.first.after).toEqual(row.first.before); expect(row.first.painted).toBeGreaterThan(5); expect(row.first.checksum).toBe(row.repeat.checksum); }
  const profile = await page.evaluate(() => { const p = (window as any).MoonMissionPure.launchProfile(); return { events: p.events, summary: p.summary }; });
  const countdown = await scene(page); checkScene(countdown); expect(countdown.debris).toEqual([]);
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = { countdown }, continuity: any[] = [];
  for (const kind of ['stage1', 'les', 'stage2']) {
    const time = profile.events[kind].time;
    await seek(page, Math.floor((time - 0.05) * 10) / 10); const before = await scene(page); checkScene(before);
    if (kind === 'les') {
      // LES has no milestone button. Inspect the exact release instant through
      // the same seek action: rounding up to the slider's 0.1 s grid includes
      // post-release motion from its 45 m/s impulse, not just boundary continuity.
      await page.locator('[data-launch-canvas]').evaluate((cv: any, value) => cv._launchAction('seek', value), time);
      await expect.poll(async () => Number((await launch(page)).launchTime)).toBe(time);
    }
    else { await page.locator('[data-launch-milestone="' + kind + '"]').click(); await expect.poll(async () => Number((await launch(page)).launchTime)).toBe(time); }
    const after = await scene(page); checkScene(after);
    const oldBody = before.bodies.find((row: any) => row.kind === kind), newBody = after.bodies.find((row: any) => row.kind === kind);
    expect(oldBody).toBeTruthy(); expect(newBody).toBeTruthy();
    const distance = Math.hypot(newBody.center.x - oldBody.center.x, newBody.center.y - oldBody.center.y);
    expect(distance, kind + ': native body remains continuous at release').toBeLessThan(3);
    expect(Math.abs(newBody.angle - oldBody.angle), kind + ': release attitude remains continuous').toBeLessThan(0.015);
    continuity.push({ kind, before: { time: before.time, body: oldBody }, after: { time: after.time, body: newBody }, distance });
  }
  const times = { stage1: profile.events.stage1.time + 5, stage1Later: profile.events.stage1.time + 18,
    les: profile.events.les.time + 3, stage2: profile.events.stage2.time + 5 };
  for (const [name, time] of Object.entries(times)) {
    await seek(page, time); scenes[name] = await scene(page); checkScene(scenes[name]);
    expect(scenes[name].debris.length).toBeGreaterThan(0); await capture(page, info, 'launch-debris-desktop-' + name);
  }
  const first = scenes.stage1.debris.find((row: any) => row.kind === 'stage1');
  const later = scenes.stage1Later.debris.find((row: any) => row.kind === 'stage1');
  expect(Math.hypot(later.relativeX, later.relativeY)).toBeGreaterThan(Math.hypot(first.relativeX, first.relativeY));
  await accessibility(page, info, 'launch-debris-desktop-axe');
  await seek(page, times.stage2); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value);
    expect(physical(value.data)).toEqual(physical(beforeResize.data)); expect(relativeBodies(value)).toEqual(relativeBodies(beforeResize));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneStage2 = await scene(page); await capture(page, info, 'launch-debris-phone-stage2');
  await seek(page, times.stage1); scenes.phoneStage1 = await scene(page); checkScene(scenes.phoneStage1);
  expect(relativeBodies(scenes.phoneStage1)).toEqual(relativeBodies(scenes.stage1));
  await capture(page, info, 'launch-debris-phone-stage1'); await accessibility(page, info, 'launch-debris-phone-axe');
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
  // The same selected time produces the same pixels after forward/backward seek.
  await seek(page, times.stage2); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completed = await scene(page); checkScene(completed); expect(completed.debris).toEqual([]);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.stage1); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-debris-evidence.json');
  await writeFile(path, JSON.stringify({ native, continuity, scenes, resizeProbes, paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum },
    reloaded, revisited, completed, errors, screenshotCount: 6, accessibilityScans: 2,
    physicsAndSavedStatePreservedAcrossResizeAndReload: true, recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-debris-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
