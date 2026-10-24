import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round24Woodland={scene,camera,renderer};return render(scene,camera);};return renderer;};})();" });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = '[data-birdlab-3d-canvas]', shell = '[data-birdlab-3d-shell]';
async function call(page: Page, method: string, value?: unknown): Promise<any> { return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value }); }
// Native camera damping is time based. Larger bounded clock steps reach the
// same settled view without submitting dozens of redundant woodland frames.
async function step(page: Page, frames = 12) { await page.evaluate(frames => { for (let i = 0; i < frames; i++) (window as any).round24Step(100); }, frames); }
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await page.locator(canvas).scrollIntoViewIfNeeded(); await step(page, 2);
  await expect.poll(() => page.evaluate(() => { const p = (window as any).round24Woodland; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.002);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; }; window.cancelAnimationFrame = id => { pending.delete(id); }; (window as any).round24Step = (ms: number) => { now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round24Woodland", null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'setCamera', 'wide'); await call(page, 'seek', 7.375); await step(page, 2);
  await expect(page.locator(canvas)).toHaveAttribute('data-scene-picking', 'true');
}
function frozen(before: any, after: any) { for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]); }
async function native(page: Page, remember = false): Promise<any> {
  return page.evaluate(remember => {
    const w = window as any, T = w.THREE, p = w.round24Woodland; p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const objects: string[] = [], geos = new Set<string>(), mats = new Set<string>(), textures = new Set<string>(), saved = new Map(), before = w.round24Buffers;
    let bufferError = 0, worldError = 0, matched = 0;
    p.scene.traverse((node: any) => {
      objects.push(node.uuid); if (node.geometry) geos.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) { mats.add(material.uuid); for (const value of Object.values(material) as any[]) if (value?.isTexture) textures.add(value.uuid); }
      let root = node; while (root && root.name !== 'birdlab-red-tailed-hawk' && !root.name?.startsWith('woodland-')) root = root.parent;
      if (!root || !node.isMesh) return;
      const attr = node.geometry.attributes.position, old = before?.get(node.uuid), points: number[][] = [];
      for (let i = 0; i < attr.count; i++) { const point = new T.Vector3().fromBufferAttribute(attr, i).applyMatrix4(node.matrixWorld).toArray(); points.push(point); if (old) point.forEach((value: number, axis: number) => { worldError = Math.max(worldError, Math.abs(value - old.points[i][axis])); }); }
      if (old) { matched++; attr.array.forEach((value: number, i: number) => { bufferError = Math.max(bufferError, Math.abs(value - old.buffer[i])); }); }
      saved.set(node.uuid, { buffer: Array.from(attr.array), points });
    });
    if (remember) w.round24Buffers = saved;
    return { objects: objects.sort(), geometries: [...geos].sort(), materials: [...mats].sort(), textures: [...textures].sort(), meshCount: saved.size, matched, bufferError, worldError,
      scene: p.scene.uuid, camera: p.camera.uuid, position: p.camera.position.toArray(), quaternion: p.camera.quaternion.toArray(), fov: p.camera.fov, live: !p.renderer.getContext().isContextLost(), shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, remember);
}
function intact(value: any, before: any) { for (const key of ['objects', 'geometries', 'materials', 'textures', 'scene', 'camera', 'meshCount']) expect(value[key], key).toEqual(before[key]); expect(value.matched).toBe(value.meshCount); expect(value.bufferError).toBe(0); expect(value.worldError).toBeLessThan(1e-9); expect(value.live).toBe(true); expect(value.shaders).toBe(true); }

// Native oracle uses the real instance matrices/triangle faces of habitat solids,
// independently of the production observer's cached proxy inventory.
async function surface(page: Page, id: string, blocked = false, centre = false, away?: number[][]): Promise<any> {
  return page.evaluate(({ id, blocked, centre, away }) => {
    const w = window as any, T = w.THREE, p = w.round24Woodland, roots: any[] = [], targets: any[] = [], owners = new Map(), solids: any[] = [], ray = new T.Raycaster();
    p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const hawk = p.scene.getObjectByName('birdlab-red-tailed-hawk'); roots.push({ root: hawk, id: 'orbit' });
    p.scene.getObjectByName('birdlab-woodland-residents').children.forEach((root: any) => { if (root.name.startsWith('woodland-')) roots.push({ root, id: root.name.slice(9) }); });
    const shown = (node: any) => { for (; node; node = node.parent) if (node.visible === false) return false; return true; };
    roots.forEach(entry => entry.root.traverse((mesh: any) => { if (mesh.isMesh) { targets.push(mesh); owners.set(mesh, entry.id); } }));
    p.scene.traverse((mesh: any) => { if (mesh.isMesh && ['continuous-woodland-ground', 'distant-connected-woodland-ridge', 'weathered-landing-limb', 'branching-woodland-trunks', 'weathered-wood-broken-end-grain', 'weathered-clearing-stones'].includes(mesh.name) && shown(mesh)) solids.push(mesh); });
    const root = roots.find(entry => entry.id === id)?.root, rect = p.renderer.domElement.getBoundingClientRect(), candidates: any[] = [];
    if (centre) candidates.push(new T.Vector3(0, 0, 0));
    else if (root) {
      const meshes: any[] = []; root.traverse((mesh: any) => { if (mesh.isMesh) meshes.push(mesh); }); meshes.sort((a, b) => Number(/body|breast|head/.test(b.name)) - Number(/body|breast|head/.test(a.name)));
      meshes.forEach(mesh => { mesh.geometry.computeBoundingBox(); candidates.push(mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(p.camera)); });
    }
    for (const ndc of candidates) {
      if (Math.abs(ndc.x) > .97 || Math.abs(ndc.y) > .97 || ndc.z < -1 || ndc.z > 1) continue;
      const x = centre ? rect.left + rect.width / 2 : Math.floor(rect.left + (ndc.x + 1) * rect.width / 2) + .5, y = centre ? rect.top + rect.height / 2 : Math.floor(rect.top + (1 - ndc.y) * rect.height / 2) + .5;
      ray.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), p.camera);
      const hit = ray.intersectObjects(targets, false).find((hit: any) => shown(hit.object)); if (!hit || owners.get(hit.object) !== id || (away && away.some(point => hit.point.distanceTo(new T.Vector3().fromArray(point)) < .035))) continue;
      const solid = ray.intersectObjects(solids, false).find((candidate: any) => candidate.distance < hit.distance - .025);
      if (!!solid !== blocked) continue;
      const vertex = (i: number) => { const mesh = hit.object, base = new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i), point = base.clone(); (mesh.geometry.morphAttributes.position || []).forEach((attribute: any, index: number) => { const weight = mesh.morphTargetInfluences[index] || 0; if (weight) { const target = new T.Vector3().fromBufferAttribute(attribute, i); if (!mesh.geometry.morphTargetsRelative) target.sub(base); point.addScaledVector(target, weight); } }); return point.applyMatrix4(mesh.matrixWorld).toArray(); };
      return { id, x, y, mesh: hit.object.uuid, triangle: [vertex(hit.face.a), vertex(hit.face.b), vertex(hit.face.c)], origin: ray.ray.origin.toArray(), direction: ray.ray.direction.toArray(), world: hit.point.toArray(), distance: hit.distance, blocker: solid ? { name: solid.object.name, distance: solid.distance, instance: solid.instanceId } : null };
    }
    return null;
  }, { id, blocked, centre, away });
}

