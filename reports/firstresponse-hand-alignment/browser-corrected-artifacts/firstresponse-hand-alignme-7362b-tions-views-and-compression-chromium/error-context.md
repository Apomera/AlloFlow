# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-hand-alignment.spec.ts >> stacked hands align naturally and stay supported through age options, views and compression
- Location: tests\e2e\firstresponse-hand-alignment.spec.ts:271:5

# Error details

```
Test timeout of 420000ms exceeded.
```

```
Error: locator.check: Target page, context or browser has been closed
```

# Test source

```ts
  182 |   expect(pose.hands).toEqual(count === 2 ? ['lower', 'upper'] : ['lower']);
  183 |   expect(pose.directions).toHaveLength(count);
  184 |   expect(pose.handSurfaces).toHaveLength(count * 13);
  185 |   expect(new Set(pose.handSurfaces.map((part: any) => part.name)).size).toBe(count * 13);
  186 |   expect(pose.lowerContactGap, 'real torso below the lower heel').not.toBeNull();
  187 |   expect(Math.abs(pose.lowerContactGap), 'lower heel on the actual moving chest').toBeLessThan(.00001);
  188 |   for (const direction of pose.directions) {
  189 |     expect(direction.fingerTips).toHaveLength(4);
  190 |     expect(direction.fingerTips.flat().concat(direction.thumbTip).every(Number.isFinite), direction.id + ' digit tips').toBe(true);
  191 |     expect(direction.elbowGap, direction.id + ' joined elbow').toBeLessThan(.000001);
  192 |     expect(direction.straightness, direction.id + ' straight arm axis').toBeGreaterThan(.99999);
  193 |     expect(direction.uprightness, direction.id + ' upright arm').toBeGreaterThan(.90);
  194 |   }
  195 |   if (count === 2) {
  196 |     const [lower, upper] = pose.directions;
  197 |     expect(dot(lower.forward, upper.forward), 'stacked fingers face the same way').toBeGreaterThan(.85);
  198 |     expect(dot(lower.thumb, upper.thumb), 'opposite anatomical thumb sides').toBeLessThan(-.85);
  199 |     expect(dot(lower.wristSide, upper.wristSide), 'separate wrists face the same rescuer side').toBeGreaterThan(0);
  200 |     for (const hand of [lower, upper]) {
  201 |       expect(-dot(hand.wristSide, hand.forward), hand.id + ' wrist remains behind its fingers').toBeGreaterThan(.75);
  202 |     }
  203 |     expect(distance(lower.shoulder, upper.shoulder), 'arms separate above the stacked wrists').toBeGreaterThan(distance(lower.wrist, upper.wrist) + .06 * pose.handScale);
  204 |     expect(pose.upperSupport.samples).toBeGreaterThan(4);
  205 |     expect(pose.upperSupport.minimumGap / pose.handScale, 'upper heel supported by the lower hand').toBeLessThan(.004);
  206 |     expect(pose.upperSupport.minimumGap / pose.handScale, 'upper heel does not sink into the lower hand').toBeGreaterThan(-.002);
  207 |   }
  208 |   for (const part of [...pose.handSurfaces, ...pose.armSurfaces]) {
  209 |     expect(part.vertices, part.name).toBeGreaterThan(0); expect(part.nonFinite, part.name).toBe(0); expect(part.badNormals, part.name).toBe(0);
  210 |     expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  211 |   }
  212 |   for (const part of [...pose.handSurfaces, ...(armsVisible ? pose.armSurfaces : [])]) {
  213 |     expect(part.min[0], part.name).toBeGreaterThan(-.99); expect(part.max[0], part.name).toBeLessThan(.99);
  214 |     expect(part.min[1], part.name).toBeGreaterThan(-.99); expect(part.max[1], part.name).toBeLessThan(.99);
  215 |     expect(part.min[2], part.name).toBeGreaterThan(-1); expect(part.max[2], part.name).toBeLessThan(1);
  216 |     expect(part.minimumCameraDepth, part.name).toBeGreaterThan(pose.camera.near);
  217 |   }
  218 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0);
  219 |   expect(pose.draw.sequence).toBeGreaterThanOrEqual(2); expect(pose.errors).toEqual([]);
  220 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  221 | }
  222 | function compression(released: any, peak: any) {
  223 |   const drop = peak.marker[1] - released.marker[1]; expect(drop).toBeLessThan(-.005);
  224 |   expect(peak.camera).toEqual(released.camera);
  225 |   for (const collection of ['handSurfaces', 'armSurfaces']) {
  226 |     for (let i = 0; i < released[collection].length; i++) {
  227 |       const before = released[collection][i], after = peak[collection][i];
  228 |       expect(after.name).toBe(before.name); expect(after.fingerprint, after.name).toBe(before.fingerprint);
  229 |       for (const bound of ['worldMin', 'worldMax']) {
  230 |         expect(after[bound][0], after.name).toBeCloseTo(before[bound][0], 6);
  231 |         expect(after[bound][2], after.name).toBeCloseTo(before[bound][2], 6);
  232 |         expect(after[bound][1] - before[bound][1], after.name).toBeCloseTo(drop, 6);
  233 |       }
  234 |     }
  235 |   }
  236 | }
  237 | function retained(before: any, after: any) {
  238 |   for (const key of ['b3dDepthInquiry', 'b3dDepthReference', 'b3dPlaced', 'b3dRec']) expect(after[key], key).toEqual(before[key]);
  239 |   for (const key of ['depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(after.b3dDepthLab[key], key).toBe(before.b3dDepthLab[key]);
  240 | }
  241 | function record(condition: string, pose: any) { const { state, ...geometry } = pose; metrics.push({ condition, ...geometry }); }
  242 | async function capture(page: Page, name: string) {
  243 |   const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  244 |   await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
  245 | }
  246 | async function audit(page: Page) {
  247 |   await page.addScriptTag({ content: axe });
  248 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
  249 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  250 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  251 |   })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  252 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  253 |   expect(browserErrors.get(page)).toEqual([]); expect((await probe(page)).errors).toEqual([]);
  254 | }
  255 | async function release(page: Page) {
  256 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  257 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  258 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  259 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  260 | }
  261 | async function inspectPair(page: Page, condition: string, label: string, count: number, screenshot?: string) {
  262 |   await control(page, label); await control(page, 'Show release');
  263 |   const rest = await probe(page); aligned(rest, count, label !== 'Hand contact close-up');
  264 |   await control(page, 'Show compression');
  265 |   const peak = await probe(page); aligned(peak, count, label !== 'Hand contact close-up'); compression(rest, peak);
  266 |   record(condition + '-release', rest); record(condition + '-compression', peak);
  267 |   if (screenshot) await capture(page, screenshot);
  268 |   return peak;
  269 | }
  270 | 
  271 | test('stacked hands align naturally and stay supported through age options, views and compression', async ({ page }) => {
  272 |   await mount(page);
  273 |   const initialCanvas = await page.locator('#wrap canvas').elementHandle();
  274 |   for (const [label, view] of [['Hand contact close-up', 'contact'], ['Hands + arms', 'arms'],
  275 |     ['Overhead view', 'overhead'], ['Side view', 'side']] as const) {
  276 |     await inspectPair(page, 'adult-' + view, label, 2, view === 'side' ? undefined : 'adult-' + view);
  277 |   }
  278 |   await page.getByRole('button', { name: /^Child —/ }).click(); await settle(page);
  279 |   await page.getByRole('radio', { name: 'One hand', exact: true }).check(); await settle(page);
  280 |   await inspectPair(page, 'child-one-contact', 'Hand contact close-up', 1);
  281 |   const one = await probe(page);
> 282 |   await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
      |                                                                             ^ Error: locator.check: Target page, context or browser has been closed
  283 |   const two = await probe(page); aligned(two, 2);
  284 |   expect(two.camera.position, 'active close-up refits to the added hand').not.toEqual(one.camera.position);
  285 |   await inspectPair(page, 'child-two-contact', 'Hand contact close-up', 2, 'child-two-contact');
  286 |   await inspectPair(page, 'child-two-arms', 'Hands + arms', 2);
  287 |   await page.getByRole('button', { name: /^Infant —/ }).click(); await settle(page);
  288 |   await inspectPair(page, 'infant-contact', 'Hand contact close-up', 1, 'infant-contact');
  289 |   await inspectPair(page, 'infant-arms', 'Hands + arms', 1);
  290 |   expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  291 |   await audit(page); await release(page);
  292 | });
  293 | 
  294 | test('320px hand inspection keeps graph learning state, keyboard access, contrast and renderer cleanup', async ({ page }) => {
  295 |   await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: {
  296 |     age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
  297 |     b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
  298 |     b3dDepthInquiry: { signature: 'retained-hand-alignment-inquiry', peak: 'same', explanation: 'Compare full release.' } });
  299 |   const initialCanvas = await page.locator('#wrap canvas').elementHandle(), initial = await probe(page);
  300 |   await control(page, 'Hand contact close-up', true);
  301 |   const rest = await probe(page); aligned(rest, 2); expect(rest.state).toEqual(initial.state);
  302 |   await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft'); await settle(page);
  303 |   const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(rest.camera.position); expect(rotated.state).toEqual(initial.state);
  304 |   await control(page, 'Hand contact close-up', true);
  305 |   const graph = page.getByRole('slider', { name: 'Inspect cycle on graph', exact: true });
  306 |   await graph.focus(); await page.keyboard.press('Home');
  307 |   for (let i = 0; i < 5; i++) await page.keyboard.press('PageUp');
  308 |   await expect(graph).toHaveAttribute('aria-valuenow', '50'); await expect(page.locator('#fr-depth-phase')).toHaveValue('50');
  309 |   await settle(page);
  310 |   const peak = await probe(page); aligned(peak, 2); compression(rest, peak); retained(initial.state, peak.state);
  311 |   expect(peak.state.b3dDepthLab.phase).toBe(50); record('phone-contact', peak); await capture(page, 'phone-contact'); await audit(page);
  312 |   const inspectedState = peak.state;
  313 |   await control(page, 'Hands + arms', true); aligned(await probe(page), 2, true);
  314 |   await control(page, 'Side view', true); aligned(await probe(page), 2, true);
  315 |   expect((await probe(page)).state).toEqual(inspectedState);
  316 |   await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  317 |   await control(page, 'Hand contact close-up', true); aligned(await probe(page), 2); await audit(page);
  318 |   await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Hand contact close-up', true);
  319 |   aligned(await probe(page), 2); await audit(page); expect((await probe(page)).state).toEqual(inspectedState);
  320 |   expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  321 |   await page.emulateMedia({ forcedColors: 'none' });
  322 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  323 |   await settle(page); await control(page, 'Hand contact close-up', true);
  324 |   const contrast = await probe(page); aligned(contrast, 2); expect(contrast.state).toEqual(inspectedState);
  325 |   expect([...contrast.handSurfaces, ...contrast.armSurfaces].every((part: any) => part.flat)).toBe(true);
  326 |   expect(contrast.handSurfaces.map((part: any) => part.fingerprint)).toEqual(peak.handSurfaces.map((part: any) => part.fingerprint));
  327 |   record('phone-contact-app-contrast', contrast); await capture(page, 'phone-contact-app-contrast'); await audit(page);
  328 |   await expect.poll(async () => initialCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  329 |   await release(page);
  330 |   expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(inspectedState);
  331 | });
  332 | 
```