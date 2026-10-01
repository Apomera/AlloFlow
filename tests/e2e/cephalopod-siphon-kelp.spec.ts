import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'),
  toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();

async function step(page: Page, frames: number, codes: string[] = []) {
  await page.evaluate(async ({ frames, codes }) => {
    const w = window as any, target = document.querySelector('canvas[role=application]')!;
    const key = (type: string, code: string) => target.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code.slice(3).toLowerCase(), bubbles: true, cancelable: true }));
    codes.forEach(code => key('keydown', code));
    try {
      for (let frame = 0; frame < frames; frame++) {
        w.__skStep = .05;
        do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__skStep !== 0);
      }
    } finally { codes.forEach(code => key('keyup', code)); }
  }, { frames, codes });
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__skScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__skPlayer = w.__skScene.getObjectByName('cl-player');
    w.__skSiphonGroup = w.__skPlayer.getObjectByName('cl-siphon');
    w.__skSiphon = w.__skSiphonGroup.getObjectByName('cl-siphon-tube');
    w.__skKelp = w.__skScene.children.filter((o: any) => o.name === 'cl-kelp');
    if (w.__skSiphonGroup.children.length !== 1 || w.__skKelp.length !== 25) throw new Error('Expected one actual funnel mesh and the original 25 kelp actors');
    w.__skSelected = [...w.__skKelp].sort((a: any, b: any) => a.geometry.userData.clPlantHeight - b.geometry.userData.clPlantHeight)[0];
    w.__skFixture = { selectedKelp: w.__skSelected.uuid, originalKelpPosition: w.__skSelected.position.toArray(), scope: 'One existing kelp is relocated for native submission diagnostics; this is not a natural-spawn composition test.' };
    w.__skSelected.position.x = w.__skPlayer.position.x + 1.7;
    w.__skSelected.position.z = w.__skPlayer.position.z + 2;
    w.__skStep = 0;
    T.Clock.prototype.getDelta = function () { const dt = w.__skStep; w.__skStep = 0; return dt; };
    w.__skScene.children.forEach((o: any) => { if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
    w.__skResources = [];
    const resources = new Set<any>();
    w.__skOwned = [w.__skSiphon, ...w.__skKelp].map((mesh: any) => {
      for (const resource of [mesh.geometry, mesh.material]) {
        if (resources.has(resource)) throw new Error('Funnel and each kelp must own independent resources');
        resources.add(resource); const saved = { uuid: resource.uuid, disposed: 0 };
        resource.addEventListener('dispose', () => saved.disposed++); w.__skResources.push(saved);
      }
      let motion: any = null;
      if (mesh.name === 'cl-kelp') {
        // This detached template exposes the real closure's existing uniform.
        // It does not replace or invalidate the renderer's native program.
        const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
        mesh.material.onBeforeCompile(shader); motion = (shader.uniforms as any).clPlantMotion;
      }
      return { mesh, geometry: mesh.geometry, material: mesh.material, key: mesh.material.customProgramCacheKey(),
        attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])),
        index: mesh.geometry.index, indexArray: mesh.geometry.index.array, indices: Array.from(mesh.geometry.index.array),
        motion, motionValue: motion?.value,
        metadata: JSON.stringify({ height: mesh.geometry.userData.clPlantHeight, substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius, groundOffset: mesh.userData.groundOffset }),
        materialFlags: [mesh.material.transparent, mesh.material.opacity, mesh.material.depthWrite, mesh.material.vertexColors, mesh.material.side] };
    });
    w.__skEpoch = 0; w.__skSamples = {}; w.__skPrograms = new Map(); w.__skBuffers = new Map(); w.__skNativeStable = true;
    const afterScene = w.__skScene.onAfterRender;
    w.__skScene.onAfterRender = function (renderer: any, scene: any, camera: any) {
      afterScene.call(this, renderer, scene, camera); w.__skRenderer = renderer; w.__skCamera = camera;
    };
    function watch(mesh: any, kind: string) {
      const before = mesh.onBeforeRender, after = mesh.onAfterRender;
      mesh.onBeforeRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        before.call(this, renderer, scene, camera, geometry, material, group);
        const gl = renderer.getContext();
        if (!w.__skWrappedGL) {
          w.__skWrappedGL = gl;
          const elements = gl.drawElements.bind(gl), arrays = gl.drawArrays.bind(gl);
          gl.drawElements = function (mode: number, count: number, type: number, offset: number) {
            if (w.__skDrawing) w.__skLastDraw = { kind: w.__skDrawing, indexed: true, mode, count, type, offset, buffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING), program: gl.getParameter(gl.CURRENT_PROGRAM) };
            return elements(mode, count, type, offset);
          };
          gl.drawArrays = function (mode: number, first: number, count: number) {
            if (w.__skDrawing) w.__skLastDraw = { kind: w.__skDrawing, indexed: false, mode, first, count };
            return arrays(mode, first, count);
          };
        }
        w.__skDrawing = kind; w.__skLastDraw = null;
      };
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        after.call(this, renderer, scene, camera, geometry, material, group);
        w.__skDrawing = null; w.__skRenderer = renderer; w.__skCamera = camera;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), draw = w.__skLastDraw;
        const bindings = ['position', 'normal', 'color'].map(name => {
          const at = gl.getAttribLocation(program, name), buffer = at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = kind + '/' + name;
          if (w.__skBuffers.has(key)) w.__skNativeStable &&= w.__skBuffers.get(key) === buffer; else w.__skBuffers.set(key, buffer);
          return { name, size: at < 0 ? 0 : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: at >= 0 && gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer };
        });
        const indexKey = kind + '/index';
        if (w.__skBuffers.has(indexKey)) w.__skNativeStable &&= w.__skBuffers.get(indexKey) === draw?.buffer; else w.__skBuffers.set(indexKey, draw?.buffer);
        const location = gl.getUniformLocation(program, 'normalMatrix'), normal = location === null ? null : Array.from(gl.getUniform(program, location));
        const motionAt = gl.getUniformLocation(program, 'clPlantMotion'), motion = motionAt === null ? null : Array.from(gl.getUniform(program, motionAt));
        w.__skSamples[kind] = { epoch: w.__skEpoch, motion, normal, determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null,
          draw: draw && { own: draw.kind === kind && draw.program === program, indexed: draw.indexed, triangles: draw.mode === gl.TRIANGLES, count: draw.count, offset: draw.offset, bound: !!draw.buffer },
          bindings, blended: gl.isEnabled(gl.BLEND), depthWrite: gl.getParameter(gl.DEPTH_WRITEMASK) };
        if (!w.__skPrograms.has(kind)) w.__skPrograms.set(kind, { kind, type: material.type, material: material.name, key: material.customProgramCacheKey(), linked: gl.getProgramParameter(program, gl.LINK_STATUS),
          shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    }
    watch(w.__skSiphon, 'siphon'); watch(w.__skSelected, 'kelp');
  });
  await page.locator(canvas).focus(); await step(page, 4);
}

