# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-patient-contrast.spec.ts >> child patient contrast contours clarify palms and cheek support without changing geometry or learning state
- Location: tests\e2e\firstresponse-patient-contrast.spec.ts:344:43

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 2006.81
Received:   0
```

# Test source

```ts
  152 |   const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  153 |   if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  154 |   else await button.click();
  155 |   await settle(page); const after = await probe(page);
  156 |   expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(resources(after)).toEqual(resources(before));
  157 |   return after;
  158 | }
  159 | function framed(parts: any[]) {
  160 |   expect(parts.length).toBeGreaterThan(0);
  161 |   for (const part of parts) for (const axis of [0, 1]) {
  162 |     expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995);
  163 |   }
  164 | }
  165 | function valid(pose: any, contrast: boolean) {
  166 |   expect(pose.parts).toHaveLength(36); expect(pose.isolated).toBe(true);
  167 |   for (const part of pose.parts.concat(pose.head)) { expect(part.invalid, part.name).toBe(0); expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/); }
  168 |   if (contrast) {
  169 |     expect(pose.skin).toHaveLength(20); expect(pose.materials).toHaveLength(1);
  170 |     expect(pose.materials[0]).toMatchObject({ name: 'fr-patient-arm-skin', type: 'MeshBasicMaterial', color: [1, 1, 1], strength: 1,
  171 |       depthTest: true, depthWrite: true, transparent: false, opacity: 1 });
  172 |     for (const part of pose.skin) expect(part.material).toMatchObject({ name: 'fr-patient-arm-skin', patientContour: 1, rescuerContour: null });
  173 |   } else {
  174 |     expect(pose.skin).toEqual([]); expect(pose.materials).toEqual([]);
  175 |     for (const part of pose.parts) expect(part.material.patientContour).toBeNull();
  176 |   }
  177 |   for (const part of pose.protectedParts) expect(part.material.patientContour, part.name + ' retains its original material').toBeNull();
  178 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.calls).toBeGreaterThan(0);
  179 |   expect(pose.draw.triangles).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  180 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
  181 | }
  182 | function viewValid(pose: any, view: string, contrast: boolean) {
  183 |   valid(pose, contrast);
  184 |   if (view === 'palm') { framed(pose.hands.left); expect(pose.normalDot).toBeGreaterThan(.92); }
  185 |   else framed(pose.hands.right.filter((part: any) => /-(palm|wrist)$/.test(part.name)));
  186 | }
  187 | async function photograph(page: Page, name?: string) {
  188 |   const shot = await harness.glPixels(page, '#wrap'); expect(shot).toBeTruthy();
  189 |   if (name) writeFileSync(report + '/' + name + '.png', shot!.png); return shot!.png;
  190 | }
  191 | async function captureStage(page: Page, name: string) {
  192 |   await settle(page); const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  193 |   await page.screenshot({ path: report + '/' + name + '-stage.png', clip: clip!, timeout: 60000 });
  194 | }
  195 | function pixelEvidence(onBuffer: Buffer, offBuffer: Buffer, restoredBuffer: Buffer, pose: any, view: string) {
  196 |   const on = readPng(onBuffer), off = readPng(offBuffer), restored = readPng(restoredBuffer);
  197 |   expect([on.width, on.height]).toEqual([off.width, off.height]); expect([on.width, on.height]).toEqual([restored.width, restored.height]);
  198 |   const pixelScale = on.width / pose.canvasSize[0], areaScale = pixelScale * pixelScale;
  199 |   const regions = (parts: any[]) => parts.map(part => ({ left: Math.floor((part.min[0] + 1) * on.width / 2) - 2,
  200 |     right: Math.ceil((part.max[0] + 1) * on.width / 2) + 2, top: Math.floor((1 - part.max[1]) * on.height / 2) - 2,
  201 |     bottom: Math.ceil((1 - part.min[1]) * on.height / 2) + 2 }));
  202 |   const skin = regions(pose.skin), hand = regions(pose.hands[view === 'palm' ? 'left' : 'right'].filter((p: any) => p.material.name === 'fr-patient-arm-skin'));
  203 |   const head = regions(pose.head), clothing = regions(pose.clothing);
  204 |   const inside = (list: ReturnType<typeof regions>, x: number, y: number) => list.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  205 |   const difference = (a: number[], b: number[]) => Math.max(...a.map((channel, i) => Math.abs(channel - b[i])));
  206 |   let changed = 0, noise = 0, exteriorSamples = 0, exteriorChanged = 0, exteriorNoise = 0;
  207 |   let headSamples = 0, headChanged = 0, headNoise = 0, whiteHead = 0, clothingSamples = 0, clothingChanged = 0, clothingNoise = 0;
  208 |   let whiteHand = 0, darkHand = 0, whiteInterior = 0, cheekDark = 0;
  209 |   const contour = new Uint8Array(on.width * on.height);
  210 |   for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
  211 |     const a = on.at(x, y), b = off.at(x, y), c = restored.at(x, y);
  212 |     const effect = difference(a, b) > 32, repeatNoise = difference(a, c) > 32;
  213 |     if (inside(skin, x, y)) { if (effect) changed++; if (repeatNoise) noise++; }
  214 |     else {
  215 |       exteriorSamples++; if (effect) exteriorChanged++; if (repeatNoise) exteriorNoise++;
  216 |       if (inside(head, x, y)) { headSamples++; if (effect) headChanged++; if (repeatNoise) headNoise++;
  217 |         if (Math.min(...a) >= 240 && Math.min(...b) >= 240 && Math.min(...c) >= 240) whiteHead++; }
  218 |       if (inside(clothing, x, y)) { clothingSamples++; if (effect) clothingChanged++; if (repeatNoise) clothingNoise++; }
  219 |     }
  220 |     // Count only pixels which are white with this single uniform disabled.
  221 |     // Dark pixels present in both inputs (background, crease or face features)
  222 |     // cannot pass as a newly visible hand contour.
  223 |     if (inside(hand, x, y) && Math.min(...b) >= 240) {
  224 |       whiteHand++;
  225 |       if (Math.min(...a) >= 240 && Math.min(...c) >= 240) whiteInterior++;
  226 |       if (Math.max(...a) < 100 && Math.max(...c) < 100) {
  227 |         darkHand++; contour[y * on.width + x] = 1; if (inside(head, x, y)) cheekDark++;
  228 |       }
  229 |     }
  230 |   }
  231 |   let largestComponent = 0;
  232 |   for (let start = 0; start < contour.length; start++) {
  233 |     if (!contour[start]) continue; const queue = [start]; contour[start] = 0;
  234 |     for (let cursor = 0; cursor < queue.length; cursor++) {
  235 |       const index = queue[cursor], x = index % on.width, y = Math.floor(index / on.width);
  236 |       for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  237 |         const nx = x + dx, ny = y + dy, next = ny * on.width + nx;
  238 |         if (nx >= 0 && nx < on.width && ny >= 0 && ny < on.height && contour[next]) { contour[next] = 0; queue.push(next); }
  239 |       }
  240 |     } largestComponent = Math.max(largestComponent, queue.length);
  241 |   }
  242 |   const evidence = { width: on.width, height: on.height, pixelScale, changed, noise, exteriorSamples, exteriorChanged, exteriorNoise,
  243 |     headSamples, headChanged, headNoise, whiteHead, clothingSamples, clothingChanged, clothingNoise,
  244 |     whiteHand, darkHand, whiteInterior, cheekDark, largestComponent };
  245 |   metrics.push({ condition: 'pixel-evidence-' + pose.state.b3dAge + '-pose-' + pose.state.b3dRecView + '-' + view, pixels: evidence });
  246 |   expect(changed, 'patient contour exceeds repeat raster noise').toBeGreaterThan(Math.max(30 * areaScale, noise * 5));
  247 |   expect(whiteHand / areaScale, 'white patient hand pixels participate').toBeGreaterThan(100);
  248 |   expect(darkHand / areaScale, 'patient hand has visible dark contour pixels').toBeGreaterThan(12);
  249 |   expect(largestComponent / areaScale, 'contour forms a connected feature').toBeGreaterThan(4);
  250 |   expect(whiteInterior / whiteHand, 'patient hands retain clear white interior surfaces').toBeGreaterThan(.45);
  251 |   expect(darkHand / whiteHand).toBeLessThan(.55);
