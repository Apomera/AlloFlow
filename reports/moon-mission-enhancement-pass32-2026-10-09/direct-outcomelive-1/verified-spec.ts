import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Run the two workflows separately, with one worker and zero retries.
const REPORT = resolve(process.env.MM_DESCENT_OUTCOME_REPORT_DIR ||
  'reports/moon-mission-enhancement-pass32-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const PHONE = { width: 320, height: 850 }, DESKTOP = { width: 1100, height: 1000 };
const seed = (result: Record<string, unknown>) => ({ moonMission: {
  missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true, difficulty: 'pilot',
  missionXP: 42, landingRewarded: false, lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true }, landingResult: result, landingAttempts: [result],
} });
// Saved presentation fixtures, not newly integrated flights. The 69/C grade is
// authoritative even though rounding the stored reserve can cross a score boundary.
const success = { crashed: false, score: 69, grade: 'C', vVel: 1.2, hVel: .8, fuel: 30, fuelUnit: 's',
  recording: { version: 1, samples: [
    { t: 0, alt: 300, v: -12, h: 4, fuel: 100, throttle: 0, tilt: 0, x: 0 },
    { t: 72.5, alt: 0, v: -1.2, h: -.8, fuel: 29.7, throttle: .5, tilt: -.1, x: -80.4 },
  ] } };
