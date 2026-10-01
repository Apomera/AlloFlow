import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__eyeFrondStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__eyeFrondStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'nautilus', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__efScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__efRoot = w.__efScene.getObjectByName('cl-player');
    w.__efShell = w.__efRoot.getObjectByName('cl-shell');
    w.__efEyeMeshes = [];
    w.__efRoot.traverse((object: any) => { if (object.isMesh && ['cl-eye-rim', 'cl-iris', 'cl-pupil'].includes(object.name)) w.__efEyeMeshes.push(object); });
    w.__efPlants = w.__efScene.children.filter((object: any) => ['cl-seagrass', 'cl-kelp'].includes(object.name));
    if (w.__efEyeMeshes.length !== 6 || w.__efPlants.length !== 105) throw new Error('Expected six actual pinhole-eye surfaces and 105 plant meshes');
    w.__eyeFrondStep = 0;
    T.Clock.prototype.getDelta = function () { const dt = w.__eyeFrondStep; w.__eyeFrondStep = 0; return dt; };
    w.__efScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    const resources = new Set<any>();
    w.__efOwned = [...w.__efEyeMeshes, ...w.__efPlants].map((mesh: any) => {
      resources.add(mesh.geometry); resources.add(mesh.material);
      Object.values(mesh.material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      let motion: any = null;
      if (['cl-seagrass', 'cl-kelp'].includes(mesh.name)) {
        // The detached shader exposes the actual material closure's uniform;
        // it does not invalidate or replace the live native GPU program.
        const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
        mesh.material.onBeforeCompile(shader);
        motion = (shader.uniforms as any).clPlantMotion;
      }
      return { mesh, geometry: mesh.geometry, material: mesh.material, key: mesh.material.customProgramCacheKey(),
        attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]: [string, any]) => [name, { attribute, array: attribute.array, values: Array.from(attribute.array) }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
        instanceAttribute: mesh.instanceMatrix, instanceArray: mesh.instanceMatrix?.array, instances: mesh.instanceMatrix ? Array.from(mesh.instanceMatrix.array) : null,
        motion, motionValue: motion?.value,
        metadata: JSON.stringify({ substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius, groundOffset: mesh.userData.groundOffset, height: mesh.geometry.userData.clPlantHeight }),
        opacity: mesh.material.opacity, transparent: mesh.material.transparent, depthWrite: mesh.material.depthWrite };
    });
    w.__efResources = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
    w.__efEpoch = 0;
    w.__efDraws = { eye: 0, grass: 0, kelp: 0 };
    w.__efPrograms = new Map<any, any>();
    w.__efPlantSamples = { grass: { epoch: -1 }, kelp: { epoch: -1 } };
    function watch(mesh: any, kind: 'eye' | 'grass' | 'kelp') {
      const original = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        original.call(this, renderer, scene, camera, geometry, material, group);
        w.__efRenderer = renderer; w.__efCamera = camera; w.__efDraws[kind]++;
        const key = kind === 'eye' ? mesh.uuid : kind;
        const sample = kind === 'eye' ? null : w.__efPlantSamples[kind];
        if (w.__efPrograms.has(key) && (!sample || sample.epoch === w.__efEpoch)) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        if (!w.__efPrograms.has(key)) {
          const location = gl.getUniformLocation(program, 'normalMatrix');
          const normalMatrix = location === null ? null : Array.from(gl.getUniform(program, location));
          const positionLocation = gl.getAttribLocation(program, 'position');
          w.__efPrograms.set(key, { kind, meshId: mesh.uuid, meshName: mesh.name, materialId: material.uuid, materialName: material.name, materialType: material.type, cacheKey: material.customProgramCacheKey(),
            positionEnabled: positionLocation >= 0 && gl.getVertexAttrib(positionLocation, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
            positionSize: positionLocation < 0 ? 0 : gl.getVertexAttrib(positionLocation, gl.VERTEX_ATTRIB_ARRAY_SIZE),
            positionBound: positionLocation >= 0 && !!gl.getVertexAttrib(positionLocation, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), linked: gl.getProgramParameter(program, gl.LINK_STATUS),
            normalMatrix, normalDeterminant: normalMatrix ? new T.Matrix3().fromArray(normalMatrix).determinant() : null,
            shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
        }
        if (sample) {
          const location = gl.getUniformLocation(program, 'clPlantMotion');
          sample.epoch = w.__efEpoch; sample.motion = location === null ? null : Array.from(gl.getUniform(program, location));
          sample.height = geometry.userData.clPlantHeight; sample.materialId = material.uuid;
        }
      };
    }
    w.__efEyeMeshes.forEach((mesh: any) => watch(mesh, 'eye'));
    w.__efPlants.forEach((mesh: any) => watch(mesh, mesh.name === 'cl-seagrass' ? 'grass' : 'kelp'));
  });
  await page.locator('canvas[role=application]').focus(); await advance(page, 3);
}

