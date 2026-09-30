import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>();
const canvas = 'canvas[role=application]';

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__pdStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__pdStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(async () => {
    const w = window as any, T = w.THREE;
    w.__pdScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__pdPlayer = w.__pdScene.getObjectByName('cl-player');
    w.__pdFish = w.__pdScene.children.filter((object: any) => object.name === 'cl-prey-fish');
    w.__pdDens = w.__pdScene.children.filter((object: any) => object.name === 'cl-den' || object.name === 'cl-home');
    w.__pdHome = w.__pdScene.getObjectByName('cl-home');
    if (w.__pdFish.length !== 16 || w.__pdDens.length !== 4 || !w.__pdHome) throw new Error('Expected the real sixteen-fish/four-den dive');
    w.__pdStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__pdStep; w.__pdStep = 0; return dt; };
    // Capture existing school references during a frozen update; do not create
    // replacement actors or bypass the actual steering/tail update loop.
    const each = Array.prototype.forEach;
    (Array.prototype as any).forEach = function (callback: any, thisArg: any) {
      if (this.length === 2 && this[0]?.center?.isVector3 && this[0]?.fish?.length === 8 && typeof this[0]?.heading === 'number') w.__pdSchools = this;
      return each.call(this, callback, thisArg);
    };
    try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
    finally { Array.prototype.forEach = each; }
    if (!w.__pdSchools) throw new Error('Could not observe the actual school collection');
    w.__pdScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    // Keep the existing home at its actual grounded location. Move the player
    // and one existing school into its approach for non-vacuous native draws.
    w.__pdPlayer.position.x = w.__pdHome.position.x; w.__pdPlayer.position.z = w.__pdHome.position.z - 2.4;
    const school = w.__pdSchools[0]; school.center.copy(w.__pdPlayer.position).add(new T.Vector3(0, .65, 2.6));
    school.heading = 0; school.wanderTimer = 1000; school.alarm = 0; school.lastThreatPosition = null;
    school.fish.forEach((fish: any, index: number) => {
      fish.userData.offset.set((index % 4 - 1.5) * .24, (Math.floor(index / 4) - .5) * .12, Math.floor(index / 4) * .22);
      fish.position.copy(school.center).add(fish.userData.offset); fish.rotation.set(0, 0, 0, 'YXZ');
    });
    w.__pdTargetFish = school.fish[0]; w.__pdScene.updateMatrixWorld(true);
    const resources = new Set<any>(), selected: any[] = [];
    w.__pdFish.forEach((fish: any) => fish.traverse((mesh: any) => { if (mesh.isMesh) selected.push(mesh); }));
    w.__pdDens.forEach((den: any) => den.traverse((mesh: any) => { if (mesh.isMesh) selected.push(mesh); }));
    w.__pdOwned = selected.map((mesh: any) => {
      resources.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => resources.add(material));
      return { mesh, geometry: mesh.geometry, material: mesh.material,
        attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, version: attr.version, values: Array.from(attr.array) }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null };
    });
    w.__pdResources = [...resources].map((resource: any) => { const entry = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { entry.disposed = true; }); return entry; });
    w.__pdPrograms = new Map<any, any>(); w.__pdDraws = {}; w.__pdEpoch = 0; w.__pdDrawEpoch = {};
    function watch(mesh: any, kind: string) {
      const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group);
        w.__pdRenderer = renderer; w.__pdCamera = camera; w.__pdDraws[kind] = (w.__pdDraws[kind] || 0) + 1; w.__pdDrawEpoch[kind] = w.__pdEpoch;
        if (w.__pdPrograms.has(kind)) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), normalLocation = gl.getUniformLocation(program, 'normalMatrix');
        const normal = normalLocation === null ? null : Array.from(gl.getUniform(program, normalLocation));
        const bindings = ['position', ...(kind.startsWith('fish') ? ['normal', 'color'] : kind === 'den-rock' ? ['normal'] : kind === 'den-shadow' ? ['color'] : [])].map(name => {
          const location = gl.getAttribLocation(program, name);
          return { name, enabled: location >= 0 && gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
            size: location < 0 ? 0 : gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE),
            bound: location >= 0 && !!gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) };
        });
        w.__pdPrograms.set(kind, { kind, meshId: mesh.uuid, materialId: material.uuid, materialType: material.type, key: material.customProgramCacheKey(),
          linked: gl.getProgramParameter(program, gl.LINK_STATUS), bindings, normal, determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null,
          shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    }
    watch(w.__pdTargetFish.getObjectByName('cl-fish-body'), 'fish-body'); watch(w.__pdTargetFish.userData.tail, 'fish-tail');
    w.__pdHome.children.forEach((mesh: any, index: number) => watch(mesh, index < 3 ? 'den-rock' : index === 3 ? 'den-shadow' : 'den-ring'));
  });
  await page.locator(canvas).focus(); await advance(page, 8);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, geometries = new Set<any>(), materials = new Set<any>();
    w.__pdScene.updateMatrixWorld(true);
    w.__pdScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
    return { world: { fish: w.__pdFish.map((fish: any) => fish.matrixWorld.toArray()), dens: w.__pdDens.map((den: any) => den.matrixWorld.toArray()) },
      tails: w.__pdFish.map((fish: any) => fish.userData.tail.rotation.y), phases: w.__pdFish.map((fish: any) => fish.userData.swimPhase),
      time: document.querySelector('[data-hud=time]')?.textContent, energy: document.querySelector('[data-hud=energy]')?.textContent,
      camera: w.__pdCamera.position.toArray(), renders: w.__glRecorder.records.filter((record: any) => record.scene === w.__pdScene).at(-1).renders,
      fishCount: w.__pdFish.filter((fish: any) => fish.userData.alive && fish.parent === w.__pdScene).length,
      stable: w.__pdOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.geometry.index?.array === row.indexArray &&
        Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && prior.attr.version === prior.version)),
      staticBuffers: w.__pdOwned.every((row: any) => Object.values(row.attrs).every((prior: any) => prior.values.every((value: number, index: number) => value === prior.array[index])) && (!row.indices || row.indices.every((value: number, index: number) => value === row.indexArray[index]))),
      finite: w.__pdOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))),
      resources: w.__pdResources.length, disposed: w.__pdResources.filter((entry: any) => entry.disposed).length,
      geometries: geometries.size, materials: materials.size, gpuGeometries: w.__pdRenderer.info.memory.geometries, gpuTextures: w.__pdRenderer.info.memory.textures };
  });
}

