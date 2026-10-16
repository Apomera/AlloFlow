import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass77-2026-10-15/browser/launch-pad');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any, clear = proto.clearRect, begin = proto.beginPath;
    const gradient = proto.createLinearGradient, add = CanvasGradient.prototype.addColorStop;
    const watched = (ctx: any) => ctx.canvas.hasAttribute('data-launch-canvas') || ctx.canvas.hasAttribute('data-pad-probe');
    proto.clearRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === 0 && y === 0) this.canvas.__mm77 = { calls: [] };
      return clear.call(this, x, y, ...args);
    };
    proto.beginPath = function (...args: any[]) { this.__mm77Path = []; return begin.apply(this, args); };
    for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'rect', 'arc', 'ellipse']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.__mm77Path && watched(this)) this.__mm77Path.push([name, ...args]);
        return original.apply(this, args);
      };
    }
    proto.createLinearGradient = function (...args: any[]) { const result = gradient.apply(this, args); result.__mm77Stops = []; return result; };
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm77Stops) (this as any).__mm77Stops.push([offset, color]); return add.call(this, offset, color);
    };
    for (const name of ['fill', 'stroke', 'fillRect', 'strokeRect']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.canvas.__mm77 && watched(this)) {
          const m = this.getTransform(), material = name.startsWith('fill') ? this.fillStyle : this.strokeStyle;
          this.canvas.__mm77.calls.push({ kind: name,
            commands: name.endsWith('Rect') ? [[name, ...args]] : this.__mm77Path.slice(), alpha: this.globalAlpha,
            material: typeof material === 'string' ? material : material?.__mm77Stops || 'gradient', lineWidth: this.lineWidth,
            matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
        }
        return original.apply(this, args);
      };
    }
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
    const releaseTime = P.launchPadReleaseTime(profile), field = (cv as any)._mmLaunchPad || null;
    const expected = P.launchPadGeometry(time, cv.offsetWidth, cv.offsetHeight, sample.altitude, releaseTime);
    const allCalls = (cv as any).__mm77?.calls || [];
    const signature = (call: any) => JSON.stringify([call.kind, call.commands, call.material, call.kind.startsWith('stroke') ? call.lineWidth : 0]);
    let native: any = null;
    if (field) {
      const probe = document.createElement('canvas'); probe.setAttribute('data-pad-probe', ''); (probe as any).__mm77 = { calls: [] };
      P.drawLaunchPad(probe.getContext('2d'), expected, P.launchSunlight(0));
      const calls = (probe as any).__mm77.calls, counts = new Map<string, number>(), matched: any[] = [];
      for (const call of allCalls) { const key = signature(call); counts.set(key, (counts.get(key) || 0) + 1); }
      for (const call of calls) {
        const key = signature(call);
        if ((counts.get(key) || 0) > 0) {
          counts.set(key, counts.get(key)! - 1); matched.push(allCalls.find((row: any) => signature(row) === key));
        }
      }
      native = { expectedCalls: calls.length, matchedCalls: matched.length,
        strokes: calls.filter((call: any) => call.kind.startsWith('stroke')).length,
        fills: calls.filter((call: any) => call.kind.startsWith('fill')).length, calls: matched };
    }
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i] === 255) opaque++; }
    return { data, time, releaseTime, field, expected, native,
      sample: { stage: sample.stage, altitude: sample.altitude, speed: sample.speed },
      width: cv.width, height: cv.height, cssWidth: cv.offsetWidth, cssHeight: cv.offsetHeight, checksum, opaque, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque / value.pixels).toBeGreaterThan(0.98);
  expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(value.field).toEqual(value.expected?.visible ? value.expected : null);
  if (value.field) {
    expect(value.native.matchedCalls).toBe(value.native.expectedCalls);
    expect(value.native.strokes).toBeGreaterThan(20); expect(value.native.fills).toBeGreaterThan(5);
    for (const call of value.native.calls) {
      expect(call.commands.flatMap((command: any[]) => command.slice(1)).filter((x: any) => typeof x === 'number').every(Number.isFinite)).toBe(true);
      expect(Object.values(call.matrix).every(Number.isFinite)).toBe(true);
    }
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

async function nativePad(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), releaseTime = P.launchPadReleaseTime(profile);
    const sample = P.launchSample(profile, 4), field = P.launchPadGeometry(4, 634, 475, sample.altitude, releaseTime);
    const light = P.launchSunlight(0);
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
      cv.setAttribute('data-pad-probe', ''); (cv as any).__mm77 = { calls: [] };
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.lineCap = 'round'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 480); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, lineCap: ctx.lineCap, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const before = state(), result = P.drawLaunchPad(ctx, field, light), after = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      return { before, after, result, painted, checksum, maxAlpha, alphaSum, rightOfClip, calls: (cv as any).__mm77.calls.length };
    };
    const releaseIndex = profile.samples.findIndex((row: any) => row.altitude >= 0.01905);
    const releaseRows = [profile.samples[releaseIndex - 1], profile.samples[releaseIndex]].map((row: any) => ({ time: row.time, altitude: row.altitude }));
    return { field, releaseTime, releaseRows, releaseAltitude: P.launchSample(profile, releaseTime).altitude,
      full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

async function gallery(page: Page, info: TestInfo) {
  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), release = P.launchPadReleaseTime(profile);
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 900; cv.setAttribute('data-pad-gallery', '');
    cv.style.cssText = 'width:1200px;height:900px;display:block;position:absolute;left:0;top:0;z-index:10000';
    document.body.appendChild(cv); const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#0b1523'; ctx.fillRect(0, 0, cv.width, cv.height);
    [-5, 0.8, 4, 6, 9, 10].forEach((time, index) => {
      ctx.save(); ctx.translate((index % 3) * 400, Math.floor(index / 3) * 450);
      ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.font = 'bold 19px system-ui';
      ctx.fillText(time < 0 ? 'T − 5 seconds' : 'T + ' + time + ' seconds', 200, 29);
      ctx.fillStyle = '#aebdce'; ctx.font = '12px system-ui'; ctx.fillText('Native pad geometry · measured vehicle rise', 200, 49);
      ctx.translate(10, 65); const width = 380, height = 360, sample = P.launchSample(profile, Math.max(0, time));
      const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#5184af'); sky.addColorStop(1, '#a8bdc2');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height); ctx.fillStyle = '#596e59'; ctx.fillRect(0, height * 0.8, width, height * 0.2);
      P.drawLaunchPad(ctx, P.launchPadGeometry(time, width, height, sample.altitude, release), P.launchSunlight(0));
      ctx.save(); ctx.translate(width / 2, height * 0.51); ctx.rotate(sample.pitch); ctx.translate(-width / 2, -height * 0.51);
      P.saturnV(ctx, width / 2, height * 0.8 - height * 0.58, height * 0.58, 1, { orbitLight: P.launchSunlight(sample.pitch) });
      ctx.restore(); ctx.restore();
    });
  });
  const path = join(REPORT, 'launch-pad-native-gallery-' + info.project.name + '.png');
  const png = readPng(await page.locator('[data-pad-gallery]').screenshot({ path }));
  expect(png.width).toBe(1200); expect(png.height).toBe(900);
  await info.attach('launch-pad-native-gallery', { path, contentType: 'image/png' });
  await page.locator('[data-pad-gallery]').evaluate(el => el.remove());
}

