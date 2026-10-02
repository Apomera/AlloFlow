import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'),
  toolId: 'cephalopodLab', width: 1280, height: 1000, layout: 'document'
});
const errors = new WeakMap<Page, string[]>();
const kinds = ['mantle', 'arm', 'finLeft', 'finRight'] as const;
const key = 'cl-squid-surface-v27-mottled';

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__sqStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__sqStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true,
    huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(cacheKey => {
    const w = window as any, T = w.THREE;
    const live = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected);
    if (live.length !== 1 || live[0].createdBy !== 'page' || live[0].draws <= 0) throw new Error('Expected one page-created, drawn squid context');
    w.__sqRecord = live[0]; w.__sqScene = live[0].scene;
    w.__sqRoot = w.__sqScene.getObjectByName('cl-player');
    if (w.__sqRoot?.userData.species !== 'humboldtSquid') throw new Error('Expected the production Humboldt rig');
    w.__sqStep = 0;
    T.Clock.prototype.getDelta = function () { const dt = w.__sqStep; w.__sqStep = 0; return dt; };
    // Keep the short motion sequence clear of a surprise predator attack.
    w.__sqScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    const resources = new Set<any>(), body: any[] = [];
    w.__sqRoot.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      resources.add(mesh.geometry);
      materials.forEach((material: any) => {
        resources.add(material);
        Object.values(material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      });
      body.push({ mesh, geometry: mesh.geometry, material: mesh.material,
        keys: materials.map((material: any) => material.customProgramCacheKey()),
        attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]: [string, any]) =>
          [name, { attribute, array: attribute.array, values: Array.from(attribute.array) }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array,
        indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
        instanceMatrix: mesh.instanceMatrix, instanceMatrixArray: mesh.instanceMatrix?.array,
        instanceColor: mesh.instanceColor, instanceColorArray: mesh.instanceColor?.array,
        anatomy: JSON.stringify(mesh.geometry.userData) });
    });
    w.__sqOwned = body;
    w.__sqResources = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false };
      resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
    w.__sqUniforms = null; w.__sqEpoch = 0;
    w.__sqPrograms = Object.fromEntries(['mantle', 'arm', 'finLeft', 'finRight'].map(kind =>
      [kind, { draws: 0, program: null, epoch: -1, sample: null }]));
    function watch(name: string, kind: string) {
      const mesh = w.__sqRoot.getObjectByName(name);
      if (!mesh?.isMesh || mesh.material.customProgramCacheKey() !== cacheKey) throw new Error('Expected filtered skin on ' + name);
      const original = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        original.call(this, renderer, scene, camera, geometry, material, group);
        w.__sqRenderer = renderer;
        if (!w.__sqUniforms) {
          const materials = [...new Set<any>(body.map((owned: any) => owned.mesh.material)
            .filter((entry: any) => !Array.isArray(entry) && entry.customProgramCacheKey() === cacheKey))];
          // Read the real material closures without replacing/versioning their
          // live programs. Passing the live renderer selects its derivative gate.
          w.__sqUniforms = materials.map((entry: any) => {
            const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
            entry.onBeforeCompile(shader, renderer); return { material: entry, uniforms: shader.uniforms };
          });
          w.__sqFrame = w.__sqUniforms[0].uniforms.clSurfaceFrame;
          w.__sqFrameValue = w.__sqFrame?.value;
        }
        const row = w.__sqPrograms[kind]; row.draws++;
        if (row.program && row.epoch === w.__sqEpoch) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        if (!row.program) row.program = {
          linked: gl.getProgramParameter(program, gl.LINK_STATUS),
          shaders: gl.getAttachedShaders(program).map((shader: any) => ({
            type: gl.getShaderParameter(shader, gl.SHADER_TYPE), compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader)
          })),
          webgl2: renderer.capabilities.isWebGL2,
          derivatives: renderer.capabilities.isWebGL2 || renderer.extensions.has('OES_standard_derivatives')
        };
        const location = gl.getUniformLocation(program, 'clSurfaceFrame');
        const value = location === null ? null : gl.getUniform(program, location);
        row.sample = { frame: value === null ? null : Array.from(value), rootWorld: w.__sqRoot.matrixWorld.toArray() };
        row.epoch = w.__sqEpoch;
      };
    }
    watch('cl-mantle', 'mantle'); watch('cl-arm-0', 'arm');
    watch('cl-fin--1', 'finLeft'); watch('cl-fin-1', 'finRight');
  }, key);
  await page.locator('canvas[role=application]').focus(); await advance(page, 3);
}

