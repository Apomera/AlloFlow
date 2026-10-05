# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-habitat-lighting.spec.ts >> balanced natural habitat clusters keep open routes and grounded roots while actual plant, sand and water programs submit
- Location: tests\e2e\cephalopod-habitat-lighting.spec.ts:310:57

# Error details

```
Error: cephalopodLab: no VISIBLE canvas in #wrap after 30s (canvases present, CSS px: [860x720, 132x132]). If every one is 0px wide, the tool root may have collapsed inside the flex #wrap; try layout: 'document'.
page.waitForFunction: Timeout 30000ms exceeded.
```

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "The AudioContext encountered an error from the audio device or the WebAudio renderer.",
+ ]
```

# Test source

```ts
  208 |       motion: w.__hlOwned.filter((r: any) => r.motion).map((r: any) => r.motion.toArray()), player: w.__hlPlayer.position.toArray(), camera: w.__hlCamera.position.toArray(),
  209 |       lights, background: w.__hlScene.background.toArray(), top: w.__hlBackdrop.material.uniforms.topColor.value.toArray(), bottom: w.__hlBackdrop.material.uniforms.bottomColor.value.toArray(),
  210 |       causticOffset: w.__hlCaustics.material.map.offset.toArray(), causticOpacity: w.__hlCaustics.material.opacity, causticVisible: w.__hlCaustics.visible,
  211 |       rays: [...w.__hlRays, ...w.__hlShafts].map((m: any) => ({ opacity: m.material.opacity, rotation: m.rotation.toArray() })), shafts: w.__hlShafts.length, legacyRays: w.__hlRays.length, forcedFX: w.__hlForcedFX,
  212 |       shaftSkip: !!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 || matchMedia('(prefers-reduced-motion: reduce)').matches || /SwiftShader|llvmpipe|Software/i.test(rendererName), rendererName,
  213 |       shadows: w.__hlRenderer.shadowMap.enabled, exposure: w.__hlRenderer.toneMappingExposure, composer: !!w.__hlRenderer._alloComposer,
  214 |       rockCasters:w.__hlRocks.map((mesh:any)=>({uuid:mesh.uuid,materialUUID:mesh.material.uuid,shadowSide:mesh.material.shadowSide,surfaceSide:mesh.material.side,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow})),
  215 |       rockDepthDraws:[...w.__hlRockDepthDraws.values()],rockResourcesStable:w.__hlRockOwned.every((row:any)=>row.mesh.geometry===row.geometry&&row.mesh.material===row.material&&row.mesh.geometry.index===row.index&&row.mesh.geometry.index?.array===row.indexArray&&row.attributes.every((entry:any)=>row.geometry.attributes[entry.name]===entry.attribute&&entry.attribute.array===entry.array&&entry.attribute.version===entry.version)),
  216 |       stable: w.__hlOwned.every((r: any) => r.mesh.geometry === r.geometry && r.mesh.material === r.material && r.material.map === r.map && r.material.customProgramCacheKey() === r.key && r.geometry.index === r.index && r.index.array === r.indexArray && r.mesh.instanceMatrix === r.instances && r.instances?.array === r.instanceArray && Object.entries(r.attrs).every(([name, old]: [string, any]) => r.geometry.attributes[name] === old.attr && old.attr.array === old.array)),
  217 |       plantBuffers: w.__hlOwned.filter((r: any) => r.motion).every((r: any) => Object.values(r.attrs).every((old: any) => old.attr.version === old.version && old.values.every((v: number, i: number) => v === old.array[i])) && (!r.instanceValues || r.instanceValues.every((v: number, i: number) => v === r.instanceArray[i]))),
  218 |       finite: w.__hlOwned.every((r: any) => r.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(r.geometry.attributes).every((a: any) => Array.from(a.array).every(Number.isFinite))),
  219 |       nativeStable: w.__hlNativeStable, nativeIssues: w.__hlNativeIssues,
  220 |       referenceIssues: w.__hlOwned.filter((r: any) => r.mesh.geometry !== r.geometry || r.mesh.material !== r.material || r.material.map !== r.map || r.material.customProgramCacheKey() !== r.key || r.geometry.index !== r.index || r.index.array !== r.indexArray || r.mesh.instanceMatrix !== r.instances || r.instances?.array !== r.instanceArray || Object.entries(r.attrs).some(([name, old]: [string, any]) => r.geometry.attributes[name] !== old.attr || old.attr.array !== old.array)).map((r: any) => ({ name: r.mesh.name, geometry: r.mesh.geometry === r.geometry, material: r.mesh.material === r.material, key: r.material.customProgramCacheKey() === r.key, attrs: Object.entries(r.attrs).filter(([name, old]: [string, any]) => r.geometry.attributes[name] !== old.attr || old.attr.array !== old.array).map(([name]) => name) })),
  221 |       resources: w.__hlResources.length, disposed: w.__hlResources.map((r: any) => r.disposed), textures: w.__hlRenderer.info.memory.textures,
  222 |       staticWorld: w.__hlScene.children.filter((m: any) => ['rock', 'coral'].includes(m.userData.substrate) || m.userData.shelterType || /^cl-(home|den)/.test(m.name)).map((m: any) => [m.uuid, m.name, m.position.toArray(), m.rotation.toArray(), m.scale.toArray()]),
  223 |       time: document.querySelector('[data-hud=time]')?.textContent,
  224 |       renders: w.__glRecorder.records.filter((r: any) => r.scene === w.__hlScene).at(-1).renders };
  225 |   });
  226 | }
  227 | 
  228 | function stable(value: Awaited<ReturnType<typeof state>>, quality: 'low' | 'balanced') {
  229 |   expect(value.stable, 'Owned mesh, material, texture and attribute references: ' + JSON.stringify(value.referenceIssues)).toBe(true);
  230 |   expect(value.plantBuffers, 'Immutable plant attribute and instance bytes/versions').toBe(true);
  231 |   expect(value.finite, 'Finite owned geometry and world transforms').toBe(true);
  232 |   expect(value.nativeStable, 'Actual native vertex/index buffer identities: ' + JSON.stringify(value.nativeIssues)).toBe(true);
  233 |   expect(value.resources).toBe(220 + 2 * value.shafts + 2 * value.legacyRays);
  234 |   expect(value.disposed).toEqual(Array(value.resources).fill(0));
  235 |   expect(value.lights.map((l: any) => l.type).sort()).toEqual(['AmbientLight', 'DirectionalLight', 'HemisphereLight']);
  236 |   expect(value.shadows).toBe(quality === 'balanced'); expect(value.exposure).toBe(1.18); expect(value.composer).toBe(false);
  237 |   expect(value.rockResourcesStable,'Rock surface and shadow caster resource identities').toBe(true);expect(value.rockCasters.length).toBeGreaterThan(0);
  238 |   expect(value.rockCasters.every((rock:any)=>rock.shadowSide===2&&rock.surfaceSide===0&&rock.castShadow&&rock.receiveShadow),'Solid reef rocks must cast both faces while surface receivers stay FrontSide').toBe(true);
  239 |   if(quality==='balanced'){expect(value.rockDepthDraws.length,'Actual solid reef-rock shadow depth draws').toBeGreaterThan(0);for(const draw of value.rockDepthDraws){expect(draw).toMatchObject({sourceShadowSide:2,submittedDepthSide:2,cullEnabled:false,linked:true,castShadow:true});expect(value.rockCasters.some((rock:any)=>rock.uuid===draw.uuid&&rock.materialUUID===draw.sourceMaterialUUID),'Depth draw uses an actual original rock material').toBe(true);}}else expect(value.rockDepthDraws).toEqual([]);
  240 |   expect(value.shafts).toBe(value.forcedFX ? 7 : value.shaftSkip ? 0 : 7); expect(value.legacyRays).toBe(quality === 'low' ? 0 : 4);
  241 | }
  242 | 
  243 | async function naturalComposition(page: Page) {
  244 |   return page.evaluate(() => {
  245 |     const w = window as any, T = w.THREE, ray = new T.Raycaster(), point = new T.Vector3(), matrix = new T.Matrix4(); w.__hlScene.updateMatrixWorld(true);
  246 |     const dens = w.__hlScene.children.filter((m: any) => m.name === 'cl-den' || m.name === 'cl-home');
  247 |     const shelters = w.__hlScene.children.filter((m: any) => m.userData.shelterType && m.userData.state !== 'carried');
  248 |     const obstacles = w.__hlScene.children.filter((m: any) => ['rock', 'coral'].includes(m.userData.substrate) && m.userData.reefPlacementValid !== false && m.userData.reefFootprint).map((mesh: any, index: number) => {
  249 |       // r128 setFromObject transforms local bounding-box corners, which can
  250 |       // overestimate rotated irregular reef meshes. Independently transform
  251 |       // every actual position vertex for the conservative world AABB instead.
  252 |       const bounds = new T.Box3(), vertex = new T.Vector3();
  253 |       mesh.traverse((part: any) => {
  254 |         const positions = part.geometry?.attributes.position; if (!positions) return;
  255 |         for (let i = 0; i < positions.count; i++) bounds.expandByPoint(vertex.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld));
  256 |       });
  257 |       const coarse = new T.Box3().setFromObject(mesh), footprint = mesh.userData.reefFootprint;
  258 |       return { index, name: mesh.name, uuid: mesh.uuid, substrate: mesh.userData.substrate, position: mesh.position.toArray(), bounds,
  259 |         coarse, cached: [mesh.position.x + footprint.minX, mesh.position.x + footprint.maxX, mesh.position.z + footprint.minZ, mesh.position.z + footprint.maxZ] };
  260 |     });
  261 |     const rectangleDistance = (x: number, z: number, rect: number[]) => Math.hypot(Math.max(rect[0] - x, 0, x - rect[1]), Math.max(rect[2] - z, 0, z - rect[3]));
  262 |     return w.__hlPlants.map((mesh: any) => {
  263 |       const h = mesh.userData.clHabitat, roots: number[][] = []; const positions = mesh.geometry.attributes.position, base = new T.Vector3();
  264 |       for (let i = 0; i < 3; i++) base.add(point.fromBufferAttribute(positions, i)); base.multiplyScalar(1 / 3);
  265 |       for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) { point.copy(base); if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, matrix); point.applyMatrix4(matrix); } roots.push(point.applyMatrix4(mesh.matrixWorld).toArray()); }
  266 |       let floorError: number | null = null;
  267 |       if (Math.abs(mesh.position.x) < 18 && Math.abs(mesh.position.z) < 75) {
  268 |         ray.set(new T.Vector3(mesh.position.x, 50, mesh.position.z), new T.Vector3(0, -1, 0)); ray.far = 150;
  269 |         const hit = ray.intersectObject(w.__hlSand, false)[0]; if (hit) floorError = Math.max(...roots.map(root => Math.abs(root[1] - hit.point.y - mesh.userData.groundOffset)));
  270 |       }
  271 |       const radius = h?.radius || 0, x = mesh.position.x, z = mesh.position.z;
  272 |       const denViolations = dens.map((den: any) => {
  273 |         const dx = x - den.position.x, dz = z - den.position.z, yaw = den.rotation.y, forward = dx * Math.sin(yaw) + dz * Math.cos(yaw), side = dx * Math.cos(yaw) - dz * Math.sin(yaw), distance = Math.hypot(dx, dz);
  274 |         return { name: den.name, position: den.position.toArray(), yaw, forward, side, distance, circleViolation: distance < 3 + radius - 1e-6,
  275 |           approachViolation: Math.abs(side) < 1.85 + radius && forward > -1.1 - radius && forward < 7 + radius };
  276 |       }).filter((d: any) => d.circleViolation || d.approachViolation);
  277 |       const shelterViolations = shelters.map((s: any) => ({ name: s.name, uuid: s.uuid, type: s.userData.shelterType, state: s.userData.state, position: s.position.toArray(), distance: Math.hypot(x - s.position.x, z - s.position.z) })).filter((s: any) => s.distance < 1.5 + radius - 1e-6);
  278 |       const overlaps = (b: any) => x + radius + .12 > b.min.x + 1e-5 && x - radius - .12 < b.max.x - 1e-5 && z + radius + .12 > b.min.z + 1e-5 && z - radius - .12 < b.max.z - 1e-5;
  279 |       const obstacleDiagnostic = (o: any) => ({ index: o.index, name: o.name, uuid: o.uuid, substrate: o.substrate, position: o.position,
  280 |         vertexBounds: [o.bounds.min.x, o.bounds.max.x, o.bounds.min.z, o.bounds.max.z], cachedBounds: o.cached, coarseBoxBounds: [o.coarse.min.x, o.coarse.max.x, o.coarse.min.z, o.coarse.max.z] });
  281 |       const reefViolations = obstacles.filter((o: any) => overlaps(o.bounds)).map(obstacleDiagnostic), coarseBoxOverlaps = obstacles.filter((o: any) => overlaps(o.coarse)).map(obstacleDiagnostic);
  282 |       return { name: mesh.name, habitat: h, visible: mesh.visible, roots, floorError, denClear: denViolations.length === 0, shelterClear: shelterViolations.length === 0, reefClear: reefViolations.length === 0,
  283 |         denViolations, shelterViolations, reefViolations, coarseBoxOverlaps, denCount: dens.length, groups: mesh.geometry.groups.length, children: mesh.children.length,
  284 |         spawnClearance: rectangleDistance(mesh.position.x, mesh.position.z, [-4.5, 4.5, -5, 4.5]), routeClearance: rectangleDistance(mesh.position.x, mesh.position.z, [0, 7, -5, 10]),
  285 |         height: mesh.geometry.userData.clPlantHeight, vertices: positions.count, triangles: mesh.geometry.index.count / 3, x: mesh.position.x, z: mesh.position.z, rootY: mesh.position.y };
  286 |     });
  287 |   });
  288 | }
  289 | 
  290 | async function release(page: Page, activeHarness = harness) {
  291 |   const count = await page.evaluate(() => (window as any).__hlResources.length);
  292 |   await activeHarness.unmount(page); expect(await activeHarness.leakedAfterUnmount(page)).toEqual([]);
  293 |   expect(await page.evaluate(() => (window as any).__hlResources.map((r: any) => r.disposed))).toEqual(Array(count).fill(1));
  294 | }
  295 | 
  296 | test.describe.configure({ timeout: 180000, retries: 0 });
  297 | test.use({ video: 'off', trace: 'off' });
  298 | test.beforeAll(async () => {
  299 |   // A fresh checkout prepares its own uniquely scoped scratch source. The
  300 |   // guarded generator adds only a reference to initialized gameState and proves
  301 |   // exact byte restoration; natural cases still load the original model.
  302 |   // Root's explicit fixture override retains its separately saved proof.
  303 |   if (!diagnosticOverride) execFileSync(process.execPath, [resolve('reports/cephalopod-hunter-enhancement/pass-twenty-four/prepare-lighting-diagnostic.cjs'), resolve(model), resolve(diagnosticModel)], { cwd: process.cwd(), stdio: 'pipe' });
  304 |   await harness.start(); await diagnosticHarness.start();
  305 | });
  306 | test.afterAll(async () => { await diagnosticHarness.stop(); await harness.stop(); });
  307 | test.beforeEach(({ page }) => { const found: string[] = []; errors.set(page, found); page.on('pageerror', e => found.push(e.message)); page.on('console', m => { if (m.type() === 'error') found.push(m.text()); }); });