const impact = { crashed: true, score: 0, grade: '\u2014', vVel: 12.5, hVel: 6.2, fuel: 30, fuelUnit: 's' };
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page, fallback: boolean) {
  await page.addInitScript(({ fallback }) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    if (fallback) {
      const original = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
        return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
      };
    }
    const frames = new WeakMap<HTMLCanvasElement, any>();
    const proto = CanvasRenderingContext2D.prototype, original = proto.fillText;
    proto.fillText = function(value, x, y, maxWidth?) {
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
      const canvas = this.canvas, text = String(value);
      if (!canvas.matches('[data-descent-canvas]')) return;
      // Observe actual browser shaping and painting after the first HUD label.
      // The fallback vignette fills the canvas after the text, so a full fill
      // cannot serve as a frame boundary. No drawing helper is called here.
      if (text === 'Altitude') {
        const previous = frames.get(canvas);
        frames.set(canvas, { generation: (previous?.generation || 0) + 1,
          width: canvas.offsetWidth, height: canvas.offsetHeight, rows: [] });
      }
      const frame = frames.get(canvas); if (!frame || frame.rows.length >= 64) return;
      const m = this.getTransform(), metric = this.measureText(text);
      const sx = canvas.offsetWidth / canvas.width, sy = canvas.offsetHeight / canvas.height;
      const size = Number(/([\d.]+)px/.exec(this.font)?.[1]);
      frame.rows.push({ text, x, y, font: this.font, size, cssSize: size * m.a * sx,
        alpha: this.globalAlpha, align: this.textAlign, baseline: this.textBaseline,
        box: { left: (m.a * (x - metric.actualBoundingBoxLeft) + m.e) * sx,
          right: (m.a * (x + metric.actualBoundingBoxRight) + m.e) * sx,
          top: (m.d * (y - metric.actualBoundingBoxAscent) + m.f) * sy,
          bottom: (m.d * (y + metric.actualBoundingBoxDescent) + m.f) * sy } });
    };
    (window as any).__outcomePaintFrame = (canvas: HTMLCanvasElement) => frames.get(canvas) || null;
  }, { fallback });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function mount(page: Page, result: Record<string, unknown>) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    Math.random = () => .999;
    document.getElementById('wrap')!.style.width = '100%';
    // Preserve the harness renderer proxy, then observe the scene/camera that
    // actually renders. Framing checks below use real visible mesh vertices.
    const w = window as any, T = w.THREE;
    if (!w.__outcomeSceneProbe && T?.WebGLRenderer) {
      w.__outcomeSceneProbe = true;
      w.__outcomeRenderedScenes = new WeakMap();
      T.WebGLRenderer = new Proxy(T.WebGLRenderer, {
        construct(target, args, newTarget) {
          const renderer = Reflect.construct(target, args, newTarget);
          const render = renderer.render;
          renderer.render = function(scene: any, camera: any) {
            const result = render.apply(this, arguments);
            if (scene?.isScene && this.domElement.matches('[data-descent-gl]')) {
              const size = this.getSize(new T.Vector2());
              w.__outcomeRenderedScenes.set(this.domElement, { scene, camera, width: size.x,
                height: size.y, mode: this.domElement.dataset.descentCamera });
            }
            return result;
          };
          return renderer;
        },
      });
    }
    (window as any).__mount(data);
  }, seed(result));
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-hud-bottom', '156');
}
async function receipts(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.moonMission;
    return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult,
      landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  });
}
async function flight(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((canvas: any) => canvas._descentState());
}
async function controls(page: Page, visible: boolean) {
  const pad = page.locator('[data-descent-pad]');
  await expect(pad).toHaveCount(1); await expect(pad.locator('button')).toHaveCount(3);
  if (visible) await expect(pad).toBeVisible(); else await expect(pad).toBeHidden();
  for (const button of await pad.locator('button').all()) {
    if (visible) await expect(button).toBeVisible(); else await expect(button).toBeHidden();
  }
}
async function painted(page: Page) {
  const canvas = page.locator('[data-descent-canvas]');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const frame = (window as any).__outcomePaintFrame(canvas);
    return frame?.rows.some((row: any) => row.text === 'Altitude') && frame.width === canvas.offsetWidth;
  });
  return canvas.evaluate((canvas: any) => ({ ...(window as any).__outcomePaintFrame(canvas),
    layout: canvas.dataset.descentHudLayout, reviewTime: canvas.dataset.descentReviewTime,
    renderer: canvas.dataset.descent3d, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
}
async function outcome(page: Page, kind: 'success' | 'impact', expected: string[], earnedDetails = false) {
  // Wait for the completed paint rather than accepting the HUD alone: frame
  // collection begins at Altitude and continues through all outcome text.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const frame = (window as any).__outcomePaintFrame(canvas);
    return frame?.width === canvas.offsetWidth && frame.rows.some((row: any) => /The Eagle has landed|HARD LANDING/.test(row.text));
  });
  const frame = await painted(page), headingPattern = kind === 'success' ? /The Eagle has landed/ : /HARD LANDING/;
  const heading = frame.rows.findIndex((row: any) => headingPattern.test(row.text));
  expect(heading).toBeGreaterThanOrEqual(0);
  const rows = frame.rows.slice(heading);
  expect(frame.rows.filter((row: any) => /The Eagle has landed|HARD LANDING/.test(row.text))).toHaveLength(1);
  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(rows[0].box.top).toBeGreaterThanOrEqual(172 - .5);
  expect(frame.horizontalOverflow).toBe(false);
  const joined = rows.map((row: any) => row.text).join(' ').replace(/\s+/g, ' ');
  for (const text of expected) expect(joined).toContain(text);
  const collisions: string[][] = [];
  for (const row of rows) {
    expect(row.size, row.text).toBeGreaterThanOrEqual(12);
    expect(row.cssSize, row.text).toBeGreaterThanOrEqual(12 - .01);
    expect(row.alpha, row.text).toBe(1);
    expect(row.box.left, row.text).toBeGreaterThanOrEqual(12 - .5);
    expect(row.box.right, row.text).toBeLessThanOrEqual(frame.width - 12 + .5);
    expect(row.box.top, row.text).toBeGreaterThanOrEqual(172 - .5);
    expect(row.box.bottom, row.text).toBeLessThanOrEqual(frame.height - 12);
  }
  for (let i = 0; i < frame.rows.length; i++) for (let j = i + 1; j < frame.rows.length; j++) {
    const a = frame.rows[i].box, b = frame.rows[j].box;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5)
      collisions.push([frame.rows[i].text, frame.rows[j].text]);
  }
  expect(collisions).toEqual([]);
  const detailsAt = earnedDetails ? rows.findIndex((row: any) => /Soft touch/.test(row.text)) : -1;
  if (earnedDetails) expect(detailsAt, 'live landing displays its earned points').toBeGreaterThan(0);
  const mainRows = earnedDetails ? rows.slice(0, detailsAt) : rows;
  const detailRows = earnedDetails ? rows.slice(detailsAt) : [];
  const bottom = Math.max(...mainRows.map((row: any) => row.box.bottom));
  if (frame.layout === 'compact') expect(bottom, 'typical outcome leaves landed hardware visible').toBeLessThanOrEqual(272);
  await controls(page, false);
  return { ...frame, outcomeRows: rows, mainRows, detailRows, joined, bottom, collisions };
}
async function absentOutcome(page: Page, review: boolean) {
  const frame = await painted(page);
  expect(frame.rows.filter((row: any) => /The Eagle has landed|HARD LANDING|Landing score|fuel left|Impact at|Touchdown at/.test(row.text))).toEqual([]);
  expect(frame.rows.filter((row: any) => /RECORDED FRAME/.test(row.text))).toHaveLength(review ? 1 : 0);
  return frame;
}
async function actualNative(page: Page) {
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__glRecord(canvas);
    return record?.draws > 0 && record?.renders > 0 && canvas.width > 0 && canvas.height > 0;
  });
  const actual = await page.evaluate(() => {
    const canvas = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__glRecord(canvas);
    return { draws: record.draws, renders: record.renders, width: canvas.width, height: canvas.height,
      lost: record.ctx.isContextLost() };
  });
  expect(actual.lost).toBe(false); expect(actual.draws).toBeGreaterThan(0); expect(actual.renders).toBeGreaterThan(0);
  return actual;
}
async function completedFraming(page: Page, card: any) {
  await page.waitForFunction(() => {
    const gl = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__outcomeRenderedScenes?.get(gl);
    return record && record.width === gl.clientWidth && record.height === gl.clientHeight &&
      record.mode === gl.dataset.descentCamera;
  });
  const framing = await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    const gl = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const { scene, camera, width, height, mode } = w.__outcomeRenderedScenes.get(gl);
    function visible(object: any) {
      for (let node = object; node; node = node.parent) if (!node.visible) return false;
      return true;
    }
    function project(name: string, hardware: boolean) {
      const root = scene.getObjectByName(name);
      if (!root || !visible(root)) throw Error('Rendered object unavailable: ' + name);
      const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity,
        near: Infinity, far: -Infinity, vertices: 0, objects: 0 };
      const point = new T.Vector3();
      root.traverse((object: any) => {
        const positions = object.geometry?.attributes?.position;
        if (!positions || !visible(object) || (hardware && !object.isMesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        // Ignore the colorless shadow proxy and additive exhaust. This retains
        // the actual landing legs, antennae and contact probes in the bounds.
        if (!materials.some((m: any) => m && m.visible !== false && m.colorWrite !== false &&
            m.opacity > 0 && (!hardware || m.blending !== T.AdditiveBlending))) return;
        box.objects++;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
          const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
          box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
          box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
          box.near = Math.min(box.near, point.z); box.far = Math.max(box.far, point.z);
          box.vertices++;
        }
      });
      return box;
    }
    return { width, height, mode, zoom: camera.zoom, viewEnabled: !!camera.view?.enabled,
      lander: project('moon-descent-lander', true), nadir: project('moon-descent-nadir', false) };
  });
  await mkdir(REPORT, { recursive: true });
  await writeFile(join(REPORT, 'last-inspected-completed-framing.json'), JSON.stringify({
    outcomeTextBottom: card.bottom, ...framing }, null, 2));
  expect(framing.width).toBe(card.width); expect(framing.height).toBe(card.height);
  expect(framing.lander.vertices).toBeGreaterThan(1000); expect(framing.nadir.vertices).toBe(64);
  for (const [name, box] of Object.entries({ lander: framing.lander, nadir: framing.nadir })) {
    expect(box.top, name + ' clear of completion text').toBeGreaterThanOrEqual(card.bottom + 10);
    expect(box.bottom, name + ' inside viewport').toBeLessThanOrEqual(framing.height - 8);
    expect(box.left, name + ' left').toBeGreaterThanOrEqual(0);
    expect(box.right, name + ' right').toBeLessThanOrEqual(framing.width);
    expect(box.near, name + ' near plane').toBeGreaterThan(-1);
    expect(box.far, name + ' far plane').toBeLessThan(1);
  }
  return framing;
}
function reporter(directory: string, page: Page, info: TestInfo) {
  const stages: any[] = [];
  return async (name: string, value: any, screenshot = true) => {
    await mkdir(directory, { recursive: true });
    const stage = { name, ...value, screenshot: null as string | null }; stages.push(stage);
    await writeFile(join(directory, name + '.json'), JSON.stringify(stage, null, 2));
    await writeFile(join(directory, 'progress.json'), JSON.stringify({ stages }, null, 2));
    if (screenshot) {
      const path = join(directory, name + '.png');
      await page.locator('[data-descent-canvas]').locator('..').screenshot({ path, animations: 'disabled', timeout: 60000 });
      await info.attach(name, { path, contentType: 'image/png' }); stage.screenshot = path;
      await writeFile(join(directory, name + '.json'), JSON.stringify(stage, null, 2));
      await writeFile(join(directory, 'progress.json'), JSON.stringify({ stages }, null, 2));
    }
  };
}