async function samples(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, T = w.THREE, epoch = ++w.__sqEpoch;
    const names = ['mantle', 'arm', 'finLeft', 'finRight'];
    for (let frame = 0; frame < 96 && names.some(kind => w.__sqPrograms[kind].epoch !== epoch); frame++)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return names.map(kind => {
      const row = w.__sqPrograms[kind], sample = row.sample;
      let inverseError = Infinity;
      if (sample?.frame?.length === 16) {
        const identity = new T.Matrix4().fromArray(sample.frame).multiply(new T.Matrix4().fromArray(sample.rootWorld)).elements;
        inverseError = Math.max(...identity.map((value: number, index: number) => Math.abs(value - (index % 5 === 0 ? 1 : 0))));
      }
      return { kind, fresh: row.epoch === epoch, inverseError, ...sample };
    });
  });
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__sqScene.updateMatrixWorld(true);
    const uniforms = w.__sqUniforms, first = uniforms?.[0]?.uniforms;
    const inverse = new T.Matrix4().copy(w.__sqRoot.matrixWorld).invert();
    const frames = uniforms?.map((entry: any) => entry.uniforms.clSurfaceFrame) || [];
    const geometries = new Set<any>(), materials = new Set<any>();
    w.__sqScene.traverse((mesh: any) => {
      if (mesh.isMesh || mesh.isPoints) {
        geometries.add(mesh.geometry);
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material));
      }
    });
    return { rootWorld: w.__sqRoot.matrixWorld.toArray(),
      bodyPose: ['cl-mantle', 'cl-arm-0', 'cl-fin--1', 'cl-fin-1'].map(name => {
        const mesh = w.__sqRoot.getObjectByName(name);
        return { name, scale: mesh.scale.toArray(), positions: Array.from(mesh.geometry.attributes.position.array) };
      }),
      sharedFrame: frames.length === 4 && frames.every((frame: any) => frame === w.__sqFrame && frame.value === w.__sqFrameValue),
      sharedLegacy: !!first && uniforms.every((entry: any) => ['clPattern', 'clDisplay', 'clPhase'].every(name => entry.uniforms[name] === first[name])),
      inverseError: frames.length ? Math.max(...frames.map((frame: any) =>
        Math.max(...frame.value.elements.map((value: number, index: number) => Math.abs(value - inverse.elements[index]))))) : Infinity,
      legacy: first ? { pattern: first.clPattern.value, display: first.clDisplay.value, phase: first.clPhase.value } : null,
      stable: w.__sqOwned.every((owned: any) => owned.mesh.geometry === owned.geometry && owned.mesh.material === owned.material &&
        (Array.isArray(owned.material) ? owned.material : [owned.material]).every((material: any, i: number) => material.customProgramCacheKey() === owned.keys[i]) &&
        owned.geometry.index === owned.index && owned.geometry.index?.array === owned.indexArray &&
        Object.entries(owned.attributes).every(([name, saved]: [string, any]) => owned.geometry.attributes[name] === saved.attribute && owned.geometry.attributes[name].array === saved.array) &&
        owned.mesh.instanceMatrix === owned.instanceMatrix && owned.mesh.instanceMatrix?.array === owned.instanceMatrixArray &&
        owned.mesh.instanceColor === owned.instanceColor && owned.mesh.instanceColor?.array === owned.instanceColorArray),
      staticBuffers: w.__sqOwned.every((owned: any) =>
        Object.entries(owned.attributes).every(([name, saved]: [string, any]) => ['position', 'normal'].includes(name) || saved.values.every((value: number, i: number) => value === saved.array[i])) &&
        (!owned.indices || owned.indices.every((value: number, i: number) => value === owned.index.array[i]))),
      finite: w.__sqOwned.every((owned: any) => owned.mesh.matrixWorld.elements.every(Number.isFinite) &&
        Object.values(owned.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite)) &&
        (!owned.mesh.instanceMatrix || Array.from(owned.mesh.instanceMatrix.array).every(Number.isFinite))),
      metadata: w.__sqOwned.every((owned: any) => JSON.stringify(owned.geometry.userData) === owned.anatomy),
      ownedMeshes: w.__sqOwned.length, geometryCount: geometries.size, materialCount: materials.size,
      resources: w.__sqResources.length, disposed: w.__sqResources.filter((resource: any) => resource.disposed).length,
      gpuGeometries: w.__sqRenderer.info.memory.geometries, gpuTextures: w.__sqRenderer.info.memory.textures,
      record: { id: w.__sqRecord.id, createdBy: w.__sqRecord.createdBy, lost: !!w.__sqRecord.lostAt, draws: w.__sqRecord.draws }
    };
  });
}

