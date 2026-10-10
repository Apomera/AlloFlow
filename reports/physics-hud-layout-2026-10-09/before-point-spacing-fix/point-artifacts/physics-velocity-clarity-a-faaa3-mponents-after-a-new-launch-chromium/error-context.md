# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-velocity-clarity.spec.ts >> actual speed stays tied to the selected record after controls change and uses current live components after a new launch
- Location: tests\e2e\physics-velocity-clarity.spec.ts:448:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "g 9.8 m/s²  ·  2 kg"
Received string:    "45° · v₀ 15 m/s · h₀ 10 m
g 9.8 m/s² · 2 kg
|v| 10.61 m/s
Run 1 · Recorded point · No air drag
t 1.085 s
Vx 10.61 m/s
Vy -0.03 m/s"
```

# Test source

```ts
  360 |   for (const [key, value, tip] of [
  361 |     ['vx', reading.vx, { x: resultant.x, y: origin.y }],
  362 |     ['vy', reading.vy, { x: origin.x, y: resultant.y }],
  363 |   ] as const) {
  364 |     const strokes = draw.strokes.filter(stroke => stroke.color === colors[key]);
  365 |     if (value === 0) { expect(strokes, key + ' zero component has no painted arrow').toHaveLength(0); continue; }
  366 |     const shaft = strokes.find(stroke => stroke.dash.length === 2 && stroke.segments.some(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip)));
  367 |     expect(shaft, key + ' actual dashed shaft').toBeTruthy(); expect(shaft!.dash[0]).toBeCloseTo(4, 8); expect(shaft!.dash[1]).toBeCloseTo(3, 8);
  368 |     const body = shaft!.segments.find(segment => samePoint(segment.from, origin) && samePoint(segment.to, tip))!;
  369 |     pointEqual(body.from, origin); pointEqual(body.to, tip);
  370 |     const length = Math.hypot(tip.x - origin.x, tip.y - origin.y);
  371 |     expect(length).toBeCloseTo(Math.abs(value) * v.scale, 8);
  372 |     const heads = strokes.filter(stroke => stroke.dash.length === 0).flatMap(stroke => stroke.segments)
  373 |       .filter(segment => samePoint(segment.from, tip) && !samePoint(segment.to, origin));
  374 |     expect(heads, key + ' actual solid arrowheads').toHaveLength(2);
  375 |     const wingSides: number[] = [];
  376 |     for (const head of heads) {
  377 |       const dx = head.to.x - tip.x, dy = head.to.y - tip.y;
  378 |       expect(dx * (tip.x - origin.x) + dy * (tip.y - origin.y), key + ' heads point with signed component').toBeLessThan(0);
  379 |       expect(Math.hypot(dx, dy), key + ' tiny heads stay proportional').toBeLessThanOrEqual(length / 3 + 1e-7);
  380 |       wingSides.push(dx * (tip.y - origin.y) - dy * (tip.x - origin.x));
  381 |     }
  382 |     expect(wingSides[0] * wingSides[1], key + ' heads straddle the shaft').toBeLessThan(0);
  383 |   }
  384 |   const gravity = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length === 2
  385 |     && stroke.segments.some(segment => samePoint(segment.from, origin)));
  386 |   expect(gravity, 'actual separate gravity stroke').toBeTruthy(); expect(gravity!.dash).toEqual([2, 3]);
  387 |   const downward = gravity!.segments.find(segment => samePoint(segment.from, origin))!;
  388 |   expect(downward.to.x).toBeCloseTo(origin.x, 8); expect(downward.to.y).toBeGreaterThan(origin.y);
  389 |   for (const stroke of draw.strokes.filter(item => Object.values(colors).includes(item.color))) {
  390 |     for (const segment of stroke.segments) for (const point of [segment.from, segment.to]) {
  391 |       expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(draw.width);
  392 |       expect(point.y).toBeGreaterThanOrEqual(draw.layout.plotTop); expect(point.y).toBeLessThanOrEqual(draw.layout.groundY);
  393 |     }
  394 |   }
  395 | }
  396 | 
  397 | async function assertLegend(page: Page) {
  398 |   const group = page.locator('[data-physics-velocity-key-group]'); await expect(group).toBeVisible();
  399 |   await expect(group.locator('[data-physics-velocity-key]')).toHaveCount(4);
  400 |   for (const [key, label, pattern] of [
  401 |     ['v', 'Velocity v · m/s', null], ['vx', 'Horizontal vx · m/s', '4 3'],
  402 |     ['vy', 'Vertical vy · m/s', '4 3'], ['gravity', 'Gravity g · m/s²', '2 3'],
  403 |   ] as const) {
  404 |     const entry = group.locator(`[data-physics-velocity-key="${key}"]`); await expect(entry).toHaveText(label);
  405 |     await expect(entry.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  406 |     await expect(entry.locator('svg path')).toHaveCount(2);
  407 |     expect(await entry.locator('svg path').first().getAttribute('stroke-dasharray')).toBe(pattern);
  408 |     expect(await entry.locator('svg path').last().getAttribute('stroke-dasharray')).toBeNull();
  409 |   }
  410 |   await expect(group.locator('[data-physics-speed-help]')).toHaveText('v₀ is launch speed. Speed |v| = √(vx² + vy²). At the apex vy = 0, so speed = |vx|.');
  411 |   await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Velocity arrows share a scale at each point');
  412 |   await expect(group.locator('[data-physics-velocity-scale-help]')).toContainText('Gravity uses a separate scale');
  413 | }
  414 | 
  415 | test('selected launch, rising, apex, near-apex, falling, and impact cards match original points and preserve velocity direction', async ({ page }) => {
  416 |   await mount(page); await launch(page);
  417 |   const before = await evidence(page); await assertLegend(page);
  418 |   await page.locator('[data-physics-sample-jump="launch"]').click();
  419 |   let draw = await readDraw(page); expect(draw.selected.phase).toBe('rising'); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'launch');
  420 |   await selectedSnapshot(page, 'selected-launch.png');
  421 |   const gravityShaft = draw.strokes.find(stroke => stroke.color === colors.gravity && stroke.dash.length)!;
  422 |   const gravityLength = gravityShaft.segments[0].to.y - gravityShaft.segments[0].from.y;
  423 |   expect(gravityLength / draw.selected.parameters.gravity).not.toBeCloseTo(draw.vectors.scale, 5);
  424 |   await page.locator('[data-physics-sample-next]').click();
  425 |   draw = await readDraw(page); expect(draw.selected.index).toBeGreaterThan(0); expect(draw.selected.vy).toBeGreaterThan(0);
  426 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'original rising point');
  427 |   await selectedSnapshot(page, 'selected-rising.png');
  428 |   await page.locator('[data-physics-sample-jump="highest"]').click();
  429 |   draw = await readDraw(page); expect(draw.selected).toMatchObject({ phase: 'apex', vy: 0 });
  430 |   expect(draw.selected.speed).toBeCloseTo(Math.abs(draw.selected.vx), 10); expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'apex');
  431 |   expect(header(draw)).toContain('|v| ' + Math.abs(draw.selected.vx).toFixed(2) + ' m/s');
  432 |   await selectedSnapshot(page, 'selected-apex.png');
  433 |   await page.locator('[data-physics-sample-next]').click();
  434 |   draw = await readDraw(page); expect(draw.selected.vy).toBeLessThan(0); expect(Math.abs(draw.selected.vy)).toBeLessThan(.05);
  435 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'tiny near apex');
  436 |   expect(selectedCardText(draw)[0]).toBe('Falling'); await selectedSnapshot(page, 'selected-near-apex.png');
  437 |   for (let index = 0; index < 12; index++) await page.locator('[data-physics-sample-next]').click();
  438 |   draw = await readDraw(page); expect(draw.selected.phase).toBe('falling'); expect(draw.selected.vy).toBeLessThan(-1);
  439 |   expectVelocityArrows(draw, draw.selected); expectReadable(draw, 'falling');
  440 |   await selectedSnapshot(page, 'selected-falling.png');
  441 |   await page.locator('[data-physics-sample-jump="latest"]').click();
  442 |   draw = await readDraw(page); expect(draw.selected.impact).toBe(true); expect(draw.vectors).toBeNull(); expectReadable(draw, 'impact');
  443 |   expect(draw.strokes.filter(stroke => Object.values(colors).includes(stroke.color))).toHaveLength(0);
  444 |   await selectedSnapshot(page, 'selected-impact.png');
  445 |   expect(await evidence(page)).toEqual(before);
  446 | });
  447 | 
  448 | test('actual speed stays tied to the selected record after controls change and uses current live components after a new launch', async ({ page }) => {
  449 |   await page.setViewportSize({ width: 320, height: 900 });
  450 |   await mount(page); await launch(page);
  451 |   await page.locator('[data-physics-sample-jump="highest"]').click(); await page.locator('[data-physics-sample-next]').click();
  452 |   const originalDraw = await readDraw(page), sample = originalDraw.selected, originalCard = selectedCardText(originalDraw),
  453 |     before = await evidence(page), csv = await copyCsv(page);
  454 |   expectSelectedCard(originalDraw);
  455 |   const expectedSpeed = Math.hypot(sample.vx, sample.vy).toFixed(2);
  456 |   await setState(page, { angle: 80, velocity: 50, gravity: 25, mass: 9, launchHeight: 50, airResist: true });
  457 |   for (const showVectors of [true, false, true]) {
  458 |     await setState(page, { showVectors }); const draw = await readDraw(page);
  459 |     expect(draw.selected).toEqual(sample); expect(selectedCardText(draw)).toEqual(originalCard); expect(header(draw)).toContain('v₀ 15 m/s');
> 460 |     expect(header(draw)).toContain('|v| ' + expectedSpeed + ' m/s'); expect(header(draw)).toContain('g 9.8 m/s²  ·  2 kg');
      |                                                                                           ^ Error: expect(received).toContain(expected) // indexOf
  461 |     if (showVectors) { expectVelocityArrows(draw, sample); await assertLegend(page); }
  462 |     else { expect(draw.vectors).toBeNull(); await expect(page.locator('[data-physics-velocity-key-group]')).toHaveCount(0); }
  463 |     expectReadable(draw, 'retained selected speed'); expect(await evidence(page)).toEqual(before);
  464 |   }
  465 |   expect(await copyCsv(page)).toBe(csv); await selectedSnapshot(page, 'selected-after-six-control-changes.png');
  466 |   await page.locator('[data-physics-sample-close]').click();
  467 |   let draw = await readDraw(page); expect(draw.selected).toBeNull(); expect(header(draw)).toContain('v₀ 50 m/s');
  468 |   expect(header(draw)).not.toContain('|v| '); expectReadable(draw, 'next launch has no stale instantaneous speed');
  469 |   await setState(page, { simSpeed: 1 }); await page.locator('[data-physics-launch]').click();
  470 |   await page.evaluate(() => { for (let index = 0; index < 35; index++) (window as any).__tickVelocity(); });
  471 |   await setState(page, { simSpeed: 0 }); draw = await readDraw(page);
  472 |   expect(draw.launched).toBe(true); expect(draw.selected).toBeNull();
  473 |   const liveSpeed = Math.hypot(draw.ball.mVx, draw.ball.mVy);
  474 |   expect(liveSpeed).toBeLessThan(50); expect(header(draw)).toContain('|v| ' + liveSpeed.toFixed(1) + ' m/s');
  475 |   expect(header(draw)).toContain('v₀ 50 m/s'); expectReadable(draw, 'live instantaneous speed');
  476 | });
  477 | 
  478 | test('live near-apex vertical velocity retains its small negative value and painted downward component', async ({ page }) => {
  479 |   await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  480 |   await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
  481 |     simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  482 |   await page.locator('[data-physics-launch]').click();
  483 |   await page.evaluate(() => {
  484 |     const cv = document.getElementById('physicsCanvas') as any;
  485 |     let ticks = 0;
  486 |     while (cv._launched && cv._ball.mVy >= 0 && ticks++ < 1000) (window as any).__tickVelocity();
  487 |     if (!cv._launched || cv._ball.mVy >= 0) throw new Error('The live near-apex fixture was not reached');
  488 |   });
  489 |   await setState(page, { simSpeed: 0 });
  490 |   const before = await evidence(page), draw = await readDraw(page);
  491 |   expect(draw.selected).toBeNull(); expect(draw.launched).toBe(true);
  492 |   expect(draw.ball.mVy).toBeLessThan(0); expect(Math.abs(draw.ball.mVy)).toBeLessThan(.05);
  493 |   const expectedVy = Math.abs(draw.ball.mVy) < .01 ? draw.ball.mVy.toPrecision(3) : draw.ball.mVy.toFixed(2);
  494 |   expect(header(draw)).toContain('Vy ' + expectedVy + ' m/s'); expect(header(draw)).not.toContain('Vy -0.0 m/s');
  495 |   expect(header(draw)).toContain('|v| ' + Math.hypot(draw.ball.mVx, draw.ball.mVy).toFixed(1) + ' m/s');
  496 |   expectVelocityArrows(draw, { vx: draw.ball.mVx, vy: draw.ball.mVy }); expectReadable(draw, 'small live vertical velocity');
  497 |   expect(await evidence(page)).toEqual(before);
  498 | });
  499 | test('horizontal release card distinguishes an unresolved launch point from the canonical highest point at release', async ({ page }) => {
  500 |   await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  501 |   await setState(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
  502 |     simSpeed: 0, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  503 |   await page.locator('[data-physics-launch]').click(); await readDraw(page);
  504 |   await page.locator('[data-physics-inspect]').click();
  505 |   let draw = await readDraw(page), before = await evidence(page);
  506 |   expect(draw.selected).toMatchObject({ index: 0, t: 0, vy: 0, apex: false, impact: false });
  507 |   expect(draw.selectedOriginal.apex).toBeNull(); expectReadable(draw, 'unresolved horizontal release');
  508 |   expect(selectedCardText(draw)[0]).toBe('Launch point'); expectVelocityArrows(draw, draw.selected);
  509 |   await selectedSnapshot(page, 'horizontal-release-unresolved.png');
  510 |   expect(await evidence(page)).toEqual(before);
  511 |   await page.locator('[data-physics-step]').click(); await readDraw(page);
  512 |   await page.locator('[data-physics-inspect]').click(); await page.locator('[data-physics-sample-jump="highest"]').click();
  513 |   draw = await readDraw(page); before = await evidence(page);
  514 |   expect(draw.selected).toMatchObject({ index: 0, t: 0, vy: 0, apex: true, impact: false });
  515 |   expectReadable(draw, 'canonical horizontal release');
  516 |   expect(selectedCardText(draw)).toEqual(['Highest point at release', 'y = 10.00 m · t = 0.000 s']);
  517 |   expectVelocityArrows(draw, draw.selected); await selectedSnapshot(page, 'horizontal-release-canonical-apex.png');
  518 |   expect(await evidence(page)).toEqual(before);
  519 | });
  520 | 
  521 | test('the highest recorded sample in unfinished ascent remains Rising with its original height and time', async ({ page }) => {
  522 |   await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  523 |   await setState(page, { angle: 45, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
  524 |     simSpeed: 1, showVectors: true, showEnergy: true, showGraphs: true, showFlightData: true });
  525 |   await page.locator('[data-physics-launch]').click();
  526 |   await page.evaluate(() => { for (let index = 0; index < 10; index++) (window as any).__tickVelocity(); });
  527 |   await setState(page, { simSpeed: 0 }); await page.locator('[data-physics-inspect]').click();
  528 |   await expect(page.locator('[data-physics-sample-jump="highest"]')).toContainText('Highest recorded point');
  529 |   await page.locator('[data-physics-sample-jump="highest"]').click();
  530 |   const before = await evidence(page), draw = await readDraw(page), csv = await copyCsv(page);
  531 |   const points = before.trails[0].points;
  532 |   const highest = points.reduce((best: number, point: any, index: number) => point.mY > points[best].mY ? index : best, 0);
  533 |   expect(draw.launched).toBe(true); expect(draw.selectedOriginal.apex).toBeNull();
  534 |   expect(draw.selected).toMatchObject({ index: highest, apex: false, impact: false, phase: 'rising' });
  535 |   expect(draw.selected.index).toBeGreaterThan(0); expect(draw.selected.vy).toBeGreaterThan(0);
  536 |   expectReadable(draw, 'unfinished highest recorded sample'); expectVelocityArrows(draw, draw.selected);
  537 |   expect(selectedCardText(draw)[0]).toBe('Rising');
  538 |   expect(draw.layout.labels.some((label: any) => label.id === 'apex' || label.id === 'landing')).toBe(false);
  539 |   await selectedSnapshot(page, 'unfinished-highest-rising.png');
  540 |   expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
  541 | });
  542 | 
  543 | test('velocity symbols and actual speed remain readable at 1100, 375, and 320 pixels in every theme', async ({ page }) => {
  544 |   test.setTimeout(300_000);
  545 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  546 |   mkdirSync(reports, { recursive: true });
  547 |   const sourcePath = path.resolve('stem_lab/stem_tool_physics.js');
  548 |   const mirrorPath = path.resolve('desktop/web-app/public/stem_lab/stem_tool_physics.js');
  549 |   const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  550 |   const sourceBefore = sha(sourcePath), mirrorBefore = sha(mirrorPath);
  551 |   let sourceAfter = '', mirrorAfter = '';
  552 |   const configurations: Array<Record<string, unknown>> = [];
  553 |   expect(mirrorBefore).toBe(sourceBefore);
  554 |   await mount(page); await launch(page, { velocity: 50, gravity: 25, launchHeight: 50, mass: 9 });
  555 |   await page.locator('[data-physics-sample-jump="highest"]').click();
  556 |   for (let index = 0; index < 12; index++) await page.locator('[data-physics-sample-next]').click();
  557 |   const selected = (await readDraw(page)).selected, before = await evidence(page);
  558 |   try {
  559 |     for (const width of [1100, 375, 320]) {
  560 |       await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(60);
```