test('2D landing outcome stays readable across saved results, replay and retry', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page, true); await page.setViewportSize(PHONE); await mount(page, success);
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  const save = reporter(join(REPORT, 'fallback'), page, info), held = await flight(page), saved = await receipts(page);
  const successText = ['Landing score 69/100 (grade C)', '30 s of fuel left', 'Begin EVA'];
  await save('success-phone', { outcome: await outcome(page, 'success', successText), held, saved });
  await page.setViewportSize(DESKTOP);
  await save('success-desktop', { outcome: await outcome(page, 'success', successText) });
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  await page.setViewportSize(PHONE);
  await page.locator('[data-landing-scrub]').fill('0');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', '0.000');
  await controls(page, false);
  await save('recorded-review', { paint: await absentOutcome(page, true) });
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', '');
  await save('returned-touchdown', { outcome: await outcome(page, 'success', successText) }, false);
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  for (const [name, result, expected] of [
    ['legacy-percent', { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: .8, fuel: 22 }, ['Landing score 88/100 (grade A)', '22% fuel left']],
    ['legacy-missing', { crashed: false, vVel: 1.2, hVel: .8 }, ['Landing score not recorded', 'fuel not recorded']],
  ] as const) {
    await mount(page, result);
    const before = await receipts(page), heldLegacy = await flight(page), card = await outcome(page, 'success', [...expected]);
    expect(card.joined).not.toMatch(/Fuel reserve \+|Soft touch \+/);
    if (name === 'legacy-percent') expect(card.joined).not.toContain('22 s');
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-fuel', '');
    expect(await receipts(page)).toEqual(before); expect(await flight(page)).toEqual(heldLegacy);
    await save(name, { outcome: card, held: heldLegacy, saved: before });
  }
  await mount(page, impact);
  const beforeImpact = await receipts(page), impactHeld = await flight(page);
  const impactText = ['HARD LANDING', '12.5 m/s down', '6.2 m/s across',
    'Landing limits: below 3 m/s down and 5 m/s across.', 'Retry Landing'];
  await save('impact-phone', { outcome: await outcome(page, 'impact', impactText), held: impactHeld, saved: beforeImpact });
  await page.setViewportSize(DESKTOP);
  await save('impact-desktop', { outcome: await outcome(page, 'impact', impactText) }, false);
  expect(await receipts(page)).toEqual(beforeImpact); expect(await flight(page)).toEqual(impactHeld);
  await page.setViewportSize(PHONE);
  await page.getByRole('button', { name: 'Retry the powered descent from the start', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(0);
  await expect(page.locator('[data-descent-pad]')).toHaveCount(0);
  expect(await receipts(page)).toEqual({ ...beforeImpact, landingResult: null });
  await page.locator('button[data-descent-begin]').click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await controls(page, true);
  const retry = await flight(page);
  expect(retry.alt).toBeGreaterThan(0); expect(retry.thrust).toBe(0);
  expect(await receipts(page)).toEqual({ ...beforeImpact, landingResult: null });
  expect(errors).toEqual([]);
  await save('retry-live', { paint: await absentOutcome(page, false), held: retry,
    saved: await receipts(page), errors, completed: true });
});

