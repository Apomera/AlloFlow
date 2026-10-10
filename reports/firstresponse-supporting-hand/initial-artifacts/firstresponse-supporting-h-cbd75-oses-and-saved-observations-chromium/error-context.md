# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-supporting-hand.spec.ts >> adult supporting-hand inspection enlarges contact and preserves poses and saved observations
- Location: tests\e2e\firstresponse-supporting-hand.spec.ts:297:43

# Error details

```
Error: some actual cheek patch remains visible beside the supporting hand

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  63  |       }):[];
  64  |       return {parts:parts,all:all,inspection:hand.userData.inspection?JSON.parse(JSON.stringify(hand.userData.inspection)):null,context:projectedContext,
  65  |         handGroupId:supportId(hand),meshCount:all.length,sceneNodeCount:(function(){var count=0;scene.traverse(function(){count++;});return count;})(),
  66  |         camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect,near:camera.near},
  67  |         canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
  68  |         draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,
  69  |           geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},
  70  |         state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
  71  |     };
  72  |     window.__supportRasterSamples=function(width,height){
  73  |       var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__supportDraws.get(canvas);
  74  |       if(!drawn)throw new Error('Real drawn supporting-hand scene required');
  75  |       var scene=drawn.scene,camera=drawn.camera,hand=scene.getObjectByName('fr-patient-right-hand'),head=scene.getObjectByName('fr-manikin-head-pivot');
  76  |       scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  77  |       var samples=[],probe=window.__supportProbe(),min=[Infinity,Infinity],max=[-Infinity,-Infinity];
  78  |       probe.parts.forEach(function(part){for(var axis=0;axis<2;axis++){min[axis]=Math.min(min[axis],part.min[axis]);max[axis]=Math.max(max[axis],part.max[axis]);}});
  79  |       var visibleMeshes=[];scene.traverse(function(mesh){if(mesh.isMesh && supportVisible(mesh) && mesh.material.opacity>0)visibleMeshes.push(mesh);});
  80  |       function firstAt(x,y){var ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x,y),camera);var hit=ray.intersectObjects(visibleMeshes,false)[0];
  81  |         var onHand=false,onHead=false;for(var parent=hit && hit.object;parent;parent=parent.parent){if(parent===hand)onHand=true;if(parent===head)onHead=true;}
  82  |         return {hand:onHand,head:onHead,name:hit && hit.object.name};
  83  |       }
  84  |       for(var yi=0;yi<25;yi++)for(var xi=0;xi<25;xi++){
  85  |         var x=min[0]+(max[0]-min[0])*(xi+.5)/25,y=min[1]+(max[1]-min[1])*(yi+.5)/25;
  86  |         var first=firstAt(x,y);if(first.hand)samples.push({x:Math.min(width-1,Math.max(0,Math.round((x+1)*width/2))),
  87  |           y:Math.min(height-1,Math.max(0,Math.round((1-y)*height/2))),name:first.name});
  88  |       }
  89  |       var cheek=[];(hand.userData.inspection.context || []).forEach(function(point,index){var p=new THREE.Vector3().fromArray(point).project(camera),first=firstAt(p.x,p.y);
  90  |         cheek.push({index:index,x:Math.round((p.x+1)*width/2),y:Math.round((1-p.y)*height/2),ndc:p.toArray(),head:first.head,name:first.name});
  91  |       });return {hand:samples,cheek:cheek,grid:25,handProjectedArea:(max[0]-min[0])*(max[1]-min[1])*width*height/4};
  92  |     };`,
  93  | });
  94  | 
  95  | test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
  96  | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  97  | test.afterAll(async () => { writeFileSync(report + '/supporting-hand-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
  98  | test.beforeEach(async ({ page }) => {
  99  |   const errors: string[] = []; browserErrors.set(page, errors);
  100 |   page.on('pageerror', error => errors.push('page: ' + error.message));
  101 |   page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  102 | });
  103 | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  104 | 
  105 | async function settle(page: Page) {
  106 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  107 |   await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  108 |   const previous = await page.evaluate(() => {
  109 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  110 |     return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__supportDraws.get(canvas)?.sequence || 0 };
  111 |   });
  112 |   await page.waitForFunction(previous => {
  113 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  114 |     const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__supportDraws.get(canvas);
  115 |     return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  116 |   }, previous);
  117 | }
  118 | async function mount(page: Page, age: string, width: number, patch: Record<string, unknown> = {}) {
  119 |   await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  120 |   await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
  121 |     b3dRec: completed, b3dRecView: 5, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
  122 |     b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
  123 |     b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
  124 |     b3dDepthInquiry: { signature: 'supporting-hand-observation', explanation: 'Retain this saved observation.' }, ...patch } });
  125 |   await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
  126 | }
  127 | async function probe(page: Page): Promise<any> {
  128 |   const handle = await page.waitForFunction(() => (window as any).__supportProbe());
  129 |   try { return await handle.jsonValue(); } finally { await handle.dispose(); }
  130 | }
  131 | async function update(page: Page, patch: Record<string, unknown>) {
  132 |   await page.evaluate(p => (window as any).__ctx.updateMulti('firstResponse', p), patch); await settle(page);
  133 | }
  134 | const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  135 |   inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
  136 | const geometry = (pose: any) => pose.all.map((part: any) => [part.name, part.fingerprint, part.worldFingerprint, part.matrix, part.drawRange, part.visible]);
  137 | const materials = (pose: any) => pose.all.map((part: any) => [part.name, part.materials]);
  138 | const resources = (pose: any) => ({ all: pose.all.map((part: any) => part.resources), hand: pose.handGroupId, canvas: pose.draw.id });
  139 | function footprint(pose: any) {
  140 |   const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
  141 |   for (const part of pose.parts) for (const axis of [0, 1]) { min[axis] = Math.min(min[axis], part.min[axis]); max[axis] = Math.max(max[axis], part.max[axis]); }
  142 |   return { min, max, width: (max[0] - min[0]) * pose.canvasSize[0] / 2, height: (max[1] - min[1]) * pose.canvasSize[1] / 2,
  143 |     area: (max[0] - min[0]) * (max[1] - min[1]) * pose.canvasSize[0] * pose.canvasSize[1] / 4 };
  144 | }
  145 | function valid(pose: any) {
  146 |   expect(pose.parts.length).toBeGreaterThan(10); expect(pose.draw.createdBy).toBe('page');
  147 |   expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  148 |   expect(pose.draw.calls).toBeGreaterThan(0); expect(pose.draw.triangles).toBeGreaterThan(0);
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
> 163 |   expect(pose.context.filter((point: any) => point.firstHead).length, 'some actual cheek patch remains visible beside the supporting hand').toBeGreaterThan(0);
      |                                                                                                                                             ^ Error: some actual cheek patch remains visible beside the supporting hand
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
  186 |       if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height) value = Math.max(value, ...pixels.at(x, y));
  187 |     } return value;
  188 |   };
  189 |   const handLit = source.hand.filter((point: any) => signal(point) > 24).length;
  190 |   const cheek = source.cheek.filter((point: any) => point.head && signal(point) > 24);
  191 |   const evidence = { width: pixels.width, height: pixels.height, footprint: footprint(before), handSourceSamples: source.hand.length,
  192 |     handLit, cheekSourceSamples: source.cheek, cheekLit: cheek.length, calls: before.draw.calls, triangles: before.draw.triangles };
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
  249 |     expect(support.draw.calls, 'support camera needs no extra draws beyond the head view').toBeLessThanOrEqual(head.draw.calls);
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
```