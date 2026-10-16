import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass78-2026-10-15/browser/launch-vapour');
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
    const watched = (ctx: any) => ctx.canvas.hasAttribute('data-launch-canvas') || ctx.canvas.hasAttribute('data-vapour-probe');
    proto.clearRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === 0 && y === 0) this.canvas.__mm78 = { calls: [] };
      return clear.call(this, x, y, ...args);
    };
    proto.beginPath = function (...args: any[]) { this.__mm78Path = []; return begin.apply(this, args); };
    for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'rect', 'arc', 'ellipse']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.__mm78Path && watched(this)) this.__mm78Path.push([name, ...args]);
        return original.apply(this, args);
      };
    }
    for (const name of ['createLinearGradient', 'createRadialGradient']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        const result = original.apply(this, args); result.__mm78Gradient = { type: name, args, stops: [] }; return result;
      };
    }
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      if ((this as any).__mm78Gradient) (this as any).__mm78Gradient.stops.push([offset, color]); return add.call(this, offset, color);
    };
    for (const name of ['fill', 'stroke', 'fillRect', 'strokeRect']) {
      const original = proto[name];
      proto[name] = function (...args: any[]) {
        if (this.canvas.__mm78 && watched(this)) {
          const m = this.getTransform(), material = name.startsWith('fill') ? this.fillStyle : this.strokeStyle;
          this.canvas.__mm78.calls.push({ kind: name,
            commands: name.endsWith('Rect') ? [[name, ...args]] : (this.__mm78Path || []).slice(), alpha: this.globalAlpha,
            material: typeof material === 'string' ? material : material?.__mm78Gradient || 'gradient', lineWidth: this.lineWidth,
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
    const camera = (cv as any)._mmLaunchCamera || null, field = (cv as any)._mmLaunchVapour || null;
    const expected = camera ? P.launchVapourGeometry(sample, camera.x, camera.topY, camera.fullHeight, time) : null;
    const allCalls = (cv as any).__mm78?.calls || [], layers: any[] = [];
    const signature = (call: any) => JSON.stringify([call.kind, call.commands, call.material,
      call.kind.startsWith('stroke') ? call.lineWidth : 0, call.alpha]);
    let hullIndices: number[] = [];
    if (field) {
      for (const layer of ['back', 'front']) {
        const probe = document.createElement('canvas'); probe.setAttribute('data-vapour-probe', ''); (probe as any).__mm78 = { calls: [] };
        P.drawLaunchVapour(probe.getContext('2d'), expected, layer, P.launchSunlight(sample.pitch));
        const calls = (probe as any).__mm78.calls, matched: any[] = [];
        let from = 0;
        for (const call of calls) {
          const key = signature(call), index = allCalls.findIndex((row: any, i: number) => i >= from && signature(row) === key);
          if (index >= 0) { matched.push({ index, ...allCalls[index] }); from = index + 1; }
        }
        layers.push({ layer, expectedCalls: calls.length, matchedCalls: matched.length, calls: matched });
      }
      const cvProbe = document.createElement('canvas'), ctxProbe = cvProbe.getContext('2d');
      const stack = P.saturnV(ctxProbe, camera.x, camera.topY, camera.fullHeight, sample.stage,
        { les: time < profile.events.les.time, orbitLight: P.launchSunlight(sample.pitch) });
      hullIndices = stack.sections.filter((row: any) => ['s1is', 'sla'].includes(row.id)).map((row: any) => {
        const commands = [['moveTo', camera.x - row.w0 / 2, row.y0], ['lineTo', camera.x + row.w0 / 2, row.y0],
          ['lineTo', camera.x + row.w1 / 2, row.y1], ['lineTo', camera.x - row.w1 / 2, row.y1], ['closePath']];
        return allCalls.findIndex((call: any) => call.kind === 'fill' && JSON.stringify(call.commands) === JSON.stringify(commands));
      });
    }
    const rgba = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, checksum = 2166136261;
    for (let i = 0; i < rgba.length; i++) { checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0; if (i % 4 === 3 && rgba[i] === 255) opaque++; }
    return { data, time, camera, field, expected, layers, hullIndices,
      sample: { stage: sample.stage, altitude: sample.altitude, speed: sample.speed, mach: sample.mach,
        pitch: sample.pitch, dynamicPressure: sample.dynamicPressure, density: sample.density },
      width: cv.width, height: cv.height, cssWidth: cv.offsetWidth, cssHeight: cv.offsetHeight, checksum, opaque, pixels: cv.width * cv.height,
      overflow: { width: innerWidth, scroll: document.documentElement.scrollWidth } };
  });
}
function checkScene(value: Awaited<ReturnType<typeof scene>>) {
  expect(value.opaque / value.pixels).toBeGreaterThan(0.98);
  expect(value.overflow.scroll).toBeLessThanOrEqual(value.overflow.width + 1);
  expect(value.field).toEqual(value.expected);
  if (value.field) {
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t);
    };
    const envelope = smooth(0.82, 1.05, value.sample.mach) * (1 - smooth(1.08, 1.5, value.sample.mach));
    const strength = envelope * value.sample.dynamicPressure / (value.sample.dynamicPressure + 6000) *
      value.sample.density / (value.sample.density + 0.08);
    expect(value.field.machEnvelope).toBeCloseTo(envelope, 12); expect(value.field.strength).toBeCloseTo(strength, 12);
    expect(value.field.active).toBe(strength > 0);
    if (value.field.active) expect(value.field.bands.map((row: any) => row.id)).toEqual(['sla', 's1is']);
  }
  for (const layer of value.layers) {
    expect(layer.matchedCalls, layer.layer + ': all layer paths reached native Canvas').toBe(layer.expectedCalls);
    expect(layer.expectedCalls).toBe((value.field?.bands.length || 0) * (layer.layer === 'back' ? 1 : 7));
    for (const call of layer.calls) {
      expect(call.commands.flatMap((command: any[]) => command.slice(1)).filter((x: any) => typeof x === 'number').every(Number.isFinite)).toBe(true);
      expect(Object.values(call.matrix).every(Number.isFinite)).toBe(true);
      expect(Math.atan2(call.matrix.b, call.matrix.a)).toBeCloseTo(value.sample.pitch, 7);
      expect(call.material.type).toBe('createLinearGradient'); expect(call.material.stops).toHaveLength(6);
      expect(call.material.stops[0][1]).toMatch(/,0\)$/); expect(call.material.stops[5][1]).toMatch(/,0\)$/);
    }
  }
  const back = value.layers.find((row: any) => row.layer === 'back'), front = value.layers.find((row: any) => row.layer === 'front');
  if (back?.expectedCalls || front?.expectedCalls) {
    expect(back.expectedCalls).toBeGreaterThan(0); expect(front.expectedCalls).toBeGreaterThan(0);
    expect(value.hullIndices).toHaveLength(2); expect(Math.min(...value.hullIndices)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...back.calls.map((call: any) => call.index))).toBeLessThan(Math.min(...value.hullIndices));
    expect(Math.min(...front.calls.map((call: any) => call.index))).toBeGreaterThan(Math.max(...value.hullIndices));
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

