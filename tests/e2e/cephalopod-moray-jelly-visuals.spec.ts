import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
async function advance(page: Page, frames: number) { await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__mjStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__mjStep !== 0); } }, frames); }
async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__mjScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene; w.__mjPlayer = w.__mjScene.getObjectByName('cl-player');
    w.__mjMoray = w.__mjScene.children.find((object: any) => 'homeX' in object.userData && object.userData.aggroRange);
    w.__mjHome = w.__mjScene.getObjectByName('cl-moray-home');
    w.__mjJellies = w.__mjScene.children.filter((object: any) => object.userData.bellGeo && object.userData.tents);
    w.__mjDens = w.__mjScene.children.filter((object: any) => object.name === 'cl-den' || object.name === 'cl-home');
    if (!w.__mjMoray || !w.__mjHome || w.__mjJellies.length !== 5 || w.__mjDens.length !== 4) throw new Error('Expected the real moray and home, five ambient jellies and four initial dens');
    w.__mjStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__mjStep; w.__mjStep = 0; return dt; };
    w.__mjScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; if (object.userData.substrate === 'rock') { object.position.x = -18; object.position.z = -18; object.userData.substrateRadius = 0; } });
    // Keep the moray's real home. Move the player into its approach and one
    // existing ambient jelly above that approach for non-vacuous native draws.
    w.__mjPlayer.position.x = w.__mjMoray.userData.homeX; w.__mjPlayer.position.z = w.__mjMoray.userData.homeZ - 4;
    w.__mjJelly = [...w.__mjJellies].sort((a: any, b: any) => Math.sin(a.userData.verticalPhase) - Math.sin(b.userData.verticalPhase))[0]; w.__mjJelly.position.x = w.__mjPlayer.position.x; w.__mjJelly.position.z = w.__mjPlayer.position.z + 2;
    w.__mjOwned = []; w.__mjResources = []; w.__mjPrograms = new Map(); w.__mjNative = new Map(); w.__mjNativeStable = true; w.__mjEpoch = 0; w.__mjDrawEpoch = {}; w.__mjKinds = [];
    w.__mjTrack = (owner: any, type: string) => owner.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      w.__mjOwned.push({ mesh, type, dynamicBell: mesh.geometry === owner.userData.bellGeo, geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, indexArray: mesh.geometry.index?.array, indices: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null,
        attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])) });
      [mesh.geometry, mesh.material].forEach((resource: any) => { if (w.__mjResources.some((row: any) => row.resource === resource)) return; const row = { resource, disposed: 0 }; resource.addEventListener('dispose', () => row.disposed++); w.__mjResources.push(row); });
    });
    w.__mjTrack(w.__mjMoray, 'moray'); w.__mjTrack(w.__mjHome, 'home'); w.__mjJellies.forEach((jelly: any) => w.__mjTrack(jelly, 'jelly'));
    w.__mjWatch = (mesh: any, kind: string) => {
      w.__mjKinds.push(kind); const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group); w.__mjRenderer = renderer; w.__mjCamera = camera; w.__mjDrawEpoch[kind] = w.__mjEpoch;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), at = gl.getUniformLocation(program, 'normalMatrix'), normal = at === null ? null : Array.from(gl.getUniform(program, at));
        const bindings = ['position', ...(material.isMeshStandardMaterial ? ['normal'] : []), ...(material.vertexColors ? ['color'] : [])].map(name => {
          const location = gl.getAttribLocation(program, name), buffer = location < 0 ? null : gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), key = kind + '/' + name;
          if (w.__mjNative.has(key)) w.__mjNativeStable &&= w.__mjNative.get(key) === buffer; else w.__mjNative.set(key, buffer);
          return { name, size: location < 0 ? 0 : gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: location >= 0 && gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer };
        });
        if (w.__mjPrograms.has(kind)) return;
        w.__mjPrograms.set(kind, { kind, linked: gl.getProgramParameter(program, gl.LINK_STATUS), standard: !!material.isMeshStandardMaterial, vertexColors: !!material.vertexColors, key: material.customProgramCacheKey(), bindings, normal,
          determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null, shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    };
    w.__mjMoray.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'moray-' + i)); w.__mjWatch(w.__mjHome, 'home'); w.__mjJelly.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'jelly-' + i));
    const head = w.__mjMoray.children[1], p = head.geometry.attributes.position, front = new T.Vector3(); let maxZ = -Infinity;
    head.updateMatrix(); for (let i = 0; i < p.count; i++) { const point = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(head.matrix); if (point.z > maxZ) { maxZ = point.z; front.copy(point); } }
    w.__mjNose = front;
  });
  await page.locator(canvas).focus(); await advance(page, 12);
}
async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, m = w.__mjMoray; w.__mjScene.updateMatrixWorld(true);
    const nose = w.__mjNose.clone().applyMatrix4(m.matrixWorld).sub(m.position).setY(0).normalize();
    return { moray: m.matrixWorld.toArray(), position: m.position.toArray(), state: m.userData.state, canBite: !!m.userData.canBite, nose: nose.toArray(), towardPlayer: w.__mjPlayer.position.clone().sub(m.position).setY(0).normalize().toArray(),
      jellyWorld: w.__mjJellies.map((jelly: any) => jelly.matrixWorld.toArray()), phases: w.__mjJellies.map((jelly: any) => [jelly.userData.pulsePhase, jelly.userData.verticalPhase]),
      trails: w.__mjJellies.map((jelly: any) => jelly.children.map((mesh: any) => mesh.matrix.toArray())), bell: Array.from(w.__mjJelly.userData.bellGeo.attributes.position.array), normals: Array.from(w.__mjJelly.userData.bellGeo.attributes.normal.array),
      time: document.querySelector('[data-hud=time]')?.textContent, health: Number(document.querySelector('[data-hud=health]')?.textContent), camera: w.__mjCamera.position.toArray(),
      stable: w.__mjOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.geometry.index?.array === row.indexArray && (!row.indices || row.indices.every((value: number, i: number) => value === row.indexArray[i])) && Object.entries(row.attrs).every(([name, prior]: [string, any]) => row.geometry.attributes[name] === prior.attr && prior.attr.array === prior.array && ((row.dynamicBell && (name === 'position' || name === 'normal')) || (prior.attr.version === prior.version && prior.values.every((value: number, i: number) => value === prior.array[i]))))),
      finite: w.__mjOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))), nativeStable: w.__mjNativeStable, disposed: w.__mjResources.map((row: any) => row.disposed), textures: w.__mjRenderer.info.memory.textures };
  });
}
async function freshDraws(page: Page, kinds?: string[]) { return page.evaluate(async requested => { const w = window as any, names = requested || w.__mjKinds, epoch = ++w.__mjEpoch; for (let i = 0; i < 60 && names.some((name: string) => w.__mjDrawEpoch[name] !== epoch); i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return names.every((name: string) => w.__mjDrawEpoch[name] === epoch); }, kinds); }
function stable(value: Awaited<ReturnType<typeof state>>, textures: number) { expect(value.stable && value.finite && value.nativeStable).toBe(true); expect(value.disposed.every((count: number) => count === 0)).toBe(true); expect(value.textures).toBe(textures); }
function dot(a: number[], b: number[]) { return a.reduce((sum, value, i) => sum + value * b[i], 0); }
function programs(rows: any[]) { for (const row of rows) { expect(row.linked, row.kind).toBe(true); expect(row.shaders).toHaveLength(2); expect(row.shaders.every((shader: any) => shader.compiled)).toBe(true); for (const binding of row.bindings) { expect(binding.enabled && binding.bound, row.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); } if (row.standard) { expect(row.normal).toHaveLength(9); expect(row.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(row.determinant)).toBeGreaterThan(1e-8); } if (row.vertexColors) expect(row.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR'); } }

test.describe.configure({ timeout: 180000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const entries: string[] = []; errors.set(page, entries); page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} moray and moon jellies render live anatomy and preserve shelter streaming and cleanup`, async ({ page }) => {
  await mount(page, quality); expect(await freshDraws(page)).toBe(true);
  const anatomy = await page.evaluate(() => {
    const w = window as any; return { morayNames: w.__mjMoray.children.map((mesh: any) => mesh.name), jellies: w.__mjJellies.map((jelly: any) => ({ count: jelly.children.length, phases: jelly.userData.tents.length, materials: new Set(jelly.children.map((mesh: any) => mesh.material)).size,
      transparent: jelly.children.every((mesh: any) => mesh.material.transparent && !mesh.material.depthWrite && mesh.material.blending === w.THREE.NormalBlending), vertices: jelly.children.reduce((n: number, mesh: any) => n + mesh.geometry.attributes.position.count, 0), triangles: jelly.children.reduce((n: number, mesh: any) => n + mesh.geometry.index.count / 3, 0) })), programs: [...w.__mjPrograms.values()] };
  });
  expect(anatomy.morayNames).toEqual(['cl-moray-body', 'cl-moray-head', 'cl-moray-eye-0', 'cl-moray-eye-1']); expect(anatomy.jellies).toHaveLength(5);
  for (const jelly of anatomy.jellies) { expect(jelly.count).toBe(8); expect(jelly.phases).toBe(6); expect(jelly.materials).toBe(8); expect(jelly.transparent).toBe(true); expect(jelly.vertices).toBeLessThanOrEqual(2500); expect(jelly.triangles).toBeLessThanOrEqual(3500); }
  expect(anatomy.programs).toHaveLength(13); programs(anatomy.programs);
  const homeProgram = anatomy.programs.find((row: any) => row.kind === 'home'); expect(homeProgram.key).toBe('cl-rock-surface-v1'); expect(homeProgram.shaders.map((shader: any) => shader.source).join('\n')).toContain('clRockValueNoise');
  const initial = await state(page); stable(initial, initial.textures); await advance(page, 8); const living = await state(page); stable(living, initial.textures);
  expect(living.phases).not.toEqual(initial.phases); expect(living.jellyWorld).not.toEqual(initial.jellyWorld); expect(living.bell).not.toEqual(initial.bell);
  await page.evaluate(() => { const w = window as any; Object.assign(w.__mjMoray.userData, { state: 'attacking', stateTimer: 0, cooldownUntil: 0, awareness: 1, lostFor: 0, lastSeen: w.__mjPlayer.position.clone() }); });
  const beforePursuit = await state(page); await advance(page, 2); const pursuit = await state(page); expect(pursuit.state).toBe('attacking'); expect(pursuit.canBite).toBe(true); expect(pursuit.position).not.toEqual(beforePursuit.position); expect(dot(pursuit.nose, pursuit.towardPlayer)).toBeGreaterThan(.997);
  await page.evaluate(() => { const w = window as any; w.__mjMoray.userData.state = 'returning'; w.__mjMoray.userData.cooldownUntil = 1e9; }); await advance(page, 2); const returning = await state(page); expect(returning.position).not.toEqual(pursuit.position);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); const paused = await state(page); await advance(page, 8); const held = await state(page);
  for (const key of ['moray', 'jellyWorld', 'phases', 'trails', 'bell', 'normals', 'time'] as const) expect(held[key]).toEqual(paused[key]); stable(held, initial.textures);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page); await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 6); const orbited = await state(page);
  expect(orbited.camera).not.toEqual(inspected.camera); for (const key of ['moray', 'jellyWorld', 'phases', 'trails', 'bell', 'normals', 'time'] as const) expect(orbited[key]).toEqual(inspected[key]); stable(orbited, initial.textures);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  const reduced = await state(page); await advance(page, 7); const moving = await state(page); stable(moving, initial.textures); expect(moving.phases).not.toEqual(reduced.phases); expect(moving.bell).not.toEqual(reduced.bell);

  if (quality === 'low') {
    await page.evaluate(() => { const w = window as any; w.__mjPlayer.position.x = -220; w.__mjPlayer.position.z = 0; });
    let spawned = false;
    for (let step = 0; step < 10 && !spawned; step++) { await advance(page, 1); spawned = await page.evaluate(() => { const w = window as any; return w.__mjScene.children.some((object: any) => object.name === 'cl-den' && !w.__mjDens.includes(object)); }); }
    expect(spawned).toBe(true);
    const den = await page.evaluate(() => {
      const w = window as any, added = w.__mjScene.children.filter((object: any) => object.name === 'cl-den' && !w.__mjDens.includes(object)); if (added.length !== 1) throw new Error('The counted fixture must stop after the first streamed den');
      w.__mjDen = added[0]; w.__mjTrack(w.__mjDen, 'den'); w.__mjDen.children.forEach((mesh: any, i: number) => w.__mjWatch(mesh, 'den-' + i));
      const distance = Math.hypot(w.__mjDen.position.x - w.__mjPlayer.position.x, w.__mjDen.position.z - w.__mjPlayer.position.z);
      w.__mjPlayer.position.x = w.__mjDen.position.x; w.__mjPlayer.position.z = w.__mjDen.position.z - .4;
      return { count: w.__mjDen.children.length, distance, materials: new Set(w.__mjDen.children.map((mesh: any) => mesh.material)).size, names: w.__mjDen.children.slice(0, 3).map((mesh: any) => mesh.name) };
    });
    expect(den.count).toBe(5); expect(den.materials).toBe(3); expect(den.names).toEqual(Array(3).fill('cl-den-rock')); expect(den.distance).toBeGreaterThanOrEqual(55); expect(den.distance).toBeLessThanOrEqual(95);
    await advance(page, 5); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=status]')).toContainText('IN DEN');
    const sheltered = await state(page);
    const ground = await page.evaluate(() => {
      const w = window as any, T = w.THREE, den = w.__mjDen; w.__mjScene.updateMatrixWorld(true);
      const ray = new T.Raycaster(new T.Vector3(den.position.x, 50, den.position.z), new T.Vector3(0, -1, 0)), hit = ray.intersectObject(w.__mjScene.getObjectByName('cl-seafloor'), false)[0];
      return { groundError: hit ? Math.abs(hit.point.y - den.position.y) : null, light: den.children[4].material.opacity };
    });
    expect(ground.groundError).not.toBeNull(); expect(ground.groundError!).toBeLessThan(.025); expect(ground.light).toBeGreaterThan(.3);
    expect(await freshDraws(page, ['den-0', 'den-1', 'den-2', 'den-3', 'den-4'])).toBe(true);
    const denPrograms = await page.evaluate(() => [...(window as any).__mjPrograms.values()].filter((row: any) => row.kind.startsWith('den-'))); expect(denPrograms).toHaveLength(5); programs(denPrograms);
    for (const row of denPrograms.filter((row: any) => ['den-0', 'den-1', 'den-2'].includes(row.kind))) { expect(row.key).toBe('cl-rock-surface-v1'); expect(row.shaders.map((shader: any) => shader.source).join('\n')).toContain('clRockValueNoise'); }
    await page.keyboard.press('Escape');
    await page.evaluate(async () => { const w = window as any, m = w.__mjMoray; m.position.copy(w.__mjPlayer.position).add(new w.THREE.Vector3(0, 0, .7)); Object.assign(m.userData, { state: 'attacking', stateTimer: 0, cooldownUntil: 0, awareness: 1, lostFor: 0, lastSeen: w.__mjPlayer.position.clone() }); w.__mjStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__mjStep !== 0); });
    await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=status]')).toContainText('IN DEN'); const defended = await state(page); expect(defended.canBite).toBe(false); expect(defended.state).toBe('returning'); expect(defended.health).toBeGreaterThanOrEqual(sheltered.health); stable(defended, initial.textures);
  }
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__mjResources.every((row: any) => row.disposed >= 1))).toBe(true);
});
