import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round17Shape={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Box = { min: number[]; max: number[]; size: number[] };
type Pin = { part: string; time: number; bounds: Box };
const root = '[data-birdlab-anatomy-study]';
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round17ShapeStep(ms); }, { frames, ms });
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
    (window as any).round17ShapeStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round17Shape', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.5); await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyPart', 'leftWing'); await step(page);
}
function closePoint(actual: number[], expected: number[], tolerance = .0001) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
function boxAgrees(actual: Box, expected: Box) {
  for (const key of ['min', 'max', 'size'] as const) expect(closePoint(actual[key], expected[key], 1e-7), key).toBe(true);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]);
}
async function resources(page: Page) {
  return page.evaluate(() => {
    const { scene } = (window as any).round17Shape, objects: string[] = [], geometries = new Set<string>(), materials = new Map<string, any>(), textures = new Set<string>();
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
  return page.evaluate(() => { const rows: any[] = []; (window as any).round17Shape.scene.getObjectByName('birdlab-red-tailed-hawk').traverse((mesh: any) => { if (mesh.isMesh) rows.push([mesh.uuid, mesh.visible]); }); return rows.sort((a, b) => a[0].localeCompare(b[0])); });
}

async function nativeDrawing(page: Page, part: string, pin: Pin | null): Promise<any> {
  return page.evaluate(({ part, pin }) => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round17Shape;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const bird = scene.getObjectByName('birdlab-red-tailed-hawk'), inverse = bird.matrixWorld.clone().invert();
    const ancestry: Record<string, string[]> = { head: ['hawk-head-gaze'], leftWing: ['left-shoulder'], rightWing: ['right-shoulder'], tail: ['twelve-feather-rust-tail'], feet: ['anatomical-foot--1', 'anatomical-foot-1'] };
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], meshes: string[] = []; let morphVertices = 0;
    bird.traverse((mesh: any) => {
      if (!mesh.isMesh || mesh.name === 'curved-lower-eyelid') return;
      let selected = part === 'whole';
      for (let node = mesh; !selected && node && node !== bird; node = node.parent) selected = ancestry[part].includes(node.name);
      if (!selected) return; meshes.push(mesh.uuid);
      const position = mesh.geometry.attributes.position, targets = mesh.geometry.morphAttributes.position || [], weights = mesh.morphTargetInfluences || [];
      for (let index = 0; index < position.count; index++) {
        const base = new T.Vector3().fromBufferAttribute(position, index), vertex = base.clone();
        targets.forEach((attribute: any, target: number) => { const weight = weights[target] || 0; if (!weight) return; const delta = new T.Vector3().fromBufferAttribute(attribute, index); if (!mesh.geometry.morphTargetsRelative) delta.sub(base); vertex.addScaledVector(delta, weight); morphVertices++; });
        vertex.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse).toArray().forEach((value: number, axis: number) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); });
      }
    });
    const bounds = { min, max, size: max.map((value, axis) => value - min[axis]) }, matching = !!pin && pin.part === part;
    const framing = { min: min.map((value, axis) => matching ? Math.min(value, pin!.bounds.min[axis]) : value), max: max.map((value, axis) => matching ? Math.max(value, pin!.bounds.max[axis]) : value), size: [] as number[] };
    framing.size = framing.max.map((value, axis) => value - framing.min[axis]);
    function corners(box: Box) { const local: number[][] = []; for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) local.push([x, y, z]); const world = local.map(point => new T.Vector3(...point).applyMatrix4(bird.matrixWorld)); return { local, world: world.map(point => point.toArray()), ndc: world.map(point => point.clone().project(camera).toArray()) }; }
    const current = corners(bounds), reference = matching ? corners(pin!.bounds) : null, fit = corners(framing);
    const center = new T.Vector3(...framing.min.map((value, axis) => (value + framing.max[axis]) / 2)).applyMatrix4(bird.matrixWorld);
    const radius = Math.max(.005, ...fit.world.map(point => new T.Vector3(...point).distanceTo(center)));
    const halfAngle = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const overlay = document.querySelector('[data-birdlab-anatomy-guide]') as SVGSVGElement, canvas = document.querySelector('[data-birdlab-3d-canvas]') as HTMLElement;
    function lines(attribute: string) { return [...overlay.querySelectorAll('[' + attribute + ']')].map(node => { const line = node as SVGLineElement; return { id: line.getAttribute(attribute), endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value] }; }); }
    return { bounds, framing, matching, current, reference, fit, center: center.toArray(), radius, minimumDistance: Math.max(camera.near + radius + .01, radius * 1.08 / Math.sin(halfAngle)), distance: camera.position.distanceTo(center), meshes: meshes.sort(), morphVertices,
      bird: { position: bird.position.toArray(), quaternion: bird.quaternion.toArray(), matrixWorld: bird.matrixWorld.toArray() }, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), direction: camera.position.clone().sub(center).transformDirection(inverse).toArray(), up: camera.up.clone().transformDirection(inverse).toArray() },
      viewport: { width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height }, overlay: { viewBox: overlay.getAttribute('viewBox'), current: lines('data-anatomy-edge'), pinned: lines('data-anatomy-pinned-edge') },
      charts: ['front', 'side'].map(plane => { const svg = document.querySelector('[data-anatomy-plane="' + plane + '"]') as SVGSVGElement; return { plane, viewBox: svg.getAttribute('viewBox'), boxes: ['selected', 'pinned'].map(name => { const box = svg.querySelector('[data-anatomy-box="' + name + '"]') as SVGRectElement | null; return { name, rect: box ? [box.x.baseVal.value, box.y.baseVal.value, box.width.baseVal.value, box.height.baseVal.value] : null }; }) }; }),
      deltas: ['x', 'y', 'z'].map(axis => document.querySelector('[data-anatomy-delta="' + axis + '"]')?.textContent || ''), live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, { part, pin });
}
function projectedEdges(local: number[][], ndc: number[][], viewport: { width: number; height: number }) {
  const edges: number[][] = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (local[a].filter((value, axis) => value !== local[b][axis]).length === 1) edges.push([a, b].flatMap(index => [(ndc[index][0] + 1) * viewport.width / 2, (1 - ndc[index][1]) * viewport.height / 2]));
  return edges;
}
function edgesAgree(lines: any[], box: any, viewport: { width: number; height: number }) {
  expect(lines).toHaveLength(12); expect(lines.map(line => Number(line.id)).sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, index) => index));
  const remaining = projectedEdges(box.local, box.ndc, viewport);
  for (const line of lines) { const index = remaining.findIndex(edge => closePoint(line.endpoints, edge) || closePoint(line.endpoints, [...edge.slice(2), ...edge.slice(0, 2)])); expect(index).toBeGreaterThanOrEqual(0); remaining.splice(index, 1); }
  expect(remaining).toHaveLength(0);
}
async function agrees(page: Page, part: string, pin: Pin | null, framed = false): Promise<any> {
  await expect(page.locator(root)).toBeVisible(); await step(page);
  const state = await call(page, 'getState'), study = state.anatomyInvestigation, drawing = await nativeDrawing(page, part, pin);
  expect(state.anatomyStudy).toBe(true); expect(study.part).toBe(part); expect(study.meshes.slice().sort()).toEqual(drawing.meshes); boxAgrees(study.bounds, drawing.bounds); boxAgrees(study.framing, drawing.framing);
  expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true);
  function pointsAgree(actual: number[][], expected: any) {
    expect(actual).toHaveLength(8); for (const point of actual) expect(expected.some((value: number[]) => closePoint(point, value, 1e-7))).toBe(true);
  }
  pointsAgree(study.corners, drawing.current.world);
  for (let index = 0; index < 8; index++) { const match = drawing.current.world.findIndex((point: number[]) => closePoint(point, study.corners[index], 1e-7)); expect(closePoint(study.ndc[index], drawing.current.ndc[match], 1e-7)).toBe(true); }
  expect(closePoint(study.cameraFit.center, drawing.center, 1e-7)).toBe(true); expect(study.cameraFit.radius).toBeCloseTo(drawing.radius, 7); expect(study.cameraFit.minimumDistance).toBeCloseTo(drawing.minimumDistance, 7); expect(study.cameraFit.distance).toBeCloseTo(drawing.distance, 7); expect(drawing.distance).toBeCloseTo(drawing.minimumDistance * study.zoom, 7);
  if (framed) expect(study.zoom).toBe(1);
  for (const point of drawing.fit.ndc) { expect(Math.abs(point[0])).toBeLessThan(1); expect(Math.abs(point[1])).toBeLessThan(1); expect(Math.abs(point[2])).toBeLessThan(1); }
  const viewport = study.viewport; expect(Math.abs(viewport.width - drawing.viewport.width)).toBeLessThanOrEqual(1); expect(Math.abs(viewport.height - drawing.viewport.height)).toBeLessThanOrEqual(1); expect(closePoint(drawing.overlay.viewBox.split(/\s+/).map(Number), [0, 0, viewport.width, viewport.height], 1e-6)).toBe(true);
  edgesAgree(drawing.overlay.current, drawing.current, viewport);
  if (!pin) { expect(study.pinned).toBeNull(); expect(study.delta).toBeNull(); expect(drawing.overlay.pinned).toHaveLength(0); }
  else {
    expect(study.pinned.part).toBe(pin.part); expect(study.pinned.time).toBe(pin.time); boxAgrees(study.pinned.bounds, pin.bounds); expect(study.pinned.matching).toBe(drawing.matching);
    if (drawing.matching) {
      pointsAgree(study.pinned.corners, drawing.reference.world);
      for (let index = 0; index < 8; index++) { const match = drawing.reference.world.findIndex((point: number[]) => closePoint(point, study.pinned.corners[index], 1e-7)); expect(closePoint(study.pinned.ndc[index], drawing.reference.ndc[match], 1e-7)).toBe(true); }
      const delta = drawing.bounds.size.map((value: number, axis: number) => value - pin.bounds.size[axis]); expect(closePoint(study.delta, delta, 1e-7)).toBe(true);
      drawing.deltas.forEach((text: string, axis: number) => { const value = Number((text.replace(/−/g, '-').match(/[+-]?(?:\d*\.?\d+)/) || [NaN])[0]); expect(Math.abs(value - delta[axis])).toBeLessThan(.0006); });
      edgesAgree(drawing.overlay.pinned, drawing.reference, viewport);
    } else { expect(study.pinned.corners).toEqual([]); expect(study.pinned.ndc).toEqual([]); expect(study.delta).toBeNull(); expect(drawing.overlay.pinned).toHaveLength(0); }
    await expect(page.locator('[data-anatomy-pin-status]')).toBeVisible(); expect((await page.locator('[data-anatomy-pin-status]').textContent())!.trim().length).toBeGreaterThan(0);
  }
  for (const chart of drawing.charts) { expect(chart.viewBox).toBe('0 0 420 280'); const horizontal = chart.plane === 'front' ? 0 : 2;
    for (const box of chart.boxes) { if (box.name === 'pinned' && !drawing.matching) { expect(box.rect).toBeNull(); continue; } const bounds = box.name === 'selected' ? drawing.bounds : pin!.bounds; expect(closePoint(box.rect, [210 + 170 * bounds.min[horizontal], 190 - 170 * bounds.max[1], 170 * bounds.size[horizontal], 170 * bounds.size[1]])).toBe(true); }
  }
  return { state, study, drawing };
}

