# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-atlas.spec.ts >> real 3D models, scale travel, orbit, chart switching and clean teardown
- Location: tests\e2e\scale-explorer-atlas.spec.ts:27:5

# Error details

```
Error: Test timeout of 180000ms exceeded
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
  8   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1360, height: 900, layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
  9   | const out = path.resolve('reports/scale-explorer-realism');
  10  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  11  | test.afterAll(async () => { await harness.stop(); });
  12  | test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });
  13  | 
  14  | async function mount(page: any) {
  15  |   await page.setViewportSize({ width: 1400, height: 1050 });
  16  |   await harness.mount(page, {}, '!!document.querySelector("[data-atlas-ready]")');
  17  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select{font-family:inherit}' });
  18  | }
  19  | async function fly(page: any, id: string) {
  20  |   const destination = page.getByRole('combobox', { name: 'Choose a destination', exact: true });
  21  |   await destination.selectOption(id);
  22  |   await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', new RegExp('(^|,)' + id + '(,|$)'));
  23  |   // Wait for arrival, independently of the software renderer's frame rate.
  24  |   await expect.poll(async () => page.locator('[data-atlas-ready]').evaluate((el: HTMLElement) => Math.abs(Number(el.dataset.atlasTarget) - Number(el.dataset.atlasExponent)))).toBeLessThan(0.002);
  25  | }
  26  | 
  27  | test('real 3D models, scale travel, orbit, chart switching and clean teardown', async ({ page }) => {
  28  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  29  |   page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  30  |   await mount(page);
  31  |   const canvas = page.locator('[data-atlas-ready]');
  32  |   await expect(canvas).toHaveAttribute('data-atlas-surface', 'detailed');
  33  |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  34  |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  35  |   await page.locator('.sx-explorer').screenshot({ path: path.join(out, 'desktop.png') });
  36  |   for (const id of ['elephant', 'blue-whale', 'rbc', 'mitochondrion', 'virus', 'dna', 'carbon', 'earth', 'moon', 'jupiter', 'sun', 'milkyway', 'universe']) {
  37  |     await fly(page, id);
  38  |     if (['earth','moon','jupiter'].includes(id)) {
  39  |       await expect.poll(async () => page.evaluate(id => {
  40  |         const record=(window as any).__glRecorder.records.find((r: any)=>!r.ctx.isContextLost());
  41  |         let ready=false;record.scene.traverse((o:any)=>{if(o.userData.itemId===id)ready=o.userData.model.userData.imageryReady===true;});return ready;
  42  |       },id)).toBe(true);
  43  |     }
  44  |     await page.locator('.sx-stage').screenshot({ path: path.join(out, `${id}.png`) });
  45  |     expect(looksBlank(await harness.glPixels(page)), id).toBe(false);
  46  |   }
  47  |   await fly(page, 'human');
  48  |   await page.getByRole('button', { name: 'Size neighbors', exact: true }).click();
  49  |   await expect.poll(async () => (await canvas.getAttribute('data-atlas-objects'))!.split(',').length).toBeGreaterThan(1);
  50  |   await page.getByRole('button', { name: 'Size neighbors', exact: true }).click();
  51  |   await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  52  |   await page.getByRole('button', { name: 'Measurement', exact: true }).click();
  53  |   await expect(page.getByRole('button', { name: 'Measurement', exact: true })).toHaveAttribute('aria-pressed','false');
  54  |   await page.getByRole('button', { name: 'Measurement', exact: true }).click();
  55  |   const before = Number(await canvas.getAttribute('data-atlas-exponent'));
  56  |   await page.getByRole('button', { name: 'Explore 10× larger', exact: true }).click();
> 57  |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(before + 1, 2);
      |                                                                                           ^ Error: Test timeout of 180000ms exceeded
  58  |   await canvas.focus(); await page.keyboard.press('Home');
  59  |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(1.7), 2);
  60  |   await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  61  |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-0.2, 2);
  62  |   await canvas.focus(); await page.keyboard.press('d');
  63  |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-0.08, 2);
  64  |   await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  65  |   await expect(canvas).toHaveAttribute('data-atlas-yaw', '0.0000');
  66  |   for(let i=0;i<8;i++)await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  67  |   await expect.poll(async()=>Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-1.6,2);
  68  |   await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  69  |   const box = (await canvas.boundingBox())!;
  70  |   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  71  |   await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  72  |   await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeLessThan(-0.25);
  73  |   await page.getByRole('button', { name: 'Scale chart', exact: true }).click();
  74  |   await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  75  |   await expect.poll(async () => (await harness.glContexts(page)).filter(c => !c.lost).length).toBe(0);
  76  |   await page.getByRole('button', { name: 'Immersive 3D', exact: true }).click();
  77  |   await expect(page.locator('[data-atlas-ready]')).toBeVisible();
  78  |   expect(errors).toEqual([]);
  79  | });
  80  | 
  81  | test('phone, reduced motion, all destinations, height, comparisons, and context loss', async ({ page }) => {
  82  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  83  |   await mount(page);
  84  |   await page.setViewportSize({ width: 390, height: 844 });
  85  |   await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toBeDisabled();
  86  |   const ids = await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).locator('option').evaluateAll(nodes => nodes.map(n => (n as HTMLOptionElement).value));
  87  |   for (const id of ids) {
  88  |     await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  89  |     await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', new RegExp('(^|,)' + id + '(,|$)'));
  90  |   }
  91  |   const cached = await page.evaluate(() => {
  92  |     const r = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
  93  |     let count = 0; r.scene.traverse((o: any) => { if (o.userData.itemId) count++; }); return count;
  94  |   });
  95  |   expect(cached).toBeLessThanOrEqual(10);
  96  |   await fly(page, 'earth');
  97  |   await expect.poll(async () => page.evaluate(() => {
  98  |     const record=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());
  99  |     let ready=false;record.scene.traverse((o:any)=>{if(o.userData.itemId==='earth')ready=o.userData.model.userData.imageryReady===true;});return ready;
  100 |   })).toBe(true);
  101 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  102 |   await page.screenshot({ path: path.join(out, 'phone.png') });
  103 |   await fly(page, 'human');
  104 |   await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('120');
  105 |   await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  106 |   await page.locator('[data-atlas-ready]').scrollIntoViewIfNeeded();
  107 |   await expect.poll(async () => Number(await page.locator('[data-atlas-ready]').getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(1.2), 2);
  108 |   await page.getByText('Compare two sizes', { exact: true }).click();
  109 |   await page.locator('details[open] select').nth(0).selectOption('earth');
  110 |   await page.locator('details[open] select').nth(1).selectOption('sun');
  111 |   await page.getByRole('button', { name: 'Compare them', exact: true }).click();
  112 |   await expect(page.getByRole('status').filter({ hasText: /109 times/ })).toBeVisible();
  113 |   // Lose the actual context created by the tool, not a context manufactured by a test.
  114 |   await page.evaluate(() => {
  115 |     const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
  116 |     record.ctx.getExtension('WEBGL_lose_context').loseContext();
  117 |   });
  118 |   await expect(page.getByRole('status').filter({ hasText: 'The 3D view is unavailable.' })).toBeVisible();
  119 |   await expect(page.locator('.sx-comparison-diagram')).toBeVisible();
  120 |   await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('dna');
  121 |   await expect(page.getByRole('combobox', { name: 'Choose a destination', exact: true })).toHaveValue('dna');
  122 |   await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  123 | });
  124 | 
  125 | test('unavailable model and texture assets retain an interactive scene', async ({ page }) => {
  126 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  127 |   await page.route('**/makehuman-body-surface.glb', route => route.abort());
  128 |   await page.route('**/scale-earth-bluemarble-1k.png', route => route.abort());
  129 |   await mount(page);
  130 |   const canvas=page.locator('[data-atlas-ready]');
  131 |   await expect(canvas).toHaveAttribute('data-atlas-surface','procedural');
  132 |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  133 |   await fly(page,'earth');
  134 |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  135 |   await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  136 |   await expect.poll(async()=>Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(.2,2);
  137 |   await expect(page.getByRole('button',{name:'Immersive 3D',exact:true})).toHaveAttribute('aria-pressed','true');
  138 | });
  139 | 
```