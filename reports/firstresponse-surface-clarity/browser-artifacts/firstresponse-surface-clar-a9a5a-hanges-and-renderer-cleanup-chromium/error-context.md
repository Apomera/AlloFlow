# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-surface-clarity.spec.ts >> 320px child and infant hand surfaces retain visible contours through camera changes and renderer cleanup
- Location: tests\e2e\firstresponse-surface-clarity.spec.ts:279:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: null
```

# Test source

```ts
  65  |           fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),material:mesh.material.name,
  66  |           flat:mesh.material.type==='MeshBasicMaterial'};
  67  |       }
  68  |       var hands=[],surfaces=[],skinRegions=[],markers=[];
  69  |       ['lower','upper'].forEach(function (side) {
  70  |         var hand=scene.getObjectByName('fr-rescuer-'+side); if(!hand || !visible(hand))return;
  71  |         hands.push(side); var unnamed=0;
  72  |         hand.traverse(function (mesh) {
  73  |           if(!mesh.isMesh || !visible(mesh))return;
  74  |           var isSurface=/^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name);
  75  |           var isSkin=mesh.material.name==='fr-rescuer-skin';
  76  |           if(isSurface || isSkin) {
  77  |             var summary=bounds(mesh,mesh.name||hand.name+'-unnamed-skin-'+(++unnamed));
  78  |             if(isSurface)surfaces.push(summary);
  79  |             if(isSkin)skinRegions.push(summary);
  80  |           }
  81  |         });
  82  |       });
  83  |       ['fr-depth-marker','fr-depth-reference','fr-depth-resting-left','fr-depth-resting-right'].forEach(function (name) {
  84  |         var mesh=scene.getObjectByName(name);if(mesh && mesh.isMesh && visible(mesh))markers.push(bounds(mesh));
  85  |       });
  86  |       var heel=scene.getObjectByName('fr-rescuer-lower-heel'), center=heel.getWorldPosition(new THREE.Vector3());
  87  |       var hit=new THREE.Raycaster(new THREE.Vector3(center.x,center.y+2,center.z),new THREE.Vector3(0,-1,0))
  88  |         .intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
  89  |       var heelBox=new THREE.Box3().setFromObject(heel);
  90  |       return {hands:hands,surfaces:surfaces,skinRegions:skinRegions,markers:markers,
  91  |         contactGap:hit?heelBox.min.y-hit.point.y:null,
  92  |         marker:scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
  93  |         materials:window.__surfaceMaterials().map(function(m){return{name:m.name,type:m.type,color:m.color.toArray(),
  94  |           specular:m.specular?m.specular.toArray():null,contour:m.userData.frContourStrength?m.userData.frContourStrength.value:null,
  95  |           depthTest:m.depthTest,depthWrite:m.depthWrite,transparent:m.transparent};}),
  96  |         camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice()},
  97  |         canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
  98  |         draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy},
  99  |         state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
  100 |     };`,
  101 | });
  102 | 
  103 | test.describe.configure({ mode: 'default', retries: 0, timeout: 420000 });
  104 | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  105 | test.afterAll(async () => { writeFileSync(report + '/surface-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
  106 | test.beforeEach(async ({ page }) => {
  107 |   const found: string[] = []; errors.set(page, found);
  108 |   page.on('pageerror', error => found.push('page: ' + error.message));
  109 |   page.on('console', message => { if (message.type() === 'error') found.push('console: ' + message.text()); });
  110 | });
  111 | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  112 | 
  113 | async function mount(page: Page, age: string, width: number) {
  114 |   await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  115 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  116 |   await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', b3dAge: age,
  117 |     b3dChildHands: 'two', b3dPlaced: 'correct', b3dRec: ['check', 'arm', 'hand'],
  118 |     b3dDepthLab: { age, depth: age === 'adult' ? 5.5 : 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
  119 |     b3dDepthReference: { age, depth: age === 'adult' ? 5.5 : 5, lean: 0 },
  120 |     b3dDepthInquiry: { signature: 'surface-material-preservation', explanation: 'Keep my observation.' } } });
  121 |   await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  122 |   await settle(page);
  123 | }
  124 | async function settle(page: Page) {
  125 |   await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  126 |   const previous = await page.evaluate(() => {
  127 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  128 |     return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__surfaceDraws.get(canvas)?.sequence || 0 };
  129 |   });
  130 |   await page.waitForFunction(previous => {
  131 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  132 |     const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__surfaceDraws.get(canvas);
  133 |     return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  134 |   }, previous);
  135 | }
  136 | async function probe(page: Page): Promise<any> {
  137 |   const value = await page.waitForFunction(() => (window as any).__surfaceClarity());
  138 |   try { return await value.jsonValue(); } finally { await value.dispose(); }
  139 | }
  140 | async function control(page: Page, label: string, keyboard = false) {
  141 |   const button = page.getByRole('button', { name: label, exact: true }); await expect(button).toBeEnabled();
  142 |   if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  143 |   await settle(page);
  144 | }
  145 | function valid(pose: any, count: number, contrast: boolean) {
  146 |   expect(pose.hands).toEqual(count === 2 ? ['lower', 'upper'] : ['lower']); expect(pose.surfaces).toHaveLength(13 * count);
  147 |   for (const part of pose.surfaces) {
  148 |     expect(part.invalid, part.name).toBe(0); expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  149 |     for (const axis of [0, 1]) { expect(part.min[axis], part.name).toBeGreaterThan(-.99); expect(part.max[axis], part.name).toBeLessThan(.99); }
  150 |     expect(part.min[2]).toBeGreaterThan(-1); expect(part.max[2]).toBeLessThan(1);
  151 |     expect(part.flat).toBe(contrast);
  152 |   }
  153 |   expect(pose.materials).toHaveLength(1);
  154 |   expect(pose.materials[0]).toMatchObject({ name: 'fr-rescuer-skin', depthTest: true, depthWrite: true, transparent: false });
  155 |   if (contrast) expect(pose.materials[0].contour).toBe(1);
  156 |   else { expect(pose.materials[0].contour).toBeNull(); expect(pose.materials[0].specular).toEqual([0, 0, 0]); }
  157 |   expect(pose.contactGap).not.toBeNull(); expect(Math.abs(pose.contactGap)).toBeLessThan(.00001);
  158 |   expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.errors).toEqual([]);
  159 | }
  160 | function unchangedGeometry(before: any, after: any) {
  161 |   for (const property of ['surfaces', 'skinRegions']) expect(after[property].map((part: any) => [part.name, part.fingerprint, part.worldMin, part.worldMax]))
  162 |     .toEqual(before[property].map((part: any) => [part.name, part.fingerprint, part.worldMin, part.worldMax]));
  163 | }
  164 | async function photograph(page: Page, filename?: string) {
> 165 |   const shot = await harness.glPixels(page, '#wrap canvas'); expect(shot).toBeTruthy();
      |                                                                           ^ Error: expect(received).toBeTruthy()
  166 |   if (filename) writeFileSync(report + '/' + filename + '.png', shot!.png);
  167 |   return shot!.png;
  168 | }
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
```