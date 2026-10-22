import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round16Anatomy={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Part = 'whole' | 'head' | 'leftWing' | 'rightWing' | 'tail' | 'feet';
const parts: Part[] = ['whole', 'head', 'leftWing', 'rightWing', 'tail', 'feet'];
const root = '[data-birdlab-anatomy-study]';
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round16AnatomyStep(ms); }, { frames, ms });
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.waitForTimeout(80); await step(page, 2);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let time = 1000, next = 1;
    const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).round16AnatomyStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  try { await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 }); }
  catch (error) {
    const diagnostics = await page.evaluate(() => ({ errors: (window as any).__events?.errors, body: document.body.innerText.slice(0, 9000), libraries: ['THREE','BirdLab3DBird','BirdLab3DHabitat','BirdLab3DWildlife'].map(key => [key, typeof (window as any)[key]]) }));
    const { writeFileSync } = await import('node:fs'); writeFileSync('reports/avian-simulations-round16-2026-10-20/anatomy-bootstrap-' + Date.now() + '.json', JSON.stringify(diagnostics, null, 2)); throw error;
  }
  await page.waitForFunction('!!window.round16Anatomy', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.375); await step(page);
}
function closePoint(actual: number[], expected: number[], tolerance = .0001) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]);
}
async function resources(page: Page) {
  return page.evaluate(() => {
    const { scene } = (window as any).round16Anatomy, objects: string[] = [], geometries = new Set<string>(), materials = new Map<string, any>(), textures = new Set<string>();
    scene.traverse((object: any) => {
      objects.push(object.uuid); if (object.geometry) geometries.add(object.geometry.uuid);
      (Array.isArray(object.material) ? object.material : object.material ? [object.material] : []).forEach((material: any) => {
        materials.set(material.uuid, { uuid: material.uuid, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, color: material.color?.toArray(), emissive: material.emissive?.toArray(), wireframe: material.wireframe, side: material.side });
        Object.values(material).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); });
        Object.values(material.uniforms || {}).forEach((entry: any) => { if (entry.value?.isTexture) textures.add(entry.value.uuid); });
      });
    });
    return { objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials.values()].sort((a, b) => a.uuid.localeCompare(b.uuid)), textures: [...textures].sort() };
  });
}
async function visibility(page: Page) {
  return page.evaluate(() => {
    const bird = (window as any).round16Anatomy.scene.getObjectByName('birdlab-red-tailed-hawk'), rows: any[] = [];
    bird.traverse((object: any) => { if (object.isMesh) rows.push({ uuid: object.uuid, visible: object.visible }); });
    return rows.sort((a, b) => a.uuid.localeCompare(b.uuid));
  });
}

