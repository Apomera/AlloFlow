import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>();
const canvas = 'canvas[role=application]';
const forage = (page: Page) => page.getByRole('button', { name: 'Forage [R]', exact: true });

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__ccStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__ccStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: quality === 'low' ? 2741 : 2742, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(quality => {
    const w = window as any, T = w.THREE;
    w.__ccScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__ccPlayer = w.__ccScene.getObjectByName('cl-player');
    w.__ccCrabs = w.__ccScene.children.filter((object: any) => object.userData.alive && object.userData.cfg);
    w.__ccClams = w.__ccScene.children.filter((object: any) => object.userData.alive && 'drillProgress' in object.userData);
    w.__ccCrab = w.__ccCrabs.find((crab: any) => crab.userData.type !== 'hermit');
    w.__ccHermit = w.__ccCrabs.find((crab: any) => crab.userData.type === 'hermit');
    w.__ccCatch = w.__ccHermit || w.__ccCrabs.find((crab: any) => crab.userData.type === 'red');
    if (w.__ccCrabs.length !== 10 || w.__ccClams.length !== 8 || !w.__ccCrab || !w.__ccCatch || (quality === 'balanced' && !w.__ccHermit)) throw new Error('Expected the observed ten-crab/eight-clam seeded fixture');
    w.__ccMeal = w.__ccClams[0]; w.__ccNeighbor = w.__ccClams[1];
    w.__ccStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__ccStep; w.__ccStep = 0; return dt; };
    // Keep the real actors, AI, input, terrain and capture loop. These positions
    // isolate food access from incidental cover and make native draws observable.
    w.__ccScene.children.forEach((object: any) => {
      if (object.userData.substrate === 'rock') { object.position.x = -18; object.position.z = -18; object.userData.substrateRadius = 0; }
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    w.__ccCrabs.forEach((crab: any) => { crab.position.set(18, .18, 18); crab.userData.speed = 0; crab.userData.wanderTimer = 1000; });
    w.__ccClams.forEach((clam: any) => clam.position.set(18, .1, 18));
    w.__ccCrab.position.set(-.7, .18, 2.4); w.__ccCrab.userData.speed = .08;
    w.__ccCatch.position.set(.7, .18, 2.4); w.__ccCatch.userData.speed = .07;
    w.__ccMeal.position.set(-.25, .1, .65); w.__ccNeighbor.position.set(.35, .1, .95);
    w.__ccScene.updateMatrixWorld(true);
    const selected: any[] = [], resources = new Map<any, any>();
    [...w.__ccCrabs, ...w.__ccClams].forEach((owner: any) => owner.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      selected.push({ owner, mesh, geometry: mesh.geometry, material: mesh.material,
        attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, version: attr.version, values: Array.from(attr.array) }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null });
      [mesh.geometry, ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material])].forEach((resource: any) => {
        if (resources.has(resource)) return;
        const row = { resource, owner, disposed: 0 }; resource.addEventListener('dispose', () => { row.disposed++; }); resources.set(resource, row);
      });
    }));
    w.__ccOwned = selected; w.__ccResources = [...resources.values()]; w.__ccPrograms = new Map(); w.__ccEpoch = 0; w.__ccDrawEpoch = {};
    function watch(mesh: any, kind: string) {
      const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group);
        w.__ccRenderer = renderer; w.__ccCamera = camera; w.__ccDrawEpoch[kind] = w.__ccEpoch;
        if (w.__ccPrograms.has(kind)) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), location = gl.getUniformLocation(program, 'normalMatrix');
        const normal = location === null ? null : Array.from(gl.getUniform(program, location));
        const names = ['position', ...(material.isMeshStandardMaterial ? ['normal'] : []), ...(material.vertexColors ? ['color'] : [])];
        const bindings = names.map(name => {
          const at = gl.getAttribLocation(program, name);
          return { name, size: at < 0 ? 0 : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: at >= 0 && gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: at >= 0 && !!gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) };
        });
        w.__ccPrograms.set(kind, { kind, mesh: mesh.uuid, material: material.uuid, standard: !!material.isMeshStandardMaterial, vertexColors: material.vertexColors,
          linked: gl.getProgramParameter(program, gl.LINK_STATUS), bindings, normal, determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null,
          shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    }
    [[0, 'crab-body'], [1, 'crab-eye'], [3, 'crab-leg'], [7, 'crab-rear-legs'], [9, 'crab-claw']].forEach(([index, kind]) => watch(w.__ccCrab.children[index as number], kind as string));
    if (w.__ccHermit) {
      watch(w.__ccHermit.children[7], 'hermit-support');
      [11, 12, 13, 14].forEach(index => watch(w.__ccHermit.children[index], 'hermit-shell-' + index));
    } else watch(w.__ccCatch.children[0], 'red-body');
    watch(w.__ccMeal.children[0], 'clam-lower'); watch(w.__ccMeal.children[1], 'clam-upper');
    watch(w.__ccNeighbor.children[0], 'clam-neighbor');
    w.__ccKinds = ['crab-body', 'crab-eye', 'crab-leg', 'crab-rear-legs', 'crab-claw', ...(w.__ccHermit ? ['hermit-support', 'hermit-shell-11', 'hermit-shell-12', 'hermit-shell-13', 'hermit-shell-14'] : ['red-body']), 'clam-lower', 'clam-upper', 'clam-neighbor'];
    const upper = w.__ccMeal.children[1], positions = upper.geometry.attributes.position;
    let hinge = 0, front = 0;
    for (let i = 1; i < positions.count; i++) {
      const squared = (j: number) => positions.getX(j) ** 2 + positions.getY(j) ** 2 + positions.getZ(j) ** 2;
      if (squared(i) < squared(hinge)) hinge = i;
      if (positions.getZ(i) > positions.getZ(front)) front = i;
    }
    w.__ccHinge = new T.Vector3().fromBufferAttribute(positions, hinge); w.__ccFront = new T.Vector3().fromBufferAttribute(positions, front);
  }, quality);
  await page.locator(canvas).focus(); await advance(page, 6);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any; w.__ccScene.updateMatrixWorld(true);
    const geometries = new Set(), materials = new Set();
    w.__ccScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
    const upper = w.__ccMeal.children[1];
    return { crabWorld: w.__ccCrabs.map((crab: any) => crab.matrixWorld.toArray()), legs: w.__ccCrabs.map((crab: any) => crab.children.slice(3, 9).map((leg: any) => leg.position.y)),
      phases: w.__ccCrabs.map((crab: any) => crab.userData.legPhase), clamWorld: w.__ccClams.map((clam: any) => clam.matrixWorld.toArray()),
      upperAngle: upper.rotation.x, hinge: w.__ccHinge.clone().applyMatrix4(upper.matrixWorld).toArray(), front: w.__ccFront.clone().applyMatrix4(upper.matrixWorld).toArray(), hingeLocalLength: w.__ccHinge.length(),
      time: document.querySelector('[data-hud=time]')?.textContent, camera: w.__ccCamera.position.toArray(),
      meals: w.__toolData.cephalopodLab.huntsSuccessful || 0,
      aliveClams: w.__ccClams.filter((clam: any) => clam.userData.alive && clam.parent === w.__ccScene).length,
      aliveCrabs: w.__ccCrabs.filter((crab: any) => crab.userData.alive && crab.parent === w.__ccScene).length,
      stable: w.__ccOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.geometry.index?.array === row.indexArray &&
        Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && prior.attr.version === prior.version)),
      staticBuffers: w.__ccOwned.every((row: any) => Object.values(row.attrs).every((prior: any) => prior.values.every((value: number, index: number) => value === prior.array[index])) && (!row.indices || row.indices.every((value: number, index: number) => value === row.indexArray[index]))),
      finite: w.__ccOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))),
      disposed: w.__ccResources.filter((row: any) => row.disposed).length, geometries: geometries.size, materials: materials.size, textures: w.__ccRenderer.info.memory.textures };
  });
}

