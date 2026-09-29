import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__livingStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__livingStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'cuttlefish', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__livingScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__livingRoot = w.__livingScene.getObjectByName('cl-player');
    w.__livingCorals = w.__livingScene.children.filter((object: any) => object.isMesh && object.name === 'cl-coral-colony');
    w.__livingBody = [];
    w.__livingRoot.traverse((object: any) => {
      if (object.isMesh && object.material.customProgramCacheKey() === 'cl-cuttle-surface-v14') w.__livingBody.push(object);
    });
    if (!w.__livingCorals.length || !w.__livingBody.length) throw new Error('Expected live cuttlefish and coral surface materials');
    w.__livingStep = 0;
    T.Clock.prototype.getDelta = function () { const dt = w.__livingStep; w.__livingStep = 0; return dt; };
    w.__livingScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    const materials = [...new Set<any>(w.__livingBody.map((mesh: any) => mesh.material))];
    // Obtain the actual material closures' shared uniform objects without
    // changing their live program, version, or rendering configuration.
    w.__livingUniforms = materials.map((material: any) => {
      const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
      material.onBeforeCompile(shader);
      return { material, uniforms: shader.uniforms };
    });
    w.__livingFrame = w.__livingUniforms[0].uniforms.clCuttleSurfaceFrame;
    w.__livingFrameValue = w.__livingFrame?.value;
    const resources = new Set<any>();
    w.__livingOwned = [...w.__livingBody, ...w.__livingCorals].map((mesh: any) => {
      resources.add(mesh.geometry); resources.add(mesh.material);
      Object.values(mesh.material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      return { mesh, coral: mesh.name === 'cl-coral-colony', geometry: mesh.geometry, material: mesh.material, materialKey: mesh.material.customProgramCacheKey(),
        attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]: [string, any]) => [name, { attribute, array: attribute.array, values: Array.from(attribute.array) }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
        metadata: JSON.stringify({ substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius, coralHex: mesh.userData.coralHex, groundOffset: mesh.userData.groundOffset, valid: mesh.userData.reefPlacementValid }) };
    });
    w.__livingResources = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
    w.__livingEpoch = 0;
    w.__livingPrograms = Object.fromEntries(['skin', 'arm', 'fin', 'coral'].map(kind => [kind, { draws: 0, program: null, epoch: -1, sample: null }]));
    function watch(mesh: any, kind: 'skin' | 'arm' | 'fin' | 'coral') {
      const original = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        original.call(this, renderer, scene, camera, geometry, material, group);
        w.__livingRenderer = renderer;
        const row = w.__livingPrograms[kind]; row.draws++;
        // Program inspection happens once per kind; uniform snapshots happen
        // only when the test explicitly requests one, never on every frame.
        if (row.program && (kind === 'coral' || row.epoch === w.__livingEpoch)) return;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        if (!row.program) {
          const attribute = kind === 'coral' ? gl.getAttribLocation(program, 'clCoralSurface') : -1;
          row.program = { linked: gl.getProgramParameter(program, gl.LINK_STATUS),
            shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })),
            surfaceAttribute: attribute < 0 ? null : { enabled: gl.getVertexAttrib(attribute, gl.VERTEX_ATTRIB_ARRAY_ENABLED), size: gl.getVertexAttrib(attribute, gl.VERTEX_ATTRIB_ARRAY_SIZE) } };
        }
        if (kind !== 'coral') {
          const read = (name: string) => { const location = gl.getUniformLocation(program, name); const value = location === null ? null : gl.getUniform(program, location); return value && typeof value !== 'number' ? Array.from(value) : value; };
          row.sample = { frame: read('clCuttleSurfaceFrame'), phase: read('clPhase'), pattern: read('clPattern'), display: read('clDisplay'), rootWorld: w.__livingRoot.matrixWorld.toArray() };
          row.epoch = w.__livingEpoch;
        }
      };
    }
    watch(w.__livingRoot.getObjectByName('cl-mantle'), 'skin');
    watch(w.__livingRoot.getObjectByName('cl-arm-0'), 'arm');
    w.__livingBody.filter((mesh: any) => mesh.name.startsWith('cl-fin-')).forEach((mesh: any) => watch(mesh, 'fin'));
    w.__livingCorals.forEach((mesh: any) => watch(mesh, 'coral'));
  });
  await page.locator('canvas[role=application]').focus(); await advance(page, 3);
}

