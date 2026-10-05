# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-growth-visual-inspection.spec.ts >> phone, four-hundred-percent zoom, reduced-motion and forced-colour layouts keep labels and marker shapes readable with keyboard focus
- Location: tests\e2e\microbiology-growth-visual-inspection.spec.ts:264:5

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /rgba\(0, 0, 0, 0\)|transparent/
Received string:  "rgba(255, 255, 255, 0)"
```

# Test source

```ts
  43  |   };
  44  | }
  45  | async function instrument(page: Page) {
  46  |   await page.evaluate(() => {
  47  |     const w = window as any; w.__growthVisualXP = []; w.__growthVisualRandom = 0;
  48  |     w.__ctx.awardXP = (...args: any[]) => w.__growthVisualXP.push(args);
  49  |     if (!w.__growthVisualOriginalRandom) {
  50  |       w.__growthVisualOriginalRandom = Math.random;
  51  |       Math.random = () => { w.__growthVisualRandom++; return w.__growthVisualOriginalRandom(); };
  52  |     }
  53  |     w.__rerender();
  54  |   });
  55  | }
  56  | async function mount(page: Page, data = seed()) {
  57  |   await page.setViewportSize({ width: 1280, height: 960 });
  58  |   await harness.mount(page, { unrelatedNotebook: { literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  59  |   await page.addStyleTag({ content: layoutStyle });
  60  |   await instrument(page);
  61  |   await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
  62  | }
  63  | async function open(details: Locator) {
  64  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
  65  |     const summary = details.locator(':scope > summary'); await summary.focus(); await summary.press('Enter');
  66  |   }
  67  |   await expect(details).toHaveAttribute('open', '');
  68  | }
  69  | async function oracle(page: Page, control = base, conditions = trialConditions): Promise<ModelCurves> {
  70  |   // Read the established simulator independently of the chart and its selected-hour helpers.
  71  |   return page.evaluate(({ control, conditions }) => {
  72  |     const model = (window as any).__MicrobiologyCore.growth;
  73  |     return { control: model.simulate(control).points, trial: model.simulate(conditions).points };
  74  |   }, { control, conditions });
  75  | }
  76  | function withHour(before: any, hour: number) {
  77  |   const expected = clone(before); expected.microbiology.growthReviewHour = hour; return expected;
  78  | }
  79  | async function selectors(page: Page, hour: number) {
  80  |   for (const [id, name] of [['gl-chart-hour', 'Chart model hour'], ['gl-evidence-hour', 'Model hour to cite'], ['gl-review-hour', 'Inspect model hour']]) {
  81  |     await expect(page.locator('#' + id)).toHaveAccessibleName(name);
  82  |     await expect(page.locator('#' + id)).toHaveValue(String(hour));
  83  |   }
  84  | }
  85  | async function assertChart(page: Page, expected: ModelCurves, hour: number) {
  86  |   await expect(figure(page)).toBeVisible(); await expect(figure(page)).toHaveJSProperty('tagName', 'FIGURE');
  87  |   await expect(figure(page)).toHaveClass(/\bmicro-growth-figure\b/);
  88  |   await expect(chart(page)).toHaveAttribute('viewBox', '0 0 100 100');
  89  |   await expect(chart(page)).toHaveAttribute('role', 'img');
  90  |   expect(await chart(page).getAttribute('aria-label')).toBeTruthy();
  91  |   await expect(chart(page).locator('text')).toHaveCount(0);
  92  |   const geometry = await chart(page).evaluate(node => {
  93  |     const svg = node as SVGSVGElement;
  94  |     return {
  95  |       grids: [...svg.querySelectorAll('[data-growth-level]')].map(line => ({ level: Number(line.getAttribute('data-growth-level')),
  96  |         x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
  97  |       series: [...svg.querySelectorAll('[data-growth-series]')].map(line => ({ name: line.getAttribute('data-growth-series'), d: line.getAttribute('d') || '' })),
  98  |       guides: [...svg.querySelectorAll('[data-growth-hour-guide]')].map(line => ({ hour: Number(line.getAttribute('data-growth-hour-guide')),
  99  |         x1: Number(line.getAttribute('x1')), x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
  100 |     };
  101 |   });
  102 |   expect(geometry.grids.map(grid => grid.level).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  103 |   for (const grid of geometry.grids) expect(grid).toEqual({ level: grid.level, x1: 0, x2: 100, y1: 100 - grid.level, y2: 100 - grid.level });
  104 |   expect(geometry.series.map(series => series.name).sort()).toEqual(['control', 'trial']);
  105 |   for (const series of geometry.series) {
  106 |     const coordinates = [...series.d.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)].map(match => [Number(match[1]), Number(match[2])]);
  107 |     const points = expected[series.name as keyof ModelCurves];
  108 |     expect(coordinates).toHaveLength(25); expect(points).toHaveLength(25);
  109 |     points.forEach((point, index) => {
  110 |       expect(coordinates[index][0]).toBeCloseTo(point.hour / 24 * 100, 3);
  111 |       expect(coordinates[index][1]).toBeCloseTo(100 - point.population, 3);
  112 |     });
  113 |   }
  114 |   expect(geometry.guides).toHaveLength(1);
  115 |   expect(geometry.guides[0].hour).toBe(hour);
  116 |   expect(geometry.guides[0].x1).toBeCloseTo(hour / 24 * 100, 8);
  117 |   expect(geometry.guides[0].x2).toBeCloseTo(hour / 24 * 100, 8);
  118 |   expect(geometry.guides[0].y1).toBe(0); expect(geometry.guides[0].y2).toBe(100);
  119 |   const rendered = await page.locator('#gl-growth-plot').evaluate(element => {
  120 |     const plot = element.getBoundingClientRect(), svg = element.querySelector('svg') as SVGSVGElement;
  121 |     const guide = svg.querySelector('[data-growth-hour-guide]')!.getBoundingClientRect();
  122 |     const markers = [...element.querySelectorAll('[data-growth-selected-marker]')].map(marker => {
  123 |       const box = marker.getBoundingClientRect(), style = getComputedStyle(marker), shape = marker.querySelector('span')!, shapeStyle = getComputedStyle(shape);
  124 |       const matrix = new DOMMatrix(shapeStyle.transform === 'none' ? undefined : shapeStyle.transform);
  125 |       return { name: marker.getAttribute('data-growth-selected-marker'), hour: Number(marker.getAttribute('data-hour')), value: Number(marker.getAttribute('data-value')),
  126 |         centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, width: parseFloat(style.width), height: parseFloat(style.height),
  127 |         innerCount: marker.querySelectorAll('span').length, innerWidth: parseFloat(shapeStyle.width), innerHeight: parseFloat(shapeStyle.height),
  128 |         borderWidth: parseFloat(shapeStyle.borderTopWidth), borderRadius: shapeStyle.borderTopLeftRadius, background: shapeStyle.backgroundColor,
  129 |         rotation: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI };
  130 |     });
  131 |     return { plot: { x: plot.x, y: plot.y, width: plot.width, height: plot.height }, guideX: guide.x + guide.width / 2, markers };
  132 |   });
  133 |   expect(rendered.markers.map(marker => marker.name).sort()).toEqual(['control', 'trial']);
  134 |   expect(Math.abs(rendered.guideX - (rendered.plot.x + hour / 24 * rendered.plot.width))).toBeLessThan(1);
  135 |   for (const marker of rendered.markers) {
  136 |     const value = expected[marker.name as keyof ModelCurves][hour].population;
  137 |     expect(marker.hour).toBe(hour); expect(marker.value).toBeCloseTo(value, 8); expect(marker.innerCount).toBe(1);
  138 |     expect(Math.abs(marker.centerX - (rendered.plot.x + hour / 24 * rendered.plot.width))).toBeLessThan(1);
  139 |     expect(Math.abs(marker.centerY - (rendered.plot.y + (100 - value) / 100 * rendered.plot.height))).toBeLessThan(1);
  140 |     expect(marker.height).toBe(marker.width); expect(marker.innerWidth).toBeCloseTo(marker.width, 4); expect(marker.innerHeight).toBeCloseTo(marker.height, 4);
  141 |     if (marker.name === 'control') {
  142 |       expect(marker.width).toBe(18); expect(marker.borderWidth).toBeGreaterThanOrEqual(3); expect(marker.borderRadius).toBe('50%');
> 143 |       expect(marker.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
      |                                 ^ Error: expect(received).toMatch(expected)
  144 |     } else { expect(marker.width).toBe(11); expect(marker.rotation).toBeCloseTo(45, 2); expect(marker.borderWidth).toBeGreaterThan(0); }
  145 |   }
  146 |   const ticks = await page.locator('#gl-growth-axes').evaluate(element => {
  147 |     const axis = element.querySelector(':scope > div')!;
  148 |     return [...axis.querySelectorAll('span')].map(label => {
  149 |       const level = Number(label.textContent), box = label.getBoundingClientRect();
  150 |       const line = document.querySelector('#gl-growth-chart [data-growth-level="' + level + '"]')!.getBoundingClientRect();
  151 |       return { level, centerY: box.y + box.height / 2, gridY: line.y + line.height / 2, fontSize: parseFloat(getComputedStyle(label).fontSize) };
  152 |     });
  153 |   });
  154 |   expect(ticks.map(tick => tick.level)).toEqual([100, 75, 50, 25, 0]);
  155 |   for (const tick of ticks) { expect(Math.abs(tick.centerY - tick.gridY)).toBeLessThan(1); expect(tick.fontSize).toBeGreaterThanOrEqual(14); }
  156 |   const controlPopulation = expected.control[hour].population, trialPopulation = expected.trial[hour].population;
  157 |   const difference = trialPopulation - controlPopulation;
  158 |   const values = page.locator('#gl-growth-hour-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  159 |   await expect(values.locator('dt')).toHaveCount(3);
  160 |   for (const [name, value] of [['control', controlPopulation], ['trial', trialPopulation], ['difference', difference]] as const) {
  161 |     const readout = values.locator('[data-growth-hour-value="' + name + '"]');
  162 |     expect(Number(await readout.getAttribute('data-value'))).toBeCloseTo(value, 8);
  163 |     await expect(readout).toHaveText((name === 'difference' && value > 0 ? '+' : '') + value.toFixed(1));
  164 |     expect(await readout.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  165 |   }
  166 |   await expect(page.locator('#gl-growth-selected-hour')).toHaveText('Selected model hour: ' + hour);
  167 | }
  168 | async function assertLayout(page: Page) {
  169 |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  170 |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  171 |   for (const node of [figure(page), page.locator('#gl-growth-axes'), page.locator('#gl-growth-hour-values')]) {
  172 |     const bounds = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  173 |     expect(bounds.scroll <= bounds.client + 1, JSON.stringify(bounds)).toBe(true);
  174 |   }
  175 |   const selector = page.locator('#gl-chart-hour'); await selector.focus(); await expect(selector).toBeFocused();
  176 |   const style = await selector.evaluate(element => {
  177 |     const s = getComputedStyle(element), box = element.getBoundingClientRect();
  178 |     return { outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth), height: parseFloat(s.height), fontSize: parseFloat(s.fontSize), x: box.x, right: box.right };
  179 |   });
  180 |   expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThan(0);
  181 |   expect(style.height).toBeGreaterThanOrEqual(42); expect(style.fontSize).toBeGreaterThanOrEqual(14);
  182 |   expect(style.x).toBeGreaterThanOrEqual(0); expect(style.right).toBeLessThanOrEqual(viewport.width + 1);
  183 | }
  184 | function readQuotedCSV(csv: string): Record<string, string>[] {
  185 |   const records: string[][] = []; let row: string[] = [];
  186 |   const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  187 |   expect(cells.map(cell => cell[0]).join('')).toBe(csv);
  188 |   for (const cell of cells) { row.push(cell[1].replace(/""/g, '"')); if (cell[2] !== ',') { records.push(row); row = []; } }
  189 |   const [headings, ...data] = records;
  190 |   return data.map(values => { expect(values).toHaveLength(headings.length); return Object.fromEntries(headings.map((heading, index) => [heading, values[index]])); });
  191 | }
  192 | async function download(page: Page, button: Locator, filename: string) {
  193 |   const pending = page.waitForEvent('download'); await button.focus(); await button.press('Enter');
  194 |   const downloaded = await pending; expect(downloaded.suggestedFilename()).toBe(filename);
  195 |   const file = path.join(out, filename); await downloaded.saveAs(file); return readQuotedCSV(readFileSync(file, 'utf8'));
  196 | }
  197 | 
  198 | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  199 | test.afterAll(async () => { await harness.stop(); });
  200 | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  201 | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  202 | 
  203 | test('restored selected-hour geometry uses the saved original control while preserving imported evidence and the next-run draft', async ({ page }) => {
  204 |   await mount(page); const before = clone(await state(page));
  205 |   const expected = await oracle(page), incorrectCurrent = await oracle(page, nextControl);
  206 |   expect(expected.control[6].population).not.toBeCloseTo(incorrectCurrent.control[6].population, 2);
  207 |   await assertChart(page, expected, 6);
  208 |   await expect(page.locator('#gl-hypothesis')).toHaveValue('Next-run reasoning remains independent.');
  209 |   await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation);
  210 |   await expect(page.locator('.micro-growth-result-head')).toContainText('Observed result: Similar population');
  211 |   await expect(page.locator('.micro-growth-result-head')).toContainText('Original prediction: Similar population');
  212 |   await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  213 |   expect(await page.evaluate(() => Boolean((window as any).__growthVisualInjected))).toBe(false);
  214 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  215 |   await figure(page).screenshot({ path: path.join(out, 'growth-chart-desktop.png') });
  216 | });
  217 | 
  218 | test('chart, citation and review selectors synchronize hours zero, six and twenty-four without changing full curves or final outcomes', async ({ page }) => {
  219 |   await mount(page); await open(page.locator('.micro-growth-review'));
  220 |   await open(page.locator('#gl-growth-data-table').locator('xpath=ancestor::details[1]'));
  221 |   const expected = await oracle(page), originalPaths = await paths(page), result = await page.locator('.micro-growth-result-head').innerText();
  222 |   const finalMetrics = await page.locator('.micro-growth-metrics').innerText();
  223 |   for (const [id, hour] of [['gl-chart-hour', 0], ['gl-evidence-hour', 6], ['gl-review-hour', 24]] as const) {
  224 |     const before = clone(await state(page)); await page.locator('#' + id).selectOption(String(hour));
  225 |     await selectors(page, hour); await assertChart(page, expected, hour);
  226 |     await expect(page.locator('#gl-growth-data-table tbody tr[aria-current="true"]')).toHaveCount(1);
  227 |     const selectedRow = page.locator('#gl-growth-data-table tbody tr[aria-current="true"]');
  228 |     await expect(selectedRow).toHaveAttribute('data-growth-hour', String(hour));
  229 |     await expect(selectedRow.locator('th')).toHaveText(String(hour));
  230 |     await expect(selectedRow.locator('td')).toHaveText([expected.control[hour].population.toFixed(1), expected.trial[hour].population.toFixed(1)]);
  231 |     expect(await state(page)).toEqual(withHour(before, hour)); expect(await paths(page)).toEqual(originalPaths);
  232 |     expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
  233 |     expect(await page.locator('.micro-growth-metrics').innerText()).toBe(finalMetrics);
  234 |   }
  235 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  236 | });
  237 | 
  238 | test('overlapping curves retain both marker shapes at hour zero while missing controls and empty restored notebooks show no fabricated comparison', async ({ page }) => {
  239 |   const data = seed(); data.growthReviewHour = 0; data.growthInvestigation.trials[0].conditions = { ...base, importedConditions: true };
  240 |   await mount(page, data); const before = clone(await state(page));
  241 |   const identical = await oracle(page, base, base); await assertChart(page, identical, 0);
  242 |   const overlappingPaths = await paths(page); expect(overlappingPaths).toHaveLength(2); expect(overlappingPaths[0]).toBe(overlappingPaths[1]);
  243 |   const shapes = await page.locator('[data-growth-selected-marker]').evaluateAll(nodes => nodes.map(node => ({
```