test('frozen actual shape stays in body coordinates while morphs, signed deltas, union framing, mismatch policy and lifecycle remain coherent without resources or clocks', async ({ page }) => {
  await mount(page); const baseline = await resources(page); await call(page, 'seek', 0); let current = await agrees(page, 'leftWing', null, true); const original = current;
  let expectedPin: Pin = { part: 'leftWing', time: current.state.time, bounds: current.drawing.bounds };
  const beforePin = current.state; await call(page, 'pinAnatomyShape'); current = await agrees(page, 'leftWing', expectedPin, true); frozen(beforePin, current.state); expect(current.study.delta).toEqual([0, 0, 0]); const pinnedWorldAtStart = current.drawing.reference.world;
  let sawPositive = false, sawNegative = false, sawDeformation = false;
  for (const time of [7.5, 26]) {
    await call(page, 'seek', time); current = await agrees(page, 'leftWing', expectedPin, true); expect(current.state.paused).toBe(true);
    for (const value of current.study.delta) { sawPositive ||= value > .0001; sawNegative ||= value < -.0001; sawDeformation ||= Math.abs(value) > .0001; }
    expect(current.drawing.morphVertices).toBeGreaterThan(0); expect(current.drawing.reference.world.some((point: number[], index: number) => !closePoint(point, pinnedWorldAtStart[index], .01))).toBe(true); expect(await resources(page)).toEqual(baseline);
  }
  expect(sawDeformation).toBe(true);
  expectedPin = { part: 'leftWing', time: current.state.time, bounds: current.drawing.bounds }; const beforeReplace = current.state; await call(page, 'pinAnatomyShape'); current = await agrees(page, 'leftWing', expectedPin, true); frozen(beforeReplace, current.state);
  await call(page, 'seek', 0); current = await agrees(page, 'leftWing', expectedPin, true); for (const value of current.study.delta) { sawPositive ||= value > .0001; sawNegative ||= value < -.0001; } expect(sawPositive).toBe(true); expect(sawNegative).toBe(true);
  const saved = current.study; await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const copy = canvas._birdlab3d.getState().anatomyInvestigation; copy.pinned.part = 'tail'; copy.pinned.time = 999; for (const box of [copy.pinned.bounds, copy.framing]) for (const key of ['min', 'max', 'size']) box[key].fill(999); copy.pinned.corners.forEach((point: number[]) => point.fill(999)); copy.pinned.ndc.forEach((point: number[]) => point.fill(999)); copy.delta.fill(999); }); expect((await call(page, 'getState')).anatomyInvestigation).toEqual(saved);
  await call(page, 'setAnatomyPart', 'tail'); current = await agrees(page, 'tail', expectedPin, true); await expect(page.locator('[data-anatomy-return]')).toBeVisible(); await expect(page.locator('[data-anatomy-pin-status]')).toContainText(/left wing/i); const mismatch = current;
  await page.locator('[data-anatomy-return]').click(); current = await agrees(page, 'leftWing', expectedPin, true); frozen(mismatch.state, current.state);
  await call(page, 'setAnatomyIsolate', false); const ledger = await visibility(page); await call(page, 'setAnatomyIsolate', true); const frozenState = await call(page, 'getState');
  const canvas = page.locator('[data-birdlab-3d-canvas]'); await canvas.hover(); await page.mouse.wheel(0, 100); await step(page); const zoomed = await call(page, 'getState'); expect(zoomed.anatomyInvestigation.zoom).toBeGreaterThan(1); frozen(frozenState, zoomed);
  await call(page, 'pinAnatomyShape'); const pinnedZoom = await call(page, 'getState'); expect(pinnedZoom.anatomyInvestigation.zoom).toBe(zoomed.anatomyInvestigation.zoom); expect(pinnedZoom.anatomyInvestigation.view).toBe(zoomed.anatomyInvestigation.view); frozen(zoomed, pinnedZoom);
  // The current pose is the former reference pose; replacing the pin now
  // freezes those actual vertices without changing its part or the camera mode.
  expectedPin = { part: 'leftWing', time: pinnedZoom.time, bounds: original.drawing.bounds };
  const frame = (await canvas.boundingBox())!; await page.mouse.move(frame.x + frame.width * .5, frame.y + frame.height * .5); await page.mouse.down(); await page.mouse.move(frame.x + frame.width * .59, frame.y + frame.height * .53, { steps: 3 }); await page.mouse.up(); await step(page); let state = await call(page, 'getState'); expect(state.anatomyInvestigation.view).toBe('free'); frozen(pinnedZoom, state); await expect(page.locator('[data-anatomy-view="free"]')).toHaveAttribute('aria-pressed', 'true');
  for (const hidden of ['resident', 'free']) { await call(page, hidden === 'resident' ? 'setCamera' : 'setMode', hidden === 'resident' ? 'robin' : 'free'); state = await call(page, 'getState'); expect(state.anatomyStudy).toBe(true); expect(state.anatomyInvestigation).toBeNull(); expect(await visibility(page)).toEqual(ledger); await call(page, hidden === 'resident' ? 'setCamera' : 'setMode', hidden === 'resident' ? 'orbit' : 'guided'); current = await agrees(page, 'leftWing', expectedPin); }
  await call(page, 'setAnatomyStudy', false); expect(await visibility(page)).toEqual(ledger); await expect(page.locator('[data-anatomy-pinned-edge]')).toHaveCount(0); await call(page, 'setAnatomyStudy', true); current = await agrees(page, 'leftWing', expectedPin); expect(await resources(page)).toEqual(baseline);
  for (const other of ['setPerspectiveStudy', 'setLightStudy']) { await call(page, other, true); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await visibility(page)).toEqual(ledger); const priorResources = await resources(page); await call(page, 'setAnatomyStudy', true); current = await agrees(page, 'leftWing', expectedPin); expect(await resources(page)).toEqual(priorResources); }
  await call(page, 'setPaused', false); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await visibility(page)).toEqual(ledger); await step(page, 5, 40); await call(page, 'setPaused', true); await call(page, 'setAnatomyStudy', true); current = await agrees(page, 'leftWing', expectedPin);
  const beforeClear = current.state; await call(page, 'clearAnatomyShape'); current = await agrees(page, 'leftWing', null); frozen(beforeClear, current.state); expect(current.study.zoom).toBe(beforeClear.anatomyInvestigation.zoom); expect(current.study.view).toBe(beforeClear.anatomyInvestigation.view);
  await call(page, 'pinAnatomyShape'); await call(page, 'setAnatomyIsolate', false); const disposeLedger = await visibility(page); await call(page, 'setAnatomyIsolate', true);
  const disposed = await canvas.evaluate((element: any) => { const controller = element._birdlab3d, bird = (window as any).round17Shape.scene.getObjectByName('birdlab-red-tailed-hawk'); controller.dispose(); controller.dispose(); controller.setAnatomyStudy(true); controller.pinAnatomyShape(); const rows: any[] = []; bird.traverse((mesh: any) => { if (mesh.isMesh) rows.push([mesh.uuid, mesh.visible]); }); return { ready: controller.getState().ready, study: controller.getState().anatomyInvestigation, visibility: rows.sort((a, b) => a[0].localeCompare(b[0])) }; }); expect(disposed.ready).toBe(false); expect(disposed.study).toBeNull(); expect(disposed.visibility).toEqual(disposeLedger);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('shape pin, mismatch return and comparison controls retain keyboard focus with readable union diagrams at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await call(page, 'clearAnatomyShape'); await call(page, 'setAnatomyPart', 'leftWing'); await call(page, 'setAnatomyIsolate', false); await call(page, 'seek', 0);
    const before = await call(page, 'getState'), pinButton = page.locator('[data-anatomy-pin]'); await pinButton.focus(); await page.keyboard.press('Enter'); await expect(pinButton).toBeFocused(); const pinState = await call(page, 'getState'); frozen(before, pinState);
    const expectedPin: Pin = { part: 'leftWing', time: before.time, bounds: pinState.anatomyInvestigation.pinned.bounds };
    await call(page, 'seek', 7.5); await call(page, 'frameAnatomyPart'); await agrees(page, 'leftWing', expectedPin, true);
    const tail = page.locator('[data-anatomy-part="tail"]'); await tail.focus(); await page.keyboard.press('Enter'); await expect(tail).toBeFocused(); expect((await call(page, 'getState')).anatomyInvestigation.pinned.matching).toBe(false); await expect(page.locator('[data-anatomy-pinned-edge]')).toHaveCount(0);
    const back = page.locator('[data-anatomy-return]'); await back.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-anatomy-part="leftWing"]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-anatomy-part="leftWing"]')).toBeFocused(); expect((await call(page, 'getState')).anatomyInvestigation.pinned.matching).toBe(true);
    const isolate = page.locator('#birdlab-anatomy-isolate'); await isolate.focus(); await page.keyboard.press('Space'); await expect(isolate).toBeFocused(); await expect(isolate).toBeChecked();
    const above = page.locator('[data-anatomy-view="above"]'); await above.focus(); await page.keyboard.press('Enter'); await expect(above).toBeFocused(); await expect(above).toHaveAttribute('aria-pressed', 'true'); const frame = page.locator('[data-anatomy-frame]'); await frame.focus(); await page.keyboard.press('Enter'); await expect(frame).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '[data-anatomy-pin]', '[data-anatomy-clear]', '[data-anatomy-pin-status]', '[data-anatomy-frame]', '[data-anatomy-plane="front"]', '[data-anatomy-plane="side"]', '[data-anatomy-delta="x"]', '[data-anatomy-delta="y"]', '[data-anatomy-delta="z"]']) { const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0); expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1); }
    for (const plane of ['front', 'side']) expect((await page.locator('[data-anatomy-plane="' + plane + '"]').boundingBox())!.width).toBeGreaterThan(280);
    const labels = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => { const text = node as SVGTextElement, box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal; return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height }; })); for (const label of labels) { expect(label.left, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(label.width); expect(label.top, label.text || '').toBeGreaterThanOrEqual(0); expect(label.bottom, label.text || '').toBeLessThanOrEqual(label.height); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-anatomy-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) })); }); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const clear = page.locator('[data-anatomy-clear]'); await clear.focus(); await page.keyboard.press('Enter'); await expect(pinButton).toBeFocused(); expect((await call(page, 'getState')).anatomyInvestigation.pinned).toBeNull(); await expect(page.locator('[data-anatomy-pinned-edge]')).toHaveCount(0); await expect(page.locator('[data-anatomy-box="pinned"]')).toHaveCount(0);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
