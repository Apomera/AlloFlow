import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// The opt-in Feeding study: food sources in Free roam, guided food at each
// neighbor's scripted feeding spot, and a woodland identical to before when off.
test.use({ video: 'off', trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
// 140 unpaused free-roam frames cost ~2 s each under software GL: 5.7-8.6 min measured 10-27, so 300 s always flaked.
test.describe.configure({ timeout: 900_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.feedingWoodland={scene,camera,renderer};return render(scene,camera);};return renderer;};})();" });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = '[data-birdlab-3d-canvas]', card = '[data-birdlab-feeding-study]', toggle = '[data-birdlab-feeding-toggle]';
async function call(page: Page, method: string, value?: unknown): Promise<any> { return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value }); }
async function step(page: Page, frames = 2, ms = 100) { await page.evaluate(([frames, ms]) => { for (let i = 0; i < frames; i++) (window as any).feedingStep(ms); }, [frames, ms]); }
async function mount(page: Page) {
  await page.addInitScript(() => { let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; }; window.cancelAnimationFrame = id => { pending.delete(id); }; (window as any).feedingStep = (ms: number) => { now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.feedingWoodland", null, { polling: 50, timeout: 60_000 });
  await step(page, 3);
}
function scene(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).feedingWoodland.scene, props = s.getObjectByName('feeding-study-props'), guided = s.getObjectByName('guided-food-props');
    const instanced = (root: any) => { let n = 0; root?.traverse((o: any) => { if (o.isInstancedMesh) n++; }); return n; };
    return { props: props ? props.visible : null, guided: guided ? guided.visible : null, guidedMeshes: instanced(guided), feederPole: !!s.getObjectByName('feeder-pole') };
  });
}

test('free roam: food sources appear, birds feed and draw them down, and removal restores the woodland', async ({ page }) => {
  await mount(page);
  await expect(page.locator(card)).toHaveAttribute('data-birdlab-feeding-study', 'off');
  expect(await scene(page)).toMatchObject({ props: null, guided: null });
  await page.getByRole('button', { name: 'Free roam', exact: true }).click(); await step(page);
  await page.locator(toggle).click(); await step(page);
  await expect(page.locator(card)).toHaveAttribute('data-birdlab-feeding-study', 'on');
  await expect(page.locator(toggle)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-birdlab-food-source]')).toHaveCount(5);
  expect(await scene(page)).toMatchObject({ props: true, feederPole: true });
  await step(page, 140, 100);
  const state = await call(page, 'getState');
  const eating = state.wildlife.filter((row: any) => row.food);
  expect(eating.length).toBeGreaterThan(0);
  for (const row of eating) expect(row.behavior).toMatch(/^(Eating|Scratching|Pulling|Taking)/);
  expect(state.foodSources.some((source: any) => source.amount < 1)).toBe(true);
  await expect(page.locator('[data-birdlab-diet-progress]')).toHaveAttribute('data-birdlab-diet-progress', '0');
  await page.locator(toggle).click(); await step(page);
  await expect(page.locator(card)).toHaveAttribute('data-birdlab-feeding-study', 'off');
  expect(await scene(page)).toMatchObject({ props: false });
  const after = await call(page, 'getState');
  expect(after.foodSources).toEqual([]); expect(after.wildlife.every((row: any) => !row.food)).toBe(true);
});

test('guided study: each neighbor’s main food appears where it feeds, and follows the mode', async ({ page }) => {
  await mount(page);
  await page.locator(toggle).click(); await step(page);
  let current = await scene(page);
  expect(current.guided).toBe(true); expect(current.guidedMeshes).toBeGreaterThanOrEqual(10); expect(current.props).toBe(true);
  await expect(page.locator('[data-birdlab-food-source]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Free roam', exact: true }).click(); await step(page);
  current = await scene(page); expect(current.guided).toBe(false); expect(current.props).toBe(true);
  await page.getByRole('button', { name: 'Guided study', exact: true }).click(); await step(page);
  expect((await scene(page)).guided).toBe(true);
});

test('the feeding study card has no axe violations in either state', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Free roam', exact: true }).click(); await step(page);
  for (const pressed of [false, true]) {
    if (pressed) { await page.locator(toggle).click(); await step(page, 20); }
    const violations = await page.evaluate(async (selector) => {
      const result = await (window as any).axe.run(document.querySelector(selector), { resultTypes: ['violations'] });
      return result.violations.map((v: any) => v.id + ': ' + v.nodes.length);
    }, card);
    expect(violations).toEqual([]);
  }
});
