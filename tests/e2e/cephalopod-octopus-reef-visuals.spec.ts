import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const rigStart = source.indexOf('function createCLHuntAnimal(');
const rigEnd = source.indexOf('// Compact, individually owned prey rig.', rigStart);
if (rigStart < 0 || rigEnd <= rigStart) throw new Error('Cannot locate the production animal factory');
const rigSource = source.slice(rigStart, rigEnd);
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__octopusReefStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__octopusReefStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__orScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__orPlayer = w.__orScene.getObjectByName('cl-player');
    w.__orEyes = [];
    w.__orPlayer.traverse((object: any) => {
      if (object.isMesh && ['cl-eye-rim', 'cl-iris', 'cl-pupil', 'cl-eye-lid'].includes(object.name)) w.__orEyes.push(object);
    });
    w.__orRocks = w.__orScene.children.filter((object: any) => object.isMesh && object.userData.substrate === 'rock');
    if (w.__orEyes.length !== 8 || !w.__orRocks.length) throw new Error('Expected the actual octopus eyes and reef rocks');
    w.__octopusReefStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__octopusReefStep; w.__octopusReefStep = 0; return dt; };
    w.__orScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    w.__orPrograms = { eye: { draws: 0, program: null }, rock: { draws: 0, program: null } };
    const resources = new Set<any>();
    w.__orOwned = [...w.__orEyes, ...w.__orRocks].map((mesh: any) => {
      resources.add(mesh.geometry); resources.add(mesh.material);
      Object.values(mesh.material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      return { mesh, geometry: mesh.geometry, material: mesh.material,
        attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]: [string, any]) => [name, { attribute, array: attribute.array, values: Array.from(attribute.array) }])),
        index: mesh.geometry.index, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
        substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius,
        castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow };
    });
    w.__orResources = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
    function watch(mesh: any, kind: 'eye' | 'rock') {
      const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group);
        w.__orRenderer = renderer;
        const row = w.__orPrograms[kind]; row.draws++;
        // Read the native program of one real submitted draw per material kind.
        // Avoid recurring GPU synchronization on every animation frame.
        if (!row.program) {
          const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
          const normalLocation = gl.getUniformLocation(program, 'normalMatrix');
          row.program = { linked: gl.getProgramParameter(program, gl.LINK_STATUS),
            derivatives: renderer.capabilities.isWebGL2 || !!gl.getExtension('OES_standard_derivatives'),
            normalMatrix: normalLocation === null ? null : Array.from(gl.getUniform(program, normalLocation)),
            shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) };
        }
      };
    }
    w.__orEyes.filter((mesh: any) => mesh.name === 'cl-pupil').forEach((mesh: any) => watch(mesh, 'eye'));
    w.__orRocks.forEach((mesh: any) => watch(mesh, 'rock'));
  });
  await page.locator('canvas[role=application]').focus();
  await advance(page, 3);
}