> 308 | test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
      |                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  309 | 
  310 | for (const quality of ['low', 'balanced'] as const) test(`${quality} natural habitat clusters keep open routes and grounded roots while actual plant, sand and water programs submit`, async ({ page }, testInfo) => {
  311 |   await mount(page, quality); const composition = await naturalComposition(page), initial = await state(page); stable(initial, quality);
  312 |   await testInfo.attach('natural-habitat-independent-clearance', { body: JSON.stringify({ quality, scope: 'Independent world-vertex reef bounds; rotated local-box bounds are diagnostic only. Original den and shelter clearance thresholds retained.', composition }, null, 2), contentType: 'application/json' });
  313 |   expect(composition.filter((r: any) => r.name === 'cl-seagrass')).toHaveLength(80); expect(composition.filter((r: any) => r.name === 'cl-kelp')).toHaveLength(25);
  314 |   for (const kind of ['grass', 'kelp']) {
  315 |     const rows = composition.filter((r: any) => r.habitat?.kind === kind); expect(rows).toHaveLength(kind === 'grass' ? 80 : 25);
  316 |     expect(new Set(rows.map((r: any) => r.habitat.grove)).size).toBe(5);
  317 |     for (let grove = 0; grove < 5; grove++) expect(rows.filter((r: any) => r.habitat.grove === grove)).toHaveLength(kind === 'grass' ? 16 : 5);
  318 |     expect(rows.some((r: any) => r.floorError !== null)).toBe(true);
  319 |     for (const row of rows) {
  320 |       expect(row.habitat.valid && row.visible, row.name + '/' + row.habitat.index).toBe(true); expect(row.habitat.radius).toBeGreaterThan(0); expect(Number.isFinite(row.habitat.seedX) && Number.isFinite(row.habitat.seedZ)).toBe(true);
  321 |       expect(row.denCount).toBe(4);
  322 |       const plant = row.name + '/' + row.habitat.index + ' at ' + JSON.stringify([row.x, row.z]) + ' radius ' + row.habitat.radius;
  323 |       expect(row.denClear, plant + ' den clearance: ' + JSON.stringify(row.denViolations)).toBe(true);
  324 |       expect(row.shelterClear, plant + ' shelter clearance: ' + JSON.stringify(row.shelterViolations)).toBe(true);
  325 |       expect(row.reefClear, plant + ' actual reef vertex clearance: ' + JSON.stringify(row.reefViolations)).toBe(true);
  326 |       expect(row.groups).toBe(0); expect(row.children).toBe(0); expect(row.vertices).toBe(kind === 'grass' ? 33 : 277); expect(row.triangles).toBe(kind === 'grass' ? 40 : 424);
  327 |       expect(row.spawnClearance).toBeGreaterThanOrEqual(row.habitat.radius - 1e-6); expect(row.routeClearance).toBeGreaterThanOrEqual(row.habitat.radius - 1e-6);
  328 |       expect(row.x + row.habitat.radius).toBeLessThanOrEqual(24.000001); expect(Math.max(Math.abs(row.x), Math.abs(row.z))).toBeLessThanOrEqual(78.000001);
  329 |       expect(row.roots.every((r: number[]) => r.every(Number.isFinite))).toBe(true); if (row.floorError !== null) expect(row.floorError).toBeLessThan(.055);
  330 |     }
  331 |   }
  332 |   const submitted = await native(page); rendered(submitted, quality);
  333 |   await step(page, 6); expect((await state(page)).motion).not.toEqual(initial.motion);
  334 |   await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  335 |   const paused = await state(page); await step(page, 4); const held = await state(page);
  336 |   for (const key of ['plants', 'motion', 'lights', 'top', 'bottom', 'causticOffset', 'causticOpacity', 'rays', 'time'] as const) expect(held[key]).toEqual(paused[key]);
  337 |   await clickCephalopodControl(page, 'Inspect'); await step(page, 2); const inspected = await state(page);
  338 |   await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await step(page, 5); const orbited = await state(page);
  339 |   expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.renders).toBeGreaterThan(inspected.renders); expect(orbited.plants).toEqual(paused.plants); expect(orbited.motion).toEqual(paused.motion); stable(orbited, quality);
  340 |   expect(orbited.staticWorld).toEqual(initial.staticWorld); expect(orbited.textures).toBe(initial.textures);
  341 |   await testInfo.attach('natural-habitat-native-contracts', { body: JSON.stringify({ quality, composition, submitted, initial, paused, shaftScope: initial.shaftSkip ? 'Existing software/low-power/reduced-motion skip retained; no seven-shaft natural-render claim.' : 'Seven existing shaft resources present; plant/sand/backdrop submissions are audited here, shaft pixels are reviewed separately.' }, null, 2), contentType: 'application/json' });
  342 |   await release(page);
  343 | });
  344 | 
  345 | test('diagnostic day and depth changes drive existing lighting while pause and reduced motion retain live resources', async ({ page }, testInfo) => {
  346 |   await mount(page, 'balanced', true);
  347 |   await page.evaluate(() => { const s = (window as any).__clLightingFixtureState; s.dayPeriodMs = 1e12; s.dayTime = 0; }); await step(page, 35);
  348 |   const day = await state(page); stable(day, 'balanced'); const dayNative = await native(page, ['sand', 'caustics', 'backdrop']); rendered(dayNative, 'balanced');
  349 |   const dayPixels = await diagnosticHarness.glPixels(page); expect(dayPixels).not.toBeNull(); expect(looksBlank(dayPixels!)).toBe(false);
  350 |   await testInfo.attach('diagnostic-shallow-day-gl-pixels', { body: dayPixels!.png, contentType: 'image/png' });
  351 |   await page.evaluate(() => { (window as any).__clLightingFixtureState.dayTime = .5; }); await step(page, 35);
  352 |   const night = await state(page), nightNative = await native(page, ['sand', 'caustics', 'backdrop']); rendered(nightNative, 'balanced');
  353 |   const nightPixels = await diagnosticHarness.glPixels(page); expect(nightPixels).not.toBeNull(); expect(looksBlank(nightPixels!)).toBe(false);
  354 |   await testInfo.attach('diagnostic-shallow-night-gl-pixels', { body: nightPixels!.png, contentType: 'image/png' });
  355 |   const key = (s: any) => s.lights.find((l: any) => l.type === 'DirectionalLight');
  356 |   expect(key(night).intensity).toBeLessThan(key(day).intensity * .35); expect(night.causticOpacity).toBeLessThan(day.causticOpacity * .01);
  357 |   expect(nightNative.find((r: any) => r.kind === 'sand').downwelling).toBeLessThan(.00001);
  358 |   const nativeKey = (rows: any[]) => rows.find((r: any) => r.kind === 'sand').keyLight.reduce((a: number, b: number) => a + b, 0);
  359 |   expect(nativeKey(nightNative)).toBeLessThan(nativeKey(dayNative) * .35);
  360 |   expect(night.top.reduce((a: number, b: number) => a + b, 0)).toBeLessThan(day.top.reduce((a: number, b: number) => a + b, 0));
  361 |   await page.evaluate(() => { const w = window as any; w.__clLightingFixtureState.dayTime = 0; w.__hlPlayer.position.x = 40; });
  362 |   await step(page, 110, ['KeyZ']); await step(page, 25); const deep = await state(page); stable(deep, 'balanced');
  363 |   expect(deep.player[1]).toBeLessThan(-10); expect(deep.causticVisible).toBe(false); expect(key(deep).intensity).toBeLessThan(key(day).intensity * .75);
  364 |   const deepNative = await native(page, ['sand', 'backdrop']); rendered(deepNative, 'balanced');
  365 |   const deepPixels = await diagnosticHarness.glPixels(page); expect(deepPixels).not.toBeNull(); expect(looksBlank(deepPixels!)).toBe(false);
  366 |   await testInfo.attach('diagnostic-deep-day-gl-pixels', { body: deepPixels!.png, contentType: 'image/png' });
  367 |   expect(deepNative.find((r: any) => r.kind === 'sand').downwelling).toBeLessThan(dayNative.find((r: any) => r.kind === 'sand').downwelling * .75);
  368 |   expect(nativeKey(deepNative)).toBeLessThan(nativeKey(dayNative) * .75);
  369 |   await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2);
  370 |   const reduced = await state(page); await step(page, 7); const still = await state(page);
  371 |   expect(still.motion).toEqual(reduced.motion); expect(still.motion.every((m: number[]) => m[3] === 0)).toBe(true); expect(still.causticOffset).toEqual(reduced.causticOffset); expect(still.rays).toEqual(reduced.rays); stable(still, 'balanced');
  372 |   await step(page, 8, ['KeyQ']); const risen = await state(page); expect(risen.player[1]).toBeGreaterThan(still.player[1]); expect(risen.motion).toEqual(still.motion);
  373 |   await page.locator(canvas).focus(); await page.keyboard.press('Escape'); const paused = await state(page); await step(page, 6); const held = await state(page);
  374 |   expect(held.lights).toEqual(paused.lights); expect(held.top).toEqual(paused.top); expect(held.bottom).toEqual(paused.bottom); expect(held.causticOffset).toEqual(paused.causticOffset); expect(held.rays).toEqual(paused.rays);
  375 |   expect(held.staticWorld).toEqual(day.staticWorld); expect(held.textures).toBe(day.textures);
  376 |   await testInfo.attach('explicit-day-depth-diagnostic', { body: JSON.stringify({ scope: 'Only this case uses a separate exact-reverse-proof state-reference exposure. DayTime is set, existing Dive/Ascend input changes authoritative depth, and the unmodified production frame updates existing resources. No natural-placement or forced-shaft visual claim.', day, night, deep, dayNative, nightNative, deepNative }, null, 2), contentType: 'application/json' });
  377 |   await release(page, diagnosticHarness);
  378 | });
  379 | 
  380 | test('phone natural habitat draws visible GL pixels and releases every owned plant and lighting resource exactly once', async ({ page }, testInfo) => {
  381 |   await page.setViewportSize({ width: 390, height: 844 }); await mount(page, 'balanced');
  382 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await step(page, 4);
  383 |   const submitted = await native(page); rendered(submitted, 'balanced'); const current = await state(page); stable(current, 'balanced');
  384 |   const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  385 |   expect(pixels!.width).toBeGreaterThan(250); expect(pixels!.height).toBeGreaterThan(100); expect(pixels!.significantColors).toBeGreaterThan(3);
  386 |   await testInfo.attach('phone-natural-gl-pixels', { body: pixels!.png, contentType: 'image/png' });
  387 |   await testInfo.attach('phone-native-submissions', { body: JSON.stringify({ submitted, rendererName: current.rendererName, shafts: current.shafts, shaftSkip: current.shaftSkip, pixelStats: { ...pixels, png: undefined } }, null, 2), contentType: 'application/json' });
  388 |   await release(page);
  389 | });
  390 | 
  391 | test('explicit forced-effects diagnostic submits all seven softened shafts and four existing rays without claiming natural coverage', async ({ page }, testInfo) => {
  392 |   await page.addInitScript(() => { (window as any).__alloForceFX = true; });
  393 |   await mount(page, 'balanced', true, true);
  394 |   await page.evaluate(() => { const s = (window as any).__clLightingFixtureState; s.dayPeriodMs = 1e12; s.dayTime = 0; }); await step(page, 25);
  395 |   const initial = await state(page); stable(initial, 'balanced'); expect(initial.shafts).toBe(7); expect(initial.legacyRays).toBe(4);
  396 |   await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  397 |   await page.evaluate(() => {
  398 |     const w = window as any, T = w.THREE, camera = w.__hlCamera;
  399 |     const forward = camera.getWorldDirection(new T.Vector3()), right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  400 |     w.__hlForcedFixture = { scope: 'ForceFX bypasses the existing software skip. All eleven existing planes are placed on the current optical ray only for shader submission diagnostics; these positions are excluded from natural scene images.',
  401 |       original: [...w.__hlShafts, ...w.__hlRays].map((m: any) => ({ uuid: m.uuid, position: m.position.toArray(), quaternion: m.quaternion.toArray() })) };
  402 |     [...w.__hlShafts, ...w.__hlRays].forEach((mesh: any, index: number) => {
  403 |       const location = camera.position.clone().addScaledVector(forward, 12 + index * .2).addScaledVector(right, (index - 5) * .26);
  404 |       mesh.position.copy(mesh.parent.worldToLocal(location)); mesh.quaternion.copy(camera.quaternion); mesh.updateMatrixWorld(true);
  405 |     });
  406 |   });
  407 |   const kinds = [...Array.from({ length: 7 }, (_, i) => 'shaft-' + i), ...Array.from({ length: 4 }, (_, i) => 'ray-' + i)];
  408 |   const submitted = await native(page, kinds); rendered(submitted, 'balanced'); expect(submitted).toHaveLength(11);
```