# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-patient-contrast.spec.ts >> child patient contrast contours clarify palms and cheek support without changing geometry or learning state
- Location: tests\e2e\firstresponse-patient-contrast.spec.ts:417:43

# Error details

```
Error: patient hand has visible dark contour pixels

expect(received).toBeGreaterThan(expected)

Expected: > 12
Received:   9
```

# Test source

```ts
  216 | const resources = (pose: any) => ({ arms: pose.parts.map((part: any) => part.resources), head: pose.head.map((part: any) => part.resources),
  217 |   protected: pose.protectedParts.map((part: any) => part.resources), materials: pose.materials.map((m: any) => [m.id, m.userdata, m.uniform]),
  218 |   canvas: pose.draw.id });
  219 | async function control(page: Page, name: string, keyboard = false) {
  220 |   const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  221 |   if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  222 |   else await button.click();
  223 |   await settle(page); const after = await probe(page);
  224 |   expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(resources(after)).toEqual(resources(before));
  225 |   return after;
  226 | }
  227 | function framed(parts: any[]) {
  228 |   expect(parts.length).toBeGreaterThan(0);
  229 |   for (const part of parts) for (const axis of [0, 1]) {
  230 |     expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995);
  231 |   }
  232 | }
  233 | function valid(pose: any, contrast: boolean) {
  234 |   expect(pose.parts).toHaveLength(36); expect(pose.isolated).toBe(true);
  235 |   for (const part of pose.parts.concat(pose.head)) { expect(part.invalid, part.name).toBe(0); expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/); }
  236 |   if (contrast) {
  237 |     expect(pose.skin).toHaveLength(20); expect(pose.materials).toHaveLength(1);
  238 |     expect(pose.materials[0]).toMatchObject({ name: 'fr-patient-arm-skin', type: 'MeshBasicMaterial', color: [1, 1, 1], strength: 1,
  239 |       depthTest: true, depthWrite: true, transparent: false, opacity: 1 });
  240 |     for (const part of pose.skin) expect(part.material).toMatchObject({ name: 'fr-patient-arm-skin', patientContour: 1, rescuerContour: null });
  241 |   } else {
  242 |     expect(pose.skin).toEqual([]); expect(pose.materials).toEqual([]);
  243 |     for (const part of pose.parts) expect(part.material.patientContour).toBeNull();
  244 |   }
  245 |   for (const part of pose.protectedParts) expect(part.material.patientContour, part.name + ' retains its original material').toBeNull();
  246 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.calls).toBeGreaterThan(0);
  247 |   expect(pose.draw.triangles).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  248 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
  249 | }
  250 | function viewValid(pose: any, view: string, contrast: boolean) {
  251 |   valid(pose, contrast);
  252 |   if (view === 'palm') { framed(pose.hands.left); expect(pose.normalDot).toBeGreaterThan(.92); }
  253 |   else framed(pose.hands.right.filter((part: any) => /-(palm|wrist)$/.test(part.name)));
  254 | }
  255 | async function photograph(page: Page, name?: string) {
  256 |   const shot = await harness.glPixels(page, '#wrap'); expect(shot).toBeTruthy();
  257 |   if (name) writeFileSync(report + '/' + name + '.png', shot!.png); return shot!.png;
  258 | }
  259 | async function captureStage(page: Page, name: string) {
  260 |   await settle(page); const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  261 |   await page.screenshot({ path: report + '/' + name + '-stage.png', clip: clip!, timeout: 60000 });
  262 | }
  263 | function pixelEvidence(onBuffer: Buffer, offBuffer: Buffer, restoredBuffer: Buffer, pose: any, view: string, projection: any) {
  264 |   const on = readPng(onBuffer), off = readPng(offBuffer), restored = readPng(restoredBuffer);
  265 |   expect([on.width, on.height]).toEqual([off.width, off.height]); expect([on.width, on.height]).toEqual([restored.width, restored.height]);
  266 |   const pixelScale = on.width / pose.canvasSize[0], areaScale = pixelScale * pixelScale;
  267 |   expect([projection.width, projection.height]).toEqual([on.width, on.height]);
  268 |   const masks: Record<string, Buffer> = {};
  269 |   for (const name of ['skin', 'hand', 'head', 'clothing']) {
  270 |     masks[name] = Buffer.from(projection.masks[name], 'base64'); expect(masks[name]).toHaveLength(on.width * on.height);
  271 |   }
  272 |   const inside = (name: string, x: number, y: number) => masks[name][y * on.width + x] !== 0;
  273 |   const difference = (a: number[], b: number[]) => Math.max(...a.map((channel, i) => Math.abs(channel - b[i])));
  274 |   let changed = 0, noise = 0, exteriorSamples = 0, exteriorChanged = 0, exteriorNoise = 0;
  275 |   let headSamples = 0, headChanged = 0, headNoise = 0, whiteHead = 0, clothingSamples = 0, clothingChanged = 0, clothingNoise = 0;
  276 |   let whiteHand = 0, darkHand = 0, whiteInterior = 0, cheekDark = 0;
  277 |   const contour = new Uint8Array(on.width * on.height);
  278 |   for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
  279 |     const a = on.at(x, y), b = off.at(x, y), c = restored.at(x, y);
  280 |     const effect = difference(a, b) > 32, repeatNoise = difference(a, c) > 32;
  281 |     if (inside('skin', x, y)) { if (effect) changed++; if (repeatNoise) noise++; }
  282 |     else {
  283 |       exteriorSamples++; if (effect) exteriorChanged++; if (repeatNoise) exteriorNoise++;
  284 |       if (inside('head', x, y)) { headSamples++; if (effect) headChanged++; if (repeatNoise) headNoise++;
  285 |         if (Math.min(...a) >= 240 && Math.min(...b) >= 240 && Math.min(...c) >= 240) whiteHead++; }
  286 |       if (inside('clothing', x, y)) { clothingSamples++; if (effect) clothingChanged++; if (repeatNoise) clothingNoise++; }
  287 |     }
  288 |     // Count only pixels which are white with this single uniform disabled.
  289 |     // Dark pixels present in both inputs (background, crease or face features)
  290 |     // cannot pass as a newly visible hand contour.
  291 |     if (inside('hand', x, y) && Math.min(...b) >= 240) {
  292 |       whiteHand++;
  293 |       if (Math.min(...a) >= 240 && Math.min(...c) >= 240) whiteInterior++;
  294 |       if (Math.max(...a) < 100 && Math.max(...c) < 100) {
  295 |         darkHand++; contour[y * on.width + x] = 1; if (inside('head', x, y)) cheekDark++;
  296 |       }
  297 |     }
  298 |   }
  299 |   let largestComponent = 0;
  300 |   for (let start = 0; start < contour.length; start++) {
  301 |     if (!contour[start]) continue; const queue = [start]; contour[start] = 0;
  302 |     for (let cursor = 0; cursor < queue.length; cursor++) {
  303 |       const index = queue[cursor], x = index % on.width, y = Math.floor(index / on.width);
  304 |       for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  305 |         const nx = x + dx, ny = y + dy, next = ny * on.width + nx;
  306 |         if (nx >= 0 && nx < on.width && ny >= 0 && ny < on.height && contour[next]) { contour[next] = 0; queue.push(next); }
  307 |       }
  308 |     } largestComponent = Math.max(largestComponent, queue.length);
  309 |   }
  310 |   const evidence = { width: on.width, height: on.height, pixelScale, changed, noise, exteriorSamples, exteriorChanged, exteriorNoise,
  311 |     headSamples, headChanged, headNoise, whiteHead, clothingSamples, clothingChanged, clothingNoise,
  312 |     whiteHand, darkHand, whiteInterior, cheekDark, largestComponent, projection: projection.projection, maskDilationPixels: projection.dilationPixels };
  313 |   metrics.push({ condition: 'pixel-evidence-' + pose.state.b3dAge + '-pose-' + pose.state.b3dRecView + '-' + view, pixels: evidence });
  314 |   expect(changed, 'patient contour exceeds repeat raster noise').toBeGreaterThan(Math.max(30 * areaScale, noise * 5));
  315 |   expect(whiteHand / areaScale, 'white patient hand pixels participate').toBeGreaterThan(100);
> 316 |   expect(darkHand / areaScale, 'patient hand has visible dark contour pixels').toBeGreaterThan(12);
      |                                                                                ^ Error: patient hand has visible dark contour pixels
  317 |   expect(largestComponent / areaScale, 'contour forms a connected feature').toBeGreaterThan(4);
  318 |   expect(whiteInterior / whiteHand, 'patient hands retain clear white interior surfaces').toBeGreaterThan(.45);
  319 |   expect(darkHand / whiteHand).toBeLessThan(.55);
  320 |   expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .01);
  321 |   expect(exteriorChanged, 'background and all surfaces outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  322 |   expect(headChanged, 'visible head pixels outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(5, headNoise * 3 + 2));
  323 |   expect(clothingChanged, 'clothing outside patient skin projections remains unchanged').toBeLessThanOrEqual(Math.max(5, clothingNoise * 3 + 2));
  324 |   if (view === 'head') {
  325 |     expect(headSamples / areaScale, 'visible head pixels participate in the comparison').toBeGreaterThan(100);
  326 |     expect(whiteHead / areaScale, 'the head remains a white contrast surface').toBeGreaterThan(50);
  327 |     expect(cheekDark / areaScale, 'a new hand contour separates the hand near the projected cheek').toBeGreaterThan(8);
  328 |   }
  329 |   return evidence;
  330 | }
  331 | async function pairedContours(page: Page, name: string, view: string) {
  332 |   const before = await probe(page); viewValid(before, view, true);
  333 |   const on = await photograph(page, name); let off: Buffer;
  334 |   try {
  335 |     expect(await page.evaluate(() => (window as any).__setPatientContour(0))).toBe(1);
  336 |     await settle(page); const disabled = await probe(page);
  337 |     expect(disabled.materials[0].strength).toBe(0); expect(disabled.camera).toEqual(before.camera);
  338 |     expect(disabled.state).toEqual(before.state); expect(resources(disabled)).toEqual(resources(before)); expect(geometry(disabled)).toEqual(geometry(before));
  339 |     expect(disabled.protectedParts).toEqual(before.protectedParts);
  340 |     expect(disabled.draw.calls, 'uniform changes add no draw calls').toBe(before.draw.calls); expect(disabled.draw.triangles).toBe(before.draw.triangles);
  341 |     expect(disabled.draw.geometries, 'uniform changes upload no new geometry').toBe(before.draw.geometries);
  342 |     expect(disabled.draw.programs, 'uniform changes compile no new programs').toBe(before.draw.programs);
  343 |     off = await photograph(page, name + '-contour-off');
  344 |   } finally { await page.evaluate(() => (window as any).__setPatientContour(1)); await settle(page); }
  345 |   const restored = await photograph(page), after = await probe(page); viewValid(after, view, true);
  346 |   expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state);
  347 |   expect(resources(after)).toEqual(resources(before)); expect(geometry(after)).toEqual(geometry(before));
  348 |   expect(after.protectedParts).toEqual(before.protectedParts); expect(after.draw.calls).toBe(before.draw.calls);
  349 |   expect(after.draw.programs, 'the same compiled material is reused').toBe(before.draw.programs);
  350 |   expect(after.draw.geometries).toBe(before.draw.geometries);
  351 |   const image = readPng(on);
  352 |   const projection = await page.evaluate(({ width, height, view }) => (window as any).__patientContrastMasks(width, height, view), { width: image.width, height: image.height, view });
  353 |   const pixels = pixelEvidence(on, off!, restored, after, view, projection);
  354 |   metrics.push({ condition: name, pixels, pose: after }); await captureStage(page, name); return after;
  355 | }
  356 | async function audit(page: Page) {
  357 |   await page.addScriptTag({ content: axe });
  358 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
  359 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  360 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  361 |   })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  362 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  363 |   expect(browserErrors.get(page)).toEqual([]);
  364 | }
  365 | async function release(page: Page) {
  366 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  367 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  368 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  369 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  370 | }
  371 | async function workflow(page: Page, age: string, width: number, keyboard: boolean) {
  372 |   await mount(page, age, width); const saved = preserved((await probe(page)).state);
  373 |   const prefix = age === 'infant' ? 'phone-infant' : age, standard: Record<string, any> = {};
  374 |   for (const pose of [5, 8]) {
  375 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  376 |     for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
  377 |       const drawn = await control(page, label, keyboard); viewValid(drawn, view, false); expect(preserved(drawn.state)).toEqual(saved);
  378 |       standard[pose + '-' + view] = drawn;
  379 |       if (pose === 5) await captureStage(page, prefix + '-standard-pose-' + pose + '-' + view);
  380 |     }
  381 |   }
  382 |   const originalCanvas = await page.locator('#wrap canvas').elementHandle();
  383 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  384 |   await expect.poll(async () => originalCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  385 |   for (const pose of [5, 8]) {
  386 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  387 |     for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
  388 |       const before = await control(page, label, keyboard); viewValid(before, view, true);
  389 |       expect(geometry(before)).toEqual(geometry(standard[pose + '-' + view])); expect(preserved(before.state)).toEqual(saved);
  390 |       expect(before.draw.calls, 'patient contour clone adds no calls compared with the same standard view').toBe(standard[pose + '-' + view].draw.calls);
  391 |       expect(before.draw.triangles).toBe(standard[pose + '-' + view].draw.triangles);
  392 |       const drawn = await pairedContours(page, prefix + '-contrast-pose-' + pose + '-' + view, view);
  393 |       expect(preserved(drawn.state)).toEqual(saved);
  394 |     }
  395 |   }
  396 |   if (keyboard) {
  397 |     const narrow = await control(page, 'Palm detail view', true), bufferIds = resources(narrow);
  398 |     await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  399 |     const wide = await probe(page); viewValid(wide, 'palm', true); expect(resources(wide)).toEqual(bufferIds); expect(geometry(wide)).toEqual(geometry(narrow));
  400 |     expect(preserved(wide.state)).toEqual(saved);
  401 |     await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  402 |     const restored = await probe(page); viewValid(restored, 'palm', true); expect(resources(restored)).toEqual(bufferIds); expect(preserved(restored.state)).toEqual(saved);
  403 |     for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
  404 |     await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Palm detail view', true); await audit(page);
  405 |     const forced = await probe(page); viewValid(forced, 'palm', true); expect(resources(forced)).toEqual(bufferIds); expect(preserved(forced.state)).toEqual(saved);
  406 |     await captureStage(page, prefix + '-contrast-forced-colors-palm'); await page.emulateMedia({ forcedColors: 'none' });
  407 |     // A real key handler rotates the camera after canvas-only readback has restored DOM visibility.
  408 |     await settle(page); const stage = page.locator('.fr-body3d-stage'); await stage.focus(); await expect(stage).toBeFocused();
  409 |     const beforeRotate = await probe(page); await page.keyboard.press('ArrowLeft'); await settle(page);
  410 |     const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(beforeRotate.camera.position);
  411 |     expect(resources(rotated)).toEqual(bufferIds); expect(preserved(rotated.state)).toEqual(saved);
  412 |     await control(page, 'Palm detail view', true);
  413 |   }
  414 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  415 |   await audit(page); await release(page);
  416 | }
```