// Plane intersection and barycentric containment are recomputed from the
// native triangle's transformed vertices, independently of controller state.
function trianglePoint(hit: any) {
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
  const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const [a, b, c] = hit.triangle, ab = sub(b, a), ac = sub(c, a), normal = cross(ab, ac);
  const t = dot(sub(a, hit.origin), normal) / dot(hit.direction, normal), point = hit.origin.map((v: number, i: number) => v + t * hit.direction[i]), ap = sub(point, a);
  const aa = dot(ab, ab), bb = dot(ab, ac), cc = dot(ac, ac), d = aa * cc - bb * bb;
  const u = (cc * dot(ap, ab) - bb * dot(ap, ac)) / d, v = (aa * dot(ap, ac) - bb * dot(ap, ab)) / d;
  expect(u).toBeGreaterThanOrEqual(-1e-7); expect(v).toBeGreaterThanOrEqual(-1e-7); expect(u + v).toBeLessThanOrEqual(1 + 1e-7); expect(t).toBeGreaterThan(0);
  hit.world.forEach((value: number, axis: number) => expect(point[axis]).toBeCloseTo(value, 7)); return point;
}
function pointsMatch(measurement: any, hits: any[]) {
  expect(measurement.points).toHaveLength(hits.length);
  hits.forEach((hit, index) => { const point = trianglePoint(hit), actual = measurement.points[index]; expect(actual.bird).toBe(hit.id); expect(actual.mesh).toBe(hit.mesh); point.forEach((value: number, axis: number) => expect(actual.position[axis]).toBeCloseTo(value, 7)); });
  if (hits.length === 2) {
    const delta = hits[1].world.map((value: number, axis: number) => value - hits[0].world[axis]);
    delta.forEach((value: number, axis: number) => expect(measurement.delta[axis]).toBeCloseTo(value, 7));
    expect(measurement.distance).toBeCloseTo(Math.sqrt(delta.reduce((sum: number, value: number) => sum + value * value, 0)), 7);
  }
}
async function preset(page: Page, id = 'robin', time = 7.375) { await call(page, 'setCamera', id); await call(page, 'seek', time); await step(page, 2); await page.locator(canvas).scrollIntoViewIfNeeded(); }
async function ruler(page: Page) { await call(page, 'setSurfaceRuler', true); await call(page, 'setSurfaceMeasureMode', 'angle'); await step(page, 2); expect((await call(page, 'getState')).surfaceRuler).toBe(true); }
async function overlay(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, p = w.round24Woodland, root = p.scene.getObjectByName('birdlab-surface-ruler'), segment = root.getObjectByName('birdlab-surface-segment');
    const materials: any[] = [], geometries = new Set<string>(); root.traverse((node: any) => { if (node.geometry) geometries.add(node.geometry.uuid); if (node.material) materials.push({ id: node.material.uuid, depthTest: node.material.depthTest, depthWrite: node.material.depthWrite }); });
    root.updateMatrixWorld(true);
    return { visible: root.visible, a: root.getObjectByName('birdlab-surface-point-a').position.toArray(), b: root.getObjectByName('birdlab-surface-point-b').position.toArray(), ends: [-.5, .5].map(y => new T.Vector3(0, y, 0).applyMatrix4(segment.matrixWorld).toArray()), materials, geometries: [...geometries].sort(), uuid: root.uuid };
  });
}
async function overlayPixels(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).round24Woodland, root = p.scene.getObjectByName('birdlab-surface-ruler'), gl = p.renderer.getContext(), size = gl.drawingBufferWidth * gl.drawingBufferHeight * 4;
    const read = () => { p.renderer.render(p.scene, p.camera); const bytes = new Uint8Array(size); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes); return bytes; };
    const shown = root.visible; try { root.visible = true; const withGuide = read(); root.visible = false; const withoutGuide = read(); let changed = 0; for (let i = 0; i < size; i += 4) if (Math.abs(withGuide[i] - withoutGuide[i]) + Math.abs(withGuide[i + 1] - withoutGuide[i + 1]) + Math.abs(withGuide[i + 2] - withoutGuide[i + 2]) > 15) changed++; return changed; }
    finally { root.visible = shown; p.renderer.render(p.scene, p.camera); }
  });
}

