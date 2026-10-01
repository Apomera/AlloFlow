# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 20-solar-system-orrery-responsive.spec.ts >> keeps mobile stage guidance readable instead of squeezing it into a corner
- Location: tests\e2e\20-solar-system-orrery-responsive.spec.ts:265:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 230
Received:   287.8125
```

# Test source

```ts
  300 |     const stage = tip.closest('.orr-orbit-stage');
  301 |     const hud = stage?.querySelector('.orr-stage-hud');
  302 |     if (!stage || !hud) throw new Error('Orrery stage layout did not mount');
  303 |     const tipRect = tip.getBoundingClientRect();
  304 |     const stageRect = stage.getBoundingClientRect();
  305 |     return {
  306 |       tipWidth: Math.round(tipRect.width),
  307 |       tipLeft: Math.round(tipRect.left),
  308 |       tipRight: Math.round(tipRect.right),
  309 |       stageLeft: Math.round(stageRect.left),
  310 |       stageRight: Math.round(stageRect.right),
  311 |       textAlign: getComputedStyle(tip).textAlign,
  312 |       hudDirection: getComputedStyle(hud).flexDirection,
  313 |     };
  314 |   });
  315 | 
  316 |   expect(layout.tipWidth).toBeGreaterThanOrEqual(240);
  317 |   expect(layout.tipLeft).toBeGreaterThanOrEqual(layout.stageLeft + 8);
  318 |   expect(layout.tipRight).toBeLessThanOrEqual(layout.stageRight - 8);
  319 |   expect(layout.textAlign).toBe('left');
  320 |   expect(layout.hudDirection).toBe('column');
  321 | 
  322 |   const readoutLayout = await page.locator('#orrery-stage-readout').evaluate((readout) => {
  323 |     const stage = readout.closest('.orr-orbit-stage');
  324 |     if (!stage) throw new Error('Orrery stage readout did not mount inside the stage');
  325 |     const readoutRect = readout.getBoundingClientRect();
  326 |     const stageRect = stage.getBoundingClientRect();
  327 |     return {
  328 |       left: Math.round(readoutRect.left),
  329 |       right: Math.round(readoutRect.right),
  330 |       top: Math.round(readoutRect.top),
  331 |       stageLeft: Math.round(stageRect.left),
  332 |       stageRight: Math.round(stageRect.right),
  333 |     };
  334 |   });
  335 | 
  336 |   expect(readoutLayout.left).toBeGreaterThanOrEqual(readoutLayout.stageLeft + 8);
  337 |   expect(readoutLayout.right).toBeLessThanOrEqual(readoutLayout.stageRight - 8);
  338 | 
  339 |   const stageFlow = await page.locator('.orr-orbit-stage').evaluate((stage) => {
  340 |     const viewport = stage.querySelector('[data-orrery-viewport]') as HTMLElement | null;
  341 |     const rail = stage.querySelector('[data-orrery-instrument-rail]') as HTMLElement | null;
  342 |     const hud = stage.querySelector('.orr-stage-hud') as HTMLElement | null;
  343 |     const canvas = stage.querySelector('canvas[role="application"]') as HTMLCanvasElement | null;
  344 |     const readout = stage.querySelector('#orrery-stage-readout') as HTMLElement | null;
  345 |     const key = stage.querySelector('#orrery-stage-key') as HTMLElement | null;
  346 |     const tip = stage.querySelector('#orrery-stage-tip') as HTMLElement | null;
  347 |     if (!viewport || !rail || !hud || !canvas || !readout || !key || !tip) {
  348 |       throw new Error('Responsive Orrery stage structure did not mount');
  349 |     }
  350 |     const rectOf = (element: Element) => {
  351 |       const rect = element.getBoundingClientRect();
  352 |       return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  353 |     };
  354 |     const state = (canvas as any).__canvasPanelState;
  355 |     if (!state) throw new Error('Responsive Orrery canvas state was not available');
  356 |     return {
  357 |       stage: rectOf(stage),
  358 |       viewport: rectOf(viewport),
  359 |       rail: rectOf(rail),
  360 |       hud: rectOf(hud),
  361 |       canvas: rectOf(canvas),
  362 |       readout: rectOf(readout),
  363 |       key: rectOf(key),
  364 |       tip: rectOf(tip),
  365 |       railPosition: getComputedStyle(rail).position,
  366 |       readoutPosition: getComputedStyle(readout).position,
  367 |       keyPosition: getComputedStyle(key).position,
  368 |       tipPosition: getComputedStyle(tip).position,
  369 |       canvasLayout: canvas.getAttribute('data-canvas-layout'),
  370 |       logicalWidth: state.viewportWidth,
  371 |       logicalHeight: state.viewportHeight,
  372 |       hitDiameter: state.canvasHitRadius * 2,
  373 |       backingWidth: canvas.width,
  374 |       backingHeight: canvas.height,
  375 |       dpr: (canvas as any)._dpr,
  376 |       stageClientWidth: (stage as HTMLElement).clientWidth,
  377 |       stageScrollWidth: (stage as HTMLElement).scrollWidth,
  378 |     };
  379 |   });
  380 | 
  381 |   const containsRect = (outer: typeof stageFlow.stage, inner: typeof stageFlow.stage) =>
  382 |     inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
  383 |   const disjointRects = (first: typeof stageFlow.stage, second: typeof stageFlow.stage) =>
  384 |     first.right <= second.left + 1 || second.right <= first.left + 1 || first.bottom <= second.top + 1 || second.bottom <= first.top + 1;
  385 | 
  386 |   expect(containsRect(stageFlow.stage, stageFlow.viewport)).toBe(true);
  387 |   expect(containsRect(stageFlow.stage, stageFlow.rail)).toBe(true);
  388 |   expect(containsRect(stageFlow.viewport, stageFlow.hud)).toBe(true);
  389 |   expect(containsRect(stageFlow.rail, stageFlow.readout)).toBe(true);
  390 |   expect(containsRect(stageFlow.rail, stageFlow.key)).toBe(true);
  391 |   expect(containsRect(stageFlow.rail, stageFlow.tip)).toBe(true);
  392 |   expect(stageFlow.rail.top).toBeGreaterThanOrEqual(stageFlow.viewport.bottom - 1);
  393 |   expect(disjointRects(stageFlow.readout, stageFlow.key)).toBe(true);
  394 |   expect(disjointRects(stageFlow.readout, stageFlow.tip)).toBe(true);
  395 |   expect(disjointRects(stageFlow.key, stageFlow.tip)).toBe(true);
  396 |   expect(stageFlow.railPosition).toBe('relative');
  397 |   expect([stageFlow.readoutPosition, stageFlow.keyPosition, stageFlow.tipPosition]).toEqual(['static', 'static', 'static']);
  398 |   expect(stageFlow.canvasLayout).toBe('compact');
  399 |   expect(stageFlow.canvas.height).toBeGreaterThanOrEqual(339);
