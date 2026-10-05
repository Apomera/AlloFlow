# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-sweep-visual-inspection.spec.ts >> zero-response sweeps keep square markers and equal-sample guidance while an unsampled saved setting starts at the first best sample
- Location: tests\e2e\microbiology-sweep-visual-inspection.spec.ts:296:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 1
Received:   3.7734375
```

# Test source

```ts
  66  | }
  67  | async function open(details: Locator) {
  68  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
  69  |     const summary = details.locator(':scope > summary'); await summary.focus(); await summary.press('Enter');
  70  |   }
  71  |   await expect(details).toHaveAttribute('open', '');
  72  | }
  73  | async function mount(page: Page, data = seed()) {
  74  |   await page.setViewportSize({ width: 1280, height: 960 });
  75  |   await harness.mount(page, { unrelatedNotebook: { literal, keep: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  76  |   await page.addStyleTag({ content: layoutStyle }); await instrument(page);
  77  |   await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
  78  |   await open(page.locator('.micro-growth-sweep'));
  79  | }
  80  | async function oracle(page: Page, descriptor: Descriptor): Promise<Sweep> {
  81  |   // Evaluate the established culture simulator once per independent sampled setting.
  82  |   return page.evaluate(({ descriptor, values }) => {
  83  |     const model = (window as any).__MicrobiologyCore.growth;
  84  |     return { ...descriptor, samples: values.map(value => {
  85  |       const result = model.simulate({ ...descriptor.conditions, [descriptor.variable]: value });
  86  |       return { value, population: result.finalPopulation, score: result.score, lag: result.lagHours, conditions: result.conditions };
  87  |     }) };
  88  |   }, { descriptor, values: settings[descriptor.variable] });
  89  | }
  90  | function settingText(variable: Variable, value: number) { return value + (variable === 'tempC' ? ' °C' : variable === 'oxygen' ? '/100' : ''); }
  91  | function x(variable: Variable, value: number) { const [min, max] = extent[variable]; return (value - min) / (max - min) * 100; }
  92  | async function inspect(page: Page, value: number, previous = false) {
  93  |   const before = clone(await state(page));
  94  |   await selector(page, previous).selectOption(String(value));
  95  |   await expect(selector(page, previous)).toHaveValue(String(value));
  96  |   expect(await state(page)).toEqual(before);
  97  |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  98  | }
  99  | async function assertSweep(page: Page, expected: Sweep, selected: number, previous = false) {
  100 |   const id = prefix(previous), selectedPoint = expected.samples.find(sample => sample.value === selected)!;
  101 |   await expect(figure(page, previous)).toBeVisible(); await expect(figure(page, previous)).toHaveJSProperty('tagName', 'FIGURE');
  102 |   await expect(chart(page, previous)).toHaveAttribute('viewBox', '0 0 100 100');
  103 |   await expect(chart(page, previous)).toHaveAttribute('preserveAspectRatio', 'none');
  104 |   await expect(chart(page, previous)).toHaveAttribute('role', 'img');
  105 |   expect(await chart(page, previous).getAttribute('aria-label')).toBeTruthy();
  106 |   await expect(chart(page, previous).locator('text')).toHaveCount(0);
  107 |   await expect(selector(page, previous)).toHaveAccessibleName('Inspect sampled setting · ' + (previous ? 'Previous sweep' : 'Current sweep'));
  108 |   await expect(selector(page, previous)).toHaveValue(String(selected));
  109 |   expect(await selector(page, previous).locator('option').evaluateAll(nodes => nodes.map(node => Number((node as HTMLOptionElement).value)))).toEqual(settings[expected.variable]);
  110 |   const geometry = await chart(page, previous).evaluate(svg => ({
  111 |     grids: [...svg.querySelectorAll('[data-sweep-level]')].map(line => ({ level: Number(line.getAttribute('data-sweep-level')), x1: Number(line.getAttribute('x1')),
  112 |       x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
  113 |     curves: [...svg.querySelectorAll('[data-sweep-curve]')].map(node => node.getAttribute('d') || ''),
  114 |     guides: [...svg.querySelectorAll('[data-sweep-guide]')].map(line => ({ value: Number(line.getAttribute('data-sweep-guide')), x1: Number(line.getAttribute('x1')),
  115 |       x2: Number(line.getAttribute('x2')), y1: Number(line.getAttribute('y1')), y2: Number(line.getAttribute('y2')) })),
  116 |   }));
  117 |   expect(geometry.grids.map(grid => grid.level).sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
  118 |   for (const grid of geometry.grids) expect(grid).toEqual({ level: grid.level, x1: 0, x2: 100, y1: 100 - grid.level, y2: 100 - grid.level });
  119 |   expect(geometry.curves).toHaveLength(1);
  120 |   const coordinates = [...geometry.curves[0].matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)].map(match => [Number(match[1]), Number(match[2])]);
  121 |   expect(coordinates).toHaveLength(expected.samples.length);
  122 |   expected.samples.forEach((sample, index) => {
  123 |     expect(coordinates[index][0]).toBeCloseTo(x(expected.variable, sample.value), 3);
  124 |     expect(coordinates[index][1]).toBeCloseTo(100 - sample.population, 3);
  125 |   });
  126 |   expect(geometry.guides).toHaveLength(1);
  127 |   expect(geometry.guides[0].value).toBe(selected); expect(geometry.guides[0].x1).toBeCloseTo(x(expected.variable, selected), 8);
  128 |   expect(geometry.guides[0].x2).toBeCloseTo(x(expected.variable, selected), 8);
  129 |   expect(geometry.guides[0].y1).toBe(0); expect(geometry.guides[0].y2).toBe(100);
  130 |   const rendered = await page.locator('#' + id + '-plot').evaluate(plot => {
  131 |     const bounds = plot.getBoundingClientRect();
  132 |     const markers = [...plot.querySelectorAll('[data-sweep-point], [data-sweep-selected]')].map(node => {
  133 |       const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
  134 |       return { value: Number(node.getAttribute('data-sweep-point') ?? node.getAttribute('data-sweep-selected')), population: Number(node.getAttribute('data-population')),
  135 |         response: node.getAttribute('data-response'), selected: node.hasAttribute('data-sweep-selected'), width: parseFloat(style.width), height: parseFloat(style.height),
  136 |         radius: style.borderTopLeftRadius, borderWidth: parseFloat(style.borderTopWidth), centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 };
  137 |     });
  138 |     return { bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, markers };
  139 |   });
  140 |   expect(rendered.markers.filter(marker => !marker.selected).map(marker => marker.value)).toEqual(settings[expected.variable]);
  141 |   expect(rendered.markers.filter(marker => marker.selected)).toHaveLength(1);
  142 |   for (const marker of rendered.markers) {
  143 |     const sample = expected.samples.find(sample => sample.value === marker.value)!;
  144 |     expect(marker.population).toBeCloseTo(sample.population, 8);
  145 |     if (!marker.selected) expect(marker.response).toBe(sample.score === 0 ? 'flat' : 'increase');
  146 |     expect(marker.width).toBe(marker.selected ? 18 : 8); expect(marker.height).toBe(marker.width);
  147 |     expect(marker.radius).toBe(sample.score === 0 ? '0px' : '50%');
  148 |     if (marker.selected) { expect(marker.value).toBe(selected); expect(marker.borderWidth).toBeGreaterThanOrEqual(2); }
  149 |     expect(Math.abs(marker.centerX - (rendered.bounds.x + x(expected.variable, marker.value) / 100 * rendered.bounds.width))).toBeLessThan(1);
  150 |     expect(Math.abs(marker.centerY - (rendered.bounds.y + (100 - sample.population) / 100 * rendered.bounds.height))).toBeLessThan(1);
  151 |   }
  152 |   const axes = await page.locator('#' + id + '-axes').evaluate(node => {
  153 |     const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  154 |     return [...node.querySelectorAll('[data-sweep-y-label], [data-sweep-x-label]')].map(label => {
  155 |       const rect = label.getBoundingClientRect(), style = getComputedStyle(label);
  156 |       return { y: label.hasAttribute('data-sweep-y-label'), value: Number(label.getAttribute('data-sweep-y-label') ?? label.getAttribute('data-sweep-x-label')),
  157 |         centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2, height: rect.height / zoom,
  158 |         lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
  159 |     });
  160 |   });
  161 |   expect(axes.filter(label => label.y).map(label => label.value)).toEqual([100, 75, 50, 25, 0]);
  162 |   expect(axes.filter(label => !label.y).map(label => label.value)).toEqual(ticks[expected.variable]);
  163 |   for (const label of axes) {
  164 |     expect(label.fontSize).toBeGreaterThanOrEqual(14); expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
  165 |     if (label.y) expect(Math.abs(label.centerY - (rendered.bounds.y + (100 - label.value) / 100 * rendered.bounds.height))).toBeLessThan(1);
> 166 |     else expect(Math.abs(label.centerX - (rendered.bounds.x + x(expected.variable, label.value) / 100 * rendered.bounds.width))).toBeLessThan(1);
      |                                                                                                                                  ^ Error: expect(received).toBeLessThan(expected)
  167 |   }
  168 |   const values = page.locator('#' + id + '-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  169 |   await expect(values.locator('dt')).toHaveCount(3);
  170 |   await expect(values.locator('[data-sweep-readout="setting"]')).toHaveText(settingText(expected.variable, selected));
  171 |   const population = values.locator('[data-sweep-readout="population"]');
  172 |   await expect(population).toHaveText(selectedPoint.population.toFixed(1));
  173 |   expect(Number(await population.getAttribute('data-value'))).toBeCloseTo(selectedPoint.population, 8);
  174 |   await expect(values.locator('[data-sweep-readout="response"]')).toHaveText(selectedPoint.score === 0 ? 'No modeled increase' : 'Population increases');
  175 |   const status = page.locator('#' + id + '-selected');
  176 |   await expect(status).toHaveAttribute('aria-live', 'polite'); await expect(status).toHaveAttribute('aria-atomic', 'true');
  177 |   await expect(status).toContainText(settingText(expected.variable, selected));
  178 |   const table = evidence(page, previous).locator('.micro-growth-sweep-table');
  179 |   expect(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-sweep-setting'))))).toEqual(settings[expected.variable]);
  180 |   await expect(table.locator('tbody tr[aria-current="true"]')).toHaveCount(1);
  181 |   await expect(table.locator('tbody tr[aria-current="true"]')).toHaveAttribute('data-sweep-setting', String(selected));
  182 |   for (const sample of expected.samples) {
  183 |     const row = table.locator('tbody tr[data-sweep-setting="' + sample.value + '"]');
  184 |     await expect(row.locator('th')).toHaveText(settingText(expected.variable, sample.value));
  185 |     await expect(row.locator('td').nth(0)).toHaveText(sample.population.toFixed(1));
  186 |     await expect(row.locator('td').nth(1)).toHaveText(sample.score === 0 ? 'No modeled increase' : 'Population increases');
  187 |   }
  188 | }
  189 | async function assertLayout(page: Page, previous = false) {
  190 |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  191 |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  192 |   for (const node of [figure(page, previous), page.locator('#' + prefix(previous) + '-axes'), page.locator('#' + prefix(previous) + '-values')]) {
  193 |     const bounds = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  194 |     expect(bounds.scroll <= bounds.client + 1, JSON.stringify(bounds)).toBe(true);
  195 |   }
  196 |   const control = selector(page, previous); await control.focus(); await expect(control).toBeFocused();
  197 |   const style = await control.evaluate(element => {
  198 |     const style = getComputedStyle(element), rect = element.getBoundingClientRect();
  199 |     return { outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), height: parseFloat(style.height),
  200 |       fontSize: parseFloat(style.fontSize), x: rect.x, right: rect.right };
  201 |   });
  202 |   expect(style.outline).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThan(0);
  203 |   expect(style.height).toBeGreaterThanOrEqual(42); expect(style.fontSize).toBeGreaterThanOrEqual(14);
  204 |   expect(style.x).toBeGreaterThanOrEqual(0); expect(style.right).toBeLessThanOrEqual(viewport.width + 1);
  205 | }
  206 | async function assertForcedColourContrast(page: Page) {
  207 |   const paints = await figure(page).evaluate(figure => {
  208 |     const probe = document.createElement('span');
  209 |     probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;forced-color-adjust:none;background:Canvas;color:CanvasText';
  210 |     document.body.appendChild(probe);
  211 |     try {
  212 |       const rgba = (colour: string) => { const values = colour.match(/[\d.]+/g)!.map(Number); return [values[0], values[1], values[2], values[3] ?? 1]; };
  213 |       const luminance = (rgb: number[]) => {
  214 |         const channels = rgb.slice(0, 3).map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  215 |         return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  216 |       };
  217 |       const canvas = rgba(getComputedStyle(probe).backgroundColor), canvasLuminance = luminance(canvas);
  218 |       const paintContrast = (paint: string, opacity: number) => {
  219 |         probe.style.color = paint; const rgb = rgba(getComputedStyle(probe).color), alpha = rgb[3] * opacity;
  220 |         const composite = rgb.slice(0, 3).map((value, i) => value * alpha + canvas[i] * (1 - alpha)), actual = luminance(composite);
  221 |         return (Math.max(actual, canvasLuminance) + .05) / (Math.min(actual, canvasLuminance) + .05);
  222 |       };
  223 |       return [...figure.querySelectorAll('[data-sweep-curve], [data-sweep-guide], [data-sweep-point], [data-sweep-selected]')].map(node => {
  224 |         const style = getComputedStyle(node), svg = node instanceof SVGElement;
  225 |         const selected = node.hasAttribute('data-sweep-selected');
  226 |         const paint = svg ? style.stroke : selected ? style.borderTopColor : style.backgroundColor;
  227 |         let opacity = svg ? Number(style.strokeOpacity) : 1;
  228 |         for (let element: Element | null = node; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
  229 |         return { tag: node.tagName, selected, paint, contrast: paintContrast(paint, opacity), opacity };
  230 |       });
  231 |     } finally { probe.remove(); }
  232 |   });
  233 |   expect(paints).toHaveLength(settings.tempC.length + 3);
  234 |   for (const paint of paints) expect(paint.contrast, JSON.stringify(paint)).toBeGreaterThanOrEqual(3);
  235 | }
  236 | async function setRange(control: Locator, value: number) {
  237 |   await control.evaluate((node, next) => {
  238 |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
  239 |     node.dispatchEvent(new Event('input', { bubbles: true }));
  240 |   }, value);
  241 |   await expect(control).toHaveValue(String(value));
  242 | }
  243 | async function downloadNotebook(page: Page, filename: string) {
  244 |   const pending = page.waitForEvent('download');
  245 |   await page.getByRole('button', { name: 'Download notebook', exact: true }).press('Enter');
  246 |   const download = await pending; expect(download.suggestedFilename()).toBe('micro-lab-notebook.txt');
  247 |   const file = path.join(out, filename); await download.saveAs(file); return readFileSync(file, 'utf8');
  248 | }
  249 | 
  250 | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  251 | test.afterAll(async () => { await harness.stop(); });
  252 | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  253 | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  254 | 
  255 | test('temperature, pH and oxygen sweeps use independent simulated samples on true numeric axes without accepting forged imported populations', async ({ page }) => {
  256 |   for (const [variable, conditions, initial, screenshot] of [
  257 |     ['tempC', base, 37, 'sweep-desktop.png'], ['pH', base, 7, 'sweep-ph.png'], ['oxygen', prior, 100, 'sweep-oxygen.png'],
  258 |   ] as const) {
  259 |     const data = seed(variable, conditions); await mount(page, data); const before = clone(await state(page));
  260 |     const expected = await oracle(page, { variable, conditions }); await assertSweep(page, expected, initial);
  261 |     // The sample gaps differ: equal-width ordinal projection would fail the model-axis geometry checks above.
  262 |     const gaps = expected.samples.slice(1).map((sample, index) => sample.value - expected.samples[index].value);
  263 |     expect(new Set(gaps).size).toBeGreaterThan(1);
  264 |     await expect(evidence(page)).not.toContainText('987654321');
  265 |     await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  266 |     expect(await page.evaluate(() => Boolean((window as any).__sweepVisualInjected))).toBe(false);
```