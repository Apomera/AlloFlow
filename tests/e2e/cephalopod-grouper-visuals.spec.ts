import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
const names = ['cl-grouper-body', 'cl-grouper-tail', 'cl-grouper-eye-left', 'cl-grouper-eye-right'];
async function advance(page: Page, frames: number) {
  await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__gvStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__gvStep !== 0); } }, frames);
}
async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__gvScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__gvPlayer = w.__gvScene.getObjectByName('cl-player');
    const actors = w.__gvScene.children.filter((object: any) => object.userData.aggroRange === 10 && 'patrolAngle' in object.userData && !object.userData.kind);
    if (actors.length !== 1) throw new Error('Expected the existing single grouper'); w.__gvGrouper = actors[0];
    w.__gvStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__gvStep; w.__gvStep = 0; return dt; };
    // The original actor, movement and visibility rules remain active. Remove
    // incidental rock occlusion and defer unrelated predators for this fixture.
    w.__gvScene.children.forEach((object: any) => {
      if (object.userData.substrate === 'rock') { object.position.x = -18; object.position.z = -18; object.userData.substrateRadius = 0; }
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    const grouper = w.__gvGrouper; grouper.position.copy(w.__gvPlayer.position).add(new T.Vector3(0, 1, 2.5));
    Object.assign(grouper.userData, { state: 'patrol', patrolAngle: 0, patrolTimer: 1000, stateTimer: 0, awareness: 0, lastSeen: null, lostFor: 0 });
    w.__gvOwned = grouper.children.map((mesh: any) => ({ mesh, geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, indexArray: mesh.geometry.index.array, indices: Array.from(mesh.geometry.index.array),
      attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, version: attr.version, values: Array.from(attr.array) }])) }));
    const resources = new Set<any>(); w.__gvOwned.forEach((row: any) => { resources.add(row.geometry); resources.add(row.material); });
    w.__gvResources = [...resources].map((resource: any) => { const entry = { resource, disposed: 0 }; resource.addEventListener('dispose', () => entry.disposed++); return entry; });
    w.__gvPrograms = new Map(); w.__gvNative = new Map(); w.__gvNativeStable = true; w.__gvEpoch = 0; w.__gvDrawEpoch = {};
    grouper.children.forEach((mesh: any) => {
      const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group);
        w.__gvRenderer = renderer; w.__gvCamera = camera; w.__gvDrawEpoch[mesh.name] = w.__gvEpoch;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        const bindings = ['position', 'normal', 'color'].map(name => {
          const at = gl.getAttribLocation(program, name), buffer = at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = mesh.name + '/' + name;
          if (w.__gvNative.has(key)) w.__gvNativeStable &&= w.__gvNative.get(key) === buffer; else w.__gvNative.set(key, buffer);
          return { name, size: at < 0 ? 0 : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: at >= 0 && gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer };
        });
        if (w.__gvPrograms.has(mesh.name)) return;
        const location = gl.getUniformLocation(program, 'normalMatrix'), normal = location === null ? null : Array.from(gl.getUniform(program, location));
        w.__gvPrograms.set(mesh.name, { name: mesh.name, material: material.uuid, type: material.type, vertexColors: material.vertexColors,
          linked: gl.getProgramParameter(program, gl.LINK_STATUS), bindings, normal, determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null,
          shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    });
    // These points come from the actual authored mesh spans, converted by their
    // preserved child matrices. A +Z metadata string alone cannot pass heading.
    const center = (mesh: any, name: string) => {
      const part = mesh.geometry.userData.clGrouperParts.find((item: any) => item.name === name), point = new T.Vector3(), p = mesh.geometry.attributes.position;
      for (let i = part.vertexStart; i < part.vertexStart + part.vertexCount; i++) point.add(new T.Vector3().fromBufferAttribute(p, i));
      mesh.updateMatrix(); return point.divideScalar(part.vertexCount).applyMatrix4(mesh.matrix);
    };
    w.__gvNose = center(grouper.children[0], 'mouth-recess'); w.__gvRear = center(grouper.children[1], 'peduncle');
  });
  await page.locator(canvas).focus(); await advance(page, 5);
}
async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, g = w.__gvGrouper, T = w.THREE; w.__gvScene.updateMatrixWorld(true);
    const heading = w.__gvNose.clone().applyMatrix4(g.matrixWorld).sub(w.__gvRear.clone().applyMatrix4(g.matrixWorld)); heading.y = 0; heading.normalize();
    const resources = { geometries: new Set(), materials: new Set() }; w.__gvScene.traverse((mesh: any) => { if (mesh.geometry) resources.geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material: any) => resources.materials.add(material)); });
    return { position: g.position.toArray(), world: g.matrixWorld.toArray(), heading: heading.toArray(), state: g.userData.state, stateTimer: g.userData.stateTimer, canBite: !!g.userData.canBite,
      toward: w.__gvPlayer.position.clone().sub(g.position).setY(0).normalize().toArray(), camera: w.__gvCamera.position.toArray(), time: document.querySelector('[data-hud=time]')?.textContent,
      stable: w.__gvOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.index.array === row.indexArray && row.indices.every((value: number, i: number) => value === row.indexArray[i]) &&
        Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && prior.attr.version === prior.version && prior.values.every((value: number, i: number) => value === prior.array[i]))),
      finite: w.__gvOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))),
      disposed: w.__gvResources.map((entry: any) => entry.disposed), nativeStable: w.__gvNativeStable, geometries: resources.geometries.size, materials: resources.materials.size, textures: w.__gvRenderer.info.memory.textures,
      centerNdc: new T.Vector3().setFromMatrixPosition(g.matrixWorld).project(w.__gvCamera).toArray() };
  });
}
async function freshDraws(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, epoch = ++w.__gvEpoch, names = w.__gvGrouper.children.map((mesh: any) => mesh.name);
    for (let frame = 0; frame < 60 && names.some((name: string) => w.__gvDrawEpoch[name] !== epoch); frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return names.every((name: string) => w.__gvDrawEpoch[name] === epoch);
  });
}
function stable(now: Awaited<ReturnType<typeof state>>, before: Awaited<ReturnType<typeof state>>) {
  expect(now.stable && now.finite && now.nativeStable).toBe(true); expect(now.disposed).toEqual(Array(8).fill(0));
  expect(now.geometries).toBe(before.geometries); expect(now.materials).toBe(before.materials); expect(now.textures).toBe(before.textures);
}
function dot(a: number[], b: number[]) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }

