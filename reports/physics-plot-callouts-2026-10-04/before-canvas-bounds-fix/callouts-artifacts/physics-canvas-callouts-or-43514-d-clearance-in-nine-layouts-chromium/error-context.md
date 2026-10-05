# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-canvas-callouts.spec.ts >> original launch, apex and impact callouts retain painted text and clearance in nine layouts
- Location: tests\e2e\physics-canvas-callouts.spec.ts:327:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 952
Received: 954
```

# Test source

```ts
  186 |       cards: w.__calloutCards, text: w.__calloutText, strokes: w.__calloutStrokes, rings: w.__calloutRings, launched: cv._launched, preview: cv._visualPreview,
  187 |       pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth };
  188 |     w.__calloutCapture = false; return draw;
  189 |   });
  190 | }
  191 | async function ticks(page: Page, n: number) { await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).__calloutTick(); }, n); }
  192 | async function launch(page: Page, changes: object = {}, complete = true) {
  193 |   const run = await page.evaluate(() => ((window as any).__toolData.physics.runCount || 0) + 1);
  194 |   await patch(page, { angle: 45, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 0, airResist: false, simSpeed: complete ? 2 : 1,
  195 |     showOverlay: true, showGraphs: true, showFlightData: true, showVectors: true, showEnergy: true, showFormulas: true, ...changes });
  196 |   await page.locator('[data-physics-launch]').click();
  197 |   if (complete) {
  198 |     await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let count = 0; while (cv._launched && count++ < 10000) w.__calloutTick(); if (cv._launched) throw Error('Original callout fixture failed to land'); });
  199 |     await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, run, { polling: 20 }); await patch(page, { simSpeed: 0 });
  200 |   }
  201 |   await redraw(page);
  202 | }
  203 | async function evidence(page: Page) {
  204 |   return page.evaluate(() => {
  205 |     const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
  206 |     return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ run: t.run ?? null, points: [...t], parameters: t.parameters, apex: t.apex, modelVersion: t.modelVersion })) as Trail[],
  207 |       log: d.runLog, recordings: d.recordedFlights, last: d.lastFlight, count: d.runCount };
  208 |   });
  209 | }
  210 | function apexIndex(trail: Trail) {
  211 |   expect(trail.apex, 'fixture has original canonical apex evidence').toBeTruthy();
  212 |   const index = trail.points.findIndex(p => p.mVy === 0 && p.t === trail.apex.tSec && p.mX === trail.apex.mX && p.mY === trail.apex.mY && p.mVx === trail.apex.vx);
  213 |   expect(index, 'canonical apex is an original stored point').toBeGreaterThanOrEqual(0); return index;
  214 | }
  215 | function value(n: number) { return n !== 0 && Math.abs(n) < .01 ? n.toPrecision(3) : n.toFixed(2); }
  216 | function contains(b: Box, p: Point, pad = 0) { return p.x >= b.x - pad && p.x <= b.x + b.width + pad && p.y >= b.y - pad && p.y <= b.y + b.height + pad; }
  217 | function overlaps(a: Box, b: Box, pad = 0) { return a.x < b.x + b.width + pad && a.x + a.width + pad > b.x && a.y < b.y + b.height + pad && a.y + a.height + pad > b.y; }
  218 | function segmentTouchesBox(a: Point, b: Point, box: Box, pad = 0) {
  219 |   const r = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  220 |   if (contains(r, a) || contains(r, b)) return true;
  221 |   const orientation = (p: Point, q: Point, t: Point) => (q.x - p.x) * (t.y - p.y) - (q.y - p.y) * (t.x - p.x);
  222 |   const crosses = (p: Point, q: Point) => {
  223 |     const v = [orientation(a, b, p), orientation(a, b, q), orientation(p, q, a), orientation(p, q, b)];
  224 |     return v[0] * v[1] <= 0 && v[2] * v[3] <= 0 && Math.max(Math.min(a.x, b.x), Math.min(p.x, q.x)) <= Math.min(Math.max(a.x, b.x), Math.max(p.x, q.x))
  225 |       && Math.max(Math.min(a.y, b.y), Math.min(p.y, q.y)) <= Math.min(Math.max(a.y, b.y), Math.max(p.y, q.y));
  226 |   };
  227 |   const tl = { x: r.x, y: r.y }, tr = { x: r.x + r.width, y: r.y }, br = { x: r.x + r.width, y: r.y + r.height }, bl = { x: r.x, y: r.y + r.height };
  228 |   return crosses(tl, tr) || crosses(tr, br) || crosses(br, bl) || crosses(bl, tl);
  229 | }
  230 | function geometry(draw: Draw, trail: Trail, index: number) {
  231 |   const p = trail.points[index], scaleX = draw.width / draw.layout.width, scaleY = draw.height / draw.layout.height;
  232 |   const projected = { x: (draw.view.x + p.mX * draw.view.scale) * scaleX, y: (draw.view.groundY - p.mY * draw.view.scale) * scaleY };
  233 |   expect(draw.selected).toMatchObject({ run: trail.run, index, count: trail.points.length, t: p.t, x: p.mX, y: p.mY, vx: p.mVx, vy: p.mVy });
  234 |   expect(draw.originalPoint).toEqual(p); expect(draw.selected.parameters).toMatchObject({ angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity, mass: trail.parameters.mass, launchHeight: trail.parameters.launchHeight, airResist: trail.parameters.drag, modelVersion: trail.modelVersion });
  235 |   expect(draw.marker).toMatchObject({ index, run: trail.run, t: p.t });
  236 |   expect(draw.marker.x * scaleX).toBeCloseTo(projected.x, 8); expect(draw.marker.y * scaleY).toBeCloseTo(projected.y, 8);
  237 |   expect(draw.pageWidth).toBeLessThanOrEqual(draw.viewportWidth + 1);
  238 |   const selectedLayout = draw.layout.labels.find((label: any) => label.id === 'inspection'); expect(selectedLayout, 'selected original point has a visible readout').toBeTruthy();
  239 |   const labelFor = (card: CardPaint) => draw.layout.labels.find((label: any) => Math.abs(label.x * scaleX - card.x) < 1e-7 && Math.abs(label.y * scaleY - card.y) < 1e-7 && Math.abs(label.width * scaleX - card.width) < 1e-7 && Math.abs(label.height * scaleY - card.height) < 1e-7);
  240 |   expect(draw.cards.length).toBe(draw.layout.labels.length); expect(draw.cards.length).toBeGreaterThan(0);
  241 |   const selectedCard = draw.cards.find(card => labelFor(card)?.id === 'inspection'); expect(selectedCard, 'selected readout is actually filled').toBeTruthy();
  242 |   const selectedText = draw.text.filter(t => t.paintOrder > selectedCard!.paintOrder && contains(selectedCard!, { x: t.left, y: t.top }) && contains(selectedCard!, { x: t.right, y: t.bottom })).sort((a, b) => a.y - b.y || a.x - b.x);
  243 |   const atApex = !!trail.apex && index === apexIndex(trail), impact = p.t > 0 && p.mY === 0 && p.mVy <= 0;
  244 |   const title = atApex && p.t === 0 ? 'Highest point at release' : index === 0 ? 'Launch point' : impact ? 'Ground impact' : atApex ? 'At apex' : p.mVy > 0 ? 'Rising' : p.mVy < 0 ? 'Falling' : 'Vertical velocity is zero';
  245 |   const expectedText = title + ' y = ' + value(p.mY) + ' m · t = ' + p.t.toFixed(3) + ' s';
  246 |   expect(selectedText.map(t => t.text).join(' '), 'wrapped selected text retains every original value').toBe(expectedText);
  247 |   const axes = draw.text.filter(t => t.paintOrder < draw.cards[0].paintOrder && (t.text === 'Height (m)' || t.text === 'Distance (m)'
  248 |     || (/^-?\d+(?:\.\d+)?$/.test(t.text) && (Math.abs(t.x - (draw.view.x - 9) * scaleX) < .01 || Math.abs(t.y - (draw.view.groundY + 20) * scaleY) < .01))));
  249 |   expect(axes.length, 'actual axis/tick glyphs are observed').toBeGreaterThanOrEqual(4);
  250 |   const axisBoxes = axes.map(t => ({ x: t.left, y: t.top, width: t.right - t.left, height: t.bottom - t.top, text: t.text }));
  251 |   const points = draw.rings.filter(r => Math.abs(Math.abs(r.end - r.start) - Math.PI * 2) < 1e-7 && r.radius >= 3 && r.radius <= 10.01 && r.x >= draw.view.x * scaleX - .01 && r.x <= draw.width - 20 * scaleX + .01 && r.y >= draw.layout.plotTop * scaleY && r.y <= draw.view.groundY * scaleY + .01)
  252 |     .map(r => ({ x: r.x - r.radius - 4 * scaleX, y: r.y - r.radius - 4 * scaleY, width: r.radius * 2 + 8 * scaleX, height: r.radius * 2 + 8 * scaleY, center: { x: r.x, y: r.y }, radius: r.radius }));
  253 |   expect(points.some(r => Math.hypot(r.center.x - draw.view.x * scaleX, r.center.y - (draw.view.groundY - trail.parameters.launchHeight * draw.view.scale) * scaleY) < .01), 'original release ring is protected, including h0=0').toBe(true);
  254 |   const arrows = draw.strokes.filter(s => ['#93c5fd', '#6ee7b7', '#c4b5fd', '#fda4af'].includes(s.color.toLowerCase()));
  255 |   const annotated = draw.cards.map(card => {
  256 |     const label = labelFor(card); expect(label, 'actual panel maps to a retained semantic identity').toBeTruthy(); expect(card.alpha).toBe(1);
  257 |     const text = draw.text.filter(t => t.paintOrder > card.paintOrder && t.paintOrder < (draw.cards.find(other => other.paintOrder > card.paintOrder)?.paintOrder ?? Infinity));
  258 |     expect(text.length, label.id + ' paints actual text').toBeGreaterThan(0);
  259 |     const leaders = draw.strokes.filter(s => s.paintOrder === card.paintOrder - 1 && s.segments.length === 1 && Math.abs(s.width - scaleX) < .01 && !s.dash.length);
  260 |     expect(leaders, label.id + ' has one actual painted leader').toHaveLength(1); const leader = leaders[0];
  261 |     expect(card.x).toBeGreaterThanOrEqual((draw.view.x + 8) * scaleX - .01); expect(card.x + card.width).toBeLessThanOrEqual(draw.width - 28 * scaleX + .01);
  262 |     expect(card.y).toBeGreaterThanOrEqual((draw.layout.plotTop + 8) * scaleY - .01); expect(card.y + card.height).toBeLessThanOrEqual((draw.view.groundY - 8) * scaleY + .01);
  263 |     for (const t of text) { expect(t.fontSize, t.text).toBeGreaterThanOrEqual(11.99); expect(t.left).toBeGreaterThanOrEqual(card.x + 7 * scaleX - .01); expect(t.right).toBeLessThanOrEqual(card.x + card.width - 7 * scaleX + .01); expect(t.top).toBeGreaterThanOrEqual(card.y); expect(t.bottom).toBeLessThanOrEqual(card.y + card.height); }
  264 |     for (const axis of axisBoxes) { expect(overlaps(card, axis, 2), label.id + ' covers actual axis glyphs: ' + axis.text).toBe(false); for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, axis, 1), label.id + ' leader crosses actual axis glyphs').toBe(false); }
  265 |     for (const point of points) { expect(overlaps(card, point), label.id + ' covers an original point ring').toBe(false); if (Math.hypot(point.center.x - label.anchor.x * scaleX, point.center.y - label.anchor.y * scaleY) > point.radius + 4) for (const segment of leader.segments) expect(segmentTouchesBox(segment.from, segment.to, point), label.id + ' leader crosses another point').toBe(false); }
  266 |     for (const arrow of arrows) for (const segment of arrow.segments) expect(segmentTouchesBox(segment.from, segment.to, card, arrow.width / 2), label.id + ' covers an actual velocity/gravity shaft or arrowhead').toBe(false);
  267 |     const segment = leader.segments[0], anchor = { x: label.anchor.x * scaleX, y: label.anchor.y * scaleY };
  268 |     const cross = (segment.to.x - anchor.x) * (segment.from.y - anchor.y) - (segment.to.y - anchor.y) * (segment.from.x - anchor.x);
  269 |     expect(Math.abs(cross), label.id + ' leader points to its actual original anchor').toBeLessThan(1e-5);
  270 |     expect(Math.hypot(segment.from.x - anchor.x, segment.from.y - anchor.y)).toBeCloseTo((label.anchor.radius + 2) * scaleX, 7);
  271 |     expect(contains(card, segment.to, .01)).toBe(true); expect(Math.min(Math.abs(segment.to.x - card.x), Math.abs(segment.to.x - card.x - card.width), Math.abs(segment.to.y - card.y), Math.abs(segment.to.y - card.y - card.height))).toBeLessThan(.01);
  272 |     return { id: label.id, card, text, leader, anchor, radius: label.anchor.radius };
  273 |   });
  274 |   for (let i = 0; i < annotated.length; i++) for (let j = i + 1; j < annotated.length; j++) {
  275 |     const a = annotated[i], b = annotated[j]; expect(overlaps(a.card, b.card, 5.99 * scaleX), a.id + ' overlaps ' + b.id).toBe(false);
  276 |     for (const segment of a.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, b.card, 1.99 * scaleX), a.id + ' leader crosses ' + b.id).toBe(false);
  277 |     for (const segment of b.leader.segments) expect(segmentTouchesBox(segment.from, segment.to, a.card, 1.99 * scaleX), b.id + ' leader crosses ' + a.id).toBe(false);
  278 |   }
  279 |   return { selectedText: selectedText.map(t => t.text), expectedText, projected, annotated, axes, axisBoxes, points, geometryVerified: true, selectedCardVisible: true, axisGlyphClearance: true, originalPointClearance: true, vectorClearance: true, otherLabelClearance: true };
  280 | }
  281 | async function capture(page: Page, trail: Trail, index: number, theme: string, filename: string) {
  282 |   mkdirSync(reports, { recursive: true }); const before = await evidence(page);
  283 |   await page.evaluate(async () => { const w = window as any; w.__calloutNative(); await w.__calloutSettle(); });
  284 |   const draw = await redraw(page), layoutProof = geometry(draw, trail, index);
  285 |   const screenshot = path.join(reports, filename), buffer = await page.locator('#physicsCanvas').screenshot({ path: screenshot, animations: 'disabled' }), pixels = readPng(buffer);
> 286 |   expect(pixels.width).toBe(draw.backingWidth); expect(pixels.height).toBe(draw.backingHeight);
      |                                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  287 |   const at = (p: Point) => { const pixelX = Math.floor(p.x * pixels.width / draw.width), pixelY = Math.floor(p.y * pixels.height / draw.height); expect(pixelX).toBeGreaterThanOrEqual(0); expect(pixelX).toBeLessThan(pixels.width); expect(pixelY).toBeGreaterThanOrEqual(0); expect(pixelY).toBeLessThan(pixels.height); return { pixelX, pixelY, rgb: pixels.at(pixelX, pixelY) }; };
  288 |   const textThreshold = theme === 'contrast' ? 7 : 4.5, graphicThreshold = theme === 'contrast' ? 7 : 3;
  289 |   const glyphs = [...layoutProof.axes.map(t => ({ kind: 'axis', ...t })), ...layoutProof.annotated.flatMap(a => a.text.map(t => ({ kind: a.id, ...t })))].map(t => {
  290 |     expect(t.witnesses.length, 'actual solid glyph witnesses: ' + t.text).toBeGreaterThanOrEqual(1);
  291 |     const samples = t.witnesses.map(witness => { const actual = at(witness), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - witness.rgb[i]))); expect(channelError, 'saved glyph survives final opaque panels: ' + t.text).toBeLessThanOrEqual(4); expect(witness.channelError, 'independent glyph stencil matches actual text paint').toBeLessThanOrEqual(6); expect(witness.contrast, 'actual text contrast: ' + t.text).toBeGreaterThanOrEqual(textThreshold); return { ...witness, ...actual, channelError }; });
  292 |     return { ...t, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  293 |   });
  294 |   const cardPanels = layoutProof.annotated.map(a => {
  295 |     const b = a.card, inset = 3 * draw.width / draw.layout.width;
  296 |     const samples = [{ x: b.x + b.width / 2, y: b.y + inset }, { x: b.x + b.width / 2, y: b.y + b.height - inset }, { x: b.x + inset, y: b.y + b.height / 2 }, { x: b.x + b.width - inset, y: b.y + b.height / 2 }].map(p => {
  297 |       const pixel = at(p), channelError = Math.max(...pixel.rgb.map((v, i) => Math.abs(v - b.rgb[i]))); expect(channelError, a.id + ' opaque panel is retained in saved PNG').toBeLessThanOrEqual(4); return { ...p, ...pixel, expected: b.rgb, channelError };
  298 |     }); return { id: a.id, card: b, samples };
  299 |   });
  300 |   const leaders = layoutProof.annotated.map(a => {
  301 |     expect(a.leader.witnesses).toHaveLength(3);
  302 |     const samples = a.leader.witnesses.map(witness => { const actual = at(witness), channelError = Math.max(...actual.rgb.map((v, i) => Math.abs(v - witness.rgb[i]))); expect(channelError, a.id + ' saved leader paint').toBeLessThanOrEqual(4); expect(witness.channelError, a.id + ' physical leader contains its expected ink').toBeLessThanOrEqual(8); expect(witness.contrast, a.id + ' physical leader contrast').toBeGreaterThanOrEqual(graphicThreshold); return { ...witness, ...actual, channelError }; });
  303 |     return { id: a.id, ...a.leader, samples, minContrast: Math.min(...samples.map(w => w.contrast!)) };
  304 |   });
  305 |   const sky = [{ x: 4, y: 4 }, { x: draw.width - 4, y: 4 }, { x: 4, y: draw.height - 4 }, { x: draw.width - 4, y: draw.height - 4 }].map(p => { const sample = at(p); expect(sample.rgb.every((v, i) => v <= [30, 50, 75][i]), 'saved canvas is painted').toBe(true); return { ...p, ...sample }; });
  306 |   const expectedMarker = theme === 'contrast' ? [255, 255, 0] : [103, 232, 249], sx = draw.width / draw.layout.width, sy = draw.height / draw.layout.height;
  307 |   const marker = [-Math.PI / 2, 0, Math.PI / 2, Math.PI, -Math.PI / 4, -Math.PI * 3 / 4].map(angle => ({ x: layoutProof.projected.x + Math.cos(angle) * 10 * sx, y: layoutProof.projected.y + Math.sin(angle) * 10 * sy }))
  308 |     .filter(p => p.x >= draw.view.x * sx + .25 && p.x <= draw.width - 20 * sx - .25 && p.y >= draw.layout.plotTop * sy + .25 && p.y <= draw.view.groundY * sy - .25)
  309 |     .map(predicted => {
  310 |       const candidates = []; const cx = Math.floor(predicted.x * pixels.width / draw.width), cy = Math.floor(predicted.y * pixels.height / draw.height);
  311 |       for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const pixelX = cx + dx, pixelY = cy + dy, rgb = pixels.at(pixelX, pixelY); candidates.push({ x: (pixelX + .5) * draw.width / pixels.width, y: (pixelY + .5) * draw.height / pixels.height, pixelX, pixelY, rgb, channelError: Math.max(...rgb.map((v, i) => Math.abs(v - expectedMarker[i]))) }); }
  312 |       candidates.sort((a, b) => a.channelError - b.channelError || Math.hypot(a.x - predicted.x, a.y - predicted.y) - Math.hypot(b.x - predicted.x, b.y - predicted.y));
  313 |       const witness = candidates[0], contrast = contrastRatio(witness.rgb, sky[0].rgb); expect(witness.channelError, 'saved original selected marker ink').toBeLessThanOrEqual(4); expect(contrast).toBeGreaterThanOrEqual(graphicThreshold); return { predicted, ...witness, expected: expectedMarker, contrast };
  314 |     });
  315 |   expect(marker.length, 'selected original ring retains multiple independent witnesses').toBeGreaterThanOrEqual(2);
  316 |   const all = [...glyphs.flatMap(g => g.samples), ...cardPanels.flatMap(c => c.samples), ...leaders.flatMap(l => l.samples), ...sky, ...marker];
  317 |   const live = await page.evaluate(async (points: Point[]) => { const w = window as any; await w.__calloutSettle(); const cv = document.getElementById('physicsCanvas') as HTMLCanvasElement, b = cv.getBoundingClientRect(), ctx = cv.getContext('2d')!; return points.map(p => [...ctx.getImageData(Math.floor(p.x * cv.width / b.width), Math.floor(p.y * cv.height / b.height), 1, 1).data]); }, all);
  318 |   live.forEach((rgba, i) => { expect(rgba[3], 'actual canvas witness opaque').toBe(255); expect(Math.max(...rgba.slice(0, 3).map((v, c) => Math.abs(v - all[i].rgb[c]))), 'saved PNG retains actual canvas paint').toBeLessThanOrEqual(4); });
  319 |   expect(await evidence(page), 'native snapshot preserves the full original ball, trails, records and log').toEqual(before);
  320 |   expect([sha(source), sha(mirror), sha(spec)]).toEqual(initialHashes); expect(errors).toEqual([]);
  321 |   return { filename, screenshot, screenshotSha256: sha(screenshot), theme, pixelWidth: pixels.width, pixelHeight: pixels.height, sourceSha256: initialHashes[0], originalTrail: trail, originalIndex: index, originalPoint: trail.points[index], draw,
  322 |     ...layoutProof, glyphs, cardPanels, leaders, sky, marker, liveCanvasPixels: live, savedPaintVerified: true, originalEvidenceUnchanged: true,
  323 |     minFont: Math.min(...glyphs.map(t => t.fontSize)), minTextContrast: Math.min(...glyphs.map(t => t.minContrast)), minLeaderContrast: Math.min(...leaders.map(l => l.minContrast)), minMarkerContrast: Math.min(...marker.map(m => m.contrast)) };
  324 | }
  325 | async function select(page: Page, id: string, moment: string) { await page.locator('[data-physics-plot-flight="' + id + '"]').click(); await page.locator('[data-physics-plot-moment="' + moment + '"]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0'); }
  326 | 
  327 | test('original launch, apex and impact callouts retain painted text and clearance in nine layouts', async ({ page }) => {
  328 |   test.setTimeout(300_000); await mount(page); await launch(page); const before = await evidence(page), trail = before.trails[0];
  329 |   const moments = [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }];
  330 |   for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
  331 |     await page.setViewportSize({ width, height: 1000 }); await page.evaluate(t => (window as any).__calloutTheme(t), theme); await page.waitForTimeout(50);
  332 |     const captures = [];
  333 |     for (const moment of moments) { await select(page, '1', moment.id); captures.push(await capture(page, trail, moment.index, theme, 'callout-' + theme + '-' + width + '-' + moment.id + '.png')); expect(await evidence(page)).toEqual(before); }
  334 |     configurations.push({ id: theme + '-' + width, width, theme, captures, minFont: Math.min(...captures.map(c => c.minFont)), minTextContrast: Math.min(...captures.map(c => c.minTextContrast)), minLeaderContrast: Math.min(...captures.map(c => c.minLeaderContrast)), minMarkerContrast: Math.min(...captures.map(c => c.minMarkerContrast)), originalEvidenceUnchanged: true });
  335 |   }
  336 |   expect(configurations).toHaveLength(9);
  337 | });
  338 | 
  339 | test('horizontal release and ground impact preserve original events and clear point markers', async ({ page }) => {
  340 |   await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page, { angle: 0, launchHeight: 10 });
  341 |   const before = await evidence(page), trail = before.trails[0]; expect(apexIndex(trail)).toBe(0); expect(trail.points[0]).toMatchObject({ t: 0, mY: 10, mVy: 0 });
  342 |   await select(page, '1', 'apex'); await expect(page.locator('[data-physics-plot-moment="launch"]')).toHaveCount(0);
  343 |   edgeCases.push({ id: 'horizontal-release', ...(await capture(page, trail, 0, 'default', 'horizontal-release.png')) });
  344 |   await select(page, '1', 'impact'); edgeCases.push({ id: 'horizontal-impact', ...(await capture(page, trail, trail.points.length - 1, 'default', 'horizontal-impact.png')) });
  345 |   expect(await evidence(page)).toEqual(before);
  346 | });
  347 | 
  348 | test('drag callouts retain captured values after all six launch controls change', async ({ page }) => {
  349 |   await page.setViewportSize({ width: 375, height: 1000 }); await mount(page); await launch(page, { angle: 60, velocity: 30, gravity: 3.7, mass: 2.5, launchHeight: 25, airResist: true });
  350 |   const before = await evidence(page), trail = before.trails[0]; await patch(page, { angle: 5, velocity: 5, gravity: 25, mass: 10, launchHeight: 0, airResist: false });
  351 |   await page.evaluate(t => (window as any).__calloutTheme(t), 'contrast');
  352 |   for (const moment of [{ id: 'launch', index: 0 }, { id: 'apex', index: apexIndex(trail) }, { id: 'impact', index: trail.points.length - 1 }]) {
  353 |     await select(page, '1', moment.id); const proof = await capture(page, trail, moment.index, 'contrast', 'drag-' + moment.id + '.png');
  354 |     expect(proof.draw.preview).toMatchObject({ kind: 'reference', angle: trail.parameters.angle, velocity: trail.parameters.velocity, gravity: trail.parameters.gravity, launchHeight: trail.parameters.launchHeight });
  355 |     edgeCases.push({ id: 'drag-' + moment.id, ...proof }); expect(await evidence(page)).toEqual(before);
  356 |   }
  357 | });
  358 | 
  359 | test('an unfinished rising path stays paused with a visible original latest-point callout', async ({ page }) => {
  360 |   await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page, { velocity: 15, angle: 30 });
  361 |   await launch(page, { angle: 75, velocity: 30, gravity: 1, launchHeight: 20, airResist: true }, false); await ticks(page, 12); await patch(page, { simSpeed: 0 });
  362 |   const before = await evidence(page), trail = before.trails.at(-1)!, index = trail.points.length - 1;
  363 |   expect(trail.run).toBeNull(); expect(trail.apex).toBeUndefined(); expect(trail.points[index].mVy).toBeGreaterThan(0);
  364 |   const id = await page.locator('[data-physics-plot-flight]').last().getAttribute('data-physics-plot-flight'); expect(id).toMatch(/^unfinished-\d+$/);
  365 |   await select(page, id!, 'latest'); await expect(page.locator('[data-physics-plot-moment="impact"],[data-physics-plot-moment="apex"]')).toHaveCount(0);
  366 |   const proof = await capture(page, trail, index, 'default', 'unfinished-latest.png'); expect(proof.draw.launched).toBe(true); expect(proof.draw.selected.impact).toBe(false); expect(proof.draw.selected.apex).toBe(false);
  367 |   edgeCases.push({ id: 'unfinished-latest', ...proof }); await page.locator('[data-physics-plot-close]').click(); await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
  368 |   await page.evaluate(async () => { const w = window as any; await w.__calloutSettle(); await w.__calloutSettle(); }); expect(await evidence(page)).toEqual(before);
  369 | });
  370 | 
  371 | test('dense original route labels and long translation tokens fit beside protected points', async ({ page }) => {
  372 |   await page.setViewportSize({ width: 320, height: 1000 }); await mount(page);
  373 |   for (const angle of [25, 35, 45, 55, 65]) await launch(page, { angle, velocity: 20, launchHeight: 10, airResist: angle === 35 || angle === 55 });
  374 |   const before = await evidence(page), trail = before.trails[2]; await select(page, '3', 'apex');
  375 |   const dense = await capture(page, trail, apexIndex(trail), 'default', 'dense-overlays.png');
  376 |   expect(dense.annotated.some(a => a.id.startsWith('run-')), 'at least one original comparison route retains an actual readable label').toBe(true); edgeCases.push({ id: 'dense-overlays', ...dense });
  377 |   const token = 'ComparisonRecordingWithoutWhitespaceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  378 |   await page.evaluate(label => { const cv = document.getElementById('physicsCanvas') as any; cv._L.runPrefix = label; cv._physScheduleFrame(); }, token);
  379 |   const long = await capture(page, trail, apexIndex(trail), 'default', 'dense-long-token.png');
  380 |   const routes = long.annotated.filter(a => a.id.startsWith('run-')); expect(routes.length, 'long translated route label is drawn rather than silently discarded').toBeGreaterThan(0);
  381 |   for (const route of routes) expect(route.text.map(t => t.text).join('').includes(token), 'wrapped codepoints retain the full original translated token').toBe(true);
  382 |   edgeCases.push({ id: 'dense-long-token', ...long }); expect(await evidence(page)).toEqual(before);
  383 |   expect(edgeCases).toHaveLength(8); expect(errors).toEqual([]);
  384 | });
  385 | 
```