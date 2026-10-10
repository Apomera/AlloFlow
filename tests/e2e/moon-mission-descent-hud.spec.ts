import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Run each workflow in a fresh process, with one worker and zero retries.
const REPORT = resolve(process.env.MM_DESCENT_HUD_REPORT_DIR ||
  'reports/moon-mission-enhancement-pass29-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true, difficulty: 'pilot',
  missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true }, ...extra,
} });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page, fallback = false) {
  await page.addInitScript(({ fallback }) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    if (fallback) {
      const original = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
        return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
      };
    }
    // Observe actual browser shaping and painting, without replacing the HUD or
    // calling its drawing helper. Keep only this canvas's current frame.
    const frames = new WeakMap<HTMLCanvasElement, any>();
    const proto = CanvasRenderingContext2D.prototype;
    const originalText = proto.fillText, originalClear = proto.clearRect;
    function reset(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const canvas = ctx.canvas;
      if (!canvas.matches('[data-descent-canvas]')) return;
      const m = ctx.getTransform();
      if (x <= 0 && y <= 0 && m.b === 0 && m.c === 0 &&
          w * m.a >= canvas.width - 1 && h * m.d >= canvas.height - 1) {
        const prior = frames.get(canvas);
        frames.set(canvas, { generation: (prior?.generation || 0) + 1,
          width: canvas.offsetWidth, height: canvas.offsetHeight, rows: [] });
      }
    }
    proto.clearRect = function(x, y, w, h) {
      reset(this, x, y, w, h); return originalClear.call(this, x, y, w, h);
    };
    proto.fillText = function(value, x, y, maxWidth?) {
      if (maxWidth === undefined) originalText.call(this, value, x, y);
      else originalText.call(this, value, x, y, maxWidth);
      const canvas = this.canvas, text = String(value);
      if (!canvas.matches('[data-descent-canvas]') ||
          !(y < 156 || /The Eagle has landed|HARD LANDING|RECORDED FRAME/.test(text))) return;
      // The fallback vignette fills the full canvas AFTER the HUD. A full fill
      // is therefore not a frame boundary. Observe the first actual HUD label.
      if (text === 'Altitude') {
        const prior = frames.get(canvas);
        frames.set(canvas, { generation: (prior?.generation || 0) + 1,
          width: canvas.offsetWidth, height: canvas.offsetHeight, rows: [] });
      }
      const frame = frames.get(canvas); if (!frame || frame.rows.length >= 32) return;
      const m = this.getTransform(), metric = this.measureText(text);
      const sx = canvas.offsetWidth / canvas.width, sy = canvas.offsetHeight / canvas.height;
      const box = { left: (m.a * (x - metric.actualBoundingBoxLeft) + m.e) * sx,
        right: (m.a * (x + metric.actualBoundingBoxRight) + m.e) * sx,
        top: (m.d * (y - metric.actualBoundingBoxAscent) + m.f) * sy,
        bottom: (m.d * (y + metric.actualBoundingBoxDescent) + m.f) * sy };
      const size = Number(/([\d.]+)px/.exec(this.font)?.[1]);
      frame.rows.push({ text, x, y, font: this.font, size, cssSize: size * m.a * sx,
        align: this.textAlign, baseline: this.textBaseline, alpha: this.globalAlpha, color: this.fillStyle,
        width: metric.width, box, transform: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
    };
    (window as any).__hudPaintFrame = (canvas: HTMLCanvasElement) => frames.get(canvas) || null;
  }, { fallback });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    Math.random = () => .999;
    document.getElementById('wrap')!.style.width = '100%';
    // Preserve the harness renderer proxy, then observe the camera that actually
    // renders this scene. No tool framing helper or synthetic camera is used.
    const w = window as any, T = w.THREE;
    if (!w.__hudSceneProbe && T?.WebGLRenderer) {
      w.__hudSceneProbe = true;
      w.__hudRenderedScenes = new WeakMap();
      T.WebGLRenderer = new Proxy(T.WebGLRenderer, {
        construct(target, args, newTarget) {
          const renderer = Reflect.construct(target, args, newTarget);
          const render = renderer.render;
          renderer.render = function(scene: any, camera: any) {
            const result = render.apply(this, arguments);
            if (scene?.isScene && this.domElement.matches('[data-descent-gl]')) {
              const size = this.getSize(new T.Vector2());
              w.__hudRenderedScenes.set(this.domElement, { scene, camera, width: size.x, height: size.y,
                mode: this.domElement.dataset.descentCamera });
            }
            return result;
          };
          return renderer;
        },
      });
    }
    (window as any).__mount(data);
  }, data);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-hud-bottom', '156');
}

