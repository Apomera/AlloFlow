# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-eye-study.spec.ts >> 3D eye study loads on demand, rotates, selects references, and releases resources
- Location: tests\e2e\dissection-eye-study.spec.ts:15:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-eye-study]').locator('[data-eye-canvas]')
Expected: "cornea"
Received: "lens"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-eye-study]').locator('[data-eye-canvas]')
    33 × locator resolved to <canvas width="792" tabindex="0" role="group" height="348" data-eye-shell="open" data-eye-canvas="true" data-eye-selected="lens" data-eye-rendered-view="anterior" data-eye-rendered-selection="lens" aria-describedby="diss-eye-study-controls" aria-label="Rotatable schematic eye. Selected structure: Lens" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home + -"></canvas>
       - unexpected value "lens"

```

```yaml
- 'group "Rotatable schematic eye. Selected structure: Lens"'
```

# Test source

```ts
  1   | 
  2   | import { test, expect } from '@playwright/test';
  3   | import { mkdir } from 'node:fs/promises';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  7   | const out = 'reports/dissection-enhancement-2026-09-08';
  8   | const state = { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal', toolbarStudyOpen: true,
  9   |   reducedMotion: true, soundEnabled: false, exploredOrgans: { 'sheepEye|cornea': true }, organNotes: { 'sheepEye|cornea': 'I observed the curved anterior surface.' },
  10  |   organConfidence: { 'sheepEye|cornea': 2 }, revealedLayers: {}, quizScore: 1, quizTotal: 2 };
  11  | 
  12  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  13  | test.afterAll(async () => { await harness.stop(); });
  14  | 
  15  | test('3D eye study loads on demand, rotates, selects references, and releases resources', async ({ page }) => {
  16  |   const errors: string[] = [];
  17  |   page.on('pageerror', error => errors.push(error.message));
  18  |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  19  |   await page.evaluate(() => {
  20  |     const original = (window as any).StemLab.ensureThree;
  21  |     (window as any).__eyeLoads = 0;
  22  |     (window as any).StemLab.ensureThree = function (options: any) { (window as any).__eyeLoads++; return original.call(this, options); };
  23  |   });
  24  |   await expect(page.locator('[data-eye-study]')).toHaveCount(0);
  25  |   expect(await page.evaluate(() => (window as any).__eyeLoads)).toBe(0);
  26  |   await page.locator('#diss-eye-study-toggle').click();
  27  |   const panel = page.locator('[data-eye-study]');
  28  |   const canvas = panel.locator('[data-eye-canvas]');
  29  |   await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  30  |   await expect(panel.locator('#diss-eye-study-title')).toBeFocused();
  31  |   expect(await page.evaluate(() => (window as any).__eyeLoads)).toBe(1);
  32  |   await canvas.scrollIntoViewIfNeeded();
  33  |   await expect.poll(() => canvas.evaluate((el: any) => el._dissEyeStudy.renderCount)).toBeGreaterThan(0);
  34  |   await panel.locator('[data-eye-part="optic_nerve"]').click();
  35  |   await expect(canvas).toHaveAttribute('data-eye-selected', 'optic_nerve');
  36  |   await expect(panel.locator('.diss-eye-study__reference')).toContainText('Light does not travel along it');
  37  |   await panel.getByRole('button', { name: 'Side', exact: true }).click();
  38  |   await canvas.focus();
  39  |   await page.keyboard.press('ArrowRight');
  40  |   await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'custom');
  41  |   await page.keyboard.press('Home');
  42  |   await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'oblique');
  43  |   await panel.getByRole('button', { name: 'Opened shell on', exact: true }).click();
  44  |   await expect(canvas).toHaveAttribute('data-eye-shell', 'whole');
  45  |   await panel.getByRole('button', { name: 'Open the shell', exact: true }).click();
  46  |   await panel.getByRole('button', { name: 'Anterior · cornea', exact: true }).click();
  47  |   await canvas.scrollIntoViewIfNeeded();
  48  |   await expect(canvas).toHaveAttribute('data-eye-rendered-view', 'anterior');
  49  |   const front = await canvas.boundingBox();
  50  |   await page.mouse.click(front!.x + front!.width / 2, front!.y + front!.height / 2);