async function freshDraws(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, epoch = ++w.__ccEpoch;
    for (let frame = 0; frame < 60 && w.__ccKinds.some((kind: string) => w.__ccDrawEpoch[kind] !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return w.__ccKinds.map((kind: string) => ({ kind, fresh: w.__ccDrawEpoch[kind] === epoch }));
  });
}
function stable(now: Awaited<ReturnType<typeof state>>, before: Awaited<ReturnType<typeof state>>) {
  expect(now.stable && now.staticBuffers && now.finite).toBe(true); expect(now.disposed).toBe(0);
  expect(now.geometries).toBe(before.geometries); expect(now.materials).toBe(before.materials); expect(now.textures).toBe(before.textures);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const entries: string[] = []; errors.set(page, entries);
  page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} crab and clam surfaces render natively and preserve drilling, capture and independent resources`, async ({ page }) => {
  await mount(page, quality); expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);
  const anatomy = await page.evaluate(() => {
    const w = window as any;
    return { crabCounts: w.__ccCrabs.map((crab: any) => ({ type: crab.userData.type, children: crab.children.length, allMeshes: crab.children.every((mesh: any) => mesh.isMesh) })),
      clams: w.__ccClams.map((clam: any) => ({ names: clam.children.map((mesh: any) => mesh.name), materials: new Set(clam.children.map((mesh: any) => mesh.material)).size,
        vertices: clam.children.reduce((n: number, mesh: any) => n + mesh.geometry.attributes.position.count, 0), triangles: clam.children.reduce((n: number, mesh: any) => n + mesh.geometry.index.count / 3, 0) })),
      programs: [...w.__ccPrograms.values()], keys: w.__ccKinds,
      textureFree: w.__ccOwned.every((row: any) => Object.values(row.material).every((value: any) => !value?.isTexture)) };
  });
  expect(anatomy.crabCounts).toHaveLength(10); expect(anatomy.clams).toHaveLength(8); expect(anatomy.textureFree).toBe(true);
  const inventory = anatomy.crabCounts.reduce((counts: Record<string, number>, crab: any) => { counts[crab.type] = (counts[crab.type] || 0) + 1; return counts; }, {});
  expect(inventory).toEqual(quality === 'low' ? { rock: 6, red: 4 } : { rock: 6, hermit: 4 });
  for (const crab of anatomy.crabCounts) { expect(crab.allMeshes).toBe(true); expect(crab.children).toBe(crab.type === 'hermit' ? 15 : 11); }
  for (const clam of anatomy.clams) { expect(clam.names).toEqual(['cl-clam-lower', 'cl-clam-upper']); expect(clam.materials).toBe(2); expect(clam.vertices).toBeLessThanOrEqual(1100); expect(clam.triangles).toBeLessThanOrEqual(2000); }
  expect(anatomy.programs.map((program: any) => program.kind).sort()).toEqual(anatomy.keys.sort());
  for (const program of anatomy.programs) {
    expect(program.linked, program.kind).toBe(true); expect(program.shaders).toHaveLength(2); expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
    for (const binding of program.bindings) { expect(binding.enabled && binding.bound, program.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); }
    if (program.standard) { expect(program.normal).toHaveLength(9); expect(program.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(program.determinant)).toBeGreaterThan(1e-8); }
    if (program.vertexColors) expect(program.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR');
  }
  const initial = await state(page); stable(initial, initial); expect(initial.hingeLocalLength).toBeLessThan(1e-6);
  await advance(page, 6); const walking = await state(page); stable(walking, initial);
  expect(walking.legs).not.toEqual(initial.legs); expect(walking.crabWorld).not.toEqual(initial.crabWorld); expect(walking.clamWorld).toEqual(initial.clamWorld);

  await forage(page).click(); await advance(page, 10); const drilling = await state(page);
  expect(drilling.upperAngle).toBeLessThan(-.05); expect(drilling.front[1]).toBeGreaterThan(initial.front[1] + .02); expect(drilling.hinge).toEqual(initial.hinge);
  await expect(page.getByRole('progressbar', { name: 'Foraging progress' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  const cancelled = await state(page); expect(cancelled.upperAngle).toBe(0); expect(cancelled.meals).toBe(0);
  await advance(page, 6); const paused = await state(page); stable(paused, initial); expect(paused.legs).toEqual(cancelled.legs); expect(paused.crabWorld).toEqual(cancelled.crabWorld); expect(paused.phases).toEqual(cancelled.phases);
  await page.keyboard.press('Escape'); await advance(page, 5); expect((await state(page)).upperAngle).toBe(0);

  await forage(page).click(); await advance(page, 6); expect((await state(page)).upperAngle).toBeLessThan(0);
  await page.keyboard.down('KeyW'); await advance(page, 2); await page.keyboard.up('KeyW');
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false'); expect((await state(page)).upperAngle).toBe(0);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page);
  stable(orbited, initial); expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.legs).toEqual(inspected.legs); expect(orbited.phases).toEqual(inspected.phases); expect(orbited.crabWorld).toEqual(inspected.crabWorld); expect(orbited.clamWorld).toEqual(inspected.clamWorld); expect(orbited.time).toBe(inspected.time);
  if (quality === 'balanced') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await advance(page, 5);
    await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 6);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 2); const reduced = await state(page); await advance(page, 5); const quiet = await state(page); stable(quiet, initial);
  // Existing crab walking remains active under reduced motion; neither the
  // geometry upgrade nor this fixture changes that simulation behavior.
  expect(quiet.legs).not.toEqual(reduced.legs); expect(quiet.phases).not.toEqual(reduced.phases); expect(quiet.upperAngle).toBe(0); expect(quiet.meals).toBe(0);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 4);
  expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);

  // Real latched foraging completes one meal and releases only that clam's
  // owned buffers/materials. Its still-live neighbor remains renderable.
  await forage(page).click(); await advance(page, 40); const eaten = await state(page);
  expect(eaten.meals).toBe(1); expect(eaten.aliveClams).toBe(7); expect(eaten.aliveCrabs).toBe(10); expect(eaten.stable && eaten.staticBuffers && eaten.finite).toBe(true);
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  const disposal = await page.evaluate(() => {
    const w = window as any;
    return { own: w.__ccResources.filter((row: any) => row.owner === w.__ccMeal).map((row: any) => row.disposed), untouched: w.__ccResources.filter((row: any) => row.owner !== w.__ccMeal).every((row: any) => row.disposed === 0), alive: w.__ccNeighbor.userData.alive };
  });
  expect(disposal.own).toEqual([1, 1, 1, 1]); expect(disposal.untouched && disposal.alive).toBe(true);
  expect(await page.evaluate(async () => {
    const w = window as any, epoch = ++w.__ccEpoch;
    for (let i = 0; i < 30 && w.__ccDrawEpoch['clam-neighbor'] !== epoch; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return w.__ccDrawEpoch['clam-neighbor'] === epoch;
  })).toBe(true);

  await page.evaluate(() => {
    const w = window as any;
    w.__ccCrabs.forEach((crab: any) => { crab.position.set(18, .18, 18); crab.userData.speed = 0; });
    w.__ccCatch.position.set(w.__ccPlayer.position.x, .18, w.__ccPlayer.position.z + 1.4);
    w.__ccSheltersBefore = w.__ccScene.children.filter((object: any) => object.userData.shelterType).map((object: any) => object.uuid);
  });
  await page.locator(canvas).focus();
  let selected = false;
  for (let attempt = 0; attempt < 27 && !selected; attempt++) {
    await page.keyboard.press('KeyT');
    selected = await page.evaluate(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const w = window as any, halo = w.__ccScene.getObjectByName('cl-target'), crab = w.__ccCatch;
      return halo.visible && Math.hypot(halo.position.x - crab.position.x, halo.position.z - crab.position.z) < 1e-6;
    });
  }
  expect(selected).toBe(true); await page.keyboard.press('KeyE'); await advance(page, 6);
  const caught = await page.evaluate(() => {
    const w = window as any, dropped = w.__ccScene.children.filter((object: any) => object.userData.shelterType && !w.__ccSheltersBefore.includes(object.uuid));
    return { alive: w.__ccCatch.userData.alive, attached: !!w.__ccCatch.parent, meals: w.__toolData.cephalopodLab.huntsSuccessful,
      ownDisposed: w.__ccResources.filter((row: any) => row.owner === w.__ccCatch).every((row: any) => row.disposed === 1),
      untouched: w.__ccResources.filter((row: any) => row.owner !== w.__ccCatch && row.owner !== w.__ccMeal).every((row: any) => row.disposed === 0),
      drops: dropped.map((object: any) => ({ type: object.userData.shelterType, state: object.userData.state, distance: Math.hypot(object.position.x - w.__ccCatch.position.x, object.position.z - w.__ccCatch.position.z) })) };
  });
  expect(caught.alive || caught.attached).toBe(false); expect(caught.meals).toBe(2); expect(caught.ownDisposed && caught.untouched).toBe(true);
  expect(caught.drops).toEqual(quality === 'balanced' ? [{ type: 'conch', state: 'free', distance: 0 }] : []);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__ccResources.every((row: any) => row.disposed === 1))).toBe(true);
});
