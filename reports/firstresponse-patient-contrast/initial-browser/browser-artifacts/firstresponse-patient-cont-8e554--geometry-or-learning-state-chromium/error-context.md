# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-patient-contrast.spec.ts >> adult patient contrast contours clarify palms and cheek support without changing geometry or learning state
- Location: tests\e2e\firstresponse-patient-contrast.spec.ts:344:43

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -396,11 +396,11 @@
        1862,
        1710,
      ],
    ],
    "canvas": 2,
-   "geometries": 57,
+   "geometries": 66,
    "head": Array [
      Array [
        1863,
        1864,
        1865,
```

# Test source

```ts
  56  |           var i=index?index.getX(offset):offset;if(seen.has(i))continue;seen.add(i);
  57  |           var world=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld),p=world.clone().project(camera).toArray();
  58  |           if(!world.toArray().concat(p).every(Number.isFinite))invalid++;
  59  |           for(var axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],p[axis]);max[axis]=Math.max(max[axis],p[axis]);}
  60  |         }
  61  |         [position.array,normal && normal.array,index && index.array].filter(Boolean).forEach(function(array){
  62  |           var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
  63  |         });
  64  |         var material=mesh.material;
  65  |         return {name:mesh.name,min:min,max:max,invalid:invalid,matrix:mesh.matrixWorld.elements.slice(),
  66  |           fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),drawRange:[start,end-start],
  67  |           resources:[patientResourceId(mesh),patientResourceId(geometry),patientResourceId(position),patientResourceId(position.array),
  68  |             patientResourceId(normal),patientResourceId(normal && normal.array),patientResourceId(index),patientResourceId(index && index.array),patientResourceId(material)],
  69  |           material:{name:material.name,type:material.type,color:material.color.toArray(),depthTest:material.depthTest,depthWrite:material.depthWrite,
  70  |             opacity:material.opacity,transparent:material.transparent,patientContour:material.userData.frPatientContourStrength?material.userData.frPatientContourStrength.value:null,
  71  |             rescuerContour:material.userData.frContourStrength?material.userData.frContourStrength.value:null}};
  72  |       }
  73  |       var arms=scene.getObjectByName('fr-patient-arms'),parts=[],skin=[],hands={left:[],right:[]},head=[],clothing=[],protectedParts=[];
  74  |       arms.traverse(function(mesh){
  75  |         if(!mesh.isMesh || !visible(mesh))return;var data=summary(mesh);parts.push(data);
  76  |         if(mesh.material.name==='fr-patient-arm-skin')skin.push(data);
  77  |         if(/-sleeve$/.test(mesh.name))clothing.push(data);
  78  |         if(mesh.material.name!=='fr-patient-arm-skin')protectedParts.push(data);
  79  |       });
  80  |       ['left','right'].forEach(function(side){scene.getObjectByName('fr-patient-'+side+'-hand').traverse(function(mesh){
  81  |         if(mesh.isMesh && visible(mesh))hands[side].push(summary(mesh));
  82  |       });});
  83  |       scene.getObjectByName('fr-manikin-head-pivot').traverse(function(mesh){
  84  |         if(mesh.isMesh && visible(mesh)){var data=summary(mesh);head.push(data);protectedParts.push(data);}
  85  |       });
  86  |       ['fr-manikin-torso','fr-manikin-pelvis'].forEach(function(name){var mesh=scene.getObjectByName(name);if(mesh && mesh.isMesh && visible(mesh)){var data=summary(mesh);clothing.push(data);protectedParts.push(data);}});
  87  |       var rescuer=scene.getObjectByName('fr-depth-hands');if(rescuer)rescuer.traverse(function(mesh){
  88  |         if(mesh.isMesh)protectedParts.push(summary(mesh));
  89  |       });
  90  |       var material=window.__patientContrastMaterials()[0],skull=scene.getObjectByName('fr-manikin-head');
  91  |       var near=scene.getObjectByName('fr-patient-left-hand'),bounds=scene.getObjectByName('fr-palm-bounds'),normalDot=null;
  92  |       if(bounds){var normal=new THREE.Vector3(0,1,0).applyQuaternion(near.getWorldQuaternion(new THREE.Quaternion()));
  93  |         normalDot=camera.getWorldPosition(new THREE.Vector3()).sub(bounds.getWorldPosition(new THREE.Vector3())).normalize().dot(normal);}
  94  |       return {parts:parts,skin:skin,hands:hands,head:head,clothing:clothing,protectedParts:protectedParts,
  95  |         materials:window.__patientContrastMaterials().map(function(m){return{id:patientResourceId(m),userdata:patientResourceId(m.userData),uniform:patientResourceId(m.userData.frPatientContourStrength),
  96  |           name:m.name,type:m.type,color:m.color.toArray(),strength:m.userData.frPatientContourStrength?m.userData.frPatientContourStrength.value:null,
  97  |           depthTest:m.depthTest,depthWrite:m.depthWrite,transparent:m.transparent,opacity:m.opacity};}),
  98  |         isolated:!material || material!==skull.material && material.userData!==skull.material.userData,
  99  |         normalDot:normalDot,camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
  100 |           quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  101 |         canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
  102 |         draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,
  103 |           geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},
  104 |         state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
  105 |     };`,
  106 | });
  107 | 
  108 | test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
  109 | test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
  110 | test.afterAll(async () => { writeFileSync(report + '/patient-contrast-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
  111 | test.beforeEach(async ({ page }) => {
  112 |   const errors: string[] = []; browserErrors.set(page, errors);
  113 |   page.on('pageerror', error => errors.push('page: ' + error.message));
  114 |   page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  115 | });
  116 | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  117 | 
  118 | async function settle(page: Page) {
  119 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  120 |   await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  121 |   const previous = await page.evaluate(() => {
  122 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  123 |     return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__patientContrastDraws.get(canvas)?.sequence || 0 };
  124 |   });
  125 |   await page.waitForFunction(previous => {
  126 |     const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
  127 |     const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__patientContrastDraws.get(canvas);
  128 |     return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  129 |   }, previous);
  130 | }
  131 | async function mount(page: Page, age: string, width: number) {
  132 |   await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  133 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  134 |   await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
  135 |     b3dRec: completed, b3dRecView: 5, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
  136 |     b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
  137 |     b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
  138 |     b3dDepthInquiry: { signature: 'patient-contrast-observation', explanation: 'Retain this saved observation.' } } });
  139 |   await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
  140 | }
  141 | async function probe(page: Page): Promise<any> {
  142 |   const handle = await page.waitForFunction(() => (window as any).__patientContrast());
  143 |   try { return await handle.jsonValue(); } finally { await handle.dispose(); }
  144 | }
  145 | const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  146 |   inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
  147 | const geometry = (pose: any) => pose.parts.concat(pose.head).map((part: any) => [part.name, part.fingerprint, part.matrix, part.drawRange]);
  148 | const resources = (pose: any) => ({ arms: pose.parts.map((part: any) => part.resources), head: pose.head.map((part: any) => part.resources),
  149 |   protected: pose.protectedParts.map((part: any) => part.resources), materials: pose.materials.map((m: any) => [m.id, m.userdata, m.uniform]),
  150 |   canvas: pose.draw.id, geometries: pose.draw.geometries });
  151 | async function control(page: Page, name: string, keyboard = false) {
  152 |   const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  153 |   if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  154 |   else await button.click();
  155 |   await settle(page); const after = await probe(page);
> 156 |   expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(resources(after)).toEqual(resources(before));
      |                                                                                                                          ^ Error: expect(received).toEqual(expected) // deep equality
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
  252 |   expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .01);
  253 |   expect(exteriorChanged, 'background and all surfaces outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  254 |   expect(headChanged, 'visible head pixels outside patient skin projections remain unchanged').toBeLessThanOrEqual(Math.max(5, headNoise * 3 + 2));
  255 |   expect(clothingChanged, 'clothing outside patient skin projections remains unchanged').toBeLessThanOrEqual(Math.max(5, clothingNoise * 3 + 2));
  256 |   if (view === 'head') {
```