# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-surface-clarity.spec.ts >> adult matte surfaces and compiled contrast contours reveal the stacked hands while preserving contact and camera controls
- Location: tests\e2e\firstresponse-surface-clarity.spec.ts:253:5

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not [0.2121326007966216, 0.8666968035718354, 0.8865087819841946]

```

# Test source

```ts
  169 | function pixelEvidence(onBuffer: Buffer, offBuffer: Buffer, restoredBuffer: Buffer, pose: any) {
  170 |   const on = readPng(onBuffer), off = readPng(offBuffer), restored = readPng(restoredBuffer);
  171 |   expect([on.width, on.height]).toEqual([off.width, off.height]); expect([on.width, on.height]).toEqual([restored.width, restored.height]);
  172 |   const pixelScale = on.width / pose.canvasSize[0], areaScale = pixelScale * pixelScale;
  173 |   function regions(parts: any[]) { return parts.map(part => ({
  174 |     left: Math.floor((part.min[0] + 1) * on.width / 2) - 2, right: Math.ceil((part.max[0] + 1) * on.width / 2) + 2,
  175 |     top: Math.floor((1 - part.max[1]) * on.height / 2) - 2, bottom: Math.ceil((1 - part.min[1]) * on.height / 2) + 2,
  176 |   })); }
  177 |   const skin = regions(pose.skinRegions), hand = regions(pose.surfaces.filter((part: any) => part.material === 'fr-rescuer-skin')), marks = regions(pose.markers);
  178 |   const inside = (list: ReturnType<typeof regions>, x: number, y: number) => list.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  179 |   const maxDifference = (a: number[], b: number[]) => Math.max(...a.map((channel, index) => Math.abs(channel - b[index])));
  180 |   let changed = 0, noise = 0, exteriorChanged = 0, exteriorNoise = 0, exteriorSamples = 0;
  181 |   let markerChanged = 0, markerNoise = 0, markerSamples = 0, whiteHand = 0, darkHand = 0;
  182 |   const contour = new Uint8Array(on.width * on.height);
  183 |   for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
  184 |     const a = on.at(x, y), b = off.at(x, y), c = restored.at(x, y);
  185 |     const effect = maxDifference(a, b) > 32, repeatNoise = maxDifference(a, c) > 32;
  186 |     if (inside(skin, x, y)) { if (effect) changed++; if (repeatNoise) noise++; }
  187 |     else {
  188 |       exteriorSamples++; if (effect) exteriorChanged++; if (repeatNoise) exteriorNoise++;
  189 |       if (inside(marks, x, y)) { markerSamples++; if (effect) markerChanged++; if (repeatNoise) markerNoise++; }
  190 |     }
  191 |     // White-to-dark pixels inside actual hand projections prove contour detail
  192 |     // against the hand surface, rather than counting the black background.
  193 |     if (inside(hand, x, y) && Math.min(...b) >= 240) {
  194 |       whiteHand++;
  195 |       if (Math.max(...a) < 100 && Math.max(...c) < 100) { darkHand++; contour[y * on.width + x] = 1; }
  196 |     }
  197 |   }
  198 |   let largestComponent = 0;
  199 |   for (let start = 0; start < contour.length; start++) {
  200 |     if (!contour[start]) continue;
  201 |     const queue = [start]; contour[start] = 0;
  202 |     for (let cursor = 0; cursor < queue.length; cursor++) {
  203 |       const index = queue[cursor], x = index % on.width, y = Math.floor(index / on.width);
  204 |       for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  205 |         const nx = x + dx, ny = y + dy, next = ny * on.width + nx;
  206 |         if (nx >= 0 && nx < on.width && ny >= 0 && ny < on.height && contour[next]) { contour[next] = 0; queue.push(next); }
  207 |       }
  208 |     }
  209 |     largestComponent = Math.max(largestComponent, queue.length);
  210 |   }
  211 |   expect(changed, 'rim effect exceeds same-input raster noise').toBeGreaterThan(Math.max(40 * areaScale, noise * 5));
  212 |   expect(whiteHand / areaScale).toBeGreaterThan(100);
  213 |   expect(darkHand / areaScale, 'visible internal dark hand contours').toBeGreaterThan(25);
  214 |   expect(largestComponent / areaScale, 'contour forms a connected feature').toBeGreaterThan(10);
  215 |   expect(darkHand / whiteHand, 'white hand surfaces remain visible').toBeLessThan(.55);
  216 |   expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .1);
  217 |   expect(exteriorChanged, 'background and patient remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  218 |   expect(markerChanged, 'resting and depth markers remain unchanged').toBeLessThanOrEqual(Math.max(5, markerNoise * 3 + 2));
  219 |   return { width: on.width, height: on.height, pixelScale, changed, noise, whiteHand, darkHand, largestComponent,
  220 |     exteriorSamples, exteriorChanged, exteriorNoise, markerSamples, markerChanged, markerNoise };
  221 | }
  222 | async function pairedContours(page: Page, name: string, count: number) {
  223 |   const before = await probe(page); valid(before, count, true);
  224 |   const on = await photograph(page, name);
  225 |   let off: Buffer;
  226 |   try {
  227 |     expect(await page.evaluate(() => (window as any).__setSurfaceContour(0))).toBe(1);
  228 |     await settle(page); off = await photograph(page, name + '-rim-off');
  229 |   } finally {
  230 |     await page.evaluate(() => (window as any).__setSurfaceContour(1)); await settle(page);
  231 |   }
  232 |   const restored = await photograph(page), after = await probe(page); valid(after, count, true);
  233 |   expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state); unchangedGeometry(before, after);
  234 |   const pixels = pixelEvidence(on, off!, restored, after);
  235 |   metrics.push({ condition: name, pixels, pose: after });
  236 |   return after;
  237 | }
  238 | async function audit(page: Page) {
  239 |   await page.addScriptTag({ content: axe });
  240 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
  241 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  242 |   })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  243 |   expect(violations).toEqual([]); expect(errors.get(page)).toEqual([]);
  244 |   expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  245 | }
  246 | async function release(page: Page) {
  247 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  248 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  249 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  250 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(errors.get(page)).toEqual([]);
  251 | }
  252 | 
  253 | test('adult matte surfaces and compiled contrast contours reveal the stacked hands while preserving contact and camera controls', async ({ page }) => {
  254 |   await mount(page, 'adult', 1280);
  255 |   const canvas = await page.locator('#wrap canvas').elementHandle(), saved = (await probe(page)).state;
  256 |   const standard: Record<string, any> = {};
  257 |   for (const [label, view] of [['Hand contact close-up', 'oblique'], ['Heel side view', 'side']] as const) {
  258 |     await control(page, label); standard[view] = await probe(page); valid(standard[view], 2, false);
  259 |     expect(standard[view].state).toEqual(saved); await photograph(page, 'adult-standard-' + view);
  260 |     metrics.push({ condition: 'adult-standard-' + view, pose: standard[view] });
  261 |   }
  262 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  263 |   await control(page, 'Hand contact close-up');
  264 |   const contrast = await pairedContours(page, 'adult-contrast-oblique', 2);
  265 |   unchangedGeometry(standard.oblique, contrast); expect(contrast.state).toEqual(saved);
  266 |   await control(page, 'Heel side view'); const side = await probe(page); valid(side, 2, true);
  267 |   unchangedGeometry(standard.side, side); await photograph(page, 'adult-contrast-side');
  268 |   await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft'); await settle(page);
> 269 |   const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(side.camera.position); expect(rotated.state).toEqual(saved);
      |                                                                          ^ Error: expect(received).not.toEqual(expected) // deep equality
  270 |   await control(page, 'Heel side view'); await control(page, 'Inspect released contact');
  271 |   const released = await probe(page); valid(released, 2, true); expect(released.camera).toEqual(side.camera);
  272 |   expect(released.marker[1]).toBeGreaterThan(side.marker[1]);
  273 |   expect(released.surfaces.map((part: any) => part.fingerprint)).toEqual(side.surfaces.map((part: any) => part.fingerprint));
  274 |   expect(released.state.b3dDepthInquiry).toEqual(saved.b3dDepthInquiry); expect(released.state.b3dDepthReference).toEqual(saved.b3dDepthReference);
  275 |   await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  276 |   await audit(page); await release(page);
  277 | });
  278 | 
  279 | test('320px child and infant hand surfaces retain visible contours through camera changes and renderer cleanup', async ({ page }) => {
  280 |   await mount(page, 'child', 320);
  281 |   const canvas = await page.locator('#wrap canvas').elementHandle(), saved = (await probe(page)).state;
  282 |   const standard: Record<string, any> = {};
  283 |   for (const [label, view] of [['Hand contact close-up', 'oblique'], ['Heel side view', 'side']] as const) {
  284 |     await control(page, label, true); standard[view] = await probe(page); valid(standard[view], 2, false);
  285 |     await photograph(page, 'phone-child-standard-' + view);
  286 |   }
  287 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  288 |   await control(page, 'Heel side view', true);
  289 |   const side = await pairedContours(page, 'phone-child-contrast-side', 2);
  290 |   expect(side.state).toEqual(saved); unchangedGeometry(standard.side, side);
  291 |   const sidePixels = (metrics.at(-1) as any).pixels;
  292 |   expect(sidePixels.markerSamples, 'visible reference pixels participate in the comparison').toBeGreaterThan(20);
  293 |   await control(page, 'Hand contact close-up', true); const oblique = await probe(page); valid(oblique, 2, true);
  294 |   unchangedGeometry(standard.oblique, oblique); expect(oblique.state).toEqual(saved); await photograph(page, 'phone-child-contrast-oblique');
  295 |   await page.setViewportSize({ width: 390, height: 840 }); await settle(page); await control(page, 'Heel side view', true);
  296 |   valid(await probe(page), 2, true); expect((await probe(page)).state).toEqual(saved);
  297 |   await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  298 |   await page.getByRole('button', { name: /^Infant —/ }).click(); await settle(page); await control(page, 'Heel side view', true);
  299 |   const infant = await probe(page); valid(infant, 1, true); await photograph(page, 'phone-infant-contrast-side');
  300 |   metrics.push({ condition: 'phone-infant-contrast-side', pose: infant });
  301 |   await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  302 |   await audit(page); await release(page);
  303 | });
  304 | 
```