# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-canvas-callouts.spec.ts >> original launch, apex and impact callouts retain painted text and clearance in nine layouts
- Location: tests\e2e\physics-canvas-callouts.spec.ts:624:5

# Error details

```
Error: No deterministic browser raster transform preserves every fixed axis constellation: [{"kind":"css-origin-rounding","rasterOrigin":{"left":40,"top":487},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":738,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0},{"pixelX":75,"pixelY":739,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":739,"rgba":[146,160,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]},{"kind":"device-origin-rounding","rasterOrigin":{"left":40,"top":487},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":738,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0},{"pixelX":75,"pixelY":739,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":739,"rgba":[146,160,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]},{"kind":"continuous-css-origin","rasterOrigin":{"left":40,"top":487.03125},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":736.9375,"xWeight":0,"yWeight":0.9375,"inputs":[{"pixelX":75,"pixelY":736,"rgba":[203,213,225,255],"weight":0.0625},{"pixelX":76,"pixelY":736,"rgba":[169,180,194,255],"weight":0},{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":0.9375},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737.9375,"xWeight":0,"yWeight":0.9375,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":0.0625},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0.9375},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]}]
```

# Test source

```ts
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
  499 |   const screenshot = path.join(reports, filename), buffer = await page.locator('#physicsCanvas').screenshot({ path: screenshot, scale: 'device', animations: 'disabled' }), pixels = readPng(buffer);
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
> 535 |   if (selectedTransform.maxResidual > 4) throw Error('No deterministic browser raster transform preserves every fixed axis constellation: ' + JSON.stringify(candidates.map(c => ({ kind: c.kind, rasterOrigin: c.rasterOrigin, maxResidual: c.maxResidual, worst: c.calibration.flatMap(a => a.samples).sort((a, b) => b.channelError - a.channelError).slice(0, 2) }))));
      |                                                ^ Error: No deterministic browser raster transform preserves every fixed axis constellation: [{"kind":"css-origin-rounding","rasterOrigin":{"left":40,"top":487},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":738,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0},{"pixelX":75,"pixelY":739,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":739,"rgba":[146,160,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]},{"kind":"device-origin-rounding","rasterOrigin":{"left":40,"top":487},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":738,"xWeight":0,"yWeight":0,"inputs":[{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":1},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0},{"pixelX":75,"pixelY":739,"rgba":[203,213,225,255],"weight":0},{"pixelX":76,"pixelY":739,"rgba":[146,160,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]},{"kind":"continuous-css-origin","rasterOrigin":{"left":40,"top":487.03125},"maxResidual":190,"worst":[{"nativePixelX":75,"nativePixelY":737,"savedPixelX":75,"savedPixelY":737,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":736.9375,"xWeight":0,"yWeight":0.9375,"inputs":[{"pixelX":75,"pixelY":736,"rgba":[203,213,225,255],"weight":0.0625},{"pixelX":76,"pixelY":736,"rgba":[169,180,194,255],"weight":0},{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":0.9375},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190},{"nativePixelX":75,"nativePixelY":738,"savedPixelX":75,"savedPixelY":738,"savedRgb":[15,23,42],"projected":{"rawX":75,"rawY":737.9375,"xWeight":0,"yWeight":0.9375,"inputs":[{"pixelX":75,"pixelY":737,"rgba":[203,213,225,255],"weight":0.0625},{"pixelX":76,"pixelY":737,"rgba":[161,172,187,255],"weight":0},{"pixelX":75,"pixelY":738,"rgba":[203,213,225,255],"weight":0.9375},{"pixelX":76,"pixelY":738,"rgba":[146,159,174,255],"weight":0}],"rgba":[203,213,225,255]},"channelError":190}]}]
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
  600 |       for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const pixelX = cx + dx, pixelY = cy + dy, rgb = pixels.at(pixelX, pixelY); candidates.push({ x: clip.x + (pixelX + .5) / dpr - rasterOrigin.left, y: clip.y + (pixelY + .5) / dpr - rasterOrigin.top, pixelX, pixelY, rgb, channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expectedMarker[i]))) }); }
  601 |       candidates.sort((a, b) => a.channelError - b.channelError || Math.hypot(a.x - predicted.x, a.y - predicted.y) - Math.hypot(b.x - predicted.x, b.y - predicted.y));
  602 |       const witness = candidates[0], contrast = contrastRatio(witness.rgb, sky[0].rgb); expect(witness.channelError, 'saved original selected marker ink').toBeLessThanOrEqual(4); expect(contrast).toBeGreaterThanOrEqual(graphicThreshold); return { predicted, ...witness, expected: expectedMarker, contrast };
  603 |     });
  604 |   expect(marker.length, 'selected original ring retains multiple independent witnesses').toBeGreaterThanOrEqual(2);
  605 |   const all = [...glyphs.flatMap(g => g.samples), ...cardPanels.flatMap(c => c.samples), ...leaders.flatMap(l => [...l.samples, l.surfaceWitness]), ...outlines.flatMap(o => o.samples), ...crosshair.samples, ...sky, ...marker];
  606 |   const liveInputs = await page.evaluate(async ({ points, geometry }: any) => {
  607 |     const w = window as any; await w.__calloutSettle(); const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, b = cv.getBoundingClientRect(), ctx = cv.getContext('2d')!;
  608 |     if (b.left !== geometry.canvasRect.left || b.top !== geometry.canvasRect.top || b.width !== geometry.canvasRect.width || b.height !== geometry.canvasRect.height || cv.width !== geometry.backingWidth || cv.height !== geometry.backingHeight) throw Error('Canvas bounds changed during screenshot');
  609 |     const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  610 |     return points.map((p: any) => {
  611 |     const rawX = ((geometry.clip.x + (p.pixelX + .5) / geometry.dpr - geometry.rasterOrigin.left) * cv.width / b.width) - .5, rawY = ((geometry.clip.y + (p.pixelY + .5) / geometry.dpr - geometry.rasterOrigin.top) * cv.height / b.height) - .5;
  612 |       const pixels = []; for (const dy of [0, 1]) for (const dx of [0, 1]) { const pixelX = Math.floor(rawX) + dx, pixelY = Math.floor(rawY) + dy; pixels.push({ pixelX, pixelY, rgba: [...data.slice((pixelY * cv.width + pixelX) * 4, (pixelY * cv.width + pixelX) * 4 + 4)] }); } return pixels;
  613 |     });
  614 |   }, { points: all, geometry: { ...screenshotGeometry, rasterOrigin } });
  615 |   const live = liveInputs.map((inputs: Witness['paintNeighbors'], i: number) => { const projected = projection(all[i].pixelX, all[i].pixelY, inputs); const channelError = Math.max(...projected.rgba.slice(0, 3).map((v, c) => Math.abs(v - all[i].rgb[c]))); if (inputs.some(p => p.rgba[3] !== 255) || channelError > 4) throw Error('Saved PNG must retain every actual opaque composited canvas witness: ' + JSON.stringify({ input: all[i], projected, channelError })); return { pixelX: all[i].pixelX, pixelY: all[i].pixelY, ...projected }; });
  616 |   expect(await evidence(page), 'native snapshot preserves the full original ball, trails, records and log').toEqual(before);
  617 |   expect([sha(source), sha(mirror), sha(spec)]).toEqual(initialHashes); expect(errors).toEqual([]);
  618 |   return { filename, screenshot, screenshotSha256: sha(screenshot), screenshotGeometry, captureMetrics, rasterTransform, theme, pixelWidth: pixels.width, pixelHeight: pixels.height, sourceSha256: initialHashes[0], originalTrail: trail, originalIndex: index, originalPoint: trail.points[index], draw,
  619 |     ...layoutProof, glyphs, cardPanels, leaders, outlines, crosshair, sky, marker, liveCanvasPixels: live, savedPaintVerified: true, originalEvidenceUnchanged: true,
  620 |     minFont: Math.min(...glyphs.map(t => t.fontSize)), minTextContrast: Math.min(...glyphs.map(t => t.minContrast)), minLeaderContrast: Math.min(...leaders.map(l => l.minContrast)), minMarkerContrast: Math.min(...marker.map(m => m.contrast)), minCrosshairContrast: crosshair.minContrast };
  621 | }
  622 | async function select(page: Page, id: string, moment: string) { await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await page.locator('[data-physics-plot-moment="' + moment + '"]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0'); }
  623 | 
  624 | test('original launch, apex and impact callouts retain painted text and clearance in nine layouts', async ({ page }) => {
  625 |   test.setTimeout(300_000); await mount(page); await launch(page); const before = await evidence(page), trail = before.trails[0];
  626 |   const moments = [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }];
  627 |   for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
  628 |     await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__calloutTheme(t), theme); await page.waitForTimeout(50);
  629 |     const captures = [];
  630 |     for (const moment of moments) { await select(page, '1', moment.id); captures.push(await capture(page, trail, moment.index, theme, 'callout-' + theme + '-' + width + '-' + moment.id + '.png')); expect(await evidence(page)).toEqual(before); }
  631 |     if (width === 320 && theme === 'dark') {
  632 |       const impact = captures.find(proof => proof.originalIndex === trail.points.length - 1)!;
  633 |       expect(impact.selectedCardVisible, 'dark320 impact retains its actually painted original readout').toBe(true);
  634 |       expect(impact.selectedTextComplete, 'dark320 impact retains the entire original phase, height and time').toBe(true);
  635 |       expect(impact.selectedText.join(' ')).toBe(impact.expectedText);
```