import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass79-2026-10-16/browser/pad-condensation');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any, clear = proto.clearRect, begin = proto.beginPath;
    const add = CanvasGradient.prototype.addColorStop;
    const watched = (ctx: any) => ctx.canvas.hasAttribute('data-launch-canvas') || ctx.canvas.hasAttribute('data-condensation-probe');
    proto.clearRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === 0 && y === 0) this.canvas.__mm79 = { calls: [] };
      return clear.call(this, x, y, ...args);
    };
    proto.beginPath = function (...args: any[]) { this.__mm79Path = []; return begin.apply(this, args); };
    for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'rect', 'arc', 'ellipse']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.__mm79Path && watched(this)) this.__mm79Path.push([name, ...args]);
        return original.apply(this, args);
      };
    }
    for (const name of ['createLinearGradient', 'createRadialGradient']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        const result = original.apply(this, args); result.__mm79Gradient = { type: name, args, stops: [] }; return result;
      };
    }
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm79Gradient) (this as any).__mm79Gradient.stops.push([offset, color]); return add.call(this, offset, color);
    };
    for (const name of ['fill', 'stroke', 'fillRect', 'strokeRect']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.canvas.__mm79 && watched(this)) {
          const m = this.getTransform(), material = name.startsWith('fill') ? this.fillStyle : this.strokeStyle;
          this.canvas.__mm79.calls.push({ kind: name,
            commands: name.endsWith('Rect') ? [[name, ...args]] : (this.__mm79Path || []).slice(), alpha: this.globalAlpha,
            material: typeof material === 'string' ? material : material?.__mm79Gradient || 'gradient', lineWidth: this.lineWidth,
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
    const sample = P.launchSample(P.launchProfile(), Math.max(0, time));
    const field = (cv as any)._mmPadCondensation || null, pad = (cv as any)._mmLaunchPad || null;
    const expected = P.launchPadCondensationGeometry(time, cv.offsetWidth, cv.offsetHeight, sample.altitude);
    const zeroAltitude = P.launchPadCondensationGeometry(time, cv.offsetWidth, cv.offsetHeight, 0);
    const allCalls = (cv as any).__mm79?.calls || [];
    const signature = (call: any) => JSON.stringify([call.kind, call.commands, call.material,
      call.kind.startsWith('stroke') ? call.lineWidth : 0, call.alpha]);
    const native: any = { expectedCalls: 0, matchedCalls: 0, calls: [], deckIndex: -1, hullIndex: -1 };
    if (field) {
      const probe = document.createElement('canvas'); probe.setAttribute('data-condensation-probe', ''); (probe as any).__mm79 = { calls: [] };
      P.drawLaunchPadCondensation(probe.getContext('2d'), expected, P.launchSunlight(0));
      const calls = (probe as any).__mm79.calls;
      let from = 0;
      for (const call of calls) {
        const key = signature(call), index = allCalls.findIndex((row: any, i: number) => i >= from && signature(row) === key);
        if (index >= 0) { native.calls.push({ index, expected: call, actual: allCalls[index] }); from = index + 1; }
      }
      native.expectedCalls = calls.length; native.matchedCalls = native.calls.length;
      if (pad) {
        const d = pad.deck, commands = [['fillRect', d.x, d.y, d.width, d.height]];
        native.deckIndex = allCalls.findIndex((call: any) => call.kind === 'fillRect' && JSON.stringify(call.commands) === JSON.stringify(commands));
      }
      const camera = (cv as any)._mmLaunchCamera;
      const cx = camera ? camera.x : cv.offsetWidth * 0.5;
      const fullHeight = camera ? camera.fullHeight : cv.offsetHeight * 0.58;
      const top = camera ? camera.topY : cv.offsetHeight * 0.80 - fullHeight;
      const geometryCanvas = document.createElement('canvas');
      const stack = P.saturnV(geometryCanvas.getContext('2d'), cx, top, fullHeight, sample.stage,
        { les: sample.lesOn, orbitLight: P.launchSunlight(sample.pitch) });
      const body = stack.sections.find((row: any) => row.id === 's1');
      if (body) {
        const commands = [['moveTo', cx - body.w0 / 2, body.y0], ['lineTo', cx + body.w0 / 2, body.y0],
          ['lineTo', cx + body.w1 / 2, body.y1], ['lineTo', cx - body.w1 / 2, body.y1], ['closePath']];
        native.hullIndex = allCalls.findIndex((call: any) => call.kind === 'fill' && JSON.stringify(call.commands) === JSON.stringify(commands));
      }
    }
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i] === 255) opaque++; }
    return { data, time, field, expected, zeroAltitude, native,
      sample: { stage: sample.stage, altitude: sample.altitude, speed: sample.speed, pitch: sample.pitch },
      width: cv.width, height: cv.height, cssWidth: cv.offsetWidth, cssHeight: cv.offsetHeight, checksum, opaque, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}

