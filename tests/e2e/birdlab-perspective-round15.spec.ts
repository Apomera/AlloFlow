import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round15Perspective={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round15PerspectiveStep(ms); }, { frames, ms });
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
    (window as any).round15PerspectiveStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round15Perspective', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.375); await step(page);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]);
}
function closePoint(actual: number[], expected: number[], tolerance = .0001) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
const tangent = (fov: number) => Math.tan(fov * Math.PI / 360);
const fieldHeight = (distance: number, fov: number) => 2 * distance * tangent(fov);
function bounds(k: number) {
  const distance = [Math.max(1.8, k / tangent(70)), Math.min(10, k / tangent(25))];
  return { distance, fov: [2 * Math.atan(k / distance[1]) * 180 / Math.PI, 2 * Math.atan(k / distance[0]) * 180 / Math.PI] };
}
async function resources(page: Page) {
  return page.evaluate(() => {
    const { scene } = (window as any).round15Perspective, geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>();
    scene.traverse((object: any) => {
      if (object.geometry) geometries.add(object.geometry.uuid);
      (Array.isArray(object.material) ? object.material : object.material ? [object.material] : []).forEach((material: any) => {
        materials.add(material.uuid); Object.values(material).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); });
        Object.values(material.uniforms || {}).forEach((entry: any) => { if (entry.value?.isTexture) textures.add(entry.value.uuid); });
      });
    });
    return { objects: scene.children.map((object: any) => object.uuid).sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort() };
  });
}
async function nativeDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round15Perspective;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as any, state = canvas._birdlab3d.getState(), target = new T.Vector3(...state.cameraTarget);
    const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize(), up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize(), back = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).normalize();
    const distance = camera.position.distanceTo(target), height = 2 * distance * Math.tan(camera.fov * Math.PI / 360), center = target.clone().addScaledVector(right, -.84 * height * camera.aspect / 2);
    const world = [center.clone().addScaledVector(up, .25), center.clone().addScaledVector(up, -.25)], ndc = world.map(point => point.clone().project(camera).toArray());
    const hook = scene.getObjectByName('curved-keratin-hook'), vertex = new T.Vector3().fromBufferAttribute(hook.geometry.attributes.position, 0).applyMatrix4(hook.matrixWorld);
    const relative = vertex.clone().sub(camera.position), depth = -relative.dot(back), tan = Math.tan(camera.fov * Math.PI / 360);
    const nativeLine = (line: SVGLineElement | null) => line ? [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value] : null;
    const overlay = document.querySelector('[data-birdlab-perspective-ruler]') as SVGSVGElement | null, cone = document.querySelector('[data-perspective-cone]'), scale = document.querySelector('[data-perspective-scale-chart]');
    const sun = scene.getObjectByName('birdlab-key-sun'), sky = scene.getObjectByName('birdlab-sky'), rect = canvas.getBoundingClientRect();
    return { perspective: !!camera.isPerspectiveCamera, camera: { position: camera.position.toArray(), target: target.toArray(), quaternion: camera.quaternion.toArray(), right: right.toArray(), up: up.toArray(), back: back.toArray(), fov: camera.fov, aspect: camera.aspect, zoom: camera.zoom, projection: camera.projectionMatrix.toArray(), distance, fieldHeight: height },
      reference: { world: world.map(point => point.toArray()), ndc }, landmark: { world: vertex.toArray(), ndc: vertex.clone().project(camera).toArray(), independent: [relative.dot(right) / (depth * tan * camera.aspect), relative.dot(up) / (depth * tan)], morphs: hook.geometry.morphAttributes.position?.length || 0 },
      overlay: overlay ? { viewBox: overlay.getAttribute('viewBox'), line: nativeLine(overlay.querySelector('[data-perspective-ruler="current"]')) } : null,
      cone: cone ? { viewBox: cone.getAttribute('viewBox'), conditions: ['current', 'pinned'].flatMap(name => {
        const line = cone.querySelector('[data-perspective-focus="' + name + '"]') as SVGLineElement | null; if (!line) return [];
        return [{ name, line: nativeLine(line), path: cone.querySelector('[data-perspective-cone-path="' + name + '"]')!.getAttribute('d') }];
      }) } : null,
      scale: scale ? { viewBox: scale.getAttribute('viewBox'), bars: ['current', 'pinned'].flatMap(name => {
        const bar = scale.querySelector('[data-perspective-scale="' + name + '"]') as SVGRectElement | null;
        return bar ? [{ name, geometry: [bar.x.baseVal.value, bar.y.baseVal.value, bar.width.baseVal.value, bar.height.baseVal.value] }] : [];
      }) } : null,
      metrics: Object.fromEntries(['distance', 'fov'].map(name => [name, document.querySelector('[data-perspective-value="' + name + '"]')?.textContent || ''])),
      limits: Object.fromEntries(['distance', 'fov'].map(name => { const input = document.querySelector('#birdlab-perspective-' + name) as HTMLInputElement | null; return [name, input ? [Number(input.min), Number(input.max)] : null]; })),
      viewport: { width: rect.width, height: rect.height }, light: { position: sun.position.toArray(), target: sun.target.position.toArray(), color: sun.color.toArray(), intensity: sun.intensity, skyDirection: sky.material.uniforms.sunDirection.value.toArray(), exposure: renderer.toneMappingExposure, fog: scene.fog.color.toArray() },
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
async function agrees(page: Page): Promise<any> {
  await expect(page.locator('[data-birdlab-perspective-study]')).toBeVisible(); await step(page);
  const state = await call(page, 'getState'), drawing = await nativeDrawing(page), study = state.perspectiveInvestigation, camera = drawing.camera;
  expect(state.perspectiveStudy).toBe(true); expect(study).not.toBeNull(); expect(drawing.perspective).toBe(true); expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true); expect(camera.zoom).toBe(1);
  expect(study.distance).toBeCloseTo(camera.distance, 7); expect(study.fov).toBeCloseTo(camera.fov, 7); expect(study.fieldHeight).toBeCloseTo(camera.fieldHeight, 7); expect(study.fieldHeight).toBeCloseTo(fieldHeight(study.distance, study.fov), 7);
  expect(camera.projection[5]).toBeCloseTo(1 / tangent(study.fov), 7); expect(camera.projection[0]).toBeCloseTo(camera.projection[5] / camera.aspect, 7);
  const away = camera.position.map((value: number, axis: number) => (value - camera.target[axis]) / camera.distance); expect(closePoint(away, camera.back, 1e-7)).toBe(true);
  expect(study.ruler.length).toBe(.5); expect(study.ruler.fraction).toBeCloseTo(.5 / camera.fieldHeight, 8);
  for (const index of [0, 1]) {
    expect(closePoint(study.ruler.world[index], drawing.reference.world[index], 1e-7)).toBe(true); expect(closePoint(study.ruler.ndc[index], drawing.reference.ndc[index], 1e-7)).toBe(true); expect(study.ruler.ndc[index][0]).toBeCloseTo(-.84, 7);
  }
  expect((study.ruler.ndc[0][1] - study.ruler.ndc[1][1]) / 2).toBeCloseTo(study.ruler.fraction, 8);
  expect(Math.abs(study.viewport.width - drawing.viewport.width)).toBeLessThanOrEqual(1); expect(Math.abs(study.viewport.height - drawing.viewport.height)).toBeLessThanOrEqual(1);
  const viewport = study.viewport; expect(closePoint(drawing.overlay.viewBox.split(/\s+/).map(Number), [0, 0, viewport.width, viewport.height], 1e-6)).toBe(true);
  const pixels = drawing.reference.ndc.flatMap((point: number[]) => [(point[0] + 1) * viewport.width / 2, (1 - point[1]) * viewport.height / 2]); expect(closePoint(drawing.overlay.line, pixels)).toBe(true);
  expect(drawing.landmark.morphs).toBe(0); expect(closePoint(drawing.landmark.ndc.slice(0, 2), drawing.landmark.independent, 1e-7)).toBe(true);
  const expectedBounds = study.linked ? bounds(study.distance * tangent(study.fov)) : { distance: [1.8, 10], fov: [25, 70] };
  if (study.linked) expect(study.lockedScale).toBeCloseTo(study.distance * tangent(study.fov), 8);
  expect(closePoint(study.distanceBounds, expectedBounds.distance, 1e-7)).toBe(true); expect(closePoint(study.fovBounds, expectedBounds.fov, 1e-7)).toBe(true);
  for (const name of ['distance', 'fov']) {
    expect(closePoint(drawing.limits[name], expectedBounds[name], 1e-7), name + ' native limits').toBe(true);
    const displayed = Number((drawing.metrics[name].replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/) || [NaN])[0]); expect(Math.abs(displayed - study[name]), name + ' reading').toBeLessThan(.06);
  }
  expect(drawing.cone.viewBox).toBe('0 0 420 280'); expect(drawing.scale.viewBox).toBe('0 0 420 280'); expect(drawing.cone.conditions).toHaveLength(study.pinned ? 2 : 1); expect(drawing.scale.bars).toHaveLength(study.pinned ? 2 : 1);
  for (const condition of drawing.cone.conditions) {
    const settings = condition.name === 'current' ? study : study.pinned, x = 50 + 16 * settings.distance, halfHeight = 16 * settings.distance * tangent(settings.fov);
    expect(closePoint(condition.line, [x, 140 - halfHeight, x, 140 + halfHeight])).toBe(true);
    const coordinates = condition.path.match(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi).map(Number), vertices = Array.from({ length: coordinates.length / 2 }, (_, index) => coordinates.slice(index * 2, index * 2 + 2));
    const expectedVertices = [[50, 140], [x, 140 - halfHeight], [x, 140 + halfHeight]];
    expect(/[zZ]\s*$/.test(condition.path)).toBe(true); for (const expected of expectedVertices) expect(vertices.some(point => closePoint(point as number[], expected, .001))).toBe(true);
    for (const vertex of vertices) expect(expectedVertices.some(expected => closePoint(vertex as number[], expected, .001))).toBe(true);
  }
  for (const bar of drawing.scale.bars) {
    const settings = bar.name === 'current' ? study : study.pinned, fraction = .5 / fieldHeight(settings.distance, settings.fov);
    expect(settings.fieldHeight).toBeCloseTo(fieldHeight(settings.distance, settings.fov), 7); if (bar.name === 'pinned') expect(settings.fraction).toBeCloseTo(fraction, 8);
    expect(closePoint(bar.geometry, [bar.name === 'current' ? 95 : 245, 225 - 190 * fraction, 80, 190 * fraction])).toBe(true);
  }
  return { state, drawing };
}