> 400 |   expect(stageFlow.rail.height).toBeLessThan(230);
      |                                 ^ Error: expect(received).toBeLessThan(expected)
  401 |   expect(Math.abs(stageFlow.logicalWidth - stageFlow.canvas.width)).toBeLessThanOrEqual(2);
  402 |   expect(Math.abs(stageFlow.logicalHeight - stageFlow.canvas.height)).toBeLessThanOrEqual(2);
  403 |   expect(stageFlow.backingWidth / stageFlow.logicalWidth).toBeCloseTo(stageFlow.dpr, 1);
  404 |   expect(stageFlow.backingHeight / stageFlow.logicalHeight).toBeCloseTo(stageFlow.dpr, 1);
  405 |   expect(stageFlow.dpr).toBeLessThanOrEqual(2);
  406 |   expect(11 * stageFlow.canvas.width / stageFlow.logicalWidth).toBeGreaterThanOrEqual(10.5);
  407 |   expect(stageFlow.hitDiameter).toBeGreaterThanOrEqual(28);
  408 |   expect(stageFlow.stageScrollWidth).toBeLessThanOrEqual(stageFlow.stageClientWidth + 1);
  409 | 
  410 |   const compactKey = page.locator('#orrery-stage-key');
  411 |   const compactKeyAffordance = await page.locator('.orr-stage-key-shell').evaluate((shell) => {
  412 |     const key = shell.querySelector('#orrery-stage-key') as HTMLElement | null;
  413 |     const cue = shell.querySelector('#orrery-stage-key-scroll-hint') as HTMLElement | null;
  414 |     if (!key || !cue) throw new Error('Compact Orrery key affordance did not mount');
  415 |     return {
  416 |       clientWidth: key.clientWidth,
  417 |       scrollWidth: key.scrollWidth,
  418 |       cueDisplay: getComputedStyle(cue).display,
  419 |       cueText: cue.textContent || '',
  420 |       role: key.getAttribute('role'),
  421 |       tabIndex: key.tabIndex,
  422 |     };
  423 |   });
  424 |   expect(compactKeyAffordance.scrollWidth).toBeGreaterThan(compactKeyAffordance.clientWidth + 40);
  425 |   expect(compactKeyAffordance.cueDisplay).toBe('flex');
  426 |   expect(compactKeyAffordance.cueText).toContain('More key items');
  427 |   expect(compactKeyAffordance.role).toBe('region');
  428 |   expect(compactKeyAffordance.tabIndex).toBe(0);
  429 |   await compactKey.focus();
  430 |   await compactKey.press('ArrowRight');
  431 |   await expect.poll(async () => compactKey.evaluate((key) => key.scrollLeft)).toBeGreaterThan(0);
  432 | 
  433 |   const touchHitDiameter = await page.locator('canvas[role="application"]').evaluate((canvas) => {
  434 |     const rect = canvas.getBoundingClientRect();
  435 |     const init = { bubbles: true, pointerType: 'touch', pointerId: 91, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  436 |     canvas.dispatchEvent(new PointerEvent('pointerdown', init));
  437 |     window.dispatchEvent(new PointerEvent('pointerup', init));
  438 |     return (canvas as any).__canvasPanelState.canvasHitRadius * 2;
  439 |   });
  440 |   expect(touchHitDiameter).toBeGreaterThanOrEqual(44);
  441 | 
  442 |   await harness.destroy(page);
  443 | });
  444 | test('remeasures the Orrery canvas and preserves its normalized camera across container resizes', async ({ page }) => {
  445 |   await page.setViewportSize({ width: 1024, height: 1600 });
  446 |   await harness.mount(page, {
  447 |     solarSystem: {
  448 |       tutorialDismissed: true,
  449 |       orreryMode: true,
  450 |       orr_tab: 0,
  451 |       orr_zoom: 'full',
  452 |       orr_sel: 'earth',
  453 |       orr_paused: true,
  454 |     },
  455 |   }, undefined, { expectCanvas: false });
  456 | 
  457 |   const wrap = page.locator('#wrap');
  458 |   const canvas = page.locator('canvas[role="application"]').first();
  459 |   await wrap.evaluate((element) => { (element as HTMLElement).style.width = '1024px'; });
  460 |   await canvas.scrollIntoViewIfNeeded();
  461 |   const readLabelAudit = () => canvas.evaluate((element) => {
  462 |     const state = (element as any).__canvasPanelState;
  463 |     const layout = (element as any)._orreryLabelLayout;
  464 |     if (!state || !layout) return null;
  465 |     const rendered = layout.rendered || [];
  466 |     let maxOverlapArea = 0;
  467 |     for (let first = 0; first < rendered.length; first += 1) {
  468 |       for (let second = first + 1; second < rendered.length; second += 1) {
  469 |         const a = rendered[first];
  470 |         const b = rendered[second];
  471 |         const overlapWidth = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  472 |         const overlapHeight = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  473 |         if (overlapWidth > 0 && overlapHeight > 0) maxOverlapArea = Math.max(maxOverlapArea, overlapWidth * overlapHeight);
  474 |       }
  475 |     }
  476 |     return {
  477 |       selectedRendered: rendered.some((item: any) => item.id === 'earth' && item.selected),
  478 |       renderedCount: rendered.length,
  479 |       suppressedCount: (layout.suppressed || []).length,
  480 |       contained: rendered.every((item: any) => item.x >= 3 && item.y >= 3 && item.x + item.w <= state.viewportWidth - 3 && item.y + item.h <= state.viewportHeight - 3),
  481 |       maxOverlapArea,
  482 |     };
  483 |   });
  484 |   const readResponsiveCamera = () => canvas.evaluate((element) => {
  485 |     const state = (element as any).__canvasPanelState;
  486 |     if (!state || !state.viewportWidth || !state.viewportHeight || !state.canvasFit) return null;
  487 |     const rect = element.getBoundingClientRect();
  488 |     return {
  489 |       viewportWidth: state.viewportWidth,
  490 |       viewportHeight: state.viewportHeight,
  491 |       fit: state.canvasFit,
  492 |       normalizedOffsetX: (state.cx - state.viewportWidth / 2) / state.canvasFit,
  493 |       normalizedOffsetY: (state.cy - state.viewportHeight / 2) / state.canvasFit,
  494 |       normalizedScale: state.scale / state.canvasFit,
  495 |       rectWidth: rect.width,
  496 |       rectHeight: rect.height,
  497 |       backingWidth: (element as HTMLCanvasElement).width,
  498 |       backingHeight: (element as HTMLCanvasElement).height,
  499 |       dpr: (element as any)._dpr,
  500 |     };
```