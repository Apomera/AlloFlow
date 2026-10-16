import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass66-2026-10-13/browser/launch-sun');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    const begin = proto.beginPath, arc = proto.arc, fill = proto.fill, rect = proto.fillRect, text = proto.fillText;
    proto.beginPath = function (...args: any[]) { this.__mm66Arc = null; return begin.apply(this, args); };
    proto.arc = function (x: number, y: number, radius: number, ...args: any[]) {
      this.__mm66Arc = { x, y, radius }; return arc.call(this, x, y, radius, ...args);
    };
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if (this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) {
        this.canvas.__mm66 = { discs: [], gradients: [], rectangles: [], texts: [] };
      }
      if (this.canvas.__mm66) this.canvas.__mm66.rectangles.push({ x, y, width: args[0], height: args[1] });
      return rect.call(this, x, y, ...args);
    };
    proto.fillText = function (value: string, x: number, y: number, ...args: any[]) {
      if (this.canvas.__mm66) {
        const m = this.measureText(String(value));
        this.canvas.__mm66.texts.push({ text: String(value), x, y,
          left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
          top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
      }
      return text.call(this, value, x, y, ...args);
    };
    proto.fill = function (...args: any[]) {
      if (this.canvas.__mm66 && this.__mm66Arc && this.fillStyle === '#fff9e8') {
        this.canvas.__mm66.discs.push({ ...this.__mm66Arc, alpha: this.globalAlpha });
      }
      return fill.apply(this, args);
    };
    ['createLinearGradient', 'createRadialGradient', 'createConicGradient'].forEach(name => {
      const original = proto[name]; if (!original) return;
      proto[name] = function (...args: any[]) {
        const result = original.apply(this, args);
        if (this.canvas.__mm66) {
          const m = this.getTransform(), row = { kind: name, args, rotation: Math.atan2(m.b, m.a), stops: [] };
          this.canvas.__mm66.gradients.push(row); result.__mm66 = row;
        }
        return result;
      };
    });
    const add = CanvasGradient.prototype.addColorStop;
    CanvasGradient.prototype.addColorStop = function (offset: number, color: string) {
      const row = (this as any).__mm66; if (row) row.stops.push({ offset, color });
      return add.call(this, offset, color);
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
async function sceneSun(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const P = (window as any).MoonMissionPure, W = cv.width / 2, H = cv.height / 2;
    const altitude = Number(cv.dataset.launchAltitude), haze = P.skyAt(altitude / 1000).haze;
    // Independent angular projection; do not use the renderer's geometry helper.
    const sunAngle = Math.asin(695700000 / 149597870700);
    const expected = { x: W * 0.5 + H * 0.2, y: H * 0.13, discRadius: H / (2 * Math.tan(Math.PI / 6)) * Math.tan(sunAngle) };
    const rows = (cv as any).__mm66 || { discs: [], gradients: [], rectangles: [], texts: [] };
    const solarGradients = rows.gradients.filter((row: any) => row.kind === 'createRadialGradient' &&
      Math.abs(row.args[0] - expected.x) < 1e-8 && Math.abs(row.args[1] - expected.y) < 1e-8);
    // A 17-stop linear gradient is a Saturn cylindrical material. Verify its
    // actual color stops against the fixed screen-space Sun and native rotation.
    const cylinders = rows.gradients.filter((row: any) => row.kind === 'createLinearGradient' && row.stops.length === 17);
    const palette = ['#e5e7eb', '#1f2937', '#cbd5e1', '#ffffff', '#111827'];
    const matches = cylinders.map((row: any) => {
      const localX = (0.2 * Math.cos(row.rotation) - 0.37 * Math.sin(row.rotation)) / Math.hypot(0.2, 0.37);
      return palette.some(color => row.stops.every((stop: any, i: number) => {
        const u = i / 8 - 1, level = 0.24 + 0.76 * Math.max(0, Math.min(1, u * localX));
        const rgb = [1, 3, 5].map(index => Math.round(parseInt(color.slice(index, index + 2), 16) * level));
        return Math.abs(stop.offset - i / 16) < 1e-12 && stop.color.replace(/\s+/g, '') === 'rgb(' + rgb.join(',') + ')';
      }));
    });
    const conics = rows.gradients.filter((row: any) => row.kind === 'createConicGradient' && row.stops.length === 19);
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
    const sunIndex = (Math.floor(expected.y * 2) * cv.width + Math.floor(expected.x * 2)) * 4;
    const compact = W <= 480, inFlight = Number(cv.dataset.launchTime) >= 0;
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-8;
    const compactBoxes = rows.rectangles.filter((row: any) => near(row.x, 8) && near(row.y, H - 76) && near(row.width, W - 16) && near(row.height, 68));
    const oldBoxes = rows.rectangles.filter((row: any) => near(row.width, 150) && near(row.height, 108) &&
      (near(row.x, 8) && near(row.y, 8) || near(row.x, W - 158) && (near(row.y, 8) || near(row.y, 124))));
    const labels = ['ALTITUDE', 'VELOCITY', 'STAGE', 'PITCH', 'G-FORCE', 'AIR PUSH'];
    const cells = labels.map(label => {
      const matching = rows.texts.filter((row: any) => row.text === label && row.y >= H - 76 && row.y <= H - 8);
      const item = matching[0];
      const values = item ? rows.texts.filter((row: any) => near(row.x, item.x) && near(row.y, item.y + 15) && row.text.length > 0) : [];
      return { label, labels: matching, values };
    });
    return { W, H, altitude, haze, expected, discs: rows.discs,
      solarRadii: solarGradients.map((row: any) => row.args[5]),
      cylinders: cylinders.length, materialMatches: matches.filter(Boolean).length, conics: conics.length,
      materialRotations: Array.from(new Set(cylinders.map((row: any) => Number(row.rotation.toFixed(9))))),
      opaque, pixels: cv.width * cv.height, sunPixel: Array.from(pixels.slice(sunIndex, sunIndex + 4)),
      hud: { compact, inFlight, compactBoxes, oldBoxes, cells } };
  });
}
function checkScene(scene: Awaited<ReturnType<typeof sceneSun>>) {
  expect(scene.discs).toHaveLength(1);
  expect(scene.discs[0].x).toBeCloseTo(scene.expected.x, 10);
  expect(scene.discs[0].y).toBeCloseTo(scene.expected.y, 10);
  expect(scene.discs[0].radius).toBeCloseTo(scene.expected.discRadius, 10);
  expect(scene.solarRadii.some((r: number) => Math.abs(r - 4 * scene.expected.discRadius) < 1e-8)).toBe(true);
  expect(scene.solarRadii.some((r: number) => Math.abs(r - scene.expected.discRadius - scene.H * 0.22 * scene.haze) < 1e-8)).toBe(true);
  expect(scene.cylinders).toBeGreaterThan(0); expect(scene.materialMatches).toBe(scene.cylinders);
  expect(scene.conics).toBeGreaterThan(0); expect(scene.opaque).toBe(scene.pixels);
  if (scene.hud.inFlight) {
    if (scene.hud.compact) {
      expect(scene.hud.compactBoxes).toHaveLength(1); expect(scene.hud.oldBoxes).toHaveLength(0);
      const box = scene.hud.compactBoxes[0];
      expect(box.y, 'compact telemetry stays below the spacecraft region').toBeGreaterThan(scene.H * 0.7);
      scene.hud.cells.forEach((cell: any) => {
        expect(cell.labels, cell.label + ' occurs once in the telemetry strip').toHaveLength(1);
        expect(cell.values, cell.label + ' has one paired value').toHaveLength(1);
        [...cell.labels, ...cell.values].forEach((text: any) => {
          expect(text.left).toBeGreaterThanOrEqual(box.x); expect(text.right).toBeLessThanOrEqual(box.x + box.width);
          expect(text.top).toBeGreaterThanOrEqual(box.y); expect(text.bottom).toBeLessThanOrEqual(box.y + box.height);
        });
      });
      // The scene's vignette can dim by at most 30%; a HUD laid over the
      // physical disc would darken it substantially beyond this allowance.
      expect(scene.sunPixel[0], 'compact HUD leaves the solar disc unobstructed').toBeGreaterThanOrEqual(177);
    } else {
      expect(scene.hud.compactBoxes).toHaveLength(0); expect(scene.hud.oldBoxes).toHaveLength(2);
    }
  }
}
async function capture(page: Page, info: TestInfo, name: string, board = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (board) {
    const url = await page.locator('#launch-sun-board').evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
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
    const pixels = { name, width: png.width, height: png.height, samples, bright, minimum, maximum };
    await writeFile(path.replace(/\.png$/, '-pixels.json'), JSON.stringify(pixels, null, 2));
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

test('Launch sunlight keeps its angular disc, loses the atmospheric aureole and lights turning stages consistently', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page); await mount(page);
  const native = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, W = 640, H = 400;
    const r = H / (2 * Math.tan(Math.PI / 6)) * Math.tan(Math.asin(695700000 / 149597870700));
    const x = W * 0.5 + H * 0.2, y = H * 0.13;
    const cases = [0, 0.25, 1].map(haze => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      P.drawLaunchSun(ctx, W, H, haze); const pixels = ctx.getImageData(0, 0, W, H).data;
      let outerFlux = 0, maxExtent = 0, opaqueDisc = 0;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y), alpha = pixels[(py * W + px) * 4 + 3];
        if (d > 4 * r + 2) outerFlux += alpha;
        if (alpha > 0) maxExtent = Math.max(maxExtent, d);
        if (d < r - 0.75 && alpha === 255) opaqueDisc++;
      }
      const center = (Math.floor(y) * W + Math.floor(x)) * 4;
      return { haze, geometry: P.launchSunGeometry(W, H, haze), outerFlux, maxExtent, opaqueDisc,
        center: Array.from(pixels.slice(center, center + 4)) };
    });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    ctx.globalAlpha = 0.37; ctx.fillStyle = '#123456'; ctx.strokeStyle = '#abcdef'; ctx.lineWidth = 7;
    ctx.translate(3, 4); ctx.rotate(0.2);
    const state = () => ({ alpha: ctx.globalAlpha, fill: ctx.fillStyle, stroke: ctx.strokeStyle, lineWidth: ctx.lineWidth,
      matrix: Array.from(ctx.getTransform().toFloat64Array()) });
    const before = state(); P.drawLaunchSun(ctx, W, H, 0.5); const after = state();
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI];
    const lights = angles.map(angle => ({ angle, light: P.launchSunlight(angle) }));
    return { W, H, expectedRadius: r, cases, before, after, lights };
  });
  expect(native.after).toEqual(native.before);
  expect(native.cases[0].outerFlux).toBe(0);
  expect(native.cases[0].maxExtent).toBeLessThanOrEqual(native.expectedRadius * 4 + 1);
  expect(native.cases[1].outerFlux).toBeGreaterThan(0);
  expect(native.cases[2].outerFlux).toBeGreaterThan(native.cases[1].outerFlux);
  native.cases.forEach(row => {
    expect(row.geometry.discRadius).toBeCloseTo(native.expectedRadius, 12);
    expect(row.geometry.opticalRadius).toBeCloseTo(native.expectedRadius * 4, 12);
    expect(row.geometry.haloOpacity).toBeCloseTo(0.36 * row.haze * row.haze, 12);
    expect(row.center).toEqual([255, 249, 232, 255]); expect(row.opaqueDisc).toBeGreaterThan(0);
  });
  native.lights.forEach(({ angle, light }) => {
    // Rotating the local light into the scene must recover one fixed direction.
    expect(light.x * Math.cos(angle) - light.y * Math.sin(angle)).toBeCloseTo(0.2 / Math.hypot(0.2, 0.37), 12);
    expect(light.x * Math.sin(angle) + light.y * Math.cos(angle)).toBeCloseTo(-0.37 / Math.hypot(0.2, 0.37), 12);
    expect(light.fraction).toBe(1);
  });

  const pad = await sceneSun(page); checkScene(pad);
  await capture(page, info, 'launch-sun-desktop-pad');
  await seekAltitude(page, 35000); const desktop35 = await sceneSun(page); checkScene(desktop35);
  await capture(page, info, 'launch-sun-desktop-35km');
  const time80 = await seekAltitude(page, 80000), desktop80 = await sceneSun(page); checkScene(desktop80);
  expect(desktop80.haze).toBeLessThan(desktop35.haze); expect(desktop35.haze).toBeLessThan(pad.haze);
  await capture(page, info, 'launch-sun-desktop-80km');
  const separationTime = await page.evaluate(() => (window as any).MoonMissionPure.launchProfile().events.stage1.time + 5);
  await seek(page, separationTime); const desktopSeparation = await sceneSun(page); checkScene(desktopSeparation);
  expect(desktopSeparation.materialRotations.length, 'both attached and tumbling stage receive world-fixed light').toBeGreaterThan(1);
  await capture(page, info, 'launch-sun-desktop-separation'); await accessibility(page, info, 'launch-sun-desktop-axe');

  const beforeResize = await launch(page), beforeSaved = await saved(page);
  const resizeProbes: any[] = [];
  for (const width of [390, 490]) {
    const previousWidth = await page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width);
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width)).not.toBe(previousWidth);
    const scene = await sceneSun(page); checkScene(scene);
    expect(scene.W, 'phone and small-tablet canvas use compact telemetry').toBeLessThanOrEqual(480);
    expect(await launch(page)).toEqual(beforeResize); expect(await saved(page)).toEqual(beforeSaved);
    resizeProbes.push({ viewportWidth: width, scene });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phoneSeparation = await sceneSun(page); checkScene(phoneSeparation);
  expect(await launch(page)).toEqual(beforeResize); expect(await saved(page)).toEqual(beforeSaved);
  await capture(page, info, 'launch-sun-phone-separation');
  await seek(page, time80); const phone80 = await sceneSun(page); checkScene(phone80);
  expect(phone80.expected.discRadius).toBeCloseTo(desktop80.expected.discRadius, 12);
  expect((phone80.expected.x - phone80.W * 0.5) / phone80.H).toBeCloseTo(0.2, 12);
  await capture(page, info, 'launch-sun-phone-80km'); await accessibility(page, info, 'launch-sun-phone-axe');
  const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const paused = await launch(page); await page.waitForTimeout(180); expect(await launch(page)).toEqual(paused);
  await expect(page.locator('[data-launch-pause]')).toHaveText('Play launch');
  await page.locator('[data-launch-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(time80);
  const beforeReload = await launch(page), reloadSave = await saved(page);
  await mount(page, reloadSave); const reloaded = await sceneSun(page); checkScene(reloaded);
  expect(await launch(page)).toEqual(beforeReload); expect(await saved(page)).toEqual(reloadSave);
  expect((await saved(page)).missionXP).toBe(0); expect((await saved(page)).missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();

  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cv = document.createElement('canvas');
    cv.id = 'launch-sun-board'; cv.width = 1100; cv.height = 760; document.body.appendChild(cv);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#0b1322'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 25px system-ui'; ctx.fillText('A fixed Sun through thinning air', 28, 43);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#cbd5e1';
    ctx.fillText('One angular disc. A compact optical glow remains as the broad atmospheric aureole fades.', 28, 72);
    [0, 0.25, 1].forEach((haze, i) => {
      const x = 28 + i * 358;
      ctx.save(); ctx.translate(x, 100); ctx.fillStyle = '#02040e'; ctx.fillRect(0, 0, 328, 240);
      P.drawLaunchSun(ctx, 328, 240, haze); ctx.restore();
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 16px system-ui'; ctx.fillText('Haze ' + Math.round(haze * 100) + '%', x + 12, 323);
    });
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 20px system-ui'; ctx.fillText('The hull keeps the same Sun as the vehicle turns', 28, 391);
    [0, Math.PI / 4, Math.PI / 2].forEach((angle, i) => {
      const x = 28 + i * 358; ctx.save(); ctx.translate(x + 164, 535); ctx.rotate(angle);
      P.saturnV(ctx, 0, -100, 200, 1, { orbitLight: P.launchSunlight(angle) }); ctx.restore();
      ctx.fillStyle = '#cbd5e1'; ctx.font = '16px system-ui'; ctx.fillText(Math.round(angle * 180 / Math.PI) + '° from up', x + 112, 685);
    });
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px system-ui';
    ctx.fillText('60° vertical field. Disc size follows the Sun at 1 au; scattering, optical glow and material exposure are illustrative.', 28, 733);
  });
  await capture(page, info, 'launch-sun-comparison', true);
  const evidence = { native, scenes: { pad, desktop35, desktop80, desktopSeparation, phoneSeparation, phone80, reloaded },
    resizeProbes, overflow, errors, screenshotCount: 7, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResizeAndReload: true };
  const path = join(REPORT, 'launch-sun-evidence.json'); await writeFile(path, JSON.stringify(evidence, null, 2));
  await info.attach('launch-sun-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
