import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_DUST_REPORT_DIR || 'reports/moon-mission-enhancement-pass23-2026-10-04/browser/dust');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true, animPaused: true,
  soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, data = seed(), probe = false) {
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ data, probe }) => {
    Math.random = () => .999; document.getElementById('wrap')!.style.width = '100%';
    if (probe) {
      const T = (window as any).THREE, Original = T.WebGLRenderer;
      const Capture = function(...args: any[]) {
        const renderer = new Original(...args), original = renderer.render;
        renderer.render = function(scene: any, camera: any) {
          const dust = scene.getObjectByName('moon-descent-dust');
          if (dust) (window as any).__dustGL = { renderer, scene, camera, dust };
          return original.apply(renderer, arguments);
        };
        return renderer;
      };
      Capture.prototype = Original.prototype; Object.setPrototypeOf(Capture, Original); T.WebGLRenderer = Capture;
    }
    (window as any).__mount(data);
  }, { data, probe });
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
}
async function state(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentState()); }
async function dust(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentDustState()); }
async function receipts(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  const clip = await page.locator('[data-descent-canvas]').evaluate((c: HTMLElement) => {
    const b = c.parentElement!.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  });
  await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function pilotToDust(page: Page) {
  // Operate the real lever and Pause button; never replace state or flight time.
  await page.evaluate(() => {
    const cv = document.querySelector('[data-descent-canvas]') as any, lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
    const P = (window as any).MoonMissionPure; (window as any).__dustPilot = { phase: 'coast', done: false, contact: false };
    function pilot() {
      const control = (window as any).__dustPilot, s = cv._descentState(); if (control.done) return;
      if (s.contact) { control.done = true; control.contact = true; return; }
      if (control.phase === 'coast' && s.alt < 115) control.phase = 'brake';
      if (control.phase === 'brake' && s.vVel > -7) control.phase = 'hold';
      const setting = control.phase === 'coast' ? 0 : control.phase === 'brake' ? 100 : Math.round(P.descentGuidance(s).hoverThrottle * 100);
      if (lever.value !== String(setting)) { lever.value = String(setting); lever.dispatchEvent(new Event('input', { bubbles: true })); }
      if (control.phase === 'hold') cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      if (s.alt < 18 && cv._descentDustState().grains.length > 8) {
        (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click(); control.done = true; return;
      }
      requestAnimationFrame(pilot);
    }
    requestAnimationFrame(pilot);
  });
  await page.locator('[data-descent-pause]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__dustPilot.done), { timeout: 100000 }).toBe(true);
  expect(await page.evaluate(() => (window as any).__dustPilot.contact)).toBe(false);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect.poll(async () => (await dust(page)).time).toBe((await state(page)).elapsed);
  expect((await dust(page)).grains.length).toBeGreaterThan(8);
}
async function modelNotes(page: Page, name: string) {
  const note = page.locator('[data-descent-dust-note]'); await note.locator('..').locator('summary').click(); await expect(note).toBeVisible();
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await note.evaluate(async n => (await (window as any).axe.run(n.parentElement,
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2));
  expect(violations).toEqual([]);
}

test.describe('fallback ballistic surface dust', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
    };
  }));
  test('a real burn emits world-fixed grains that coast after cutoff and settle after contact', async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page); const original = await receipts(page);
    await pilotToDust(page); const before = await dust(page), held = await state(page); expect(held.tilt).toBeGreaterThan(.2);
    await capture(page, info, 'fallback-burning-dust'); await page.locator('[data-descent-throttle]').fill('0');
    await page.waitForTimeout(300); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(before);
    // Pause from the page's own animation loop at the measured cutoff interval.
    // Separate protocol calls can overshoot every grain's lifetime on a busy host.
    await page.evaluate(async () => {
      const cv = document.querySelector('[data-descent-canvas]') as any;
      const target = cv._descentState().elapsed + .45;
      (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click();
      await new Promise<void>(resolve => {
        function hold() {
          if (cv._descentState().elapsed > target) {
            (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click(); resolve();
          }
          else requestAnimationFrame(hold);
        }
        requestAnimationFrame(hold);
      });
    });
    const cutoff = await dust(page), coast = await state(page);
    expect(coast.elapsed).toBeGreaterThan(held.elapsed + .45);
    expect(coast.elapsed).toBeLessThan(held.elapsed + .75);
    expect(coast.thrust).toBeLessThan(.02); expect(cutoff.grains.length).toBeGreaterThan(0);
    const shared = before.grains.filter(p => cutoff.grains.some(q => q.id === p.id)); expect(shared.length).toBeGreaterThan(0);
    const trailTime = await page.evaluate(() => (window as any).MoonMissionPure.descentDust.trailTime);
    for (const p of shared) {
      const q = cutoff.grains.find(q => q.id === p.id), dt = q.age - p.age;
      expect(q.launchX).toBe(p.launchX); expect(q.launchZ).toBe(p.launchZ);
      expect(q.height).toBeCloseTo(p.height + p.verticalSpeed * dt - .5 * 1.624 * dt * dt, 9);
      expect(q.verticalSpeed).toBeCloseTo(p.verticalSpeed - 1.624 * dt, 9);
      if (p.age > trailTime) expect((q.x - p.x) / dt).toBeCloseTo((p.x - p.tailX) / trailTime, 8);
    }
    await capture(page, info, 'fallback-after-engine-cutoff'); await page.waitForTimeout(250); expect(await dust(page)).toEqual(cutoff);
    await page.locator('[data-descent-pause]').click(); await expect.poll(async () => (await state(page)).contact, { timeout: 15000 }).toBe(true);
    const impact = await state(page), landed = await receipts(page); expect(landed.landingAttempts).toHaveLength(1); expect(landed.missionXP).toBe(original.missionXP);
    await expect.poll(async () => (await dust(page)).grains.length, { timeout: 8000 }).toBe(0);
    expect(await state(page)).toEqual(impact); expect(await receipts(page)).toEqual(landed);
    await capture(page, info, 'fallback-settled-contact'); await modelNotes(page, 'desktop'); expect(errors).toEqual([]);
    await writeFile(join(REPORT, 'cutoff-evidence.json'), JSON.stringify({ held, before, coast, cutoff, impact, landed }, null, 2));
  });
  test('recorded firing and touchdown omit unrecorded dust while preserving the landing receipt', async ({ page }, info) => {
    await mount(page); const result = await page.evaluate(() => {
      const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
      const recording = P.newDescentRecording(); P.recordDescent(recording, s, false);
      for (let i = 0; i < 3000 && !s.contact; i++) { P.descentStep(s, { throttle: s.alt < 30 ? .5 : 0 }, 1 / 60); P.recordDescent(recording, s, !!s.contact); }
      if (!s.contact) throw Error('Fixture did not reach physical contact');
      return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(recording) };
    });
    const index = result.recording.samples.findIndex(p => p.alt > 0 && p.alt < 25 && p.throttle > .1); expect(index).toBeGreaterThan(0);
    await mount(page, seed({ landingResult: result, landingAttempts: [result], landingReviewIndex: index })); const saved = await receipts(page);
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'omitted-recording');
    expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'recorded-dust-omitted');
    await page.locator('[data-landing-scrub]').fill('0'); expect((await dust(page)).grains).toEqual([]);
    await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'live');
    expect((await dust(page)).grains).toEqual([]); expect(await receipts(page)).toEqual(saved);
    await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1, hVel: 2, fuel: 70 } }));
    expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'legacy-no-invented-dust');
  });
  test('320 px reduced-motion flight holds grains during pause and hidden intervals', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
    await pilotToDust(page); const held = await state(page), picture = await dust(page); expect(picture.capacity).toBe(90);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await capture(page, info, 'phone-ballistic-dust');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(350); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(250); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await capture(page, info, 'phone-dust-forced-colors');
  await modelNotes(page, 'phone-forced'); expect(await state(page)).toEqual(held);
    const note = page.locator('[data-descent-dust-note]');
    const box = await note.locator('..').boundingBox();
    await page.screenshot({ path: join(REPORT, 'phone-model-notes-forced.png'), fullPage: true,
      clip: { x: box!.x, y: box!.y + await page.evaluate(() => scrollY), width: box!.width, height: box!.height } });
  });
});

