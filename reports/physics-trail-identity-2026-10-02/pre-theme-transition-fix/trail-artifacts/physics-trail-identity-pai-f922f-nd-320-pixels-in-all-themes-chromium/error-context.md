# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-trail-identity.spec.ts >> painted path keys remain readable at 1100, 375, and 320 pixels in all themes
- Location: tests\e2e\physics-trail-identity.spec.ts:385:5

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 1
Received: 0.85

Expected precision:    6
Expected difference: < 0.0000005
Received difference:   0.15000000000000002
```

# Test source

```ts
  80  |       if (maxWidth === undefined) text.call(this, value, x, y); else text.call(this, value, x, y, maxWidth);
  81  |     };
  82  |   });
  83  |   await harness.mount(page, {}, undefined, { expectCanvas: false });
  84  |   await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  85  |   await page.evaluate(() => {
  86  |     const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
  87  |     const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
  88  |     const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
  89  |     w.__trailTheme = (theme: string) => {
  90  |       w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
  91  |       main.className = theme === 'default' ? '' : 'theme-' + theme;
  92  |       card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
  93  |       w.__rerender();
  94  |     };
  95  |     w.__trailCsv = []; w.StemLab.writeClipboard = (csv: string) => { w.__trailCsv.push(csv); return Promise.resolve(); };
  96  |   });
  97  | }
  98  | async function patch(page: Page, value: object) {
  99  |   await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), value);
  100 |   await page.waitForTimeout(40);
  101 | }
  102 | async function finish(page: Page) {
  103 |   await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let ticks = 0; while (cv._launched && ticks++ < 10000) w.__trailTick(); if (cv._launched) throw Error('Trail fixture did not land'); });
  104 | }
  105 | async function launch(page: Page, changes: object = {}) {
  106 |   const run = await page.evaluate(() => ((window as any).__toolData.physics.runCount || 0) + 1);
  107 |   await patch(page, { angle: 35, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, showOverlay: true, showVectors: false, showEnergy: true, showGraphs: true, showFlightData: true, simSpeed: 2, ...changes });
  108 |   await page.locator('[data-physics-launch]').click(); await finish(page);
  109 |   await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, run, { polling: 20 }); await patch(page, { simSpeed: 0 });
  110 | }
  111 | async function fiveRuns(page: Page, count = 5) {
  112 |   for (let i = 0; i < count; i++) await launch(page, { airResist: i % 2 === 1, velocity: i < 2 ? 15 : 15 + i * 2 });
  113 | }
  114 | async function paint(page: Page) {
  115 |   return page.evaluate(() => {
  116 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any; w.__trailStrokes = []; w.__trailText = [];
  117 |     w.__trailFrame++; w.__trailSceneImage = null; w.__trailSceneCapture = null; w.__trailCapture = true;
  118 |     try { cv._physScheduleFrame(); w.__trailTick(); } finally { w.__trailCapture = false; }
  119 |     const b = cv.getBoundingClientRect();
  120 |     return { strokes: w.__trailStrokes as Stroke[], text: w.__trailText as Array<{ text: string; font: number; left: number; right: number; top: number; bottom: number }>,
  121 |       view: cv._launchView, layout: cv._visualLayout, selected: cv._inspection?.snapshot || null, selectedTrail: cv._inspection ? cv._trails.indexOf(cv._inspection.trail) : -1, launched: cv._launched, preview: cv._visualPreview,
  122 |       width: b.width, height: b.height, canvasWidth: cv.width, canvasHeight: cv.height, frame: w.__trailFrame, sceneCapture: w.__trailSceneCapture,
  123 |       pageWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
  124 |       trails: cv._trails.map((t: any, index: number) => ({ key: t.run == null ? null : String(t.run), index, points: [...t], parameters: t.parameters, run: t.run })) };
  125 |   });
  126 | }
  127 | async function evidence(page: Page) {
  128 |   return page.evaluate(() => { const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics; return { ball: cv._ball,
  129 |     trails: cv._trails.map((t: any) => ({ run: t.run, points: [...t], parameters: t.parameters, apex: t.apex, modelVersion: t.modelVersion })),
  130 |     log: d.runLog, recordings: d.recordedFlights, last: d.lastFlight }; });
  131 | }
  132 | async function copyCsv(page: Page) {
  133 |   const active = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  134 |   await page.locator('[data-physics-analysis-tab="data"]').click();
  135 |   const count = await page.evaluate(() => (window as any).__trailCsv.length);
  136 |   await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  137 |   await expect.poll(() => page.evaluate(() => (window as any).__trailCsv.length)).toBe(count + 1);
  138 |   const csv = await page.evaluate(() => (window as any).__trailCsv.at(-1) as string);
  139 |   await page.locator('[data-physics-analysis-tab="' + active + '"]').click(); return csv;
  140 | }
  141 | async function keys(page: Page) {
  142 |   return page.locator('[data-physics-trail-key]').evaluateAll(rows => rows.map(row => {
  143 |     const swatch = row.querySelector('[data-physics-trail-swatch]')!, shaft = swatch.querySelector('path,line,polyline') || swatch;
  144 |     const style = getComputedStyle(shaft), color = style.stroke.match(/^rgba?\(([^)]+)\)$/), b = row.getBoundingClientRect();
  145 |     const labelStyle = getComputedStyle(row), stops = [...swatch.querySelectorAll('stop')].map(stop => getComputedStyle(stop).stopColor.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number).slice(0, 3));
  146 |     let alpha = Number(style.strokeOpacity); for (let p: Element | null = shaft; p && p !== row; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
  147 |     const rgba = (value: string) => value.match(/^rgba?\(([^)]+)\)$/)![1].split(',').map(Number);
  148 |     let surface: number[] | null = null; for (let p: Element | null = row; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c.length === 3 || c[3] >= .99) { surface = c; break; } }
  149 |     if (!surface) throw Error('Trail swatch lacks an opaque surface');
  150 |     const lum = (c: number[]) => c.slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  151 |     const paints = color ? [color[1].split(',').map(Number).slice(0, 3)] : stops;
  152 |     const svgContrast = Math.min(...paints.map(c => { const a = lum(c.map((v, i) => v * alpha + surface![i] * (1 - alpha))), b = lum(surface!); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
  153 |     return { key: row.getAttribute('data-physics-trail-key')!, active: row.getAttribute('data-active') === 'true', model: row.getAttribute('data-model'),
  154 |       role: row.getAttribute('data-role'), sampleCount: Number(row.getAttribute('data-sample-count')), alpha, stops, svgContrast, viewBox: swatch.getAttribute('viewBox'), contrastTheme: row.closest('#physics-fs-outer')!.getAttribute('data-physics-theme') === 'contrast',
  155 |       text: row.textContent!.replace(/\s+/g, ' ').trim(), rgb: color ? color[1].split(',').map(Number).slice(0, 3) : null,
  156 |       dash: style.strokeDasharray === 'none' ? [] : style.strokeDasharray.split(/[,\s]+/).map(parseFloat),
  157 |       left: b.left, right: b.right, font: parseFloat(labelStyle.fontSize) };
  158 |   }));
  159 | }
  160 | function same(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6; }
  161 | function pathMatches(actual: Point[], expected: Point[]) { return actual.length === expected.length && actual.every((p, i) => same(p, expected[i])); }
  162 | function meterPoint(draw: Awaited<ReturnType<typeof paint>>, p: any) {
  163 |   return { x: (draw.view.x + p.mX * draw.view.scale) * draw.width / draw.layout.width, y: (draw.view.groundY - p.mY * draw.view.scale) * draw.height / draw.layout.height };
  164 | }
  165 | function speedColor(p: any) {
  166 |   const n = Math.min(1, Math.hypot(p.mVx, p.mVy) / 60), stops = [[103, 232, 249], [251, 191, 36], [251, 113, 133]], segment = n < .5 ? 0 : 1, blend = segment === 0 ? n * 2 : (n - .5) * 2;
  167 |   return stops[segment].map((value, i) => Math.round(value + (stops[segment + 1][i] - value) * blend));
  168 | }
  169 | async function assertPaths(page: Page, draw: Awaited<ReturnType<typeof paint>>) {
  170 |   const drawable = draw.trails.filter(t => t.points.length >= 2 || draw.launched && t.index === draw.trails.length - 1 && t.points.length === 1);
  171 |   const rows = await keys(page); expect(rows).toHaveLength(drawable.length);
  172 |   expect(new Set(rows.map(row => row.key)).size, 'each drawable original has one unique row identity').toBe(rows.length);
  173 |   for (const [index, trail] of drawable.entries()) {
  174 |     const row = rows[index];
  175 |     if (trail.key) expect(row.key).toBe(trail.key); else expect(row.key).toMatch(/^unfinished-\d+$/);
  176 |     const p = trail.parameters; expect(row.model).toBe(p.drag ? 'drag' : 'vacuum');
  177 |     const active = draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1;
  178 |     const role = active && draw.selected ? 'selected' : trail.index === draw.trails.length - 1 && draw.launched ? 'current' : trail.run == null ? 'unfinished' : trail.index === draw.trails.length - 1 ? 'latest' : 'recorded';
  179 |     expect(row!.active).toBe(active); expect(row!.role).toBe(role); expect(row!.sampleCount).toBe(trail.points.length); expect(row!.viewBox).toBe('0 0 56 16');
> 180 |     expect(row!.alpha).toBeCloseTo(active || row!.contrastTheme ? 1 : .85, 6);
      |                        ^ Error: expect(received).toBeCloseTo(expected, precision)
  181 |     const label = row!.text.replace(/\s/g, ''); expect(label).toContain('θ' + p.angle + '°'); expect(label).toContain('v₀' + p.velocity + 'm/s');
  182 |     if (trail.run != null) expect(row!.text).toContain('Run ' + trail.run); else { expect(row!.key).toMatch(/^unfinished-\d+$/); expect(row!.text).toMatch(/^Unfinished path \d+/); expect(row!.text).not.toMatch(/Run \d+/); }
  183 |     const points = trail.points.map((point: any) => meterPoint(draw, point));
  184 |     if (row!.active) {
  185 |       expect(row!.dash).toEqual([]); expect(row!.stops).toEqual([[103, 232, 249], [251, 191, 36], [251, 113, 133]]);
  186 |       for (let i = 1; i < points.length; i++) expect(draw.strokes.some(s => s.dash.length === 0 && Math.abs(s.width - 2.5) < .01
  187 |         && Math.abs(s.alpha - 1) < 1e-7 && pathMatches(s.points, [points[i - 1], points[i]]) && s.rgb.join() === speedColor(trail.points[i]).join()), 'focused original segment is solid and speed colored').toBe(true);
  188 |     } else {
  189 |       expect(row!.dash.length).toBeGreaterThan(0); expect(row!.rgb, 'run swatch resolves to a named color').not.toBeNull();
  190 |       expect(patterns.some(pattern => pattern.join() === row.dash.join()), 'assigned line pattern comes from the distinct run palette').toBe(true);
  191 |       const strokes = draw.strokes.filter(s => pathMatches(s.points, points) && s.rgb.join() === row!.rgb!.join() && s.dash.join() === row!.dash.join());
  192 |       if (points.length >= 2) { expect(strokes, 'other run has one continuous actual stroke with SVG-matching CSS dash units').toHaveLength(1);
  193 |         expect(strokes[0].width).toBeCloseTo(2, 6); expect(strokes[0].alpha).toBeCloseTo(row!.alpha, 6); }
  194 |       else expect(strokes, 'a one-point release does not invent a measured path').toHaveLength(0);
  195 |     }
  196 |     expect(row!.text).toMatch(p.drag ? /Air drag on|Drag ON|Air drag/ : /Air drag off|No air drag|No drag/);
  197 |   }
  198 |   const focusedDrawable = drawable.some(trail => draw.selected ? trail.index === draw.selectedTrail : trail.index === draw.trails.length - 1);
  199 |   expect(rows.filter(row => row.active)).toHaveLength(Number(focusedDrawable));
  200 |   const otherPatterns = rows.filter(row => !row.active).map(row => row.dash.join());
  201 |   expect(new Set(otherPatterns).size, 'retained comparison paths use distinct patterns').toBe(otherPatterns.length);
  202 |   return rows;
  203 | }
  204 | function trajectoryStrokes(draw: Awaited<ReturnType<typeof paint>>, rows: Awaited<ReturnType<typeof keys>>) {
  205 |   const originals = draw.trails.filter(trail => trail.points.length >= 2 || draw.launched && trail.index === draw.trails.length - 1 && trail.points.length === 1);
  206 |   const matched: Array<{ run: string; segment: number | null; stroke: Stroke }> = [];
  207 |   let expected = 0;
  208 |   for (const [index, trail] of originals.entries()) {
  209 |     const row = rows[index], points = trail.points.map((point: any) => meterPoint(draw, point));
  210 |     if (row.active) {
  211 |       expected += Math.max(0, points.length - 1);
  212 |       for (let segment = 1; segment < points.length; segment++) {
  213 |         const matches = draw.strokes.filter(stroke => pathMatches(stroke.points, [points[segment - 1], points[segment]])
  214 |           && stroke.rgb.join() === speedColor(trail.points[segment]).join() && stroke.dash.length === 0
  215 |           && Math.abs(stroke.width - 2.5) < .01 && Math.abs(stroke.alpha - 1) < 1e-7);
  216 |         expect(matches, 'exact focused original segment ' + segment + ' has one actual paint').toHaveLength(1);
  217 |         matched.push({ run: row.key, segment, stroke: matches[0] });
  218 |       }
  219 |     } else if (points.length >= 2) {
  220 |       expected++;
  221 |       const matches = draw.strokes.filter(stroke => pathMatches(stroke.points, points) && stroke.rgb.join() === row.rgb!.join()
  222 |         && stroke.dash.join() === row.dash.join() && Math.abs(stroke.width - 2) < .01 && Math.abs(stroke.alpha - row.alpha) < 1e-7);
  223 |       expect(matches, 'exact original path ' + row.key + ' has one actual paint').toHaveLength(1);
  224 |       matched.push({ run: row.key, segment: null, stroke: matches[0] });
  225 |     }
  226 |   }
  227 |   expect(matched, 'all original focused segments and comparison paths have contrast evidence').toHaveLength(expected);
  228 |   return matched;
  229 | }
  230 | function styleMap(rows: Awaited<ReturnType<typeof keys>>) { return Object.fromEntries(rows.filter(row => !row.active).map(row => [row.key, { rgb: row.rgb, dash: row.dash, alpha: row.alpha }])); }
  231 | async function select(page: Page, index: number) { await page.locator('[data-physics-history-select]').selectOption(String(index)); }
  232 | function vacuumPoints(draw: Awaited<ReturnType<typeof paint>>, p: any) {
  233 |   const rad = p.angle * Math.PI / 180, vx = p.velocity * Math.cos(rad), vy = p.velocity * Math.sin(rad);
  234 |   const time = (vy + Math.sqrt(vy * vy + 2 * p.gravity * p.launchHeight)) / p.gravity, range = vx * time;
  235 |   return Array.from({ length: 41 }, (_, i) => { const x = range * i / 40, t = x / vx; return meterPoint(draw, { mX: x, mY: Math.max(0, p.launchHeight + vy * t - .5 * p.gravity * t * t) }); });
  236 | }
  237 | function assertVacuumPath(draw: Awaited<ReturnType<typeof paint>>, p: any, kind: string) {
  238 |   expect(draw.preview).toMatchObject({ kind, angle: p.angle, velocity: p.velocity, gravity: p.gravity, launchHeight: p.launchHeight });
  239 |   expect(draw.strokes.filter(s => s.rgb.join() === '255,255,255' && s.dash.join() === '4,4' && pathMatches(s.points, vacuumPoints(draw, p))), 'actual vacuum curve uses the same captured launch parameters').toHaveLength(1);
  240 | }
  241 | function assertSceneCapture(draw: Awaited<ReturnType<typeof paint>>, theme: string) {
  242 |   expect(draw.sceneCapture, 'this frame captured actual scene pixels before the verified vacuum curve').not.toBeNull();
  243 |   const capture = draw.sceneCapture, p = draw.selected.parameters;
  244 |   assertVacuumPath(draw, p, 'reference');
  245 |   expect(capture).toMatchObject({ frame: draw.frame, beforeStroke: true, rgb: [255, 255, 255], dash: [4, 4], canvasWidth: draw.canvasWidth, canvasHeight: draw.canvasHeight });
  246 |   expect(capture.width).toBeCloseTo(1.2, 6); expect(capture.alpha).toBeCloseTo(theme === 'contrast' ? 1 : .56, 6);
  247 |   expect(capture.parameters).toMatchObject({ angle: p.angle, velocity: p.velocity, gravity: p.gravity, launchHeight: p.launchHeight });
  248 |   expect(pathMatches(capture.points, vacuumPoints(draw, p)), 'scene capture precedes the original-scope 41-point vacuum stroke').toBe(true);
  249 |   const actual = draw.strokes[capture.strokeIndex];
  250 |   expect({ points: actual.points, rgb: actual.rgb, alpha: actual.alpha, dash: actual.dash, width: actual.width })
  251 |     .toEqual({ points: capture.points, rgb: capture.rgb, alpha: capture.alpha, dash: capture.dash, width: capture.width });
  252 | }
  253 | async function assertVacuumKey(page: Page, p: any, kind: string, run: number | null = null, referenceScope = 'Current flight') {
  254 |   const key = page.locator('[data-physics-vacuum-key]'); await expect(key).toHaveAttribute('data-physics-vacuum-key', kind);
  255 |   for (const [name, value] of [['angle', p.angle], ['velocity', p.velocity], ['gravity', p.gravity], ['launch-height', p.launchHeight]]) await expect(key).toHaveAttribute('data-' + name, String(value));
  256 |   expect(await key.getAttribute('data-run')).toBe(run == null ? null : String(run));
  257 |   await expect(key).toContainText(kind === 'preview' ? 'White dashed · vacuum preview · Next launch' : 'White dashed · vacuum reference · ' + (run == null ? referenceScope : 'Run ' + run));
  258 |   await expect(key).toContainText('θ ' + p.angle + '° · v₀ ' + p.velocity + ' m/s · g ' + p.gravity + ' m/s² · h₀ ' + p.launchHeight + ' m');
  259 | }
  260 | async function remount(page: Page, state: object) {
  261 |   await page.evaluate(seed => { const w = window as any; w.__destroy(); w.__mount({ physics: seed }); document.getElementById('wrap')!.style.width = '100%'; }, state);
  262 |   await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 }); await paint(page);
  263 | }
  264 | 
  265 | test('five same-angle runs retain distinct painted identities through focus, control changes, and comparison toggles', async ({ page }) => {
  266 |   await mount(page); await fiveRuns(page);
  267 |   const before = await evidence(page), styles: Record<string, unknown> = {};
  268 |   expect(before.trails.map(t => t.parameters.angle)).toEqual([35, 35, 35, 35, 35]);
  269 |   expect(before.trails.slice(0, 2).map(t => t.parameters.drag)).toEqual([false, true]);
  270 |   for (let index = 0; index < 5; index++) {
  271 |     await select(page, index); const draw = await paint(page), rows = await assertPaths(page, draw), current = styleMap(rows);
  272 |     expect(draw.selected.run).toBe(index + 1);
  273 |     for (const [run, style] of Object.entries(current)) { if (styles[run]) expect(style).toEqual(styles[run]); styles[run] = style; }
  274 |   }
  275 |   expect(Object.keys(styles)).toHaveLength(5);
  276 |   expect(new Set(Object.values(styles).map((s: any) => s.dash.join())).size).toBe(5);
  277 |   expect(new Set(Object.values(styles).map((s: any) => s.rgb.join())).size, 'same launch angle retains the same scientific color cue').toBe(1);
  278 |   await expect(page.locator('[data-physics-plot-key]')).toContainText(/Other paths use their run.s line pattern; their color shows launch angle/);
  279 |   await select(page, 1); const selected = (await paint(page)).selected, csv = await copyCsv(page);
  280 |   await patch(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: false });
```