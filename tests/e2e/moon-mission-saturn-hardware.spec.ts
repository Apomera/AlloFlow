import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass76-2026-10-15/browser/saturn-hardware');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any, rect = proto.fillRect;
    const begin = proto.beginPath, fill = proto.fill, stroke = proto.stroke, gradient = proto.createLinearGradient;
    const add = CanvasGradient.prototype.addColorStop;
    proto.beginPath = function (...args: any[]) { this.__mm76Path = []; return begin.apply(this, args); };
    for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath']) {
      const original = proto[name];
      proto[name] = function (...args: number[]) {
        if (this.__mm76Path && (this.canvas.hasAttribute('data-launch-canvas') || this.canvas.hasAttribute('data-hardware-probe'))) {
          this.__mm76Path.push([name, ...args]);
        }
        return original.apply(this, args);
      };
    }
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) this.canvas.__mm76 = { paths: [] };
      return rect.call(this, x, y, ...args);
    };
    proto.createLinearGradient = function (...args: any[]) { const result = gradient.apply(this, args); result.__mm76Stops = []; return result; };
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm76Stops) (this as any).__mm76Stops.push([offset, color]); return add.call(this, offset, color);
    };
    const record = (ctx: any, kind: string) => {
      if (!ctx.canvas.__mm76 || !ctx.__mm76Path?.length) return;
      const m = ctx.getTransform(), material = kind === 'fill' ? ctx.fillStyle : ctx.strokeStyle;
      ctx.canvas.__mm76.paths.push({ kind, commands: ctx.__mm76Path.slice(), alpha: ctx.globalAlpha,
        material: typeof material === 'string' ? material : material?.__mm76Stops || 'gradient', lineWidth: ctx.lineWidth,
        matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
    };
    proto.fill = function (...args: any[]) { record(this, 'fill'); return fill.apply(this, args); };
    proto.stroke = function (...args: any[]) { record(this, 'stroke'); return stroke.apply(this, args); };
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
    const camera = (cv as any)._mmLaunchCamera || null, debris = (cv as any)._mmLaunchDebris || [];
    const paths = (cv as any).__mm76?.paths || [];
    const signature = (path: any) => JSON.stringify([path.kind, path.commands, path.material, path.kind === 'stroke' ? path.lineWidth : 0]);
    const match = (label: string, cx: number, top: number, fullHeight: number, stage: number, options: any, angle: number) => {
      const probe = document.createElement('canvas'); probe.setAttribute('data-hardware-probe', ''); (probe as any).__mm76 = { paths: [] };
      const geometry = P.saturnV(probe.getContext('2d'), cx, top, fullHeight, stage, options);
      const expected = (probe as any).__mm76.paths;
      const count = new Map<string, number>();
      for (const path of paths) { const key = signature(path); count.set(key, (count.get(key) || 0) + 1); }
      let found = 0; const matched: any[] = [];
      for (const path of expected) {
        const key = signature(path);
        if ((count.get(key) || 0) > 0) {
          found++; count.set(key, count.get(key)! - 1);
          const actual = paths.find((row: any) => signature(row) === key); matched.push(actual);
        }
      }
      return { label, geometry, expectedCount: expected.length, found, expectedStrokes: expected.filter((row: any) => row.kind === 'stroke').length,
        expectedCurvedFills: expected.filter((row: any) => row.kind === 'fill' && row.commands.length === 35 &&
          row.commands[0][0] === 'moveTo' && row.commands.slice(1, 34).every((cmd: any[]) => cmd[0] === 'lineTo')).length,
        angle, paths: matched };
    };
    const hardware = camera ? [match('attached', camera.x, camera.topY, camera.fullHeight, sample.stage,
      { les: time < P.launchProfile().events.les.time, orbitLight: P.launchSunlight(sample.pitch) }, sample.pitch)] :
      [match('attached', cv.offsetWidth * 0.5, cv.offsetHeight * 0.80 - cv.offsetHeight * 0.58, cv.offsetHeight * 0.58, 1,
        { orbitLight: P.launchSunlight(0) }, 0)];
    for (const pose of debris) hardware.push(match(pose.kind, 0, pose.topY, pose.fullHeight, 1,
      { only: pose.only, orbitLight: P.launchSunlight(pose.angle) }, pose.angle));
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i] === 255) opaque++; }
    return { data, time, sample: { stage: sample.stage, altitude: sample.altitude, pitch: sample.pitch, speed: sample.speed },
      camera, debris, hardware, nativePathCount: paths.length,
      width: cv.width, height: cv.height, cssWidth: cv.clientWidth, cssHeight: cv.clientHeight, checksum, opaque, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque / value.pixels).toBeGreaterThan(0.98);
  expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(value.nativePathCount).toBeGreaterThan(10);
  for (const hardware of value.hardware) {
    expect(hardware.found, hardware.label + ': all hardware paths reached native Canvas').toBe(hardware.expectedCount);
    expect(hardware.expectedCount).toBeGreaterThan(0);
    if (hardware.label !== 'les') {
      expect(hardware.expectedStrokes).toBeGreaterThan(5); expect(hardware.expectedCurvedFills).toBeGreaterThan(0);
    }
    for (const path of hardware.paths) {
      expect(path.commands.flatMap((command: any[]) => command.slice(1)).every(Number.isFinite)).toBe(true);
      expect(Object.values(path.matrix).every(Number.isFinite)).toBe(true);
      expect(Math.atan2(path.matrix.b, path.matrix.a)).toBeCloseTo(Math.atan2(Math.sin(hardware.angle), Math.cos(hardware.angle)), 7);
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

async function nativeHardware(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const field = P.saturnHardwareGeometry({ k: 2, sections: [
      { id: 'sm', y0: 25, y1: 95, w0: 90, w1: 90 }, { id: 's1', y0: 110, y1: 360, w0: 100, w1: 100 } ] });
    const nozzle = P.saturnNozzleGeometry(320, 380, 65, 35, 70), light = { x: 0.6, y: -0.8, fraction: 1 };
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
      cv.setAttribute('data-hardware-probe', ''); (cv as any).__mm76 = { paths: [] };
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.lineCap = 'round'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 480); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, lineCap: ctx.lineCap, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const before = state(); P.drawSaturnHardware(ctx, 320, field, light); const afterHardware = state();
      P.drawSaturnNozzle(ctx, nozzle, light); const afterNozzle = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      return { before, afterHardware, afterNozzle, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        nativePathCount: (cv as any).__mm76.paths.length };
    };
    const geometries = [1, 2, 3].map(stage => {
      const cv = document.createElement('canvas'); const ctx = cv.getContext('2d')!;
      return { stage, result: P.saturnV(ctx, 320, 20, 552.5, stage, { les: false, orbitLight: light }) };
    });
    return { full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true), geometries };
  });
}