async function auditSixRigs(page: Page) {
  return page.evaluate(factorySource => {
    const T = (window as any).THREE;
    const build = new Function('T', 'species', 'Math', factorySource + ';return createCLHuntAnimal(T,species);');
    const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Octopus eye construction consumed dive RNG'); } });
    return ['commonOcto', 'blueRinged', 'giantPacific', 'mimicOcto', 'caribReef', 'coconutOcto'].map(id => {
      const animal = build(T, { id, bodyColor: 0xbc6048 }, noRandom), meshes: any[] = [];
      animal.root.traverse((object: any) => { if (object.isMesh) meshes.push(object); });
      const eyes = meshes.filter(mesh => ['cl-eye-rim', 'cl-iris', 'cl-pupil', 'cl-eye-lid'].includes(mesh.name));
      const saved = eyes.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material, position: mesh.geometry.attributes.position, normal: mesh.geometry.attributes.normal }));
      for (let frame = 1; frame <= 12; frame++) animal.update(frame * .05, .05, { moving: true, jet: frame > 6, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false });
      const compatibility: any[] = [];
      animal.root.traverse((object: any) => { if (object.name === 'cl-eye-highlight') compatibility.push(object); });
      const row = { id, names: eyes.map(mesh => mesh.name).sort(),
        vertices: eyes.reduce((count, mesh) => count + mesh.geometry.attributes.position.count, 0),
        triangles: eyes.reduce((count, mesh) => count + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3, 0),
        finite: eyes.every(mesh => Object.values(mesh.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite))),
        stable: saved.every(item => item.mesh.geometry === item.geometry && item.mesh.material === item.material && item.geometry.attributes.position === item.position && item.geometry.attributes.normal === item.normal),
        irisMaterials: [...new Set(eyes.filter(mesh => mesh.name === 'cl-iris').map(mesh => mesh.material.name))],
        pupilMaterials: [...new Set(eyes.filter(mesh => mesh.name === 'cl-pupil').map(mesh => mesh.material.name))],
        curvedPhysicalPupils: eyes.filter(mesh => mesh.name === 'cl-pupil').every(mesh => mesh.material.isMeshPhysicalMaterial && !mesh.material.transparent && !mesh.material.map),
        compatibility: compatibility.length === 2 && compatibility.every(group => group.isGroup && group.children.length === 1 && group.children[0].name === 'cl-eye-lid') };
      // These construction-only rigs never join the scene or allocate GPU buffers.
      const resources = new Set<any>();
      meshes.forEach(mesh => { resources.add(mesh.geometry); resources.add(mesh.material); });
      resources.forEach(resource => resource.dispose());
      return row;
    });
  }, rigSource);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__orScene.updateMatrixWorld(true);
    const geometries = new Set<any>(), materials = new Set<any>();
    w.__orScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
    const normals = w.__orOwned.flatMap((owned: any) => {
      const n = owned.geometry.attributes.normal, lengths: number[] = [];
      // Indexed spheres retain unused pole vertices whose recomputed normals
      // may be zero; inspect normals that actually feed rendered triangles.
      const vertices = owned.geometry.index ? new Set<number>(Array.from(owned.geometry.index.array) as number[]) : new Set<number>(Array.from({ length: n.count }, (_, index) => index));
      vertices.forEach(vertex => lengths.push(Math.hypot(n.getX(vertex), n.getY(vertex), n.getZ(vertex))));
      return lengths;
    });
    return { stable: w.__orOwned.every((owned: any) => owned.mesh.geometry === owned.geometry && owned.mesh.material === owned.material && owned.geometry.index === owned.index &&
        Object.entries(owned.attributes).every(([name, saved]: [string, any]) => owned.geometry.attributes[name] === saved.attribute && owned.geometry.attributes[name].array === saved.array)),
      staticBuffers: w.__orOwned.every((owned: any) => Object.values(owned.attributes).every((saved: any) => saved.values.every((value: number, index: number) => value === saved.array[index])) && (!owned.indices || owned.indices.every((value: number, index: number) => value === owned.index.array[index]))),
      metadata: w.__orOwned.every((owned: any) => owned.mesh.userData.substrate === owned.substrate && owned.mesh.userData.substrateRadius === owned.radius && owned.mesh.castShadow === owned.castShadow && owned.mesh.receiveShadow === owned.receiveShadow),
      finite: w.__orOwned.every((owned: any) => owned.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(owned.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite))),
      maxNormalError: Math.max(...normals.map((length: number) => Math.abs(length - 1))),
      geometryCount: geometries.size, materialCount: materials.size, resourceCount: w.__orResources.length,
      gpuGeometries: w.__orRenderer.info.memory.geometries, gpuTextures: w.__orRenderer.info.memory.textures,
      disposed: w.__orResources.filter((resource: any) => resource.disposed).length,
      pose: { arm: Array.from(w.__orPlayer.getObjectByName('cl-arm-0').geometry.attributes.position.array), mantle: w.__orPlayer.getObjectByName('cl-mantle').scale.toArray() },
      normalDeterminants: Object.values(w.__orPrograms).map((entry: any) => entry.program?.normalMatrix ? new T.Matrix3().fromArray(entry.program.normalMatrix).determinant() : null) };
  });
}