async function nativeDrawing(page: Page, part: Part): Promise<any> {
  return page.evaluate(part => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round16Anatomy;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const bird = scene.getObjectByName('birdlab-red-tailed-hawk'), inverseRoot = bird.matrixWorld.clone().invert();
    const meshes: any[] = []; bird.traverse((object: any) => { if (object.isMesh) meshes.push(object); });
    const ancestors: Record<string, string[]> = { head: ['hawk-head-gaze'], leftWing: ['left-shoulder'], rightWing: ['right-shoulder'], tail: ['twelve-feather-rust-tail'], feet: ['anatomical-foot--1', 'anatomical-foot-1'] };
    function belongs(mesh: any) { if (part === 'whole') return true; for (let node = mesh; node && node !== bird; node = node.parent) if (ancestors[part].includes(node.name)) return true; return false; }
    const selected = meshes.filter(belongs), selectedIds = new Set(selected.map(mesh => mesh.uuid));
    const allPoints: number[][] = [], selectedPoints: number[][] = []; let influenced = 0, excludedLids = 0, visibleLids = 0;
    for (const mesh of meshes) {
      if (mesh.name === 'curved-lower-eyelid') { excludedLids++; if (mesh.visible) visibleLids++; continue; }
      const positions = mesh.geometry.attributes.position, targets = mesh.geometry.morphAttributes.position || [], weights = mesh.morphTargetInfluences || [];
      if (weights.some((value: number) => value !== 0)) influenced++;
      for (let index = 0; index < positions.count; index++) {
        // Compute each rendered CPU morph vertex independently from the actual
        // position/target attributes; cached boxes include unused morph extrema.
        const base = new T.Vector3().fromBufferAttribute(positions, index), point = base.clone();
        targets.forEach((attribute: any, target: number) => {
          const weight = weights[target] || 0; if (!weight) return;
          const delta = new T.Vector3().fromBufferAttribute(attribute, index); if (!mesh.geometry.morphTargetsRelative) delta.sub(base); point.addScaledVector(delta, weight);
        });
        point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot); const coordinates = point.toArray();
        allPoints.push(coordinates); if (selectedIds.has(mesh.uuid)) selectedPoints.push(coordinates);
      }
    }
    function bounds(points: number[][]) {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      points.forEach(point => point.forEach((value, axis) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); }));
      return { min, max, size: max.map((value, axis) => value - min[axis]) };
    }
    const selectedBounds = bounds(selectedPoints), whole = bounds(allPoints), localCorners: number[][] = [];
    for (const x of [selectedBounds.min[0], selectedBounds.max[0]]) for (const y of [selectedBounds.min[1], selectedBounds.max[1]]) for (const z of [selectedBounds.min[2], selectedBounds.max[2]]) localCorners.push([x, y, z]);
    const corners = localCorners.map(point => new T.Vector3(...point).applyMatrix4(bird.matrixWorld));
    const center = new T.Vector3(...selectedBounds.min.map((value, axis) => (value + selectedBounds.max[axis]) / 2)).applyMatrix4(bird.matrixWorld);
    const radius = Math.max(.005, ...corners.map(point => point.distanceTo(center))), ndc = corners.map(point => point.clone().project(camera).toArray());
    const halfVertical = camera.fov * Math.PI / 360, halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect), minimumDistance = Math.max(camera.near + radius + .01, radius * 1.08 / Math.sin(Math.min(halfVertical, halfHorizontal)));
    const localDirection = camera.position.clone().sub(center).transformDirection(inverseRoot), up = camera.up.clone().transformDirection(inverseRoot);
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as HTMLElement, viewport = canvas.getBoundingClientRect(), overlay = document.querySelector('[data-birdlab-anatomy-guide]') as SVGSVGElement | null;
    return { visibilityMembers: [...selectedIds], selected: selected.filter(mesh => mesh.name !== 'curved-lower-eyelid').map(mesh => mesh.uuid).sort(), bounds: selectedBounds, whole, corners: corners.map(point => point.toArray()), localCorners, ndc, center: center.toArray(), radius, minimumDistance,
      influenced, excludedLids, visibleLids, pointCount: selectedPoints.length, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov, aspect: camera.aspect, distance: camera.position.distanceTo(center), direction: localDirection.toArray(), up: up.toArray() },
      overlay: overlay ? { viewBox: overlay.getAttribute('viewBox'), edges: [...overlay.querySelectorAll('[data-anatomy-edge]')].map(node => { const line = node as SVGLineElement; return { id: line.getAttribute('data-anatomy-edge'), points: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value] }; }) } : null,
      charts: ['front', 'side'].map(plane => { const svg = document.querySelector('[data-anatomy-plane="' + plane + '"]') as SVGSVGElement; return { plane, viewBox: svg?.getAttribute('viewBox'), boxes: ['selected', 'whole'].map(name => { const box = svg?.querySelector('[data-anatomy-box="' + name + '"]') as SVGRectElement; return { name, rect: box ? [box.x.baseVal.value, box.y.baseVal.value, box.width.baseVal.value, box.height.baseVal.value] : null }; }) }; }),
      metrics: ['x', 'y', 'z'].map(axis => document.querySelector('[data-anatomy-size="' + axis + '"]')?.textContent || ''),
      viewport: { width: viewport.width, height: viewport.height }, live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, part);
}
async function agrees(page: Page, part: Part, framed = false): Promise<any> {
  await expect(page.locator(root)).toBeVisible(); await step(page);
  const state = await call(page, 'getState'), study = state.anatomyInvestigation, drawing = await nativeDrawing(page, part);
  expect(state.anatomyStudy).toBe(true); expect(study).not.toBeNull(); expect(study.part).toBe(part); expect(study.meshes.slice().sort()).toEqual(drawing.selected);
  expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true); expect(drawing.pointCount).toBeGreaterThan(0); expect(drawing.excludedLids).toBe(2);
  for (const key of ['min', 'max', 'size']) { expect(closePoint(study.bounds[key], drawing.bounds[key], 1e-7), 'selected ' + key).toBe(true); expect(closePoint(study.whole[key], drawing.whole[key], 1e-7), 'whole ' + key).toBe(true); }
  expect(study.corners).toHaveLength(8); expect(study.ndc).toHaveLength(8);
  for (let index = 0; index < 8; index++) {
    const expectedIndex = drawing.corners.findIndex((point: number[]) => closePoint(point, study.corners[index], 1e-7)); expect(expectedIndex).toBeGreaterThanOrEqual(0);
    expect(closePoint(study.ndc[index], drawing.ndc[expectedIndex], 1e-7)).toBe(true);
  }
  expect(new Set(study.corners.map((point: number[]) => point.join(','))).size).toBe(8);
  expect(closePoint(study.cameraFit.center, drawing.center, 1e-7)).toBe(true); expect(study.cameraFit.radius).toBeCloseTo(drawing.radius, 7); expect(study.cameraFit.minimumDistance).toBeCloseTo(drawing.minimumDistance, 7); expect(study.cameraFit.distance).toBeCloseTo(drawing.camera.distance, 7);
  expect(study.zoom).toBeGreaterThanOrEqual(1); expect(study.zoom).toBeLessThanOrEqual(3); expect(drawing.camera.distance).toBeCloseTo(drawing.minimumDistance * study.zoom, 7);
  if (framed) { expect(study.zoom).toBe(1); for (const point of drawing.ndc) { expect(Math.abs(point[0])).toBeLessThan(1); expect(Math.abs(point[1])).toBeLessThan(1); expect(Math.abs(point[2])).toBeLessThan(1); } }
  const expectedDirection: Record<string, number[]> = { oblique: [1, .65, 1.5], front: [0, 0, -1], side: [1, 0, 0], above: [0, 1, 0] };
  if (study.view !== 'free') {
    const direction = expectedDirection[study.view], length = Math.hypot(...direction); expect(closePoint(drawing.camera.direction, direction.map(value => value / length), 1e-7)).toBe(true);
    expect(closePoint(drawing.camera.up, study.view === 'above' ? [0, 0, -1] : [0, 1, 0], 1e-7)).toBe(true);
  }
  expect(Math.abs(study.viewport.width - drawing.viewport.width)).toBeLessThanOrEqual(1); expect(Math.abs(study.viewport.height - drawing.viewport.height)).toBeLessThanOrEqual(1);
  expect(closePoint(drawing.overlay.viewBox.split(/\s+/).map(Number), [0, 0, study.viewport.width, study.viewport.height], 1e-6)).toBe(true); expect(drawing.overlay.edges).toHaveLength(12);
  expect(drawing.overlay.edges.map((edge: any) => Number(edge.id)).sort((a: number, b: number) => a - b)).toEqual(Array.from({ length: 12 }, (_, index) => index));
  const expectedEdges: number[][] = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (drawing.localCorners[a].filter((value: number, axis: number) => value !== drawing.localCorners[b][axis]).length === 1) {
    expectedEdges.push([a, b].flatMap(index => [(drawing.ndc[index][0] + 1) * study.viewport.width / 2, (1 - drawing.ndc[index][1]) * study.viewport.height / 2]));
  }
  const remaining = expectedEdges.slice();
  for (const edge of drawing.overlay.edges) { const match = remaining.findIndex(points => closePoint(edge.points, points) || closePoint(edge.points, [...points.slice(2), ...points.slice(0, 2)])); expect(match).toBeGreaterThanOrEqual(0); remaining.splice(match, 1); }
  expect(remaining).toHaveLength(0);
  for (const chart of drawing.charts) {
    expect(chart.viewBox).toBe('0 0 420 280'); const horizontal = chart.plane === 'front' ? 0 : 2;
    for (const box of chart.boxes) { const value = box.name === 'selected' ? drawing.bounds : drawing.whole; expect(closePoint(box.rect, [210 + 170 * value.min[horizontal], 190 - 170 * value.max[1], 170 * value.size[horizontal], 170 * value.size[1]])).toBe(true); }
  }
  drawing.metrics.forEach((text: string, axis: number) => { const reading = Number((text.replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/) || [NaN])[0]); expect(Math.abs(reading - drawing.bounds.size[axis])).toBeLessThan(.006); });
  return { state, study, drawing };
}

