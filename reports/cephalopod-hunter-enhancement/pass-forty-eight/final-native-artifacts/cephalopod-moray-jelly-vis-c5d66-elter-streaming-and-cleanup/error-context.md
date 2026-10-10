# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-moray-jelly-visuals.spec.ts >> low moray and moon jellies render live anatomy and preserve shelter streaming and cleanup
- Location: tests\e2e\cephalopod-moray-jelly-visuals.spec.ts:87:57

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
  5   | const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
  6   | async function advance(page: Page, frames: number) { await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__mjStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__mjStep !== 0); } }, frames); }
  7   | async function mount(page: Page, quality: 'low' | 'balanced') {
  8   |   await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  9   |   await page.evaluate(() => {
  10  |     const w = window as any, T = w.THREE;
  11  |     w.__mjScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene; w.__mjPlayer = w.__mjScene.getObjectByName('cl-player');
  12  |     w.__mjMoray = w.__mjScene.children.find((object: any) => 'homeX' in object.userData && object.userData.aggroRange);
  13  |     w.__mjHome = w.__mjScene.getObjectByName('cl-moray-home');
  14  |     w.__mjJellies = w.__mjScene.children.filter((object: any) => object.userData.bellGeo && object.userData.tents);
  15  |     w.__mjDens = w.__mjScene.children.filter((object: any) => object.name === 'cl-den' || object.name === 'cl-home');
  16  |     if (!w.__mjMoray || !w.__mjHome || w.__mjJellies.length !== 5 || w.__mjDens.length !== 4) throw new Error('Expected the real moray and home, five ambient jellies and four initial dens');
  17  |     w.__mjStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__mjStep; w.__mjStep = 0; return dt; };
  18  |     w.__mjScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; if (object.userData.substrate === 'rock') { object.position.x = -18; object.position.z = -18; object.userData.substrateRadius = 0; } });
  19  |     // Keep the moray's real home. Move the player into its approach and one
  20  |     // existing ambient jelly above that approach for non-vacuous native draws.
  21  |     w.__mjPlayer.position.x = w.__mjMoray.userData.homeX; w.__mjPlayer.position.z = w.__mjMoray.userData.homeZ - 4;
  22  |     w.__mjJelly = [...w.__mjJellies].sort((a: any, b: any) => Math.sin(a.userData.verticalPhase) - Math.sin(b.userData.verticalPhase))[0]; w.__mjJelly.position.x = w.__mjPlayer.position.x; w.__mjJelly.position.z = w.__mjPlayer.position.z + 2;
  23  |     // This diagnostic placement uses the settled bob height so all bell and arm draws stay in view.
  24  |     w.__mjJelly.userData.verticalOffset = 0;
  25  |     w.__mjOwned = []; w.__mjResources = []; w.__mjPrograms = new Map(); w.__mjNative = new Map(); w.__mjNativeStable = true; w.__mjEpoch = 0; w.__mjDrawEpoch = {}; w.__mjKinds = [];
  26  |     w.__mjTrack = (owner: any, type: string) => owner.traverse((mesh: any) => {
  27  |       if (!mesh.isMesh) return;
  28  |       w.__mjOwned.push({ mesh, type, dynamicBell: mesh.geometry === owner.userData.bellGeo, geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
  29  |         attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])) });
  30  |       [mesh.geometry, ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material])].forEach((resource: any) => { if (w.__mjResources.some((row: any) => row.resource === resource)) return; const row = { resource, disposed: 0 }; resource.addEventListener('dispose', () => row.disposed++); w.__mjResources.push(row); });
  31  |     });
  32  |     w.__mjTrack(w.__mjMoray, 'moray'); w.__mjTrack(w.__mjHome, 'home'); w.__mjJellies.forEach((jelly: any) => w.__mjTrack(jelly, 'jelly'));
  33  |     w.__mjBellPasses = []; w.__mjBellProgramObjects = [];
  34  |     w.__mjWatch = (mesh: any, kind: string) => {
  35  |       const split = Array.isArray(mesh.material); w.__mjKinds.push(...(split ? mesh.material.map((_: any, i: number) => kind + '/group-' + i) : [kind])); const previous = mesh.onAfterRender;
  36  |       mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
  37  |         previous.call(this, renderer, scene, camera, geometry, material, group); w.__mjRenderer = renderer; w.__mjCamera = camera;
  38  |         const drawKind = split ? kind + '/group-' + group.materialIndex : kind; w.__mjDrawEpoch[drawKind] = w.__mjEpoch;
  39  |         const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), at = gl.getUniformLocation(program, 'normalMatrix'), normal = at === null ? null : Array.from(gl.getUniform(program, at));
  40  |         if (mesh.name === 'cl-jelly-bell') {
  41  |           if (group.materialIndex === 0) w.__mjBellPasses = [];
  42  |           w.__mjBellPasses.push({ side: material.side, materialIndex: group.materialIndex, start: group.start, count: group.count, culling: gl.isEnabled(gl.CULL_FACE), cullsBack: gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK, frontFaceCW: gl.getParameter(gl.FRONT_FACE) === gl.CW });
  43  |           w.__mjBellProgramObjects[group.materialIndex] = program;
  44  |         }
  45  |         const bindings = ['position', ...(material.isMeshStandardMaterial ? ['normal'] : []), ...(material.vertexColors ? ['color'] : [])].map(name => {
  46  |           const location = gl.getAttribLocation(program, name), buffer = location < 0 ? null : gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = drawKind + '/' + name;
  47  |           if (w.__mjNative.has(key)) w.__mjNativeStable &&= w.__mjNative.get(key) === buffer; else w.__mjNative.set(key, buffer);
  48  |           return { name, size: location < 0 ? 0 : gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: location >= 0 && gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer };
  49  |         });
  50  |         if (w.__mjPrograms.has(drawKind)) return;
  51  |         w.__mjPrograms.set(drawKind, { kind: drawKind, side: material.side, group: group ? { start: group.start, count: group.count, materialIndex: group.materialIndex } : null,
  52  |           linked: gl.getProgramParameter(program, gl.LINK_STATUS), standard: !!material.isMeshStandardMaterial, vertexColors: !!material.vertexColors, key: material.customProgramCacheKey(), bindings, normal,
  53  |           determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null, shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
  54  |       };
  55  |     };
  56  |     w.__mjMoray.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'moray-' + i)); w.__mjWatch(w.__mjHome, 'home'); w.__mjJelly.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'jelly-' + i));
  57  |     const head = w.__mjMoray.children[1], p = head.geometry.attributes.position, front = new T.Vector3(); let maxZ = -Infinity;
  58  |     head.updateMatrix(); for (let i = 0; i < p.count; i++) { const point = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(head.matrix); if (point.z > maxZ) { maxZ = point.z; front.copy(point); } }
  59  |     w.__mjNose = front;
  60  |   });
  61  |   await page.locator(canvas).focus(); await advance(page, 12);
  62  | }
  63  | async function state(page: Page) {
  64  |   return page.evaluate(() => {
  65  |     const w = window as any, m = w.__mjMoray; w.__mjScene.updateMatrixWorld(true);
  66  |     const nose = w.__mjNose.clone().applyMatrix4(m.matrixWorld).sub(m.position).setY(0).normalize();
  67  |     return { moray: m.matrixWorld.toArray(), position: m.position.toArray(), state: m.userData.state, canBite: !!m.userData.canBite, nose: nose.toArray(), towardPlayer: w.__mjPlayer.position.clone().sub(m.position).setY(0).normalize().toArray(),
  68  |       jellyPositions: w.__mjJellies.map((jelly: any) => jelly.position.toArray()), jellyRotations: w.__mjJellies.map((jelly: any) => jelly.quaternion.toArray()),
  69  |       jellyBellVersions: w.__mjJellies.map((jelly: any) => [jelly.userData.bellGeo.attributes.position.version, jelly.userData.bellGeo.attributes.normal.version]),
  70  |       jellyWorld: w.__mjJellies.map((jelly: any) => jelly.matrixWorld.toArray()), phases: w.__mjJellies.map((jelly: any) => [jelly.userData.pulsePhase, jelly.userData.verticalPhase]),
  71  |       trails: w.__mjJellies.map((jelly: any) => jelly.children.map((mesh: any) => mesh.matrix.toArray())), bell: Array.from(w.__mjJelly.userData.bellGeo.attributes.position.array), normals: Array.from(w.__mjJelly.userData.bellGeo.attributes.normal.array),
  72  |       time: document.querySelector('[data-hud=time]')?.textContent, health: Number(document.querySelector('[data-hud=health]')?.textContent), camera: w.__mjCamera.position.toArray(),
  73  |       stable: w.__mjOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.geometry.index?.array === row.indexArray && (!row.indices || row.indices.every((value: number, i: number) => value === row.indexArray[i])) && Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && ((row.dynamicBell && (name === 'position' || name === 'normal')) || (prior.attr.version === prior.version && prior.values.every((value: number, i: number) => value === prior.array[i]))))),
  74  |       finite: w.__mjOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))), nativeStable: w.__mjNativeStable, disposed: w.__mjResources.map((row: any) => row.disposed), textures: w.__mjRenderer.info.memory.textures };
  75  |   });
  76  | }
  77  | async function freshDraws(page: Page, kinds?: string[]) { return page.evaluate(async requested => { const w = window as any, names = requested || w.__mjKinds, epoch = ++w.__mjEpoch; for (let i = 0; i < 60 && names.some((name: string) => w.__mjDrawEpoch[name] !== epoch); i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return names.every((name: string) => w.__mjDrawEpoch[name] === epoch); }, kinds); }
> 78  | function stable(value: Awaited<ReturnType<typeof state>>, textures: number) { expect(value.stable && value.finite && value.nativeStable).toBe(true); expect(value.disposed.every((count: number) => count === 0)).toBe(true); expect(value.textures).toBe(textures); }
      |                                                                                                                                          ^ Error: expect(received).toBe(expected) // Object.is equality
  79  | function dot(a: number[], b: number[]) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
  80  | function programs(rows: any[]) { for (const row of rows) { expect(row.linked, row.kind).toBe(true); expect(row.shaders).toHaveLength(2); expect(row.shaders.every((shader: any) => shader.compiled)).toBe(true); for (const binding of row.bindings) { expect(binding.enabled && binding.bound, row.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); } if (row.standard) { expect(row.normal).toHaveLength(9); expect(row.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(row.determinant)).toBeGreaterThan(1e-8); } if (row.vertexColors) expect(row.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR'); } }
  81  | 
  82  | test.describe.configure({ timeout: 480000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
  83  | test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
  84  | test.beforeEach(({ page }) => { const entries: string[] = []; errors.set(page, entries); page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); }); });
  85  | test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
  86  | 
  87  | for (const quality of ['low', 'balanced'] as const) test(`${quality} moray and moon jellies render live anatomy and preserve shelter streaming and cleanup`, async ({ page }) => {
  88  |   await mount(page, quality); expect(await freshDraws(page)).toBe(true);
  89  |   const anatomy = await page.evaluate(() => {
  90  |     const w = window as any; return { morayNames: w.__mjMoray.children.map((mesh: any) => mesh.name), jellies: w.__mjJellies.map((jelly: any) => ({ count: jelly.children.length, phases: jelly.userData.tents.length, materials: new Set(jelly.children.flatMap((mesh: any) => Array.isArray(mesh.material) ? mesh.material : [mesh.material])).size,
  91  |       transparent: jelly.children.every((mesh: any) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every((material: any) => material.transparent && !material.depthWrite && material.blending === w.THREE.NormalBlending)), vertices: jelly.children.reduce((n: number, mesh: any) => n + mesh.geometry.attributes.position.count, 0), triangles: jelly.children.reduce((n: number, mesh: any) => n + mesh.geometry.index.count / 3, 0) })), programs: [...w.__mjPrograms.values()], bellPasses: w.__mjBellPasses, bellProgramsDistinct: w.__mjBellProgramObjects.length === 2 && new Set(w.__mjBellProgramObjects).size === 2 };
  92  |   });
  93  |   expect(anatomy.morayNames).toEqual(['cl-moray-body', 'cl-moray-head', 'cl-moray-eye-0', 'cl-moray-eye-1']); expect(anatomy.jellies).toHaveLength(5);
  94  |   for (const jelly of anatomy.jellies) { expect(jelly.count).toBe(8); expect(jelly.phases).toBe(6); expect(jelly.materials).toBe(9); expect(jelly.transparent).toBe(true); expect(jelly.vertices).toBeLessThanOrEqual(2500); expect(jelly.triangles).toBeLessThanOrEqual(3500); }
  95  |   expect(anatomy.programs).toHaveLength(14); programs(anatomy.programs);
  96  |   expect(anatomy.bellPasses).toEqual([
  97  |     { side: 1, materialIndex: 0, start: 0, count: 2736, culling: true, cullsBack: true, frontFaceCW: true },
  98  |     { side: 0, materialIndex: 1, start: 0, count: 2736, culling: true, cullsBack: true, frontFaceCW: false }
  99  |   ]); expect(anatomy.bellProgramsDistinct).toBe(true);
  100 |   const bellPrograms = anatomy.programs.filter((row: any) => row.kind.startsWith('jelly-0/group-')); expect(bellPrograms).toHaveLength(2);
  101 |   for (const [index, row] of bellPrograms.entries()) {
  102 |     expect(row.kind).toBe('jelly-0/group-' + index); expect(row.side).toBe(index === 0 ? 1 : 0);
  103 |     expect(row.group).toEqual({ start: 0, count: 2736, materialIndex: index });
  104 |     const shaderText = row.shaders.map((shader: any) => shader.source).join('\n'); expect(shaderText).not.toContain('#define DOUBLE_SIDED');
  105 |     if (index === 0) expect(shaderText).toContain('#define FLIP_SIDED'); else expect(shaderText).not.toContain('#define FLIP_SIDED');
  106 |   }
  107 |   const homeProgram = anatomy.programs.find((row: any) => row.kind === 'home'); expect(homeProgram.key).toBe('cl-rock-surface-v1'); expect(homeProgram.shaders.map((shader: any) => shader.source).join('\n')).toContain('clRockValueNoise');
  108 |   const initial = await state(page); stable(initial, initial.textures); await advance(page, 8); const living = await state(page); stable(living, initial.textures);
  109 |   expect(living.phases).not.toEqual(initial.phases); expect(living.jellyWorld).not.toEqual(initial.jellyWorld); expect(living.bell).not.toEqual(initial.bell);
  110 |   await page.evaluate(() => { const w = window as any; Object.assign(w.__mjMoray.userData, { state: 'attacking', stateTimer: 0, cooldownUntil: 0, awareness: 1, lostFor: 0, lastSeen: w.__mjPlayer.position.clone() }); });
  111 |   const beforePursuit = await state(page); await advance(page, 2); const pursuit = await state(page); expect(pursuit.state).toBe('attacking'); expect(pursuit.canBite).toBe(true); expect(pursuit.position).not.toEqual(beforePursuit.position); expect(dot(pursuit.nose, pursuit.towardPlayer)).toBeGreaterThan(.997);
  112 |   await page.evaluate(() => { const w = window as any; w.__mjMoray.userData.state = 'returning'; w.__mjMoray.userData.cooldownUntil = 1e9; }); await advance(page, 2); const returning = await state(page); expect(returning.position).not.toEqual(pursuit.position);
  113 |   await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); const paused = await state(page); await advance(page, 8); const held = await state(page);
  114 |   for (const key of ['moray', 'jellyWorld', 'phases', 'trails', 'bell', 'normals', 'time'] as const) expect(held[key]).toEqual(paused[key]); stable(held, initial.textures);
  115 |   await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page); await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page);
  116 |   expect(orbited.camera).not.toEqual(inspected.camera); for (const key of ['moray', 'jellyWorld', 'phases', 'trails', 'bell', 'normals', 'time'] as const) expect(orbited[key]).toEqual(inspected[key]); stable(orbited, initial.textures);
  117 |   await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  118 |   await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  119 |   const reduced = await state(page); await advance(page, 7); const moving = await state(page); stable(moving, initial.textures);
  120 |   for (const key of ['phases', 'jellyRotations', 'jellyBellVersions', 'bell', 'normals', 'trails'] as const) expect(moving[key]).toEqual(reduced[key]);
  121 |   moving.jellyPositions.forEach((position: number[], index: number) => {
  122 |     const prior = reduced.jellyPositions[index]; expect(position[1]).toBe(prior[1]);
  123 |     expect(Math.hypot(position[0] - prior[0], position[2] - prior[2])).toBeGreaterThan(.01);
  124 |   });
  125 | 
  126 |   if (quality === 'low') {
  127 |     await page.evaluate(() => { const w = window as any; w.__mjPlayer.position.x = -220; w.__mjPlayer.position.z = 0; });
  128 |     let spawned = false;
  129 |     for (let step = 0; step < 10 && !spawned; step++) { await advance(page, 1); spawned = await page.evaluate(() => { const w = window as any; return w.__mjScene.children.some((object: any) => object.name === 'cl-den' && !w.__mjDens.includes(object)); }); }
  130 |     expect(spawned).toBe(true);
  131 |     const den = await page.evaluate(() => {
  132 |       const w = window as any, added = w.__mjScene.children.filter((object: any) => object.name === 'cl-den' && !w.__mjDens.includes(object)); if (added.length !== 1) throw new Error('The counted fixture must stop after the first streamed den');
  133 |       w.__mjDen = added[0]; w.__mjTrack(w.__mjDen, 'den'); w.__mjDen.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'den-' + i));
  134 |       const distance = Math.hypot(w.__mjDen.position.x - w.__mjPlayer.position.x, w.__mjDen.position.z - w.__mjPlayer.position.z);
  135 |       w.__mjPlayer.position.x = w.__mjDen.position.x; w.__mjPlayer.position.z = w.__mjDen.position.z - .4;
  136 |       return { count: w.__mjDen.children.length, distance, materials: new Set(w.__mjDen.children.map((mesh: any) => mesh.material)).size, names: w.__mjDen.children.slice(0, 3).map((mesh: any) => mesh.name) };
  137 |     });
  138 |     expect(den.count).toBe(5); expect(den.materials).toBe(3); expect(den.names).toEqual(Array(3).fill('cl-den-rock')); expect(den.distance).toBeGreaterThanOrEqual(55); expect(den.distance).toBeLessThanOrEqual(95);
  139 |     await advance(page, 5); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=status]')).toContainText('IN DEN');
  140 |     const sheltered = await state(page);
  141 |     const ground = await page.evaluate(() => {
  142 |       const w = window as any, T = w.THREE, den = w.__mjDen; w.__mjScene.updateMatrixWorld(true);
  143 |       const ray = new T.Raycaster(new T.Vector3(den.position.x, 50, den.position.z), new T.Vector3(0, -1, 0)), hit = ray.intersectObject(w.__mjScene.getObjectByName('cl-seafloor'), false)[0];
  144 |       return { groundError: hit ? Math.abs(hit.point.y - den.position.y) : null, light: den.children[4].material.opacity };
  145 |     });
  146 |     expect(ground.groundError).not.toBeNull(); expect(ground.groundError!).toBeLessThan(.025); expect(ground.light).toBeGreaterThan(.3);
  147 |     expect(await freshDraws(page, ['den-0', 'den-1', 'den-2', 'den-3', 'den-4'])).toBe(true);
  148 |     const denPrograms = await page.evaluate(() => [...(window as any).__mjPrograms.values()].filter((row: any) => row.kind.startsWith('den-'))); expect(denPrograms).toHaveLength(5); programs(denPrograms);
  149 |     for (const row of denPrograms.filter((row: any) => ['den-0', 'den-1', 'den-2'].includes(row.kind))) { expect(row.key).toBe('cl-rock-surface-v1'); expect(row.shaders.map((shader: any) => shader.source).join('\n')).toContain('clRockValueNoise'); }
  150 |     await page.keyboard.press('Escape');
  151 |     await page.evaluate(async () => { const w = window as any, m = w.__mjMoray; m.position.copy(w.__mjPlayer.position).add(new w.THREE.Vector3(0, 0, .7)); Object.assign(m.userData, { state: 'attacking', stateTimer: 0, cooldownUntil: 0, awareness: 1, lostFor: 0, lastSeen: w.__mjPlayer.position.clone() }); w.__mjStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__mjStep !== 0); });
  152 |     await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=status]')).toContainText('IN DEN'); const defended = await state(page); expect(defended.canBite).toBe(false); expect(defended.state).toBe('returning'); expect(defended.health).toBeGreaterThanOrEqual(sheltered.health); stable(defended, initial.textures);
  153 |   }
  154 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  155 |   expect(await page.evaluate(() => (window as any).__mjResources.every((row: any) => row.disposed >= 1))).toBe(true);
  156 | });
  157 | 
```