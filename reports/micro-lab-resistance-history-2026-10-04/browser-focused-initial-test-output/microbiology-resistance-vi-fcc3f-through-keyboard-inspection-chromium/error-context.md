# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-visuals.spec.ts >> forced-colour dark and light canvases keep both histories, guides and fixed-size point shapes visible through keyboard inspection
- Location: tests\e2e\microbiology-resistance-visuals.spec.ts:404:5

# Error details

```
Error: {"tag":"SPAN","selected":false,"series":"b","paint":"rgba(0, 0, 0, 0)","opacity":1,"contrast":1}

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 3
Received:    1
```

# Test source

```ts
  107 |       expect(Math.abs(point.x - point.round / Math.max(1, last) * 100) / 100 * model.bounds.width).toBeLessThan(model.zoom);
  108 |       expect(Math.abs(point.y - (100 - point.value / model.max * 100)) / 100 * model.bounds.height).toBeLessThan(model.zoom);
  109 |       expect(point.namespace).toBe('http://www.w3.org/1999/xhtml'); expect(point.tag).toBe('span');
  110 |       expect(point.width).toBe(series === 'a' ? 6 : 7); expect(point.height).toBe(point.width);
  111 |       if (series === 'a') { expect(point.radius).toBe('50%'); expect(point.paintedWidth).toBeCloseTo(point.width, 2); }
  112 |       else { expect(point.radius).toBe('0px'); expect(point.transform).toMatch(/^matrix\(/); expect(point.paintedWidth).toBeCloseTo(point.width * Math.SQRT2, 2); }
  113 |     }
  114 |     const selectedPoint = model.selected.filter(point => point.selected === series);
  115 |     expect(selectedPoint).toHaveLength(values[selectedRound] === null ? 0 : 1);
  116 |     if (selectedPoint.length) {
  117 |       const point = selectedPoint[0]; expect(point.round).toBe(selectedRound); expect(point.value).toBe(values[selectedRound]);
  118 |       expect(point.series).toBe(null);
  119 |       expect(Math.abs(point.x - model.guide.x) / 100 * model.bounds.width).toBeLessThan(model.zoom);
  120 |       expect(Math.abs(point.y - (100 - point.value / model.max * 100)) / 100 * model.bounds.height).toBeLessThan(model.zoom);
  121 |       expect(point.width).toBe(series === 'a' ? 22 : 11); expect(point.height).toBe(point.width);
  122 |     }
  123 |     const commands = (await chart(page, metric).locator('[data-resistance-series="' + series + '"]').getAttribute('d') || '').match(/[ML]\s*[-\d.]+\s*[, ]\s*[-\d.]+/g) || [];
  124 |     expect(commands).toHaveLength(living.length);
  125 |     commands.forEach((command, index) => {
  126 |       const coordinates = command.match(/[-\d.]+/g)!.map(Number);
  127 |       expect(coordinates[0]).toBeCloseTo(living[index].round / Math.max(1, last) * 100, 3);
  128 |       expect(coordinates[1]).toBeCloseTo(100 - living[index].value! / model.max * 100, 3);
  129 |     });
  130 |   }
  131 |   const a = chart(page, metric).locator('[data-resistance-series="a"]'), b = chart(page, metric).locator('[data-resistance-series="b"]');
  132 |   await expect(a).toHaveCount(1); await expect(b).toHaveCount(1);
  133 |   expect([null, '', 'none']).toContain(await a.getAttribute('stroke-dasharray')); expect(await b.getAttribute('stroke-dasharray')).toMatch(/[1-9]/);
  134 |   const axes = await page.locator('#micro-resistance-history-' + metric + '-axes').evaluate(element => [...element.querySelectorAll('[data-resistance-history-y-label], [data-resistance-history-x-label]')].map(label => {
  135 |     const box = label.getBoundingClientRect(), style = getComputedStyle(label), zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  136 |     return { y: label.hasAttribute('data-resistance-history-y-label'), value: Number(label.getAttribute('data-resistance-history-y-label') ?? label.getAttribute('data-resistance-history-x-label')),
  137 |       left: box.left, right: box.right, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2, height: box.height / zoom,
  138 |       fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
  139 |   }));
  140 |   const yTicks = axes.filter(label => label.y), xTicks = axes.filter(label => !label.y);
  141 |   expect(yTicks.map(label => label.value)).toEqual([model.max, model.max * .75, model.max * .5, model.max * .25, 0]);
  142 |   expect(xTicks[0].value).toBe(0); expect(xTicks[xTicks.length - 1].value).toBe(last);
  143 |   expect(xTicks.length).toBeLessThanOrEqual(Math.min(last + 1, 6));
  144 |   expect(xTicks.every((label, index) => Number.isInteger(label.value) && (index === 0 || label.value > xTicks[index - 1].value))).toBe(true);
  145 |   for (const label of axes) {
  146 |     expect(label.fontSize).toBeGreaterThanOrEqual(14); expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
  147 |     if (label.y) expect(Math.abs(label.centerY - (model.bounds.y + (100 - label.value / model.max * 100) / 100 * model.bounds.height))).toBeLessThan(1);
  148 |     else {
  149 |       const anchor = label.value === 0 ? label.left : label.value === last ? label.right : label.centerX;
  150 |       expect(Math.abs(anchor - (model.bounds.x + label.value / Math.max(1, last) * model.bounds.width))).toBeLessThan(1);
  151 |     }
  152 |   }
  153 |   const values = page.locator('#micro-resistance-history-' + metric + '-values'); await expect(values).toHaveJSProperty('tagName', 'DL');
  154 |   await expect(values.locator('dt')).toHaveCount(3);
  155 |   const expectedValues = { a: expectedA[selectedRound], b: expectedB[selectedRound], difference: expectedA[selectedRound] === null || expectedB[selectedRound] === null ? null : expectedB[selectedRound]! - expectedA[selectedRound]! };
  156 |   for (const [series, value] of Object.entries(expectedValues)) {
  157 |     const reading = values.locator('[data-resistance-history-reading="' + series + '"]');
  158 |     await expect(reading).toHaveAttribute('data-value', value === null ? 'undefined' : String(value));
  159 |     await expect(reading).toHaveText(value === null ? 'Undefined' : series === 'difference' ? (value > 0 ? '+' : '') + value + (metric === 'count' ? ' cells' : ' percentage points') : value + (metric === 'count' ? ' cells' : '%'));
  160 |   }
  161 | }
  162 | async function download(page: Page, format: 'text' | 'csv', name: string) {
  163 |   const pending = page.waitForEvent('download'); await page.locator('#micro-resistance-comparison-download-' + format).click();
  164 |   const file = await pending, text = readFileSync((await file.path())!, 'utf8');
  165 |   await file.saveAs(path.join(out, name)); return { text, filename: file.suggestedFilename() };
  166 | }
  167 | async function noOverflow(page: Page) {
  168 |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  169 |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  170 |   for (const node of [page.locator('[data-microbiology-tool]'), panel(page), figure(page, 'count'), figure(page, 'share'),
  171 |     page.locator('#micro-resistance-history-count-axes'), page.locator('#micro-resistance-history-share-axes'),
  172 |     page.locator('#micro-resistance-history-count-values'), page.locator('#micro-resistance-history-share-values'),
  173 |     page.locator('#micro-resistance-history-table'), round(page).locator('..')]) {
  174 |     const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  175 |     expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  176 |   }
  177 | }
  178 | async function assertForcedColourContrast(page: Page) {
  179 |   const paints = await page.locator('#micro-resistance-history').evaluate(history => {
  180 |     const probe = document.createElement('span');
  181 |     probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;forced-color-adjust:none;background:Canvas;color:CanvasText';
  182 |     document.body.appendChild(probe);
  183 |     try {
  184 |       const rgba = (colour: string) => { const values = colour.match(/[\d.]+/g)!.map(Number); return [values[0], values[1], values[2], values[3] ?? 1]; };
  185 |       const luminance = (rgb: number[]) => {
  186 |         const channels = rgb.slice(0, 3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
  187 |         return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  188 |       };
  189 |       const canvas = rgba(getComputedStyle(probe).backgroundColor), canvasLuminance = luminance(canvas);
  190 |       const contrast = (paint: string, opacity: number) => {
  191 |         probe.style.color = paint; const rgb = rgba(getComputedStyle(probe).color), alpha = rgb[3] * opacity;
  192 |         const composite = rgb.slice(0, 3).map((value, i) => value * alpha + canvas[i] * (1 - alpha)), actual = luminance(composite);
  193 |         return (Math.max(actual, canvasLuminance) + .05) / (Math.min(actual, canvasLuminance) + .05);
  194 |       };
  195 |       return [...history.querySelectorAll('[data-resistance-series], [data-resistance-history-guide], [data-resistance-history-marker], [data-resistance-selected-marker]')].map(node => {
  196 |         const style = getComputedStyle(node), svg = node instanceof SVGElement;
  197 |         const selected = node.hasAttribute('data-resistance-selected-marker');
  198 |         const paint = svg ? style.stroke : selected ? style.borderTopColor : style.backgroundColor;
  199 |         let opacity = svg ? Number(style.strokeOpacity) : 1;
  200 |         for (let element: Element | null = node; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
  201 |         return { tag: node.tagName, selected, series: node.getAttribute('data-resistance-series') ?? node.getAttribute('data-resistance-history-marker') ?? node.getAttribute('data-resistance-selected-marker'),
  202 |           paint, opacity, contrast: contrast(paint, opacity) };
  203 |       });
  204 |     } finally { probe.remove(); }
  205 |   });
  206 |   expect(paints).toHaveLength(22);
> 207 |   for (const paint of paints) expect(paint.contrast, JSON.stringify(paint)).toBeGreaterThanOrEqual(3);
      |                                                                             ^ Error: {"tag":"SPAN","selected":false,"series":"b","paint":"rgba(0, 0, 0, 0)","opacity":1,"contrast":1}
  208 | }
  209 | async function assertHistoryTableKeyboardScroll(page: Page) {
  210 |   const table = page.locator('#micro-resistance-history-table');
  211 |   const region = page.getByRole('region', { name: 'Shared Resistance history data', exact: true });
  212 |   await expect(region).toHaveAttribute('tabindex', '0');
  213 |   await expect(region.locator('#micro-resistance-history-table')).toHaveCount(1);
  214 |   const header = table.locator('thead th').first();
  215 |   await expect(header).toHaveText('Round');
  216 |   const headerLines = await header.evaluate(node => {
  217 |     const range = document.createRange(); range.selectNodeContents(node);
  218 |     return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).length;
  219 |   });
  220 |   expect(headerLines).toBe(1);
  221 |   const layout = await region.evaluate(node => {
  222 |     const element = node as HTMLElement, box = element.getBoundingClientRect();
  223 |     const panel = document.querySelector('#micro-resistance-comparison')!.getBoundingClientRect();
  224 |     return { client: element.clientWidth, scroll: element.scrollWidth, overflowX: getComputedStyle(element).overflowX,
  225 |       left: box.left, right: box.right, panelLeft: panel.left, panelRight: panel.right };
  226 |   });
  227 |   expect(layout.client).toBeGreaterThan(0); expect(layout.scroll).toBeGreaterThan(layout.client + 1);
  228 |   expect(layout.overflowX).toBe('auto');
  229 |   expect(layout.left).toBeGreaterThanOrEqual(layout.panelLeft - 1); expect(layout.right).toBeLessThanOrEqual(layout.panelRight + 1);
  230 |   await region.evaluate(node => { node.scrollLeft = 0; }); await region.focus(); await expect(region).toBeFocused();
  231 |   await expect.poll(async () => {
  232 |     await region.press('ArrowRight'); return region.evaluate(node => node.scrollLeft);
  233 |   }, { intervals: [100], timeout: 10000 }).toBeCloseTo(layout.scroll - layout.client, 0);
  234 |   const afterRight = await region.evaluate(node => node.scrollLeft); expect(afterRight).toBeGreaterThan(0);
  235 |   await expect.poll(async () => {
  236 |     await region.press('ArrowLeft'); return region.evaluate(node => node.scrollLeft);
  237 |   }, { intervals: [100], timeout: 10000 }).toBeCloseTo(0, 0);
  238 |   expect(await region.evaluate(node => node.scrollLeft)).toBeLessThan(afterRight); await expect(region).toBeFocused();
  239 | }
  240 | 
  241 | test('plots saved resistant counts and rounded shares on fixed axes so falling counts can accompany a rising share', async ({ page }) => {
  242 |   await mount(page); const before = await state(page);
  243 |   for (const metric of ['count', 'share'] as const) {
  244 |     await expect(chart(page, metric)).toHaveAttribute('role', 'img');
  245 |     const names = [(await chart(page, metric).getAttribute('aria-labelledby'))!, (await chart(page, metric).getAttribute('aria-describedby'))!].join(' ').split(/\s+/);
  246 |     expect(names).toContain('micro-resistance-history-' + metric + '-title');
  247 |     expect(names).toContain('micro-resistance-history-' + metric + '-description');
  248 |     expect(names.length).toBeGreaterThanOrEqual(2);
  249 |     for (const id of names) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
  250 |     await expect(chart(page, metric).locator('text')).toHaveCount(0);
  251 |   }
  252 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 2);
  253 |   await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 2);
  254 |   const countGeometry = await geometry(chart(page, 'count')), shareGeometry = await geometry(chart(page, 'share'));
  255 |   expect(countGeometry.points.map(point => point.x)).toEqual(shareGeometry.points.map(point => point.x));
  256 |   for (const metric of ['count', 'share'] as const) {
  257 |     await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2'); await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '2');
  258 |   }
  259 |   await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*4/);
  260 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*14%.*B.*100%/);
  261 |   await open(page.locator('#micro-resistance-history-data'));
  262 |   const table = page.locator('#micro-resistance-history-table'); await expect(table.locator('thead th')).toHaveCount(5);
  263 |   await expect(table.locator('tbody tr')).toHaveCount(3);
  264 |   await expect(table.locator('tr[data-round="0"] td')).toHaveText(['8', '8', '10%', '10%']);
  265 |   await expect(table.locator('tr[data-round="1"] td')).toHaveText(['8', '6', '12%', '75%']);
  266 |   await expect(table.locator('tr[data-round="2"] td')).toHaveText(['8', '4', '14%', '100%']);
  267 |   await round(page).selectOption('1');
  268 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
  269 |   await expect(page.locator('[data-resistance-history-readout="count"]')).toHaveAttribute('data-round', '1');
  270 |   await expect(page.locator('[data-resistance-history-readout="share"]')).toHaveAttribute('data-round', '1');
  271 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*12%.*B.*75%/);
  272 |   expect(await state(page)).toEqual(withRound(before, 1)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  273 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-divergence-desktop.png') });
  274 | });
  275 | 
  276 | test('shows a real zero count at extinction while omitting the undefined share and every unobserved tail', async ({ page }) => {
  277 |   const data = seed(); data.resistanceComparison.bId = 9; await mount(page, data); const before = await state(page);
  278 |   await expect(chart(page, 'count')).toHaveAttribute('data-last-round', '1'); await expect(chart(page, 'share')).toHaveAttribute('data-last-round', '1');
  279 |   await expect(marker(page, 'count', 'a')).toHaveCount(2); await expect(marker(page, 'count', 'b')).toHaveCount(2);
  280 |   await expect(marker(page, 'share', 'a')).toHaveCount(2); await expect(marker(page, 'share', 'b')).toHaveCount(1);
  281 |   await expect(plot(page, 'count').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveAttribute('data-value', '0');
  282 |   await expect(plot(page, 'share').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveCount(0);
  283 |   await expect(selected(page, 'count', 'b')).toHaveAttribute('data-value', '0'); await expect(selected(page, 'share', 'b')).toHaveCount(0);
  284 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText('Undefined');
  285 |   const bSharePath = await chart(page, 'share').locator('[data-resistance-series="b"]').getAttribute('d');
  286 |   expect(bSharePath || '').not.toMatch(/[LlHhVvCcSsQqTtAa]/);
  287 |   for (const metric of ['count', 'share'] as const) {
  288 |     const values = await marker(page, metric, 'a').evaluateAll(points => points.map(point => Number(point.getAttribute('data-round')))); expect(values).toEqual([0, 1]);
  289 |     await expect(plot(page, metric).locator('[data-round="2"], [data-round="3"]')).toHaveCount(0);
  290 |   }
  291 |   await assertGeometry(page, 'count', [8, 8], [0, 0], 1); await assertGeometry(page, 'share', [10, 12], [0, null], 1);
  292 |   await open(page.locator('#micro-resistance-history-data'));
  293 |   await expect(page.locator('#micro-resistance-history-table tbody tr')).toHaveCount(2);
  294 |   await expect(page.locator('#micro-resistance-history-table tr[data-round="1"] td')).toHaveText(['8', '0', '12%', 'Undefined']);
  295 |   await round(page).selectOption('0'); await expect(selected(page, 'share', 'b')).toHaveAttribute('data-value', '0');
  296 |   await assertGeometry(page, 'count', [8, 8], [0, 0], 0); await assertGeometry(page, 'share', [10, 12], [0, null], 0);
  297 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*0%/);
  298 |   expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  299 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-extinction.png') });
  300 | });
  301 | 
  302 | test('keyboard round changes update both plots, restore after JSON reload and agree with the comparison downloads', async ({ page }) => {
  303 |   await mount(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  304 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  305 |   await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  306 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '1');
  307 |   await expect(page.locator('#micro-resistance-history-selected-round')).toContainText('1');
```