function checkArms(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.field.arms.map((arm: any) => arm.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(value.field.bays).toHaveLength(10);
  for (const arm of value.field.arms) {
    const preflight = [1, 2, 3, 9].includes(arm.id);
    expect(arm.preflight).toBe(preflight);
    expect(arm.connected).toBe(!preflight && value.time <= value.releaseTime);
    if (preflight) expect(arm.retraction).toBe(1);
    else {
      const progress = Math.max(0, Math.min(1, (value.time - value.releaseTime) / arm.duration));
      expect(arm.retraction).toBeCloseTo(progress * progress * (3 - 2 * progress), 12);
    }
    expect(Math.hypot(arm.tip.x - arm.hinge.x, (arm.tip.y - arm.hinge.y) / 0.22)).toBeCloseTo(arm.length, 9);
    expect(arm.hinge.x).toBe(value.field.tower.x);
  }
}

test('Launch pad retracts service arms on measured first motion and preserves native drawing and flight review', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativePad(page);
  for (const value of [native.full, native.repeat, native.faded, native.transparent, native.clipped]) expect(value.after).toEqual(value.before);
  for (const value of [native.full, native.repeat, native.faded, native.clipped]) expect(value.result).toEqual(native.field);
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.rightOfClip).toBe(0);
  const [a, b] = native.releaseRows;
  expect(a.altitude).toBeLessThan(0.01905); expect(b.altitude).toBeGreaterThanOrEqual(0.01905);
  expect(native.releaseTime).toBeCloseTo(a.time + (b.time - a.time) * (0.01905 - a.altitude) / (b.altitude - a.altitude), 12);
  expect(native.releaseAltitude).toBeCloseTo(0.01905, 8);
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const [name, time] of [['countdown', -5], ['release', 0.8], ['retracting', 4], ['clear', 9]] as const) {
    await seek(page, time); scenes[name] = await scene(page); checkScene(scenes[name]); checkArms(scenes[name]);
    await capture(page, info, 'launch-pad-desktop-' + name);
  }
  for (const arm of scenes.countdown.field.arms.filter((row: any) => !row.preflight)) {
    expect(arm.retraction).toBe(0);
    expect(arm.tip.x).toBeCloseTo(arm.contact.x, 9); expect(arm.tip.y).toBeCloseTo(arm.contact.y, 9);
    const moving = scenes.retracting.field.arms.find((row: any) => row.id === arm.id);
    expect(moving.retraction).toBeGreaterThan(0); expect(moving.retraction).toBeLessThan(1);
  }
  await seek(page, 10); scenes.stowed = await scene(page); checkScene(scenes.stowed); checkArms(scenes.stowed);
  expect(scenes.stowed.field.arms.every((arm: any) => arm.retraction === 1)).toBe(true);
  await accessibility(page, info, 'launch-pad-desktop-axe'); await gallery(page, info);
  await seek(page, 4); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); checkArms(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
    expect(value.field.arms.map((arm: any) => arm.retraction)).toEqual(beforeResize.field.arms.map((arm: any) => arm.retraction));
  }
  scenes.phoneRetracting = await scene(page); await capture(page, info, 'launch-pad-phone-retracting');
  await seek(page, -5); scenes.phoneCountdown = await scene(page); checkScene(scenes.phoneCountdown); checkArms(scenes.phoneCountdown);
  await capture(page, info, 'launch-pad-phone-countdown'); await accessibility(page, info, 'launch-pad-phone-axe');
  await seek(page, 4); const paused = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  expect(slow.field).toEqual(paused.field); expect(fast.field).toEqual(paused.field);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.field).toEqual(beforeReload.field);
  expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, 10); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.field).toEqual(beforeReload.field); expect(revisited.checksum).toBe(beforeReload.checksum);
  await seek(page, 150); const padBelowView = await scene(page); checkScene(padBelowView); expect(padBelowView.field).toBeNull();
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, 4); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-pad-evidence.json');
  await writeFile(path, JSON.stringify({ native, scenes, resizeProbes, padBelowView,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-pad-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