function expectStable(current: Awaited<ReturnType<typeof state>>, baseline: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.staticBuffers && current.finite && current.metadata).toBe(true);
  expect(current.sharedFrame && current.sharedLegacy).toBe(true); expect(current.inverseError).toBeLessThan(.000001);
  expect(Object.values(current.legacy!).every(Number.isFinite)).toBe(true);
  expect(current.ownedMeshes).toBe(baseline.ownedMeshes); expect(current.resources).toBe(baseline.resources);
  expect(current.geometryCount).toBe(baseline.geometryCount); expect(current.materialCount).toBe(baseline.materialCount);
  expect(current.disposed).toBe(0);
  expect(current.gpuGeometries).toBeGreaterThan(0); expect(current.gpuGeometries).toBeLessThanOrEqual(current.geometryCount);
  expect(current.gpuTextures).toBe(baseline.gpuTextures);
  expect(current.record.id).toBe(baseline.record.id); expect(current.record.createdBy).toBe('page'); expect(current.record.lost).toBe(false);
  expect(current.record.draws).toBeGreaterThan(0);
}

function expectSamples(readbacks: Awaited<ReturnType<typeof samples>>) {
  expect(readbacks.map(sample => sample.kind)).toEqual([...kinds]);
  for (const sample of readbacks) {
    expect(sample.fresh, sample.kind).toBe(true); expect(sample.frame, sample.kind).toHaveLength(16);
    expect(sample.frame.every(Number.isFinite), sample.kind).toBe(true);
    expect(sample.rootWorld.every(Number.isFinite), sample.kind).toBe(true);
    expect(sample.inverseError, sample.kind).toBeLessThan(.00002);
  }
  expect(readbacks.every(sample => sample.frame.every((value: number, i: number) => value === readbacks[0].frame[i]))).toBe(true);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  // Test the production cleanup before the harness can force any context loss.
  try {
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    const resources = await page.evaluate(() => (window as any).__sqResources || []);
    if (resources.length) expect(resources.filter((resource: any) => !resource.disposed)).toEqual([]);
  } finally {
    await harness.destroy(page); expect(errors.get(page)).toEqual([]);
  }
});

