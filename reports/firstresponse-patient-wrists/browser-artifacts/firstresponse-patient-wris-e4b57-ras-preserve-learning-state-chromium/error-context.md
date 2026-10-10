# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-patient-wrists.spec.ts >> child wrists cover the actual forearm caps in recovery poses while public cameras preserve learning state
- Location: tests\e2e\firstresponse-patient-wrists.spec.ts:244:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Test source

```ts
  91  |             var axisPoint=start.clone().addScaledVector(axis,p.clone().sub(start).dot(axis));
  92  |             var result=coverage(axisPoint,[p],[forearm],scale);rootGaps=rootGaps.concat(result.gaps);rootMissing+=result.missing;
  93  |           });
  94  |           data.root={gaps:rootGaps,missing:rootMissing};
  95  |           data.palmEnd=coverage(palm.getWorldPosition(new THREE.Vector3()),end,[palm],scale);
  96  |           var average=new THREE.Vector3();joint.forEach(function(p){average.add(p);});average.multiplyScalar(1/joint.length);
  97  |           data.jointCenterError=average.distanceTo(center)/scale;
  98  |         }
  99  |         wrists.push(data);
  100 |         var handParts=[];hand.traverse(function(mesh){if(mesh.isMesh && visible(mesh))handParts.push(summary(mesh));});hands[side]=handParts;
  101 |         var upperEnd=new THREE.Vector3(0,upper.geometry.parameters.height/2,0).applyMatrix4(upper.matrixWorld);
  102 |         limbs.push({side:side,upperLength:upper.geometry.parameters.height,forearmLength:length,
  103 |           elbowGap:upperEnd.distanceTo(start)/scale,wristGap:center.distanceTo(hand.getWorldPosition(new THREE.Vector3()))/scale,
  104 |           handMatrix:hand.matrixWorld.elements.slice(),palmNormal:new THREE.Vector3(0,1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).toArray()});
  105 |       });
  106 |       var near=scene.getObjectByName('fr-patient-left-hand'),bounds=scene.getObjectByName('fr-palm-bounds'),alignment=null,normalDot=null;
  107 |       if(bounds){
  108 |         var rotation=near.getWorldQuaternion(new THREE.Quaternion()),normal=new THREE.Vector3(0,1,0).applyQuaternion(rotation),forward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
  109 |         var view=camera.getWorldPosition(new THREE.Vector3()).sub(bounds.getWorldPosition(new THREE.Vector3())).normalize();
  110 |         normalDot=view.dot(normal);alignment=view.dot(normal.clone().addScaledVector(forward,.12).addScaledVector(new THREE.Vector3().crossVectors(normal,forward),.3).normalize());
  111 |       }
  112 |       return {wrists:wrists,hands:hands,parts:parts,limbs:limbs,alignment:alignment,normalDot:normalDot,
  113 |         camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
  114 |           quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  115 |         canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
  116 |         draw:{id:record.id,draws:record.draws,renders:record.renders,sequence:drawn.sequence,createdBy:record.createdBy},
  117 |         state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
  118 |     };`,
  119 | });
  120 | 
  121 | test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
  122 | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  123 | test.afterAll(async () => { writeFileSync(report + '/wrist-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
  124 | test.beforeEach(async ({ page }) => {
  125 |   const errors: string[] = []; browserErrors.set(page, errors);
  126 |   page.on('pageerror', error => errors.push('page: ' + error.message));
  127 |   page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  128 | });
  129 | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  130 | 
  131 | async function mount(page: Page, age: string, width = 1280) {
  132 |   await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  133 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  134 |   if (baselineSource) await page.route('**/stem_lab/stem_tool_firstresponse.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: baselineSource }));
  135 |   await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
  136 |     b3dRec: completed, b3dRecView: 2, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
  137 |     b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
  138 |     b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
  139 |     b3dDepthInquiry: { signature: 'wrist-inspection-retained', explanation: 'Keep the saved observation.' } } });
  140 |   await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
  141 | }
  142 | async function settle(page: Page) {
  143 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  144 |   await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  145 |   const previous = await page.evaluate(() => {
  146 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  147 |     return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__wristDraws.get(canvas)?.sequence || 0 };
  148 |   });
  149 |   await page.waitForFunction(previous => {
  150 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  151 |     const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__wristDraws.get(canvas);
  152 |     return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  153 |   }, previous);
  154 | }
  155 | async function probe(page: Page): Promise<any> {
  156 |   const handle = await page.waitForFunction(() => (window as any).__patientWrists());
  157 |   try { return await handle.jsonValue(); } finally { await handle.dispose(); }
  158 | }
  159 | const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  160 |   inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
  161 | const geometry = (pose: any) => pose.parts.map((part: any) => [part.name, part.fingerprint, part.matrix, part.drawRange]);
  162 | async function control(page: Page, name: string, keyboard = false) {
  163 |   const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  164 |   if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  165 |   else await button.click();
  166 |   await settle(page); const after = await probe(page);
  167 |   expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(after.limbs).toEqual(before.limbs);
  168 |   return after;
  169 | }
  170 | function framed(parts: any[]) {
  171 |   expect(parts.length).toBeGreaterThan(0);
  172 |   for (const part of parts) {
  173 |     expect(part.invalid, part.name).toBe(0);
  174 |     for (const axis of [0, 1]) { expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995); }
  175 |     expect(part.min[2], part.name).toBeGreaterThan(-1); expect(part.max[2], part.name).toBeLessThan(1);
  176 |   }
  177 | }
  178 | function valid(pose: any, contrast = false) {
  179 |   expect(pose.wrists).toHaveLength(2);
  180 |   for (const wrist of pose.wrists) {
  181 |     expect(wrist.invalid, wrist.name).toBe(0); expect(wrist.normalError).toBeLessThan(.0001); expect(wrist.flat).toBe(contrast);
  182 |     expect(wrist.metadata, 'numeric ring metadata identifies the drawn connector').toBe(true);
  183 |     expect(wrist.position).toEqual([0, 0, .015]); expect(wrist.localScale).toEqual([.048, .04, .055]); expect(wrist.quaternion).toEqual([0, 0, 0, 1]);
  184 |     const p = wrist.parameters;
  185 |     expect(wrist.vertices).toBe(p.radialSegments * p.ringCount);
  186 |     expect(wrist.indices, 'both connector ends are open and buried').toBe((p.ringCount - 1) * p.radialSegments * 6);
  187 |     expect(wrist.cap.rimVertices).toBeGreaterThanOrEqual(24); expect(wrist.cap.samples).toBe(wrist.cap.rimVertices * 3);
  188 |     expect(wrist.cap.missing).toBe(0);
  189 |     expect(Math.min(...wrist.cap.gaps), wrist.name + ' covers actual forearm rim, edge midpoints and cap interiors after the fold').toBeGreaterThan(.00005);
  190 |     expect(wrist.root.missing).toBe(0); expect(Math.min(...wrist.root.gaps), 'root is buried in the unchanged forearm').toBeGreaterThan(.00001);
> 191 |     expect(wrist.palmEnd.missing).toBe(0); expect(Math.min(...wrist.palmEnd.gaps), 'open palm end is buried in the actual palm').toBeGreaterThan(.00001);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  192 |     expect(wrist.jointCenterError).toBeLessThan(.001);
  193 |   }
  194 |   for (const limb of pose.limbs) { expect(limb.elbowGap).toBeLessThan(.000001); expect(limb.wristGap).toBeLessThan(.000001); }
  195 |   expect(pose.limbs[0].palmNormal[1]).toBeGreaterThan(.98);
  196 |   for (const part of pose.parts) expect(part.invalid, part.name).toBe(0);
  197 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  198 |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
  199 | }
  200 | function palmFramed(pose: any) { framed(pose.hands.left); expect(pose.normalDot).toBeGreaterThan(.92); expect(pose.alignment).toBeGreaterThan(.9999); }
  201 | function record(name: string, pose: any) { const { state, ...drawn } = pose; metrics.push({ name, ...drawn }); }
  202 | async function capture(page: Page, name: string) {
  203 |   const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  204 |   await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
  205 | }
  206 | async function audit(page: Page) {
  207 |   await page.addScriptTag({ content: axe });
  208 |   const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
  209 |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  210 |     rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  211 |   })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  212 |   expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  213 |   expect(browserErrors.get(page)).toEqual([]);
  214 | }
  215 | async function release(page: Page) {
  216 |   expect(await page.locator('#wrap canvas').count()).toBe(1);
  217 |   expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  218 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  219 |   expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
  220 | }
  221 | async function poses(page: Page, age: string, keyboard = false) {
  222 |   const saved = preserved((await probe(page)).state), lengths: Record<string, number[]> = {};
  223 |   const prefix = age === 'infant' ? 'phone-infant' : age;
  224 |   for (const pose of [2, 3, 5, 8]) {
  225 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
  226 |     const arms = await control(page, 'Hands + arms', keyboard); valid(arms); framed(arms.parts); expect(preserved(arms.state)).toEqual(saved);
  227 |     for (const limb of arms.limbs) {
  228 |       if (!lengths[limb.side]) lengths[limb.side] = [limb.upperLength, limb.forearmLength];
  229 |       expect(limb.upperLength).toBeCloseTo(lengths[limb.side][0], 6); expect(limb.forearmLength).toBeCloseTo(lengths[limb.side][1], 6);
  230 |     }
  231 |     record(prefix + '-pose-' + pose + '-arms', arms);
  232 |     if (age === 'adult' && pose === 5) await capture(page, 'adult-pose-5-arms');
  233 |     const palm = await control(page, 'Palm detail view', keyboard); valid(palm); palmFramed(palm); record(prefix + '-pose-' + pose + '-palm', palm);
  234 |     if (pose === 2) await capture(page, prefix + '-pose-2-palm');
  235 |     if (pose === 5) {
  236 |       const head = await control(page, 'Head close-up', keyboard); valid(head); framed([head.wrists[1]]);
  237 |       record(prefix + '-pose-5-cheek', head); await capture(page, prefix + '-pose-5-cheek');
  238 |     }
  239 |   }
  240 |   expect(preserved((await probe(page)).state)).toEqual(saved);
  241 | }
  242 | 
  243 | for (const age of ['adult', 'child']) {
  244 |   test(age + ' wrists cover the actual forearm caps in recovery poses while public cameras preserve learning state', async ({ page }) => {
  245 |     test.skip(!!baselinePath, 'Saved source runs only the focused baseline captures.');
  246 |     await mount(page, age); const initial = await page.locator('#wrap canvas').elementHandle();
  247 |     await poses(page, age);
  248 |     expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  249 |     await audit(page); await release(page);
  250 |   });
  251 | }
  252 | test('phone infant wrists retain pose and framing through keyboard inspection resizing contrast and cleanup', async ({ page }) => {
  253 |   test.skip(!!baselinePath, 'Saved source runs only the focused baseline captures.');
  254 |   await mount(page, 'infant', 320); const initial = await page.locator('#wrap canvas').elementHandle();
  255 |   await poses(page, 'infant', true);
  256 |   const narrow = await control(page, 'Palm detail view', true), saved = preserved(narrow.state); palmFramed(narrow);
  257 |   await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  258 |   const wide = await probe(page); valid(wide); palmFramed(wide); expect(preserved(wide.state)).toEqual(saved); expect(geometry(wide)).toEqual(geometry(narrow));
  259 |   for (let axis = 0; axis < 3; axis++) expect(wide.camera.direction[axis]).toBeCloseTo(narrow.camera.direction[axis], 7);
  260 |   await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  261 |   const restored = await probe(page); valid(restored); palmFramed(restored); expect(preserved(restored.state)).toEqual(saved);
  262 |   for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
  263 |   await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Palm detail view', true); await audit(page);
  264 |   expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  265 |   await page.emulateMedia({ forcedColors: 'none' });
  266 |   const previous = await page.locator('#wrap canvas').elementHandle();
  267 |   await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  268 |   const contrast = await control(page, 'Palm detail view', true); valid(contrast, true); palmFramed(contrast);
  269 |   expect(preserved(contrast.state)).toEqual(saved); expect(geometry(contrast)).toEqual(geometry(restored));
  270 |   record('phone-infant-contrast-palm', contrast); await capture(page, 'phone-infant-contrast-palm');
  271 |   const head = await control(page, 'Head close-up', true); valid(head, true); framed([head.wrists[1]]);
  272 |   record('phone-infant-contrast-cheek', head); await capture(page, 'phone-infant-contrast-cheek');
  273 |   await expect.poll(async () => previous!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  274 |   await audit(page); await release(page);
  275 | });
  276 | 
  277 | test('capture five matched wrist views from an optional saved baseline source', async ({ page }) => {
  278 |   test.skip(!baselinePath, 'Set FIRST_RESPONSE_WRISTS_BASELINE_SOURCE to before.js to capture the saved runtime without new geometry assertions.');
  279 |   for (const age of ['adult', 'infant']) {
  280 |     await mount(page, age, age === 'infant' ? 320 : 1280);
  281 |     const prefix = age === 'infant' ? 'phone-infant' : age;
  282 |     const palm = await control(page, 'Palm detail view', age === 'infant');
  283 |     expect(palm.draw.createdBy).toBe('page'); record(prefix + '-pose-2-palm', palm); await capture(page, prefix + '-pose-2-palm');
  284 |     await page.getByLabel('Pose to inspect', { exact: true }).selectOption('5'); await settle(page);
  285 |     const arms = await control(page, 'Hands + arms', age === 'infant');
  286 |     if (age === 'adult') { record('adult-pose-5-arms', arms); await capture(page, 'adult-pose-5-arms'); }
  287 |     // Match the candidate's public camera sequence before the cheek close-up.
  288 |     await control(page, 'Palm detail view', age === 'infant');
  289 |     const cheek = await control(page, 'Head close-up', age === 'infant'); record(prefix + '-pose-5-cheek', cheek); await capture(page, prefix + '-pose-5-cheek');
  290 |     await release(page);
  291 |   }
```