async function uniformSample(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, T = w.THREE, epoch = ++w.__livingEpoch;
    for (let frame = 0; frame < 80 && ['skin', 'arm', 'fin'].some(kind => w.__livingPrograms[kind].epoch !== epoch); frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return ['skin', 'arm', 'fin'].map(kind => {
      const row = w.__livingPrograms[kind], sample = row.sample;
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
    w.__livingScene.updateMatrixWorld(true);
    const first = w.__livingUniforms[0].uniforms, inverse = new T.Matrix4().copy(w.__livingRoot.matrixWorld).invert();
    const frames = w.__livingUniforms.map((entry: any) => entry.uniforms.clCuttleSurfaceFrame);
    const bodyPose = ['cl-mantle', 'cl-arm-0', 'cl-fin--1', 'cl-fin-1'].map(name => {
      const mesh = w.__livingRoot.getObjectByName(name);
      return { name, scale: mesh.scale.toArray(), positions: Array.from(mesh.geometry.attributes.position.array) };
    });
    const geometries = new Set<any>(), materials = new Set<any>();
    w.__livingScene.traverse((mesh: any) => { if (mesh.isMesh || mesh.isPoints) { geometries.add(mesh.geometry); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => materials.add(material)); } });
    return { bodyPose, rootWorld: w.__livingRoot.matrixWorld.toArray(),
      sharedFrame: frames.length >= 4 && frames.every((frame: any) => frame && frame === w.__livingFrame && frame.value === w.__livingFrameValue),
      sharedLegacyUniforms: w.__livingUniforms.every((entry: any) => ['clPattern', 'clDisplay', 'clPhase'].every(name => entry.uniforms[name] === first[name])),
      inverseError: Math.max(...frames.map((frame: any) => frame ? Math.max(...frame.value.elements.map((value: number, index: number) => Math.abs(value - inverse.elements[index]))) : Infinity)),
      uniformValues: { pattern: first.clPattern?.value, display: first.clDisplay?.value, phase: first.clPhase?.value },
      stable: w.__livingOwned.every((owned: any) => owned.mesh.geometry === owned.geometry && owned.mesh.material === owned.material && owned.material.customProgramCacheKey() === owned.materialKey && owned.geometry.index === owned.index && owned.geometry.index?.array === owned.indexArray &&
        Object.entries(owned.attributes).every(([name, saved]: [string, any]) => owned.geometry.attributes[name] === saved.attribute && owned.geometry.attributes[name].array === saved.array)),
      staticBuffers: w.__livingOwned.every((owned: any) => Object.entries(owned.attributes).every(([name, saved]: [string, any]) => !owned.coral && ['position', 'normal'].includes(name) || saved.values.every((value: number, index: number) => value === saved.array[index])) && (!owned.indices || owned.indices.every((value: number, index: number) => value === owned.index.array[index]))),
      finite: w.__livingOwned.every((owned: any) => owned.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(owned.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite))),
      metadata: w.__livingOwned.every((owned: any) => JSON.stringify({ substrate: owned.mesh.userData.substrate, radius: owned.mesh.userData.substrateRadius, coralHex: owned.mesh.userData.coralHex, groundOffset: owned.mesh.userData.groundOffset, valid: owned.mesh.userData.reefPlacementValid }) === owned.metadata),
      geometryCount: geometries.size, materialCount: materials.size, resources: w.__livingResources.length,
      gpuGeometries: w.__livingRenderer.info.memory.geometries, gpuTextures: w.__livingRenderer.info.memory.textures,
      disposed: w.__livingResources.filter((resource: any) => resource.disposed).length };
  });
}

function expectStable(current: Awaited<ReturnType<typeof state>>, baseline: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.staticBuffers && current.finite && current.metadata).toBe(true);
  expect(current.sharedFrame && current.sharedLegacyUniforms).toBe(true); expect(current.inverseError).toBeLessThan(.000001);
  expect(current.geometryCount).toBe(baseline.geometryCount); expect(current.materialCount).toBe(baseline.materialCount);
  expect(current.resources).toBe(baseline.resources); expect(current.disposed).toBe(0);
  expect(current.gpuGeometries).toBeGreaterThan(0); expect(current.gpuGeometries).toBeLessThanOrEqual(current.geometryCount);
  expect(current.gpuTextures).toBe(baseline.gpuTextures);
}