function callerMatrix(actual: any, expected: any) {
  const det = expected.a * expected.d - expected.b * expected.c;
  const inverse = { a: expected.d / det, b: -expected.b / det, c: -expected.c / det, d: expected.a / det,
    e: (expected.c * expected.f - expected.d * expected.e) / det,
    f: (expected.b * expected.e - expected.a * expected.f) / det };
  return { a: actual.a * inverse.a + actual.c * inverse.b, b: actual.b * inverse.a + actual.d * inverse.b,
    c: actual.a * inverse.c + actual.c * inverse.d, d: actual.b * inverse.c + actual.d * inverse.d,
    e: actual.a * inverse.e + actual.c * inverse.f + actual.e,
    f: actual.b * inverse.e + actual.d * inverse.f + actual.f };
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque / value.pixels).toBeGreaterThan(0.98);
  expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(value.field).toEqual(value.expected);
  expect(value.native.matchedCalls).toBe(value.native.expectedCalls);
  if (value.field) {
    expect(value.field.puffs.length).toBeLessThanOrEqual(42);
    expect(value.native.expectedCalls).toBe(value.field.puffs.length * 3);
    expect(value.field.sources.map((source: any) => source.id)).toEqual(['s1', 's2', 's4b']);
    const lift = value.sample.altitude * 1.2 / 9.25, k = value.cssHeight * 0.58 / 110.5;
    const sectionData: Record<string, { offset: number; height: number; width: number; fraction: number; side: number }> = {
      s1: { offset: 68.5, height: 38.5, width: 10.1, fraction: 0.18, side: -1 },
      s2: { offset: 43.7, height: 19.2, width: 10.1, fraction: 0.78, side: 1 },
      s4b: { offset: 25.9, height: 12, width: 6.6, fraction: 0.72, side: -1 },
    };
    for (const [index, source] of value.field.sources.entries()) {
      const section = sectionData[source.id];
      expect(source.x).toBeCloseTo(value.cssWidth / 2 + section.side * (section.width / 2 + 0.3) * k, 9);
      expect(source.y).toBeCloseTo(value.cssHeight * 0.22 + lift + (section.offset + section.height * section.fraction) * k, 9);
      expect(source.x).toBe(value.zeroAltitude.sources[index].x);
      expect(source.y - value.zeroAltitude.sources[index].y).toBeCloseTo(lift, 9);
    }
    expect(value.field.puffs.map((puff: any) => puff.id)).toEqual(value.zeroAltitude.puffs.map((puff: any) => puff.id));
    for (const [index, puff] of value.field.puffs.entries()) {
      expect(puff.born).toBeLessThan(0); expect(puff.age).toBeGreaterThan(0); expect(puff.age).toBeLessThan(4.2);
      expect(puff.age).toBeCloseTo(value.time - puff.born, 12);
      expect(puff.x).toBe(value.zeroAltitude.puffs[index].x);
      expect(puff.y - value.zeroAltitude.puffs[index].y).toBeCloseTo(lift, 9);
    }
  }
  if (value.native.expectedCalls > 0) {
    expect(value.native.deckIndex).toBeGreaterThanOrEqual(0); expect(value.native.hullIndex).toBeGreaterThanOrEqual(0);
    expect(Math.max(...value.native.calls.map((call: any) => call.index))).toBeLessThan(value.native.deckIndex);
    expect(Math.max(...value.native.calls.map((call: any) => call.index))).toBeLessThan(value.native.hullIndex);
    const first = value.native.calls[0], common = callerMatrix(first.actual.matrix, first.expected.matrix);
    const dpr = value.width / value.cssWidth;
    for (const { actual, expected } of value.native.calls) {
      expect(actual.material.type).toBe('createRadialGradient');
      expect(actual.material.stops).toHaveLength(3); expect(actual.material.stops[2][1]).toMatch(/,0\)$/);
      expect(actual.commands.flatMap((command: any[]) => command.slice(1)).filter((x: any) => typeof x === 'number').every(Number.isFinite)).toBe(true);
      const matrix = callerMatrix(actual.matrix, expected.matrix);
      expect(Object.values(matrix).every(Number.isFinite)).toBe(true);
      expect(matrix.a).toBeCloseTo(dpr, 5); expect(matrix.d).toBeCloseTo(value.height / value.cssHeight, 5);
      expect(matrix.b).toBeCloseTo(0, 7); expect(matrix.c).toBeCloseTo(0, 7);
      // Native matrix translations can be float32. This checks a shared camera
      // transform to one thousandth of a CSS pixel, independent of lobe scaling.
      expect(Math.abs(matrix.e - common.e) / dpr).toBeLessThan(0.001);
      expect(Math.abs(matrix.f - common.f) / dpr).toBeLessThan(0.001);
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

async function nativeCondensation(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, field = P.launchPadCondensationGeometry(-5, 634, 475, 0), light = P.launchSunlight(0);
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
      cv.setAttribute('data-condensation-probe', ''); (cv as any).__mm79 = { calls: [] };
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.lineCap = 'round'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 480); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, lineCap: ctx.lineCap, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const before = state(); P.drawLaunchPadCondensation(ctx, field, light); const after = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      return { before, after, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        calls: (cv as any).__mm79.calls.map((call: any) => ({ kind: call.kind, alpha: call.alpha, material: call.material })) };
    };
    return { field, full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

async function gallery(page: Page, info: TestInfo) {
  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), releaseTime = P.launchPadReleaseTime(profile);
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1000; cv.setAttribute('data-condensation-gallery', '');
    cv.style.cssText = 'width:1200px;height:1000px;display:block;position:absolute;left:0;top:0;z-index:10000';
    document.body.appendChild(cv); const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#091321'; ctx.fillRect(0, 0, cv.width, cv.height);
    [-5, -1.5, 0, 0.7, 2.5, 4.2].forEach((time, index) => {
      ctx.save(); ctx.translate((index % 3) * 400, Math.floor(index / 3) * 500);
      ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.font = 'bold 19px system-ui';
      ctx.fillText('T ' + (time < 0 ? '− ' : '+ ') + Math.abs(time) + ' seconds', 200, 29);
      ctx.fillStyle = '#acbdcf'; ctx.font = '13px system-ui'; ctx.fillText('Cold-hardware condensation · enlarged view', 200, 51);
      ctx.translate(10, 70); const width = 380, height = 392, sample = P.launchSample(profile, Math.max(0, time));
      const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#4c7b9e'); sky.addColorStop(1, '#a1beca');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height); ctx.fillStyle = '#586b54'; ctx.fillRect(0, height * 0.8, width, height * 0.2);
      P.drawLaunchPadCondensation(ctx, P.launchPadCondensationGeometry(time, width, height, sample.altitude), P.launchSunlight(0));
      P.drawLaunchPad(ctx, P.launchPadGeometry(time, width, height, sample.altitude, releaseTime), P.launchSunlight(0));
      ctx.save(); ctx.translate(width / 2, height * 0.51); ctx.rotate(sample.pitch); ctx.translate(-width / 2, -height * 0.51);
      P.saturnV(ctx, width / 2, height * 0.8 - height * 0.58, height * 0.58, 1, { orbitLight: P.launchSunlight(sample.pitch) });
      ctx.restore(); ctx.restore();
    });
  });
  const path = join(REPORT, 'pad-condensation-native-gallery-' + info.project.name + '.png');
  const png = readPng(await page.locator('[data-condensation-gallery]').screenshot({ path }));
  expect(png.width).toBe(1200); expect(png.height).toBe(1000);
  await info.attach('pad-condensation-native-gallery', { path, contentType: 'image/png' });
  await page.locator('[data-condensation-gallery]').evaluate(el => el.remove());
}

