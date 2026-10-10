# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-supporting-hand.spec.ts >> 320px infant supporting-hand inspection preserves keyboard cameras resize contrast and teardown
- Location: tests\e2e\firstresponse-supporting-hand.spec.ts:300:5

# Error details

```
Error: support camera needs no extra draws beyond the head view

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 51
Received:    66
```

# Test source

```ts
  149 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  150 |   for (const part of pose.all) expect(part.invalid, part.name).toBe(0);
  151 |   expect(pose.errors).toEqual([]);
  152 | }
  153 | function fitted(pose: any) {
  154 |   valid(pose); expect(pose.inspection.radius).toBeGreaterThan(0);
  155 |   for (const field of ['center', 'normal', 'forward']) { expect(pose.inspection[field]).toHaveLength(3); expect(pose.inspection[field].every(Number.isFinite)).toBe(true); }
  156 |   expect(pose.inspection.context).toHaveLength(5);
  157 |   for (const part of pose.parts) for (const axis of [0, 1]) {
  158 |     expect(part.min[axis], part.name + ' stays within the camera').toBeGreaterThan(-.995);
  159 |     expect(part.max[axis], part.name + ' stays within the camera').toBeLessThan(.995);
  160 |   }
  161 |   expect(pose.parts.filter((part: any) => /-(palm|wrist)$/.test(part.name))).toHaveLength(2);
  162 |   for (const point of pose.context) for (const axis of [0, 1]) expect(Math.abs(point.ndc[axis]), 'cheek context fits beside the hand').toBeLessThan(.995);
  163 |   expect(pose.context.filter((point: any) => point.firstHead).length, 'some actual cheek patch remains visible beside the supporting hand').toBeGreaterThan(0);
  164 | }
  165 | async function control(page: Page, name: string, keyboard = false) {
  166 |   const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  167 |   if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); } else await button.click();
  168 |   await settle(page); const after = await probe(page);
  169 |   expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before));
  170 |   expect(materials(after)).toEqual(materials(before)); expect(resources(after)).toEqual(resources(before));
  171 |   expect(after.meshCount).toBe(before.meshCount); expect(after.sceneNodeCount).toBe(before.sceneNodeCount);
  172 |   expect(after.draw.geometries).toBe(before.draw.geometries); expect(after.draw.programs).toBe(before.draw.programs); return after;
  173 | }
  174 | async function selectPose(page: Page, pose: number) {
  175 |   await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  176 | }
  177 | async function photograph(page: Page, name: string) {
  178 |   await settle(page); const before = await probe(page), box = await page.locator('.fr-body3d-stage').boundingBox(); expect(box).toBeTruthy();
  179 |   await page.screenshot({ path: report + '/' + name + '-stage.png', clip: box!, timeout: 60000 });
  180 |   const gl = await harness.glPixels(page, '#wrap'); expect(gl).toBeTruthy(); writeFileSync(report + '/' + name + '-gl.png', gl!.png);
  181 |   const pixels = readPng(gl!.png), source = await page.evaluate(({ width, height }) => (window as any).__supportRasterSamples(width, height), { width: pixels.width, height: pixels.height });
  182 |   const signal = (point: any) => {
  183 |     let value = 0;
  184 |     for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  185 |       const x = point.x + dx, y = point.y + dy;
  186 |       if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height) value = Math.max(value, ...pixels.at(x, y).map((channel: number, index: number) => Math.abs(channel - source.background[index])));
  187 |     } return value;
  188 |   };
  189 |   const handLit = source.hand.filter((point: any) => signal(point) > 32).length;
  190 |   const cheek = source.cheek.filter((point: any) => point.head && signal(point) > 32);
  191 |   const evidence = { width: pixels.width, height: pixels.height, footprint: footprint(before), handSourceSamples: source.hand.length,
  192 |     handLit, background: source.background, cheekSourceSamples: source.cheek, cheekLit: cheek.length, calls: before.draw.calls, triangles: before.draw.triangles };
  193 |   writeFileSync(report + '/' + name + '-evidence.json', JSON.stringify({ pose: before, evidence }, null, 2)); metrics.push({ name, evidence, pose: before });
  194 |   expect(source.hand.length, 'source rays intersect the real supporting hand').toBeGreaterThan(25);
  195 |   expect(handLit / source.hand.length, 'raw GPU image contains the ray-proven hand').toBeGreaterThan(.7);
  196 |   expect(cheek.length, 'raw GPU image contains visible cheek context').toBeGreaterThan(0);
  197 |   await settle(page); const after = await probe(page); expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state);
  198 |   expect(resources(after)).toEqual(resources(before)); return before;
  199 | }
  200 | async function audit(page: Page, name: string) {
  201 |   await page.addScriptTag({ content: axe });
  202 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
  203 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  204 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  205 |   })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  206 |   writeFileSync(report + '/' + name + '-axe.json', JSON.stringify(violations, null, 2));
  207 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  208 |   expect(browserErrors.get(page)).toEqual([]);
  209 | }
  210 | async function release(page: Page) {
  211 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  212 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  213 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  214 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  215 | }
  216 | async function baselineViews(page: Page, age: string, width: number) {
  217 |   const route = '**/stem_lab/stem_tool_firstresponse.js';
  218 |   await page.route(route, async request => request.fulfill({ status: 200, contentType: 'application/javascript', body: beforeSource }));
  219 |   await mount(page, age, width); const head: Record<number, any> = {};
  220 |   for (const pose of [4, 5, 8]) { await selectPose(page, pose); head[pose] = await control(page, 'Head close-up'); }
  221 |   await selectPose(page, 5); const palm = await control(page, 'Palm detail view');
  222 |   const summary = { head, palm }; writeFileSync(report + '/' + age + '-baseline-cameras.json', JSON.stringify(summary, null, 2));
  223 |   await release(page); await page.unroute(route); return summary;
  224 | }
  225 | async function workflow(page: Page, age: string, width: number, keyboard: boolean) {
  226 |   const baseline = await baselineViews(page, age, width), prefix = age === 'infant' ? 'phone-infant' : age;
  227 |   await mount(page, age, width, { b3dRec: completed.slice(0, 2), b3dRecView: 2 });
  228 |   await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeDisabled();
  229 |   await expect(page.getByRole('button', { name: 'Inspect support before turn', exact: true })).toBeDisabled();
  230 |   await expect(page.getByRole('button', { name: 'Inspect support after turn', exact: true })).toBeDisabled();
  231 |   await update(page, { b3dRec: completed.slice(0, 4), b3dRecView: 3 });
  232 |   await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeEnabled();
  233 |   await expect(page.getByRole('button', { name: 'Inspect support before turn', exact: true })).toBeEnabled();
  234 |   await expect(page.getByRole('button', { name: 'Inspect support after turn', exact: true })).toBeDisabled();
  235 |   await update(page, { b3dRec: completed, b3dRecView: 2 }); const saved = preserved((await probe(page)).state);
  236 |   const beforeTurn = page.getByRole('button', { name: 'Inspect support before turn', exact: true });
  237 |   if (keyboard) { await beforeTurn.focus(); await page.keyboard.press('Enter'); } else await beforeTurn.click(); await settle(page);
  238 |   await expect(beforeTurn).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('4');
  239 |   fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  240 |   const standard: Record<number, any> = {};
  241 |   for (const pose of [4, 5, 8]) {
  242 |     await selectPose(page, pose); fitted(await probe(page));
  243 |     const head = await control(page, 'Head close-up', keyboard); valid(head);
  244 |     expect(head.camera, 'existing Head close-up camera matches saved source exactly').toEqual(baseline.head[pose].camera);
  245 |     expect(geometry(head)).toEqual(geometry(baseline.head[pose])); expect(materials(head)).toEqual(materials(baseline.head[pose]));
  246 |     expect([head.meshCount, head.sceneNodeCount, head.draw.calls, head.draw.triangles]).toEqual([
  247 |       baseline.head[pose].meshCount, baseline.head[pose].sceneNodeCount, baseline.head[pose].draw.calls, baseline.head[pose].draw.triangles]);
  248 |     const support = await control(page, 'Supporting hand close-up', keyboard); fitted(support);
> 249 |     expect(support.draw.calls, 'support camera needs no extra draws beyond the head view').toBeLessThanOrEqual(head.draw.calls);
      |                                                                                            ^ Error: support camera needs no extra draws beyond the head view
  250 |     expect(support.draw.triangles).toBeLessThanOrEqual(head.draw.triangles);
  251 |     const ratio = footprint(support).area / footprint(head).area;
  252 |     metrics.push({ name: prefix + '-standard-pose-' + pose + '-enlargement', ratio, head: footprint(head), supporting: footprint(support) });
  253 |     expect(ratio, 'supporting-hand camera meaningfully enlarges the same hand').toBeGreaterThanOrEqual(1.5);
  254 |     if (width === 320) expect(footprint(support).width, 'supporting hand remains at least 60px wide on a phone').toBeGreaterThanOrEqual(60);
  255 |     expect(preserved(support.state)).toEqual(saved); standard[pose] = support; await photograph(page, prefix + '-standard-pose-' + pose + '-support');
  256 |   }
  257 |   await selectPose(page, 5); const palm = await control(page, 'Palm detail view', keyboard);
  258 |   expect(palm.camera, 'existing near-palm camera matches saved source exactly').toEqual(baseline.palm.camera);
  259 |   await control(page, 'Supporting hand close-up', keyboard);
  260 |   await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).check(); await settle(page); fitted(await probe(page));
  261 |   await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).uncheck(); await settle(page); fitted(await probe(page));
  262 |   const oldCanvas = await page.locator('#wrap canvas').elementHandle();
  263 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  264 |   await expect.poll(async () => oldCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  265 |   fitted(await probe(page));
  266 |   for (const pose of [4, 5, 8]) {
  267 |     await selectPose(page, pose); fitted(await probe(page)); const support = await control(page, 'Supporting hand close-up', keyboard);
  268 |     fitted(support); expect(geometry(support)).toEqual(geometry(standard[pose])); expect(preserved(support.state)).toEqual(saved);
  269 |     expect(support.draw.calls).toBe(standard[pose].draw.calls); expect(support.draw.triangles).toBe(standard[pose].draw.triangles);
  270 |     await photograph(page, prefix + '-contrast-pose-' + pose + '-support');
  271 |   }
  272 |   const afterTurn = page.getByRole('button', { name: 'Inspect support after turn', exact: true });
  273 |   if (keyboard) { await afterTurn.focus(); await page.keyboard.press('Space'); } else await afterTurn.click(); await settle(page);
  274 |   await expect(afterTurn).toHaveAttribute('aria-pressed', 'true'); await expect(beforeTurn).toHaveAttribute('aria-pressed', 'false');
  275 |   await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('5'); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  276 |   const observation = page.getByText('Check supporting-hand observation', { exact: true });
  277 |   await observation.click(); await expect(observation.locator('..')).toHaveAttribute('open', ''); expect(preserved((await probe(page)).state)).toEqual(saved);
  278 |   if (keyboard) {
  279 |     const narrow = await control(page, 'Supporting hand close-up', true), ids = resources(narrow);
  280 |     await page.setViewportSize({ width: 760, height: 840 }); await settle(page); const wide = await probe(page); fitted(wide);
  281 |     expect(resources(wide)).toEqual(ids); expect(geometry(wide)).toEqual(geometry(narrow)); expect(preserved(wide.state)).toEqual(saved);
  282 |     await page.setViewportSize({ width: 320, height: 840 }); await settle(page); const restored = await probe(page); fitted(restored);
  283 |     expect(resources(restored)).toEqual(ids); expect(restored.camera).toEqual(narrow.camera); expect(preserved(restored.state)).toEqual(saved);
  284 |     await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Supporting hand close-up', true); fitted(await probe(page));
  285 |     await photograph(page, prefix + '-forced-colors-support'); await audit(page, prefix + '-forced-colors'); await page.emulateMedia({ forcedColors: 'none' });
  286 |     const currentAge = age; await update(page, { b3dAge: 'child' }); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  287 |     await update(page, { b3dAge: currentAge }); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  288 |     const stage = page.locator('.fr-body3d-stage'); await stage.focus(); await expect(stage).toBeFocused();
  289 |     const initial = await probe(page); await page.keyboard.press('ArrowLeft'); await settle(page); const orbit = await probe(page);
  290 |     expect(orbit.camera.position).not.toEqual(initial.camera.position); expect(resources(orbit)).toEqual(resources(initial)); expect(preserved(orbit.state)).toEqual(saved);
  291 |     await control(page, 'Supporting hand close-up', true);
  292 |   }
  293 |   await selectPose(page, 2); await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeDisabled();
  294 |   await selectPose(page, 5); await control(page, 'Supporting hand close-up', keyboard); fitted(await probe(page));
  295 |   await audit(page, prefix + '-final'); await release(page);
  296 | }
  297 | for (const age of ['adult', 'child']) test(age + ' supporting-hand inspection enlarges contact and preserves poses and saved observations', async ({ page }) => {
  298 |   await workflow(page, age, 1280, false);
  299 | });
  300 | test('320px infant supporting-hand inspection preserves keyboard cameras resize contrast and teardown', async ({ page }) => {
  301 |   await workflow(page, 'infant', 320, true);
  302 | });
  303 | 
```