test('actual camera matrices, ruler and comparison geometry agree; linked limits preserve focus-plane scale while pins, modes and input keep pose and clocks intact', async ({ page }) => {
  await mount(page); const baseline = await resources(page), before = await call(page, 'getState'), beforeFrame = await nativeDrawing(page);
  await call(page, 'setPerspectiveStudy', true); let current = await agrees(page); frozen(before, current.state); expect(current.drawing.light).toEqual(beforeFrame.light);
  expect(current.state.paused).toBe(true); expect(current.state.repeatFlights).toBe(false); expect(current.state.lightStudy).toBe(false); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(current.state.studyOverlay).toBe(false); expect(current.state.wingbeatStudy).toBeNull();
  expect(current.state.perspectiveInvestigation.distance).toBeCloseTo(3.2, 7); expect(current.state.perspectiveInvestigation.fov).toBe(40); expect(current.state.perspectiveInvestigation.linked).toBe(false);
  await call(page, 'pinPerspectiveSettings'); const pin = (await agrees(page)).state.perspectiveInvestigation.pinned;
  expect(pin.distance).toBeCloseTo(3.2, 7); expect(pin.fov).toBe(40); expect(pin.fraction).toBeCloseTo(.5 / fieldHeight(3.2, 40), 8);
  const initial = current; await call(page, 'setPerspectiveDistance', 6.4); current = await agrees(page); frozen(initial.state, current.state); expect(current.drawing.light).toEqual(initial.drawing.light); expect(current.drawing.landmark.world).toEqual(initial.drawing.landmark.world); expect(closePoint(current.drawing.camera.quaternion, initial.drawing.camera.quaternion, 1e-7)).toBe(true); expect(current.state.perspectiveInvestigation.fov).toBe(40);
  expect(Math.hypot(...current.drawing.landmark.ndc.slice(0, 2).map((value: number, axis: number) => value - initial.drawing.landmark.ndc[axis]))).toBeGreaterThan(.0001);
  const dolly = current; await call(page, 'setPerspectiveFov', 70); current = await agrees(page); frozen(dolly.state, current.state); expect(current.drawing.camera.position).toEqual(dolly.drawing.camera.position); expect(current.drawing.camera.quaternion).toEqual(dolly.drawing.camera.quaternion); expect(current.drawing.landmark.world).toEqual(dolly.drawing.landmark.world);
  const magnification = tangent(40) / tangent(70); expect(closePoint(current.drawing.landmark.ndc.slice(0, 2), dolly.drawing.landmark.ndc.slice(0, 2).map((value: number) => value * magnification), 1e-7)).toBe(true);
  await call(page, 'setPerspectiveDistance', 4); await call(page, 'setPerspectiveFov', 60); await call(page, 'setPerspectiveLinked', true); current = await agrees(page); expect(current.state.perspectiveInvestigation.lockedScale).toBeCloseTo(4 * tangent(60), 8);
  await call(page, 'restorePerspectiveSettings'); current = await agrees(page); const k = pin.distance * tangent(pin.fov), fraction = pin.fraction;
  expect(current.state.perspectiveInvestigation.linked).toBe(true); expect(current.state.perspectiveInvestigation.lockedScale).toBeCloseTo(k, 8); expect(current.state.perspectiveInvestigation.distance).toBeCloseTo(pin.distance, 7); expect(current.state.perspectiveInvestigation.fov).toBeCloseTo(pin.fov, 7);
  for (const [method, value] of [['setPerspectiveDistance', 100], ['setPerspectiveDistance', 0], ['setPerspectiveFov', 0], ['setPerspectiveFov', 100]] as const) {
    const still = current.state; await call(page, method, value); current = await agrees(page); frozen(still, current.state); const settings = current.state.perspectiveInvestigation;
    expect(settings.lockedScale).toBeCloseTo(k, 8); expect(settings.ruler.fraction).toBeCloseTo(fraction, 8); expect(settings.pinned).toEqual(pin); expect(current.drawing.light).toEqual(initial.drawing.light);
    const limits = bounds(k), expected = method === 'setPerspectiveDistance' ? limits.distance[value === 0 ? 0 : 1] : limits.fov[value === 0 ? 0 : 1]; expect(settings[method === 'setPerspectiveDistance' ? 'distance' : 'fov']).toBeCloseTo(expected, 7);
  }
  const isolated = current.state.perspectiveInvestigation; await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => { const copy = canvas._birdlab3d.getState().perspectiveInvestigation; copy.distanceBounds.fill(999); copy.fovBounds.fill(999); copy.viewport.width = 999; copy.ruler.world.forEach((point: number[]) => point.fill(999)); copy.ruler.ndc.forEach((point: number[]) => point.fill(999)); copy.pinned.distance = 999; }); expect((await call(page, 'getState')).perspectiveInvestigation).toEqual(isolated);
  await call(page, 'setPerspectiveLinked', false); await call(page, 'setPerspectiveDistance', 10); await call(page, 'setPerspectiveFov', 70); await call(page, 'setPerspectiveLinked', true); current = await agrees(page); expect(closePoint(current.state.perspectiveInvestigation.distanceBounds, [10, 10], 1e-7)).toBe(true); expect(closePoint(current.state.perspectiveInvestigation.fovBounds, [70, 70], 1e-7)).toBe(true);
  await call(page, 'restorePerspectiveSettings'); current = await agrees(page); const beforeInput = current.state; const canvas = page.locator('[data-birdlab-3d-canvas]'); await canvas.hover(); await page.mouse.wheel(0, 100); await step(page); current = await agrees(page); frozen(beforeInput, current.state); expect(current.state.perspectiveInvestigation.distance).toBeGreaterThan(pin.distance); expect(current.state.perspectiveInvestigation.ruler.fraction).toBeCloseTo(fraction, 8);
  const beforeKey = current.state; await canvas.focus(); await page.keyboard.press('='); await step(page); current = await agrees(page); frozen(beforeKey, current.state); expect(current.state.perspectiveInvestigation.distance).toBeLessThan(beforeKey.perspectiveInvestigation.distance);
  const beforePlus = current.state; await page.keyboard.press('-'); await step(page); current = await agrees(page); frozen(beforePlus, current.state); expect(current.state.perspectiveInvestigation.distance).toBeGreaterThan(beforePlus.perspectiveInvestigation.distance);
  const beforeDrag = current; await canvas.scrollIntoViewIfNeeded(); const box = (await canvas.boundingBox())!; await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2 + 12, { steps: 3 }); await page.mouse.up(); await step(page); current = await agrees(page); frozen(beforeDrag.state, current.state); expect(current.state.perspectiveInvestigation.distance).toBeCloseTo(beforeDrag.state.perspectiveInvestigation.distance, 7); expect(current.state.perspectiveInvestigation.fov).toBeCloseTo(beforeDrag.state.perspectiveInvestigation.fov, 7); expect(current.state.perspectiveInvestigation.ruler.fraction).toBeCloseTo(fraction, 8); expect(current.drawing.camera.position).not.toEqual(beforeDrag.drawing.camera.position);
  expect(await resources(page), 'no scene resources are allocated by the camera workbench').toEqual(baseline); const paused = current.state; await step(page, 3, 60_000); frozen(paused, await call(page, 'getState'));
  const saved = current.state.perspectiveInvestigation; await call(page, 'setPerspectiveStudy', false); await step(page); expect((await call(page, 'getState')).perspectiveInvestigation).toBeNull(); const closed = await nativeDrawing(page); expect(closed.camera.fov).toBe(40); expect(closed.camera.distance).toBeCloseTo(saved.distance, 7);
  await call(page, 'setPerspectiveStudy', true); current = await agrees(page); expect(current.state.perspectiveInvestigation.pinned).toEqual(pin); expect(current.state.perspectiveInvestigation.fov).toBeCloseTo(saved.fov, 7);
  await call(page, 'setCamera', 'robin'); expect((await call(page, 'getState')).perspectiveStudy).toBe(true); expect((await call(page, 'getState')).perspectiveInvestigation).toBeNull(); await expect(page.locator('[data-birdlab-perspective-study]')).toHaveCount(0);
  await call(page, 'setCamera', 'orbit'); current = await agrees(page); expect(current.state.perspectiveInvestigation.pinned).toEqual(pin); expect(current.state.perspectiveInvestigation.distance).toBeCloseTo(saved.distance, 7); expect(current.state.perspectiveInvestigation.fov).toBeCloseTo(saved.fov, 7);
  await call(page, 'setMode', 'free'); expect((await call(page, 'getState')).perspectiveStudy).toBe(true); expect((await call(page, 'getState')).perspectiveInvestigation).toBeNull(); await call(page, 'setMode', 'guided'); current = await agrees(page); expect(current.state.perspectiveInvestigation.pinned).toEqual(pin); expect(current.state.perspectiveInvestigation.fov).toBeCloseTo(saved.fov, 7);
  for (const camera of ['follow', 'wide']) { await call(page, 'setCamera', camera); expect((await call(page, 'getState')).perspectiveStudy).toBe(false); expect((await call(page, 'getState')).perspectiveInvestigation).toBeNull(); await step(page); expect((await nativeDrawing(page)).camera.fov).toBe(40); await call(page, 'setPerspectiveStudy', true); await agrees(page); }
  for (const other of ['setLightStudy', 'setCourseLens', 'setAttitudeLens']) { await call(page, other, true); expect((await call(page, 'getState')).perspectiveStudy).toBe(false); expect((await call(page, 'getState')).perspectiveInvestigation).toBeNull(); await call(page, 'setPerspectiveStudy', true); current = await agrees(page); expect(current.state.lightStudy).toBe(false); expect(current.state.courseLens).toBe(false); expect(current.state.attitudeLens).toBe(false); expect(current.state.perspectiveInvestigation.pinned).toEqual(pin); }
  await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); expect((await call(page, 'getState')).perspectiveStudy).toBe(false); await call(page, 'setPerspectiveStudy', true); current = await agrees(page); expect(current.state.wingbeatStudy).toBeNull();
  await call(page, 'clearPerspectiveSettings'); current = await agrees(page); expect(current.state.perspectiveInvestigation.pinned).toBeNull(); const clear = current.state.perspectiveInvestigation; await call(page, 'restorePerspectiveSettings'); expect((await call(page, 'getState')).perspectiveInvestigation).toEqual(clear);
});