async function freshDraws(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, epoch = ++w.__pdEpoch, kinds = ['fish-body', 'fish-tail', 'den-rock', 'den-shadow', 'den-ring'];
    for (let frame = 0; frame < 60 && kinds.some(kind => w.__pdDrawEpoch[kind] !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return kinds.map(kind => ({ kind, fresh: w.__pdDrawEpoch[kind] === epoch }));
  });
}

function stable(current: Awaited<ReturnType<typeof state>>, before: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.staticBuffers && current.finite).toBe(true); expect(current.fishCount).toBe(16); expect(current.disposed).toBe(0);
  expect(current.resources).toBe(before.resources); expect(current.geometries).toBe(before.geometries); expect(current.materials).toBe(before.materials);
  expect(current.gpuGeometries).toBeGreaterThan(0); expect(current.gpuGeometries).toBeLessThanOrEqual(current.geometries); expect(current.gpuTextures).toBe(before.gpuTextures);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const entries: string[] = []; errors.set(page, entries);
  page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} fish and shelter surfaces render native programs and preserve motion, inspection and owned resources`, async ({ page }) => {
  await mount(page, quality);
  const anatomy = await page.evaluate(() => {
    const w = window as any;
    return { fish: w.__pdFish.map((fish: any) => ({ meshes: fish.children.length, materials: new Set(fish.children.map((mesh: any) => mesh.material)).size,
      shared: fish.getObjectByName('cl-fish-body').material === fish.userData.tail.material, tail: fish.userData.tail.name, offset: fish.userData.offset.isVector3,
      vertices: fish.children.reduce((sum: number, mesh: any) => sum + mesh.geometry.attributes.position.count, 0) })),
      dens: w.__pdDens.map((den: any) => ({ meshes: den.children.length, rocks: den.children.filter((mesh: any) => mesh.name === 'cl-den-rock').length,
        vertices: den.children.reduce((sum: number, mesh: any) => sum + mesh.geometry.attributes.position.count, 0),
        triangles: den.children.reduce((sum: number, mesh: any) => sum + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3, 0),
        materials: new Set(den.children.map((mesh: any) => mesh.material)).size,
        interior: { vertices: den.children[3].geometry.attributes.position.count, colors: den.children[3].geometry.attributes.color?.count,
          colorSize: den.children[3].geometry.attributes.color?.itemSize, vertexColors: den.children[3].material.vertexColors,
          opaque: !den.children[3].material.transparent && den.children[3].material.opacity === 1,
          white: den.children[3].material.color.toArray(), doubleSided: den.children[3].material.side === w.THREE.DoubleSide,
          variedColors: Array.from(den.children[3].geometry.attributes.color?.array || []).some((value: any, index: number) => value !== den.children[3].geometry.attributes.color.array[index % 3]) } })),
      textureFree: w.__pdOwned.every((row: any) => Object.values(row.material).every((value: any) => !value?.isTexture)), programs: [...w.__pdPrograms.values()] };
  });
  expect(anatomy.fish).toHaveLength(16); expect(anatomy.dens).toHaveLength(4); expect(anatomy.textureFree).toBe(true);
  for (const fish of anatomy.fish) { expect(fish.meshes).toBe(2); expect(fish.materials).toBe(1); expect(fish.shared && fish.offset).toBe(true); expect(fish.tail).toBe('cl-fish-tail'); expect(fish.vertices).toBeLessThanOrEqual(2500); }
  for (const den of anatomy.dens) {
    expect(den.meshes).toBe(5); expect(den.rocks).toBe(3); expect(den.materials).toBe(3); expect(den.vertices).toBe(565); expect(den.triangles).toBe(302);
    expect(den.interior.vertices).toBe(19); expect(den.interior.colors).toBe(19); expect(den.interior.colorSize).toBe(3);
    expect(den.interior.vertexColors && den.interior.opaque && den.interior.doubleSided && den.interior.variedColors).toBe(true); expect(den.interior.white).toEqual([1, 1, 1]);
  }
  expect(anatomy.programs.map((program: any) => program.kind).sort()).toEqual(['den-ring', 'den-rock', 'den-shadow', 'fish-body', 'fish-tail']);
  for (const program of anatomy.programs) {
    expect(program.linked, program.kind).toBe(true); expect(program.shaders).toHaveLength(2); expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
    for (const binding of program.bindings) { expect(binding.enabled && binding.bound, program.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); }
    const source = program.shaders.map((shader: any) => shader.source).join('\n');
    if (program.kind === 'den-rock' || program.kind.startsWith('fish')) {
      expect(program.materialType).toBe('MeshStandardMaterial'); expect(program.normal).toHaveLength(9); expect(program.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(program.determinant)).toBeGreaterThan(1e-8);
    }
    if (program.kind === 'den-rock') { expect(program.key).toBe('cl-rock-surface-v1'); expect(source).toContain('clRockPosition'); expect(source).toContain('clRockValueNoise'); }
    if (program.kind.startsWith('fish') || program.kind === 'den-shadow') expect(source).toContain('#define USE_COLOR');
    if (program.kind === 'den-shadow') expect(program.materialType).toBe('MeshBasicMaterial');
  }
  const fishPrograms = anatomy.programs.filter((program: any) => program.kind.startsWith('fish'));
  expect(fishPrograms[0].materialId).toBe(fishPrograms[1].materialId);
  const initial = await state(page); stable(initial, initial); expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);
  await advance(page, 7); const moving = await state(page); stable(moving, initial); expect(moving.tails).not.toEqual(initial.tails); expect(moving.world.fish).not.toEqual(initial.world.fish); expect(moving.world.dens).toEqual(initial.world.dens);
  await page.keyboard.press('Escape'); await advance(page, 2); const ordinaryPause = await state(page); await advance(page, 5);
  const held = await state(page); expect(held.world).toEqual(ordinaryPause.world); expect(held.tails).toEqual(ordinaryPause.tails); expect(held.phases).toEqual(ordinaryPause.phases);
  await page.keyboard.press('Escape'); await advance(page, 2);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page); await advance(page, 5);
  const paused = await state(page); stable(paused, initial); expect(paused.world).toEqual(inspected.world); expect(paused.tails).toEqual(inspected.tails); expect(paused.phases).toEqual(inspected.phases); expect(paused.time).toBe(inspected.time); expect(paused.energy).toBe(inspected.energy);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page);
  expect(orbited.camera).not.toEqual(paused.camera); expect(orbited.renders).toBeGreaterThan(paused.renders); expect(orbited.world).toEqual(inspected.world); expect(orbited.tails).toEqual(inspected.tails);
  if (quality === 'balanced') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await advance(page, 8);
    await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
    const fit = await page.evaluate(() => {
      const w = window as any, point = new w.THREE.Vector3(); let count = 0, maxX = 0, maxY = 0, visible = true;
      w.__pdPlayer.updateMatrixWorld(true); w.__pdPlayer.traverse((mesh: any) => {
        if (!mesh.isMesh) return; for (let parent = mesh; parent; parent = parent.parent) if (!parent.visible) return;
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).project(w.__pdCamera); count++; maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y)); visible = visible && point.toArray().every(Number.isFinite) && point.z > 0 && point.z < 1; }
      }); return { count, maxX, maxY, visible };
    });
    expect(fit.count).toBeGreaterThan(0); expect(fit.visible).toBe(true); expect(fit.maxX).toBeLessThan(.95); expect(fit.maxY).toBeLessThan(.95);
  }
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 6); const resumed = await state(page);
  stable(resumed, initial); expect(resumed.tails).not.toEqual(inspected.tails); expect(resumed.world.fish).not.toEqual(inspected.world.fish);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
  const reduced = await state(page); expect(reduced.tails.every(angle => angle === 0)).toBe(true); await advance(page, 5); const quiet = await state(page);
  stable(quiet, initial); expect(quiet.tails).toEqual(reduced.tails); expect(quiet.phases).toEqual(reduced.phases); expect(quiet.world.dens).toEqual(reduced.world.dens);
  // Reduced motion suppresses decorative tail motion while live fish still swim.
  expect(quiet.world.fish).not.toEqual(reduced.world.fish);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
  const final = await state(page); stable(final, initial); expect(final.tails).not.toEqual(reduced.tails); expect(final.phases).not.toEqual(reduced.phases);
  // On balanced this also observes fresh native fish/den submissions after
  // returning to the dive at the actual phone viewport.
  expect((await freshDraws(page)).every(entry => entry.fresh)).toBe(true);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__pdResources.filter((entry: any) => !entry.disposed))).toEqual([]);
});
