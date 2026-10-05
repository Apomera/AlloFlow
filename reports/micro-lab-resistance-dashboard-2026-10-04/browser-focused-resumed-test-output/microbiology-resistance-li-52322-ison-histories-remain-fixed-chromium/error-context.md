# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-live-visuals.spec.ts >> keyboard step and play-pause update real live counts and visuals while the saved notebook and comparison histories remain fixed
- Location: tests\e2e\microbiology-resistance-live-visuals.spec.ts:198:5

# Error details

```
Error: expect(locator).toHaveJSProperty(expected) failed

Locator:  locator('#micro-resistance-population')
Expected: "DL"
Received: "SECTION"
Timeout:  15000ms

Call log:
  - Expect "toHaveJSProperty" with timeout 15000ms
  - waiting for locator('#micro-resistance-population')
    33 × locator resolved to <section id="micro-resistance-population" aria-labelledby="micro-resistance-population-title">…</section>
       - unexpected value "SECTION"

```

```yaml
- region "Population counts":
  - heading "Population counts" [level=4]
  - term: Sensitive
  - definition: "72"
  - term: Resistant
  - definition: "8"
  - term: Unoccupied
  - definition: "0"
  - paragraph: The bar uses all 80 model positions. Resistant share uses living cells only.
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, writeFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ retries: 0, timeout: 150000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-resistance-dashboard-2026-10-04');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  11  | const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
  12  | const dish = (page: Page) => page.locator('#micro-resistance-dish');
  13  | const trend = (page: Page) => page.locator('[data-resistance-trend] svg');
  14  | const comparison = (page: Page) => page.locator('#micro-resistance-comparison');
  15  | const playback = (page: Page) => page.locator('#micro-resistance-playback');
  16  | const selection = (page: Page) => page.getByLabel('Shared comparison round', { exact: true });
  17  | const literal = '<img src=x onerror="window.__liveVisualInjected=true"> Keep imported evidence literal.';
  18  | const originalNote = 'Keep the original uncertainty and observations. '.repeat(20);
  19  | let errors: string[];
  20  | 
  21  | const partial = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: 'Current culture notes.',
  22  |   history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 6 }, { day: 2, sensitive: 20, resistant: 3 }],
  23  |   runAwarded: true, explanationAwarded: false };
  24  | const snapshotB = { ...clone(partial), dose: 90, notes: literal,
  25  |   history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }, { day: 2, sensitive: 0, resistant: 4 }] };
  26  | function seed() {
  27  |   return { tab: 'resistance', showMicroLibrary: false, earnedXP: 53, resistanceInvestigation: clone(partial),
  28  |     resistanceNotebook: { records: [
  29  |       { id: 7, evidence: clone(partial), reviewNote: originalNote, importedRecord: { literal, keep: [1, 2] } },
  30  |       { id: 4, evidence: clone(snapshotB), reviewNote: literal }
  31  |     ], selectedId: 7, nextId: 40, importedNotebook: { literal }, removed: { record: { id: 30, evidence: clone(snapshotB), reviewNote: originalNote }, index: 1, importedRecovery: true } },
  32  |     resistanceComparison: { aId: 7, bId: 4, round: null, rawPreference: { literal } },
  33  |     growthLab: { profile: 'ecoli', tempC: 18, pH: 7, oxygen: 100, hypothesis: 'Keep the Growth hypothesis.' },
  34  |     metadata: { literal, keep: true } };
  35  | }
  36  | async function open(details: Locator) {
  37  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
  38  |     await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  39  |   }
  40  |   await expect(details).toHaveAttribute('open', '');
  41  | }
  42  | async function mount(page: Page, data = seed()) {
  43  |   await page.setViewportSize({ width: 1280, height: 960 });
  44  |   await harness.mount(page, { unrelatedTool: { note: literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  45  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  46  |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(data.resistanceInvestigation.history.length - 1);
  47  |   await page.evaluate(() => {
  48  |     const w = window as any; w.__liveVisualXP = []; w.__liveVisualRandom = 0;
  49  |     w.__ctx.awardXP = (...args: any[]) => w.__liveVisualXP.push(args);
  50  |     if (!w.__liveVisualOriginalRandom) {
  51  |       w.__liveVisualOriginalRandom = Math.random;
  52  |       Math.random = () => { w.__liveVisualRandom++; return w.__liveVisualOriginalRandom(); };
  53  |     }
  54  |     w.__rerender();
  55  |   });
  56  |   await expect(dish(page)).toBeVisible(); await expect(playback(page)).toBeVisible();
  57  | }
  58  | const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__liveVisualXP, random: (window as any).__liveVisualRandom }));
  59  | const savedPaths = (page: Page) => page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  60  | async function assertPopulation(page: Page, sensitive: number, resistant: number) {
  61  |   const counts = { sensitive, resistant, unoccupied: 80 - sensitive - resistant };
  62  |   await expect(dish(page).locator('[data-resistance-cell]')).toHaveCount(80);
  63  |   const widths: Record<string, number> = {};
  64  |   for (const [kind, count] of Object.entries(counts)) {
  65  |     await expect(dish(page).locator('[data-resistance-cell="' + kind + '"]')).toHaveCount(count);
  66  |     const readout = page.locator('[data-resistance-population="' + kind + '"]');
  67  |     await expect(readout).toHaveText(String(count));
  68  |     const segment = page.locator('[data-resistance-capacity="' + kind + '"]');
  69  |     await expect(segment).toHaveAttribute('data-count', String(count));
  70  |     widths[kind] = (await segment.boundingBox())!.width;
  71  |   }
  72  |   const totalWidth = Object.values(widths).reduce((sum, width) => sum + width, 0);
  73  |   expect(totalWidth).toBeGreaterThan(100);
  74  |   for (const [kind, count] of Object.entries(counts)) expect(widths[kind] / totalWidth).toBeCloseTo(count / 80, 2);
> 75  |   await expect(page.locator('#micro-resistance-population')).toHaveJSProperty('tagName', 'DL');
      |                                                              ^ Error: expect(locator).toHaveJSProperty(expected) failed
  76  |   await expect(page.locator('#micro-resistance-capacity')).toHaveAttribute('aria-hidden', 'true');
  77  |   await expect(dish(page).locator('[data-resistance-cell="sensitive"]:not(circle)')).toHaveCount(0);
  78  |   await expect(dish(page).locator('[data-resistance-cell="resistant"]:not(polygon)')).toHaveCount(0);
  79  | }
  80  | async function trendGeometry(page: Page) {
  81  |   return trend(page).evaluate(node => {
  82  |     const svg = node as SVGSVGElement;
  83  |     return {
  84  |       grids: [...svg.querySelectorAll('[data-resistance-trend-level]')].map(line => ({
  85  |         value: Number(line.getAttribute('data-resistance-trend-level')), x1: Number(line.getAttribute('x1')),
  86  |         x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2'))
  87  |       })),
  88  |       observations: [...svg.querySelectorAll('[data-resistance-observation]')].map(point => {
  89  |         const box = (point as SVGGraphicsElement).getBBox();
  90  |         return { day: Number(point.getAttribute('data-resistance-observation')), value: Number(point.getAttribute('data-value')),
  91  |           x: box.x + box.width / 2, y: box.y + box.height / 2, tag: point.tagName.toLowerCase() };
  92  |       }),
  93  |       path: svg.querySelector('polyline')?.getAttribute('points') || '',
  94  |       circles: [...svg.querySelectorAll('circle')].map(circle => ({ x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) }))
  95  |     };
  96  |   });
  97  | }
  98  | async function assertTrend(page: Page, history: { day: number; sensitive: number; resistant: number }[], duration: number) {
  99  |   const geometry = await trendGeometry(page);
  100 |   expect(geometry.grids.map(grid => grid.value).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  101 |   const bottom = geometry.grids.find(grid => grid.value === 0)!, top = geometry.grids.find(grid => grid.value === 100)!;
  102 |   expect(bottom.y1).toBeGreaterThan(top.y1); expect(bottom.x2).toBeGreaterThan(bottom.x1);
  103 |   for (const grid of geometry.grids) {
  104 |     expect(grid.x1).toBeCloseTo(bottom.x1, 5); expect(grid.x2).toBeCloseTo(bottom.x2, 5);
  105 |     expect(grid.y1).toBeCloseTo(bottom.y1 - grid.value / 100 * (bottom.y1 - top.y1), 5); expect(grid.y2).toBeCloseTo(grid.y1, 5);
  106 |   }
  107 |   const living = history.filter(point => point.sensitive + point.resistant > 0);
  108 |   expect(geometry.observations.map(point => point.day)).toEqual(living.map(point => point.day));
  109 |   for (const [index, point] of geometry.observations.entries()) {
  110 |     const value = living[index].resistant / (living[index].sensitive + living[index].resistant) * 100;
  111 |     expect(point.tag).toBe('polygon'); expect(point.value).toBeCloseTo(value, 8);
  112 |     expect(point.x).toBeCloseTo(bottom.x1 + living[index].day / duration * (bottom.x2 - bottom.x1), 3);
  113 |     expect(point.y).toBeCloseTo(bottom.y1 - value / 100 * (bottom.y1 - top.y1), 3);
  114 |   }
  115 |   if (geometry.path) {
  116 |     const coordinates = geometry.path.trim().split(/\s+/).map(pair => pair.split(',').map(Number));
  117 |     expect(coordinates.every(pair => pair.length === 2 && pair.every(Number.isFinite))).toBe(true);
  118 |     expect(coordinates).toHaveLength(geometry.observations.length);
  119 |     coordinates.forEach((pair, index) => { expect(pair[0]).toBeCloseTo(geometry.observations[index].x, 3); expect(pair[1]).toBeCloseTo(geometry.observations[index].y, 3); });
  120 |     expect(Math.max(...coordinates.map(pair => pair[0]))).toBeLessThan(bottom.x2);
  121 |   }
  122 |   const current = history[history.length - 1], total = current.sensitive + current.resistant;
  123 |   expect(geometry.circles).toHaveLength(total ? 1 : 0);
  124 |   if (total) {
  125 |     const point = geometry.circles[0];
  126 |     expect(point.x).toBeCloseTo(bottom.x1 + current.day / duration * (bottom.x2 - bottom.x1), 3);
  127 |     expect(point.y).toBeCloseTo(bottom.y1 - Math.round(current.resistant / total * 100) / 100 * (bottom.y1 - top.y1), 3);
  128 |   }
  129 |   await expect(trend(page)).toHaveAttribute('role', 'img');
  130 |   await expect(trend(page)).toHaveAttribute('aria-label', /^Resistance trend/);
  131 |   await expect(trend(page).locator('text')).toHaveCount(0);
  132 |   return geometry;
  133 | }
  134 | async function assertLayout(page: Page) {
  135 |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  136 |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  137 |   for (const node of [dish(page), page.locator('#micro-resistance-population'), page.locator('#micro-resistance-capacity'),
  138 |     page.locator('[data-resistance-trend]'), page.locator('#micro-resistance-live-readout'), playback(page)]) {
  139 |     await expect(node).toBeVisible();
  140 |     const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  141 |     expect(layout.scroll <= layout.client + 1, JSON.stringify(layout)).toBe(true);
  142 |   }
  143 |   for (const node of [page.locator('#micro-resistance-live-readout'), page.locator('[data-resistance-population="resistant"]')]) {
  144 |     expect(await node.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  145 |   }
  146 |   const order = await playback(page).evaluate(element => {
  147 |     const prediction = document.querySelector('#micro-resistance-prediction')!, chart = document.querySelector('[data-resistance-trend]')!;
  148 |     return { beforePrediction: Boolean(element.compareDocumentPosition(prediction) & Node.DOCUMENT_POSITION_FOLLOWING),
  149 |       afterTrend: Boolean(element.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_PRECEDING),
  150 |       gap: (element.getBoundingClientRect().top - chart.getBoundingClientRect().bottom) / (parseFloat(getComputedStyle(document.body).zoom) || 1) };
  151 |   });
  152 |   expect(order.beforePrediction).toBe(true); expect(order.afterTrend).toBe(true);
  153 |   expect(order.gap).toBeGreaterThanOrEqual(-1); expect(order.gap).toBeLessThan(320);
  154 |   for (const button of [playback(page).getByRole('button', { name: '▶ Play', exact: true }), playback(page).getByRole('button', { name: 'Step round', exact: true })]) {
  155 |     await button.focus(); await expect(button).toBeFocused();
  156 |     const style = await button.evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  157 |     expect(style.outline).not.toBe('none'); expect(style.width).toBeGreaterThan(0);
  158 |   }
  159 | }
  160 | 
  161 | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  162 | test.afterAll(async () => { await harness.stop(); });
  163 | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  164 | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  165 | 
  166 | test('restored live dish, numeric population and fixed-capacity segments agree without modifying saved or imported evidence', async ({ page }) => {
  167 |   await mount(page); const before = clone(await state(page)); await assertPopulation(page, 20, 3);
  168 |   await expect(page.locator('#micro-resistance-live-readout')).toContainText(/2.*13%/);
  169 |   await expect(dish(page)).toHaveAttribute('role', 'img');
  170 |   await expect(dish(page)).toHaveAccessibleName(/^Petri dish/);
  171 |   const description = [await dish(page).getAttribute('aria-labelledby'), await dish(page).getAttribute('aria-describedby')].filter(Boolean).join(' ').trim();
  172 |   for (const id of description ? description.split(/\s+/) : []) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
  173 |   await open(comparison(page)); await open(page.locator('#micro-resistance-history-data'));
  174 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  175 |   expect(before.microbiology.resistanceNotebook.records[0].reviewNote).toBe(originalNote);
```