async function native(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, epoch = ++w.__skEpoch;
    for (let frame = 0; frame < 60 && ['siphon', 'kelp'].some(kind => w.__skSamples[kind]?.epoch !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const owned = w.__skOwned.find((r: any) => r.mesh === w.__skSelected);
    return { rows: ['siphon', 'kelp'].map(kind => ({ kind, ...w.__skSamples[kind], fresh: w.__skSamples[kind]?.epoch === epoch })), programs: [...w.__skPrograms.values()], liveMotion: owned.motion.value.toArray(), height: owned.geometry.userData.clPlantHeight };
  });
}

async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any; w.__skScene.updateMatrixWorld(true);
    const motion = w.__skOwned.filter((r: any) => r.motion);
    return { player: w.__skPlayer.position.toArray(), heading: w.__skPlayer.rotation.y, camera: w.__skCamera.position.toArray(), cameraDistance: w.__skCamera.position.distanceTo(w.__skPlayer.position),
      pose: { player: w.__skPlayer.matrixWorld.toArray(), siphon: w.__skSiphon.matrixWorld.toArray(), mantle: w.__skPlayer.getObjectByName('cl-mantle').scale.toArray(), arms: ['cl-arm-0', 'cl-tentacle-0', 'cl-fin-1'].map(name => Array.from(w.__skPlayer.getObjectByName(name).geometry.attributes.position.array)) },
      localSiphon: [w.__skSiphonGroup.position.toArray(), w.__skSiphonGroup.quaternion.toArray(), w.__skSiphonGroup.scale.toArray(), w.__skSiphon.position.toArray(), w.__skSiphon.quaternion.toArray(), w.__skSiphon.scale.toArray()],
      time: document.querySelector('[data-hud=time]')?.textContent, energy: document.querySelector('[data-hud=energy]')?.textContent,
      motion: motion.map((r: any) => r.motion.value.toArray()), independentMotion: new Set(motion.map((r: any) => r.motion)).size === 25 && new Set(motion.map((r: any) => r.motion.value)).size === 25,
      stable: w.__skOwned.every((r: any) => r.mesh.geometry === r.geometry && r.mesh.material === r.material && r.material.customProgramCacheKey() === r.key && r.geometry.index === r.index && r.index.array === r.indexArray && r.indices.every((v: number, i: number) => v === r.indexArray[i]) && (!r.motion || r.motion.value === r.motionValue) && Object.entries(r.attrs).every(([name, old]: [string, any]) => r.geometry.attributes[name] === old.attr && old.attr.array === old.array && old.attr.version === old.version && old.values.every((v: number, i: number) => v === old.array[i]))),
      metadata: w.__skOwned.every((r: any) => JSON.stringify({ height: r.geometry.userData.clPlantHeight, substrate: r.mesh.userData.substrate, radius: r.mesh.userData.substrateRadius, groundOffset: r.mesh.userData.groundOffset }) === r.metadata && JSON.stringify([r.material.transparent, r.material.opacity, r.material.depthWrite, r.material.vertexColors, r.material.side]) === JSON.stringify(r.materialFlags)),
      finite: w.__skOwned.every((r: any) => r.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(r.geometry.attributes).every((a: any) => Array.from(a.array).every(Number.isFinite))),
      nativeStable: w.__skNativeStable, resources: w.__skResources.length, disposed: w.__skResources.map((r: any) => r.disposed), textures: w.__skRenderer.info.memory.textures,
      renders: w.__glRecorder.records.filter((r: any) => r.scene === w.__skScene).at(-1).renders };
  });
}