test.describe.configure({ timeout: 180000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const entries: string[] = []; errors.set(page, entries); page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} grouper renders its actual anatomy, swims nose-first and preserves paused resources`, async ({ page }) => {
  await mount(page, quality); expect(await freshDraws(page)).toBe(true);
  const anatomy = await page.evaluate(() => {
    const w = window as any, meshes = w.__gvGrouper.children;
    return { names: meshes.map((mesh: any) => mesh.name), vertices: meshes.reduce((sum: number, mesh: any) => sum + mesh.geometry.attributes.position.count, 0), triangles: meshes.reduce((sum: number, mesh: any) => sum + mesh.geometry.index.count / 3, 0),
      materials: new Set(meshes.map((mesh: any) => mesh.material)).size, textureFree: meshes.every((mesh: any) => !Object.values(mesh.material).some((value: any) => value?.isTexture)), programs: [...w.__gvPrograms.values()] };
  });
  expect(anatomy.names).toEqual(names); expect(anatomy.vertices).toBe(705); expect(anatomy.triangles).toBe(969); expect(anatomy.materials).toBe(4); expect(anatomy.textureFree).toBe(true);
  expect(anatomy.programs.map((program: any) => program.name).sort()).toEqual([...names].sort());
  for (const program of anatomy.programs) {
    expect(program.type).toBe('MeshStandardMaterial'); expect(program.vertexColors && program.linked).toBe(true); expect(program.shaders).toHaveLength(2); expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
    expect(program.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR');
    for (const binding of program.bindings) { expect(binding.enabled && binding.bound, program.name + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); }
    expect(program.normal).toHaveLength(9); expect(program.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(program.determinant)).toBeGreaterThan(1e-8);
  }
  const initial = await state(page); stable(initial, initial);
  for (const angle of [0, .7, -Math.PI / 2]) {
    await page.evaluate(angle => { const w = window as any; w.__gvGrouper.userData.patrolAngle = angle; w.__gvGrouper.userData.patrolTimer = 1000; }, angle);
    const before = await state(page); await advance(page, 2); const after = await state(page); stable(after, initial); expect(after.state).toBe('patrol');
    const delta = after.position.map((value: number, i: number) => i === 1 ? 0 : value - before.position[i]), length = Math.hypot(...delta);
    expect(length).toBeGreaterThan(.1); expect(dot(after.heading, delta.map(value => value / length))).toBeGreaterThan(.9999);
  }
  await page.evaluate(() => {
    const w = window as any, g = w.__gvGrouper; g.position.copy(w.__gvPlayer.position).add(new w.THREE.Vector3(2.5, .4, 4));
    Object.assign(g.userData, { state: 'attacking', stateTimer: 0, cooldownUntil: 0, awareness: 1, lostFor: 0, lastSeen: w.__gvPlayer.position.clone() });
  });
  const approach = await state(page); await advance(page, 2); const pursuing = await state(page); stable(pursuing, initial);
  expect(pursuing.state).toBe('attacking'); expect(pursuing.canBite).toBe(true); expect(pursuing.position).not.toEqual(approach.position);
  expect(dot(pursuing.heading, pursuing.toward)).toBeGreaterThan(.9999);

  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  const paused = await state(page); await advance(page, 8); const held = await state(page); stable(held, initial);
  expect(held.world).toEqual(paused.world); expect(held.stateTimer).toBe(paused.stateTimer); expect(held.time).toBe(paused.time);
  await page.keyboard.press('Escape'); await advance(page, 2); expect((await state(page)).world).not.toEqual(paused.world);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page);
  await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page); stable(orbited, initial);
  expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.world).toEqual(inspected.world); expect(orbited.stateTimer).toBe(inspected.stateTimer); expect(orbited.time).toBe(inspected.time);
  if (quality === 'balanced') {
    const desktopViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
    await advance(page, 6);
    const phoneBounds = await page.evaluate(() => {
      const w = window as any, T = w.THREE, g = w.__gvGrouper, camera = w.__gvCamera, points: any[] = [];
      // This diagnostic relocates the same paused actor onto the actual optical
      // ray. Its measured full geometry determines the narrow-frustum margin;
      // it does not test natural-spawn or automatic predator framing.
      w.__gvPhoneOriginalPose = { position: g.position.clone(), quaternion: g.quaternion.clone() };
      g.rotation.set(0, 0, 0);
      g.children.forEach((mesh: any) => {
        mesh.updateMatrix(); const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) points.push(new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrix));
      });
      const center = new T.Box3().setFromPoints(points).getCenter(new T.Vector3()), radius = Math.max(...points.map(point => point.distanceTo(center)));
      const halfY = T.MathUtils.degToRad(camera.fov) / 2, halfX = Math.atan(Math.tan(halfY) * camera.aspect);
      const distance = Math.max(camera.position.distanceTo(w.__gvPlayer.position), radius / Math.sin(Math.min(halfX, halfY)) * 1.15);
      g.position.copy(camera.getWorldPosition(new T.Vector3())).addScaledVector(camera.getWorldDirection(new T.Vector3()), distance).sub(center);
      w.__gvScene.updateMatrixWorld(true);
      const projected = points.map(point => point.clone().applyMatrix4(g.matrixWorld).project(camera));
      return { finite: projected.every(point => point.toArray().every(Number.isFinite)), x: Math.max(...projected.map(point => Math.abs(point.x))),
        y: Math.max(...projected.map(point => Math.abs(point.y))), z: Math.max(...projected.map(point => Math.abs(point.z))) };
    });
    expect(phoneBounds.finite).toBe(true); expect(phoneBounds.x).toBeLessThan(1); expect(phoneBounds.y).toBeLessThan(1); expect(phoneBounds.z).toBeLessThan(1);
    expect(await freshDraws(page)).toBe(true);
    await expect(page.getByRole('button', { name: 'Return to dive', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const phone = await state(page); stable(phone, initial); expect(phone.centerNdc.every(Number.isFinite)).toBe(true);
    expect(Math.abs(phone.centerNdc[0])).toBeLessThan(1); expect(Math.abs(phone.centerNdc[1])).toBeLessThan(1); expect(Math.abs(phone.centerNdc[2])).toBeLessThan(1);
    await page.evaluate(() => { const w = window as any; w.__gvGrouper.position.copy(w.__gvPhoneOriginalPose.position); w.__gvGrouper.quaternion.copy(w.__gvPhoneOriginalPose.quaternion); });
    await page.setViewportSize(desktopViewport);
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '900px'; window.dispatchEvent(new Event('resize')); }); await advance(page, 3);
  }
  // Resume with a safe real patrol. Reduced motion preserves predator travel;
  // it must not introduce geometry uploads or freeze gameplay movement.
  await page.evaluate(() => { const w = window as any; Object.assign(w.__gvGrouper.userData, { state: 'patrol', stateTimer: 0, cooldownUntil: 1e9, patrolAngle: 0, patrolTimer: 1000 }); });
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 2);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  const reduced = await state(page); await advance(page, 5); const moving = await state(page); stable(moving, initial); expect(moving.position).not.toEqual(reduced.position);
  expect(await freshDraws(page)).toBe(true); await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__gvResources.map((entry: any) => entry.disposed))).toEqual(Array(8).fill(1));
});
