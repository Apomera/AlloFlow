import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-comparison');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const scaleRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(scaleRenderer,{construct(target,args){
    const renderer=Reflect.construct(target,args),render=renderer.render;
    renderer.render=function(scene,camera){window.__scaleCamera=camera;return render.call(this,scene,camera);};return renderer;}});` });

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any, data = {}, fallback = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1400, height: 1100 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
      return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args);
    };
  });
  await harness.mount(page, data, '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function compare(page: any, a: string, b: string, atlas = true) {
  const panel = page.locator('.sx-comparison-workbench');
  if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox', { name: 'First thing', exact: true }).selectOption(a);
  await panel.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption(b);
  await panel.getByRole('button', { name: 'Compare them', exact: true }).click();
  if (atlas) await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', a + ':' + b);
  else await expect(page.locator('.sx-comparison-diagram')).toBeVisible();
}
async function scene(page: any) {
  return page.evaluate(() => {
    const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost()), roots: any = {};
    record.scene.traverse((root: any) => {
      if (root.userData.itemId && root.visible) roots[root.userData.itemId] = { scale: root.scale.x, ruler: root.userData.ruler.visible };
    });
    return { roots, camera: (window as any).__scaleCamera.type };
  });
}

test('the shared 3D scene preserves dimensions through orbit, swaps, inspection and same-item comparisons', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await compare(page, 'earth', 'moon');
  const canvas = page.locator('[data-atlas-ready]');
  await expect(canvas).toHaveAttribute('aria-label', /^Shared scale comparison/);
  const initial = await scene(page);
  expect(initial.camera).toBe('OrthographicCamera');
  expect(initial.roots.earth.scale / initial.roots.moon.scale).toBeCloseTo(3.669, 2);
  expect(Object.values(initial.roots).every((root: any) => root.ruler)).toBe(true);
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-yaw', '0.2000');
  expect((await scene(page)).roots).toEqual(initial.roots);
  await page.locator('.sx-comparison-workbench').getByRole('button', { name: 'Swap specimens', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-comparison', 'moon:earth');
  expect((await scene(page)).roots).toEqual(initial.roots);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'earth-moon-studio.png') });
  await page.locator('.sx-comparison-summary').getByRole('button', { name: 'Inspect The Moon', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'moon');
  await expect(canvas).toHaveAttribute('data-atlas-projection', 'perspective');
  await expect(canvas).toHaveAttribute('aria-label', /^Interactive scale atlas/);
  await expect(canvas).toBeFocused();
  for (const [a, b] of [['honeybee', 'ladybird'], ['human', 'trex'], ['earth', 'earth']]) {
    await compare(page, a, b);
    const result = await scene(page);
    expect(Object.keys(result.roots)).toHaveLength(a === b ? 1 : 2);
    if (a === 'human') expect(result.roots.trex.scale / result.roots.human.scale).toBeCloseTo(12 / 1.7, 8);
  }
  await canvas.focus(); await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-atlas-comparison', '');
  expect(errors).toEqual([]);
});

test('subpixel locators, exact bridge navigation, notebook protection and recorded heights work together', async ({ page }) => {
  await mount(page, { unrelated: { keep: true }, _scaleExplorer: { observations: [{ itemId: 'human', you: true, size: 1.23, note: 'My recorded height.' }] } });
  await compare(page, 'human', 'earth');
  const canvas = page.locator('[data-atlas-ready]');
  const roots = (await scene(page)).roots;
  expect(roots.earth.scale / roots.human.scale).toBeCloseTo(12742000 / 1.7, 6);
  expect(Number(await canvas.getAttribute('data-atlas-small-pixels'))).toBeLessThan(2);
  const locator = page.locator('.sx-comparison-point[data-scale-comparison-point="human"]');
  await expect(locator).toBeVisible();
  await expect(page.locator('.sx-notebook').getByRole('button', { name: 'Save observation', exact: true })).toBeDisabled();
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'subpixel-locator.png') });
  await locator.click();
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  await expect(page.locator('.sx-notebook').getByRole('button', { name: 'Update observation', exact: true })).toBeEnabled();
  await compare(page, 'human', 'earth');
  const bridge = page.locator('.sx-scale-bridge'), step = bridge.locator('[data-bridge-step="1"]');
  await step.getByRole('button', { name: /^Go to scale step/ }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(17), 3);
  await expect(step).toContainText('Nearby example: A Tyrannosaurus rex, 12 m.');
  await bridge.getByRole('button', { name: 'Next scale step', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(170), 3);
  await step.getByRole('button', { name: /^Inspect/ }).click();
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'trex');
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(12), 3);
  await bridge.locator('[data-bridge-step]').last().getByRole('button', { name: /^Go to scale step/ }).click();
  await expect(bridge.getByRole('button', { name: 'Next scale step', exact: true })).toBeDisabled();
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'earth');
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('human');
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('120');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await compare(page, 'human', 'door');
  const personalized = (await scene(page)).roots;
  expect(personalized.door.scale / personalized.human.scale).toBeCloseTo(2 / 1.2, 8);
  const stored = await page.evaluate(() => (window as any).__toolData);
  expect(stored.unrelated).toEqual({ keep: true });
  expect(stored._scaleExplorer.observations[0].size).toBe(1.23);
  await harness.mount(page, stored, '!!document.querySelector("[data-atlas-ready]")');
  await page.getByText('Compare two sizes', { exact: true }).click();
  await expect(page.locator('.sx-comparison-workbench').getByRole('combobox', { name: 'First thing', exact: true })).toHaveValue('human');
  await expect(page.locator('.sx-comparison-workbench').getByRole('combobox', { name: 'Second thing', exact: true })).toHaveValue('door');
});

test('the phone diagram retains extreme ratios without WebGL and labels distance evidence', async ({ page }) => {
  await mount(page, {}, true);
  await page.setViewportSize({ width: 320, height: 800 });
  await compare(page, 'proton', 'universe', false);
  const widths = await page.locator('[data-comparison-bar]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('width'))));
  expect(widths[0]).toBeLessThan(1e-35); expect(widths[1]).toBe(520);
  await expect(page.locator('[data-comparison-locator="proton"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('.sx-comparison-summary').getByRole('button', { name: /Inspect a proton/i }).click();
  await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  await compare(page, 'human', 'alpha-cen-dist', false);
  const evidence = page.locator('.sx-comparison-evidence');
  await evidence.getByText('Measurement notes', { exact: true }).click();
  await expect(evidence).toContainText('Again a gap, not a size.');
  await expect(page.locator('.sx-comparison-summary')).toContainText('distance');
  await compare(page, 'earth', 'moon', false);
  const labels = await page.locator('.sx-comparison-diagram text').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height };
  }));
  for (let i = 1; i < labels.length; i++) expect(labels[i].top).toBeGreaterThan(labels[i - 1].bottom);
  expect(labels.every(label => label.height >= 11)).toBe(true);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'phone-diagram.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0);
});