> 252 |   expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .01);
      |                           ^ Error: expect(received).toBeGreaterThan(expected)
  253 |   expect(exteriorChanged, 'background and all surfaces outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  254 |   expect(headChanged, 'visible head pixels outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(5, headNoise * 3 + 2));
  255 |   expect(clothingChanged, 'clothing outside patient skin projections remains unchanged').toBeLessThanOrEqual(Math.max(5, clothingNoise * 3 + 2));
  256 |   if (view === 'head') {
  257 |     expect(headSamples / areaScale, 'visible head pixels participate in the comparison').toBeGreaterThan(100);
  258 |     expect(whiteHead / areaScale, 'the head remains a white contrast surface').toBeGreaterThan(50);
  259 |     expect(cheekDark / areaScale, 'a new hand contour separates the hand near the projected cheek').toBeGreaterThan(8);
  260 |   }
  261 |   return evidence;
  262 | }
  263 | async function pairedContours(page: Page, name: string, view: string) {
  264 |   const before = await probe(page); viewValid(before, view, true);
  265 |   const on = await photograph(page, name); let off: Buffer;
  266 |   try {
  267 |     expect(await page.evaluate(() => (window as any).__setPatientContour(0))).toBe(1);
  268 |     await settle(page); const disabled = await probe(page);
  269 |     expect(disabled.materials[0].strength).toBe(0); expect(disabled.camera).toEqual(before.camera);
  270 |     expect(disabled.state).toEqual(before.state); expect(resources(disabled)).toEqual(resources(before)); expect(geometry(disabled)).toEqual(geometry(before));
  271 |     expect(disabled.protectedParts).toEqual(before.protectedParts);
  272 |     expect(disabled.draw.calls, 'uniform changes add no draw calls').toBe(before.draw.calls); expect(disabled.draw.triangles).toBe(before.draw.triangles);
  273 |     off = await photograph(page, name + '-contour-off');
  274 |   } finally { await page.evaluate(() => (window as any).__setPatientContour(1)); await settle(page); }
  275 |   const restored = await photograph(page), after = await probe(page); viewValid(after, view, true);
  276 |   expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state);
  277 |   expect(resources(after)).toEqual(resources(before)); expect(geometry(after)).toEqual(geometry(before));
  278 |   expect(after.protectedParts).toEqual(before.protectedParts); expect(after.draw.calls).toBe(before.draw.calls);
  279 |   expect(after.draw.programs, 'the same compiled material is reused').toBe(before.draw.programs);
  280 |   const pixels = pixelEvidence(on, off!, restored, after, view);
  281 |   metrics.push({ condition: name, pixels, pose: after }); await captureStage(page, name); return after;
  282 | }
  283 | async function audit(page: Page) {
  284 |   await page.addScriptTag({ content: axe });
  285 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
  286 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  287 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  288 |   })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  289 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  290 |   expect(browserErrors.get(page)).toEqual([]);
  291 | }
  292 | async function release(page: Page) {
  293 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  294 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  295 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  296 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  297 | }
  298 | async function workflow(page: Page, age: string, width: number, keyboard: boolean) {
  299 |   await mount(page, age, width); const saved = preserved((await probe(page)).state);
  300 |   const prefix = age === 'infant' ? 'phone-infant' : age, standard: Record<string, any> = {};
  301 |   for (const pose of [5, 8]) {
  302 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  303 |     for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
  304 |       const drawn = await control(page, label, keyboard); viewValid(drawn, view, false); expect(preserved(drawn.state)).toEqual(saved);
  305 |       standard[pose + '-' + view] = drawn;
  306 |       if (pose === 5) await captureStage(page, prefix + '-standard-pose-' + pose + '-' + view);
  307 |     }
  308 |   }
  309 |   const originalCanvas = await page.locator('#wrap canvas').elementHandle();
  310 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  311 |   await expect.poll(async () => originalCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  312 |   for (const pose of [5, 8]) {
  313 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  314 |     for (const [label, view] of [['Palm detail view', 'palm'], ['Head close-up', 'head']] as const) {
  315 |       const before = await control(page, label, keyboard); viewValid(before, view, true);
  316 |       expect(geometry(before)).toEqual(geometry(standard[pose + '-' + view])); expect(preserved(before.state)).toEqual(saved);
  317 |       expect(before.draw.calls, 'patient contour clone adds no calls compared with the same standard view').toBe(standard[pose + '-' + view].draw.calls);
  318 |       expect(before.draw.triangles).toBe(standard[pose + '-' + view].draw.triangles);
  319 |       const drawn = await pairedContours(page, prefix + '-contrast-pose-' + pose + '-' + view, view);
  320 |       expect(preserved(drawn.state)).toEqual(saved);
  321 |     }
  322 |   }
  323 |   if (keyboard) {
  324 |     const narrow = await control(page, 'Palm detail view', true), bufferIds = resources(narrow);
  325 |     await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  326 |     const wide = await probe(page); viewValid(wide, 'palm', true); expect(resources(wide)).toEqual(bufferIds); expect(geometry(wide)).toEqual(geometry(narrow));
  327 |     expect(preserved(wide.state)).toEqual(saved);
  328 |     await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  329 |     const restored = await probe(page); viewValid(restored, 'palm', true); expect(resources(restored)).toEqual(bufferIds); expect(preserved(restored.state)).toEqual(saved);
  330 |     for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
  331 |     await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Palm detail view', true); await audit(page);
  332 |     const forced = await probe(page); viewValid(forced, 'palm', true); expect(resources(forced)).toEqual(bufferIds); expect(preserved(forced.state)).toEqual(saved);
  333 |     await captureStage(page, prefix + '-contrast-forced-colors-palm'); await page.emulateMedia({ forcedColors: 'none' });
  334 |     // A real key handler rotates the camera after canvas-only readback has restored DOM visibility.
  335 |     await settle(page); const stage = page.locator('.fr-body3d-stage'); await stage.focus(); await expect(stage).toBeFocused();
  336 |     const beforeRotate = await probe(page); await page.keyboard.press('ArrowLeft'); await settle(page);
  337 |     const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(beforeRotate.camera.position);
  338 |     expect(resources(rotated)).toEqual(bufferIds); expect(preserved(rotated.state)).toEqual(saved);
  339 |     await control(page, 'Palm detail view', true);
  340 |   }
  341 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  342 |   await audit(page); await release(page);
  343 | }
  344 | for (const age of ['adult', 'child']) test(age + ' patient contrast contours clarify palms and cheek support without changing geometry or learning state', async ({ page }) => {
  345 |   await workflow(page, age, 1280, false);
  346 | });
  347 | test('320px infant patient contours remain readable through keyboard cameras resize forced colors and renderer cleanup', async ({ page }) => {
  348 |   await workflow(page, 'infant', 320, true);
  349 | });
  350 | 
```