async function flight(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((canvas: any) => canvas._descentState());
}
async function dust(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((canvas: any) => canvas._descentDustState());
}
async function inspectPausedPixels(page: Page) {
  const canvas = page.locator('[data-descent-canvas]');
  await expect(canvas).toHaveAttribute('data-descent-paused', 'true');
  const stability = await canvas.evaluate(async (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('2D fallback canvas context unavailable');
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    // Start after a presented frame, then compare every rendered RGBA byte
    // across two more animation frames. This observes the actual artwork.
    await frame();
    const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    await frame(); await frame();
    const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let changedBytes = 0, beforeChecksum = 2166136261, afterChecksum = 2166136261;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) changedBytes++;
      beforeChecksum = Math.imul(beforeChecksum ^ before[i], 16777619) >>> 0;
      afterChecksum = Math.imul(afterChecksum ^ after[i], 16777619) >>> 0;
    }
    return { width: canvas.width, height: canvas.height, bytes: before.length,
      comparedAnimationFrames: 2, changedBytes, beforeChecksum, afterChecksum };
  });
  expect(stability.bytes).toBeGreaterThan(0);
  expect(stability.changedBytes, 'paused fallback canvas RGBA bytes').toBe(0);
  expect(stability.afterChecksum).toBe(stability.beforeChecksum);
  return stability;
}
async function receipts(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.moonMission;
    return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult,
      landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  });
}

async function inspectFlightControls(page: Page, visible: boolean) {
  const pad = page.locator('[data-descent-pad]');
  await expect(pad).toHaveCount(1);
  const buttons = pad.locator('button');
  await expect(buttons).toHaveCount(3);
  if (visible) {
    await expect(pad).toBeVisible();
    for (const button of await buttons.all()) await expect(button).toBeVisible();
  } else {
    // Hiding only the decoration would leave flight controls over saved frames.
    // Check the actual interactive elements as well as their shared overlay.
    await expect(pad).toBeHidden();
    for (const button of await buttons.all()) await expect(button).toBeHidden();
    expect(await pad.evaluate(node => node.getClientRects().length)).toBe(0);
  }
}

