import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass65-2026-10-13/browser/starfield-exposure');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  // Observe the native fill call after the renderer has set its actual alpha.
  // The launch sky's full background starts a new bounded frame record.
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    const begin = proto.beginPath, arc = proto.arc, fill = proto.fill, rect = proto.fillRect;
    proto.beginPath = function (...args: any[]) { this.__mm65Arc = null; return begin.apply(this, args); };
    proto.arc = function (x: number, y: number, radius: number, ...args: any[]) {
      this.__mm65Arc = { x, y, radius }; return arc.call(this, x, y, radius, ...args);
    };
    proto.fillRect = function (x: number, y: number, ...args: any[]) {
      if ((this.canvas.hasAttribute('data-launch-canvas') && x === -20 && y === -20) ||
          (this.canvas.hasAttribute('data-descent-canvas') && x === 0 && y === 0 && this.fillStyle === '#000005')) this.canvas.__mm65Stars = [];
      return rect.call(this, x, y, ...args);
    };
    proto.fill = function (...args: any[]) {
      const a = this.__mm65Arc, rows = this.canvas.__mm65Stars;
      const count = this.canvas.hasAttribute('data-descent-canvas') ? 40 : 120;
      if (rows && a && a.radius >= 0.3 && a.radius < 1.8 && rows.length < count) {
        rows.push({ ...a, alpha: this.globalAlpha, gradient: this.fillStyle instanceof CanvasGradient });
      }
      return fill.apply(this, args);
    };
  });
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: { missionPhase: 1, animPaused: true, launchPaused: true, soundOff: true,
      missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
  });
  await expect(page.locator('[data-launch-canvas]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function launch(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({ ...cv.dataset }));
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function seekAltitude(page: Page, altitude: number) {
  const time = await page.evaluate(altitude => {
    const P = (window as any).MoonMissionPure, profile = P.launchProfile();
    let low = 0, high = profile.summary.duration;
    for (let i = 0; i < 45; i++) {
      const middle = (low + high) / 2;
      if (P.launchSample(profile, middle).altitude < altitude) low = middle; else high = middle;
    }
    return Math.round((low + high) / 2 * 10) / 10;
  }, altitude);
  await page.locator('[data-launch-seek]').evaluate((el: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(time));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs(Number((await launch(page)).launchTime) - time)).toBeLessThan(0.11);
  return time;
}
async function sceneExposure(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const P = (window as any).MoonMissionPure, W = cv.width / 2, H = cv.height / 2;
    const altitude = Number(cv.dataset.launchAltitude), exposure = P.skyAt(altitude / 1000).stars;
    const rows = (cv as any).__mm65Stars || [];
    // Reproduce only the longstanding catalogue seed. This is independent of
    // the new exported point helper and the native draw implementation.
    let s = (7919 * 16807 + 1) % 2147483647;
    const next = () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    const expected = Array.from({ length: 120 }, () => {
      const x = next() * W, y = next() * H, q = next(); next();
      return { x, y, radius: 0.3 + q * 1.5, alpha: exposure * (0.22 + 0.78 * q * q) };
    });
    let coordinateError = 0, alphaError = 0, gradients = 0;
    rows.forEach((row: any, i: number) => {
      coordinateError = Math.max(coordinateError, Math.abs(row.x - expected[i].x), Math.abs(row.y - expected[i].y), Math.abs(row.radius - expected[i].radius));
      alphaError = Math.max(alphaError, Math.abs(row.alpha - expected[i].alpha));
      if (row.gradient) gradients++;
    });
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
    return { W, H, altitude, exposure, stars: rows.length, gradients, coordinateError, alphaError,
      opaque, pixels: cv.width * cv.height, sample: rows.slice(0, 4) };
  });
}
function checkExposure(result: Awaited<ReturnType<typeof sceneExposure>>) {
  expect(result.stars).toBe(120); expect(result.gradients).toBe(120);
  expect(result.coordinateError).toBeLessThan(1e-10); expect(result.alphaError).toBeLessThan(1e-7);
  expect(result.opaque).toBe(result.pixels);
}
async function capture(page: Page, info: TestInfo, name: string, selector = '[data-launch-workspace]') {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector === '#starfield-exposure-board') {
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else {
    const target = page.locator(selector);
    const scene = await target.evaluate(el => el.tagName === 'CANVAS') ? target : target.locator('canvas').first();
    await scene.scrollIntoViewIfNeeded();
    await scene.evaluate(async () => {
      await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    });
    // Keep the scene visible while capturing the whole tall workspace. The
    // locator screenshot's automatic centering can move a phone canvas offscreen.
    const bounds = await target.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    });
    const sceneBounds = await scene.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    });
    const png = readPng(await page.screenshot({ path, fullPage: true, clip: bounds }));
    expect(Math.abs(png.width - bounds.width), 'whole workspace width captured').toBeLessThanOrEqual(1);
    expect(Math.abs(png.height - bounds.height), 'whole workspace height captured').toBeLessThanOrEqual(1);
    // Inspect the saved scene pixels, not the surrounding controls or the
    // earlier backing-store probe. A flat navy capture must fail this workflow.
    let bright = 0, samples = 0, minimum = 255, maximum = 0;
    const left = Math.ceil(sceneBounds.x - bounds.x) + 4;
    const top = Math.ceil(sceneBounds.y - bounds.y) + 4;
    const right = Math.min(png.width, Math.floor(sceneBounds.x - bounds.x + sceneBounds.width) - 4);
    const bottom = Math.min(png.height, Math.floor(sceneBounds.y - bounds.y + sceneBounds.height) - 4);
    for (let y = top; y < bottom; y += 2) for (let x = left; x < right; x += 2) {
      const value = Math.max(...png.at(x, y)); samples++;
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
      if (value > 110) bright++;
    }
    const pixels = { name, width: png.width, height: png.height, samples, bright, minimum, maximum };
    await writeFile(path.replace(/\.png$/, '-pixels.json'), JSON.stringify(pixels, null, 2));
    expect(samples, 'capture includes the scene interior').toBeGreaterThan(10000);
    expect(bright, 'saved scene contains the spacecraft, terrain or instruments').toBeGreaterThan(100);
    expect(maximum - minimum, 'saved scene is not a uniform background').toBeGreaterThan(70);
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