function angleOracle(points: number[][]) {
  const length = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, axis) => sum + (value - b[axis]) ** 2, 0));
  const ab = length(points[0], points[1]), bc = length(points[1], points[2]), ac = length(points[0], points[2]);
  // Cosine rule uses the independently intersected triangle points and three
  // side lengths, rather than the production normalized-vector calculation.
  return { ab, bc, angle: ab < 1e-9 || bc < 1e-9 ? null : Math.acos(Math.max(-1, Math.min(1, (ab * ab + bc * bc - ac * ac) / (2 * ab * bc)))) * 180 / Math.PI };
}
async function angleGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, p = w.round24Woodland, root = p.scene.getObjectByName('birdlab-surface-ruler'), arc = root.getObjectByName('birdlab-surface-angle-arc'); root.updateMatrixWorld(true);
    const ends = (name: string) => { const mesh = root.getObjectByName(name); return [-.5, .5].map(y => new T.Vector3(0, y, 0).applyMatrix4(mesh.matrixWorld).toArray()); };
    return { ab: ends('birdlab-surface-segment'), bc: ends('birdlab-surface-segment-bc'), c: root.getObjectByName('birdlab-surface-point-c').position.toArray(), arc: { visible: arc.visible, points: Array.from({ length: arc.geometry.attributes.position.count }, (_, i) => new T.Vector3().fromBufferAttribute(arc.geometry.attributes.position, i).applyMatrix4(arc.matrixWorld).toArray()), depthTest: arc.material.depthTest, depthWrite: arc.material.depthWrite } };
  });
}
function drawnAngleMatches(drawn: any, hits: any[], measured: any) {
  const points = hits.map(trianglePoint), expected = angleOracle(points), dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0), sub = (a: number[], b: number[]) => a.map((value, i) => value - b[i]);
  expect(measured.angle).toBeCloseTo(expected.angle!, 7); expect(measured.distance).toBeCloseTo(expected.ab, 7); expect(measured.bcDistance).toBeCloseTo(expected.bc, 7);
  [drawn.ab[0], drawn.ab[1], drawn.bc[0], drawn.bc[1], drawn.c].forEach((point: number[], i) => point.forEach((v, axis) => expect(v).toBeCloseTo(points[[0, 1, 1, 2, 2][i]][axis], 7)));
  expect(drawn.arc.visible).toBe(true); expect(drawn.arc.depthTest).toBe(true); expect(drawn.arc.depthWrite).toBe(true); expect(drawn.arc.points).toHaveLength(65);
  const u = sub(points[0], points[1]).map(v => v / expected.ab), v = sub(points[2], points[1]).map(v => v / expected.bc), normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], radius = Math.min(expected.ab, expected.bc) * .28;
  drawn.arc.points.forEach((point: number[], i: number) => { const fromB = sub(point, points[1]), r = Math.sqrt(dot(fromB, fromB)); expect(r).toBeCloseTo(radius, 5); expect(dot(fromB, normal)).toBeCloseTo(0, 5); const swept = Math.acos(Math.max(-1, Math.min(1, dot(fromB, u) / r))) * 180 / Math.PI; expect(swept).toBeCloseTo(expected.angle! * i / 64, 2); });
}
async function collinearSurfaces(page: Page, seed: any): Promise<any> {
  return page.evaluate(seed => {
    const w = window as any, T = w.THREE, p = w.round24Woodland, targets: any[] = [], ray = new T.Raycaster(), rect = p.renderer.domElement.getBoundingClientRect();
    const shown = (node: any) => { for (; node; node = node.parent) if (node.visible === false) return false; return true; };
    [p.scene.getObjectByName('birdlab-red-tailed-hawk'), p.scene.getObjectByName('birdlab-woodland-residents')].forEach(root => root.traverse((node: any) => { if (node.isMesh) targets.push(node); }));
    // Three screen positions on one line intersecting the same planar native
    // face produce collinear world points. No fabricated measurement is set.
    for (const axis of [0, 1]) for (const gap of [1, .5, .125]) {
      const hits: any[] = [];
      for (const offset of [-gap, 0, gap]) {
        const x = seed.x + (axis ? 0 : offset), y = seed.y + (axis ? offset : 0); ray.setFromCamera(new T.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), p.camera);
        const hit = ray.intersectObjects(targets, false).find((candidate: any) => shown(candidate.object)); if (!hit || hit.object.uuid !== seed.mesh) break;
        const vertex = (index: number) => { const mesh = hit.object, base = new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index), point = base.clone(); (mesh.geometry.morphAttributes.position || []).forEach((attribute: any, i: number) => { const weight = mesh.morphTargetInfluences[i] || 0; if (weight) { const target = new T.Vector3().fromBufferAttribute(attribute, index); if (!mesh.geometry.morphTargetsRelative) target.sub(base); point.addScaledVector(target, weight); } }); return point.applyMatrix4(mesh.matrixWorld).toArray(); };
        hits.push({ id: seed.id, mesh: hit.object.uuid, face: hit.faceIndex, triangle: [vertex(hit.face.a), vertex(hit.face.b), vertex(hit.face.c)], origin: ray.ray.origin.toArray(), direction: ray.ray.direction.toArray(), world: hit.point.toArray(), x, y });
      }
      if (hits.length === 3 && hits.every(hit => hit.face === hits[0].face)) return hits;
    }
    return null;
  }, seed);
}