function expectStable(current: Awaited<ReturnType<typeof state>>, baseline: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.staticBuffers && current.metadata && current.finite).toBe(true);
  expect(current.maxNormalError).toBeLessThan(.0001);
  expect(current.geometryCount).toBe(baseline.geometryCount); expect(current.materialCount).toBe(baseline.materialCount);
  expect(current.resourceCount).toBe(baseline.resourceCount); expect(current.disposed).toBe(0);
  // Uploads are lazy as inspection changes the frustum, but may not create more
  // GPU geometry than the unchanged set of real scene resources.
  expect(current.gpuGeometries).toBeGreaterThan(0); expect(current.gpuGeometries).toBeLessThanOrEqual(current.geometryCount);
  expect(current.gpuTextures).toBe(baseline.gpuTextures);
  expect(current.normalDeterminants.every(value => value !== null && Number.isFinite(value) && Math.abs(value) > 1e-8)).toBe(true);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) {
  test(`${quality} octopus eyes and rock relief render real shaders and preserve resources through motion settings`, async ({ page }) => {
    await mount(page, quality);
    if (quality === 'low') {
      const rigs = await auditSixRigs(page);
      expect(rigs).toHaveLength(6);
      for (const rig of rigs) {
        expect(rig.names, rig.id).toEqual(['cl-eye-lid', 'cl-eye-lid', 'cl-eye-rim', 'cl-eye-rim', 'cl-iris', 'cl-iris', 'cl-pupil', 'cl-pupil']);
        expect(rig.vertices, rig.id).toBeLessThan(3400); expect(rig.triangles, rig.id).toBeLessThan(5760);
        expect(rig.finite && rig.stable && rig.curvedPhysicalPupils && rig.compatibility, rig.id).toBe(true);
        expect(rig.irisMaterials).toEqual(['cl-octopus-iris-material']); expect(rig.pupilMaterials).toEqual(['cl-octopus-pupil-material']);
      }
    }
    await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2);
    const audit = await page.evaluate(() => {
      const w = window as any;
      return { programs: w.__orPrograms, eyeKeys: w.__orEyes.filter((mesh: any) => mesh.name === 'cl-pupil').map((mesh: any) => mesh.material.customProgramCacheKey()),
        rockKeys: [...new Set(w.__orRocks.map((mesh: any) => mesh.material.customProgramCacheKey()))],
        rocks: w.__orRocks.map((mesh: any) => ({ radius: mesh.userData.substrateRadius, shadow: mesh.castShadow && mesh.receiveShadow })) };
    });
    for (const kind of ['eye', 'rock'] as const) {
      expect(audit.programs[kind].draws).toBeGreaterThan(0);
      expect(audit.programs[kind].program?.linked).toBe(true);
      expect(audit.programs[kind].program.shaders).toHaveLength(2);
      expect(audit.programs[kind].program.shaders.every((shader: any) => shader.compiled)).toBe(true);
      expect(audit.programs[kind].program.normalMatrix).toHaveLength(9);
      expect(audit.programs[kind].program.normalMatrix.every(Number.isFinite)).toBe(true);
    }
    expect(audit.eyeKeys).toEqual(['cl-octopus-pupil-water-v13', 'cl-octopus-pupil-water-v13']);
    expect(audit.rockKeys).toEqual(['cl-rock-surface-v1']);
    expect(audit.rocks.every((rock: any) => Number.isFinite(rock.radius) && rock.radius > 0 && rock.shadow)).toBe(true);
    const eyeShader = audit.programs.eye.program.shaders.map((shader: any) => shader.source).join('\n');
    const rockShader = audit.programs.rock.program.shaders.map((shader: any) => shader.source).join('\n');
    expect(eyeShader).toContain('clOctoEyeN');
    expect(audit.programs.rock.program.derivatives).toBe(true);
    expect(rockShader).toContain('clRockPosition'); expect(rockShader).toContain('clRockCoarseField');
    expect(rockShader).toContain('dFdx'); expect(rockShader).toContain('dFdy');
    const inspected = await state(page); await advance(page, 5);
    const paused = await state(page); expect(paused.pose).toEqual(inspected.pose); expectStable(paused, inspected);
    await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 7);
    const moving = await state(page); expect(moving.pose).not.toEqual(inspected.pose); expectStable(moving, inspected);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
    const reduced = await state(page); await advance(page, 7);
    const reducedLater = await state(page); expect(reducedLater.pose).toEqual(reduced.pose); expectStable(reducedLater, inspected);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
    const resumed = await state(page); expect(resumed.pose).not.toEqual(reduced.pose); expectStable(resumed, inspected);
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__orResources.filter((resource: any) => !resource.disposed))).toEqual([]);
  });
}