function expectCoherentUniforms(samples: Awaited<ReturnType<typeof uniformSample>>, display: number) {
  expect(samples).toHaveLength(3);
  for (const sample of samples) {
    expect(sample.fresh, sample.kind).toBe(true); expect(sample.frame, sample.kind).toHaveLength(16);
    expect(sample.frame.every(Number.isFinite), sample.kind).toBe(true); expect(sample.inverseError, sample.kind).toBeLessThan(.00002);
    expect(Number.isFinite(sample.phase), sample.kind).toBe(true); expect(sample.display, sample.kind).toBeCloseTo(display, 5);
    expect([.22, .72, .9].some(value => Math.abs(value - sample.pattern) < .00001), sample.kind).toBe(true);
  }
  expect(samples.every(sample => sample.phase === samples[0].phase && sample.pattern === samples[0].pattern && sample.display === samples[0].display)).toBe(true);
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
  test(`${quality} living surfaces render coherently through display, motion settings and teardown`, async ({ page }) => {
    await mount(page, quality);
    const initial = await state(page);
    const audit = await page.evaluate(() => {
      const w = window as any;
      return { programs: w.__livingPrograms,
        bodyNames: [...new Set(w.__livingUniforms.map((entry: any) => entry.material.name))].sort(),
        coralKeys: [...new Set(w.__livingCorals.map((mesh: any) => mesh.material.customProgramCacheKey()))],
        coral: w.__livingCorals.map((mesh: any) => {
          const attribute = mesh.geometry.attributes.clCoralSurface;
          if (!attribute) return { valid: false };
          let valid = attribute.itemSize === 4 && attribute.count === mesh.geometry.attributes.position.count;
          let basalOrCap = false, livePores = false;
          for (let vertex = 0; vertex < attribute.count; vertex++) {
            const x = attribute.getX(vertex), y = attribute.getY(vertex), fade = attribute.getZ(vertex), cells = attribute.getW(vertex);
            valid = valid && [x, y, fade, cells].every(Number.isFinite) && x >= -.00001 && x <= cells + .00001 && fade >= 0 && fade <= 1 && Number.isInteger(cells) && cells >= 6 && cells <= 29;
            basalOrCap ||= fade === 0; livePores ||= fade > .5;
          }
          return { valid, basalOrCap, livePores };
        }) };
    });
    expect(audit.bodyNames).toEqual(['cl-cuttle-arm-material', 'cl-cuttle-fin-material', 'cl-cuttle-skin-material']);
    expect(audit.coralKeys).toEqual(['cl-coral-surface-v14']);
    expect(audit.coral.length).toBeGreaterThan(0); expect(audit.coral.every((coral: any) => coral.valid && coral.basalOrCap && coral.livePores)).toBe(true);
    for (const kind of ['skin', 'arm', 'fin', 'coral']) {
      const row = audit.programs[kind];
      expect(row.draws, kind).toBeGreaterThan(0); expect(row.program?.linked, kind).toBe(true);
      expect(row.program.shaders, kind).toHaveLength(2); expect(row.program.shaders.every((shader: any) => shader.compiled), kind).toBe(true);
      const compiled = row.program.shaders.map((shader: any) => shader.source).join('\n');
      if (kind === 'coral') {
        expect(compiled).toContain('vCLCoralSurface'); expect(compiled).toContain('clCoralPoreField');
        expect(row.program.surfaceAttribute).toEqual({ enabled: true, size: 4 });
      } else {
        expect(compiled).toContain('clCuttleSurfaceFrame'); expect(compiled).toContain('clCuttlePos');
        expect(compiled).toContain('clCutPairedMantle'); expect(compiled).toContain('clCutDetailFilter');
        expect(compiled).toContain('clDisplay'); expect(compiled).toContain('clPhase');
      }
    }
    expectCoherentUniforms(await uniformSample(page), 0); expectStable(initial, initial);
    await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await advance(page, 9); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
    const moved = await state(page);
    expect(Math.hypot(moved.rootWorld[12] - initial.rootWorld[12], moved.rootWorld[14] - initial.rootWorld[14])).toBeGreaterThan(.05);
    expect(moved.rootWorld.slice(0, 12)).not.toEqual(initial.rootWorld.slice(0, 12));
    expect(moved.bodyPose).not.toEqual(initial.bodyPose); expectStable(moved, initial);
    expectCoherentUniforms(await uniformSample(page), 0);
    await page.keyboard.down('KeyH'); await advance(page, 3);
    const displayStarted = await uniformSample(page); expectCoherentUniforms(displayStarted, .9);
    await advance(page, 4); const displayAdvanced = await uniformSample(page); expectCoherentUniforms(displayAdvanced, .9);
    expect(displayAdvanced[0].phase).toBeGreaterThan(displayStarted[0].phase);
    await page.keyboard.up('KeyH'); await advance(page, 2); expectCoherentUniforms(await uniformSample(page), 0);
    await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
    const inspected = await state(page), inspectedUniforms = await uniformSample(page); await advance(page, 5);
    const paused = await state(page); expect(paused.bodyPose).toEqual(inspected.bodyPose); expect(paused.uniformValues).toEqual(inspected.uniformValues); expectStable(paused, initial);
    expect(await uniformSample(page)).toEqual(inspectedUniforms);
    await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 5);
    const resumed = await state(page); expect(resumed.bodyPose).not.toEqual(inspected.bodyPose); expectStable(resumed, initial);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
    const reduced = await state(page); await advance(page, 5);
    const reducedLater = await state(page); expect(reducedLater.bodyPose).toEqual(reduced.bodyPose); expectStable(reducedLater, initial); expectCoherentUniforms(await uniformSample(page), 0);
    // clPhase keeps its legacy simulation-time meaning under reduced motion;
    // display is off, and the mantle/arm/fin geometry must remain still.
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
    const final = await state(page); expect(final.bodyPose).not.toEqual(reduced.bodyPose); expectStable(final, initial); expectCoherentUniforms(await uniformSample(page), 0);
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__livingResources.filter((resource: any) => !resource.disposed))).toEqual([]);
  });
}
