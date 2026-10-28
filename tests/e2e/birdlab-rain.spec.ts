import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

// Light rain: built only when chosen, visible from the guided view, falling
// on the scene clock, still under reduced motion, cleared without trace, and
// heard as a soft hiss when woodland sounds are on.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
const canvas = '[data-birdlab-3d-canvas]';
const probes = `window.AlloPostFXEnabled=false;(()=>{const O=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){const r=new O({...o,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.rainScene=scene;return render(scene,camera);};return r;};})();`;
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document', probes });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, ...args: any[]) { return page.locator(canvas).evaluate((n: any, a) => n._birdlab3d[a.method](...a.args), { method, args }); }
async function step(page: Page, n = 3) { return page.evaluate(c => { for (let i = 0; i < c; i++) (window as any).rainStep(); }, n); }
async function mount(page: Page, reduced: boolean, init?: () => void) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(() => { let time = 1000, id = 0; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = fn => { pending.set(++id, fn); return id; }; window.cancelAnimationFrame = id => pending.delete(id); (window as any).rainStep = () => { time += 100; const frames = [...pending.values()]; pending.clear(); frames.forEach(fn => fn(time)); }; });
  if (init) await page.addInitScript(init);
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.rainScene", null, { polling: 50 });
  return errors;
}
async function pixels(page: Page) {
  // A paused scene redraws only when marked dirty; re-pausing marks it.
  await call(page, 'setPaused', true); await step(page, 1);
  const image = await page.locator(canvas).evaluate((n: HTMLCanvasElement) => n.toDataURL('image/png'));
  return readPng(Buffer.from(image.split(',')[1], 'base64'));
}
const setRainVisible = (page: Page, visible: boolean) => page.evaluate(v => { (window as any).rainScene.getObjectByName('rain-shower').visible = v; }, visible);
async function rainLayer(page: Page) {
  await setRainVisible(page, true); const on = await pixels(page);
  await setRainVisible(page, false); const off = await pixels(page);
  await setRainVisible(page, true);
  const layer = new Float32Array(on.width * on.height); let total = 0;
  for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
    const a = on.at(x, y), b = off.at(x, y), d = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    layer[y * on.width + x] = d; total += d;
  }
  return { layer, mean: total / layer.length };
}
const layerChange = (a: Float32Array, b: Float32Array) => { let sum = 0; for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]); return sum / a.length; };
// Same moment, same camera, with the streaks falling versus held still.
async function fallShift(page: Page) {
  await call(page, 'seek', 21); await step(page, 2); const moving = await rainLayer(page);
  const motion = await page.evaluate(() => (window as any).rainScene.getObjectByName('rain-shower').userData.motion.value);
  await page.evaluate(() => { (window as any).rainScene.getObjectByName('rain-shower').userData.motion.value = 0; });
  const still = await rainLayer(page);
  await page.evaluate(v => { (window as any).rainScene.getObjectByName('rain-shower').userData.motion.value = v; }, motion);
  return { motion, mean: moving.mean, shift: layerChange(moving.layer, still.layer) };
}
const luminance = (png: any) => { let sum = 0, n = 0; for (let y = 0; y < png.height; y += 4) for (let x = 0; x < png.width; x += 4) { const [r, g, b] = png.at(x, y); sum += .2126 * r + .7152 * g + .0722 * b; n++; } return sum / n; };

test('light rain is built on demand, falls on the scene clock and clears without trace', async ({ page }) => {
  const errors = await mount(page, false);
  expect(await page.evaluate(() => !!(window as any).rainScene.getObjectByName('rain-shower'))).toBe(false);
  await call(page, 'seek', 21); await step(page, 2);
  const dry = luminance(await pixels(page));
  const rain = page.getByRole('button', { name: 'Light rain', exact: true });
  await rain.click(); await step(page, 2);
  await expect(rain).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-birdlab-weather]')).toHaveAttribute('data-birdlab-weather', 'rain');
  await expect(page.locator('[data-birdlab-rain-note]')).toBeVisible();
  expect((await call(page, 'getState')).weather).toBe('rain');
  const group = await page.evaluate(() => { const g = (window as any).rainScene.getObjectByName('rain-shower'); return { visible: g.visible, streaks: !!g.getObjectByName('rain-streaks'), ripples: g.getObjectByName('rain-ripples').visible }; });
  expect(group).toEqual({ visible: true, streaks: true, ripples: true });
  const fall = await fallShift(page);
  console.log('rain', JSON.stringify(fall));
  expect(fall.motion).toBe(1); expect(fall.mean).toBeGreaterThan(.3); expect(fall.shift).toBeGreaterThan(.15);
  expect(luminance(await pixels(page)), 'overcast darkens the scene').toBeLessThan(dry - 4);
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-3d-shell]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  await page.getByRole('button', { name: 'Clear', exact: true }).click(); await step(page, 2);
  expect(await page.evaluate(() => (window as any).rainScene.getObjectByName('rain-shower').visible)).toBe(false);
  await expect(page.locator('[data-birdlab-rain-note]')).toHaveCount(0);
  expect(Math.abs(luminance(await pixels(page)) - dry), 'clear sky restores the light').toBeLessThan(.5);
  expect(errors).toEqual([]);
});

test('reduced motion keeps the rain still and hides the ripples', async ({ page }) => {
  const errors = await mount(page, true);
  await page.getByRole('button', { name: 'Light rain', exact: true }).click(); await step(page, 2);
  const fall = await fallShift(page);
  expect(fall.motion).toBe(0); expect(fall.mean).toBeGreaterThan(.3); expect(fall.shift).toBe(0);
  expect(await page.evaluate(() => (window as any).rainScene.getObjectByName('rain-ripples').visible)).toBe(false);
  expect(errors).toEqual([]);
});

test('woodland sounds add a rain hiss only while it rains', async ({ page }) => {
  const errors = await mount(page, false, () => {
    const rec = { loops: 0, stops: 0 }; (window as any).__rainAudio = rec;
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = (extra: any = {}) => Object.assign({ connect(n: any) { return n; }, disconnect() {} }, extra);
    class FakeContext {
      state = 'running'; destination = node(); sampleRate = 8000;
      get currentTime() { return performance.now() / 1000; }
      resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createGain() { return node({ gain: param() }); }
      createBiquadFilter() { return node({ type: '', frequency: { value: 0 } }); }
      createOscillator() { return node({ type: 'sine', frequency: param(), start() {}, stop() {} }); }
      createStereoPanner() { return node({ pan: { value: 0 } }); }
      createBuffer(channels: number, length: number) { const data = new Float32Array(length); return { getChannelData: () => data }; }
      createBufferSource() { return node({ buffer: null, loop: false, start(this: any) { if (this.loop) rec.loops++; }, stop() { rec.stops++; } }); }
    }
    (window as any).AudioContext = FakeContext; (window as any).webkitAudioContext = FakeContext;
  });
  const rec = () => page.evaluate(() => (window as any).__rainAudio);
  await page.locator('[data-birdlab-sounds-toggle]').click();
  expect((await rec()).loops).toBe(0);
  await page.getByRole('button', { name: 'Light rain', exact: true }).click();
  await expect.poll(async () => (await rec()).loops).toBe(1);
  await expect(page.locator('[data-birdlab-rain-calls]')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect.poll(async () => (await rec()).stops).toBe(1);
  await page.getByRole('button', { name: 'Light rain', exact: true }).click();
  await expect.poll(async () => (await rec()).loops).toBe(2);
  await page.locator('[data-birdlab-sounds-toggle]').click();
  await expect.poll(async () => (await rec()).stops).toBe(2);
  expect(errors).toEqual([]);
});