test('Pad condensation follows cold-hardware sources and residual lifetimes through launch and deterministic review', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const native = await nativeCondensation(page);
  for (const value of [native.full, native.repeat, native.faded, native.transparent, native.clipped]) expect(value.after).toEqual(value.before);
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.transparent.painted).toBe(0); expect(native.clipped.rightOfClip).toBe(0);
  expect(native.faded.calls).toHaveLength(native.full.calls.length);
  for (const [i, call] of native.faded.calls.entries()) expect(call.alpha).toBeCloseTo(native.full.calls[i].alpha * 0.37, 6);
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  for (const [name, time] of [['countdown', -5], ['tapering', -1.5], ['residual', 0.7], ['cleared', 4.2]] as const) {
    await seek(page, time); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'pad-condensation-desktop-' + name);
  }
  expect(scenes.countdown.field.puffs.some((puff: any) => puff.born < -5)).toBe(true);
  expect(scenes.residual.field.puffs.length).toBeGreaterThan(0); expect(scenes.residual.native.expectedCalls).toBeGreaterThan(0);
  expect(scenes.residual.sample.altitude).toBeGreaterThan(0);
  expect(scenes.cleared.field.puffs).toEqual([]); expect(scenes.cleared.native.expectedCalls).toBe(0);
  await accessibility(page, info, 'pad-condensation-desktop-axe'); await gallery(page, info);
  await seek(page, 0.7); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
    expect(value.field.puffs.map((puff: any) => ({ id: puff.id, born: puff.born, age: puff.age, opacity: puff.opacity })))
      .toEqual(beforeResize.field.puffs.map((puff: any) => ({ id: puff.id, born: puff.born, age: puff.age, opacity: puff.opacity })));
  }
  scenes.phoneResidual = await scene(page); await capture(page, info, 'pad-condensation-phone-residual');
  await seek(page, -5); scenes.phoneCountdown = await scene(page); checkScene(scenes.phoneCountdown);
  await capture(page, info, 'pad-condensation-phone-countdown'); await accessibility(page, info, 'pad-condensation-phone-axe');
  await seek(page, -1.5); const paused = await scene(page);
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
  await seek(page, 4.2); await seek(page, -5); await seek(page, beforeReload.time);
  const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.field).toEqual(beforeReload.field); expect(revisited.checksum).toBe(beforeReload.checksum);
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, 0.7); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'pad-condensation-evidence.json');
  await writeFile(path, JSON.stringify({ native, scenes, resizeProbes,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('pad-condensation-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