test('actual morphed model regions, native boxes and projected guide agree while framing, isolation, modes and lifecycle preserve pose, resources and visibility', async ({ page }) => {
  await mount(page); const baselineResources = await resources(page), initial = await call(page, 'getState'), ordinary = { position: initial.cameraPosition, target: initial.cameraTarget };
  await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyPart', 'whole'); let current = await agrees(page, 'whole', true); frozen(initial, current.state);
  expect(current.state.paused).toBe(true); expect(current.state.repeatFlights).toBe(false); expect(current.state.perspectiveStudy).toBe(false); expect(current.state.lightStudy).toBe(false); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(current.state.studyOverlay).toBe(false); expect(current.state.wingbeatStudy).toBeNull();
  let sawMorph = false, sawVisibleLid = false;
  for (const time of [0, 7.375, 7.99]) {
    await call(page, 'setAnatomyIsolate', false); await call(page, 'seek', time); await step(page); const ledger = await visibility(page), frozenState = await call(page, 'getState');
    for (const part of parts) {
      await call(page, 'setAnatomyPart', part); await call(page, 'frameAnatomyPart'); current = await agrees(page, part, true); frozen(frozenState, current.state); sawMorph ||= current.drawing.influenced > 0; sawVisibleLid ||= current.drawing.visibleLids > 0;
      await call(page, 'setAnatomyIsolate', true); current = await agrees(page, part, true); expect(current.study.isolate).toBe(true);
      const membership = new Set(current.drawing.visibilityMembers); expect(await visibility(page)).toEqual(ledger.map(row => ({ ...row, visible: row.visible && membership.has(row.uuid) })));
      expect(await resources(page)).toEqual(baselineResources);
      await call(page, 'setAnatomyIsolate', false); expect(await visibility(page)).toEqual(ledger);
    }
  }
  expect(sawMorph).toBe(true); expect(sawVisibleLid).toBe(true);
  await call(page, 'seek', 7.375); await call(page, 'setAnatomyPart', 'leftWing'); await call(page, 'setAnatomyIsolate', true);
  for (const view of ['oblique', 'front', 'side', 'above']) { const before = await call(page, 'getState'); await call(page, 'setAnatomyView', view); await call(page, 'frameAnatomyPart'); current = await agrees(page, 'leftWing', true); expect(current.study.view).toBe(view); frozen(before, current.state); }
  const copy = current.study; await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const value = canvas._birdlab3d.getState().anatomyInvestigation; value.meshes.length = 0; for (const box of [value.bounds, value.whole]) for (const key of ['min', 'max', 'size']) box[key].fill(999); value.corners.forEach((point: number[]) => point.fill(999)); value.ndc.forEach((point: number[]) => point.fill(999)); value.viewport.width = 999; value.cameraFit.center.fill(999); value.cameraFit.radius = 999; }); expect((await call(page, 'getState')).anatomyInvestigation).toEqual(copy);
  const canvas = page.locator('[data-birdlab-3d-canvas]'), beforeInput = current.state; await canvas.hover(); await page.mouse.wheel(0, 5000); await step(page); current = await agrees(page, 'leftWing'); expect(current.study.zoom).toBeCloseTo(Math.exp(180 * .0016), 12); frozen(beforeInput, current.state);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 5000); await step(page); } current = await agrees(page, 'leftWing'); expect(current.study.zoom).toBe(3); frozen(beforeInput, current.state);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -5000); await step(page); } current = await agrees(page, 'leftWing', true); expect(current.study.zoom).toBe(1);
  const box = (await canvas.boundingBox())!; await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .62, box.y + box.height * .56, { steps: 3 }); await page.mouse.up(); await step(page); current = await agrees(page, 'leftWing'); expect(current.study.view).toBe('free'); await expect(page.locator('[data-anatomy-view="free"]')).toHaveAttribute('aria-pressed', 'true'); frozen(beforeInput, current.state);
  await call(page, 'frameAnatomyPart'); current = await agrees(page, 'leftWing', true); const retained = { part: current.study.part, isolate: current.study.isolate, view: current.study.view };
  await call(page, 'setAnatomyIsolate', false); const ledger = await visibility(page); await call(page, 'setAnatomyIsolate', true);
  for (const hidden of ['resident', 'free']) {
    await call(page, hidden === 'resident' ? 'setCamera' : 'setMode', hidden === 'resident' ? 'robin' : 'free'); let state = await call(page, 'getState'); expect(state.anatomyStudy).toBe(true); expect(state.anatomyInvestigation).toBeNull(); expect(await visibility(page)).toEqual(ledger);
    await call(page, hidden === 'resident' ? 'setCamera' : 'setMode', hidden === 'resident' ? 'orbit' : 'guided'); current = await agrees(page, 'leftWing'); expect({ part: current.study.part, isolate: current.study.isolate, view: current.study.view }).toEqual(retained);
  }
  await call(page, 'setAnatomyStudy', false); expect((await call(page, 'getState')).anatomyInvestigation).toBeNull(); expect(await visibility(page)).toEqual(ledger); await expect(page.locator('[data-birdlab-anatomy-guide]')).toHaveCount(0); expect(await resources(page)).toEqual(baselineResources);
  await step(page, 60); let restored = await call(page, 'getState'); expect(closePoint(restored.cameraPosition, ordinary.position, .001)).toBe(true); expect(closePoint(restored.cameraTarget, ordinary.target, .001)).toBe(true);
  for (const camera of ['follow', 'wide']) { await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyIsolate', true); await call(page, 'setCamera', camera); restored = await call(page, 'getState'); expect(restored.anatomyStudy).toBe(false); expect(restored.anatomyInvestigation).toBeNull(); expect(await visibility(page)).toEqual(ledger); }
  for (const other of ['setPerspectiveStudy', 'setLightStudy', 'setCourseLens', 'setAttitudeLens']) {
    await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyIsolate', true); await call(page, other, true); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await visibility(page)).toEqual(ledger);
    const beforeReopen = await resources(page); await call(page, 'setAnatomyStudy', true); current = await agrees(page, 'leftWing'); expect(current.state.perspectiveStudy).toBe(false); expect(current.state.lightStudy).toBe(false); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(await resources(page)).toEqual(beforeReopen);
  }
  await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); expect((await call(page, 'getState')).anatomyStudy).toBe(false); await call(page, 'setAnatomyStudy', true); current = await agrees(page, 'leftWing'); expect(current.state.wingbeatStudy).toBeNull();
  await call(page, 'setAnatomyIsolate', false); const playingLedger = await visibility(page); await call(page, 'setAnatomyIsolate', true); const beforePlay = await call(page, 'getState'); await call(page, 'setPaused', false); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await visibility(page)).toEqual(playingLedger); await step(page, 6, 40); expect((await call(page, 'getState')).time).toBeGreaterThan(beforePlay.time);
  await call(page, 'setPaused', true); await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyIsolate', true); await call(page, 'setCamera', 'robin'); expect((await call(page, 'getState')).anatomyStudy).toBe(true); await call(page, 'setPaused', false); expect((await call(page, 'getState')).anatomyStudy).toBe(false); await call(page, 'setCamera', 'orbit'); expect((await call(page, 'getState')).anatomyInvestigation).toBeNull();
  await call(page, 'setPaused', true); await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyIsolate', false); const disposeLedger = await visibility(page); await call(page, 'setAnatomyIsolate', true);
  const disposedVisibility = await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const bird = (window as any).round16Anatomy.scene.getObjectByName('birdlab-red-tailed-hawk'); const controller = canvas._birdlab3d; controller.dispose(); controller.dispose(); const rows: any[] = []; bird.traverse((object: any) => { if (object.isMesh) rows.push({ uuid: object.uuid, visible: object.visible }); }); return rows.sort((a, b) => a.uuid.localeCompare(b.uuid)); }); expect(disposedVisibility).toEqual(disposeLedger);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('anatomy part, isolation and framing controls remain keyboard usable with readable native diagrams at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); const toggle = page.locator('[data-birdlab-anatomy-toggle]'); await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'true'); await call(page, 'setAnatomyIsolate', false);
    for (const part of parts) { const button = page.locator('[data-anatomy-part="' + part + '"]'); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true'); await call(page, 'frameAnatomyPart'); await agrees(page, part, true); }
    const isolate = page.locator('#birdlab-anatomy-isolate'); await isolate.focus(); await page.keyboard.press('Space'); await expect(isolate).toBeChecked(); await expect(isolate).toBeFocused(); expect((await call(page, 'getState')).anatomyInvestigation.isolate).toBe(true);
    for (const view of ['front', 'side', 'above', 'oblique']) { const button = page.locator('[data-anatomy-view="' + view + '"]'); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true'); await agrees(page, 'feet'); }
    const frame = page.locator('[data-anatomy-frame]'); await frame.focus(); await page.keyboard.press('Enter'); await expect(frame).toBeFocused(); await agrees(page, 'feet', true);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '[data-anatomy-plane="front"]', '[data-anatomy-plane="side"]', '#birdlab-anatomy-isolate', '[data-anatomy-frame]', ...parts.map(part => '[data-anatomy-part="' + part + '"]')]) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0); expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const plane of ['front', 'side']) expect((await page.locator('[data-anatomy-plane="' + plane + '"]').boundingBox())!.width).toBeGreaterThan(280);
    const labels = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal; return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height }; }));
    for (const label of labels) { expect(label.left, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.top, label.text || '').toBeGreaterThanOrEqual(0); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-anatomy-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator(root)).toHaveCount(0);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
