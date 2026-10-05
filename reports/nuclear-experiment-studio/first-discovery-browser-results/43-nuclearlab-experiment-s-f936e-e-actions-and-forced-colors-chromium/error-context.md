# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided first discovery fits at 320px with larger text, visible actions, and forced colors
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1447:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 14

- Array []
+ Array [
+   Object {
+     "id": "color-contrast",
+     "nodes": Array [
+       Object {
+         "summary": "Fix any of the following:
+   Element has insufficient color contrast of 1.31 (foreground color: #d0e3f5, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "target": Array [
+           ".ns-scene-note",
+         ],
+       },
+     ],
+   },
+ ]
```

# Test source

```ts
  1   | import { readFileSync, mkdirSync } from 'node:fs';
  2   | import { test, expect } from '@playwright/test';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_nuclearlab.js', toolId: 'nuclearLab', appStyles: true, width: 1100, height: 1200, layout: 'document' });
  6   | const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  7   | const output = 'reports/nuclear-experiment-studio';
  8   | test.describe.configure({ timeout: 120_000, retries: 0, mode: 'serial' });
  9   | // These checks save explicit screenshots. Avoid recording a video of the long
  10  | // reference page, which can stall context teardown on the shared Windows host.
  11  | test.use({ video: 'off' });
  12  | test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  13  | test.afterAll(async () => { await harness.stop(); });
  14  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  15  | 
  16  | async function mount(page: any, state = { nkStudio: { mission: 'decay' } }) {
  17  |   await harness.mount(page, { _nuclearLab: state }, undefined, { expectCanvas: false });
  18  |   await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '100%'; wrap.style.maxWidth = '1100px'; });
  19  | }
  20  | async function chooseExperiment(page: any, id: string) {
  21  |   await page.locator('.ns-chooser > summary').click();
  22  |   await page.locator(`[data-ns-mission="${id}"]`).click();
  23  |   await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
  24  | }
  25  | async function audit(page: any) {
  26  |   await page.addScriptTag({ content: axe });
  27  |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.nk-workspace', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })));
> 28  |   expect(violations).toEqual([]);
      |                      ^ Error: expect(received).toEqual(expected) // deep equality
  29  | }
  30  | 
  31  | test('a keyboard learner completes both experiments and retains progress between views', async ({ page }) => {
  32  |   const errors: string[] = [];
  33  |   page.on('pageerror', error => errors.push(error.message));
  34  |   await page.setViewportSize({ width: 1200, height: 1000 });
  35  |   await mount(page);
  36  |   await expect(page.locator('[data-nk-sec]')).toHaveCount(0);
  37  |   await page.screenshot({ path: `${output}/studio-desktop.png`, fullPage: true });
  38  |   await audit(page);
  39  |   await page.getByRole('button', { name: '32', exact: true }).focus();
  40  |   await page.keyboard.press('Enter');
  41  |   const advance = page.getByRole('button', { name: 'Advance one half-life' });
  42  |   await advance.focus();
  43  |   await page.keyboard.press('Enter');
  44  |   await page.keyboard.press('Enter');
  45  |   await expect(page.locator('.ns-result')).toContainText('you predicted 32');
  46  |   await page.getByRole('button', { name: 'Each interval halves' }).click();
  47  |   await chooseExperiment(page, 'shield');
  48  |   await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  49  |   await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  50  |   const slider = page.getByRole('slider', { name: 'Thickness' });
  51  |   await slider.focus();
  52  |   await page.keyboard.press('ArrowRight');
  53  |   await expect(slider).toHaveValue('2.5');
  54  |   await page.getByRole('button', { name: 'Test this shield' }).click();
  55  |   await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  56  |   await page.getByRole('group', { name: 'Material to test' }).getByRole('button', { name: 'Lead' }).click();
  57  |   await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  58  |   await page.getByRole('button', { name: 'Test this shield' }).click();
  59  |   await expect(page.locator('[data-ns-reading]')).toHaveText('14.6%');
  60  |   await page.getByRole('button', { name: 'At the same thickness, different' }).click();
  61  |   await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  62  |   await page.screenshot({ path: `${output}/shield-comparison.png`, fullPage: true });
  63  |   await audit(page);
  64  |   await page.getByRole('button', { name: 'Reactor control room', exact: true }).click();
  65  |   await expect(page.locator('[data-nk-sec]')).toHaveCount(1);
  66  |   await expect(page.locator('#rx-rods')).toBeVisible();
  67  |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  68  |   await expect(page.getByRole('region', { name: 'Experiment studio' })).toBeFocused();
  69  |   await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  70  |   expect(errors).toEqual([]);
  71  | });
  72  | 
  73  | for (const width of [390, 320]) {
  74  |   test(`controls precede the notebook and fit at ${width}px with larger text`, async ({ page }) => {
  75  |     await page.setViewportSize({ width, height: 844 });
  76  |     await page.emulateMedia({ reducedMotion: 'reduce' });
  77  |     await mount(page, { nkStudio: { mission: 'decay' }, nkLargeText: true, nkReduceMotion: true });
  78  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  79  |     const controls = await page.locator('.ns-controls').boundingBox();
  80  |     const notebook = await page.locator('[data-ns-notebook]').boundingBox();
  81  |     expect(controls!.y + controls!.height).toBeLessThanOrEqual(notebook!.y);
  82  |     expect(await page.locator('.ns-atom').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  83  |     await page.screenshot({ path: `${output}/studio-mobile-${width}.png`, fullPage: true });
  84  |     await audit(page);
  85  |     await chooseExperiment(page, 'shield');
  86  |     await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  87  |     await page.getByRole('button', { name: 'Test this shield' }).click();
  88  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  89  |     await page.screenshot({ path: `${output}/shield-mobile-${width}.png`, fullPage: true });
  90  |     await audit(page);
  91  |     for (const kind of ['distance', 'rays', 'counting', 'chain']) {
  92  |       await chooseExperiment(page, kind);
  93  |       if (kind === 'rays') {
  94  |         await page.getByRole('button', { name: 'Alpha only', exact: true }).click();
  95  |         for (const setup of ['alpha-open', 'alpha-paper', 'gamma-paper']) await page.locator(`[data-ns-setup="${setup}"]`).click();
  96  |         await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  97  |       }
  98  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  99  |       const introControls = await page.locator('.ns-controls').boundingBox();
  100 |       const introNotebook = await page.locator('[data-ns-notebook]').boundingBox();
  101 |       expect(introControls!.y + introControls!.height).toBeLessThanOrEqual(introNotebook!.y);
  102 |       await page.screenshot({ path: `${output}/${kind}-mobile-${width}.png`, fullPage: true });
  103 |       await audit(page);
  104 |     }
  105 |   });
  106 | }
  107 | 
  108 | test('light palette and forced colors preserve readable selected states', async ({ page }) => {
  109 |   await page.setViewportSize({ width: 1100, height: 950 });
  110 |   await mount(page);
  111 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  112 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  113 |   await page.screenshot({ path: `${output}/studio-light.png`, fullPage: true });
  114 |   await audit(page);
  115 |   for (const kind of ['distance', 'rays', 'counting', 'chain']) {
  116 |     await chooseExperiment(page, kind);
  117 |     await page.screenshot({ path: `${output}/${kind}-light.png`, fullPage: true });
  118 |     await audit(page);
  119 |   }
  120 |   await page.emulateMedia({ forcedColors: 'active' });
  121 |   await expect(page.getByRole('button', { name: 'Experiment studio', exact: true })).toHaveCSS('outline-style', 'solid');
  122 |   await page.screenshot({ path: `${output}/studio-forced-colors.png`, fullPage: true });
  123 | });
  124 | 
  125 | test('distance readings follow the model and a completed discovery leads to radiation paths', async ({ page }) => {
  126 |   await page.setViewportSize({ width: 1100, height: 1000 });
  127 |   await mount(page, { nkStudio: { mission: 'distance', completed: ['decay'] } });
  128 |   await page.getByRole('button', { name: 'Half as much', exact: true }).click();
```