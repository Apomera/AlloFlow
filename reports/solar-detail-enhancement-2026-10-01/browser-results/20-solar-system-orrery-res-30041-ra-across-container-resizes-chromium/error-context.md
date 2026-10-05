# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 20-solar-system-orrery-responsive.spec.ts >> remeasures the Orrery canvas and preserves its normalized camera across container resizes
- Location: tests\e2e\20-solar-system-orrery-responsive.spec.ts:447:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 7
Received: 8
```

# Test source

```ts
  433 |   await compactKey.press('ArrowRight');
  434 |   await expect.poll(async () => compactKey.evaluate((key) => key.scrollLeft)).toBeGreaterThan(0);
  435 | 
  436 |   const touchHitDiameter = await page.locator('canvas[role="application"]').evaluate((canvas) => {
  437 |     const rect = canvas.getBoundingClientRect();
  438 |     const init = { bubbles: true, pointerType: 'touch', pointerId: 91, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  439 |     canvas.dispatchEvent(new PointerEvent('pointerdown', init));
  440 |     window.dispatchEvent(new PointerEvent('pointerup', init));
  441 |     return (canvas as any).__canvasPanelState.canvasHitRadius * 2;
  442 |   });
  443 |   expect(touchHitDiameter).toBeGreaterThanOrEqual(44);
  444 | 
  445 |   await harness.destroy(page);
  446 | });
  447 | test('remeasures the Orrery canvas and preserves its normalized camera across container resizes', async ({ page }) => {
  448 |   await page.setViewportSize({ width: 1024, height: 1600 });
  449 |   await harness.mount(page, {
  450 |     solarSystem: {
  451 |       tutorialDismissed: true,
  452 |       orreryMode: true,
  453 |       orr_tab: 0,
  454 |       orr_zoom: 'full',
  455 |       orr_sel: 'earth',
  456 |       orr_compare: 'mars',
  457 |       orr_paused: true,
  458 |     },
  459 |   }, undefined, { expectCanvas: false });
  460 | 
  461 |   const wrap = page.locator('#wrap');
  462 |   const canvas = page.locator('canvas[role="application"]').first();
  463 |   await wrap.evaluate((element) => { (element as HTMLElement).style.width = '1024px'; });
  464 |   await canvas.scrollIntoViewIfNeeded();
  465 |   const readLabelAudit = () => canvas.evaluate((element) => {
  466 |     const state = (element as any).__canvasPanelState;
  467 |     const layout = (element as any)._orreryLabelLayout;
  468 |     if (!state || !layout) return null;
  469 |     const rendered = layout.rendered || [];
  470 |     let maxOverlapArea = 0;
  471 |     let maxReservedOverlapArea = 0;
  472 |     for (let first = 0; first < rendered.length; first += 1) {
  473 |       for (let second = first + 1; second < rendered.length; second += 1) {
  474 |         const a = rendered[first];
  475 |         const b = rendered[second];
  476 |         const overlapWidth = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  477 |         const overlapHeight = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  478 |         if (overlapWidth > 0 && overlapHeight > 0) maxOverlapArea = Math.max(maxOverlapArea, overlapWidth * overlapHeight);
  479 |       }
  480 |       for (const reserved of layout.reserved || []) {
  481 |         const a = rendered[first];
  482 |         const overlapWidth = Math.min(a.x + a.w, reserved.x + reserved.w) - Math.max(a.x, reserved.x);
  483 |         const overlapHeight = Math.min(a.y + a.h, reserved.y + reserved.h) - Math.max(a.y, reserved.y);
  484 |         if (overlapWidth > 0 && overlapHeight > 0) maxReservedOverlapArea = Math.max(maxReservedOverlapArea, overlapWidth * overlapHeight);
  485 |       }
  486 |     }
  487 |     return {
  488 |       selectedRendered: rendered.some((item: any) => item.id === 'earth' && item.selected),
  489 |       comparedRendered: rendered.some((item: any) => item.id === 'mars' && item.compared),
  490 |       reservedIds: (layout.reserved || []).map((item: any) => item.id),
  491 |       renderedCount: rendered.length,
  492 |       suppressedCount: (layout.suppressed || []).length,
  493 |       contained: rendered.every((item: any) => item.x >= 3 && item.y >= 3 && item.x + item.w <= state.viewportWidth - 3 && item.y + item.h <= state.viewportHeight - 3),
  494 |       maxOverlapArea,
  495 |       maxReservedOverlapArea,
  496 |     };
  497 |   });
  498 |   const readResponsiveCamera = () => canvas.evaluate((element) => {
  499 |     const state = (element as any).__canvasPanelState;
  500 |     if (!state || !state.viewportWidth || !state.viewportHeight || !state.canvasFit) return null;
  501 |     const rect = element.getBoundingClientRect();
  502 |     return {
  503 |       viewportWidth: state.viewportWidth,
  504 |       viewportHeight: state.viewportHeight,
  505 |       fit: state.canvasFit,
  506 |       normalizedOffsetX: (state.cx - state.viewportWidth / 2) / state.canvasFit,
  507 |       normalizedOffsetY: (state.cy - state.viewportHeight / 2) / state.canvasFit,
  508 |       normalizedScale: state.scale / state.canvasFit,
  509 |       rectWidth: rect.width,
  510 |       rectHeight: rect.height,
  511 |       backingWidth: (element as HTMLCanvasElement).width,
  512 |       backingHeight: (element as HTMLCanvasElement).height,
  513 |       dpr: (element as any)._dpr,
  514 |     };
  515 |   });
  516 | 
  517 |   await expect.poll(async () => (await readResponsiveCamera())?.viewportWidth || 0).toBeGreaterThan(1000);
  518 |   const wideKeyLayout = await page.locator('#orrery-stage-key').evaluate((key) => {
  519 |     const cue = key.parentElement?.querySelector('#orrery-stage-key-scroll-hint') as HTMLElement | null;
  520 |     const rowCounts = new Map<number, number>();
  521 |     key.querySelectorAll('.orr-stage-key-item').forEach((item) => {
  522 |       const top = Math.round(item.getBoundingClientRect().top);
  523 |       rowCounts.set(top, (rowCounts.get(top) || 0) + 1);
  524 |     });
  525 |     return {
  526 |       display: getComputedStyle(key).display,
  527 |       itemCount: Number(key.getAttribute('data-key-items')),
  528 |       cueDisplay: cue ? getComputedStyle(cue).display : 'missing',
  529 |       rows: Array.from(rowCounts.entries()).sort((a, b) => a[0] - b[0]).map((entry) => entry[1]),
  530 |     };
  531 |   });
  532 |   expect(wideKeyLayout.display).toBe('grid');
> 533 |   expect(wideKeyLayout.itemCount).toBe(7);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  534 |   expect(wideKeyLayout.cueDisplay).toBe('none');
  535 |   expect(wideKeyLayout.rows).toEqual([4, 3]);
  536 |   await expect.poll(async () => (await readLabelAudit())?.selectedRendered || false).toBe(true);
  537 |   await expect.poll(async () => (await readLabelAudit())?.comparedRendered || false).toBe(true);
  538 |   const wideLabelAudit = await readLabelAudit();
  539 |   if (!wideLabelAudit) throw new Error('Wide Orrery label diagnostics were unavailable');
  540 |   expect(wideLabelAudit.contained).toBe(true);
  541 |   expect(wideLabelAudit.maxOverlapArea).toBeLessThanOrEqual(1);
  542 |   expect(wideLabelAudit.maxReservedOverlapArea).toBeLessThanOrEqual(1);
  543 |   expect(wideLabelAudit.reservedIds).toEqual(expect.arrayContaining(['sun-core', 'scale-ruler', 'inner-system-inset']));
  544 |   await canvas.focus();
  545 |   await canvas.press('ArrowRight');
  546 |   await canvas.press('ArrowDown');
  547 |   const before = await readResponsiveCamera();
  548 |   if (!before) throw new Error('Wide responsive camera state was not available');
  549 | 
  550 |   await wrap.evaluate((element) => { (element as HTMLElement).style.width = '360px'; });
  551 |   await canvas.scrollIntoViewIfNeeded();
  552 |   await expect.poll(async () => (await readResponsiveCamera())?.viewportWidth || 999).toBeLessThan(360);
  553 |   const after = await readResponsiveCamera();
  554 |   if (!after) throw new Error('Compact responsive camera state was not available');
  555 | 
  556 |   expect(after.viewportHeight).toBeGreaterThanOrEqual(339);
  557 |   expect(Math.abs(after.viewportWidth - after.rectWidth)).toBeLessThanOrEqual(2);
  558 |   expect(Math.abs(after.viewportHeight - after.rectHeight)).toBeLessThanOrEqual(2);
  559 |   expect(after.normalizedOffsetX).toBeCloseTo(before.normalizedOffsetX, 1);
  560 |   expect(after.normalizedOffsetY).toBeCloseTo(before.normalizedOffsetY, 1);
  561 |   expect(after.normalizedScale).toBeCloseTo(before.normalizedScale, 1);
  562 |   expect(after.backingWidth / after.viewportWidth).toBeCloseTo(after.dpr, 1);
  563 |   expect(after.backingHeight / after.viewportHeight).toBeCloseTo(after.dpr, 1);
  564 |   expect(after.dpr).toBeLessThanOrEqual(2);
  565 |   await expect.poll(async () => (await readLabelAudit())?.selectedRendered || false).toBe(true);
  566 |   await expect.poll(async () => (await readLabelAudit())?.comparedRendered || false).toBe(true);
  567 |   const compactLabelAudit = await readLabelAudit();
  568 |   if (!compactLabelAudit) throw new Error('Compact Orrery label diagnostics were unavailable');
  569 |   expect(compactLabelAudit.contained).toBe(true);
  570 |   expect(compactLabelAudit.maxOverlapArea).toBeLessThanOrEqual(1);
  571 |   expect(compactLabelAudit.maxReservedOverlapArea).toBeLessThanOrEqual(1);
  572 |   expect(compactLabelAudit.reservedIds).toEqual(expect.arrayContaining(['sun-core', 'scale-ruler']));
  573 |   expect(compactLabelAudit.renderedCount).toBeLessThanOrEqual(wideLabelAudit.renderedCount);
  574 | 
  575 |   await canvas.press('Home');
  576 |   await expect.poll(async () => canvas.evaluate((element) => {
  577 |     const state = (element as any).__canvasPanelState;
  578 |     if (!state) return false;
  579 |     return Math.abs(state.cx - state.viewportWidth / 2) <= 0.5 &&
  580 |       Math.abs(state.cy - state.viewportHeight / 2) <= 0.5 &&
  581 |       Math.abs(state.scale - 10 * state.canvasFit) <= 0.01;
  582 |   })).toBe(true);
  583 |   const resetState = await canvas.evaluate((element) => (element as any).__canvasPanelState);
  584 |   expect(Math.round(resetState.cy)).toBe(Math.round(resetState.viewportHeight / 2));
  585 |   expect(resetState.scale).toBeCloseTo(10 * resetState.canvasFit, 2);
  586 | 
  587 |   await harness.destroy(page);
  588 | });
  589 | test('caps HiDPI rendering and preserves 44px touch interaction in the responsive Orrery', async ({ browser }) => {
  590 |   const context = await browser.newContext({
  591 |     viewport: { width: 360, height: 1600 },
  592 |     deviceScaleFactor: 3,
  593 |     hasTouch: true,
  594 |     isMobile: true,
  595 |   });
  596 |   const touchPage = await context.newPage();
  597 |   let mounted = false;
  598 |   try {
  599 |     await touchPage.emulateMedia({ reducedMotion: 'reduce' });
  600 |     await harness.mount(touchPage, {
  601 |       solarSystem: {
  602 |         tutorialDismissed: true,
  603 |         orreryMode: true,
  604 |         orr_tab: 0,
  605 |         orr_zoom: 'inner',
  606 |         orr_showComets: false,
  607 |         orr_showDwarfs: false,
  608 |         orr_paused: true,
  609 |       },
  610 |     }, undefined, { expectCanvas: false });
  611 |     mounted = true;
  612 |     await touchPage.locator('#wrap').evaluate((element) => { (element as HTMLElement).style.width = '360px'; });
  613 |     const canvas = touchPage.locator('canvas[role="application"]').first();
  614 |     await canvas.scrollIntoViewIfNeeded();
  615 |     await expect(canvas).toHaveAttribute('data-canvas-dpr', '2');
  616 |     await expect(canvas).toHaveAttribute('data-canvas-layout', 'compact');
  617 | 
  618 |     const raster = await canvas.evaluate((element) => {
  619 |       const canvas = element as HTMLCanvasElement;
  620 |       const rect = canvas.getBoundingClientRect();
  621 |       const state = (canvas as any).__canvasPanelState;
  622 |       const sample = canvas.getContext('2d')?.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
  623 |       return {
  624 |         rectWidth: rect.width,
  625 |         rectHeight: rect.height,
  626 |         logicalWidth: state.viewportWidth,
  627 |         logicalHeight: state.viewportHeight,
  628 |         backingWidth: canvas.width,
  629 |         backingHeight: canvas.height,
  630 |         dpr: (canvas as any)._dpr,
  631 |         hitDiameter: state.canvasHitRadius * 2,
  632 |         centerAlpha: sample ? sample[3] : 0,
  633 |       };
```