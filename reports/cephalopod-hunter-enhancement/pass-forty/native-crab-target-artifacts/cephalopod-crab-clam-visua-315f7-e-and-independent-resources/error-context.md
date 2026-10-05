# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-crab-clam-visuals.spec.ts >> balanced crab and clam surfaces render natively and preserve drilling, capture and independent resources
- Location: tests\e2e\cephalopod-crab-clam-visuals.spec.ts:138:57

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Help / settings', exact: true })

```

# Test source

```ts
  86  |     for (let i = 1; i < positions.count; i++) {
  87  |       const squared = (j: number) => positions.getX(j) ** 2 + positions.getY(j) ** 2 + positions.getZ(j) ** 2;
  88  |       if (squared(i) < squared(hinge)) hinge = i;
  89  |       if (positions.getZ(i) > positions.getZ(front)) front = i;
  90  |     }
  91  |     w.__ccHinge = new T.Vector3().fromBufferAttribute(positions, hinge); w.__ccFront = new T.Vector3().fromBufferAttribute(positions, front);
  92  |   }, quality);
  93  |   await page.locator(canvas).focus(); await advance(page, 6);
  94  | }
  95  | 
  96  | async function state(page: Page) {
  97  |   return page.evaluate(() => {
  98  |     const w = window as any; w.__ccScene.updateMatrixWorld(true);
  99  |     const geometries = new Set(), materials = new Set();
  100 |     w.__ccScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
  101 |     const upper = w.__ccMeal.children[1];
  102 |     return { crabWorld: w.__ccCrabs.map((crab: any) => crab.matrixWorld.toArray()), legs: w.__ccCrabs.map((crab: any) => crab.children.slice(3, 9).map((leg: any) => leg.position.y)),
  103 |       phases: w.__ccCrabs.map((crab: any) => crab.userData.legPhase), clamWorld: w.__ccClams.map((clam: any) => clam.matrixWorld.toArray()),
  104 |       upperAngle: upper.rotation.x, hinge: w.__ccHinge.clone().applyMatrix4(upper.matrixWorld).toArray(), front: w.__ccFront.clone().applyMatrix4(upper.matrixWorld).toArray(), hingeLocalLength: w.__ccHinge.length(),
  105 |       time: document.querySelector('[data-hud=time]')?.textContent, camera: w.__ccCamera.position.toArray(),
  106 |       meals: w.__toolData.cephalopodLab.huntsSuccessful || 0,
  107 |       aliveClams: w.__ccClams.filter((clam: any) => clam.userData.alive && clam.parent === w.__ccScene).length,
  108 |       aliveCrabs: w.__ccCrabs.filter((crab: any) => crab.userData.alive && crab.parent === w.__ccScene).length,
  109 |       stable: w.__ccOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.geometry.index?.array === row.indexArray &&
  110 |         Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && prior.attr.version === prior.version)),
  111 |       staticBuffers: w.__ccOwned.every((row: any) => Object.values(row.attrs).every((prior: any) => prior.values.every((value: number, index: number) => value === prior.array[index])) && (!row.indices || row.indices.every((value: number, index: number) => value === row.indexArray[index]))),
  112 |       finite: w.__ccOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))),
  113 |       disposed: w.__ccResources.filter((row: any) => row.disposed).length, geometries: geometries.size, materials: materials.size, textures: w.__ccRenderer.info.memory.textures };
  114 |   });
  115 | }
  116 | 
  117 | async function freshDraws(page: Page) {
  118 |   return page.evaluate(async () => {
  119 |     const w = window as any, epoch = ++w.__ccEpoch;
  120 |     for (let frame = 0; frame < 60 && w.__ccKinds.some((kind: string) => w.__ccDrawEpoch[kind] !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  121 |     return w.__ccKinds.map((kind: string) => ({ kind, fresh: w.__ccDrawEpoch[kind] === epoch }));
  122 |   });
  123 | }
  124 | function stable(now: Awaited<ReturnType<typeof state>>, before: Awaited<ReturnType<typeof state>>) {
  125 |   expect(now.stable && now.staticBuffers && now.finite).toBe(true); expect(now.disposed).toBe(0);
  126 |   expect(now.geometries).toBe(before.geometries); expect(now.materials).toBe(before.materials); expect(now.textures).toBe(before.textures);
  127 | }
  128 | 
  129 | test.describe.configure({ timeout: 180000, retries: 0 });
  130 | test.use({ video: 'off', trace: 'off' });
  131 | test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
  132 | test.beforeEach(({ page }) => {
  133 |   const entries: string[] = []; errors.set(page, entries);
  134 |   page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); });
  135 | });
  136 | test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
  137 | 
  138 | for (const quality of ['low', 'balanced'] as const) test(`${quality} crab and clam surfaces render natively and preserve drilling, capture and independent resources`, async ({ page }) => {
  139 |   await mount(page, quality); expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);
  140 |   const anatomy = await page.evaluate(() => {
  141 |     const w = window as any;
  142 |     return { crabCounts: w.__ccCrabs.map((crab: any) => ({ type: crab.userData.type, children: crab.children.length, allMeshes: crab.children.every((mesh: any) => mesh.isMesh) })),
  143 |       clams: w.__ccClams.map((clam: any) => ({ names: clam.children.map((mesh: any) => mesh.name), materials: new Set(clam.children.map((mesh: any) => mesh.material)).size,
  144 |         vertices: clam.children.reduce((n: number, mesh: any) => n + mesh.geometry.attributes.position.count, 0), triangles: clam.children.reduce((n: number, mesh: any) => n + mesh.geometry.index.count / 3, 0) })),
  145 |       programs: [...w.__ccPrograms.values()], keys: w.__ccKinds,
  146 |       textureFree: w.__ccOwned.every((row: any) => Object.values(row.material).every((value: any) => !value?.isTexture)) };
  147 |   });
  148 |   expect(anatomy.crabCounts).toHaveLength(10); expect(anatomy.clams).toHaveLength(8); expect(anatomy.textureFree).toBe(true);
  149 |   const inventory = anatomy.crabCounts.reduce((counts: Record<string, number>, crab: any) => { counts[crab.type] = (counts[crab.type] || 0) + 1; return counts; }, {});
  150 |   expect(inventory).toEqual(quality === 'low' ? { rock: 6, red: 4 } : { rock: 6, hermit: 4 });
  151 |   for (const crab of anatomy.crabCounts) { expect(crab.allMeshes).toBe(true); expect(crab.children).toBe(crab.type === 'hermit' ? 15 : 11); }
  152 |   for (const clam of anatomy.clams) { expect(clam.names).toEqual(['cl-clam-lower', 'cl-clam-upper']); expect(clam.materials).toBe(2); expect(clam.vertices).toBeLessThanOrEqual(1100); expect(clam.triangles).toBeLessThanOrEqual(2000); }
  153 |   expect(anatomy.programs.map((program: any) => program.kind).sort()).toEqual(anatomy.keys.sort());
  154 |   for (const program of anatomy.programs) {
  155 |     if (['crab-body','hermit-body','red-body'].includes(program.kind)) { expect(program.surfaceKey).toBe('cl-crab-cuticle-v1'); expect(program.cuticleScale).toBeGreaterThan(0); expect(program.cuticleHermit).toBe(program.kind==='hermit-body'?1:0); const emitted=program.shaders.map((shader:any)=>shader.source).join('\n'); expect(emitted).toContain('clCrabCuticle'); expect(emitted).toContain('#define CL_CRAB_FILTERED 1'); } else { expect(program.cuticleScale).toBeNull(); expect(program.cuticleHermit).toBeNull(); }
  156 |     expect(program.linked, program.kind).toBe(true); expect(program.shaders).toHaveLength(2); expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
  157 |     for (const binding of program.bindings) { expect(binding.enabled && binding.bound, program.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); }
  158 |     if (program.standard) { expect(program.normal).toHaveLength(9); expect(program.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(program.determinant)).toBeGreaterThan(1e-8); }
  159 |     if (program.vertexColors) expect(program.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR');
  160 |   }
  161 |   const initial = await state(page); stable(initial, initial); expect(initial.hingeLocalLength).toBeLessThan(1e-6);
  162 |   await advance(page, 6); const walking = await state(page); stable(walking, initial);
  163 |   expect(walking.legs).not.toEqual(initial.legs); expect(walking.crabWorld).not.toEqual(initial.crabWorld); expect(walking.clamWorld).toEqual(initial.clamWorld);
  164 | 
  165 |   await forage(page).click(); await advance(page, 10); const drilling = await state(page);
  166 |   expect(drilling.upperAngle).toBeLessThan(-.05); expect(drilling.front[1]).toBeGreaterThan(initial.front[1] + .02); expect(drilling.hinge).toEqual(initial.hinge);
  167 |   await expect(page.getByRole('progressbar', { name: 'Foraging progress' })).toBeVisible();
  168 |   await page.keyboard.press('Escape'); await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  169 |   const cancelled = await state(page); expect(cancelled.upperAngle).toBe(0); expect(cancelled.meals).toBe(0);
  170 |   await advance(page, 6); const paused = await state(page); stable(paused, initial); expect(paused.legs).toEqual(cancelled.legs); expect(paused.crabWorld).toEqual(cancelled.crabWorld); expect(paused.phases).toEqual(cancelled.phases);
  171 |   await page.keyboard.press('Escape'); await advance(page, 5); expect((await state(page)).upperAngle).toBe(0);
  172 | 
  173 |   await forage(page).click(); await advance(page, 6); expect((await state(page)).upperAngle).toBeLessThan(0);
  174 |   await page.keyboard.down('KeyW'); await advance(page, 2); await page.keyboard.up('KeyW');
  175 |   await expect(forage(page)).toHaveAttribute('aria-pressed', 'false'); expect((await state(page)).upperAngle).toBe(0);
  176 |   await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page);
  177 |   await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page);
  178 |   stable(orbited, initial); expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.legs).toEqual(inspected.legs); expect(orbited.phases).toEqual(inspected.phases); expect(orbited.crabWorld).toEqual(inspected.crabWorld); expect(orbited.clamWorld).toEqual(inspected.clamWorld); expect(orbited.time).toBe(inspected.time);
  179 |   if (quality === 'balanced') {
  180 |     await page.setViewportSize({ width: 390, height: 844 });
  181 |     await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await advance(page, 5);
  182 |     await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
  183 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  184 |   }
  185 |   await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 6);