function stable(current: Awaited<ReturnType<typeof state>>, baseline: Awaited<ReturnType<typeof state>>) {
  expect(current.stable && current.metadata && current.finite && current.nativeStable && current.independentMotion).toBe(true);
  expect(current.localSiphon).toEqual(baseline.localSiphon); expect(current.resources).toBe(52);
  expect(current.disposed).toEqual(Array(52).fill(0)); expect(current.textures).toBe(baseline.textures);
}

function rendered(result: Awaited<ReturnType<typeof native>>, enabled: number) {
  expect(result.programs).toHaveLength(2);
  for (const program of result.programs) {
    expect(program.type).toBe('MeshStandardMaterial'); expect(program.linked).toBe(true);
    expect(program.shaders).toHaveLength(2); expect(program.shaders.every((s: any) => s.compiled)).toBe(true);
    const shader = program.shaders.map((s: any) => s.source).join('\n'); expect(shader).toContain('#define USE_COLOR');
    if (program.kind === 'kelp') { expect(program.key).toBe('cl-plant-flex-v15'); for (const marker of ['clPlantMotion', 'clPlantOffset', 'clPlantSlope']) expect(shader).toContain(marker); }
    else expect(program.material).toBe('cl-squid-siphon-material');
  }
  for (const row of result.rows) {
    expect(row.fresh, row.kind).toBe(true); expect(row.draw, row.kind).toMatchObject({ own: true, indexed: true, triangles: true, offset: 0, bound: true, count: row.kind === 'siphon' ? 1152 * 3 : 424 * 3 });
    for (const binding of row.bindings) { expect(binding.enabled && binding.bound, row.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); }
    expect(row.normal).toHaveLength(9); expect(row.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(row.determinant)).toBeGreaterThan(1e-8);
    if (row.kind === 'siphon') { expect(row.blended).toBe(false); expect(row.depthWrite).toBe(true); }
    else {
      expect(row.blended).toBe(true); expect(row.depthWrite).toBe(false);
      expect(row.motion).toHaveLength(4); expect(row.motion.every(Number.isFinite)).toBe(true);
      expect(row.motion[0]).toBeGreaterThanOrEqual(0); expect(row.motion[0]).toBeLessThan(2 * Math.PI + 1e-6);
      expect(row.motion[1]).toBeGreaterThanOrEqual(0); expect(row.motion[1]).toBeLessThan(2 * Math.PI + 1e-6);
      expect(row.motion[2]).toBeCloseTo(result.height, 5); expect(row.motion[3]).toBe(enabled);
      row.motion.forEach((value: number, i: number) => expect(value).toBeCloseTo(result.liveMotion[i], 5));
    }
  }
}