async function inspectSceneVisibility(page: Page, compact: boolean) {
  await inspectFlightControls(page, true);
  await page.waitForFunction(() => {
    const gl = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__hudRenderedScenes?.get(gl);
    return record && record.width === gl.clientWidth && record.height === gl.clientHeight &&
      record.mode === gl.dataset.descentCamera;
  });
  const framing = await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    const gl = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const { scene, camera, width, height, mode } = w.__hudRenderedScenes.get(gl);
    const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const canvasBox = canvas.getBoundingClientRect();
    const pad = canvas.parentElement!.querySelector('[data-descent-pad]') as HTMLElement;
    if (!pad) throw Error('Descent touch controls are missing');
    const controlsTop = pad.getBoundingClientRect().top - canvasBox.top;
    function visible(object: any) {
      for (let node = object; node; node = node.parent) if (!node.visible) return false;
      return true;
    }
    function projected(name: string, hardware: boolean) {
      const root = scene.getObjectByName(name);
      if (!root || !visible(root)) throw Error('Rendered object unavailable: ' + name);
      const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity,
        near: Infinity, far: -Infinity, vertices: 0, objects: 0 };
      const point = new T.Vector3();
      root.traverse((object: any) => {
        const positions = object.geometry?.attributes?.position;
        if (!positions || !visible(object) || (hardware && !object.isMesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        // Ignore the colorless shadow proxy and additive exhaust. The measured
        // hardware includes actual landing legs, antennae and contact probes.
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
    return { width, height, mode, controlsTop, zoom: camera.zoom, viewEnabled: !!camera.view?.enabled,
      lander: projected('moon-descent-lander', true), nadir: projected('moon-descent-nadir', false) };
  });
  await mkdir(REPORT, { recursive: true });
  await writeFile(join(REPORT, 'last-inspected-framing.json'), JSON.stringify(framing, null, 2));
  expect(framing.lander.vertices).toBeGreaterThan(1000);
  expect(framing.nadir.vertices).toBe(64);
  for (const [name, box] of Object.entries({ lander: framing.lander, nadir: framing.nadir })) {
    expect(box.left, name + ' left').toBeGreaterThanOrEqual(0);
    expect(box.right, name + ' right').toBeLessThanOrEqual(framing.width);
    expect(box.near, name + ' near plane').toBeGreaterThan(-1);
    expect(box.far, name + ' far plane').toBeLessThan(1);
    if (compact) {
      expect(box.top, name + ' clear of HUD').toBeGreaterThanOrEqual(164);
      expect(box.bottom, name + ' clear of touch controls').toBeLessThanOrEqual(framing.controlsTop - 8);
    }
  }
  if (!compact) {
    expect(framing.zoom).toBe(1);
    expect(framing.viewEnabled).toBe(false);
  }
  return framing;
}

type Presentation = { alt: number; vVel: number; hVel: number; fuel: number; thrust: number;
  legacyFuel?: boolean; fuelPercent?: number | null; directionKnown?: boolean };
async function inspectHud(page: Page, state: Presentation, layout: 'corners' | 'compact', outcome = false) {
  const canvas = page.locator('[data-descent-canvas]');
  await expect(canvas).toHaveAttribute('data-descent-hud-layout', layout);
  try {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
      const f = (window as any).__hudPaintFrame(canvas);
      return f?.rows.some((r: any) => r.text === 'Altitude') && f.width === canvas.offsetWidth;
    });
  } catch (error) {
    await mkdir(REPORT, { recursive: true });
    await canvas.locator('..').screenshot({ path: join(REPORT, 'hud-readiness-failure.png'), timeout: 15000 }).catch(() => {});
    throw error;
  }
  const frame = await canvas.evaluate((canvas: any) => ({ ...(window as any).__hudPaintFrame(canvas),
    layout: canvas.dataset.descentHudLayout, bottom: canvas.dataset.descentHudBottom,
    cssWidth: canvas.getBoundingClientRect().width, backingWidth: canvas.width,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    reviewTime: canvas.dataset.descentReviewTime, renderer: canvas.dataset.descent3d }));
  await mkdir(REPORT, { recursive: true });
  await writeFile(join(REPORT, 'last-inspected-hud.json'), JSON.stringify(frame, null, 2));
  const hud = frame.rows.filter((r: any) => r.y < 156);
  const alt = Math.max(0, state.alt), v = Math.abs(state.vVel), h = Math.abs(state.hVel);
  const verticalDirection = v < .05 ? 'Still' : state.vVel > 0 ? 'Up' : 'Down';
  const lateralDirection = h < .05 ? 'Still' : state.hVel < 0 ? 'Left' : 'Right';
  const percent = Math.round(Math.max(0, Math.min(1, state.thrust)) * 100) + '%';
  const reserve = state.legacyFuel ? state.fuelPercent == null ? 'Not recorded' : state.fuelPercent.toFixed(0) + '%'
    : Math.max(0, state.fuel).toFixed(0) + ' s';
  const expected = ['Altitude', alt >= 1000 ? (alt / 1000).toFixed(2) + ' km' : alt.toFixed(1) + ' m',
    state.legacyFuel ? 'Saved fuel' : 'Hover reserve', reserve, 'Vertical', 'Drift',
    v.toFixed(1) + ' m/s', h.toFixed(1) + ' m/s', verticalDirection + ' · land <3',
    state.directionKnown === false ? 'Limit <5 m/s' : lateralDirection + ' · land <5',
    ...(layout === 'compact' ? ['Engine ' + percent] : ['Engine output', percent])];
  expect(hud.map((r: any) => r.text).sort()).toEqual(expected.sort());
  expect(frame.bottom).toBe('156'); expect(frame.horizontalOverflow).toBe(false);
  expect(frame.width).toBeGreaterThan(200);
  expect(frame.width < 620).toBe(layout === 'compact');
  for (const row of hud) {
    expect(row.size, row.text).toBeGreaterThanOrEqual(12);
    expect(row.cssSize, row.text).toBeGreaterThanOrEqual(12 - .01);
    expect(row.alpha).toBe(1); expect(row.align).toBe('left'); expect(row.baseline).toBe('alphabetic');
    expect(row.box.left, row.text).toBeGreaterThanOrEqual(8 - .5);
    expect(row.box.right, row.text).toBeLessThanOrEqual(frame.width - 8 + .5);
    expect(row.box.top, row.text).toBeGreaterThanOrEqual(8 - .5);
    expect(row.box.bottom, row.text).toBeLessThanOrEqual(156 + .5);
  }
  const collisions: any[] = [];
  for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) {
    const a = hud[i].box, b = hud[j].box;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5)
      collisions.push([hud[i].text, hud[j].text]);
  }
  expect(collisions).toEqual([]);
  if (outcome) {
    const headings = frame.rows.filter((r: any) => /The Eagle has landed|HARD LANDING/.test(r.text));
    expect(headings).toHaveLength(1);
    expect(headings[0].box.top).toBeGreaterThanOrEqual(172 - .5);
  }
  return { state, expected, ...frame, collisions };
}

