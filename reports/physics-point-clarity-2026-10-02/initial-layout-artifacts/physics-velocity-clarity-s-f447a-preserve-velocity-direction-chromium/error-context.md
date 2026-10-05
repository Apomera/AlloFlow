# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-velocity-clarity.spec.ts >> selected launch, rising, apex, near-apex, falling, and impact cards match original points and preserve velocity direction
- Location: tests\e2e\physics-velocity-clarity.spec.ts:412:5

# Error details

```
Error: actual selected-panel paint reflects the original point

expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 1

  Array [
    "Launch point",
+   "15",
    "y = 10.00 m · t = 0.000 s",
  ]
```

# Test source

```ts
  180 |       arcs: w.__velocityArcs as PaintedArc[], width: bounds.width, height: bounds.height, vectors: cv._visualVectors,
  181 |       selected: cv._inspection?.snapshot || null,
  182 |       selectedOriginal: cv._inspection ? { index: cv._inspection.index, count: cv._inspection.trail.length,
  183 |         run: cv._inspection.trail.run ?? null, point: { ...cv._inspection.trail[cv._inspection.index] },
  184 |         apex: cv._inspection.trail.apex || null } : null,
  185 |       visualInspection: cv._visualInspection, ball: cv._ball, launched: cv._launched,
  186 |       layout: cv._visualLayout, pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth };
  187 |   });
  188 | }
  189 | 
  190 | async function launch(page: Page, patch: object = {}) {
  191 |   await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
  192 |     simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true, ...patch });
  193 |   await page.locator('[data-physics-launch]').click();
  194 |   await page.evaluate(() => {
  195 |     const cv = document.getElementById('physicsCanvas') as any;
  196 |     let ticks = 0;
  197 |     while (cv._launched && ticks++ < 10000) (window as any).__tickVelocity();
  198 |     if (cv._launched) throw new Error('The velocity-clarity fixture did not land');
  199 |   });
  200 |   await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  201 |   await setState(page, { simSpeed: 0 });
  202 |   await page.locator('[data-physics-inspect]').click();
  203 | }
  204 | 
  205 | async function evidence(page: Page) {
  206 |   return page.evaluate(() => {
  207 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  208 |     return { ball: cv._ball, trails: cv._trails.map((trail: any) => ({ points: [...trail], parameters: trail.parameters,
  209 |       modelVersion: trail.modelVersion, run: trail.run, apex: trail.apex })), runLog: w.__toolData.physics.runLog,
  210 |       lastFlight: w.__toolData.physics.lastFlight, recordedFlights: w.__toolData.physics.recordedFlights };
  211 |   });
  212 | }
  213 | 
  214 | async function copyCsv(page: Page) {
  215 |   const active = await page.locator('[data-physics-analysis-tab][aria-selected="true"]').getAttribute('data-physics-analysis-tab');
  216 |   await page.locator('[data-physics-analysis-tab="data"]').click();
  217 |   const before = await page.evaluate(() => (window as any).__velocityCsv.length);
  218 |   await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  219 |   await expect.poll(() => page.evaluate(() => (window as any).__velocityCsv.length)).toBe(before + 1);
  220 |   const csv = await page.evaluate(() => (window as any).__velocityCsv.at(-1) as string);
  221 |   await page.locator(`[data-physics-analysis-tab="${active}"]`).click();
  222 |   return csv;
  223 | }
  224 | 
  225 | function samePoint(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-7; }
  226 | function pointEqual(actual: Point, expected: Point) {
  227 |   expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
  228 | }
  229 | function header(draw: Awaited<ReturnType<typeof readDraw>>) { return draw.text.filter(item => item.y < 100).map(item => item.text).join('\n'); }
  230 | 
  231 | function expectReadable(draw: Awaited<ReturnType<typeof readDraw>>, label: string) {
  232 |   expect(draw.text.length, label + ' real canvas text').toBeGreaterThan(5);
  233 |   for (const item of draw.text) {
  234 |     expect(item.fontSize, label + ': ' + item.text).toBeGreaterThanOrEqual(11.99);
  235 |     expect(item.left, label + ': ' + item.text + ' left').toBeGreaterThanOrEqual(-1);
  236 |     expect(item.right, label + ': ' + item.text + ' right').toBeLessThanOrEqual(draw.width + 1);
  237 |     expect(item.top, label + ': ' + item.text + ' top').toBeGreaterThanOrEqual(-1);
  238 |     expect(item.bottom, label + ': ' + item.text + ' bottom').toBeLessThanOrEqual(draw.height + 1);
  239 |   }
  240 |   expect(draw.pageWidth, label + ' page overflow').toBeLessThanOrEqual(draw.viewportWidth + 1);
  241 |   const row = draw.text.filter(item => Math.abs(item.y - 47) < 1);
  242 |   const speed = row.find(item => item.text.startsWith('|v| ')), settings = row.find(item => item.text.startsWith('g '));
  243 |   if (speed && settings) expect(speed.left - settings.right, label + ' speed separated from gravity/mass').toBeGreaterThanOrEqual(4);
  244 |   expectAnnotationClearance(draw);
  245 | }
  246 | 
  247 | function expectedSelectedCard(draw: Awaited<ReturnType<typeof readDraw>>) {
  248 |   const original = draw.selectedOriginal;
  249 |   expect(original, 'selection exposes its original recorded point').toBeTruthy();
  250 |   const point = original!.point, apex = original!.apex;
  251 |   const canonicalApex = !!apex && point.mVy === 0 && point.t === apex.tSec
  252 |     && point.mX === apex.mX && point.mY === apex.mY && point.mVx === apex.vx;
  253 |   const impact = original!.index === original!.count - 1 && point.t > 0 && point.mY === 0 && point.mVy <= 0;
  254 |   const title = canonicalApex && point.t === 0 ? 'Highest point at release'
  255 |     : original!.index === 0 ? 'Launch point' : canonicalApex ? 'At apex' : impact ? 'Ground impact'
  256 |       : point.mVy > 0 ? 'Rising' : point.mVy < 0 ? 'Falling' : 'Vertical velocity is zero';
  257 |   const height = point.mY !== 0 && Math.abs(point.mY) < .01 ? point.mY.toPrecision(3) : point.mY.toFixed(2);
  258 |   expect(draw.selected).toMatchObject({ index: original!.index, count: original!.count, run: original!.run,
  259 |     t: point.t, x: point.mX, y: point.mY, vx: point.mVx, vy: point.mVy, apex: canonicalApex, impact });
  260 |   return { title, reading: 'y = ' + height + ' m · t = ' + point.t.toFixed(3) + ' s', canonicalApex, impact };
  261 | }
  262 | 
  263 | function selectedCardText(draw: Awaited<ReturnType<typeof readDraw>>) {
  264 |   const inspection = draw.layout.labels.find((label: any) => label.id === 'inspection');
  265 |   expect(inspection, 'selection retains a positioned annotation').toBeTruthy();
  266 |   const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
  267 |   const cards = draw.cards.filter(card => Math.abs(card.x - inspection.x * ratioX) < 1e-7
  268 |     && Math.abs(card.y - inspection.y * ratioY) < 1e-7
  269 |     && Math.abs(card.width - inspection.width * ratioX) < 1e-7
  270 |     && Math.abs(card.height - inspection.height * ratioY) < 1e-7);
  271 |   expect(cards, 'selection has one actually filled panel').toHaveLength(1);
  272 |   const card = cards[0];
  273 |   return draw.text.filter(item => item.left >= card.x - 1 && item.right <= card.x + card.width + 1
  274 |     && item.top >= card.y - 1 && item.bottom <= card.y + card.height + 1)
  275 |     .sort((a, b) => a.y - b.y || a.x - b.x).map(item => item.text);
  276 | }
  277 | 
  278 | function expectSelectedCard(draw: Awaited<ReturnType<typeof readDraw>>) {
  279 |   const expected = expectedSelectedCard(draw);
> 280 |   expect(selectedCardText(draw), 'actual selected-panel paint reflects the original point').toEqual([expected.title, expected.reading]);
      |                                                                                             ^ Error: actual selected-panel paint reflects the original point
  281 |   expect(header(draw), 'HUD retains recorded identity alongside the phase card').toContain('Recorded point');
  282 |   const original = draw.selectedOriginal!;
  283 |   if (original.index === 0) expect(draw.layout.labels.some((label: any) => label.id === 'height'), 'release card replaces separate height card').toBe(false);
  284 |   if (expected.canonicalApex) expect(draw.layout.labels.some((label: any) => label.id === 'apex'), 'canonical apex card replaces separate apex card').toBe(false);
  285 |   if (expected.impact) expect(draw.layout.labels.some((label: any) => label.id === 'landing'), 'impact card replaces separate landing card').toBe(false);
  286 |   const radius = original.index === 0 ? 7 : expected.canonicalApex || expected.impact ? 5 : null;
  287 |   if (radius !== null) {
  288 |     const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
  289 |     const center = { x: draw.visualInspection.x * ratioX, y: draw.visualInspection.y * ratioY };
  290 |     const markerColors = radius === 7 ? ['#67e8f9', '#ffff00'] : ['#fde68a'];
  291 |     const marker = draw.arcs.find(circle => Math.abs(circle.radius - radius * ratioX) < 1e-7
  292 |       && Math.abs(Math.abs(circle.end - circle.start) - Math.PI * 2) < 1e-7
  293 |       && samePoint(circle, center) && circle.alpha === 1 && markerColors.includes(circle.color));
  294 |     expect(marker, 'selected landmark retains its actual stroked ring').toBeTruthy();
  295 |   }
  296 |   return { selectedCardTitle: expected.title, selectedCardReading: expected.reading, selectedCardPaintMatchesOriginal: true };
  297 | }
  298 | 
  299 | async function selectedSnapshot(page: Page, filename: string) {
  300 |   mkdirSync(reports, { recursive: true });
  301 |   await page.locator('.phys-scene').screenshot({ path: path.join(reports, filename), animations: 'disabled' });
  302 | }
  303 | 
  304 | function segmentIntersectsCard(from: Point, to: Point, card: Card, padding: number) {
  305 |   let lower = 0, upper = 1;
  306 |   for (const [origin, delta, minimum, maximum] of [
  307 |     [from.x, to.x - from.x, card.x - padding, card.x + card.width + padding],
  308 |     [from.y, to.y - from.y, card.y - padding, card.y + card.height + padding],
  309 |   ]) {
  310 |     if (Math.abs(delta) < 1e-12) { if (origin < minimum || origin > maximum) return false; continue; }
  311 |     const entry = (minimum - origin) / delta, exit = (maximum - origin) / delta;
  312 |     lower = Math.max(lower, Math.min(entry, exit)); upper = Math.min(upper, Math.max(entry, exit));
  313 |     if (lower > upper) return false;
  314 |   }
  315 |   return true;
  316 | }
  317 | 
  318 | function expectAnnotationClearance(draw: Awaited<ReturnType<typeof readDraw>>) {
  319 |   if (draw.selected) expect(draw.cards.length, 'actual painted annotation panels exist for the selection').toBeGreaterThan(0);
  320 |   expect(draw.cards, 'filled panels agree with retained annotation metadata').toHaveLength(draw.layout.labels.length);
  321 |   const ratioX = draw.width / draw.layout.width, ratioY = draw.height / draw.layout.height;
  322 |   for (const label of draw.layout.labels) {
  323 |     const cards = draw.cards.filter(card => Math.abs(card.x - label.x * ratioX) < 1e-7 && Math.abs(card.y - label.y * ratioY) < 1e-7
  324 |       && Math.abs(card.width - label.width * ratioX) < 1e-7 && Math.abs(card.height - label.height * ratioY) < 1e-7);
  325 |     expect(cards, label.id + ' has one actual painted panel').toHaveLength(1);
  326 |   }
  327 |   const bundle = draw.strokes.filter(stroke => Object.values(colors).includes(stroke.color));
  328 |   for (const card of draw.cards) {
  329 |     expect(card.alpha, 'annotation panel remains opaque').toBe(1);
  330 |     for (const stroke of bundle) for (const segment of stroke.segments) {
  331 |       expect(segmentIntersectsCard(segment.from, segment.to, card, stroke.width / 2),
  332 |         'painted annotation covers a velocity or gravity shaft/head: ' + JSON.stringify({ card, color: stroke.color, segment })).toBe(false);
  333 |     }
  334 |   }
  335 |   const inspection = draw.layout.labels.find((label: any) => label.id === 'inspection');
  336 |   if (draw.selected) {
  337 |     expect(inspection, 'selected recorded point keeps its annotation').toBeTruthy();
  338 |     expect(draw.visualInspection, 'selected point remains plotted').toBeTruthy();
  339 |     expect(draw.visualInspection).toMatchObject({ index: draw.selected.index, run: draw.selected.run, t: draw.selected.t });
  340 |     pointEqual(inspection.anchor, draw.visualInspection);
  341 |     expectSelectedCard(draw);
  342 |   }
  343 |   return { cardCount: draw.cards.length, inspectionCardVisible: !!inspection, annotationVectorClearance: true,
  344 |     ...(draw.selected ? expectSelectedCard(draw) : {}) };
  345 | }
  346 | 
  347 | function expectVelocityArrows(draw: Awaited<ReturnType<typeof readDraw>>, reading: any) {
  348 |   const v = draw.vectors;
  349 |   expect(v).not.toBeNull(); expect(v.scale).toBeGreaterThan(0);
  350 |   const origin = { x: v.x, y: v.y };
  351 |   const resultant = { x: origin.x + reading.vx * v.scale, y: origin.y - reading.vy * v.scale };
  352 |   pointEqual({ x: v.endX, y: v.endY }, resultant);
  353 |   expect(v.vxX).toBeCloseTo(resultant.x, 8); expect(v.vyY).toBeCloseTo(resultant.y, 8);
  354 |   const total = draw.strokes.find(stroke => stroke.color === colors.v && stroke.dash.length === 0
  355 |     && stroke.segments.some(segment => samePoint(segment.from, origin) && samePoint(segment.to, resultant)));
  356 |   expect(total, 'actual resultant stroke').toBeTruthy();
  357 |   for (const [key, value, tip] of [
  358 |     ['vx', reading.vx, { x: resultant.x, y: origin.y }],
  359 |     ['vy', reading.vy, { x: origin.x, y: resultant.y }],
  360 |   ] as const) {
  361 |     const strokes = draw.strokes.filter(stroke => stroke.color === colors[key]);
  362 |     if (value === 0) { expect(strokes, key + ' zero component has no painted arrow').toHaveLength(0); continue; }
  363 |     const shaft = strokes.find(stroke => stroke.dash.length === 2 && stroke.segments.some(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip)));
  364 |     expect(shaft, key + ' actual dashed shaft').toBeTruthy(); expect(shaft!.dash[0]).toBeCloseTo(4, 8); expect(shaft!.dash[1]).toBeCloseTo(3, 8);
  365 |     const body = shaft!.segments.find(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip))!;
  366 |     pointEqual(body.from, origin); pointEqual(body.to, tip);
  367 |     const length = Math.hypot(tip.x - origin.x, tip.y - origin.y);
  368 |     expect(length).toBeCloseTo(Math.abs(value) * v.scale, 8);
  369 |     const heads = strokes.filter(stroke => stroke.dash.length === 0).flatMap(stroke => stroke.segments)
  370 |       .filter(segment => samePoint(segment.from, tip) && !samePoint(segment.to, origin));
  371 |     expect(heads, key + ' actual solid arrowheads').toHaveLength(2);
  372 |     const wingSides: number[] = [];
  373 |     for (const head of heads) {
  374 |       const dx = head.to.x - tip.x, dy = head.to.y - tip.y;
  375 |       expect(dx * (tip.x - origin.x) + dy * (tip.y - origin.y), key + ' heads point with signed component').toBeLessThan(0);
  376 |       expect(Math.hypot(dx, dy), key + ' tiny heads stay proportional').toBeLessThanOrEqual(length / 3 + 1e-7);
  377 |       wingSides.push(dx * (tip.y - origin.y) - dy * (tip.x - origin.x));
  378 |     }
  379 |     expect(wingSides[0] * wingSides[1], key + ' heads straddle the shaft').toBeLessThan(0);
  380 |   }
```