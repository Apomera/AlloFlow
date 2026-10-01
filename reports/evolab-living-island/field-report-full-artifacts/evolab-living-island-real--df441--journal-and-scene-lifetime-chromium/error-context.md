# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> real 3D expedition: inheritance, family, prediction, rewind, journal and scene lifetime
- Location: tests\e2e\evolab-living-island.spec.ts:12:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Pause evolution' })
    - locator resolved to <button type="button" class="ei-primary">Ⅱ Pause evolution</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdirSync } from 'node:fs';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | test.describe.configure({ timeout: 120_000, retries: 0, mode: 'serial' });
  6   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
  7   | const report = 'reports/evolab-living-island';
  8   | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  9   | test.afterAll(async () => { await harness.stop(); });
  10  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  11  | 
  12  | test('real 3D expedition: inheritance, family, prediction, rewind, journal and scene lifetime', async ({ page }) => {
  13  |   const errors: string[] = [];
  14  |   page.on('pageerror', err => errors.push(err.message));
  15  |   await page.setViewportSize({ width: 1440, height: 1100 });
  16  |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  17  |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  18  |   const initialContexts = await harness.glContexts(page);
  19  |   expect(initialContexts.some(r => r.createdBy === 'page' && r.draws > 0 && r.connected)).toBe(true);
  20  |   await page.selectOption('#ei-organism', '1');
  21  |   await page.getByRole('button', { name: 'Follow this family', exact: false }).click();
  22  |   await page.locator('.ei-app').screenshot({ path: report + '/island-desktop.png' });
  23  |   await page.getByRole('button', { name: 'Creature close-up' }).click();
  24  |   await page.locator('.ei-stage').screenshot({ path: report + '/creature-closeup.png' });
  25  |   await page.getByRole('button', { name: 'Island overview' }).click();
  26  |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  27  |   await page.selectOption('#ei-predict', 'more');
  28  |   await page.getByRole('button', { name: 'Lock my prediction' }).click();
  29  |   for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next generation' }).click();
  30  |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  31  |   await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
  32  |   await page.locator('.ei-app').screenshot({ path: report + '/winter-generation-five.png' });
  33  |   const contexts = await harness.glContexts(page);
  34  |   expect(contexts.filter(r => r.connected && !r.lost)).toHaveLength(1);
  35  |   expect(contexts.find(r => r.connected)?.id).toBe(initialContexts.find(r => r.connected)?.id);
  36  |   await page.locator('#ei-time').fill('0');
  37  |   await expect(page.getByRole('button', { name: 'Next generation' })).toBeDisabled();
  38  |   await page.getByRole('button', { name: 'Return to present' }).click();
  39  |   await page.getByRole('button', { name: 'Save finding to journal' }).click();
  40  |   const downloaded = page.waitForEvent('download');
  41  |   await page.getByRole('button', { name: 'Export CSV' }).click();
  42  |   expect((await downloaded).suggestedFilename()).toBe('living-island-2026.csv');
  43  |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  44  |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  45  |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  46  |   await expect(page.getByRole('button', { name: 'Play evolution', exact: false })).toBeVisible();
  47  |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  48  |   await expect(page.getByText('Five generations later:', { exact: false })).toBeVisible();
  49  |   await expect(page.getByText('Family of #1', { exact: true })).toBeVisible();
  50  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  51  |   const violations = await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))));
  52  |   expect(violations).toEqual([]);
  53  |   await page.selectOption('.ei-speed', '450');
  54  |   await page.getByRole('button', { name: 'Play evolution', exact: false }).click();
  55  |   await expect.poll(async () => Number(await page.locator('[data-island-generation]').getAttribute('data-island-generation'))).toBeGreaterThan(5);
