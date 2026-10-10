# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: baseline-callouts.spec.ts >> original launch, apex and impact callouts retain painted text and clearance in nine layouts
- Location: reports\physics-hud-layout-2026-10-09\baseline-callouts.spec.ts:624:5

# Error details

```
Test timeout of 300000ms exceeded.
```

```
Error: locator.screenshot: Test timeout of 300000ms exceeded.
Call log:
  - waiting for locator('#physicsCanvas')

```

# Test source

```ts
  399 |     for (const axis of axisBoxes) { expect(overlaps(card, axis, 2), label.id + ' covers actual axis glyphs: ' + axis.text).toBe(false); for (const segment of outline?.segments || []) expect(segmentTouchesBox(segment.from, segment.to, axis, outline!.width / 2), label.id + ' connector outline crosses actual axis glyphs').toBe(false); }
  400 |     for (const point of points) { expect(overlaps(card, point), label.id + ' covers an original point ring').toBe(false); if (Math.hypot(point.center.x - label.anchor.x * scaleX, point.center.y - label.anchor.y * scaleY) > point.radius + 4) for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, point), label.id + ' leader crosses another point').toBe(false); }
  401 |     for (const arrow of arrows) for (const segment of arrow.segments) expect(segmentTouchesBox(segment.from, segment.to, card, arrow.width / 2), label.id + ' covers an actual velocity/gravity shaft or arrowhead').toBe(false);
  402 |     const segment = leader.segments[0], anchor = { x: label.anchor.x * scaleX, y: label.anchor.y * scaleY };
  403 |     const cross = (segment.to.x - anchor.x) * (segment.from.y - anchor.y) - (segment.to.y - anchor.y) * (segment.from.x - anchor.x);
  404 |     expect(Math.abs(cross), label.id + ' leader points to its actual original anchor').toBeLessThan(1e-5);
  405 |     expect(Math.hypot(segment.from.x - anchor.x, segment.from.y - anchor.y)).toBeCloseTo((label.anchor.radius + 2) * scaleX, 7);
  406 |     expect(contains(card, segment.to, .01)).toBe(true); expect(Math.min(Math.abs(segment.to.x - card.x), Math.abs(segment.to.x - card.x - card.width), Math.abs(segment.to.y - card.y), Math.abs(segment.to.y - card.y - card.height))).toBeLessThan(.01);
  407 |     return { id: label.id, card, text, leader, outline, anchor, radius: label.anchor.radius };
  408 |   });
  409 |   const cssPoint = (point: Point) => ({ x: point.x / scaleX, y: point.y / scaleY });
  410 |   const lowerForegroundCrosshairPairs = annotated.filter(label => label.id !== 'inspection').flatMap(label => crosshair.segments.map((observedArm, armIndex) => {
  411 |     const segment = { from: cssPoint(label.leader.segments[0].from), to: cssPoint(label.leader.segments[0].to) }, arm = { from: cssPoint(observedArm.from), to: cssPoint(observedArm.to) };
  412 |     const distance = finiteSegmentDistance(segment.from, segment.to, arm.from, arm.to), pair = { id: label.id, armIndex, segment, arm, distance, requiredDistance: 2 };
  413 |     expect(distance, 'lower-priority foreground clears the actual selected crosshair: ' + JSON.stringify(pair)).toBeGreaterThanOrEqual(2 - 1e-7);
  414 |     return pair;
  415 |   }));
  416 |   const markerBoxes = [...points.map(point => ({ x: point.x / scaleX, y: point.y / scaleY, width: point.width / scaleX, height: point.height / scaleY })),
  417 |     ...annotated.map(label => ({ x: label.anchor.x / scaleX - label.radius - 4, y: label.anchor.y / scaleY - label.radius - 4, width: (label.radius + 4) * 2, height: (label.radius + 4) * 2 }))];
  418 |   const vectorBoxes = arrows.filter(stroke => stroke.color.toLowerCase() === '#93c5fd').map(resultant => {
  419 |     const origin = resultant.segments[0].from;
  420 |     const shafts = arrows.flatMap(stroke => stroke.segments.filter(segment => Math.hypot(segment.from.x - origin.x, segment.from.y - origin.y) < 1e-7).map(segment => ({ from: cssPoint(segment.from), to: cssPoint(segment.to) })));
  421 |     const left = Math.min(...shafts.flatMap(segment => [segment.from.x, segment.to.x])) - 6, top = Math.min(...shafts.flatMap(segment => [segment.from.y, segment.to.y])) - 6;
  422 |     const right = Math.max(...shafts.flatMap(segment => [segment.from.x, segment.to.x])) + 6, bottom = Math.max(...shafts.flatMap(segment => [segment.from.y, segment.to.y])) + 6;
  423 |     return { x: left, y: top, width: right - left, height: bottom - top, shafts };
  424 |   });
  425 |   const connectorPairs = [];
  426 |   for (let i = 0; i < annotated.length; i++) for (let j = i + 1; j < annotated.length; j++) {
  427 |     const a = annotated[i], b = annotated[j]; expect(overlaps(a.card, b.card, 5.99 * scaleX), a.id + ' overlaps ' + b.id).toBe(false);
  428 |     for (const segment of a.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, b.card, 1.99 * scaleX), a.id + ' leader crosses ' + b.id).toBe(false);
  429 |     for (const segment of b.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, a.card, 1.99 * scaleX), b.id + ' leader crosses ' + a.id).toBe(false);
  430 |     const anchorA = cssPoint(a.anchor), anchorB = cssPoint(b.anchor), sharedAnchor = Math.abs(anchorA.x - anchorB.x) < 1e-7 && Math.abs(anchorA.y - anchorB.y) < 1e-7;
  431 |     const actualA = { from: cssPoint(a.leader.segments[0].from), to: cssPoint(a.leader.segments[0].to) }, actualB = { from: cssPoint(b.leader.segments[0].from), to: cssPoint(b.leader.segments[0].to) };
  432 |     let comparedA: { from: Point; to: Point } | null = actualA, comparedB: { from: Point; to: Point } | null = actualB, bundle: Box | null = null;
  433 |     if (sharedAnchor) {
  434 |       const own = [...markerBoxes, ...vectorBoxes].filter(box => contains(box, anchorA));
  435 |       const left = Math.min(...own.map(box => box.x)) - 3, top = Math.min(...own.map(box => box.y)) - 3;
  436 |       const right = Math.max(...own.map(box => box.x + box.width)) + 3, bottom = Math.max(...own.map(box => box.y + box.height)) + 3;
  437 |       bundle = { x: left, y: top, width: right - left, height: bottom - top };
  438 |       comparedA = segmentBeyondBundle(actualA, bundle); comparedB = segmentBeyondBundle(actualB, bundle);
  439 |     }
  440 |     const distance = comparedA && comparedB ? finiteSegmentDistance(comparedA.from, comparedA.to, comparedB.from, comparedB.to) : null;
  441 |     const pair = { idA: a.id, idB: b.id, sharedAnchor, bundle, actualA, actualB, comparedA, comparedB, distance, requiredDistance: 4 };
  442 |     if (distance !== null) expect(distance, 'actual connector pair retains four CSS pixels: ' + JSON.stringify(pair)).toBeGreaterThanOrEqual(4 - 1e-7);
  443 |     connectorPairs.push(pair);
  444 |   }
  445 |   return { selectedText: selectedText.map(t => t.text), expectedText, projected, annotated, axes, axisBoxes, points, arrows, crosshair, connectorClearance: { requiredDistance: 4, markerBoxes, vectorBoxes, pairs: connectorPairs }, lowerForegroundCrosshairClearance: { requiredDistance: 2, pairs: lowerForegroundCrosshairPairs }, geometryVerified: true, selectedCardVisible: true, selectedTextComplete: true, axisGlyphClearance: true, originalPointClearance: true, vectorClearance: true, otherLabelClearance: true };
  446 | }
  447 | async function capture(page: Page, trail: Trail, index: number, theme: string, filename: string) {
  448 |   mkdirSync(reports, { recursive: true }); const before = await evidence(page);
  449 |   await page.locator('#physicsCanvas').scrollIntoViewIfNeeded();
  450 |   await page.locator('#physicsCanvas').evaluate(el => {
  451 |     const b = el.getBoundingClientRect();
  452 |     if (b.height + 4 > window.innerHeight) throw Error('Canvas fixture cannot fit in the capture viewport');
  453 |     // Native element scrolling can leave its fractional top just above the viewport edge.
  454 |     window.scrollBy(0, Math.floor(b.top) - 2);
  455 |   });
  456 |   await page.evaluate(async () => { const w = window as any; w.__calloutNative(); await w.__calloutSettle(); });
  457 |   const draw = await redraw(page);
  458 |   let layoutProof: ReturnType<typeof geometry>;
  459 |   try { layoutProof = geometry(draw, trail, index); }
  460 |   catch (error) {
  461 |     writeFileSync(path.join(reports, filename.replace(/\.png$/, '-geometry-failure.json')), JSON.stringify({ filename, theme, index, sourceSha256: initialHashes[0], specSha256: initialHashes[2], trail, draw }, null, 2));
  462 |     throw error;
  463 |   }
  464 |   const screenshotGeometry = await page.locator('#physicsCanvas').evaluate(el => {
  465 |     const b = el.getBoundingClientRect(), cv = el as HTMLCanvasElement;
  466 |     const canvasDocumentRect = { left: b.left + window.scrollX, top: b.top + window.scrollY, right: b.right + window.scrollX, bottom: b.bottom + window.scrollY, width: b.width, height: b.height };
  467 |     const clip = { x: Math.floor(canvasDocumentRect.left + .001), y: Math.floor(canvasDocumentRect.top + .001), width: Math.ceil(canvasDocumentRect.right - .001) - Math.floor(canvasDocumentRect.left + .001), height: Math.ceil(canvasDocumentRect.bottom - .001) - Math.floor(canvasDocumentRect.top + .001) };
  468 |     return { canvasRect: { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }, canvasDocumentRect, clip, coordinateSpace: 'document',
  469 |       dpr: window.devicePixelRatio, backingWidth: cv.width, backingHeight: cv.height, scrollX: window.scrollX, scrollY: window.scrollY, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight };
  470 |   });
  471 |   expect(screenshotGeometry.canvasRect.width).toBe(draw.width); expect(screenshotGeometry.canvasRect.height).toBe(draw.height);
  472 |   expect(screenshotGeometry.backingWidth).toBe(draw.backingWidth); expect(screenshotGeometry.backingHeight).toBe(draw.backingHeight);
  473 |   const { clip, canvasRect, dpr } = screenshotGeometry;
  474 |   const cdp = await page.context().newCDPSession(page);
  475 |   const beforeCaptureMetrics = await cdp.send('Page.getLayoutMetrics');
  476 |   // Element screenshots send an integer document clip directly to Chromium.
  477 |   // Preserve the actual document canvas origin and independent capture metrics.
  478 |   const documentCanvasOrigin = { left: canvasRect.left + screenshotGeometry.scrollX, top: canvasRect.top + screenshotGeometry.scrollY };
  479 |   const screenshotDocumentOrigin = { left: clip.x, top: clip.y };
  480 |   const effectiveCanvasOrigin = documentCanvasOrigin;
  481 |   // Validate one image-wide browser mapping against fixed native axis-pixel constellations.
  482 |   // Small fractional origins may snap; larger origins retain continuous CSS placement.
  483 |   expect(draw.backingWidth).toBe(draw.width * dpr); expect(draw.backingHeight).toBe(draw.height * dpr);
  484 |   const calibrationNative = await page.evaluate(anchors => {
  485 |     const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, ctx = cv.getContext('2d')!;
  486 |     const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  487 |     return anchors.map(anchor => {
  488 |       const neighbors = [];
  489 |       for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
  490 |         const pixelX = anchor.anchorNativePixel.x + dx, pixelY = anchor.anchorNativePixel.y + dy;
  491 |         if (pixelX < 0 || pixelY < 0 || pixelX >= cv.width || pixelY >= cv.height) throw Error('Fixed calibration constellation must remain inside native canvas');
  492 |         neighbors.push({ pixelX, pixelY, rgba: [...data.slice((pixelY * cv.width + pixelX) * 4, (pixelY * cv.width + pixelX) * 4 + 4)] });
  493 |       }
  494 |       return { text: anchor.text, anchorNativePixel: anchor.anchorNativePixel, targets: anchor.neighbors.map(p => ({ pixelX: p.pixelX, pixelY: p.pixelY })), neighbors };
  495 |     });
  496 |   }, layoutProof.axes.flatMap(t => t.witnesses.map(witness => ({ text: t.text, anchorNativePixel: { x: Math.floor(witness.x * draw.backingWidth / draw.width), y: Math.floor(witness.y * draw.backingHeight / draw.height) }, neighbors: witness.paintNeighbors }))));
  497 |   expect(calibrationNative.length, 'independent axis pixel anchors calibrate the one image transform').toBeGreaterThanOrEqual(3);
  498 |   expect(clip.x).toBeGreaterThanOrEqual(0); expect(clip.y).toBeGreaterThanOrEqual(0); expect(clip.x + clip.width).toBeLessThanOrEqual(screenshotGeometry.documentWidth); expect(clip.y + clip.height).toBeLessThanOrEqual(screenshotGeometry.documentHeight);
> 499 |   const screenshot = path.join(reports, filename), buffer = await page.locator('#physicsCanvas').screenshot({ path: screenshot, scale: 'device', animations: 'disabled' }), pixels = readPng(buffer);
      |                                                                                                  ^ Error: locator.screenshot: Test timeout of 300000ms exceeded.
  500 |   const afterCaptureMetrics = await cdp.send('Page.getLayoutMetrics'); await cdp.detach();
  501 |   const afterCanvasDocumentRect = await page.locator('#physicsCanvas').evaluate(el => {
  502 |     const b = el.getBoundingClientRect(); return { left: b.left + window.scrollX, top: b.top + window.scrollY, right: b.right + window.scrollX, bottom: b.bottom + window.scrollY, width: b.width, height: b.height };
  503 |   });
  504 |   expect(afterCanvasDocumentRect, 'the actual element document bounds remain stable through capture').toEqual(screenshotGeometry.canvasDocumentRect);
  505 |   expect(afterCaptureMetrics.visualViewport, 'actual Chromium document capture viewport remains stable').toEqual(beforeCaptureMetrics.visualViewport);
  506 |   const captureMetrics = { beforeCaptureMetrics, afterCaptureMetrics, afterCanvasDocumentRect };
  507 |   expect(pixels.width).toBe(clip.width * dpr); expect(pixels.height).toBe(clip.height * dpr);
  508 |   const projectAtOrigin = (pixelX: number, pixelY: number, neighbors: Witness['paintNeighbors'], origin: { left: number; top: number }) => {
  509 |     const rawX = ((clip.x + (pixelX + .5) / dpr - origin.left) * draw.backingWidth / draw.width) - .5;
  510 |     const rawY = ((clip.y + (pixelY + .5) / dpr - origin.top) * draw.backingHeight / draw.height) - .5;
  511 |     const left = Math.floor(rawX), top = Math.floor(rawY), xWeight = rawX - left, yWeight = rawY - top;
  512 |     const inputs = [[left, top, (1 - xWeight) * (1 - yWeight)], [left + 1, top, xWeight * (1 - yWeight)], [left, top + 1, (1 - xWeight) * yWeight], [left + 1, top + 1, xWeight * yWeight]].map(([x, y, weight]) => {
  513 |       const neighbor = neighbors.find(p => p.pixelX === x && p.pixelY === y); if (!neighbor) throw Error('Independent paint must contain every compositor input: ' + JSON.stringify({ x, y, pixelX, pixelY })); return { ...neighbor, weight };
  514 |     });
  515 |     const rgba = [0, 1, 2, 3].map(channel => Math.round(inputs.reduce((sum, p) => sum + p.rgba[channel] * p.weight, 0)));
  516 |     return { rawX, rawY, xWeight, yWeight, inputs, rgba };
  517 |   };
  518 |   const candidates = [
  519 |     // Blink HTMLCanvasPainter rounds the CSS layout rectangle for a foreign canvas layer.
  520 |     // https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/paint/html_canvas_painter.cc
  521 |     { kind: 'css-origin-rounding', rasterOrigin: { left: Math.round(effectiveCanvasOrigin.left), top: Math.round(effectiveCanvasOrigin.top) } },
  522 |     { kind: 'device-origin-rounding', rasterOrigin: { left: Math.round(effectiveCanvasOrigin.left * dpr) / dpr, top: Math.round(effectiveCanvasOrigin.top * dpr) / dpr } },
  523 |     { kind: 'continuous-css-origin', rasterOrigin: effectiveCanvasOrigin }
  524 |   ].map((candidate, order) => {
  525 |     const calibration = calibrationNative.map(anchor => ({ text: anchor.text, anchorNativePixel: anchor.anchorNativePixel, samples: anchor.targets.map(p => {
  526 |       const pixelX = Math.floor((candidate.rasterOrigin.left - clip.x) * dpr + (p.pixelX + .5) * dpr * draw.width / draw.backingWidth), pixelY = Math.floor((candidate.rasterOrigin.top - clip.y) * dpr + (p.pixelY + .5) * dpr * draw.height / draw.backingHeight), rgb = pixels.at(pixelX, pixelY);
  527 |       const projected = projectAtOrigin(pixelX, pixelY, anchor.neighbors, candidate.rasterOrigin), channelError = Math.max(...rgb.map((v, i) => Math.abs(v - projected.rgba[i])));
  528 |       if (projected.inputs.some(p => p.rgba[3] !== 255)) throw Error('Every fixed native calibration input must be opaque');
  529 |       return { nativePixelX: p.pixelX, nativePixelY: p.pixelY, savedPixelX: pixelX, savedPixelY: pixelY, savedRgb: rgb, projected, channelError };
  530 |     }) }));
  531 |     const errors = calibration.flatMap(c => c.samples.map(s => s.channelError));
  532 |     return { ...candidate, order, calibration, maxResidual: Math.max(...errors), meanResidual: errors.reduce((sum, v) => sum + v, 0) / errors.length };
  533 |   });
  534 |   const selectedTransform = [...candidates].sort((a, b) => a.maxResidual - b.maxResidual || a.meanResidual - b.meanResidual || a.order - b.order)[0];
  535 |   if (selectedTransform.maxResidual > 4) throw Error('No deterministic browser raster transform preserves every fixed axis constellation: ' + JSON.stringify(candidates.map(c => ({ kind: c.kind, rasterOrigin: c.rasterOrigin, maxResidual: c.maxResidual, worst: c.calibration.flatMap(a => a.samples).sort((a, b) => b.channelError - a.channelError).slice(0, 2) }))));
  536 |   const rasterOrigin = selectedTransform.rasterOrigin, offsetDevicePixels = { x: (rasterOrigin.left - effectiveCanvasOrigin.left) * dpr, y: (rasterOrigin.top - effectiveCanvasOrigin.top) * dpr };
  537 |   expect(Math.abs(offsetDevicePixels.x)).toBeLessThanOrEqual(.5 * dpr); expect(Math.abs(offsetDevicePixels.y)).toBeLessThanOrEqual(.5 * dpr);
  538 |   const rasterTransform = { kind: selectedTransform.kind, selectionRule: 'lowest maximum residual, then mean residual, then CSS rounding, device rounding, continuous origin', cssOrigin: { left: canvasRect.left, top: canvasRect.top }, documentCanvasOrigin, screenshotDocumentOrigin, effectiveCanvasOrigin, rasterOrigin, offsetDevicePixels, nativeConstellations: calibrationNative, candidates, calibration: selectedTransform.calibration, maxResidual: selectedTransform.maxResidual };
  539 |   const at = (p: Point) => { const pixelX = Math.floor((rasterOrigin.left + p.x - clip.x) * dpr), pixelY = Math.floor((rasterOrigin.top + p.y - clip.y) * dpr); if (pixelX < 0 || pixelX >= pixels.width || pixelY < 0 || pixelY >= pixels.height) throw Error('Saved witness must remain inside PNG bounds: ' + JSON.stringify({ p, pixelX, pixelY })); return { pixelX, pixelY, rgb: pixels.at(pixelX, pixelY) }; };
  540 |   const projection = (pixelX: number, pixelY: number, neighbors: Witness['paintNeighbors']) => projectAtOrigin(pixelX, pixelY, neighbors, rasterOrigin);
  541 |   const textThreshold = theme === 'contrast' ? 7 : 4.5, graphicThreshold = theme === 'contrast' ? 7 : 3;
  542 |   const glyphs = [...layoutProof.axes.map(t => ({ kind: 'axis', ...t })), ...layoutProof.annotated.flatMap(a => a.text.map(t => ({ kind: a.id, ...t })))].map(t => {
  543 |     expect(t.witnesses.length, 'actual solid glyph witnesses: ' + t.text).toBeGreaterThanOrEqual(1);
  544 |     const samples = t.witnesses.map(witness => { const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i]))), contrast = contrastRatio(actual.rgb, witness.before! as [number, number, number]);
  545 |       expect(channelError, 'saved glyph survives final opaque panels: ' + t.text).toBeLessThanOrEqual(4); expect(witness.channelError, 'independent glyph stencil matches actual text paint').toBeLessThanOrEqual(6); expect(contrast, 'actual saved text contrast: ' + t.text).toBeGreaterThanOrEqual(textThreshold); return { ...witness, ...actual, projected, contrast, channelError }; });
  546 |     return { ...t, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  547 |   });
  548 |   const cardPanels = layoutProof.annotated.map(a => {
  549 |     const b = a.card, inset = 3 * draw.width / draw.layout.width;
  550 |     const samples = [{ x: b.x + b.width / 2, y: b.y + inset }, { x: b.x + b.width / 2, y: b.y + b.height - inset }, { x: b.x + inset, y: b.y + b.height / 2 }, { x: b.x + b.width - inset, y: b.y + b.height / 2 }].map(p => {
  551 |       const pixel = at(p), channelError = Math.max(...pixel.rgb.map((v, i) => Math.abs(v - b.rgb[i]))); expect(channelError, a.id + ' opaque panel is retained in saved PNG').toBeLessThanOrEqual(4); return { ...p, ...pixel, expected: b.rgb, channelError };
  552 |     }); return { id: a.id, card: b, samples };
  553 |   });
  554 |   const sceneSurface = (leader: StrokePaint) => {
  555 |     const segment = leader.segments[0], middle = { x: (segment.from.x + segment.to.x) / 2, y: (segment.from.y + segment.to.y) / 2 };
  556 |     const length = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y), normal = { x: -(segment.to.y - segment.from.y) / length, y: (segment.to.x - segment.from.x) / length };
  557 |     const candidates: Point[] = [];
  558 |     for (const distance of [6, 10, 14, 20, 28, 40, 56, 80]) for (const sign of [-1, 1]) candidates.push({ x: middle.x + normal.x * distance * sign, y: middle.y + normal.y * distance * sign });
  559 |     for (let y = draw.layout.plotTop + 4; y < draw.view.groundY - 4; y += 8) for (let x = draw.view.x + 6; x < draw.width - 24; x += 8) candidates.push({ x, y });
  560 |     candidates.sort((a, b) => Math.hypot(a.x - middle.x, a.y - middle.y) - Math.hypot(b.x - middle.x, b.y - middle.y) || a.y - b.y || a.x - b.x);
  561 |     const glyphBoxes = draw.text.map(t => ({ x: t.left, y: t.top, width: t.right - t.left, height: t.bottom - t.top }));
  562 |     for (const candidate of candidates) {
  563 |       if (candidate.x < draw.view.x + 4 || candidate.x > draw.width - 24 || candidate.y < draw.layout.plotTop + 4 || candidate.y > draw.view.groundY - 4) continue;
  564 |       if ([...draw.cards, ...glyphBoxes, ...layoutProof.points].some(b => contains(b, candidate, 2))) continue;
  565 |       const pixelBox = { x: candidate.x - .5, y: candidate.y - .5, width: 1, height: 1 };
  566 |       if (draw.strokes.some(stroke => stroke.segments.some(s => segmentTouchesBox(s.from, s.to, pixelBox, stroke.width / 2 + 3)))) continue;
  567 |       const sample = at(candidate); if (!sample.rgb.every((v, i) => v <= [30, 50, 75][i])) continue;
  568 |       return { ...candidate, ...sample, leaderMiddle: middle, distance: Math.hypot(candidate.x - middle.x, candidate.y - middle.y), clearOfObservedPaint: true };
  569 |     }
  570 |     throw Error('No independently clear, visible scene surface near the actual leader');
  571 |   };
  572 |   const leaders = layoutProof.annotated.map(a => {
  573 |     const surfaceWitness = sceneSurface(a.leader);
  574 |     expect(a.leader.witnesses).toHaveLength(3);
  575 |     const samples = a.leader.witnesses.map(witness => { const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), finalProjected = projection(actual.pixelX, actual.pixelY, witness.finalPaintNeighbors!), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i]))), finalChannelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - finalProjected.rgba[i]))), overlapContrast = contrastRatio(actual.rgb, witness.before! as [number, number, number]), contrast = contrastRatio(actual.rgb, surfaceWitness.rgb);
  576 |       const finalInkError = Math.max(...witness.rgb.map((v, i) => Math.abs(v - witness.finalNativeRgba![i])));
  577 |       expect(finalInkError, a.id + ' original leader ink survives later annotations ' + JSON.stringify({ witness, leader: a.leader })).toBeLessThanOrEqual(4); expect(finalChannelError, a.id + ' final native leader paint remains in saved PNG').toBeLessThanOrEqual(4);
  578 |       expect(channelError, a.id + ' saved leader paint ' + JSON.stringify({ witness, actual, projected, finalProjected, finalChannelError, screenshotGeometry, leader: a.leader, card: a.card, anchor: a.anchor })).toBeLessThanOrEqual(4); expect(witness.channelError, a.id + ' physical leader contains its expected ink').toBeLessThanOrEqual(8); expect(contrast, a.id + ' physical saved leader contrast against visible scene').toBeGreaterThanOrEqual(graphicThreshold); return { ...witness, ...actual, projected, finalProjected, contrast, overlapContrast, channelError, finalChannelError, finalInkError }; });
  579 |     return { id: a.id, ...a.leader, samples, surfaceWitness, minContrast: Math.min(...samples.map(w => w.contrast!)), minOverlapContrast: Math.min(...samples.map(w => w.overlapContrast)) };
  580 |   });
  581 |   const survivingStroke = (paint: StrokePaint, id: string, threshold?: number) => {
  582 |     expect(paint.finalWitnesses!.length, id + ' has native ink after every annotation').toBeGreaterThanOrEqual(paint.segments.length === 4 ? 6 : 2);
  583 |     const samples = paint.finalWitnesses!.map(witness => {
  584 |       const actual = at(witness), projected = projection(actual.pixelX, actual.pixelY, witness.paintNeighbors), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - projected.rgba[i])));
  585 |       expect(witness.channelError, id + ' survives native final paint ' + JSON.stringify({ witness, paint })).toBeLessThanOrEqual(4); expect(channelError, id + ' survives in saved PNG').toBeLessThanOrEqual(4);
  586 |       const surfaceWitness = sceneSurface(paint), contrast = contrastRatio(actual.rgb, surfaceWitness.rgb);
  587 |       if (threshold !== undefined) expect(contrast, id + ' actual saved ink contrast against visible scene').toBeGreaterThanOrEqual(threshold);
  588 |       return { ...witness, ...actual, projected, channelError, contrast, surfaceWitness };
  589 |     });
  590 |     return { id, ...paint, samples, minContrast: Math.min(...samples.map(s => s.contrast)) };
  591 |   };
  592 |   const outlines = layoutProof.annotated.filter(a => a.outline).map(a => survivingStroke(a.outline!, a.id + '-outline'));
  593 |   const crosshair = survivingStroke(layoutProof.crosshair, 'selected-crosshair', graphicThreshold);
  594 |   const sky = [{ x: 16, y: 10 }, { x: draw.width - 16, y: 10 }, { x: 16, y: draw.height - 5 }, { x: draw.width - 16, y: draw.height - 5 }].map(p => { const sample = at(p); expect(sample.rgb.every((v, i) => v <= [30, 50, 75][i]), 'saved canvas is painted inside its rounded parent').toBe(true); return { ...p, ...sample }; });
  595 |   const expectedMarker = theme === 'contrast' ? [255, 255, 0] : [103, 232, 249], sx = draw.width / draw.layout.width, sy = draw.height / draw.layout.height;
  596 |   const marker = Array.from({ length: 16 }, (_, i) => i * Math.PI / 8).map(angle => ({ x: layoutProof.projected.x + Math.cos(angle) * 10 * sx, y: layoutProof.projected.y + Math.sin(angle) * 10 * sy }))
  597 |     .filter(p => p.x >= draw.view.x * sx + .25 && p.x <= draw.width - 20 * sx - .25 && p.y >= draw.layout.plotTop * sy + .25 && p.y <= draw.view.groundY * sy - .25)
  598 |     .map(predicted => {
  599 |       const candidates = [], initial = at(predicted), cx = initial.pixelX, cy = initial.pixelY;
```