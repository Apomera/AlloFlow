import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

// Seasons: autumn colours the broadleaf crowns, winter drops their leaves,
// covers the ground in snow, sends the towhee south and turns a shower into
// snow. Summer keeps the woodland as built, with no seasonal shader attached.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
const canvas = '[data-birdlab-3d-canvas]';
const probes = `window.AlloPostFXEnabled=false;(()=>{const O=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){const r=new O({...o,preserveDrawingBuffer:true}),render=r.render.bind(r);window.seasonRenderer=r;r.render=function(scene,camera){window.seasonScene=scene;return render(scene,camera);};return r;};})();`;
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document', probes });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, ...args: any[]) { return page.locator(canvas).evaluate((n: any, a) => n._birdlab3d[a.method](...a.args), { method, args }); }
async function step(page: Page, n = 3) { return page.evaluate(c => { for (let i = 0; i < c; i++) (window as any).seasonStep(); }, n); }
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { let time = 1000, id = 0; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = fn => { pending.set(++id, fn); return id; }; window.cancelAnimationFrame = id => pending.delete(id); (window as any).seasonStep = () => { time += 100; const frames = [...pending.values()]; pending.clear(); frames.forEach(fn => fn(time)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.seasonScene", null, { polling: 50 });
  return errors;
}
async function frame(page: Page) {
  await call(page, 'setPaused', true); await step(page, 1);
  const image = await page.locator(canvas).evaluate((n: HTMLCanvasElement) => n.toDataURL('image/png'));
  return readPng(Buffer.from(image.split(',')[1], 'base64'));
}
// Mean colour of the lower third of the frame, where the clearing floor is.
async function floor(page: Page) {
  const png = await frame(page); let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.floor(png.height * .7); y < png.height; y += 3) for (let x = 0; x < png.width; x += 3) { const p = png.at(x, y); r += p[0]; g += p[1]; b += p[2]; n++; }
  return { r: r / n, g: g / n, b: b / n };
}
const visible = (page: Page, name: string) => page.evaluate(n => { const o = (window as any).seasonScene.getObjectByName(n); return o ? o.visible : null; }, name);
const seasonKeys = (page: Page) => page.evaluate(() => { let n = 0; (window as any).seasonScene.traverse((o: any) => { if (o.material && o.material.userData && o.material.userData.blSeason) n++; }); return n; });

test('summer keeps the woodland as built, then the season buttons change it', async ({ page }) => {
  const errors = await mount(page);
  await call(page, 'setCamera', 'wide'); await call(page, 'seek', 9); await step(page, 2);
  expect(await seasonKeys(page), 'no seasonal shader before a season is chosen').toBe(0);
  const summer = await floor(page);
  const group = page.getByRole('group', { name: 'Woodland season' });
  await expect(group.getByRole('button', { name: 'Summer' })).toHaveAttribute('aria-pressed', 'true');

  await group.getByRole('button', { name: 'Spring' }).click(); await step(page, 2);
  expect((await call(page, 'getState')).season).toBe('spring');
  expect(await visible(page, 'spring-wildflowers')).toBe(true);
  await expect(page.locator('[data-birdlab-season-note="spring"]')).toContainText('Birdsong');
  await group.getByRole('button', { name: 'Autumn' }).click(); await step(page, 2);
  expect(await visible(page, 'spring-wildflowers'), 'wildflowers are over by autumn').toBe(false);
  expect((await call(page, 'getState')).season).toBe('autumn');
  expect(await visible(page, 'individual-leaf-sprays')).toBe(true);
  expect(await seasonKeys(page)).toBeGreaterThan(8);
  await expect(page.locator('[data-birdlab-season-note="autumn"]')).toBeVisible();

  await group.getByRole('button', { name: 'Winter' }).click(); await step(page, 2);
  await call(page, 'setCamera', 'wide'); await call(page, 'seek', 9); await step(page, 2);
  expect(await visible(page, 'individual-leaf-sprays')).toBe(false);
  expect(await visible(page, 'fine-meadow-grasses')).toBe(false);
  expect(await visible(page, 'airy-needle-boughs'), 'pines keep their needles').toBe(true);
  const winter = await floor(page);
  const bright = (c: { r: number; g: number; b: number }) => (c.r + c.g + c.b) / 3;
  expect(bright(winter), 'snow lies on the clearing floor').toBeGreaterThan(bright(summer) + 45);
  expect(winter.b, 'snow is not tinted green or brown').toBeGreaterThan(winter.g - 6);
  await expect(page.locator('[data-birdlab-season-note="winter"]')).toContainText('towhee');
  await expect(page.locator('[data-birdlab-tracks-note]')).toContainText('side-by-side pairs');
  await expect(page.locator('[data-birdlab-food-season="winter"]')).toContainText('earthworms');
  await expect(page.locator('[data-birdlab-resident-camera="easternTowhee"]')).toHaveCount(0);
  await expect(page.locator('[data-birdlab-resident-camera="chickadee"]')).toHaveCount(1);
  expect((await call(page, 'getState')).wildlife.map((b: any) => b.id)).not.toContain('easternTowhee');

  // A shower becomes light snow.
  const weather = page.getByRole('group', { name: 'Woodland weather' });
  await weather.getByRole('button', { name: 'Light snow' }).click(); await step(page, 2);
  expect(await visible(page, 'winter-snowfall')).toBe(true);
  expect(await visible(page, 'rain-shower')).not.toBe(true);
  await page.locator('[data-birdlab-predict="snow"]').getByRole('button', { name: 'Fluff their feathers and shelter' }).click();
  await expect(page.locator('[data-birdlab-snow-note]')).toBeVisible();
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-3d-shell]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);

  await group.getByRole('button', { name: 'Summer' }).click(); await step(page, 2);
  expect(await visible(page, 'winter-snowfall')).toBe(false);
  expect(await visible(page, 'rain-shower')).toBe(true);
  expect(await visible(page, 'individual-leaf-sprays')).toBe(true);
  await expect(weather.getByRole('button', { name: 'Light rain' })).toBeVisible();
  await expect(page.locator('[data-birdlab-resident-camera="easternTowhee"]')).toHaveCount(1);
  const programs = await page.evaluate(() => ((window as any).seasonRenderer.info.programs || []).filter((p: any) => p.diagnostics && !p.diagnostics.runnable).length);
  expect(programs, 'every season program compiles').toBe(0);
  expect(errors).toEqual([]);
});