test('native landing outcome keeps success and impact readable on desktop and phone', async ({ page }, info) => {
  const errors: string[] = [], shaderErrors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(msg.text())) shaderErrors.push(msg.text()); });
  await instrument(page, false);
  const save = reporter(join(REPORT, 'native'), page, info);
  for (const [name, result, kind, expected] of [
    ['success', success, 'success', ['Landing score 69/100 (grade C)', '30 s of fuel left', 'Begin EVA']],
    ['impact', impact, 'impact', ['HARD LANDING', '12.5 m/s down', '6.2 m/s across',
      'Landing limits: below 3 m/s down and 5 m/s across.', 'Retry Landing']],
  ] as const) {
    await page.setViewportSize(DESKTOP); await mount(page, result);
    const held = await flight(page), saved = await receipts(page);
    for (const [size, viewport] of [['desktop', DESKTOP], ['phone', PHONE]] as const) {
      await page.setViewportSize(viewport);
      const native = await actualNative(page), card = await outcome(page, kind, [...expected]);
      expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
      expect(errors).toEqual([]); expect(shaderErrors).toEqual([]);
      const framing = await completedFraming(page, card);
      await save(name + '-' + size, { outcome: card, native, framing, held, saved, errors, shaderErrors,
        contexts: await harness.glContexts(page), completed: name === 'impact' && size === 'phone' });
      if (name === 'success' && size === 'phone') {
        for (const camera of ['landing', 'overhead']) {
          await page.locator('select[data-descent-camera]').selectOption(camera);
          await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', camera);
          const cameraCard = await outcome(page, kind, [...expected]);
          const cameraNative = await actualNative(page), cameraFraming = await completedFraming(page, cameraCard);
          expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
          expect(errors).toEqual([]); expect(shaderErrors).toEqual([]);
          await save('success-phone-' + camera, { outcome: cameraCard, native: cameraNative,
            framing: cameraFraming, held, saved, errors, shaderErrors });
        }
      }
    }
  }
});