function reporter(directory: string, page: Page, info: TestInfo) {
  const stages: any[] = [];
  return async (name: string, value: any, screenshot = true) => {
    await mkdir(directory, { recursive: true });
    const stage = { name, ...value, screenshot: null as string | null }; stages.push(stage);
    // Persist metrics before screenshot capture, so a later renderer/host timeout
    // cannot erase evidence from an already completed numerical check.
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

test('lighter native HUD keeps paused telemetry readable across desktop, phone, camera and context loss', async ({ page }, info) => {
  const errors: string[] = [], shaderErrors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(msg.text())) shaderErrors.push(msg.text()); });
  await instrument(page); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const canvas = page.locator('[data-descent-canvas]');
  await expect(canvas).toHaveAttribute('data-descent3d', 'on');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-gl]');
    const record = (window as any).__glRecord(canvas);
    return record?.draws > 0 && record?.renders > 0;
  });
  const held = await flight(page), heldDust = await dust(page), saved = await receipts(page);
  const save = reporter(join(REPORT, 'native'), page, info);
  async function assertHeld() {
    await inspectFlightControls(page, true);
    expect(await flight(page)).toEqual(held); expect(await dust(page)).toEqual(heldDust); expect(await receipts(page)).toEqual(saved);
  }
  await save('desktop', { hud: await inspectHud(page, held, 'corners'), framing: await inspectSceneVisibility(page, false), held, heldDust, saved, contexts: await harness.glContexts(page) });
  await page.setViewportSize({ width: 320, height: 850 });
  const phone = await inspectHud(page, held, 'compact'); await assertHeld();
  await save('phone', { hud: phone, framing: await inspectSceneVisibility(page, true) });
  await page.locator('select[data-descent-camera]').selectOption('landing');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'landing');
  await assertHeld(); await save('phone-landing-camera', { hud: await inspectHud(page, held, 'compact'), framing: await inspectSceneVisibility(page, true) });
  await page.locator('select[data-descent-camera]').selectOption('overhead');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'overhead');
  await assertHeld(); await save('phone-overhead-camera', { hud: await inspectHud(page, held, 'compact'), framing: await inspectSceneVisibility(page, true) });
  await page.locator('select[data-descent-camera]').selectOption('chase');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'chase');
  await page.setViewportSize({ width: 1100, height: 1000 });
  await assertHeld(); await save('desktop-restored', { hud: await inspectHud(page, held, 'corners'), framing: await inspectSceneVisibility(page, false) }, false);
  await page.setViewportSize({ width: 320, height: 850 });
  await inspectHud(page, held, 'compact'); await inspectSceneVisibility(page, true); await assertHeld();
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-descent-gl]');
    const record = (window as any).__glRecord(canvas);
    const extension = record?.ctx.getExtension('WEBGL_lose_context');
    if (!extension) throw Error('Actual renderer context cannot simulate context loss');
    extension.loseContext();
  });
  await expect(canvas).toHaveAttribute('data-descent3d', 'lost');
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  await assertHeld(); const fallback = await inspectHud(page, held, 'compact');
  expect(errors).toEqual([]); expect(shaderErrors).toEqual([]);
  await save('phone-context-loss', { hud: fallback, held, heldDust, saved, errors, shaderErrors,
    contexts: await harness.glContexts(page), completed: true });
});

