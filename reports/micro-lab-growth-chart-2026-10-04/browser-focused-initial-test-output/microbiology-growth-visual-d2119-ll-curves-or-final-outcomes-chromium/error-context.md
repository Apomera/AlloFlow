# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-growth-visual-inspection.spec.ts >> chart, citation and review selectors synchronize hours zero, six and twenty-four without changing full curves or final outcomes
- Location: tests\e2e\microbiology-growth-visual-inspection.spec.ts:218:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  0
+ Received  + 15

@@ -1,9 +1,10 @@
  Object {
    "_threeLoaded": true,
    "microbiology": Object {
      "earnedXP": 71,
+     "gramStep": 0,
      "growthInvestigation": Object {
        "control": Object {
          "importedNextControl": true,
          "oxygen": 100,
          "pH": 7.5,
@@ -115,10 +116,17 @@
      "growthReviewHour": 0,
      "importedMetadata": Object {
        "keep": true,
        "literal": "<img src=x onerror=\"window.__growthVisualInjected=true\"> Keep imported chart evidence literal.",
      },
+     "magnification": 400,
+     "microscopeFocus": 10,
+     "microscopeTargetFocus": 50,
+     "quizAnswers": Array [],
+     "quizCorrect": 0,
+     "quizIdx": 0,
+     "quizSubmitted": false,
      "resistanceInvestigation": Object {
        "dose": 0,
        "duration": 8,
        "history": Array [
          Object {
@@ -130,10 +138,17 @@
        "importedResistance": Object {
          "literal": "<img src=x onerror=\"window.__growthVisualInjected=true\"> Keep imported chart evidence literal.",
        },
        "initRes": 10,
      },
+     "scopeOrganism": "ecoli",
+     "selectedBacterium": "ecoli",
+     "selectedCase": "snow",
+     "selectedFerment": "sourdough",
+     "selectedMicrobiome": "gut",
+     "selectedScope": "lightbright",
+     "selectedVirus": "covid",
      "showMicroLibrary": false,
      "tab": "growthLab",
    },
    "unrelatedNotebook": Object {
      "keep": Array [
```

# Test source

```ts
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
  143 |       expect(marker.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
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
> 231 |     expect(await state(page)).toEqual(withHour(before, hour)); expect(await paths(page)).toEqual(originalPaths);
      |                               ^ Error: expect(received).toEqual(expected) // deep equality
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
  244 |     name: node.getAttribute('data-growth-selected-marker'), box: node.getBoundingClientRect().toJSON(),
  245 |   })));
  246 |   expect(shapes).toHaveLength(2); expect(shapes[0].box.width).not.toBe(shapes[1].box.width);
  247 |   expect(shapes[0].box.x + shapes[0].box.width / 2).toBeCloseTo(shapes[1].box.x + shapes[1].box.width / 2, 5);
  248 |   expect(shapes[0].box.y + shapes[0].box.height / 2).toBeCloseTo(shapes[1].box.y + shapes[1].box.height / 2, 5);
  249 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  250 |   await figure(page).screenshot({ path: path.join(out, 'growth-chart-overlap.png') });
  251 |   await page.locator('#gl-trial-42').click(); const missing = clone(await state(page));
  252 |   await expect(figure(page)).toHaveCount(0); await expect(chart(page)).toHaveCount(0); await expect(page.locator('#gl-chart-hour')).toHaveCount(0);
  253 |   await expect(page.locator('#gl-saved-result')).toContainText('control');
  254 |   expect(missing.microbiology.growthInvestigation.trials).toEqual(before.microbiology.growthInvestigation.trials);
  255 |   expect(missing.unrelatedNotebook).toEqual(before.unrelatedNotebook);
  256 |   await harness.unmount(page);
  257 |   const empty = seed(); empty.growthInvestigation = { control: { ...nextControl, importedNextControl: true }, prediction: 'higher', hypothesis: 'Draft-only reasoning.', notebookMetadata: { literal }, trials: [], selectedId: null, nextId: 60 };
  258 |   await mount(page, empty); const emptyBefore = clone(await state(page));
  259 |   await expect(figure(page)).toHaveCount(0); await expect(chart(page)).toHaveCount(0); await expect(page.locator('#gl-chart-hour')).toHaveCount(0);
  260 |   await expect(page.locator('#gl-saved-result')).toHaveCount(0); await expect(page.locator('#gl-hypothesis')).toHaveValue('Draft-only reasoning.');
  261 |   expect(await state(page)).toEqual(emptyBefore); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  262 | });
  263 | 
  264 | test('phone, four-hundred-percent zoom, reduced-motion and forced-colour layouts keep labels and marker shapes readable with keyboard focus', async ({ page }) => {
  265 |   await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page); const before = clone(await state(page)), expected = await oracle(page);
  266 |   expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  267 |   await page.setViewportSize({ width: 320, height: 844 }); await assertLayout(page); await assertChart(page, expected, 6);
  268 |   await figure(page).screenshot({ path: path.join(out, 'growth-chart-phone-320.png') });
  269 |   await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  270 |   await assertLayout(page); await assertChart(page, expected, 6);
  271 |   await figure(page).screenshot({ path: path.join(out, 'growth-chart-400-percent.png') });
  272 |   await page.evaluate(() => { document.body.style.zoom = '1'; }); await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  273 |   expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
  274 |   await assertLayout(page); await assertChart(page, expected, 6);
  275 |   const axisColors = await page.locator('#gl-growth-axes span').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).color));
  276 |   expect(axisColors.every(color => !/rgba\([^)]*, 0\)|transparent/.test(color))).toBe(true);
  277 |   await figure(page).screenshot({ path: path.join(out, 'growth-chart-contrast.png') });
  278 |   expect(await state(page)).toEqual(before);
  279 |   const selector = page.locator('#gl-chart-hour'); await selector.focus(); await selector.press('End');
  280 |   await expect(selector).toHaveValue('24'); await expect(selector).toBeFocused(); await assertChart(page, expected, 24);
  281 |   expect(await state(page)).toEqual(withHour(before, 24)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  282 | });
  283 | 
  284 | test('JSON reload and comparison CSV agree with the inspected chart while the original trial CSV retains hour-twenty-four outcomes', async ({ page }) => {
  285 |   await mount(page); const expected = await oracle(page), saved = clone(await state(page));
  286 |   const serialized = JSON.stringify(saved); writeFileSync(path.join(out, 'growth-chart-restored-state.json'), serialized + '\n');
  287 |   await harness.unmount(page); await page.reload(); await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  288 |   await page.evaluate(json => (window as any).__mount(JSON.parse(json)), serialized); await page.addStyleTag({ content: layoutStyle }); await instrument(page);
  289 |   await expect(figure(page)).toBeVisible(); expect(await state(page)).toEqual(saved); await assertChart(page, expected, 6);
  290 |   await open(page.locator('.micro-growth-review')); await selectors(page, 6);
  291 |   const before = clone(await state(page)), result = await page.locator('.micro-growth-result-head').innerText();
  292 |   const rows = await download(page, page.getByRole('button', { name: 'Download comparison at hour 6', exact: true }), 'micro-lab-comparison-hour-6.csv');
  293 |   expect(rows.map(row => row.trial_id)).toEqual(['7', '42']);
  294 |   expect(rows[0]).toMatchObject({ inspection_hour: '6', control_profile: 'ecoli', control_temperature_C: '37', trial_temperature_C: '35',
  295 |     original_prediction: 'similar', outcome_at_24h: 'similar', explanation: "'" + originalExplanation, population_units: 'arbitrary population units' });
  296 |   expect(Number(rows[0].control_population_at_inspection_hour)).toBeCloseTo(expected.control[6].population, 2);
  297 |   expect(Number(rows[0].trial_population_at_inspection_hour)).toBeCloseTo(expected.trial[6].population, 2);
  298 |   expect(Number(rows[0].difference_at_inspection_hour)).toBeCloseTo(expected.trial[6].population - expected.control[6].population, 2);
  299 |   expect(rows[1]).toMatchObject({ inspection_hour: '6', control_profile: '', control_population_at_inspection_hour: '', difference_at_inspection_hour: '', outcome_at_24h: '' });
  300 |   const originalRows = await download(page, page.getByRole('button', { name: 'Download trial CSV', exact: true }), 'micro-lab-trials.csv');
  301 |   expect(Number(originalRows[0].control_population_at_24h)).toBeCloseTo(expected.control[24].population, 2);
  302 |   expect(Number(originalRows[0].trial_population_at_24h)).toBeCloseTo(expected.trial[24].population, 2);
  303 |   expect(originalRows[0].modeled_outcome).toBe('similar'); expect(originalRows[0]).not.toHaveProperty('inspection_hour');
  304 |   expect(await state(page)).toEqual(before); expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
  305 |   await assertChart(page, expected, 6); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  306 | });
  307 | 
```