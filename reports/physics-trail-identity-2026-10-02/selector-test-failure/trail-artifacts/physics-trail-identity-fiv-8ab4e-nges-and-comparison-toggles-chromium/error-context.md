# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-trail-identity.spec.ts >> five same-angle runs retain distinct painted identities through focus, control changes, and comparison toggles
- Location: tests\e2e\physics-trail-identity.spec.ts:211:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-physics-view-toggle="overlay"]')

```

# Test source

```ts
  129 |     const swatch = row.querySelector('[data-physics-trail-swatch]')!, shaft = swatch.querySelector('path,line,polyline') || swatch;
  130 |     const style = getComputedStyle(shaft), color = style.stroke.match(/^rgba?\(([^)]+)\)$/), b = row.getBoundingClientRect();
  131 |     const labelStyle = getComputedStyle(row), stops = [...swatch.querySelectorAll('stop')].map(stop => getComputedStyle(stop).stopColor.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number).slice(0, 3));
  132 |     let alpha = Number(style.strokeOpacity); for (let p: Element | null = shaft; p && p !== row; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
  133 |     const rgba = (value: string) => value.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number);
  134 |     let surface: number[] | null = null; for (let p: Element | null = row; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c.length === 3 || c[3] >= .99) { surface = c; break; } }
  135 |     if (!surface) throw Error('Trail swatch lacks an opaque surface');
  136 |     const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  137 |     const paints = color ? [color[1].split(',').map(Number).slice(0, 3)] : stops;
  138 |     const svgContrast = Math.min(...paints.map(c => { const a = lum(c.map((v, i) => v * alpha + surface![i] * (1 - alpha))), b = lum(surface!); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
  139 |     return { key: row.getAttribute('data-physics-trail-key')!, active: row.getAttribute('data-active') === 'true', model: row.getAttribute('data-model'),
  140 |       role: row.getAttribute('data-role'), sampleCount: Number(row.getAttribute('data-sample-count')), alpha, stops, svgContrast, viewBox: swatch.getAttribute('viewBox'), contrastTheme: row.closest('#physics-fs-outer')!.getAttribute('data-physics-theme') === 'contrast',
  141 |       text: row.textContent!.replace(/\s+/g, ' ').trim(), rgb: color ? color[1].split(',').map(Number).slice(0, 3) : null,
  142 |       dash: style.strokeDasharray === 'none' ? [] : style.strokeDasharray.split(/[,\s]+/).map(parseFloat),
  143 |       left: b.left, right: b.right, font: parseFloat(labelStyle.fontSize) };
  144 |   }));
  145 | }
  146 | function same(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6; }
  147 | function pathMatches(actual: Point[], expected: Point[]) { return actual.length === expected.length && actual.every((p, i) => same(p, expected[i])); }
  148 | function meterPoint(draw: Awaited<ReturnType<typeof paint>>, p: any) {
  149 |   return { x: (draw.view.x + p.mX * draw.view.scale) * draw.width / draw.layout.width, y: (draw.view.groundY - p.mY * draw.view.scale) * draw.height / draw.layout.height };
  150 | }
  151 | function speedColor(p: any) {
  152 |   const n = Math.min(1, Math.hypot(p.mVx, p.mVy) / 60), stops = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], segment = n < .5 ? 0 : 1, blend = segment === 0 ? n * 2 : (n - .5) * 2;
  153 |   return stops[segment].map((value, i) => Math.round(value + (stops[segment + 1][i] - value) * blend));
  154 | }
  155 | async function assertPaths(page: Page, draw: Awaited<ReturnType<typeof paint>>) {
  156 |   const drawable = draw.trails.filter(t => t.points.length >= 2 || draw.launched && t.index === draw.trails.length - 1 && t.points.length === 1);
  157 |   const rows = await keys(page); expect(rows).toHaveLength(drawable.length);
  158 |   expect(new Set(rows.map(row => row.key)).size, 'each drawable original has one unique row identity').toBe(rows.length);
  159 |   for (const [index, trail] of drawable.entries()) {
  160 |     const row = rows[index];
  161 |     if (trail.key) expect(row.key).toBe(trail.key); else expect(row.key).toMatch(/^unfinished-\d+$/);
  162 |     const p = trail.parameters; expect(row.model).toBe(p.drag ? 'drag' : 'vacuum');
  163 |     const active = draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1;
  164 |     const role = active && draw.selected ? 'selected' : trail.index === draw.trails.length - 1 && draw.launched ? 'current' : trail.run == null ? 'unfinished' : trail.index === draw.trails.length - 1 ? 'latest' : 'recorded';
  165 |     expect(row!.active).toBe(active); expect(row!.role).toBe(role); expect(row!.sampleCount).toBe(trail.points.length); expect(row!.viewBox).toBe('0 0 56 16');
  166 |     expect(row!.alpha).toBeCloseTo(active || row!.contrastTheme ? 1 : .85, 6);
  167 |     const label = row!.text.replace(/\s/g, ''); expect(label).toContain('θ' + p.angle + '°'); expect(label).toContain('v₀' + p.velocity + 'm/s');
  168 |     if (trail.run != null) expect(row!.text).toContain('Run ' + trail.run); else { expect(row!.key).toMatch(/^unfinished-\d+$/); expect(row!.text).toMatch(/^Unfinished path \d+/); expect(row!.text).not.toMatch(/Run \d+/); }
  169 |     const points = trail.points.map((point: any) => meterPoint(draw, point));
  170 |     if (row!.active) {
  171 |       expect(row!.dash).toEqual([]); expect(row!.stops).toEqual([[103, 232, 249], [251, 191, 36], [251, 113, 133]]);
  172 |       for (let i = 1; i < points.length; i++) expect(draw.strokes.some(s => s.dash.length === 0 && Math.abs(s.width - 2.5) < .01
  173 |         && Math.abs(s.alpha - 1) < 1e-7 && pathMatches(s.points, [points[i - 1], points[i]]) && s.rgb.join() === speedColor(trail.points[i]).join()), 'focused original segment is solid and speed colored').toBe(true);
  174 |     } else {
  175 |       expect(row!.dash.length).toBeGreaterThan(0); expect(row!.rgb, 'run swatch resolves to a named color').not.toBeNull();
  176 |       expect(patterns.some(pattern => pattern.join() === row.dash.join()), 'assigned line pattern comes from the distinct run palette').toBe(true);
  177 |       const strokes = draw.strokes.filter(s => pathMatches(s.points, points) && s.rgb.join() === row!.rgb!.join() && s.dash.join() === row!.dash.join());
  178 |       if (points.length >= 2) { expect(strokes, 'other run has one continuous actual stroke with SVG-matching CSS dash units').toHaveLength(1);
  179 |         expect(strokes[0].width).toBeCloseTo(2, 6); expect(strokes[0].alpha).toBeCloseTo(row!.alpha, 6); }
  180 |       else expect(strokes, 'a one-point release does not invent a measured path').toHaveLength(0);
  181 |     }
  182 |     expect(row!.text).toMatch(p.drag ? /Air drag on|Drag ON|Air drag/ : /Air drag off|No air drag|No drag/);
  183 |   }
  184 |   const focusedDrawable = drawable.some(trail => draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1);
  185 |   expect(rows.filter(row => row.active)).toHaveLength(Number(focusedDrawable));
  186 |   const otherPatterns = rows.filter(row => !row.active).map(row => row.dash.join());
  187 |   expect(new Set(otherPatterns).size, 'retained comparison paths use distinct patterns').toBe(otherPatterns.length);
  188 |   return rows;
  189 | }
  190 | function styleMap(rows: Awaited<ReturnType<typeof keys>>) { return Object.fromEntries(rows.filter(row => !row.active).map(row => [row.key, { rgb: row.rgb, dash: row.dash, alpha: row.alpha }])); }
  191 | async function select(page: Page, index: number) { await page.locator('[data-physics-history-select]').selectOption(String(index)); }
  192 | function assertVacuumPath(draw: Awaited<ReturnType<typeof paint>>, p: any, kind: string) {
  193 |   expect(draw.preview).toMatchObject({ kind, angle: p.angle, velocity: p.velocity, gravity: p.gravity, launchHeight: p.launchHeight });
  194 |   const rad = p.angle * Math.PI / 180, vx = p.velocity * Math.cos(rad), vy = p.velocity * Math.sin(rad);
  195 |   const time = (vy + Math.sqrt(vy * vy + 2 * p.gravity * p.launchHeight)) / p.gravity, range = vx * time;
  196 |   const expected = Array.from({ length: 41 }, (_, i) => { const x = range * i / 40, t = x / vx; return meterPoint(draw, { mX: x, mY: Math.max(0, p.launchHeight + vy * t - .5 * p.gravity * t * t) }); });
  197 |   expect(draw.strokes.filter(s => s.rgb.join() === '255,255,255' && s.dash.join() === '4,4' && pathMatches(s.points, expected)), 'actual vacuum curve uses the same captured launch parameters').toHaveLength(1);
  198 | }
  199 | async function assertVacuumKey(page: Page, p: any, kind: string, run: number | null = null, referenceScope = 'Current flight') {
  200 |   const key = page.locator('[data-physics-vacuum-key]'); await expect(key).toHaveAttribute('data-physics-vacuum-key', kind);
  201 |   for (const [name, value] of [['angle', p.angle], ['velocity', p.velocity], ['gravity', p.gravity], ['launch-height', p.launchHeight]]) await expect(key).toHaveAttribute('data-' + name, String(value));
  202 |   expect(await key.getAttribute('data-run')).toBe(run == null ? null : String(run));
  203 |   await expect(key).toContainText(kind === 'preview' ? 'White dashed · vacuum preview · Next launch' : 'White dashed · vacuum reference · ' + (run == null ? referenceScope : 'Run ' + run));
  204 |   await expect(key).toContainText('θ ' + p.angle + '° · v₀ ' + p.velocity + ' m/s · g ' + p.gravity + ' m/s² · h₀ ' + p.launchHeight + ' m');
  205 | }
  206 | async function remount(page: Page, state: object) {
  207 |   await page.evaluate(seed => { const w = window as any; w.__destroy(); w.__mount({ physics: seed }); document.getElementById('wrap')!.style.width = '100%'; }, state);
  208 |   await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 }); await paint(page);
  209 | }
  210 | 
  211 | test('five same-angle runs retain distinct painted identities through focus, control changes, and comparison toggles', async ({ page }) => {
  212 |   await mount(page); await fiveRuns(page);
  213 |   const before = await evidence(page), styles: Record<string, unknown> = {};
  214 |   expect(before.trails.map(t => t.parameters.angle)).toEqual([35, 35, 35, 35, 35]);
  215 |   expect(before.trails.slice(0, 2).map(t => t.parameters.drag)).toEqual([false, true]);
  216 |   for (let index = 0; index < 5; index++) {
  217 |     await select(page, index); const draw = await paint(page), rows = await assertPaths(page, draw), current = styleMap(rows);
  218 |     expect(draw.selected.run).toBe(index + 1);
  219 |     for (const [run, style] of Object.entries(current)) { if (styles[run]) expect(style).toEqual(styles[run]); styles[run] = style; }
  220 |   }
  221 |   expect(Object.keys(styles)).toHaveLength(5);
  222 |   expect(new Set(Object.values(styles).map((s: any) => s.dash.join())).size).toBe(5);
  223 |   expect(new Set(Object.values(styles).map((s: any) => s.rgb.join())).size, 'same launch angle retains the same scientific color cue').toBe(1);
  224 |   await expect(page.locator('[data-physics-plot-key]')).toContainText(/Other paths use their run.s line pattern; their color shows launch angle/);
  225 |   await select(page, 1); const selected = (await paint(page)).selected, csv = await copyCsv(page);
  226 |   await patch(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: false });
  227 |   const changed = await paint(page); expect(changed.selected).toEqual(selected); await assertPaths(page, changed);
  228 |   expect(styleMap(await keys(page))).toEqual(Object.fromEntries(Object.entries(styles).filter(([run]) => run !== '2')));
> 229 |   await page.locator('[data-physics-view-toggle="overlay"]').click(); await expect(page.locator('[data-physics-trail-key]')).toHaveCount(0);
      |                                                              ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  230 |   await page.locator('[data-physics-view-toggle="overlay"]').click(); const returned = await paint(page);
  231 |   expect(returned.selected).toEqual(selected); await assertPaths(page, returned);
  232 |   expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
  233 | });
  234 | 
  235 | test('selected old drag flight owns its vacuum reference while a newer no-drag flight is paused', async ({ page }) => {
  236 |   await mount(page); await launch(page, { airResist: true });
  237 |   const original = (await evidence(page)).trails[0].parameters, originalCsv = await copyCsv(page);
  238 |   await patch(page, { angle: 60, velocity: 25, gravity: 1, mass: 4, launchHeight: 30, airResist: false, simSpeed: 0 });
  239 |   await page.locator('[data-physics-launch]').click(); await paint(page);
  240 |   await expect(page.locator('[data-physics-trail-key^="unfinished-"]')).toHaveCount(1);
  241 |   const release = await paint(page); expect(release.trails.at(-1)!.points).toHaveLength(1);
  242 |   const unfinishedKey = (await assertPaths(page, release)).find(row => row.key.startsWith('unfinished-'))!.key;
  243 |   await patch(page, { simSpeed: 1 });
  244 |   await page.evaluate(() => { for (let i = 0; i < 12; i++) (window as any).__trailTick(); }); await patch(page, { simSpeed: 0 });
  245 |   const before = await evidence(page); await select(page, 0); const selected = await paint(page);
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
```