test('2D fallback recorded HUD follows the official scrubber and preserves honest legacy fuel displays', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page, true); await page.setViewportSize({ width: 320, height: 850 });
  // Saved presentation fixtures exercise signed directions and units directly.
  // They do not claim to be an integrated flight or measured Apollo telemetry.
  const rows = [
    { t: 0, alt: 1320.5, v: -14.25, h: 5.25, fuel: 100.5, throttle: .3, tilt: .1, x: 0 },
    { t: 10, alt: 84.25, v: 2.75, h: -3.5, fuel: 43.25, throttle: .68, tilt: -.1, x: 40 },
    { t: 20, alt: 0, v: -1.2, h: -.02, fuel: 23.5, throttle: 0, tilt: 0, x: 32 },
  ];
  const result = { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: .02, fuel: 24, fuelUnit: 's',
    recording: { version: 1, samples: rows, firstBurn: { t: 0, alt: 1320.5 }, burnSeconds: 10, peakDescent: 14.25, peakDrift: 5.25 } };
  await mount(page, seed({ landingResult: result, landingAttempts: [result] }));
  await inspectFlightControls(page, false);
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  const held = await flight(page), saved = await receipts(page);
  const save = reporter(join(REPORT, 'fallback'), page, info);
  for (const index of [0, 1]) {
    await page.locator('[data-landing-scrub]').fill(String(index));
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', rows[index].t.toFixed(3));
    const row = rows[index], state = { alt: row.alt, vVel: row.v, hVel: row.h, fuel: row.fuel, thrust: row.throttle };
    const hud = await inspectHud(page, state, 'compact');
    const recordedLabels = hud.rows.filter((r: any) => /RECORDED FRAME/.test(r.text));
    expect(recordedLabels.map((r: any) => r.text)).toEqual(['RECORDED FRAME  ' + row.t.toFixed(1) + ' s']);
    expect(recordedLabels[0].cssSize).toBeGreaterThanOrEqual(12 - .01);
    expect(recordedLabels[0].box.top).toBeGreaterThanOrEqual(hud.height - 52);
    expect(recordedLabels[0].box.bottom).toBeLessThanOrEqual(hud.height - 12);
    expect(recordedLabels[0].box.left).toBeGreaterThanOrEqual(12);
    expect(recordedLabels[0].box.right).toBeLessThanOrEqual(hud.width - 12);
    await inspectFlightControls(page, false);
    expect(await flight(page)).toEqual(held); expect(await receipts(page)).toEqual(saved);
    expect((await dust(page)).grains).toEqual([]);
    await save('recorded-' + index, { hud, held, saved, dust: await dust(page) });
  }
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', '');
  const contactHud = await inspectHud(page, held, 'compact', true);
  await inspectFlightControls(page, false);
  expect(await flight(page)).toEqual(held); expect(await receipts(page)).toEqual(saved);
  expect((await dust(page)).grains).toEqual([]);
  await save('recorded-touchdown', { hud: contactHud, held, saved });
  for (const [name, offset] of [['far-east', 5000], ['far-west', -5000]] as const) {
    // Translate saved presentation samples together; this is a recording
    // fixture at a distant world position, not a newly integrated flight.
    const distant = JSON.parse(JSON.stringify(result)) as typeof result;
    distant.recording.samples.forEach(row => { row.x += offset; });
    await mount(page, seed({ landingResult: distant, landingAttempts: [distant] }));
    await inspectFlightControls(page, false);
    await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
    const distantHeld = await flight(page), distantSaved = await receipts(page);
    expect(distantSaved.landingResult.recording.samples.map((row: any) => row.x))
      .toEqual(rows.map(row => row.x + offset));
    const index = 1, row = distant.recording.samples[index];
    await page.locator('[data-landing-scrub]').fill(String(index));
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', row.t.toFixed(3));
    const hud = await inspectHud(page, { alt: row.alt, vVel: row.v, hVel: row.h,
      fuel: row.fuel, thrust: row.throttle }, 'compact');
    expect(hud.rows.filter((paint: any) => /RECORDED FRAME/.test(paint.text)).map((paint: any) => paint.text))
      .toEqual(['RECORDED FRAME  ' + row.t.toFixed(1) + ' s']);
    const stability = await inspectPausedPixels(page);
    await inspectFlightControls(page, false);
    expect(await flight(page)).toEqual(distantHeld);
    expect(await receipts(page)).toEqual(distantSaved);
    expect((await dust(page)).grains).toEqual([]);
    expect(errors).toEqual([]);
    await save(name, { hud, offsetMetres: offset, selectedSample: row, stability,
      held: distantHeld, saved: distantSaved, errors });
  }
  for (const fuel of [70, null]) {
    const legacy = { crashed: false, score: 84, grade: 'B', vVel: 1, hVel: 2, ...(fuel == null ? {} : { fuel }) };
    await mount(page, seed({ landingResult: legacy, landingAttempts: [legacy] }));
    await inspectFlightControls(page, false);
    const state = await flight(page), receipt = await receipts(page);
    const hud = await inspectHud(page, { ...state, legacyFuel: true, fuelPercent: fuel, directionKnown: false }, 'compact', true);
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-fuel', '');
    expect((await dust(page)).grains).toEqual([]); expect(await flight(page)).toEqual(state);
    expect(await receipts(page)).toEqual(receipt);
    expect(errors).toEqual([]);
    await save(fuel == null ? 'legacy-missing-fuel' : 'legacy-percent-fuel', { hud, state, receipt, errors });
  }
  // Exercise the real retry/onboarding path: the completed canvas unmounts,
  // then Begin Descent creates a fresh live flight with its controls restored.
  const beforeRetry = await receipts(page);
  await page.getByRole('button', { name: 'Retry the powered descent from the start', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(0);
  await expect(page.locator('[data-descent-pad]')).toHaveCount(0);
  expect(await receipts(page)).toEqual({ ...beforeRetry, landingResult: null });
  await page.locator('button[data-descent-begin]').click();
  const retryCanvas = page.locator('[data-descent-canvas]');
  await expect(retryCanvas).toHaveAttribute('data-descent-paused', 'true');
  await expect(retryCanvas).toHaveAttribute('data-descent-review-time', '');
  await expect(retryCanvas).toHaveAttribute('data-descent-hud-bottom', '156');
  await inspectFlightControls(page, true);
  const retryState = await flight(page), retryReceipt = await receipts(page);
  expect(retryState.alt).toBeGreaterThan(0);
  expect(retryState.thrust).toBe(0);
  expect(retryReceipt).toEqual({ ...beforeRetry, landingResult: null });
  const retryHud = await inspectHud(page, retryState, 'compact');
  expect(await flight(page)).toEqual(retryState);
  expect(errors).toEqual([]);
  await save('retry-live', { hud: retryHud, state: retryState, receipt: retryReceipt, errors });
  await page.setViewportSize({ width: 1100, height: 1000 });
  const desktopHud = await inspectHud(page, retryState, 'corners');
  await inspectFlightControls(page, true);
  const desktopStability = await inspectPausedPixels(page);
  expect(await flight(page)).toEqual(retryState);
  expect(await receipts(page)).toEqual(retryReceipt);
  expect(errors).toEqual([]);
  await save('retry-desktop', { hud: desktopHud, state: retryState, receipt: retryReceipt,
    stability: desktopStability, errors, completed: true });
});