for (const quality of ['low', 'balanced'] as const) {
  test(`${quality} squid pigment renders through motion, jet, inspection and reduced motion without new resources`, async ({ page }, testInfo) => {
    await mount(page, quality);
    const initial = await state(page), initialSamples = await samples(page);
    const profile = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[role=application]') as HTMLCanvasElement;
      return { viewport: [window.innerWidth, window.innerHeight], client: [canvas.clientWidth, canvas.clientHeight],
        stageClasses: Array.from(canvas.parentElement!.classList), maxTouchPoints: navigator.maxTouchPoints,
        coarsePointer: matchMedia('(pointer: coarse)').matches, anyCoarsePointer: matchMedia('(any-pointer: coarse)').matches };
    });
    const programs = await page.evaluate(() => (window as any).__sqPrograms);
    for (const kind of kinds) {
      const row = programs[kind]; expect(row.draws, kind).toBeGreaterThan(0);
      expect(row.program?.linked, kind).toBe(true); expect(row.program.derivatives, kind).toBe(true);
      expect(row.program.shaders, kind).toHaveLength(2); expect(row.program.shaders.every((shader: any) => shader.compiled), kind).toBe(true);
      const vertex = row.program.shaders.find((shader: any) => shader.type === 35633).source;
      const fragment = row.program.shaders.find((shader: any) => shader.type === 35632).source;
      expect(vertex).toContain('clSurfaceFrame * modelMatrix * vec4(position,1.0)');
      expect(fragment).toContain('float clSqHash('); expect(fragment).toContain('return clSqHash(p.x,p.y,p.z);');
      // Three's unrelated common rand() also uses this multiplier. Scope the
      // absence check to the old pigment hash, not the whole shader prefix.
      expect(fragment).not.toContain('return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453)');
      expect(fragment).toContain('clSqDetailFilter(length(fwidth(clSqFinePos)))');
      expect(fragment).toContain('clSqDetailFilter(length(fwidth(clSqGrainPos)))');
      expect(fragment).toContain('diffuseColor.rgb*=clSqPigmentTone('); expect(fragment).toContain('roughnessFactor=clSqRoughness(');
      expect(fragment).toContain('float clSqMottleTone('); expect(fragment).toContain('diffuseColor.rgb*=clSqMottleTone(clPatch,clDorsal,clVentral);');
    }
    expectStable(initial, initial); expectSamples(initialSamples);
    await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await advance(page, 7);
    await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
    const moved = await state(page), movedSamples = await samples(page);
    expect(Math.hypot(moved.rootWorld[12] - initial.rootWorld[12], moved.rootWorld[14] - initial.rootWorld[14])).toBeGreaterThan(.05);
    expect(moved.rootWorld.slice(0, 12)).not.toEqual(initial.rootWorld.slice(0, 12));
    expect(moved.bodyPose).not.toEqual(initial.bodyPose); expectStable(moved, initial); expectSamples(movedSamples);
    expect(movedSamples[0].frame).not.toEqual(initialSamples[0].frame);
    await page.keyboard.down('KeyW'); await page.keyboard.down('Space'); await advance(page, 4);
    await expect(page.locator('[data-hud=burn]')).toContainText('Jetting');
    const jet = await state(page), jetSamples = await samples(page);
    expect(jet.bodyPose).not.toEqual(moved.bodyPose); expectStable(jet, initial); expectSamples(jetSamples);
    await page.keyboard.up('Space'); await page.keyboard.up('KeyW'); await advance(page, 3);
    await page.locator('canvas[role=application]').focus(); await page.keyboard.press('KeyF');
    await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeVisible();
    const inspected = await state(page), inspectedSamples = await samples(page); await advance(page, 5);
    const paused = await state(page); expect(paused.bodyPose).toEqual(inspected.bodyPose); expect(paused.rootWorld).toEqual(inspected.rootWorld);
    expect(paused.legacy).toEqual(inspected.legacy); expectStable(paused, initial);
    expect(await samples(page)).toEqual(inspectedSamples);
    await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 5);
    const resumed = await state(page); expect(resumed.bodyPose).not.toEqual(inspected.bodyPose); expectStable(resumed, initial); expectSamples(await samples(page));
    const tools = page.getByRole('button', { name: 'Tools', exact: true });
    if (await tools.isVisible()) {
      await tools.click();
      await expect(page.getByRole('dialog', { name: 'Dive tools and details', exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
    await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 3);
    const reduced = await state(page); await advance(page, 5);
    const reducedLater = await state(page); expect(reducedLater.bodyPose).toEqual(reduced.bodyPose);
    expectStable(reducedLater, initial); expectSamples(await samples(page));
    const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull();
    expect(pixels!.width).toBeGreaterThan(250); expect(pixels!.height).toBeGreaterThan(100);
    expect(pixels!.significantColors).toBeGreaterThan(3); expect(pixels!.dominantShare).toBeLessThan(.995);
    await testInfo.attach(`${quality}-squid-gl.png`, { body: pixels!.png, contentType: 'image/png' });
    await testInfo.attach(`${quality}-squid-programs.json`, { body: JSON.stringify({
      quality, profile, initialSamples, movedSamples, jetSamples, inspectedSamples,
      programAudit: Object.fromEntries(kinds.map(kind => [kind, { draws: programs[kind].draws, ...programs[kind].program }])),
      ownership: { meshes: initial.ownedMeshes, resources: initial.resources, geometryCount: initial.geometryCount, materialCount: initial.materialCount, gpuTextures: initial.gpuTextures },
      pixelStats: { significantColors: pixels!.significantColors, dominantShare: pixels!.dominantShare }
    }, null, 2), contentType: 'application/json' });
    expect(errors.get(page)).toEqual([]);
  });
}