async function nativePlantMotion(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, epoch = ++w.__efEpoch;
    for (let frame = 0; frame < 80 && ['grass', 'kelp'].some(kind => w.__efPlantSamples[kind].epoch !== epoch); frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return ['grass', 'kelp'].map(kind => {
      const sample = w.__efPlantSamples[kind];
      const owned = w.__efOwned.find((item: any) => item.material.uuid === sample.materialId);
      return { kind, fresh: sample.epoch === epoch, materialId: sample.materialId, motion: sample.motion, height: sample.height,
        liveMotion: owned?.motion?.value.toArray() };
    });
  });
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__efScene.updateMatrixWorld(true);
    const geometries = new Set<any>(), materials = new Set<any>();
    w.__efScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
    const plants = w.__efOwned.filter((owned: any) => owned.motion);
    const point = new T.Vector3(), base = new T.Vector3(), instance = new T.Matrix4();
    let maxRootError = 0;
    for (const { mesh } of plants) {
      const p = mesh.geometry.attributes.position; base.set(0, 0, 0);
      for (let vertex = 0; vertex < 3; vertex++) base.add(point.fromBufferAttribute(p, vertex));
      base.multiplyScalar(1 / 3);
      for (let index = 0; index < (mesh.isInstancedMesh ? mesh.count : 1); index++) {
        point.copy(base); if (mesh.isInstancedMesh) { mesh.getMatrixAt(index, instance); point.applyMatrix4(instance); }
        point.applyMatrix4(mesh.matrixWorld); maxRootError = Math.max(maxRootError, Math.abs(point.y - mesh.position.y));
      }
    }
    return { pose: { root: w.__efRoot.matrixWorld.toArray(), shell: w.__efShell.matrixWorld.toArray(), arm: Array.from(w.__efRoot.getObjectByName('cl-arm-0').geometry.attributes.position.array), plants: w.__efPlants.map((mesh: any) => mesh.matrixWorld.toArray()) },
      shellAngle: w.__efShell.rotation.z,
      time: document.querySelector('[data-hud=time]')?.textContent, energy: document.querySelector('[data-hud=energy]')?.textContent,
      camera: w.__efCamera.position.toArray(), cameraDistance: w.__efCamera.position.distanceTo(w.__efRoot.position), renders: w.__glRecorder.records.filter((record: any) => record.scene === w.__efScene).at(-1).renders,
      motion: plants.map((owned: any) => owned.motion.value.toArray()), motionCount: plants.length,
      motionByMaterial: Object.fromEntries(plants.map((owned: any) => [owned.material.uuid, owned.motion.value.toArray()])),
      independentMotion: new Set(plants.map((owned: any) => owned.motion)).size === plants.length && new Set(plants.map((owned: any) => owned.motion.value)).size === plants.length,
      stableMotion: plants.every((owned: any) => owned.motion.value === owned.motionValue),
      rootError: maxRootError, plantRotationsZero: w.__efPlants.every((mesh: any) => mesh.rotation.z === 0),
      stable: w.__efOwned.every((owned: any) => owned.mesh.geometry === owned.geometry && owned.mesh.material === owned.material && owned.material.customProgramCacheKey() === owned.key && owned.geometry.index === owned.index && owned.geometry.index?.array === owned.indexArray && owned.mesh.instanceMatrix === owned.instanceAttribute && owned.mesh.instanceMatrix?.array === owned.instanceArray && Object.entries(owned.attributes).every(([name, saved]: [string, any]) => owned.geometry.attributes[name] === saved.attribute && owned.geometry.attributes[name].array === saved.array)),
      staticBuffers: w.__efOwned.every((owned: any) => Object.values(owned.attributes).every((saved: any) => saved.values.every((value: number, index: number) => value === saved.array[index])) && (!owned.indices || owned.indices.every((value: number, index: number) => value === owned.indexArray[index])) && (!owned.instances || owned.instances.every((value: number, index: number) => value === owned.instanceArray[index]))),
      finite: w.__efOwned.every((owned: any) => owned.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(owned.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite))),
      metadata: w.__efOwned.every((owned: any) => JSON.stringify({ substrate: owned.mesh.userData.substrate, radius: owned.mesh.userData.substrateRadius, groundOffset: owned.mesh.userData.groundOffset, height: owned.geometry.userData.clPlantHeight }) === owned.metadata && owned.material.opacity === owned.opacity && owned.material.transparent === owned.transparent && owned.material.depthWrite === owned.depthWrite),
      geometryCount: geometries.size, materialCount: materials.size, resourceCount: w.__efResources.length,
      gpuGeometries: w.__efRenderer.info.memory.geometries, gpuTextures: w.__efRenderer.info.memory.textures,
      disposed: w.__efResources.filter((resource: any) => resource.disposed).length };
  });
}