async function diagnosticKelpPosition(page: Page) {
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, direction = w.__skCamera.getWorldDirection(new T.Vector3()), kelp = w.__skSelected;
    const distance = Math.max(w.__skCamera.position.distanceTo(w.__skPlayer.position), kelp.geometry.userData.clPlantHeight * 1.5);
    // Existing actor only, while paused: center its complete height on the current
    // optical ray. Natural underwater composition is reviewed in separate captures.
    kelp.position.copy(w.__skCamera.position).addScaledVector(direction, distance); kelp.position.y -= kelp.geometry.userData.clPlantHeight / 2;
    kelp.updateMatrixWorld(true); w.__skFixture.diagnosticKelpPosition = kelp.position.toArray();
  });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const found: string[] = []; errors.set(page, found); page.on('pageerror', error => found.push(error.message)); page.on('console', message => { if (message.type() === 'error') found.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} squid funnel and kelp floats submit their real surfaces and retain motion, pause and disposal contracts`, async ({ page }, testInfo) => {
  await mount(page, quality);
  const anatomy = await page.evaluate(() => {
    const w = window as any, funnel = w.__skSiphon;
    return { funnel: { vertices: funnel.geometry.attributes.position.count, triangles: funnel.geometry.index.count / 3, groups: funnel.geometry.groups.length, transparent: funnel.material.transparent, opacity: funnel.material.opacity, vertexColors: funnel.material.vertexColors },
      kelp: w.__skKelp.map((m: any) => ({ vertices: m.geometry.attributes.position.count, triangles: m.geometry.index.count / 3, groups: m.geometry.groups.length, height: m.geometry.userData.clPlantHeight, rotationZ: m.rotation.z })),
      grass: w.__skScene.children.filter((m: any) => m.name === 'cl-seagrass').length,
      noTextures: w.__skOwned.every((r: any) => !Object.values(r.material).some((v: any) => v?.isTexture)) };
  });
  expect(anatomy.funnel).toEqual({ vertices: 578, triangles: 1152, groups: 0, transparent: false, opacity: 1, vertexColors: true });
  expect(anatomy.kelp).toHaveLength(25); expect(anatomy.grass).toBe(80); expect(anatomy.noTextures).toBe(true);
  for (const row of anatomy.kelp) { expect(row.vertices).toBe(277); expect(row.triangles).toBe(424); expect(row.groups).toBe(0); expect(row.height).toBeGreaterThan(0); expect(row.rotationZ).toBe(0); }
  const initial = await state(page); stable(initial, initial); const initialNative = await native(page); rendered(initialNative, 1);
  await step(page, 7, ['KeyW', 'Space']); const jet = await state(page);
  expect(Math.hypot(jet.player[0] - initial.player[0], jet.player[2] - initial.player[2])).toBeGreaterThan(.01);
  expect(jet.pose.arms).not.toEqual(initial.pose.arms); stable(jet, initial);
  await step(page, 5, ['KeyA']); const turned = await state(page); expect(turned.heading).not.toBe(jet.heading);
  await step(page, 6, ['KeyQ']); const risen = await state(page); expect(risen.player[1]).toBeGreaterThan(turned.player[1]); expect(risen.motion).not.toEqual(initial.motion); stable(risen, initial);

  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  const paused = await state(page); await step(page, 4); const held = await state(page);
  expect(held.pose).toEqual(paused.pose); expect(held.motion).toEqual(paused.motion); expect(held.time).toBe(paused.time); stable(held, initial);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await step(page, 3);
  const inspected = await state(page);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await step(page, 6);
  const orbited = await state(page); expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.renders).toBeGreaterThan(inspected.renders); expect(orbited.pose).toEqual(inspected.pose); expect(orbited.motion).toEqual(inspected.motion);
  await page.getByRole('button', { name: 'Farther', exact: true }).click(); await step(page, 4); const farther = await state(page);
  await page.getByRole('button', { name: 'Closer', exact: true }).click(); await step(page, 5); const closer = await state(page);
  expect(closer.cameraDistance).toBeLessThan(farther.cameraDistance - .05); expect(closer.pose).toEqual(inspected.pose); expect(closer.motion).toEqual(inspected.motion);
  const restoreKelp = await page.evaluate(() => (window as any).__skSelected.position.toArray());
  await diagnosticKelpPosition(page); rendered(await native(page), 1);
  if (quality === 'balanced') {
    const originalViewport = page.viewportSize(); await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); }); await step(page, 7);
    await diagnosticKelpPosition(page); rendered(await native(page), 1);
    const framing = await page.evaluate(() => {
      const w = window as any, p = new w.THREE.Vector3(), g = w.__skSiphon.geometry, box = { x: 0, y: 0, depth: true, finite: true };
      w.__skPlayer.updateMatrixWorld(true);
      for (let i = 0; i < g.attributes.position.count; i++) { p.fromBufferAttribute(g.attributes.position, i).applyMatrix4(w.__skSiphon.matrixWorld).project(w.__skCamera); box.x = Math.max(box.x, Math.abs(p.x)); box.y = Math.max(box.y, Math.abs(p.y)); box.depth &&= p.z > 0 && p.z < 1; box.finite &&= p.toArray().every(Number.isFinite); }
      return box;
    });
    expect(framing.depth && framing.finite).toBe(true); expect(framing.x).toBeLessThan(.98); expect(framing.y).toBeLessThan(.98);
    await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
    await page.setViewportSize(originalViewport!); await page.evaluate(() => { document.getElementById('wrap')!.style.width = '900px'; window.dispatchEvent(new Event('resize')); }); await step(page, 4);
  }
  await page.evaluate(position => (window as any).__skSelected.position.fromArray(position), restoreKelp);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page, 5);
  const resumed = await state(page); expect(resumed.motion).not.toEqual(inspected.motion); expect(resumed.pose.arms).not.toEqual(inspected.pose.arms); stable(resumed, initial);

  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2);
  const reduced = await state(page); await step(page, 5); const reducedStill = await state(page);
  expect(reducedStill.motion).toEqual(reduced.motion); expect(reducedStill.pose.arms).toEqual(reduced.pose.arms); stable(reducedStill, initial);
  await step(page, 4, ['KeyW', 'KeyQ']); const reducedMoving = await state(page);
  expect(reducedMoving.player).not.toEqual(reducedStill.player); expect(reducedMoving.motion).toEqual(reduced.motion); stable(reducedMoving, initial);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  const reducedRestore = await page.evaluate(() => (window as any).__skSelected.position.toArray());
  await diagnosticKelpPosition(page); rendered(await native(page), 0);
  await page.evaluate(position => (window as any).__skSelected.position.fromArray(position), reducedRestore);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 5);
  const final = await state(page); expect(final.motion).not.toEqual(reduced.motion); expect(final.pose.arms).not.toEqual(reduced.pose.arms); stable(final, initial);
  await testInfo.attach('actual-siphon-kelp-native-contracts', { body: JSON.stringify({ quality, anatomy, initialNative, initial, final, fixture: await page.evaluate(() => (window as any).__skFixture) }, null, 2), contentType: 'application/json' });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__skResources.map((r: any) => r.disposed))).toEqual(Array(52).fill(1));
});