async function nativeVapour(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    const sample = profile.samples.reduce((a: any, b: any) => Math.abs(b.mach - 1.07) < Math.abs(a.mach - 1.07) ? b : a);
    const field = P.launchVapourGeometry(sample, 320, 40, 360, sample.time), light = P.launchSunlight(0);
    const draw = (alpha: number, clip = false) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
      cv.setAttribute('data-vapour-probe', ''); (cv as any).__mm78 = { calls: [] };
      const ctx = cv.getContext('2d')!, gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#123456'); gradient.addColorStop(1, '#abcdef');
      ctx.fillStyle = gradient; ctx.strokeStyle = '#fedcba'; ctx.lineWidth = 7; ctx.lineJoin = 'bevel'; ctx.lineCap = 'round'; ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([2, 3]); ctx.translate(3, 4);
      if (clip) { ctx.beginPath(); ctx.rect(0, 0, 317, 480); ctx.clip(); }
      const state = () => ({ alpha: ctx.globalAlpha, fillIsGradient: ctx.fillStyle === gradient, stroke: ctx.strokeStyle,
        lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, lineCap: ctx.lineCap, dash: ctx.getLineDash(), composite: ctx.globalCompositeOperation,
        matrix: Array.from(ctx.getTransform().toFloat64Array()) });
      const before = state(); P.drawLaunchVapour(ctx, field, 'back', light); const afterBack = state();
      P.drawLaunchVapour(ctx, field, 'front', light); const afterFront = state();
      const rgba = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let painted = 0, checksum = 2166136261, maxAlpha = 0, rightOfClip = 0, alphaSum = 0;
      for (let i = 0; i < rgba.length; i++) {
        checksum = Math.imul(checksum ^ rgba[i], 16777619) >>> 0;
        if (i % 4 === 3) {
          const a = rgba[i]; maxAlpha = Math.max(maxAlpha, a); alphaSum += a;
          if (a > 0) { painted++; if (Math.floor(i / 4) % cv.width >= 320) rightOfClip++; }
        }
      }
      return { before, afterBack, afterFront, painted, checksum, maxAlpha, alphaSum, rightOfClip,
        calls: (cv as any).__mm78.calls.map((call: any) => ({ kind: call.kind, alpha: call.alpha, material: call.material })) };
    };
    return { field, sample: { mach: sample.mach, altitude: sample.altitude, density: sample.density, dynamicPressure: sample.dynamicPressure },
      full: draw(1), repeat: draw(1), faded: draw(0.37), transparent: draw(0), clipped: draw(1, true) };
  });
}

