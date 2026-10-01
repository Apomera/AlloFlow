# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-comparison.spec.ts >> the shared 3D scene preserves dimensions through orbit, swaps, inspection and same-item comparisons
- Location: tests\e2e\scale-explorer-comparison.spec.ts:50:5

# Error details

```
Error: locator.screenshot: ENOSPC: no space left on device, write
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  3   | import { mkdirSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
  7   | test.use({ video: 'off', trace: 'off' });
  8   | const out = path.resolve('reports/scale-explorer-comparison');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  10  |   layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  11  |   probes: `const scaleRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(scaleRenderer,{construct(target,args){
  12  |     const renderer=Reflect.construct(target,args),render=renderer.render;
  13  |     renderer.render=function(scene,camera){window.__scaleCamera=camera;return render.call(this,scene,camera);};return renderer;}});` });
  14  | 
  15  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  16  | test.afterAll(async () => { await harness.stop(); });
  17  | test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });
  18  | 
  19  | async function mount(page: any, data = {}, fallback = false) {
  20  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  21  |   await page.setViewportSize({ width: 1400, height: 1100 });
  22  |   if (fallback) await page.addInitScript(() => {
  23  |     const original = HTMLCanvasElement.prototype.getContext;
  24  |     HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
  25  |       return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args);
  26  |     };
  27  |   });
  28  |   await harness.mount(page, data, '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  29  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  30  | }
  31  | async function compare(page: any, a: string, b: string, atlas = true) {
  32  |   const panel = page.locator('.sx-comparison-workbench');
  33  |   if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  34  |   await panel.getByRole('combobox', { name: 'First thing', exact: true }).selectOption(a);
  35  |   await panel.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption(b);
  36  |   await panel.getByRole('button', { name: 'Compare them', exact: true }).click();
  37  |   if (atlas) await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', a + ':' + b);
  38  |   else await expect(page.locator('.sx-comparison-diagram')).toBeVisible();
  39  | }
  40  | async function scene(page: any) {
  41  |   return page.evaluate(() => {
  42  |     const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost()), roots: any = {};
  43  |     record.scene.traverse((root: any) => {
  44  |       if (root.userData.itemId && root.visible) roots[root.userData.itemId] = { scale: root.scale.x, ruler: root.userData.ruler.visible };
  45  |     });
  46  |     return { roots, camera: (window as any).__scaleCamera.type };
  47  |   });
  48  | }
  49  | 
  50  | test('the shared 3D scene preserves dimensions through orbit, swaps, inspection and same-item comparisons', async ({ page }) => {
  51  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  52  |   await mount(page);
  53  |   await compare(page, 'earth', 'moon');
  54  |   const canvas = page.locator('[data-atlas-ready]');
  55  |   await expect(canvas).toHaveAttribute('aria-label', /^Shared scale comparison/);
  56  |   const initial = await scene(page);
  57  |   expect(initial.camera).toBe('OrthographicCamera');
  58  |   expect(initial.roots.earth.scale / initial.roots.moon.scale).toBeCloseTo(3.669, 2);
  59  |   expect(Object.values(initial.roots).every((root: any) => root.ruler)).toBe(true);
  60  |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  61  |   await page.getByRole('button', { name: 'Orbit right', exact: true }).click();
  62  |   await expect(canvas).toHaveAttribute('data-atlas-yaw', '0.2000');
  63  |   expect((await scene(page)).roots).toEqual(initial.roots);
  64  |   await page.locator('.sx-comparison-workbench').getByRole('button', { name: 'Swap specimens', exact: true }).click();
  65  |   await expect(canvas).toHaveAttribute('data-atlas-comparison', 'moon:earth');
  66  |   expect((await scene(page)).roots).toEqual(initial.roots);
> 67  |   await page.locator('.sx-stage').screenshot({ path: path.join(out, 'earth-moon-studio.png') });
      |                                   ^ Error: locator.screenshot: ENOSPC: no space left on device, write
  68  |   await page.locator('.sx-comparison-summary').getByRole('button', { name: 'Inspect The Moon', exact: true }).click();
  69  |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'moon');
  70  |   await expect(canvas).toHaveAttribute('data-atlas-projection', 'perspective');
  71  |   await expect(canvas).toHaveAttribute('aria-label', /^Interactive scale atlas/);
  72  |   await expect(canvas).toBeFocused();
  73  |   for (const [a, b] of [['honeybee', 'ladybird'], ['human', 'trex'], ['earth', 'earth']]) {
  74  |     await compare(page, a, b);
  75  |     const result = await scene(page);
  76  |     expect(Object.keys(result.roots)).toHaveLength(a === b ? 1 : 2);
  77  |     if (a === 'human') expect(result.roots.trex.scale / result.roots.human.scale).toBeCloseTo(12 / 1.7, 8);
  78  |   }
  79  |   await canvas.focus(); await page.keyboard.press('Escape');
  80  |   await expect(canvas).toHaveAttribute('data-atlas-comparison', '');
  81  |   expect(errors).toEqual([]);
  82  | });
  83  | 
  84  | test('subpixel locators, exact bridge navigation, notebook protection and recorded heights work together', async ({ page }) => {
  85  |   await mount(page, { unrelated: { keep: true }, _scaleExplorer: { observations: [{ itemId: 'human', you: true, size: 1.23, note: 'My recorded height.' }] } });
  86  |   await compare(page, 'human', 'earth');
  87  |   const canvas = page.locator('[data-atlas-ready]');
  88  |   const roots = (await scene(page)).roots;
  89  |   expect(roots.earth.scale / roots.human.scale).toBeCloseTo(12742000 / 1.7, 6);
  90  |   expect(Number(await canvas.getAttribute('data-atlas-small-pixels'))).toBeLessThan(2);
  91  |   const locator = page.locator('.sx-comparison-point[data-scale-comparison-point="human"]');
  92  |   await expect(locator).toBeVisible();
  93  |   await expect(page.locator('.sx-notebook').getByRole('button', { name: 'Save observation', exact: true })).toBeDisabled();
  94  |   await page.locator('.sx-stage').screenshot({ path: path.join(out, 'subpixel-locator.png') });
  95  |   await locator.click();
  96  |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  97  |   await expect(page.locator('.sx-notebook').getByRole('button', { name: 'Update observation', exact: true })).toBeEnabled();
  98  |   await compare(page, 'human', 'earth');
  99  |   const bridge = page.locator('.sx-scale-bridge'), step = bridge.locator('[data-bridge-step="1"]');
  100 |   await step.getByRole('button', { name: /^Go to scale step/ }).click();
  101 |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(17), 3);
  102 |   await expect(step).toContainText('Nearby example: A Tyrannosaurus rex, 12 m.');
  103 |   await bridge.getByRole('button', { name: 'Next scale step', exact: true }).click();
  104 |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(170), 3);
  105 |   await step.getByRole('button', { name: /^Inspect/ }).click();
  106 |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'trex');
  107 |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(12), 3);
  108 |   await bridge.locator('[data-bridge-step]').last().getByRole('button', { name: /^Go to scale step/ }).click();
  109 |   await expect(bridge.getByRole('button', { name: 'Next scale step', exact: true })).toBeDisabled();
  110 |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'earth');
  111 |   await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('human');
  112 |   await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('120');
  113 |   await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  114 |   await compare(page, 'human', 'door');
  115 |   const personalized = (await scene(page)).roots;
  116 |   expect(personalized.door.scale / personalized.human.scale).toBeCloseTo(2 / 1.2, 8);
  117 |   const stored = await page.evaluate(() => (window as any).__toolData);
  118 |   expect(stored.unrelated).toEqual({ keep: true });
  119 |   expect(stored._scaleExplorer.observations[0].size).toBe(1.23);
  120 |   await harness.mount(page, stored, '!!document.querySelector("[data-atlas-ready]")');
  121 |   await page.getByText('Compare two sizes', { exact: true }).click();
  122 |   await expect(page.locator('.sx-comparison-workbench').getByRole('combobox', { name: 'First thing', exact: true })).toHaveValue('human');
  123 |   await expect(page.locator('.sx-comparison-workbench').getByRole('combobox', { name: 'Second thing', exact: true })).toHaveValue('door');
  124 | });
  125 | 
  126 | test('the phone diagram retains extreme ratios without WebGL and labels distance evidence', async ({ page }) => {
  127 |   await mount(page, {}, true);
  128 |   await page.setViewportSize({ width: 320, height: 800 });
  129 |   await compare(page, 'proton', 'universe', false);
  130 |   const widths = await page.locator('[data-comparison-bar]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('width'))));
  131 |   expect(widths[0]).toBeLessThan(1e-35); expect(widths[1]).toBe(520);
  132 |   await expect(page.locator('[data-comparison-locator="proton"]')).toBeVisible();
  133 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  134 |   await page.locator('.sx-comparison-summary').getByRole('button', { name: /Inspect a proton/i }).click();
  135 |   await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  136 |   await compare(page, 'human', 'alpha-cen-dist', false);
  137 |   const evidence = page.locator('.sx-comparison-evidence');
  138 |   await evidence.getByText('Measurement notes', { exact: true }).click();
  139 |   await expect(evidence).toContainText('Again a gap, not a size.');
  140 |   await expect(page.locator('.sx-comparison-summary')).toContainText('distance');
  141 |   await compare(page, 'earth', 'moon', false);
  142 |   const labels = await page.locator('.sx-comparison-diagram text').evaluateAll(nodes => nodes.map(node => {
  143 |     const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height };
  144 |   }));
  145 |   for (let i = 1; i < labels.length; i++) expect(labels[i].top).toBeGreaterThan(labels[i - 1].bottom);
  146 |   expect(labels.every(label => label.height >= 11)).toBe(true);
  147 |   await page.locator('.sx-stage').screenshot({ path: path.join(out, 'phone-diagram.png') });
  148 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  149 |   expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0);
  150 | });
  151 | 
```