> 51  |   await expect(canvas).toHaveAttribute('data-eye-selected', 'cornea');
      |                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  52  |   await panel.getByRole('button', { name: 'Overview', exact: true }).click();
  53  |   await panel.locator('[data-eye-part="lens"]').click();
  54  |   await canvas.scrollIntoViewIfNeeded();
  55  |   await expect(canvas).toHaveAttribute('data-eye-rendered-view', 'oblique');
  56  |   await expect(canvas).toHaveAttribute('data-eye-rendered-selection', 'lens');
  57  |   await panel.locator('.diss-eye-study__viewport').screenshot({ path: out + '/eye-3d-overview.png' });
  58  |   const bounds = await canvas.boundingBox();
  59  |   await page.mouse.move(bounds!.x + bounds!.width * .45, bounds!.y + bounds!.height * .5);
  60  |   await page.mouse.down();
  61  |   await page.mouse.move(bounds!.x + bounds!.width * .6, bounds!.y + bounds!.height * .55, { steps: 8 });
  62  |   await page.mouse.up();
  63  |   await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'custom');
  64  |   const actual = await page.evaluate(() => {
  65  |     const d = (window as any).__ctx.toolData.dissection;
  66  |     return { specimen: d.specimen, layer: d.activeLayer, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, revealed: d.revealedLayers, score: d.quizScore, total: d.quizTotal };
  67  |   });
  68  |   expect(actual).toEqual({ specimen: state.specimen, layer: state.activeLayer, explored: state.exploredOrgans, notes: state.organNotes, confidence: state.organConfidence, revealed: {}, score: 1, total: 2 });
  69  |   await canvas.evaluate((el: any) => { (window as any).__closedEye = el._dissEyeStudy; });
  70  |   await panel.getByRole('button', { name: 'Return to 2D dissection' }).click();
  71  |   await expect(panel).toHaveCount(0);
  72  |   await expect(page.locator('#diss-canvas')).toBeFocused();
  73  |   expect(await page.evaluate(() => (window as any).__closedEye.disposed)).toBe(true);
  74  |   expect(errors).toEqual([]);
  75  | });
  76  | 
  77  | test('phone eye study reflows and offers accessible nonvisual structure references', async ({ page }) => {
  78  |   await page.setViewportSize({ width: 390, height: 844 });
  79  |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  80  |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  81  |   await page.locator('#diss-eye-study-toggle').click();
  82  |   const panel = page.locator('[data-eye-study]');
  83  |   await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  84  |   await panel.getByRole('button', { name: 'Anterior · cornea', exact: true }).click();
  85  |   await panel.locator('[data-eye-part="iris"]').click();
  86  |   await panel.getByRole('button', { name: 'Focus 3D view', exact: true }).click();
  87  |   await expect(panel.locator('[data-eye-canvas]')).toBeFocused();
  88  |   await expect(panel.locator('[data-eye-canvas]')).toHaveAttribute('data-eye-rendered-view', 'anterior');
  89  |   await expect(panel.locator('[data-eye-canvas]')).toHaveAttribute('data-eye-rendered-selection', 'iris');
  90  |   await panel.locator('.diss-eye-study__viewport').screenshot({ path: out + '/eye-3d-anterior-mobile.png' });
  91  |   await panel.getByRole('button', { name: 'Overview', exact: true }).click();
  92  |   await panel.locator('.diss-eye-study__transcript summary').click();
  93  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  94  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-eye-study]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  95  |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  96  |   expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  97  |   await panel.screenshot({ path: out + '/eye-3d-study-mobile.png' });
  98  | });
  99  | 
  100 | test('3D failure and context recovery keep references and the 2D return available', async ({ page }) => {
  101 |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  102 |   await page.evaluate(() => { (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Offline fixture')); });
  103 |   await page.locator('#diss-eye-study-toggle').click();
  104 |   const panel = page.locator('[data-eye-study]');
  105 |   await expect(panel).toHaveAttribute('data-eye-status', 'unavailable');
  106 |   await panel.locator('[data-eye-part="retina"]').click();
  107 |   await expect(panel.locator('.diss-eye-study__reference')).toContainText('Light-sensitive tissue');
  108 |   await page.evaluate(() => { (window as any).StemLab.ensureThree = () => Promise.resolve((window as any).THREE); });
  109 |   await panel.getByRole('button', { name: 'Retry 3D', exact: true }).click();
  110 |   await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  111 |   const canvas = panel.locator('[data-eye-canvas]');
  112 |   await expect(canvas).toHaveAttribute('data-eye-selected', 'retina');
  113 |   await canvas.evaluate((el: HTMLCanvasElement) => {
  114 |     const gl = el.getContext('webgl2') || el.getContext('webgl');
  115 |     (window as any).__eyeContext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
  116 |     (window as any).__eyeContext.loseContext();
  117 |   });
  118 |   await expect(panel).toHaveAttribute('data-eye-status', 'lost');
  119 |   await page.evaluate(() => (window as any).__eyeContext.restoreContext());
  120 |   await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  121 |   await expect(canvas).toHaveAttribute('data-eye-selected', 'retina');
  122 |   await panel.getByRole('button', { name: 'Return to 2D dissection' }).click();
  123 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  124 | });
  125 | 
  126 | 
  127 | test('closing a pending 3D load cannot create a detached renderer', async ({ page }) => {
  128 |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  129 |   await page.evaluate(() => {
  130 |     const w = window as any;
  131 |     const Original = w.THREE.WebGLRenderer;
  132 |     w.__eyeRendererCount = 0;
  133 |     w.THREE.WebGLRenderer = function (options: any) { w.__eyeRendererCount++; return new Original(options); };
  134 |     w.StemLab.ensureThree = () => new Promise(resolve => { w.__resolveEye = resolve; });
  135 |   });
  136 |   await page.locator('#diss-eye-study-toggle').click();
  137 |   await expect.poll(() => page.evaluate(() => typeof (window as any).__resolveEye)).toBe('function');
  138 |   await page.locator('[data-eye-study]').getByRole('button', { name: 'Return to 2D dissection' }).click();
  139 |   await page.evaluate(async () => {
  140 |     (window as any).__resolveEye((window as any).THREE);
  141 |     await Promise.resolve(); await Promise.resolve();
  142 |   });
  143 |   expect(await page.evaluate(() => (window as any).__eyeRendererCount)).toBe(0);
  144 |   await expect(page.locator('[data-eye-study]')).toHaveCount(0);
  145 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  146 | });
  147 | 
  148 | 
```