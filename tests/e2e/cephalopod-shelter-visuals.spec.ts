import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
async function advance(page: Page, frames: number, code?: string) {
  await page.evaluate(async ({ frames, code }) => {
    const w = window as any, target = document.querySelector('canvas[role=application]')!;
    const key = (type: string) => target.dispatchEvent(new KeyboardEvent(type, { code, key: code?.slice(3).toLowerCase(), bubbles: true, cancelable: true }));
    if (code) key('keydown');
    try { for (let i = 0; i < frames; i++) { w.__shStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__shStep !== 0); } }
    finally { if (code) key('keyup'); }
  }, { frames, code });
  if (code) await advance(page, 1);
}
async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any, T = w.THREE; w.__shScene = w.__glRecorder.records.filter((row: any) => row.scene && row.canvas.isConnected).at(-1).scene; w.__shPlayer = w.__shScene.getObjectByName('cl-player');
    w.__shConches = w.__shScene.children.filter((object: any) => object.userData.shelterType === 'conch'); w.__shSponges = w.__shScene.children.filter((object: any) => object.userData.shelterType === 'sponge');
    if (w.__shConches.length !== 2 || w.__shSponges.length !== 3) throw new Error('Expected the actual initial two conches and three stationary sponges'); w.__shConch = w.__shConches[0]; w.__shSponge = w.__shSponges[0];
    w.__shStep = 0; T.Clock.prototype.getDelta = function () { const dt = w.__shStep; w.__shStep = 0; return dt; };
    w.__shScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; if (object.userData.substrate === 'rock') { object.position.x = -45; object.position.z = -45; object.userData.substrateRadius = 0; } if (object.userData.shelterType || object.userData.landmarkType) { object.position.x = -40; object.position.z = -40; } });
    w.__shPlayer.position.x = -16; w.__shPlayer.position.z = 0; w.__shConch.position.x = -16; w.__shConch.position.z = 1.8; w.__shSponge.position.x = -14.6; w.__shSponge.position.z = 2.8;
    w.__shOwned = []; w.__shResources = [];
    [...w.__shConches, ...w.__shSponges].forEach((owner: any) => owner.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      w.__shOwned.push({ owner, mesh, geometry: mesh.geometry, material: mesh.material, attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]: [string, any]) => [name, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])), index: mesh.geometry.index, array: mesh.geometry.index.array, indices: Array.from(mesh.geometry.index.array) });
      [mesh.geometry, mesh.material].forEach((resource: any) => { if (w.__shResources.some((row: any) => row.resource === resource)) return; const row = { owner, resource, disposed: 0 }; resource.addEventListener('dispose', () => row.disposed++); w.__shResources.push(row); });
    }));
    w.__shPrograms = new Map(); w.__shBuffers = new Map(); w.__shNativeStable = true; w.__shEpoch = 0; w.__shDraws = {}; w.__shKinds = [];
    for (const [owner, type] of [[w.__shConch, 'conch'], [w.__shSponge, 'sponge']]) owner.children.forEach((mesh: any, index: number) => {
      const kind = type + '-' + index, previous = mesh.onAfterRender; w.__shKinds.push(kind);
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group); w.__shRenderer = renderer; w.__shCamera = camera; w.__shDraws[kind] = w.__shEpoch;
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM), location = gl.getUniformLocation(program, 'normalMatrix'), normal = location === null ? null : Array.from(gl.getUniform(program, location));
        const bindings = ['position', 'normal', 'color'].map(name => { const at = gl.getAttribLocation(program, name), buffer = at < 0 ? null : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), id = kind + '/' + name; if (w.__shBuffers.has(id)) w.__shNativeStable &&= w.__shBuffers.get(id) === buffer; else w.__shBuffers.set(id, buffer); return { name, size: at < 0 ? 0 : gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_SIZE), enabled: at >= 0 && gl.getVertexAttrib(at, gl.VERTEX_ATTRIB_ARRAY_ENABLED), bound: !!buffer }; });
        if (!w.__shPrograms.has(kind)) w.__shPrograms.set(kind, { kind, type: material.type, linked: gl.getProgramParameter(program, gl.LINK_STATUS), bindings, normal, determinant: normal ? new T.Matrix3().fromArray(normal).determinant() : null, shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) });
      };
    });
  });
  await page.locator(canvas).focus(); await advance(page, 12);
}
async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any; w.__shScene.updateMatrixWorld(true);
    return { player: w.__shPlayer.position.toArray(), conch: { state: w.__shConch.userData.state, parent: w.__shConch.parent === w.__shPlayer ? 'player' : w.__shConch.parent === w.__shScene ? 'scene' : null, position: w.__shConch.position.toArray(), world: w.__shConch.matrixWorld.toArray(), wobble: w.__shConch.userData.wobble, createdAt: w.__shConch.userData.createdAt }, sponge: { state: w.__shSponge.userData.state, parent: w.__shSponge.parent === w.__shScene, world: w.__shSponge.matrixWorld.toArray() }, camera: w.__shCamera.position.toArray(), camo: parseInt(document.querySelector('[data-hud=camo]')!.textContent!), status: document.querySelector('[data-hud=status]')?.textContent, time: document.querySelector('[data-hud=time]')?.textContent,
      stable: w.__shOwned.every((row: any) => row.mesh.geometry === row.geometry && row.mesh.material === row.material && row.geometry.index === row.index && row.index.array === row.array && row.indices.every((v: number, i: number) => v === row.array[i]) && Object.entries(row.attrs).every(([name, old]: [string, any]) => row.geometry.attributes[name] === old.attr && old.attr.array === old.array && old.attr.version === old.version && old.values.every((v: number, i: number) => v === old.array[i]))), finite: w.__shOwned.every((row: any) => row.mesh.matrixWorld.elements.every(Number.isFinite) && Object.values(row.geometry.attributes).every((attr: any) => Array.from(attr.array).every(Number.isFinite))), nativeStable: w.__shNativeStable, textures: w.__shRenderer.info.memory.textures, disposed: w.__shResources.map((row: any) => ({ selected: row.owner === w.__shConch, count: row.disposed })) };
  });
}
function stable(row: Awaited<ReturnType<typeof state>>, textures: number) { expect(row.stable && row.finite && row.nativeStable).toBe(true); expect(row.textures).toBe(textures); }
async function pause(page: Page) { await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); }
async function resume(page: Page) { await page.locator(canvas).focus(); await page.keyboard.press('Escape'); }
async function freshDraws(page: Page) { return page.evaluate(async () => { const w = window as any, epoch = ++w.__shEpoch; for (let i = 0; i < 60 && w.__shKinds.some((kind: string) => w.__shDraws[kind] !== epoch); i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return w.__shKinds.every((kind: string) => w.__shDraws[kind] === epoch); }); }
test.describe.configure({ timeout: 180000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const entries: string[] = []; errors.set(page, entries); page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) test(`${quality} conch and sponge surfaces render and preserve actual shelter lifecycle`, async ({ page }) => {
  await mount(page, quality); expect(await freshDraws(page)).toBe(true);
  const anatomy = await page.evaluate(() => {
    const w = window as any; return { programs: [...w.__shPrograms.values()], types: [...w.__shConches, ...w.__shSponges].map((owner: any) => ({ type: owner.userData.shelterType, meshes: owner.children.length, materials: new Set(owner.children.map((mesh: any) => mesh.material)).size, opaque: owner.children.every((mesh: any) => mesh.material.isMeshStandardMaterial && mesh.material.vertexColors && !mesh.material.transparent && mesh.material.opacity === 1 && !Object.values(mesh.material).some((value: any) => value?.isTexture)), vertices: owner.children.reduce((sum: number, mesh: any) => sum + mesh.geometry.attributes.position.count, 0), triangles: owner.children.reduce((sum: number, mesh: any) => sum + mesh.geometry.index.count / 3, 0) })) };
  });
  for (const row of anatomy.types) { expect(row.opaque).toBe(true); expect(row.meshes).toBe(row.materials); expect(row.meshes).toBeLessThanOrEqual(row.type === 'sponge' ? 1 : 2); expect(row.vertices).toBeLessThanOrEqual(row.type === 'sponge' ? 1700 : 2200); expect(row.triangles).toBeLessThanOrEqual(row.type === 'sponge' ? 2600 : 3400); }
  expect(anatomy.programs.length).toBe(anatomy.types[0].meshes + 1);
  for (const row of anatomy.programs) { expect(row.linked).toBe(true); expect(row.type).toBe('MeshStandardMaterial'); expect(row.shaders).toHaveLength(2); expect(row.shaders.every((shader: any) => shader.compiled)).toBe(true); expect(row.shaders.map((shader: any) => shader.source).join('\n')).toContain('#define USE_COLOR'); for (const binding of row.bindings) { expect(binding.enabled && binding.bound, row.kind + '/' + binding.name).toBe(true); expect(binding.size).toBe(3); } expect(row.normal).toHaveLength(9); expect(row.normal.every(Number.isFinite)).toBe(true); expect(Math.abs(row.determinant)).toBeGreaterThan(1e-8); }
  const initial = await state(page); stable(initial, initial.textures); expect(initial.disposed.every(row => row.count === 0)).toBe(true);

  await page.evaluate(() => { const w = window as any; w.__shConch.position.x = -30; w.__shSponge.position.x = -30; });
  const freeStart = await state(page); await advance(page, 8, 'KeyW'); const freeEnd = await state(page), freeDistance = Math.hypot(freeEnd.player[0] - freeStart.player[0], freeEnd.player[2] - freeStart.player[2]); expect(freeDistance).toBeGreaterThan(.8);
  await page.evaluate(() => { const w = window as any; w.__shPlayer.position.x = -16; w.__shPlayer.position.z = 0; w.__shConch.position.x = -16; w.__shConch.position.z = .4; }); await advance(page, 3);
  await expect(page.locator('.cl-hunt-action-prompt')).toContainText('+40% camo'); await expect(page.locator('.cl-hunt-action-prompt')).toContainText('15% slower'); await expect(page.locator('.cl-hunt-action-prompt')).toContainText('60s placed cover'); await advance(page, 1, 'KeyG');
  const carried = await state(page); expect(carried.conch.state).toBe('carried'); expect(carried.conch.parent).toBe('player'); expect(carried.conch.position).toEqual([0, -.1, .6]);
  const carryingStart = await state(page); await advance(page, 8, 'KeyW'); const carryingEnd = await state(page), carryingDistance = Math.hypot(carryingEnd.player[0] - carryingStart.player[0], carryingEnd.player[2] - carryingStart.player[2]); expect(carryingDistance / freeDistance).toBeCloseTo(.85, 6); expect(carryingEnd.conch.wobble).not.toBe(carried.conch.wobble); stable(carryingEnd, initial.textures);
  await pause(page); const paused = await state(page); expect(paused.status).toMatch(/Carrying.*conch/i); expect(paused.status).toContain('15% slower'); expect(paused.camo).toBeGreaterThanOrEqual(40); await expect(page.locator('.cl-hunt-action-prompt')).toContainText('60s'); await advance(page, 6); const held = await state(page); expect(held.conch).toEqual(paused.conch); expect(held.sponge).toEqual(paused.sponge); expect(held.time).toBe(paused.time);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await advance(page, 2); const inspected = await state(page); await page.getByRole('button', { name: 'Orbit right', exact: true }).click(); await advance(page, 5); const orbited = await state(page); expect(orbited.camera).not.toEqual(inspected.camera); expect(orbited.conch).toEqual(inspected.conch); expect(orbited.sponge).toEqual(inspected.sponge); stable(orbited, initial.textures);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); await resume(page);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); const reduced = await state(page); await advance(page, 5); const resumed = await state(page); expect(resumed.conch.wobble).not.toBe(reduced.conch.wobble); stable(resumed, initial.textures);

  await advance(page, 1, 'KeyG'); await advance(page, 4); await pause(page); const dropped = await state(page); expect(dropped.conch.state).toBe('dropped'); expect(dropped.conch.parent).toBe('scene'); expect(dropped.conch.createdAt).toBeGreaterThan(0); expect(dropped.status).toContain('IN DEN'); expect(dropped.status).toContain('60s left'); expect(dropped.disposed.every(row => row.count === 0)).toBe(true); await advance(page, 6); expect((await state(page)).status).toBe(dropped.status);
  await resume(page); await advance(page, 24); await pause(page); expect((await state(page)).status).toContain('59s left');
  // The CPU suite exercises the exact 60,000 ms boundary. Here the actual
  // scene object is aged beyond that boundary to exercise live removal and
  // disposal without spending 1,200 rendered frames waiting for the timer.
  await page.evaluate(() => { const w = window as any; w.__shConch.userData.createdAt -= 60001; }); await resume(page); await advance(page, 1); const expired = await state(page); expect(expired.conch.parent).toBeNull(); expect(expired.disposed.filter(row => row.selected).every(row => row.count === 1)).toBe(true); expect(expired.disposed.filter(row => !row.selected).every(row => row.count === 0)).toBe(true); stable(expired, initial.textures);

  await page.evaluate(() => { const w = window as any; w.__shSponge.position.x = w.__shPlayer.position.x; w.__shSponge.position.z = w.__shPlayer.position.z + .35; }); await advance(page, 4); await pause(page); const sheltered = await state(page); expect(sheltered.sponge.state).toBe('static'); expect(sheltered.sponge.parent).toBe(true); expect(sheltered.status).toContain('IN DEN'); expect(sheltered.status).toContain('+45% camo'); expect(sheltered.status).toContain('anchored'); expect(sheltered.camo).toBeGreaterThanOrEqual(45);
  if (quality === 'balanced') {
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Larger text', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 4); await pause(page);
    const stage = await page.locator('.cl-hunt-stage').boundingBox(), hud = await page.locator('.cl-hunt-hud').boundingBox(), mission = await page.locator('.cl-hunt-mission').boundingBox(), controls = await page.locator('.cl-hunt-controls').boundingBox(), touch = await page.locator('.cl-hunt-touch').boundingBox();
    expect(hud!.x).toBeGreaterThanOrEqual(stage!.x); expect(hud!.x + hud!.width).toBeLessThanOrEqual(stage!.x + stage!.width); expect(hud!.y + hud!.height).toBeLessThanOrEqual(mission!.y); expect(mission!.y + mission!.height).toBeLessThanOrEqual(controls!.y); expect(controls!.y + controls!.height).toBeLessThanOrEqual(touch!.y);
    const overflow = await page.locator('[data-hud=status]').evaluate(node => node.scrollWidth > node.clientWidth + 1); expect(overflow).toBe(false);
  }
  await resume(page); await advance(page, 1, 'KeyG'); const rejected = await state(page); expect(rejected.sponge).toEqual(sheltered.sponge); expect(rejected.status).not.toMatch(/Carrying/i); stable(rejected, initial.textures);
  await page.evaluate(() => { const w = window as any; w.__shSponge.position.x = -30; }); await advance(page, 4, 'KeyW'); await pause(page); const uncovered = await state(page); expect(uncovered.status).not.toContain('IN DEN'); expect(uncovered.camo).toBeLessThan(45);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); expect(await page.evaluate(() => (window as any).__shResources.every((row: any) => row.disposed >= 1))).toBe(true);
});