async function modelFraming(page: Page) {
  return page.evaluate(() => {
    const w = window as any, point = new w.THREE.Vector3();
    let count = 0, maxX = 0, maxY = 0, visibleDepth = true, finite = true;
    w.__efRoot.updateMatrixWorld(true);
    const visible = [] as any[];
    w.__efRoot.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
      visible.push(mesh);
    });
    for (const mesh of visible) {
      const p = mesh.geometry.attributes.position;
      for (let vertex = 0; vertex < p.count; vertex++) {
        point.fromBufferAttribute(p, vertex).applyMatrix4(mesh.matrixWorld).project(w.__efCamera); count++;
        finite = finite && point.toArray().every(Number.isFinite); visibleDepth = visibleDepth && point.z > 0 && point.z < 1;
        maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y));
      }
    }
    return { count, maxX, maxY, visibleDepth, finite };
  });
}

function expectStable(current: Awaited<ReturnType<typeof state>>, baseline: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.staticBuffers && current.finite && current.metadata).toBe(true);
  expect(current.motionCount).toBe(105); expect(current.independentMotion && current.stableMotion && current.plantRotationsZero).toBe(true);
  expect(current.rootError).toBeLessThan(.000001); expect(Math.abs(current.shellAngle)).toBeLessThanOrEqual(.040001);
  expect(current.geometryCount).toBe(baseline.geometryCount); expect(current.materialCount).toBe(baseline.materialCount);
  expect(current.resourceCount).toBe(baseline.resourceCount); expect(current.disposed).toBe(0);
  expect(current.gpuGeometries).toBeGreaterThan(0); expect(current.gpuGeometries).toBeLessThanOrEqual(current.geometryCount); expect(current.gpuTextures).toBe(baseline.gpuTextures);
}