async function gallery(page: Page, info: TestInfo) {
  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 1000; cv.setAttribute('data-hardware-gallery', '');
    cv.style.cssText = 'width:1200px;height:1000px;display:block;position:absolute;left:0;top:0;z-index:10000';
    document.body.appendChild(cv); const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#091321'; ctx.fillRect(0, 0, cv.width, cv.height);
    const panel = (col: number, row: number, title: string, label: string, draw: (cx: number, light: any) => void) => {
      ctx.save(); ctx.translate(col * 400, row * 500);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.strokeRect(10.5, 10.5, 379, 479);
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText(title, 200, 38);
      ctx.fillStyle = '#94a3b8'; ctx.font = '13px system-ui'; ctx.fillText(label, 200, 60);
      draw(130, { x: 0.6, y: -0.8, fraction: 1 }); draw(270, { x: -0.6, y: -0.8, fraction: 1 });
      ctx.fillStyle = '#cbd5e1'; ctx.font = '12px system-ui'; ctx.fillText('Sun from right', 130, 478); ctx.fillText('Sun from left', 270, 478);
      ctx.restore();
    };
    panel(0, 0, 'S-IC attached', 'Same native vehicle renderer · full stack', (x, light) => P.saturnV(ctx, x, 72, 390, 1, { orbitLight: light }));
    panel(1, 0, 'S-II attached', 'First stage released', (x, light) => P.saturnV(ctx, x, 106, 550, 2, { les: false, orbitLight: light }));
    panel(2, 0, 'S-IVB attached', 'Second stage released', (x, light) => P.saturnV(ctx, x, 110, 750, 3, { les: false, orbitLight: light }));
    panel(0, 1, 'Released S-IC', 'Interstage, tank structure and F-1 bells', (x, light) => P.saturnV(ctx, x, -390, 850, 1,
      { only: ['s1is', 's1'], orbitLight: light }));
    panel(1, 1, 'Released S-II', 'Adapter, tank structure and J-2 bells', (x, light) => P.saturnV(ctx, x, -450, 1500, 1,
      { only: ['s4bis', 's2'], orbitLight: light }));
    panel(2, 1, 'Spacecraft and upper stage', 'Panel seams, radiators and tapered adapter', (x, light) => P.saturnV(ctx, x, -15, 1100, 3,
      { les: false, orbitLight: light }));
  });
  const path = join(REPORT, 'saturn-hardware-native-gallery-' + info.project.name + '.png');
  const png = readPng(await page.locator('[data-hardware-gallery]').screenshot({ path }));
  expect(png.width).toBe(1200); expect(png.height).toBe(1000);
  await info.attach('saturn-hardware-native-gallery', { path, contentType: 'image/png' });
  await page.locator('[data-hardware-gallery]').evaluate(el => el.remove());
}

