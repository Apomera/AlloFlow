# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-plot-inspection.spec.ts >> unfinished, horizontal, and noncanonical recordings expose only original chronological moments
- Location: tests\e2e\physics-plot-inspection.spec.ts:191:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-physics-history-run]')
Expected: "Unfinished path 1"
Received: "Unfinished flight"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-physics-history-run]')
    32 × locator resolved to <strong data-physics-history-run="unfinished">Unfinished flight</strong>
       - unexpected value "Unfinished flight"

```

```yaml
- strong: Unfinished flight
```

# Test source

```ts
  104 |   await expect(page.locator('[data-physics-plot-flight][aria-pressed="true"]')).toHaveCount(1);
  105 |   const moments = await assertMoments(page, trail, id), pressed = moments.filter(m => m.index === index);
  106 |   await expect(page.locator('[data-physics-plot-moment][aria-pressed="true"]')).toHaveCount(pressed.length);
  107 |   for (const moment of pressed) await expect(page.locator('[data-physics-plot-moment="' + moment.id + '"]')).toHaveAttribute('aria-pressed', 'true');
  108 |   await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(index));
  109 |   await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
  110 |   if (!full) return draw;
  111 |   await page.locator('[data-physics-analysis-tab="motion"]').click();
  112 |   await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', trail.run == null ? 'unfinished' : String(trail.run));
  113 |   for (const [field, value] of [['vx', original.mVx], ['vy', original.mVy]] as const) {
  114 |     await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-sample-index', String(index));
  115 |     await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-time', String(original.t));
  116 |     await expect(page.locator('[data-physics-graph-marker="' + field + '"]')).toHaveAttribute('data-value', String(value));
  117 |   }
  118 |   await page.locator('[data-physics-analysis-tab="data"]').click();
  119 |   const row = page.locator('[data-physics-flight-table] tbody tr[data-selected="true"]');
  120 |   await expect(row).toHaveCount(1);
  121 |   await expect(row.locator('[data-physics-sample-index]')).toHaveAttribute('data-physics-sample-index', String(index));
  122 |   expect(await row.locator('td').allTextContents()).toEqual([original.mX, original.mY, original.mVx, original.mVy, Math.hypot(original.mVx, original.mVy)].map(formatted));
  123 |   await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-sample-index', String(index));
  124 |   await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-time', String(original.t));
  125 |   await page.locator('[data-physics-analysis-tab="motion"]').click();
  126 |   return draw;
  127 | }
  128 | async function copyCsv(page: Page, trail: Trail) {
  129 |   const previous = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  130 |   await page.locator('[data-physics-analysis-tab="data"]').click();
  131 |   const count = await page.evaluate(() => (window as any).__plotCsv.length);
  132 |   await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  133 |   await expect.poll(() => page.evaluate(() => (window as any).__plotCsv.length)).toBe(count + 1);
  134 |   const csv = await page.evaluate(() => (window as any).__plotCsv.at(-1) as string), lines = csv.split('\n');
  135 |   expect(lines).toHaveLength(trail.points.length + 2);
  136 |   expect(lines.slice(2)).toEqual(trail.points.map(p => [p.t, p.mX, p.mY, p.mVx, p.mVy, Math.hypot(p.mVx, p.mVy)].join(',')));
  137 |   expect(lines[0]).toContain('angle_deg=' + trail.parameters.angle); expect(lines[0]).toContain('air_drag=' + (trail.parameters.drag ? 'on' : 'off'));
  138 |   if (trail.run != null) expect(lines[0]).toContain('run=' + trail.run);
  139 |   await page.locator('[data-physics-analysis-tab="' + previous + '"]').click(); return csv;
  140 | }
  141 | 
  142 | test('native plot buttons and original moments link exact evidence after all launch settings change', async ({ page }) => {
  143 |   await mount(page); await launch(page); await launch(page, { airResist: true });
  144 |   await patch(page, { angle: 80, velocity: 5, gravity: 25, mass: 9, launchHeight: 30, airResist: false });
  145 |   const before = await evidence(page);
  146 |   await expect(page.locator('[data-physics-plot-inspection]')).toHaveCount(0);
  147 |   await expect(page.locator('[data-physics-plot-flight][aria-pressed="true"]')).toHaveCount(0);
  148 |   const first = page.locator('[data-physics-plot-flight="1"]'); await expect(first).toHaveJSProperty('tagName', 'BUTTON');
  149 |   await first.focus(); await first.press('Enter'); await expect(first).toBeFocused();
  150 |   await assertSelected(page, before.trails[0], before.trails[0].points.length - 1, '1');
  151 |   const firstCsv = await copyCsv(page, before.trails[0]);
  152 |   for (const moment of originalMoments(before.trails[0])) {
  153 |     const button = page.locator('[data-physics-plot-moment="' + moment.id + '"]'); await expect(button).toHaveJSProperty('tagName', 'BUTTON');
  154 |     await button.click(); await expect(button).toBeFocused(); await assertSelected(page, before.trails[0], moment.index, '1');
  155 |     expect(await copyCsv(page, before.trails[0])).toBe(firstCsv); expect(await evidence(page)).toEqual(before);
  156 |   }
  157 |   const middle = Math.floor(before.trails[0].points.length / 3);
  158 |   await page.locator('[data-physics-sample-slider]').evaluate((el, index) => {
  159 |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(index));
  160 |     el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  161 |   }, middle); await first.click();
  162 |   await assertSelected(page, before.trails[0], middle, '1');
  163 |   const second = page.locator('[data-physics-plot-flight="2"]'); await second.focus(); await second.press('Space'); await expect(second).toBeFocused();
  164 |   await assertSelected(page, before.trails[1], before.trails[1].points.length - 1, '2');
  165 |   const secondCsv = await copyCsv(page, before.trails[1]); expect(secondCsv).not.toBe(firstCsv);
  166 |   for (const moment of originalMoments(before.trails[1])) { await page.locator('[data-physics-plot-moment="' + moment.id + '"]').click(); await assertSelected(page, before.trails[1], moment.index, '2'); expect(await copyCsv(page, before.trails[1])).toBe(secondCsv); }
  167 |   await page.locator('[data-physics-plot-analysis]').click(); await expect(page.locator('[data-physics-sample-slider]')).toBeFocused();
  168 |   await page.locator('[data-physics-sample-close]').click(); await expect(second).toBeFocused();
  169 |   await expect(page.locator('[data-physics-plot-inspection]')).toHaveCount(0);
  170 |   expect(await evidence(page)).toEqual(before);
  171 | });
  172 | 
  173 | test('choosing an old path pauses a newer live flight and return keeps its original ball paused', async ({ page }) => {
  174 |   await mount(page); await launch(page, { airResist: true });
  175 |   await launch(page, { angle: 65, velocity: 25, gravity: 1, launchHeight: 30, airResist: false, simSpeed: 1 }, false); await ticks(page, 18);
  176 |   const before = await evidence(page); expect(before.trails.at(-1)!.points.length).toBeGreaterThan(1);
  177 |   await page.locator('[data-physics-plot-flight="1"]').click();
  178 |   await assertSelected(page, before.trails[0], before.trails[0].points.length - 1, '1');
  179 |   await ticks(page, 30); expect(await evidence(page)).toEqual(before);
  180 |   await page.locator('[data-physics-plot-moment="apex"]').click();
  181 |   await assertSelected(page, before.trails[0], originalMoments(before.trails[0]).find(m => m.id === 'apex')!.index, '1');
  182 |   expect(await evidence(page)).toEqual(before);
  183 |   await page.locator('[data-physics-plot-close]').click(); await expect(page.locator('[data-physics-plot-flight="1"]')).toBeFocused();
  184 |   expect((await redraw(page)).selected).toBeNull(); await ticks(page, 30); expect(await evidence(page)).toEqual(before);
  185 |   await page.locator('[data-physics-playback-rate="1"]').click(); await ticks(page, 4); await patch(page, { simSpeed: 0 });
  186 |   const resumed = await evidence(page); expect(resumed.ball.t).toBeGreaterThan(before.ball.t); expect(resumed.trails[0]).toEqual(before.trails[0]);
  187 |   expect(resumed.trails.at(-1)!.points.slice(0, before.trails.at(-1)!.points.length)).toEqual(before.trails.at(-1)!.points);
  188 |   expect(resumed.count).toBe(before.count); expect(resumed.log).toEqual(before.log); expect(resumed.recordings).toEqual(before.recordings);
  189 | });
  190 | 
  191 | test('unfinished, horizontal, and noncanonical recordings expose only original chronological moments', async ({ page }) => {
  192 |   await mount(page); await launch(page, {}, false);
  193 |   const onePointId = await page.locator('[data-physics-plot-flight]').getAttribute('data-physics-plot-flight'); expect(onePointId).toMatch(/^unfinished-\d+$/);
  194 |   await launch(page, { angle: 60, gravity: 1, simSpeed: 1 }, false); await ticks(page, 8); await patch(page, { simSpeed: 0 }); await redraw(page);
  195 |   const ascending = await evidence(page), id = await page.locator('[data-physics-plot-flight]').last().getAttribute('data-physics-plot-flight');
  196 |   await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await assertSelected(page, ascending.trails[1], ascending.trails[1].points.length - 1, id!);
  197 |   await expect(page.locator('[data-physics-plot-moment="latest"]')).toHaveCount(1); await expect(page.locator('[data-physics-plot-moment="apex"]')).toHaveCount(0);
  198 |   await expect(page.locator('[data-physics-plot-inspection]')).not.toContainText(/Run \d+|Apex|Ground impact/);
  199 |   await expect(page.locator('[data-physics-history-select] option').nth(1)).toContainText('Unfinished path ' + id!.split('-')[1]);
  200 |   await page.locator('[data-physics-history-select]').selectOption('0');
  201 |   const one = await redraw(page); expect(one.selected).toMatchObject({ run: null, index: 0, t: 0, count: 1 });
  202 |   await assertMoments(page, ascending.trails[0], onePointId!); await expect(page.locator('[data-physics-plot-flight="' + onePointId + '"]')).toHaveCount(0);
  203 |   await expect(page.locator('[data-physics-history-select] option').first()).toContainText('Unfinished path ' + onePointId!.split('-')[1]);
> 204 |   await expect(page.locator('[data-physics-history-run]')).toHaveText('Unfinished path ' + onePointId!.split('-')[1]);
      |                                                            ^ Error: expect(locator).toHaveText(expected) failed
  205 |   expect(await evidence(page)).toEqual(ascending);
  206 |   await launch(page, { angle: 0, launchHeight: 10 });
  207 |   const horizontal = (await evidence(page)).trails.at(-1)!; await page.locator('[data-physics-plot-flight="1"]').click();
  208 |   await assertMoments(page, horizontal, '1'); await expect(page.locator('[data-physics-plot-moment]')).toHaveCount(2);
  209 |   await expect(page.locator('[data-physics-plot-moment="apex"]')).toContainText('Highest point at release');
  210 |   await page.locator('[data-physics-plot-moment="apex"]').click(); const release = await assertSelected(page, horizontal, 0, '1');
  211 |   expect(release.selected.apex).toBe(true); expect(release.text).toContain('Highest point at release');
  212 |   await launch(page, { airResist: true });
  213 |   await page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any; delete cv._trails.at(-1).apex; (window as any).__rerender(); });
  214 |   const noApex = (await evidence(page)).trails.at(-1)!; await page.locator('[data-physics-plot-flight="2"]').click();
  215 |   await assertMoments(page, noApex, '2'); await expect(page.locator('[data-physics-plot-moment="apex"]')).toHaveCount(0);
  216 |   await expect(page.locator('[data-physics-plot-moment="highest"]')).toContainText('Highest recorded point');
  217 |   const highest = originalMoments(noApex).find(m => m.id === 'highest')!; await page.locator('[data-physics-plot-moment="highest"]').click();
  218 |   expect((await assertSelected(page, noApex, highest.index, '2')).selected.apex).toBe(false);
  219 |   for (let i = 0; i < 6; i++) await launch(page, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
  220 |   expect((await evidence(page)).trails.map(t => t.run)).toEqual([4, 5, 6, 7, 8]);
  221 |   expect(await page.locator('[data-physics-plot-flight]').evaluateAll(rows => rows.map(el => el.getAttribute('data-physics-plot-flight')))).toEqual(['4', '5', '6', '7', '8']);
  222 |   await expect(page.locator('[data-physics-plot-flight="1"],[data-physics-plot-flight="2"],[data-physics-plot-flight^="unfinished-"]')).toHaveCount(0);
  223 | });
  224 | 
  225 | function renderedGradient(buffer: Buffer) {
  226 |   const pixels = readPng(buffer), stops: Array<[number, number, number]> = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], samples = [];
  227 |   for (let x = 0; x < pixels.width; x++) {
  228 |     const svgX = (x + .5) * 56 / pixels.width; if (svgX < 3 || svgX > 53) continue;
  229 |     const progress = (svgX - 2) / 52, segment = progress < .5 ? 0 : 1, blend = segment === 0 ? progress * 2 : (progress - .5) * 2;
  230 |     const expected = stops[segment].map((v, i) => Math.round(v + (stops[segment + 1][i] - v) * blend));
  231 |     const rgb = pixels.at(x, Math.floor(pixels.height / 2)), surface = pixels.at(x, Math.floor(pixels.height * 2 / 16));
  232 |     samples.push({ x, svgX, rgb, surface, expected, contrast: contrastRatio(rgb, surface), channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expected[i]))) });
  233 |   }
  234 |   const visible = samples.filter(s => s.contrast >= 3), matching = samples.filter(s => s.channelError <= 4);
  235 |   return { pixelWidth: pixels.width, pixelHeight: pixels.height, sampledColumns: samples.length, visibleColumns: visible.length, matchingColumns: matching.length,
  236 |     visibleSpanCSS: visible.length ? (visible.at(-1)!.x - visible[0].x + 1) * 56 / pixels.width : 0, minContrast: Math.min(...samples.map(s => s.contrast)), maxChannelError: Math.max(...samples.map(s => s.channelError)), samples };
  237 | }
  238 | async function focusRaster(page: Page, selector: string, screenshot: string, threshold: number) {
  239 |   const target = page.locator(selector); await page.keyboard.press('Tab'); await target.focus(); await expect(target).toBeFocused();
  240 |   const metrics = await target.evaluate(el => {
  241 |     const b = el.getBoundingClientRect(), scene = el.closest('.phys-scene')!.getBoundingClientRect(), style = getComputedStyle(el);
  242 |     const rect = (r: DOMRect) => ({ x: r.x, y: r.y, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  243 |     return { label: el.textContent!.replace(/\s+/g, ' ').trim(), rect: rect(b), sceneRect: rect(scene), focusVisible: el.matches(':focus-visible'),
  244 |       outlineWidth: parseFloat(style.outlineWidth), outlineOffset: parseFloat(style.outlineOffset), outlineStyle: style.outlineStyle,
  245 |       outlineRGB: style.outlineColor.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number).slice(0, 3) };
  246 |   });
  247 |   expect(metrics.focusVisible).toBe(true); expect(metrics.outlineStyle).toBe('solid'); expect(metrics.outlineWidth).toBeGreaterThanOrEqual(3);
  248 |   const pixels = readPng(await page.locator('.phys-scene').screenshot({ path: screenshot, animations: 'disabled' }));
  249 |   const { rect: b, sceneRect: scene } = metrics, distance = metrics.outlineOffset + metrics.outlineWidth / 2;
  250 |   // Sample the exposed surface just outside the focus ring, before the next button's border.
  251 |   const outside = metrics.outlineOffset + metrics.outlineWidth + .75;
  252 |   const positions = [
  253 |     { x: b.left - distance, y: b.top + b.height / 2, surfaceX: b.left - outside, surfaceY: b.top + b.height / 2 },
  254 |     { x: b.right + distance, y: b.top + b.height / 2, surfaceX: b.right + outside, surfaceY: b.top + b.height / 2 },
  255 |     { x: b.left + b.width / 2, y: b.top - distance, surfaceX: b.left + b.width / 2, surfaceY: b.top - outside },
  256 |     { x: b.left + b.width / 2, y: b.bottom + distance, surfaceX: b.left + b.width / 2, surfaceY: b.bottom + outside },
  257 |   ];
  258 |   const px = (x: number) => Math.floor((x - scene.left) * pixels.width / scene.width), py = (y: number) => Math.floor((y - scene.top) * pixels.height / scene.height);
  259 |   const samples = positions.map(p => {
  260 |     const pixelX = px(p.x), pixelY = py(p.y), surfacePixelX = px(p.surfaceX), surfacePixelY = py(p.surfaceY);
  261 |     for (const [x, y] of [[pixelX, pixelY], [surfacePixelX, surfacePixelY]]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(pixels.width); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(pixels.height); }
  262 |     const rgb = pixels.at(pixelX, pixelY), surface = pixels.at(surfacePixelX, surfacePixelY), contrast = contrastRatio(rgb, surface);
  263 |     expect(Math.max(...rgb.map((v, i) => Math.abs(v - metrics.outlineRGB[i]))), selector + ' has actual focus ink').toBeLessThanOrEqual(4);
  264 |     expect(contrast, selector + ' physical focus outline contrast').toBeGreaterThanOrEqual(threshold);
  265 |     return { ...p, pixelX, pixelY, surfacePixelX, surfacePixelY, rgb, surface, contrast };
  266 |   });
  267 |   return { selector, ...metrics, screenshot, pixelWidth: pixels.width, pixelHeight: pixels.height, samples, minContrast: Math.min(...samples.map(s => s.contrast)) };
  268 | }
  269 | 
  270 | test('plot inspection controls retain readable text, actual keyboard focus, and painted swatches in nine layouts', async ({ page }) => {
  271 |   test.setTimeout(300_000); mkdirSync(reports, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  272 |   const source = path.resolve('stem_lab/stem_tool_physics.js'), mirror = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  273 |   const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex'), initial = [sha(source), sha(mirror)], configurations: object[] = [];
  274 |   expect(initial[0]).toBe(initial[1]); await mount(page);
  275 |   for (let i = 0; i < 5; i++) await launch(page, { velocity: 15 + i * 2, airResist: i % 2 === 1 });
  276 |   await page.locator('[data-physics-plot-flight="2"]').click(); await page.locator('[data-physics-plot-moment="apex"]').click();
  277 |   const original = await evidence(page), selected = (await redraw(page)).selected;
  278 |   try {
  279 |     for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
  280 |       await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__plotTheme(t), theme); await page.waitForTimeout(50);
  281 |       expect((await redraw(page)).selected).toEqual(selected);
  282 |       const threshold = theme === 'contrast' ? 7 : 3, textThreshold = theme === 'contrast' ? 7 : 4.5;
  283 |       const measurements = await page.locator('[data-physics-plot-flight],[data-physics-plot-inspection]').evaluateAll(elements => {
  284 |         const rgb = (paint: string) => { const m = paint.match(/^rgba?\(([^)]+)\)$/); if (!m) throw Error('Unresolved plot control paint: ' + paint); return m[1].split(',').map(Number); };
  285 |         const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  286 |         return elements.flatMap(el => {
  287 |           const bounds = el.getBoundingClientRect(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), result = [];
  288 |           for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  289 |             if (!node.textContent!.trim()) continue; const parent = node.parentElement!, style = getComputedStyle(parent), range = document.createRange(); range.selectNodeContents(node);
  290 |             const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0); if (!rects.length || style.visibility === 'hidden') continue;
  291 |             let surface: number[] | null = null, alpha = rgb(style.color)[3] ?? 1;
  292 |             for (let p: Element | null = parent; p; p = p.parentElement) { const s = getComputedStyle(p); alpha *= Number(s.opacity); const c = rgb(s.backgroundColor); if (c.length === 3 || c[3] >= .99) { surface = c; break; } }
  293 |             if (!surface) throw Error('Plot control text has no opaque surface'); const ink = rgb(style.color), a = lum(ink.slice(0, 3).map((v, i) => v * alpha + surface![i] * (1 - alpha))), b = lum(surface);
  294 |             result.push({ text: node.textContent!.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05),
  295 |               flight: el.getAttribute('data-physics-plot-flight'), bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }, rects: rects.map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })) });
  296 |           } return result;
  297 |         });
  298 |       });
  299 |       expect(new Set(measurements.filter(m => m.flight).map(m => m.flight)).size).toBe(5); expect(measurements.length).toBeGreaterThan(10);
  300 |       for (const m of measurements) { expect(m.font).toBeGreaterThanOrEqual(12); expect(m.contrast).toBeGreaterThanOrEqual(textThreshold); for (const r of m.rects) { expect(r.left).toBeGreaterThanOrEqual(Math.max(0, m.bounds.left) - 1); expect(r.right).toBeLessThanOrEqual(Math.min(width, m.bounds.right) + 1); expect(r.top).toBeGreaterThanOrEqual(m.bounds.top - 1); expect(r.bottom).toBeLessThanOrEqual(m.bounds.bottom + 1); } }
  301 |       const targets = await page.locator('[data-physics-plot-flight],[data-physics-plot-moment],[data-physics-plot-analysis],[data-physics-plot-close]').evaluateAll(els => els.map(el => {
  302 |         const b = el.getBoundingClientRect(), attribute = ['data-physics-plot-flight', 'data-physics-plot-moment', 'data-physics-plot-analysis', 'data-physics-plot-close'].find(a => el.hasAttribute(a))!;
  303 |         const kind = { 'data-physics-plot-flight': 'trail', 'data-physics-plot-moment': 'moment', 'data-physics-plot-analysis': 'analysis', 'data-physics-plot-close': 'close' }[attribute];
  304 |         return { selector: '[' + attribute + '="' + el.getAttribute(attribute) + '"]', label: el.textContent!.replace(/\s+/g, ' ').trim(), kind, type: attribute, id: el.getAttribute(attribute), rect: { x: b.x, y: b.y, left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height } };
```