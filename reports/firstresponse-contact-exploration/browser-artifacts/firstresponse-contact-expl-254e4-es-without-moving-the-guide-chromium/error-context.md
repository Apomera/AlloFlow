# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-contact-exploration.spec.ts >> heel side inspection and split resting marks explain contact across ages without moving the guide
- Location: tests\e2e\firstresponse-contact-exploration.spec.ts:185:5

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: -0.021481670561334577
Received: -0.02696560377053701

Expected precision:    7
Expected difference: < 0.00000005
Received difference:   0.005483933209202433
```

# Test source

```ts
  53  |         hand.traverse(function (mesh) {
  54  |           if (mesh.isMesh && visible(mesh) && /^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name)) surfaces.push(bounds(mesh));
  55  |         });
  56  |       });
  57  |       var rest = scene.getObjectByName('fr-depth-resting-line'), sections = [];
  58  |       rest.traverse(function (mesh) { if (mesh.isMesh && visible(mesh)) sections.push(bounds(mesh)); });
  59  |       sections.sort(function (a,b) { return a.worldMin[0]-b.worldMin[0]; });
  60  |       var heel = scene.getObjectByName('fr-rescuer-lower-heel'), centre = heel.getWorldPosition(new THREE.Vector3());
  61  |       var heelBox = new THREE.Box3().setFromObject(heel);
  62  |       var clearance = new THREE.Box3().setFromObject(scene.getObjectByName('fr-manikin-torso'));
  63  |       clearance.union(new THREE.Box3().setFromObject(scene.getObjectByName('fr-depth-hands')));
  64  |       var hit = new THREE.Raycaster(new THREE.Vector3(centre.x,centre.y+2,centre.z),new THREE.Vector3(0,-1,0))
  65  |         .intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
  66  |       var target = scene.getObjectByName('fr-hand-contact-bounds'), targetBox = new THREE.Box3().setFromObject(target);
  67  |       return {
  68  |         hands:hands, surfaces:surfaces, sections:sections, restY:rest.getWorldPosition(new THREE.Vector3()).y,
  69  |         modelScale:scene.getObjectByName('fr-training-manikin').getWorldScale(new THREE.Vector3()).x,
  70  |         handScale:heel.getWorldScale(new THREE.Vector3()).x/.085,
  71  |         clearance:{ minX:clearance.min.x, maxX:clearance.max.x },
  72  |         heelMin:heelBox.min.toArray(), heelMax:heelBox.max.toArray(), contactGap:hit ? heelBox.min.y-hit.point.y : null,
  73  |         target:{ min:targetBox.min.toArray(), max:targetBox.max.toArray() },
  74  |         marker:scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
  75  |         camera:{ position:camera.getWorldPosition(new THREE.Vector3()).toArray(), quaternion:camera.quaternion.toArray(),
  76  |           direction:camera.getWorldDirection(new THREE.Vector3()).toArray(), projection:camera.projectionMatrix.elements.slice(), aspect:camera.aspect },
  77  |         canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
  78  |         draw:{ id:record.id, draws:record.draws, renders:record.renders, sequence:drawn.sequence, createdBy:record.createdBy },
  79  |         state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors:window.__events.errors.slice()
  80  |       };
  81  |     };`,
  82  | });
  83  | 
  84  | test.describe.configure({ mode: 'default', retries: 0, timeout: 420000 });
  85  | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  86  | test.afterAll(async () => { writeFileSync(report + '/contact-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
  87  | test.beforeEach(async ({ page }) => {
  88  |   const errors: string[] = []; browserErrors.set(page, errors);
  89  |   page.on('pageerror', error => errors.push('page: ' + error.message));
  90  |   page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  91  | });
  92  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  93  | 
  94  | async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  95  |   await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  96  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  97  |   await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth',
  98  |     b3dPlaced: 'correct', b3dRec: ['check', 'arm', 'hand'], ...extra } });
  99  |   await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  100 |   await settle(page);
  101 | }
  102 | async function settle(page: Page) {
  103 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  104 |   await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  105 |   const previous = await page.evaluate(() => {
  106 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  107 |     return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__contactDraws.get(canvas)?.sequence || 0 };
  108 |   });
  109 |   await page.waitForFunction(previous => {
  110 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  111 |     const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__contactDraws.get(canvas);
  112 |     return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  113 |   }, previous);
  114 | }
  115 | async function probe(page: Page): Promise<any> {
  116 |   const value = await page.waitForFunction(() => (window as any).__contactExploration());
  117 |   try { return await value.jsonValue(); } finally { await value.dispose(); }
  118 | }
  119 | async function control(page: Page, name: string, keyboard = false) {
  120 |   const button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  121 |   if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  122 |   await settle(page);
  123 | }
  124 | function valid(pose: any, handCount: number) {
  125 |   expect(pose.hands).toEqual(handCount === 2 ? ['lower', 'upper'] : ['lower']);
  126 |   expect(pose.surfaces).toHaveLength(handCount * 13);
  127 |   for (const surface of pose.surfaces) {
  128 |     expect(surface.vertices, surface.name).toBeGreaterThan(0); expect(surface.invalid, surface.name).toBe(0);
  129 |     for (const axis of [0, 1]) {
  130 |       expect(surface.min[axis], surface.name).toBeGreaterThan(-.99); expect(surface.max[axis], surface.name).toBeLessThan(.99);
  131 |     }
  132 |     expect(surface.min[2], surface.name).toBeGreaterThan(-1); expect(surface.max[2], surface.name).toBeLessThan(1);
  133 |   }
  134 |   expect(pose.contactGap).not.toBeNull(); expect(Math.abs(pose.contactGap)).toBeLessThan(.00001);
  135 |   expect(pose.sections).toHaveLength(2);
  136 |   const [left, right] = pose.sections;
  137 |   expect([left.name, right.name]).toEqual(['fr-depth-resting-left', 'fr-depth-resting-right']);
  138 |   expect(left.worldMax[0], 'clear middle of the resting guide').toBeLessThan(pose.heelMin[0]);
  139 |   expect(right.worldMin[0], 'clear middle of the resting guide').toBeGreaterThan(pose.heelMax[0]);
  140 |   for (const section of pose.sections) {
  141 |     expect(section.invalid).toBe(0); expect(section.flat).toBe(true);
  142 |     expect((section.worldMin[1] + section.worldMax[1]) / 2).toBeCloseTo(pose.restY, 7);
  143 |   }
  144 |   expect(left.worldMin[0]).toBeCloseTo(-.825 * pose.modelScale, 6);
  145 |   expect(right.worldMax[0]).toBeCloseTo(.825 * pose.modelScale, 6);
  146 |   expect(left.worldMax[0]).toBeCloseTo(pose.clearance.minX - .055 * pose.handScale, 6);
  147 |   expect(right.worldMin[0]).toBeCloseTo(pose.clearance.maxX + .055 * pose.handScale, 6);
  148 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0);
  149 |   expect(pose.draw.sequence).toBeGreaterThanOrEqual(2); expect(pose.errors).toEqual([]);
  150 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  151 | }
  152 | function sameOrientation(before: any, after: any) {
> 153 |   for (let axis = 0; axis < 4; axis++) expect(after.camera.quaternion[axis]).toBeCloseTo(before.camera.quaternion[axis], 7);
      |                                                                              ^ Error: expect(received).toBeCloseTo(expected, precision)
  154 | }
  155 | function stableGuide(before: any, after: any) {
  156 |   expect(after.restY).toBe(before.restY);
  157 |   expect(after.sections.map((section: any) => [section.name, section.worldMin, section.worldMax]))
  158 |     .toEqual(before.sections.map((section: any) => [section.name, section.worldMin, section.worldMax]));
  159 | }
  160 | function retained(before: any, after: any) {
  161 |   for (const key of ['b3dDepthInquiry', 'b3dDepthReference', 'b3dPlaced', 'b3dRec', 'b3dChildHands']) expect(after[key], key).toEqual(before[key]);
  162 |   for (const key of ['age', 'depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(after.b3dDepthLab[key], key).toBe(before.b3dDepthLab[key]);
  163 | }
  164 | function record(condition: string, pose: any) { const { state, ...geometry } = pose; metrics.push({ condition, ...geometry }); }
  165 | async function capture(page: Page, name: string) {
  166 |   const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  167 |   await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
  168 | }
  169 | async function audit(page: Page) {
  170 |   await page.addScriptTag({ content: axe });
  171 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
  172 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  173 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  174 |   })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  175 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  176 |   expect(browserErrors.get(page)).toEqual([]);
  177 | }
  178 | async function release(page: Page) {
  179 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  180 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  181 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  182 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  183 | }
  184 | 
  185 | test('heel side inspection and split resting marks explain contact across ages without moving the guide', async ({ page }) => {
  186 |   await mount(page);
  187 |   const canvas = await page.locator('#wrap canvas').elementHandle();
  188 |   let stackedObservation = '';
  189 |   for (const [age, label] of [['adult', /^Adult —/], ['child', /^Child —/], ['infant', /^Infant —/]] as const) {
  190 |     if (age !== 'adult') { await page.getByRole('button', { name: label }).click(); await settle(page); }
  191 |     if (age === 'child') { await page.getByRole('radio', { name: 'One hand', exact: true }).check(); await settle(page); }
  192 |     await control(page, 'Show release');
  193 |     const stateBeforeView = (await probe(page)).state;
  194 |     await control(page, 'Heel side view');
  195 |     let rest = await probe(page); valid(rest, age === 'adult' ? 2 : 1); expect(rest.state).toEqual(stateBeforeView);
  196 |     expect(Math.abs(rest.camera.direction[1]), 'side view stays low enough to compare the stack').toBeLessThan(.5);
  197 |     const observation = page.locator('.fr-contact-observation');
  198 |     await expect(observation).toHaveCount(1);
  199 |     await expect(observation.locator('summary')).toHaveText('Check your observation');
  200 |     await expect(observation).toContainText(/heel/i); await expect(observation).toContainText(/finger/i);
  201 |     if (age === 'adult') stackedObservation = (await observation.textContent())!;
  202 |     else expect(await observation.textContent(), 'observation follows the one-hand arrangement').not.toBe(stackedObservation);
  203 |     if (age === 'child') {
  204 |       const one = rest;
  205 |       await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
  206 |       rest = await probe(page); valid(rest, 2); sameOrientation(one, rest);
  207 |       expect(rest.camera.position, 'active side close-up refits to two hands').not.toEqual(one.camera.position);
  208 |       expect(await observation.textContent(), 'child two-hand explanation follows the illustrated stack').toBe(stackedObservation);
  209 |     }
  210 |     record(age + '-side-release', rest);
  211 |     if (age === 'adult') await capture(page, 'adult-heel-side-release');
  212 |     await control(page, 'Show compression');
  213 |     const peak = await probe(page); valid(peak, age === 'infant' ? 1 : 2);
  214 |     expect(peak.camera).toEqual(rest.camera); expect(peak.target).toEqual(rest.target); stableGuide(rest, peak);
  215 |     expect(peak.marker[1]).toBeLessThan(rest.marker[1] - .005); record(age + '-side-compression', peak);
  216 |     if (age !== 'adult') await capture(page, age + '-heel-side-compression');
  217 |     if (age === 'adult') {
  218 |       await control(page, 'Hand contact close-up');
  219 |       const oblique = await probe(page); valid(oblique, 2); stableGuide(rest, oblique);
  220 |       expect(oblique.camera.position).not.toEqual(rest.camera.position); record('adult-oblique-compression', oblique);
  221 |       await capture(page, 'adult-oblique-contact-compression');
  222 |       await control(page, 'Show release');
  223 |       await control(page, 'Heel side view');
  224 |       const beforeRange = await probe(page);
  225 |       await page.locator('#fr-depth-depth').focus(); await page.keyboard.press('End'); await settle(page);
  226 |       const range = await probe(page); valid(range, 2); sameOrientation(beforeRange, range);
  227 |       expect(range.camera.position, 'side close-up refits the larger depth envelope').not.toEqual(beforeRange.camera.position);
  228 |       stableGuide(beforeRange, range); record('adult-side-expanded-depth', range);
  229 |     }
  230 |   }
  231 |   expect(await canvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  232 |   await audit(page); await release(page);
  233 | });
  234 | 
  235 | test('phone heel inspection preserves learning state through keyboard use resizing contrast and cleanup', async ({ page }) => {
  236 |   await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: {
  237 |     age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
  238 |     b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
  239 |     b3dDepthInquiry: { signature: 'retained-contact-inquiry', peak: 'same', explanation: 'Contact is different from complete recoil.' } });
  240 |   const canvas = await page.locator('#wrap canvas').elementHandle(), initial = await probe(page);
  241 |   await control(page, 'Heel side view', true);
  242 |   const side = await probe(page); valid(side, 2); expect(side.state).toEqual(initial.state);
  243 |   const observation = page.locator('.fr-contact-observation');
  244 |   await observation.locator('summary').focus(); await page.keyboard.press('Enter');
  245 |   await expect(observation).toHaveAttribute('open', '');
  246 |   expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(initial.state);
  247 |   record('phone-side-320', side); await capture(page, 'phone-heel-side-320');
  248 |   await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  249 |   const wider = await probe(page); valid(wider, 2); sameOrientation(side, wider); expect(wider.state).toEqual(initial.state);
  250 |   expect(wider.canvasSize[0]).not.toBe(side.canvasSize[0]);
  251 |   await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  252 |   const narrow = await probe(page); valid(narrow, 2); sameOrientation(side, narrow); expect(narrow.state).toEqual(initial.state);
  253 |   const graph = page.getByRole('slider', { name: 'Inspect cycle on graph', exact: true });
```