function expectNativeMotion(samples: Awaited<ReturnType<typeof nativePlantMotion>>, enabled: number) {
  expect(samples).toHaveLength(2);
  for (const sample of samples) {
    expect(sample.fresh, sample.kind).toBe(true); expect(sample.motion, sample.kind).toHaveLength(4);
    expect(sample.motion.every(Number.isFinite), sample.kind).toBe(true);
    expect(sample.motion[0], sample.kind).toBeGreaterThanOrEqual(0); expect(sample.motion[0], sample.kind).toBeLessThan(Math.PI * 2 + .000001);
    expect(sample.motion[1], sample.kind).toBeGreaterThanOrEqual(0); expect(sample.motion[1], sample.kind).toBeLessThan(Math.PI * 2 + .000001);
    expect(sample.motion[2], sample.kind).toBeCloseTo(sample.height, 5); expect(sample.motion[3], sample.kind).toBe(enabled);
    sample.motion.forEach((value: number, index: number) => expect(value, sample.kind).toBeCloseTo(sample.liveMotion[index], 5));
  }
}

function expectFrozenNative(samples: Awaited<ReturnType<typeof nativePlantMotion>>, baseline: Awaited<ReturnType<typeof state>>) {
  // Draw ordering can select another visible plant when the camera moves.
  // Compare each real GPU upload with that exact material's frozen value.
  for (const sample of samples) expect(sample.motion, sample.kind).toEqual(baseline.motionByMaterial[sample.materialId].map(Math.fround));
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
  test(`${quality} nautilus pinhole eyes and kelp fronds render, freeze, frame and release native resources`, async ({ page }) => {
    const initialViewport = page.viewportSize();
    await mount(page, quality);
    const anatomy = await page.evaluate(() => {
      const w = window as any, T = w.THREE;
      const kelp = w.__efPlants.filter((mesh: any) => mesh.name === 'cl-kelp');
      const highlights = [] as any[]; w.__efRoot.traverse((object: any) => { if (object.name === 'cl-eye-highlight') highlights.push(object); });
      return { form: w.__efRoot.userData.anatomy, arms: w.__efRoot.children.filter((mesh: any) => /^cl-arm-/.test(mesh.name)).length, mantleHidden: !w.__efRoot.getObjectByName('cl-mantle').visible,
        eyeMeshes: w.__efEyeMeshes.length, eyeMaterials: new Set(w.__efEyeMeshes.map((mesh: any) => mesh.material)).size,
        eyeNames: w.__efEyeMeshes.map((mesh: any) => mesh.name).sort(), materialNames: [...new Set(w.__efEyeMeshes.map((mesh: any) => mesh.material.name))].sort(),
        compatibility: highlights.length === 2 && highlights.every((object: any) => object.isGroup && object.children.length === 0),
        opaque: w.__efEyeMeshes.every((mesh: any) => !mesh.material.transparent && mesh.material.opacity === 1 && mesh.material.depthWrite),
        textureFree: [...w.__efEyeMeshes, ...w.__efPlants].every((mesh: any) => Object.values(mesh.material).every((value: any) => !value?.isTexture)),
        eyeVertices: w.__efEyeMeshes.reduce((count: number, mesh: any) => count + mesh.geometry.attributes.position.count, 0),
        eyeTriangles: w.__efEyeMeshes.reduce((count: number, mesh: any) => count + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3, 0),
        plantKeys: [...new Set(w.__efPlants.map((mesh: any) => mesh.material.customProgramCacheKey()))],
        grass: w.__efPlants.filter((mesh: any) => mesh.name === 'cl-seagrass').length, kelp: kelp.length,
        instances: w.__efPlants.filter((mesh: any) => mesh.name === 'cl-seagrass').every((mesh: any) => mesh.isInstancedMesh && mesh.count === 7 && !mesh.frustumCulled && mesh.geometry.attributes.position.count === 33),
        fronds: kelp.map((mesh: any) => {
          const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, point = new T.Vector3();
          const box = geometry.boundingBox, sphere = geometry.boundingSphere;
          let contained = !!box && !!sphere, maxRadius = 0, unitNormals = true;
          for (let vertex = 0; vertex < p.count; vertex++) {
            point.fromBufferAttribute(p, vertex); maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.z));
            contained = contained && box.distanceToPoint(point) < .0000001 && point.distanceTo(sphere.center) <= sphere.radius + .0000001;
            unitNormals = unitNormals && Math.abs(Math.hypot(n.getX(vertex), n.getY(vertex), n.getZ(vertex)) - 1) < .00001;
          }
          return { vertices: p.count, triangles: geometry.index.count / 3, height: geometry.userData.clPlantHeight, maxY: box.max.y,
            roots: [p.getY(0), p.getY(1), p.getY(2)], contained, unitNormals, maxRadius,
            substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius, groundOffset: mesh.userData.groundOffset };
        }),
        programs: [...w.__efPrograms.values()], draws: w.__efDraws };
    });
    expect(anatomy.form).toMatchObject({ form: 'nautilus', arms: 90, feedingTentacles: 0 }); expect(anatomy.arms).toBe(90); expect(anatomy.mantleHidden).toBe(true);
    expect(anatomy.eyeMeshes).toBe(6); expect(anatomy.eyeMaterials).toBeLessThanOrEqual(3); expect(anatomy.opaque && anatomy.textureFree && anatomy.compatibility).toBe(true);
    expect(anatomy.eyeNames).toEqual(['cl-eye-rim', 'cl-eye-rim', 'cl-iris', 'cl-iris', 'cl-pupil', 'cl-pupil']);
    expect(anatomy.materialNames).toEqual(['cl-nautilus-eye-interior-material', 'cl-nautilus-eye-material']);
    expect(anatomy.eyeVertices).toBeGreaterThan(100); expect(anatomy.eyeVertices).toBeLessThanOrEqual(2000);
    expect(anatomy.eyeTriangles).toBeGreaterThan(100); expect(anatomy.eyeTriangles).toBeLessThanOrEqual(3000);
    expect(anatomy.grass).toBe(80); expect(anatomy.kelp).toBe(25); expect(anatomy.instances).toBe(true); expect(anatomy.plantKeys).toEqual(['cl-plant-flex-v15']);
    for (const frond of anatomy.fronds) {
      expect(frond.vertices).toBe(277); expect(frond.triangles).toBe(424); expect(frond.contained && frond.unitNormals).toBe(true);
      expect(frond.roots).toEqual([0, 0, 0]); expect(frond.maxY).toBeCloseTo(frond.height, 5);
      expect(frond.maxRadius).toBeLessThanOrEqual(1.25); expect(frond.substrate).toBe('grass'); expect(frond.radius).toBe(1.4); expect(frond.groundOffset).toBe(0);
    }
    for (const kind of ['eye', 'grass', 'kelp']) expect(anatomy.draws[kind], kind).toBeGreaterThan(0);
    const eyePrograms = anatomy.programs.filter((program: any) => program.kind === 'eye');
    expect(eyePrograms).toHaveLength(6); expect(new Set(eyePrograms.map((program: any) => program.meshId)).size).toBe(6);
    for (const program of anatomy.programs) {
      expect(program.linked, program.kind).toBe(true); expect(program.shaders).toHaveLength(2); expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
      expect(program.positionEnabled && program.positionBound, program.meshName).toBe(true); expect(program.positionSize).toBe(3);
      expect(program.normalMatrix).toHaveLength(9); expect(program.normalMatrix.every(Number.isFinite)).toBe(true); expect(Math.abs(program.normalDeterminant)).toBeGreaterThan(.00000001);
      const compiled = program.shaders.map((shader: any) => shader.source).join('\n');
      if (program.kind === 'eye') {
        expect(program.materialType).toBe('MeshStandardMaterial'); expect(compiled).not.toMatch(/clSwimEyeN|clOctoEyeN/);
      } else {
        expect(compiled).toContain('clPlantMotion'); expect(compiled).toContain('clPlantOffset'); expect(compiled).toContain('clPlantSlope');
        if (program.kind === 'grass') expect(compiled).toContain('#define USE_INSTANCING');
      }
    }
    const initial = await state(page); expectStable(initial, initial); expectNativeMotion(await nativePlantMotion(page), 1);
    await advance(page, 7); const moving = await state(page);
    expect(moving.shellAngle).not.toBe(initial.shellAngle); expect(moving.motion).not.toEqual(initial.motion); expectStable(moving, initial); expectNativeMotion(await nativePlantMotion(page), 1);
    await page.keyboard.press('Escape'); await advance(page, 2);
    const ordinaryPause = await state(page); await advance(page, 3);
    expect((await state(page)).motion).toEqual(ordinaryPause.motion);
    const pauseNative = await nativePlantMotion(page); expectNativeMotion(pauseNative, 1); expectFrozenNative(pauseNative, ordinaryPause);
    await page.keyboard.press('Escape'); await advance(page, 2);
    await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2);
    const inspected = await state(page); await advance(page, 5);
    const paused = await state(page); expect(paused.pose).toEqual(inspected.pose); expect(paused.motion).toEqual(inspected.motion); expect(paused.time).toBe(inspected.time); expect(paused.energy).toBe(inspected.energy); expectStable(paused, initial);
    await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6);
    const orbited = await state(page); expect(orbited.camera).not.toEqual(paused.camera); expect(orbited.renders).toBeGreaterThan(paused.renders); expect(orbited.pose).toEqual(inspected.pose); expect(orbited.motion).toEqual(inspected.motion);
    // Move out before testing Closer so the minimum zoom radius cannot make
    // the control a legitimate no-op for the compact nautilus.
    await page.getByRole('button', { name: 'Farther', exact: true }).click(); await advance(page, 4);
    const farther = await state(page);
    await page.getByRole('button', { name: 'Closer', exact: true }).click(); await advance(page, 5);
    const closer = await state(page); expect(closer.cameraDistance).toBeLessThan(farther.cameraDistance - .05); expect(closer.pose).toEqual(inspected.pose); expect(closer.motion).toEqual(inspected.motion);
    const framed = await modelFraming(page); expect(framed.count).toBeGreaterThan(anatomy.eyeVertices); expect(framed.finite && framed.visibleDepth).toBe(true); expect(framed.maxX).toBeLessThan(.95); expect(framed.maxY).toBeLessThan(.95);
    if (quality === 'balanced') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
      await advance(page, 8);
      const phone = await modelFraming(page); expect(phone.finite && phone.visibleDepth).toBe(true); expect(phone.maxX).toBeLessThan(.95); expect(phone.maxY).toBeLessThan(.95);
      await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
      await page.setViewportSize(initialViewport!);
      await page.evaluate(() => { document.getElementById('wrap')!.style.width = '900px'; window.dispatchEvent(new Event('resize')); });
      await advance(page, 4);
    }
    await page.locator('canvas[role=application]').focus();
    await page.keyboard.press('Escape'); await advance(page, 5);
    const resumed = await state(page); expect(resumed.motion).not.toEqual(inspected.motion); expect(resumed.shellAngle).not.toBe(inspected.shellAngle); expectStable(resumed, initial); expectNativeMotion(await nativePlantMotion(page), 1);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
    const reduced = await state(page); const reducedNative = await nativePlantMotion(page); expectNativeMotion(reducedNative, 0); expectFrozenNative(reducedNative, reduced); await advance(page, 5);
    const still = await state(page); expect(still.pose).toEqual(reduced.pose); expect(still.motion).toEqual(reduced.motion); expect(still.shellAngle).toBe(0); expectStable(still, initial);
    const stillNative = await nativePlantMotion(page); expectNativeMotion(stillNative, 0); expectFrozenNative(stillNative, reduced);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
    const final = await state(page); expect(final.motion).not.toEqual(reduced.motion); expect(final.shellAngle).not.toBe(0); expectStable(final, initial); expectNativeMotion(await nativePlantMotion(page), 1);
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__efResources.filter((resource: any) => !resource.disposed))).toEqual([]);
  });
}