test('real WebGL consumes the same ballistic samples, draws dust pixels and retains grains on context loss', async ({ page }, info) => {
  const errors: string[] = [], shaderErrors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text())) shaderErrors.push(m.text()); });
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 }));
  await mount(page, seed(), true); await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await pilotToDust(page); const held = await state(page), picture = await dust(page);
  const projected = await page.evaluate(() => {
    const w = (window as any).__dustGL, g = w.dust.geometry, n = g.drawRange.count;
    return { count: n, positions: Array.from(g.attributes.position.array.slice(0, n * 3)), opacity: Array.from(g.attributes.opacity.array.slice(0, n)) };
  });
  expect(projected.count).toBe(picture.grains.length * 2);
  picture.grains.forEach((p, i) => {
    const head = (i * 2 + 1) * 3, tail = i * 2 * 3;
    expect(projected.positions[head]).toBeCloseTo((p.x - held.x) * .6, 4); expect(projected.positions[head + 2]).toBeCloseTo(p.z * .6, 4);
    expect(projected.positions[tail]).toBeCloseTo((p.tailX - held.x) * .6, 4);
    expect(projected.positions[head + 1] - projected.positions[tail + 1]).toBeCloseTo((p.height - p.tailHeight) * .6, 4);
    expect(projected.opacity[i * 2]).toBeCloseTo(p.opacity, 6); expect(projected.opacity[i * 2 + 1]).toBeCloseTo(p.opacity, 6);
  });
  await capture(page, info, 'webgl-ballistic-dust');
  const pixels = await page.evaluate(() => {
    const { renderer, scene, camera, dust } = (window as any).__dustGL, gl = renderer.getContext();
    const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    function read() { const a = new Uint8Array(width * height * 4); renderer.render(scene, camera); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; }
    const before = read(); dust.visible = false; const after = read(); dust.visible = true; renderer.render(scene, camera);
    let changed = 0, delta = 0; for (let i = 0; i < before.length; i += 4) {
      const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]);
      if (d) { changed++; delta += d; }
    }
    return { width, height, changed, delta };
  });
  expect(pixels.changed).toBeGreaterThan(5); expect(pixels.delta).toBeGreaterThan(0);
  await page.locator('select[data-descent-camera]').selectOption('landing');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'landing');
  expect(await dust(page)).toEqual(picture); expect(await state(page)).toEqual(held); await capture(page, info, 'webgl-landing-view-dust');
  await page.evaluate(() => (window as any).__dustGL.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'lost');
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0); expect(await dust(page)).toEqual(picture); expect(await state(page)).toEqual(held);
  await capture(page, info, 'context-loss-keeps-ballistic-dust'); expect(shaderErrors).toEqual([]); expect(errors).toEqual([]);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ held, picture, projected, pixels,
    contexts: await harness.glContexts(page), shaderErrors, errors }, null, 2));
});