test('live landing outcome displays earned points from an integrated practice flight', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page, true); await page.setViewportSize(PHONE);
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => {
    Math.random = () => .999;
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount({ moonMission: {
      missionPhase: 5, descentMode: 'practice', descentStarted: true, animPaused: true,
      soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: false,
      landingResult: null, landingAttempts: [], lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true },
    } });
  });
  const canvas = page.locator('[data-descent-canvas]');
  await expect(canvas).toHaveAttribute('data-descent-paused', 'true');
  await expect(canvas).toHaveAttribute('data-descent-hud-bottom', '156');
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  await controls(page, true);
  const start = await flight(page), before = await receipts(page);
  expect(start.alt).toBe(300); expect(start.elapsed).toBe(0);
  expect(before).toEqual({ missionXP: 42, landingResult: null, landingAttempts: [], landingRewarded: false });
  await page.evaluate(() => {
    const w = window as any, canvas = document.querySelector('[data-descent-canvas]') as any;
    const lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
    const pilot = w.__outcomePilot = { done: false, reason: '', trace: [] as any[], started: performance.now() };
    let lastControl = -Infinity, lastTrace = -Infinity;
    function steer(now: number) {
      if (pilot.done) return;
      const state = canvas._descentState();
      const mass = Number(canvas.dataset.descentMass);
      // This test pilot operates the visible slider and reads published flight
      // telemetry. The simulator's clock, state and integrator remain untouched.
      // The speed schedule tapers the approach to roughly 1.2 m/s near contact;
      // lateral drift starts below the practice limit and needs no steering.
      const targetV = -Math.min(12, Math.max(1.2, 1.2 * Math.sqrt(Math.max(0, state.alt))));
      const setting = Math.max(0, Math.min(100,
        Math.round(100 * mass * (1.62 + .65 * (targetV - state.vVel)) / 46700)));
      if (state.contact || now - pilot.started >= 110000 || !Number.isFinite(setting)) {
        pilot.done = true;
        pilot.reason = state.contact ? 'contact' : !Number.isFinite(setting) ? 'invalid-telemetry' : 'pilot-timeout';
        pilot.trace.push({ wallSeconds: (now - pilot.started) / 1000, ...state, mass,
          targetV, slider: Number(lever.value), reason: pilot.reason });
        // At contact the simulator already cuts its engine. On an unfinished
        // timeout, release the actual lever and pause through the normal UI.
        if (!state.contact) {
          lever.value = '0'; lever.dispatchEvent(new Event('input', { bubbles: true }));
          if (canvas.dataset.descentPaused !== 'true')
            (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click();
        }
        return;
      }
      if (now - lastControl >= 100) {
        if (lever.value !== String(setting)) {
          lever.value = String(setting); lever.dispatchEvent(new Event('input', { bubbles: true }));
        }
        lastControl = now;
      }
      if (now - lastTrace >= 200) {
        pilot.trace.push({ wallSeconds: (now - pilot.started) / 1000, ...state,
          mass, targetV, slider: Number(lever.value) });
        lastTrace = now;
      }
      requestAnimationFrame(steer);
    }
    requestAnimationFrame(steer);
  });
  await page.locator('[data-descent-pause]').click();
  await expect(canvas).toHaveAttribute('data-descent-paused', 'false');
  let pilotWaitError: string | null = null;
  try { await page.waitForFunction(() => (window as any).__outcomePilot?.done, undefined, { timeout: 115000 }); }
  catch (error) { pilotWaitError = String(error); }
  const pilot = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__outcomePilot)));
  const contact = await flight(page), saved = await receipts(page);
  const directory = join(REPORT, 'live');
  // Save the complete observed flight/control trace before assertions, including
  // when contact failed. This makes pilot or host-timing failures diagnosable.
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'flight-control-trace.json'), JSON.stringify({ start, before,
    pilot, pilotWaitError, contact, saved, errors }, null, 2));
  if (pilotWaitError || pilot.reason !== 'contact') {
    await canvas.locator('..').screenshot({ path: join(directory, 'pilot-failure.png'), animations: 'disabled', timeout: 15000 }).catch(() => {});
  }
  expect(pilotWaitError).toBeNull(); expect(pilot.reason).toBe('contact');
  expect(contact.contact).toBe(true); expect(contact.alt).toBe(0); expect(contact.elapsed).toBeGreaterThan(0);
  expect(Math.abs(contact.vVel)).toBeLessThan(3); expect(Math.abs(contact.hVel)).toBeLessThan(5);
  expect(saved.landingResult.crashed).toBe(false);
  expect(saved.landingAttempts).toHaveLength(1);
  expect(saved.landingAttempts[0]).toEqual(saved.landingResult);
  expect(saved.landingResult.start.source).toBe('practice');
  expect(saved.landingResult.start.state.alt).toBe(300);
  expect(saved.landingResult.fuelUnit).toBe('s');
  expect(saved.landingResult.vVel).toBeCloseTo(Math.abs(contact.vVel), 7);
  expect(saved.landingResult.hVel).toBeCloseTo(Math.abs(contact.hVel), 7);
  expect(saved.landingResult.fuel).toBe(Math.round(contact.fuel));
  const samples = saved.landingResult.recording.samples;
  expect(samples.length).toBeGreaterThan(10); expect(samples[0].alt).toBe(300);
  expect(samples[samples.length - 1].alt).toBe(0);
  expect(samples[samples.length - 1].t).toBeCloseTo(contact.elapsed, 2);
  // Independently derive the documented point bands from the measured contact;
  // do not call the production scoring helper to produce the expected result.
  const v = Math.abs(contact.vVel), h = Math.abs(contact.hVel), fuel = contact.fuel;
  const parts = [
    ['Soft touch', v < 1 ? 30 : v < 2 ? 20 : 10],
    ['Low drift', h < 1 ? 20 : h < 2.5 ? 10 : 0],
    ['Fuel reserve', fuel >= 30 ? 30 : fuel >= 15 ? 20 : fuel > 0 ? 10 : 0],
    ['Margin bonus', Math.min(20, Math.floor(Math.max(0, fuel) / 3))],
  ] as const;
  const total = parts.reduce((sum, part) => sum + part[1], 0);
  const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D';
  expect(saved.landingResult.score).toBe(total); expect(saved.landingResult.grade).toBe(grade);
  expect(saved.missionXP).toBe(42 + (total >= 80 ? 20 : 0));
  expect(saved.landingRewarded).toBe(total >= 80);
  const card = await outcome(page, 'success', ['Landing score ' + total + '/100 (grade ' + grade + ')',
    ...parts.map(part => part[0] + ' +' + part[1])], true);
  expect(card.detailRows.length).toBeGreaterThan(0);
  const surfaceY = Number(await canvas.getAttribute('data-descent-side-surface-y'));
  const detailTop = Math.min(...card.detailRows.map((row: any) => row.box.top));
  const detailBottom = Math.max(...card.detailRows.map((row: any) => row.box.bottom));
  expect(Number.isFinite(surfaceY)).toBe(true);
  expect(detailTop).toBeGreaterThan(surfaceY + 20);
  expect(detailTop).toBeGreaterThan(card.bottom + 12);
  expect(detailBottom).toBeLessThanOrEqual(card.height - 12);
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(contact);
  expect(errors).toEqual([]);
  const save = reporter(directory, page, info);
  await save('earned-points-phone', { outcome: card, parts, total, grade, surfaceY,
    detailTop, detailBottom, start, contact, saved, errors, completed: true });
});