async function gallery(page: Page, info: TestInfo, times: Record<string, number>) {
  await page.evaluate(times => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 1000; cv.setAttribute('data-vapour-gallery', '');
    cv.style.cssText = 'width:1200px;height:1000px;display:block;position:absolute;left:0;top:0;z-index:10000';
    document.body.appendChild(cv); const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#091321'; ctx.fillRect(0, 0, cv.width, cv.height);
    const cases = [
      { key: 'before', label: 'Before condensation' }, { key: 'onset', label: 'Condensation developing' },
      { key: 'peak', label: 'Transonic envelope' }, { key: 'fading', label: 'Envelope fading' },
      { key: 'cleared', label: 'Clear of the transonic region' }, { key: 'peak', label: 'Same envelope · opposite sunlight', opposite: true },
    ];
    cases.forEach((value, index) => {
      ctx.save(); ctx.translate((index % 3) * 400, Math.floor(index / 3) * 500);
      ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center'; ctx.font = 'bold 17px system-ui'; ctx.fillText(value.label, 200, 29);
      const seconds = times[value.key], sample = P.launchSample(profile, seconds);
      ctx.fillStyle = '#acbdcf'; ctx.font = '13px system-ui';
      ctx.fillText('Mach ' + sample.mach.toFixed(2) + '  ·  ' + (sample.altitude / 1000).toFixed(1) + ' km', 200, 51);
      const sky = ctx.createLinearGradient(0, 70, 0, 462); sky.addColorStop(0, '#245a87'); sky.addColorStop(1, '#88b4c9');
      ctx.fillStyle = sky; ctx.fillRect(10, 70, 380, 392);
      const cx = 200, top = 88, fullHeight = 350, pivotY = 263, angle = sample.pitch;
      const field = P.launchVapourGeometry(sample, cx, top, fullHeight, seconds);
      const light = P.launchSunlight(angle); if (value.opposite) light.x = -light.x;
      ctx.save(); ctx.translate(cx, pivotY); ctx.rotate(angle); ctx.translate(-cx, -pivotY);
      P.drawLaunchVapour(ctx, field, 'back', light);
      P.saturnV(ctx, cx, top, fullHeight, sample.stage, { les: true, orbitLight: light });
      P.drawLaunchVapour(ctx, field, 'front', light);
      ctx.restore();
      ctx.fillStyle = '#aebdce'; ctx.font = '12px system-ui'; ctx.fillText('Native hull and vapour renderer · enlarged view', 200, 482);
      ctx.restore();
    });
  }, times);
  const path = join(REPORT, 'launch-vapour-native-gallery-' + info.project.name + '.png');
  const png = readPng(await page.locator('[data-vapour-gallery]').screenshot({ path }));
  expect(png.width).toBe(1200); expect(png.height).toBe(1000);
  await info.attach('launch-vapour-native-gallery', { path, contentType: 'image/png' });
  await page.locator('[data-vapour-gallery]').evaluate(el => el.remove());
}