test('Starfield exposure stays steady, respects native alpha and follows the launch sky on desktop and phone', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const native = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, W = 640, H = 400;
    const points = P.starfieldPoints(W, H, 120);
    const draw = (alpha: number, exposure: number, tick: number, flat = false) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!; ctx.globalAlpha = alpha;
      ctx.fillStyle = '#123456'; ctx.strokeStyle = '#abcdef'; ctx.lineWidth = 7;
      if (flat) {
        for (const star of points) {
          ctx.globalAlpha = alpha * exposure * star.brightness; ctx.fillStyle = star.color;
          ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
        }
      } else P.drawStarfield(ctx, W, H, tick, 120, exposure);
      return { pixels: ctx.getImageData(0, 0, W, H).data,
        state: { alpha: ctx.globalAlpha, fill: ctx.fillStyle, stroke: ctx.strokeStyle, lineWidth: ctx.lineWidth } };
    };
    const full = draw(1, 1, 0), later = draw(1, 1, 100000), quarter = draw(1, 0.25, 0), half = draw(1, 0.5, 0);
    const inherited = draw(0.5, 1, 0), hidden = draw(1, 0, 0), invisibleParent = draw(0, 1, 0);
    const restored = draw(0.37, 0.61, 345), flat = draw(1, 1, 0, true);
    let stableMismatches = 0, inheritedMismatches = 0, hiddenSum = 0, fullFlux = 0, flatFlux = 0;
    let quarterFlux = 0, halfFlux = 0, isolated = 0, proportionalError = 0;
    for (let i = 0; i < full.pixels.length; i++) {
      if (full.pixels[i] !== later.pixels[i]) stableMismatches++;
      if (half.pixels[i] !== inherited.pixels[i]) inheritedMismatches++;
      hiddenSum += hidden.pixels[i] + invisibleParent.pixels[i];
      if (i % 4 !== 3) continue;
      const a = full.pixels[i]; fullFlux += a; flatFlux += flat.pixels[i]; quarterFlux += quarter.pixels[i]; halfFlux += half.pixels[i];
      if (a === 0) continue;
      const pixel = (i - 3) / 4, x = pixel % W + 0.5, y = Math.floor(pixel / W) + 0.5;
      // Source-over overlap is nonlinear. Exclude only pixels reached by more
      // than one point (plus a one-pixel raster edge), not whole star patches.
      if (points.filter((p: any) => Math.hypot(x - p.x, y - p.y) < p.radius + 1).length > 1) continue;
      isolated++; proportionalError = Math.max(proportionalError, Math.abs(quarter.pixels[i] - a * 0.25), Math.abs(half.pixels[i] - a * 0.5));
    }
    const bench = document.createElement('canvas'); bench.width = W; bench.height = H;
    const bc = bench.getContext('2d', { willReadFrequently: true })!, command: number[] = [], synchronized: number[] = [];
    for (let i = 0; i < 70; i++) {
      bc.clearRect(0, 0, W, H); const start = performance.now(); P.drawStarfield(bc, W, H, 0, 120, 1);
      const submitted = performance.now(); bc.getImageData(0, 0, 1, 1); const complete = performance.now();
      if (i >= 10) { command.push(submitted - start); synchronized.push(complete - start); }
    }
    const timings = (values: number[]) => { values.sort((a, b) => a - b); return { medianMs: values[30], p95Ms: values[56] }; };
    return { stars: points.length, stableMismatches, inheritedMismatches, hiddenSum, fullFlux, flatFlux, quarterFlux, halfFlux,
      isolated, proportionalError, state: restored.state, gradientFluxRatio: fullFlux / flatFlux,
      timing: { iterations: 60, warmup: 10, width: W, height: H, stars: 120, willReadFrequently: true,
        command: timings(command), drawAndOnePixelReadback: timings(synchronized), thresholdAssertion: false } };
  });
  expect(native.stars).toBe(120); expect(native.stableMismatches).toBe(0); expect(native.inheritedMismatches).toBe(0);
  expect(native.hiddenSum).toBe(0); expect(native.isolated).toBeGreaterThan(300); expect(native.proportionalError).toBeLessThanOrEqual(2);
  expect(native.quarterFlux).toBeLessThan(native.halfFlux); expect(native.halfFlux).toBeLessThan(native.fullFlux);
  expect(native.gradientFluxRatio).toBeGreaterThan(0.2); expect(native.gradientFluxRatio).toBeLessThan(0.8);
  expect(native.state.alpha).toBeCloseTo(0.37, 7);
  expect({ ...native.state, alpha: 0.37 }).toEqual({ alpha: 0.37, fill: '#123456', stroke: '#abcdef', lineWidth: 7 });

  const desktop20Time = await seekAltitude(page, 20000), desktop20 = await sceneExposure(page); checkExposure(desktop20);
  expect(desktop20.exposure).toBeGreaterThan(0.1); expect(desktop20.exposure).toBeLessThan(0.5);
  await expect(page.locator('[data-launch-pause]')).toHaveText('Play launch');
  await capture(page, info, 'launch-starfield-desktop-20km');
  await seekAltitude(page, 35000); const desktop35 = await sceneExposure(page); checkExposure(desktop35);
  expect(desktop35.exposure).toBeGreaterThan(0.8); expect(desktop35.exposure).toBeLessThan(1);
  await capture(page, info, 'launch-starfield-desktop-35km'); await accessibility(page, info, 'launch-starfield-desktop-axe');
  const beforeResize = await launch(page), beforeSaved = await saved(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phone35 = await sceneExposure(page); checkExposure(phone35);
  expect(await launch(page)).toEqual(beforeResize); expect(await saved(page)).toEqual(beforeSaved);
  await capture(page, info, 'launch-starfield-phone-35km');
  await seekAltitude(page, 20000); const phone20 = await sceneExposure(page); checkExposure(phone20);
  expect(phone20.exposure).toBeCloseTo(desktop20.exposure, 12);
  await capture(page, info, 'launch-starfield-phone-20km'); await accessibility(page, info, 'launch-starfield-phone-axe');
  const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const paused = await launch(page); await page.waitForTimeout(180); expect(await launch(page)).toEqual(paused);
  const slider = page.locator('[data-launch-seek]'); await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number((await launch(page)).launchTime)).toBeGreaterThan(desktop20Time);
  expect((await saved(page)).missionXP).toBe(0); expect((await saved(page)).missionPhase).toBe(1);
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  await expect(page.locator('[data-launch-model-note]')).toContainText('Stars stay steady and fade with the teaching sky exposure');

  await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, cv = document.createElement('canvas');
    cv.id = 'starfield-exposure-board'; cv.width = 1100; cv.height = 680;
    document.body.appendChild(cv); const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#0b1322'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 25px system-ui'; ctx.fillText('Steady stars · scene exposure', 28, 43);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Same seeded points and optical size in each panel. Native 1:1 canvas pixels; no enlarged stars.', 28, 72);
    [0, 0.25, 0.5, 1].forEach((exposure, i) => {
      const x = 28 + i % 2 * 550, y = 105 + Math.floor(i / 2) * 275;
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 16px system-ui'; ctx.fillText('Exposure ' + Math.round(exposure * 100) + '%', x, y);
      ctx.save(); ctx.translate(x, y + 15); ctx.fillStyle = '#02040e'; ctx.fillRect(0, 0, 494, 218);
      P.drawStarfield(ctx, 494, 218, 0, 120, exposure); ctx.restore();
    });
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px system-ui';
    ctx.fillText('Illustrative backdrop: positions, brightness and optical spread do not represent a measured star catalogue.', 28, 662);
  });
  await capture(page, info, 'starfield-exposure-comparison', '#starfield-exposure-board');
  // The existing descent fallback intentionally requests one-quarter exposure.
  // Disable WebGL to exercise that real caller and inspect its native fills.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
      return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
    };
  });
  await page.setViewportSize({ width: 1100, height: 1000 }); await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: { missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true,
      difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true } } });
  });
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  const descent = await page.locator('[data-descent-canvas]').evaluate(async (cv: HTMLCanvasElement) => {
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const ctx = cv.getContext('2d')!, before = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const state = JSON.stringify((cv as any)._descentState());
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const after = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const rows = (cv as any).__mm65Stars || [], W = cv.width / 2, H = cv.height / 2;
    let s = (7919 * 16807 + 1) % 2147483647;
    const next = () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    let coordinateError = 0, alphaError = 0, changedBytes = 0;
    rows.forEach((row: any) => {
      const x = next() * W, y = next() * H * 0.45, q = next(); next();
      coordinateError = Math.max(coordinateError, Math.abs(row.x - x), Math.abs(row.y - y), Math.abs(row.radius - (0.3 + q * 1.5)));
      alphaError = Math.max(alphaError, Math.abs(row.alpha - 0.25 * (0.22 + 0.78 * q * q)));
    });
    for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changedBytes++;
    return { stars: rows.length, coordinateError, alphaError, changedBytes,
      statePreserved: JSON.stringify((cv as any)._descentState()) === state, W, H };
  });
  expect(descent.stars).toBe(40); expect(descent.coordinateError).toBeLessThan(1e-10);
  expect(descent.alphaError).toBeLessThan(1e-7); expect(descent.changedBytes).toBe(0); expect(descent.statePreserved).toBe(true);
  await capture(page, info, 'descent-starfield-quarter-exposure', '[data-descent-canvas]');
  const evidence = { native, scenes: { desktop20, desktop35, phone35, phone20, descent }, overflow, errors,
    screenshotCount: 6, accessibilityScans: 2, physicsAndSavedStatePreservedAcrossResize: true };
  const path = join(REPORT, 'starfield-exposure-evidence.json'); await writeFile(path, JSON.stringify(evidence, null, 2));
  await info.attach('starfield-exposure-evidence', { path, contentType: 'application/json' }); expect(errors).toEqual([]);
});
