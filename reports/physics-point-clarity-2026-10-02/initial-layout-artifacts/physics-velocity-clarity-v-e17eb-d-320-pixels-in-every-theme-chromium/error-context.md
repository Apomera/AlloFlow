# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-velocity-clarity.spec.ts >> velocity symbols and actual speed remain readable at 1100, 375, and 320 pixels in every theme
- Location: tests\e2e\physics-velocity-clarity.spec.ts:540:5

# Error details

```
Error: selected recorded point keeps its annotation

expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
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
  280 |   expect(selectedCardText(draw), 'actual selected-panel paint reflects the original point').toEqual([expected.title, expected.reading]);
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
> 337 |     expect(inspection, 'selected recorded point keeps its annotation').toBeTruthy();
      |                                                                        ^ Error: selected recorded point keeps its annotation
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
  381 |   const gravity = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length === 2
  382 |     && stroke.segments.some(segment => samePoint(segment.from, origin)));
  383 |   expect(gravity, 'actual separate gravity stroke').toBeTruthy(); expect(gravity!.dash).toEqual([2, 3]);
  384 |   const downward = gravity!.segments.find(segment => samePoint(segment.from, origin))!;
  385 |   expect(downward.to.x).toBeCloseTo(origin.x, 8); expect(downward.to.y).toBeGreaterThan(origin.y);
  386 |   for (const stroke of draw.strokes.filter(item => Object.values(colors).includes(item.color))) {
  387 |     for (const segment of stroke.segments) for (const point of [segment.from, segment.to]) {
  388 |       expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(draw.width);
  389 |       expect(point.y).toBeGreaterThanOrEqual(draw.layout.plotTop); expect(point.y).toBeLessThanOrEqual(draw.layout.groundY);
  390 |     }
  391 |   }
  392 | }
  393 | 
  394 | async function assertLegend(page: Page) {
  395 |   const group = page.locator('[data-physics-velocity-key-group]'); await expect(group).toBeVisible();
  396 |   await expect(group.locator('[data-physics-velocity-key]')).toHaveCount(4);
  397 |   for (const [key, label, pattern] of [
  398 |     ['v', 'Velocity v · m/s', null], ['vx', 'Horizontal vx · m/s', '4 3'],
  399 |     ['vy', 'Vertical vy · m/s', '4 3'], ['gravity', 'Gravity g · m/s²', '2 3'],
  400 |   ] as const) {
  401 |     const entry = group.locator(`[data-physics-velocity-key="${key}"]`); await expect(entry).toHaveText(label);
  402 |     await expect(entry.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  403 |     await expect(entry.locator('svg path')).toHaveCount(2);
  404 |     expect(await entry.locator('svg path').first().getAttribute('stroke-dasharray')).toBe(pattern);
  405 |     expect(await entry.locator('svg path').last().getAttribute('stroke-dasharray')).toBeNull();
  406 |   }
  407 |   await expect(group.locator('[data-physics-speed-help]')).toHaveText('v₀ is launch speed. Speed |v| = √(vx² + vy²). At the apex vy = 0, so speed = |vx|.');
  408 |   await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Velocity arrows share a scale at each point');
  409 |   await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Gravity uses a separate scale');
  410 | }
  411 | 
  412 | test('selected launch, rising, apex, near-apex, falling, and impact cards match original points and preserve velocity direction', async ({ page }) => {
  413 |   await mount(page); await launch(page);
  414 |   const before = await evidence(page); await assertLegend(page);
  415 |   await page.locator('[data-physics-sample-jump="launch"]').click();
  416 |   let draw = await readDraw(page); expect(draw.selected.phase).toBe('rising'); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'launch');
  417 |   await selectedSnapshot(page, 'selected-launch.png');
  418 |   const gravityShaft = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length)!;
  419 |   const gravityLength = gravityShaft.segments[0].to.y - gravityShaft.segments[0].from.y;
  420 |   expect(gravityLength / draw.selected.parameters.gravity).not.toBeCloseTo(draw.vectors.scale, 5);
  421 |   await page.locator('[data-physics-sample-next]').click();
  422 |   draw = await readDraw(page); expect(draw.selected.index).toBeGreaterThan(0); expect(draw.selected.vy).toBeGreaterThan(0);
  423 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'original rising point');
  424 |   await selectedSnapshot(page, 'selected-rising.png');
  425 |   await page.locator('[data-physics-sample-jump="highest"]').click();
  426 |   draw = await readDraw(page); expect(draw.selected).toMatchObject({ phase: 'apex', vy: 0 });
  427 |   expect(draw.selected.speed).toBeCloseTo(Math.abs(draw.selected.vx), 10); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'apex');
  428 |   expect(header(draw)).toContain('|v| ' + Math.abs(draw.selected.vx).toFixed(2) + ' m/s');
  429 |   await selectedSnapshot(page, 'selected-apex.png');
  430 |   await page.locator('[data-physics-sample-next]').click();
  431 |   draw = await readDraw(page); expect(draw.selected.vy).toBeLessThan(0); expect(Math.abs(draw.selected.vy)).toBeLessThan(.05);
  432 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'tiny near apex');
  433 |   expect(selectedCardText(draw)[0]).toBe('Falling'); await selectedSnapshot(page, 'selected-near-apex.png');
  434 |   for (let index = 0; index < 12; index++) await page.locator('[data-physics-sample-next]').click();
  435 |   draw = await readDraw(page); expect(draw.selected.phase).toBe('falling'); expect(draw.selected.vy).toBeLessThan(-1);
  436 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'falling');
  437 |   await selectedSnapshot(page, 'selected-falling.png');
```