test('Launch vapour follows measured transonic conditions, wraps the rotating hull and preserves flight review', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await instrument(page); await mount(page);
  const modelDetails = page.locator('[data-launch-workspace] details').filter({
    has: page.locator('summary', { hasText: 'How this launch model works' }),
  });
  await modelDetails.locator('summary').click();
  await expect(modelDetails).toContainText('Humidity, dew point and local flow are not calculated; these shrouds do not predict condensation or shock strength.');
  await modelDetails.locator('summary').click();
  const native = await nativeVapour(page);
  for (const value of [native.full, native.repeat, native.faded, native.transparent, native.clipped]) {
    expect(value.afterBack).toEqual(value.before); expect(value.afterFront).toEqual(value.before);
  }
  expect(native.full.painted).toBeGreaterThan(100); expect(native.full.checksum).toBe(native.repeat.checksum);
  expect(native.faded.painted).toBeGreaterThan(0); expect(native.faded.alphaSum).toBeLessThan(native.full.alphaSum);
  expect(native.transparent.painted).toBe(0); expect(native.clipped.rightOfClip).toBe(0);
  expect(native.faded.calls).toHaveLength(native.full.calls.length);
  for (const [i, call] of native.faded.calls.entries()) expect(call.alpha).toBeCloseTo(native.full.calls[i].alpha * 0.37, 6);
  const times = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile(), rows = profile.samples;
    const atMach = (mach: number) => {
      const index = rows.findIndex((row: any) => row.mach >= mach);
      let lo = rows[Math.max(0, index - 1)].time, hi = rows[index].time;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (P.launchSample(profile, mid).mach < mach) lo = mid; else hi = mid; }
      return Math.round(hi * 10) / 10;
    };
    return { before: atMach(0.75), onset: atMach(0.95), peak: atMach(1.07), fading: atMach(1.4), cleared: atMach(1.65) };
  });
  const scenes: Record<string, Awaited<ReturnType<typeof scene>>> = {};
  await seek(page, times.before); scenes.before = await scene(page); checkScene(scenes.before);
  for (const name of ['onset', 'peak', 'fading', 'cleared'] as const) {
    await seek(page, times[name]); scenes[name] = await scene(page); checkScene(scenes[name]);
    await capture(page, info, 'launch-vapour-desktop-' + name);
  }
  expect(scenes.before.layers.every((row: any) => row.expectedCalls === 0)).toBe(true);
  expect(scenes.cleared.layers.every((row: any) => row.expectedCalls === 0)).toBe(true);
  expect(scenes.peak.layers.every((row: any) => row.expectedCalls > 0)).toBe(true);
  expect(scenes.peak.sample.pitch).toBeGreaterThan(0);
  await accessibility(page, info, 'launch-vapour-desktop-axe'); await gallery(page, info, times);
  await seek(page, times.peak); const beforeResize = await scene(page), beforeSave = await saved(page), resizeProbes: any[] = [];
  for (const width of [490, 390, 320]) {
    const priorWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(priorWidth);
    const value = await scene(page); checkScene(value); expect(physical(value.data)).toEqual(physical(beforeResize.data));
    expect(await saved(page)).toEqual(beforeSave); resizeProbes.push(value);
  }
  scenes.phonePeak = await scene(page); await capture(page, info, 'launch-vapour-phone-peak');
  await seek(page, times.cleared); scenes.phoneCleared = await scene(page); checkScene(scenes.phoneCleared);
  await capture(page, info, 'launch-vapour-phone-cleared'); await accessibility(page, info, 'launch-vapour-phone-axe');
  await seek(page, times.peak); const paused = await scene(page);
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
  await seek(page, times.cleared); await seek(page, times.before); await seek(page, beforeReload.time);
  const revisited = await scene(page); checkScene(revisited);
  expect(revisited.data).toEqual(beforeReload.data); expect(revisited.field).toEqual(beforeReload.field); expect(revisited.checksum).toBe(beforeReload.checksum);
  await seek(page, -5); const countdown = await scene(page); checkScene(countdown); expect(countdown.field).toBeNull();
  await page.locator('[data-launch-result]').click(); await expect.poll(async () => (await saved(page)).launchRun.recorded).toBe(true);
  const completedSave = await saved(page); expect(completedSave.launchResult.outcome).toBe('orbit'); expect(completedSave.missionXP).toBe(0);
  await seek(page, times.peak); const reviewedSave = await saved(page); checkScene(await scene(page));
  expect(reviewedSave.launchResult).toEqual(completedSave.launchResult); expect(reviewedSave.missionXP).toBe(0); expect(reviewedSave.missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const path = join(REPORT, 'launch-vapour-evidence.json');
  await writeFile(path, JSON.stringify({ native, times, scenes, resizeProbes, countdown,
    paused: { checksum: paused.checksum, slow: slow.checksum, fast: fast.checksum }, reloaded, revisited, errors,
    screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true,
    recordedResultAndRewardsPreservedDuringEarlierReview: true }, null, 2));
  await info.attach('launch-vapour-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