test('Saturn hardware follows lighting and staging while preserving launch review and native Canvas state', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeHardware(page);
  for (const value of [native.full, native.repeat, native.faded, native.transparent, native.clipped]) {
    expect(value.afterHardware).toEqual(value.before); expect(value.afterNozzle).toEqual(value.before);
  }
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.faded.maxAlpha).toBeLessThan(native.full.maxAlpha); expect(native.transparent.painted).toBe(0);
  expect(native.clipped.rightOfClip).toBe(0);
  const expectedSections = ['cm', 'sm', 'sla', 'iu', 's4b', 's4bis', 's2', 's1is', 's1'];
  for (const { stage, result } of native.geometries) {
    const sections = stage === 1 ? expectedSections : stage === 2 ? expectedSections.slice(0, 7) : expectedSections.slice(0, 5);
    expect(result.sections.map((row: any) => row.id)).toEqual(sections); expect(result.k).toBeCloseTo(5, 12);
    expect(result.nozzle).toBeCloseTo(20 + [110.5, 66.3, 41.3][stage - 1] * 5, 9);
    expect(result.hardware.sections.map((row: any) => row.id)).toEqual(sections.filter(id => id !== 'cm'));
  }
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const atHeight = (height: number) => {
      const index = profile.samples.findIndex((row: any) => row.altitude >= height);
      let lo = profile.samples[Math.max(0, index - 1)].time, hi = profile.samples[index].time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).altitude < height) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { pad: -5, low: atHeight(20000), high: atHeight(80000), stage1: profile.events.stage1.time + 3, stage2: profile.events.stage2.time + 3 };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const name of ['pad', 'low', 'stage1', 'stage2'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'saturn-hardware-desktop-' + name);
  }
  expect(scenes.stage1.debris.some((row: any) => row.kind === 'stage1')).toBe(true);
  expect(scenes.stage2.debris.some((row: any) => row.kind === 'stage2')).toBe(true);
  await accessibility(page, info, 'saturn-hardware-desktop-axe'); await gallery(page, info);
  await seek(page, times.high); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phoneHigh = await scene(page); await capture(page, info, 'saturn-hardware-phone-high');
  await seek(page, times.pad); scenes.phonePad = await scene(page); checkScene(scenes.phonePad);
  await capture(page, info, 'saturn-hardware-phone-pad'); await accessibility(page, info, 'saturn-hardware-phone-axe');
  await seek(page, times.low); const paused = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('1'); const slow = await scene(page);
  await page.getByRole('combobox', { name: 'Launch playback speed' }).selectOption('60'); const fast = await scene(page);
  expect(slow.checksum).toBe(paused.checksum); expect(fast.checksum).toBe(paused.checksum);
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(paused.time);
  const beforeReload = await scene(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await scene(page); checkScene(reloaded);
  expect(reloaded.data).toEqual(beforeReload.data); expect(reloaded.checksum).toBe(beforeReload.checksum); expect(await saved(page)).toEqual(reloadSave);
  await seek(page, times.stage2); await seek(page, beforeReload.time); const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.stage1); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'saturn-hardware-evidence.json');
  await writeFile(path, JSON.stringify({ native, times, scenes, resizeProbes,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('saturn-hardware-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