> 56  |   await page.getByRole('button', { name: 'Pause evolution', exact: false }).click();
      |                                                                             ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  57  |   const paused = await page.locator('[data-island-generation]').getAttribute('data-island-generation');
  58  |   await page.waitForTimeout(600);
  59  |   expect(await page.locator('[data-island-generation]').getAttribute('data-island-generation')).toBe(paused);
  60  |   await page.evaluate(() => (window as any).__unmount());
  61  |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(0);
  62  |   await expect.poll(async () => (await harness.glContexts(page)).every(r => r.lost)).toBe(true);
  63  |   expect(errors).toEqual([]);
  64  | });
  65  | 
  66  | test('phone layout, reduced motion and keyboard-equivalent selection', async ({ page }) => {
  67  |   await page.setViewportSize({ width: 390, height: 844 });
  68  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  69  |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  70  |   await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '100%'; document.body.style.padding = '0'; });
  71  |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  72  |   await page.selectOption('#ei-organism', '3');
  73  |   await page.getByLabel('Animate wildlife while paused').check();
  74  |   const before = (await harness.glContexts(page)).find(r => r.connected)!.renders;
  75  |   await page.waitForTimeout(500);
  76  |   const after = (await harness.glContexts(page)).find(r => r.connected)!.renders;
  77  |   expect(after - before).toBeLessThanOrEqual(1);
  78  |   await page.getByRole('button', { name: 'Next generation' }).click();
  79  |   await page.getByRole('button', { name: 'Show parents', exact: true }).click();
  80  |   await page.selectOption('#ei-lens', 'legs');
  81  |   await page.getByText('Find two contrasting residents', { exact: true }).click();
  82  |   await page.getByRole('button', { name: 'Inspect lowest trait value', exact: true }).click();
  83  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  84  |   await page.locator('.ei-app').screenshot({ path: report + '/island-phone.png' });
  85  |   await page.locator('.ei-stage').screenshot({ path: report + '/island-phone-stage.png' });
  86  | });
  87  | 
  88  | test('volcanic terrain, scenic exploration and habitat changes preserve the experiment and release scenery', async ({ page }) => {
  89  |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  90  |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  91  |   const initial = await page.evaluate(() => {
  92  |     const w = window as any;
  93  |     const scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
  94  |     const terrain = scene.getObjectByName('Evolution island terrain');
  95  |     const positions = Array.from(terrain.geometry.attributes.position.array) as number[];
  96  |     const heights = positions.filter((_, i) => i % 3 === 1);
  97  |     const landscape = w.StemLab.evoIslandLandscape.create(2026);
  98  |     const errors: number[] = [];
  99  |     w.__islandDisposedInstances = 0;
  100 |     scene.traverse((o: any) => {
  101 |       if (o.isInstancedMesh) o.addEventListener('dispose', () => w.__islandDisposedInstances++);
  102 |       if (o.userData.islandResident) errors.push(Math.abs(o.position.y - landscape.sample(o.position.x, o.position.z).height - 0.025));
  103 |     });
  104 |     return { terrainId: terrain.geometry.uuid, positions, min: Math.min(...heights), max: Math.max(...heights), errors, colors: Array.from(terrain.geometry.attributes.color.array) };
  105 |   });
  106 |   expect(initial.max - initial.min).toBeGreaterThan(3);
  107 |   expect(initial.errors).toHaveLength(36);
  108 |   expect(Math.max(...initial.errors)).toBeLessThan(0.001);
  109 |   await page.locator('.ei-stage').screenshot({ path: report + '/volcanic-island.png' });
  110 |   for (const [name, file] of [['Lava coast', 'lava-coast'], ['Highlands', 'highlands']]) {
  111 |     await page.getByRole('button', { name, exact: true }).click();
  112 |     await page.locator('.ei-stage').screenshot({ path: report + '/' + file + '.png' });
  113 |     await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  114 |     await expect(page.locator('#ei-organism option')).toHaveCount(37);
  115 |   }
  116 |   await page.getByRole('button', { name: 'Island', exact: true }).click();
  117 |   for (const [name, file] of [['Dry season', 'dry-season'], ['Forest returns', 'forest-season']]) {
  118 |     await page.getByRole('button', { name, exact: false }).click();
  119 |     await page.locator('.ei-stage').screenshot({ path: report + '/' + file + '.png' });
  120 |   }
  121 |   const changed = await page.evaluate(() => {
  122 |     const w = window as any;
  123 |     const scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
  124 |     const terrain = scene.getObjectByName('Evolution island terrain');
  125 |     return { terrainId: terrain.geometry.uuid, positions: Array.from(terrain.geometry.attributes.position.array), colors: Array.from(terrain.geometry.attributes.color.array), disposed: w.__islandDisposedInstances };
  126 |   });
  127 |   expect(changed.terrainId).toBe(initial.terrainId);
  128 |   expect(changed.positions).toEqual(initial.positions);
  129 |   expect(changed.colors).not.toEqual(initial.colors);
  130 |   expect(changed.disposed).toBe(5);
  131 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  132 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost)).toHaveLength(1);
  133 | });
  134 | 
  135 | test('3D failure retains the complete simulation in a habitat map', async ({ page }) => {
  136 |   await page.addInitScript(() => {
  137 |     const get = HTMLCanvasElement.prototype.getContext;
  138 |     HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  139 |   });
  140 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  141 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
  142 |   await page.getByRole('button', { name: 'Inspect Spriglet 1', exact: true }).click();
  143 |   await page.getByRole('button', { name: 'Next generation' }).click();
  144 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  145 |   await page.selectOption('#ei-lens', 'fur');
  146 |   await page.getByText('Read every measurement', { exact: true }).click();
  147 |   await expect(page.locator('.ei-lens-table tbody tr')).toHaveCount(await page.locator('.ei-map-creature').count());
  148 |   await expect(page.locator('.ei-map-creature').first()).toHaveAccessibleName(/Insulation/);
  149 |   const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  150 |   await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  151 |   await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  152 |   await expect(page.locator('[data-island-scene="fallback"]')).toHaveCount(2);
  153 |   await expect(page.getByRole('button', { name: 'Creature close-up', exact: true })).toHaveCount(0);
  154 |   await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  155 |   await expect(page.locator('[data-trial-island="a"] [data-trial-generation]')).toHaveAttribute('data-trial-generation', '2');
  156 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
```