> 186 |   await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
      |                                                                            ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  187 |   await advance(page, 2); const reduced = await state(page); await advance(page, 5); const quiet = await state(page); stable(quiet, initial);
  188 |   // Existing crab walking remains active under reduced motion; neither the
  189 |   // geometry upgrade nor this fixture changes that simulation behavior.
  190 |   expect(quiet.legs).not.toEqual(reduced.legs); expect(quiet.phases).not.toEqual(reduced.phases); expect(quiet.upperAngle).toBe(0); expect(quiet.meals).toBe(0);
  191 |   await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 4);
  192 |   expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);
  193 | 
  194 |   // Real latched foraging completes one meal and releases only that clam's
  195 |   // owned buffers/materials. Its still-live neighbor remains renderable.
  196 |   await forage(page).click(); await advance(page, 40); const eaten = await state(page);
  197 |   expect(eaten.meals).toBe(1); expect(eaten.aliveClams).toBe(7); expect(eaten.aliveCrabs).toBe(10); expect(eaten.stable && eaten.staticBuffers && eaten.finite).toBe(true);
  198 |   await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  199 |   const disposal = await page.evaluate(() => {
  200 |     const w = window as any;
  201 |     return { own: w.__ccResources.filter((row: any) => row.owner === w.__ccMeal).map((row: any) => row.disposed), untouched: w.__ccResources.filter((row: any) => row.owner !== w.__ccMeal).every((row: any) => row.disposed === 0), alive: w.__ccNeighbor.userData.alive };
  202 |   });
  203 |   expect(disposal.own).toEqual([1, 1, 1, 1]); expect(disposal.untouched && disposal.alive).toBe(true);
  204 |   expect(await page.evaluate(async () => {
  205 |     const w = window as any, epoch = ++w.__ccEpoch;
  206 |     for (let i = 0; i < 30 && w.__ccDrawEpoch['clam-neighbor'] !== epoch; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  207 |     return w.__ccDrawEpoch['clam-neighbor'] === epoch;
  208 |   })).toBe(true);
  209 | 
  210 |   await page.evaluate(() => {
  211 |     const w = window as any;
  212 |     w.__ccCrabs.forEach((crab: any) => { crab.position.set(18, .18, 18); crab.userData.speed = 0; });
  213 |     w.__ccCatch.position.set(w.__ccPlayer.position.x, .18, w.__ccPlayer.position.z + 1.4);
  214 |     w.__ccSheltersBefore = w.__ccScene.children.filter((object: any) => object.userData.shelterType).map((object: any) => object.uuid);
  215 |   });
  216 |   await page.locator(canvas).focus();
  217 |   let selected = false;
  218 |   for (let attempt = 0; attempt < 27 && !selected; attempt++) {
  219 |     await page.keyboard.press('KeyT');
  220 |     selected = await page.evaluate(async () => {
  221 |       await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  222 |       const w = window as any, halo = w.__ccScene.getObjectByName('cl-target'), crab = w.__ccCatch;
  223 |       return halo.visible && Math.hypot(halo.position.x - crab.position.x, halo.position.z - crab.position.z) < 1e-6;
  224 |     });
  225 |   }
  226 |   expect(selected).toBe(true); await page.keyboard.press('KeyE'); await advance(page, 6);
  227 |   const caught = await page.evaluate(() => {
  228 |     const w = window as any, dropped = w.__ccScene.children.filter((object: any) => object.userData.shelterType && !w.__ccSheltersBefore.includes(object.uuid));
  229 |     return { alive: w.__ccCatch.userData.alive, attached: !!w.__ccCatch.parent, meals: w.__toolData.cephalopodLab.huntsSuccessful,
  230 |       ownDisposed: w.__ccResources.filter((row: any) => row.owner === w.__ccCatch).every((row: any) => row.disposed === 1),
  231 |       untouched: w.__ccResources.filter((row: any) => row.owner !== w.__ccCatch && row.owner !== w.__ccMeal).every((row: any) => row.disposed === 0),
  232 |       drops: dropped.map((object: any) => ({ type: object.userData.shelterType, state: object.userData.state, distance: Math.hypot(object.position.x - w.__ccCatch.position.x, object.position.z - w.__ccCatch.position.z) })) };
  233 |   });
  234 |   expect(caught.alive || caught.attached).toBe(false); expect(caught.meals).toBe(2); expect(caught.ownDisposed && caught.untouched).toBe(true);
  235 |   expect(caught.drops).toEqual(quality === 'balanced' ? [{ type: 'conch', state: 'free', distance: 0 }] : []);
  236 |   await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  237 |   expect(await page.evaluate(() => (window as any).__ccResources.every((row: any) => row.disposed === 1))).toBe(true);
  238 | });
  239 | 
```