test('native three-surface angle matches independent triangle intersections and cosine rule with reused depth-tested world geometry', async ({ page }) => {
  await mount(page); await preset(page, 'grouse'); const before = await call(page, 'getState'), host = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await page.locator('[data-birdlab-surface-toggle]').click(); await step(page, 2); const legacy = await overlay(page); expect(legacy.geometries).toHaveLength(2); expect(legacy.materials).toHaveLength(3); expect((await call(page, 'getState')).surfaceMeasurement.mode).toBeUndefined();
  await page.locator('[data-surface-mode-choice="angle"]').click(); await step(page, 2); await page.locator(canvas).scrollIntoViewIfNeeded(); const initial = await overlay(page), baseline = await native(page, true);
  expect(initial.geometries).toHaveLength(3); expect(initial.materials).toHaveLength(6); expect(initial.materials.every((m: any) => m.depthTest && m.depthWrite)).toBe(true);
  const a = await surface(page, 'grouse'); expect(a).not.toBeNull(); await page.mouse.click(a.x, a.y); const b = await surface(page, 'grouse', false, false, [a.world]); expect(b).not.toBeNull(); await page.mouse.click(b.x, b.y);
  await expect(page.locator('[data-birdlab-surface-ruler]')).toHaveAttribute('data-surface-next', 'c'); const c = await surface(page, 'grouse', false, false, [a.world, b.world]); expect(c).not.toBeNull(); await page.mouse.click(c.x, c.y); await step(page, 2);
  const measured = await call(page, 'getState'); pointsMatch(measured.surfaceMeasurement, [a, b, c]); drawnAngleMatches(await angleGeometry(page), [a, b, c], measured.surfaceMeasurement); frozen(before, measured); expect(measured.camera).toBe('grouse'); expect(measured.canSelectBird).toBe(false);
  await expect(page.locator('[data-surface-reading="angle"]')).toHaveText(measured.surfaceMeasurement.angle.toFixed(4)); await expect(page.locator('[data-surface-reading="bc"]')).toHaveText(measured.surfaceMeasurement.bcDistance.toFixed(4)); expect(await overlayPixels(page)).toBeGreaterThan(8);
  await page.mouse.click(a.x, a.y); expect((await call(page, 'getState')).surfaceMeasurement).toEqual(measured.surfaceMeasurement);
  await call(page, 'clearSurfaceRuler'); const line = await collinearSurfaces(page, a); expect(line).not.toBeNull(); for (const hit of line) await page.mouse.click(hit.x, hit.y); await step(page, 2);
  const straight = (await call(page, 'getState')).surfaceMeasurement; pointsMatch(straight, line); expect(straight.angle).toBeCloseTo(180, 5); expect(straight.arcVisible).toBe(false); expect(straight.arcRadius).toBeNull(); expect((await angleGeometry(page)).arc.visible).toBe(false); await expect(page.locator('[data-surface-angle-explanation]')).toContainText('collinear');
  await call(page, 'clearSurfaceRuler'); for (const hit of [a, b, c]) await page.mouse.click(hit.x, hit.y); await step(page, 2); expect((await call(page, 'getState')).surfaceMeasurement).toEqual(measured.surfaceMeasurement);
  // World points and the physical angle survive camera/light changes; only
  // their projection and constant-pixel endpoint/segment thickness change.
  await call(page, 'setCamera', 'robin'); await call(page, 'setLighting', 'golden'); await step(page); expect((await call(page, 'getState')).surfaceMeasurement).toEqual(measured.surfaceMeasurement); drawnAngleMatches(await angleGeometry(page), [a, b, c], measured.surfaceMeasurement); await call(page, 'setLighting', 'daylight');
  for (let i = 0; i < 3; i++) { await call(page, 'setSurfaceMeasureMode', 'distance'); expect((await call(page, 'getState')).surfaceMeasurement.points).toEqual([]); await call(page, 'setSurfaceMeasureMode', 'angle'); await call(page, 'clearSurfaceRuler'); } await step(page, 2);
  const reused = await overlay(page); expect(reused.uuid).toBe(initial.uuid); expect(reused.geometries).toEqual(initial.geometries); expect(reused.materials).toEqual(initial.materials); intact(await native(page), baseline); frozen(before, await call(page, 'getState')); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(host);
  const disposed = await page.evaluate(() => { const p = (window as any).round24Woodland, root = p.scene.getObjectByName('birdlab-surface-ruler'), resources = new Map<any, number>(); root.traverse((node: any) => { if (node.geometry) resources.set(node.geometry, 0); if (node.material) resources.set(node.material, 0); }); resources.forEach((_, resource) => { const original = resource.dispose.bind(resource); resource.dispose = () => { resources.set(resource, resources.get(resource)! + 1); original(); }; }); (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.dispose(); return [...resources.values()]; }); expect(disposed).toEqual(Array(9).fill(1)); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('angle mode supports three native touch and keyboard points, coincident edges, gesture cancellation and study ownership at three host widths', async ({ page }) => {
  await mount(page); await preset(page); await ruler(page); const baseline = await native(page, true), before = await call(page, 'getState');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await preset(page); await ruler(page); const center = await surface(page, 'robin', false, true); expect(center).not.toBeNull(); const a = await surface(page, 'robin', false, false, [center.world]); expect(a).not.toBeNull();
    await page.touchscreen.tap(a.x, a.y); await step(page, 2); pointsMatch((await call(page, 'getState')).surfaceMeasurement, [a]);
    await page.locator(canvas).focus(); await page.keyboard.press('Enter'); await step(page, 2); pointsMatch((await call(page, 'getState')).surfaceMeasurement, [a, center]); await expect(page.locator(canvas)).toBeFocused();
    await page.keyboard.press('Backspace'); pointsMatch((await call(page, 'getState')).surfaceMeasurement, [a]); await page.locator('[data-surface-center]').click(); await step(page, 2); pointsMatch((await call(page, 'getState')).surfaceMeasurement, [a, center]);
    await page.locator(canvas).scrollIntoViewIfNeeded(); const c = await surface(page, 'robin', false, false, [a.world, center.world]); expect(c).not.toBeNull(); await page.touchscreen.tap(c.x,c.y); await step(page,2); pointsMatch((await call(page,'getState')).surfaceMeasurement,[a,center,c]); const completed=(await call(page,'getState')).surfaceMeasurement; expect(completed.angle).toBeCloseTo(angleOracle([a.world,center.world,c.world]).angle!,7);
    await call(page,'clearSurfaceRuler'); await page.locator(canvas).focus(); for(let i=0;i<3;i++) await page.keyboard.press('Enter'); await step(page,2); const same=(await call(page,'getState')).surfaceMeasurement; expect(same.points).toHaveLength(3); expect(same.distance).toBe(0); expect(same.bcDistance).toBe(0); expect(same.angle).toBeNull(); expect(same.arcVisible).toBe(false); expect((await angleGeometry(page)).arc.visible).toBe(false); await expect(page.locator('[data-surface-angle-explanation]')).toContainText('undefined');
    await page.locator('[data-surface-mode-choice="distance"]').click(); expect((await call(page,'getState')).surfaceMeasurement.points).toEqual([]); expect((await call(page,'getState')).surfaceMeasurement.mode).toBeUndefined(); await page.locator('[data-surface-mode-choice="angle"]').click(); await step(page,2); await expect(page.locator('[data-surface-mode-choice="angle"]')).toHaveAttribute('aria-pressed','true');
    await call(page, 'clearSurfaceRuler'); await page.locator(canvas).scrollIntoViewIfNeeded();
    // Panel controls can scroll the phone document. Gesture coordinates belong
    // to the current canvas viewport, not the earlier surface-pick viewport.
    const rect = (await page.locator(canvas).boundingBox())!, gesture = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    expect(await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.matches('[data-birdlab-3d-canvas]'), gesture)).toBe(true); expect((await call(page, 'getState')).surfaceRuler).toBe(true);
    await page.mouse.move(gesture.x, gesture.y); await page.mouse.down(); await page.mouse.move(gesture.x + 24, gesture.y); await page.mouse.move(gesture.x, gesture.y); await page.mouse.up(); await step(page, 2); expect((await call(page, 'getState')).surfaceMeasurement.points).toEqual([]);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gesture.x, y: gesture.y, id: 1 }, { x: gesture.x + 20, y: gesture.y, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gesture.x - 10, y: gesture.y, id: 1 }, { x: gesture.x + 30, y: gesture.y, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gesture.x, y: gesture.y, id: 3 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await cdp.detach(); await step(page, 2); expect((await call(page, 'getState')).surfaceMeasurement.points).toEqual([]);
    // Genuine capture loss followed by release must not turn into a placement.
    await page.locator(canvas).evaluate(node => node.addEventListener('gotpointercapture', (event: any) => { (window as any).round24Pointer = event.pointerId; }));
    await page.mouse.move(gesture.x, gesture.y); await page.mouse.down(); await page.mouse.move(gesture.x + 1, gesture.y); await page.locator(canvas).evaluate((node: any) => node.releasePointerCapture((window as any).round24Pointer)); await page.mouse.move(gesture.x + 2, gesture.y); await page.mouse.up(); await step(page, 2); expect((await call(page, 'getState')).surfaceMeasurement.points).toEqual([]);
    const model = await call(page, 'getState'); frozen(before, model); intact(await native(page), baseline); expect(model.surfaceRuler).toBe(true);
    const host = (await page.locator('#wrap').boundingBox())!; for (const selector of [canvas, '[data-birdlab-surface-ruler]', '[data-surface-crosshair]']) { const box = (await page.locator(selector).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); }
    for (const selector of ['[data-surface-mode-choice="distance"]', '[data-surface-mode-choice="angle"]', '[data-surface-center]', '[data-surface-undo]', '[data-surface-clear]', '[data-surface-close]']) { const box = (await page.locator(selector).boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-3d-shell]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator(canvas).focus(); await page.keyboard.press('Escape'); expect((await call(page, 'getState')).surfaceMeasurement).toBeNull();
  }
  await sizing(page, 1280, 1100); await preset(page); await ruler(page); await call(page, 'placeSurfaceCenter'); const retained = (await call(page, 'getState')).surfaceMeasurement; expect(retained.points).toHaveLength(1);
  await call(page, 'setLighting', 'golden'); await call(page, 'setCamera', 'orbit'); await step(page); expect((await call(page, 'getState')).surfaceMeasurement).toEqual(retained); await call(page, 'setLighting', 'daylight');
  for (const [method, value] of [['seek', 7.375], ['restart', undefined], ['setPaused', false], ['setRepeatFlights', true], ['setMode', 'free']] as const) {
    await call(page, 'setMode', 'guided'); const resident = method === 'setRepeatFlights' ? 'grouse' : 'robin'; await preset(page, resident); await ruler(page); const point = await surface(page, resident); expect(point).not.toBeNull(); await page.mouse.click(point.x, point.y); expect((await call(page, 'getState')).surfaceMeasurement.points).toHaveLength(1); await call(page, method, value); await step(page, 2); const closed = await call(page, 'getState'); expect(closed.surfaceRuler, method).toBe(false); expect(closed.surfaceMeasurement, method).toBeNull(); expect((await overlay(page)).visible).toBe(false);
  }
  await call(page, 'setMode', 'guided');
  for (const [method, flag] of [['setStudyOverlay', 'studyOverlay'], ['setCourseLens', 'courseLens'], ['setAttitudeLens', 'attitudeLens'], ['setLightStudy', 'lightStudy'], ['setPerspectiveStudy', 'perspectiveStudy'], ['setAnatomyStudy', 'anatomyStudy'], ['inspectWingbeat', 'wingbeatStudy']] as const) {
    await preset(page, 'orbit', method === 'inspectWingbeat' ? 4.2 : 7.375); await ruler(page); await call(page, method, true); await step(page, 2); const owner = await call(page, 'getState'); expect(owner[flag], method).toBeTruthy(); expect(owner.surfaceRuler).toBe(false); expect(owner.surfaceMeasurement).toBeNull(); expect(await call(page, 'setSurfaceRuler', true)).toBe(false); const after = await call(page, 'getState');
    for (const key of ['camera', 'time', 'position', 'pose', 'courseStudy', 'attitudeStudy', 'lightInvestigation', 'perspectiveInvestigation', 'anatomyInvestigation', 'wingbeatStudy']) expect(after[key], key).toEqual(owner[key]); await expect(page.locator('[data-birdlab-surface-toggle]')).toBeDisabled();
    await call(page, method === 'inspectWingbeat' ? 'closeWingbeat' : method, false); if (method === 'setCourseLens') await call(page, 'setStudyOverlay', false); await step(page, 2); expect((await call(page, 'getState')).canMeasureSurfaces).toBe(true);
  }
  await call(page, 'setMode', 'free'); expect(await call(page, 'setSurfaceRuler', true)).toBe(false); expect((await call(page, 'getState')).surfaceRuler).toBe(false); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