test('perspective controls, dynamic linked bounds and native diagrams remain keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); const toggle = page.locator('[data-birdlab-perspective-toggle]'); await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await call(page, 'setPerspectiveLinked', false); await call(page, 'setPerspectiveDistance', 3.2); await call(page, 'setPerspectiveFov', 40);
    for (const name of ['distance', 'fov']) { const input = page.locator('#birdlab-perspective-' + name); await input.focus(); await page.keyboard.press('Home'); const value = Number(await input.inputValue()); await page.keyboard.press('ArrowRight'); expect(Number(await input.inputValue())).toBeGreaterThan(value); await expect(input).toBeFocused(); await agrees(page); }
    const pin = page.locator('[data-perspective-pin]'); await pin.focus(); await page.keyboard.press('Enter'); const saved = (await agrees(page)).state.perspectiveInvestigation.pinned;
    const link = page.locator('#birdlab-perspective-link'); await link.focus(); await page.keyboard.press('Space'); await expect(link).toBeChecked(); const linked = (await agrees(page)).state;
    const input = page.locator('#birdlab-perspective-distance'); await input.focus(); await page.keyboard.press('End'); const changed = (await agrees(page)).state; frozen(linked, changed); expect(changed.perspectiveInvestigation.ruler.fraction).toBeCloseTo(linked.perspectiveInvestigation.ruler.fraction, 8); expect(changed.perspectiveInvestigation.pinned).toEqual(saved);
    const restore = page.locator('[data-perspective-restore]'); await restore.focus(); await page.keyboard.press('Enter'); const restored = (await agrees(page)).state.perspectiveInvestigation; expect(restored.distance).toBeCloseTo(saved.distance, 7); expect(restored.fov).toBeCloseTo(saved.fov, 7);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-perspective-study]', '[data-perspective-cone]', '[data-perspective-scale-chart]', '#birdlab-perspective-distance', '#birdlab-perspective-fov', '#birdlab-perspective-link', '[data-perspective-pin]', '[data-perspective-restore]', '[data-perspective-clear]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0); expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-perspective-cone]', '[data-perspective-scale-chart]']) expect((await page.locator(selector).boundingBox())!.width, selector + ' readable width').toBeGreaterThan(280);
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-perspective-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) })); });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const clear = page.locator('[data-perspective-clear]'); await clear.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-perspective-focus="pinned"]')).toHaveCount(0); await expect(page.locator('[data-perspective-scale="pinned"]')).toHaveCount(0);
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('[data-birdlab-perspective-study]')).toHaveCount(0);
  }
});
