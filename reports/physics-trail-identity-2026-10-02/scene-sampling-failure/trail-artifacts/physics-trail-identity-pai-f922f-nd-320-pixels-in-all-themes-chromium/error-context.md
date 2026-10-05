# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-trail-identity.spec.ts >> painted path keys remain readable at 1100, 375, and 320 pixels in all themes
- Location: tests\e2e\physics-trail-identity.spec.ts:331:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 3
Received:    2.1443745905117364
```

# Test source

```ts
  246 |   expect(selected.selected).toMatchObject({ run: 1, parameters: { airResist: true } }); await assertPaths(page, selected); assertVacuumPath(selected, original, 'reference');
  247 |   await assertVacuumKey(page, original, 'reference', 1);
  248 |   expect((await keys(page)).find(r => r.key.startsWith('unfinished-'))).toMatchObject({ key: unfinishedKey, active: false, model: 'vacuum', role: 'current' });
  249 |   const unfinishedStyle = styleMap(await keys(page))[unfinishedKey];
  250 |   expect(await copyCsv(page)).toBe(originalCsv);
  251 |   expect(await evidence(page)).toEqual(before);
  252 |   await page.locator('[data-physics-sample-close]').click(); const live = await paint(page);
  253 |   expect(live.selected).toBeNull(); expect(live.preview).toBeNull(); await assertPaths(page, live);
  254 |   await expect(page.locator('[data-physics-vacuum-key]')).toHaveCount(0);
  255 |   await patch(page, { simSpeed: 2 }); await finish(page); await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 2); await patch(page, { simSpeed: 0 });
  256 |   const landedRows = await assertPaths(page, await paint(page));
  257 |   expect(landedRows.find(row => row.key === '2')).toMatchObject({ active: true, role: 'latest', model: 'vacuum' });
  258 |   expect(landedRows.some(row => row.key === unfinishedKey)).toBe(false);
  259 |   await select(page, 0); const completedRows = await assertPaths(page, await paint(page));
  260 |   expect(styleMap(completedRows)['2'], 'completion preserves the original path pattern when focus returns to another flight').toEqual(unfinishedStyle);
  261 |   await page.locator('[data-physics-sample-close]').click();
  262 |   await patch(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }); const next = await paint(page);
  263 |   assertVacuumPath(next, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }, 'preview');
  264 |   await assertVacuumKey(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 0 }, 'preview');
  265 |   const completedCounts = await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }));
  266 |   expect(completedCounts).toEqual({ count: 2, rows: 2 });
  267 |   await patch(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, simSpeed: 1 });
  268 |   await page.locator('[data-physics-launch]').click();
  269 |   await page.evaluate(() => { for (let i = 0; i < 10; i++) (window as any).__trailTick(); }); await patch(page, { simSpeed: 0 });
  270 |   const olderIndex = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails.length - 1);
  271 |   await select(page, olderIndex);
  272 |   const interrupted = await evidence(page), interruptedDraw = await paint(page), interruptedCsv = await copyCsv(page);
  273 |   expect(interruptedDraw.selected.run).toBeNull(); expect(interruptedDraw.selected.impact).toBe(false);
  274 |   expect(interrupted.trails[olderIndex].points.length).toBeGreaterThan(1);
  275 |   const olderKey = (await assertPaths(page, interruptedDraw)).find(row => row.active)!.key;
  276 |   expect(olderKey).toMatch(/^unfinished-\d+$/);
  277 |   await patch(page, { angle: 60, velocity: 25, gravity: 1, mass: 4, launchHeight: 30, airResist: false, simSpeed: 0 });
  278 |   await page.locator('[data-physics-launch]').click(); await paint(page);
  279 |   await expect(page.locator('[data-physics-trail-key^="unfinished-"]')).toHaveCount(2);
  280 |   const restarted = await evidence(page); expect(restarted.trails[olderIndex]).toEqual(interrupted.trails[olderIndex]);
  281 |   await select(page, olderIndex); const oldUnfinished = await paint(page), captured = interrupted.trails[olderIndex].parameters;
  282 |   expect(oldUnfinished.selected).toMatchObject({ run: null, parameters: { angle: 35, velocity: 15, airResist: true } });
  283 |   expect((await assertPaths(page, oldUnfinished)).find(row => row.active)).toMatchObject({ key: olderKey, role: 'selected', model: 'drag' });
  284 |   assertVacuumPath(oldUnfinished, captured, 'reference'); await assertVacuumKey(page, captured, 'reference', null, 'Selected flight');
  285 |   await expect(page.locator('[data-physics-vacuum-key]')).not.toContainText(/Current flight|Next launch|Run \d+/);
  286 |   expect(await copyCsv(page)).toBe(interruptedCsv); expect(await evidence(page)).toEqual(restarted);
  287 |   expect(await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }))).toEqual(completedCounts);
  288 |   const onePointIndex = oldUnfinished.trails.length - 1;
  289 |   await select(page, onePointIndex); const onePoint = await paint(page);
  290 |   expect(onePoint.selected.t).toBe(0);
  291 |   const onePointKey = (await assertPaths(page, onePoint)).find(row => row.active)!.key;
  292 |   const onePointOriginal = (await evidence(page)).trails[onePointIndex];
  293 |   await page.locator('[data-physics-launch]').click(); await select(page, onePointIndex);
  294 |   const omitted = await paint(page), omittedRows = await assertPaths(page, omitted);
  295 |   expect(omitted.selected.t).toBe(0); expect(omittedRows.some(row => row.key === onePointKey)).toBe(false);
  296 |   expect(omittedRows.some(row => row.active), 'an older one-point selection does not invent a drawable path').toBe(false);
  297 |   const beforeCompletion = await evidence(page); expect(beforeCompletion.trails[onePointIndex]).toEqual(onePointOriginal);
  298 |   await select(page, olderIndex); const pending = await paint(page), pendingRows = await assertPaths(page, pending);
  299 |   const pendingKey = pendingRows.at(-1)!.key, pendingStyle = styleMap(pendingRows)[pendingKey];
  300 |   expect(pendingRows.at(-1)).toMatchObject({ active: false, role: 'current', sampleCount: 1 });
  301 |   await page.locator('[data-physics-sample-close]').click();
  302 |   await patch(page, { simSpeed: 2 }); await finish(page);
  303 |   await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 3); await patch(page, { simSpeed: 0 }); await select(page, olderIndex);
  304 |   const afterCompletion = await paint(page), completed = await assertPaths(page, afterCompletion);
  305 |   expect(afterCompletion.selected).toEqual(pending.selected);
  306 |   expect(styleMap(completed)['3'], 'an earlier interrupted path may occupy the preferred slot; completion keeps the current path assignment').toEqual(pendingStyle);
  307 |   expect(completed.some(row => row.key === pendingKey)).toBe(false);
  308 |   const finalEvidence = await evidence(page);
  309 |   expect(finalEvidence.trails[olderIndex]).toEqual(interrupted.trails[olderIndex]);
  310 |   expect(finalEvidence.trails[onePointIndex]).toEqual(onePointOriginal);
  311 |   expect(await copyCsv(page)).toBe(interruptedCsv);
  312 |   expect(await page.evaluate(() => ({ count: (window as any).__toolData.physics.runCount, rows: (window as any).__toolData.physics.runLog.length }))).toEqual({ count: 3, rows: 3 });
  313 | });
  314 | 
  315 | test('five retained original run keys restore accurately and disappear when trails are cleared', async ({ page }) => {
  316 |   await mount(page); await fiveRuns(page, 7);
  317 |   const before = await evidence(page), saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.physics)));
  318 |   expect(before.trails.map(t => t.run)).toEqual([3, 4, 5, 6, 7]); await select(page, 0);
  319 |   const csv = await copyCsv(page), styles = styleMap(await assertPaths(page, await paint(page)));
  320 |   await remount(page, saved); await select(page, 0); const restored = await evidence(page);
  321 |   expect(restored.trails).toEqual(before.trails); expect(restored.recordings).toEqual(before.recordings); expect(restored.log).toEqual(before.log);
  322 |   expect(styleMap(await assertPaths(page, await paint(page)))).toEqual(styles); expect(await copyCsv(page)).toBe(csv);
  323 |   await expect(page.locator('[data-physics-history-recording]')).toHaveAttribute('data-physics-history-recording', 'saved');
  324 |   await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click(); await paint(page);
  325 |   await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0);
  326 |   const cleared = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.physics)));
  327 |   expect(cleared.recordedFlights).toEqual([]); expect(cleared.runCount).toBe(7); await remount(page, cleared);
  328 |   await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0); await expect(page.locator('[data-physics-history-select]')).toHaveCount(0);
  329 | });
  330 | 
  331 | test('painted path keys remain readable at 1100, 375, and 320 pixels in all themes', async ({ page }) => {
  332 |   test.setTimeout(300_000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); mkdirSync(reports, { recursive: true });
  333 |   const source = path.resolve('stem_lab/stem_tool_physics.js'), mirror = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  334 |   const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex'), initial = [sha(source), sha(mirror)], configurations: object[] = [];
  335 |   expect(initial[0]).toBe(initial[1]); await mount(page); await fiveRuns(page); await select(page, 1);
  336 |   const original = await evidence(page), selected = (await paint(page)).selected;
  337 |   try {
  338 |     for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
  339 |       await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__trailTheme(t), theme); await page.waitForTimeout(50);
  340 |       const draw = await paint(page); expect(draw.selected).toEqual(selected); const rows = await assertPaths(page, draw);
  341 |       expect(draw.pageWidth).toBeLessThanOrEqual(draw.viewport + 1);
  342 |       for (const item of draw.text) { expect(item.font).toBeGreaterThanOrEqual(11.99); expect(item.left).toBeGreaterThanOrEqual(-1); expect(item.right).toBeLessThanOrEqual(draw.width + 1); expect(item.top).toBeGreaterThanOrEqual(-1); expect(item.bottom).toBeLessThanOrEqual(draw.height + 1); }
  343 |       for (const row of rows) { expect(row.font).toBeGreaterThanOrEqual(12); expect(row.left).toBeGreaterThanOrEqual(0); expect(row.right).toBeLessThanOrEqual(width + 1); }
  344 |       for (const row of rows) expect(row.svgContrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
  345 |       const actualTrails = draw.strokes.filter(s => Math.abs(s.width - 2) < .01 || Math.abs(s.width - 2.5) < .01);
> 346 |       expect(actualTrails.length).toBeGreaterThan(4); for (const stroke of actualTrails) expect(stroke.sceneContrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 3);
      |                                                                                                                       ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  347 |       const metrics = await page.locator('[data-physics-trail-key],[data-physics-vacuum-key]').evaluateAll(elements => {
  348 |         const rgb = (color: string) => { const m = color.match(/^rgba?\(([^)]+)\)$/); if (!m) throw Error('Unresolved key paint: ' + color); return m[1].split(',').map(Number); };
  349 |         const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  350 |         return elements.flatMap(el => {
  351 |           const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), metrics = [];
  352 |           const bounds = el.getBoundingClientRect();
  353 |           for (let text = walker.nextNode(); text; text = walker.nextNode()) {
  354 |             if (!text.textContent!.trim()) continue;
  355 |             const node = text.parentElement!, range = document.createRange(); range.selectNodeContents(text);
  356 |             const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
  357 |             if (!rects.length) continue;
  358 |             const style = getComputedStyle(node); if (style.visibility === 'hidden' || style.visibility === 'collapse') continue;
  359 |             let background: number[] | null = null, alpha = rgb(style.color)[3] ?? 1;
  360 |             for (let p: Element | null = node; p; p = p.parentElement) {
  361 |               const parentStyle = getComputedStyle(p); alpha *= Number(parentStyle.opacity);
  362 |               const color = rgb(parentStyle.backgroundColor); if (color.length === 3 || color[3] >= .99) { background = color; break; }
  363 |             }
  364 |             if (!background) throw Error('Key has no opaque surface');
  365 |             const color = rgb(style.color), a = lum(color.slice(0, 3).map((v, i) => v * alpha + background![i] * (1 - alpha))), b = lum(background);
  366 |             metrics.push({ text: text.textContent!.trim(), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05),
  367 |               titleKey: node.closest('.phys-trail-title') ? el.getAttribute('data-physics-trail-key') : null,
  368 |               vacuum: el.hasAttribute('data-physics-vacuum-key'), vacuumPart: el.hasAttribute('data-physics-vacuum-key') ? node.closest('[data-physics-vacuum-parameters]') ? 'parameters' : 'caption' : null, bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
  369 |               rects: rects.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) });
  370 |           }
  371 |           return metrics;
  372 |         });
  373 |       });
  374 |       expect(metrics.length).toBeGreaterThan(4);
  375 |       const titleTextGroups = new Set(metrics.filter(metric => metric.titleKey).map(metric => metric.titleKey)).size;
  376 |       const vacuumTextNodes = metrics.filter(metric => metric.vacuum).length;
  377 |       const captionNodes = metrics.filter(metric => metric.vacuumPart === 'caption'), parameterNodes = metrics.filter(metric => metric.vacuumPart === 'parameters');
  378 |       const vacuumCaption = captionNodes.map(metric => metric.text).join(' ').replace(/\s+/g, ' ').trim();
  379 |       const vacuumParameters = parameterNodes.map(metric => metric.text).join(' ').replace(/\s+/g, ' ').trim(), p = selected.parameters;
  380 |       expect(titleTextGroups, 'every flight title has measured painted text').toBe(rows.length);
  381 |       expect(captionNodes.length, 'the complete reference caption has visible measured text').toBeGreaterThan(0);
  382 |       expect(parameterNodes.length, 'the complete captured parameter line has visible measured text').toBeGreaterThan(0);
  383 |       expect(vacuumCaption).toBe('White dashed · vacuum reference · Run ' + selected.run);
  384 |       expect(vacuumParameters).toBe('θ ' + p.angle + '° · v₀ ' + p.velocity + ' m/s · g ' + p.gravity + ' m/s² · h₀ ' + p.launchHeight + ' m');
  385 |       for (const metric of metrics) {
  386 |         expect(metric.font).toBeGreaterThanOrEqual(12); expect(metric.contrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
  387 |         for (const rect of metric.rects) {
  388 |           expect(rect.left).toBeGreaterThanOrEqual(Math.max(0, metric.bounds.left) - 1);
  389 |           expect(rect.right).toBeLessThanOrEqual(Math.min(width, metric.bounds.right) + 1);
  390 |           expect(rect.top).toBeGreaterThanOrEqual(metric.bounds.top - 1); expect(rect.bottom).toBeLessThanOrEqual(metric.bounds.bottom + 1);
  391 |         }
  392 |       }
  393 |       const screenshot = path.join(reports, 'trails-' + theme + '-' + width + '.png'); await page.locator('.phys-scene').screenshot({ path: screenshot, animations: 'disabled' });
  394 |       configurations.push({ width, theme, rows: rows.length, minFont: Math.min(...metrics.map(m => m.font), ...draw.text.map(t => t.font)), minTextContrast: Math.min(...metrics.map(m => m.contrast)), minSVGContrast: Math.min(...rows.map(r => r.svgContrast)), minCanvasContrast: Math.min(...actualTrails.map(s => s.sceneContrast)), noOverflow: draw.pageWidth <= draw.viewport + 1, titleTextGroups, vacuumTextNodes, vacuumCaptionNodes: captionNodes.length, vacuumParameterNodes: parameterNodes.length, vacuumCaption, vacuumParameters, textGlyphsWithinKeys: true, screenshot });
  395 |       expect(await evidence(page)).toEqual(original);
  396 |     }
  397 |   } finally { writeFileSync(path.join(reports, 'visual-results.json'), JSON.stringify({ sourceSha256: initial[0], mirrorSha256: initial[1], finalSourceSha256: sha(source), finalMirrorSha256: sha(mirror), sourceStable: initial[0] === sha(source), mirrorStable: initial[1] === sha(mirror), configurations, errors }, null, 2)); }
  398 |   expect(configurations).toHaveLength(9); expect([sha(source), sha(mirror)]).toEqual(initial); expect(errors).toEqual([]);
  399 | });
  400 | 
```