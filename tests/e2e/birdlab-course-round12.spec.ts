import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round12Course={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round12CourseStep(ms); }, { frames, ms });
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
    (window as any).round12CourseStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round12Course', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.375); await step(page);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings', 'wildlife', 'animals']) expect(after[key], key).toEqual(before[key]);
}
function closePoint(actual: number[], expected: number[], tolerance = .0006) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
function expectedComparison(study: any) {
  const a = study.pinned, b = study.selected; let routeLength = 0;
  for (let index = 1; index < study.interval.length; index++) routeLength += Math.hypot(...study.interval[index].position.map((value: number, axis: number) => value - study.interval[index - 1].position[axis]));
  return { elapsed: Math.abs(b.t - a.t), routeLength, separation: Math.hypot(...b.position.map((value: number, axis: number) => value - a.position[axis])),
    heightChange: b.position[1] - a.position[1], clearanceChange: b.position[1] - b.ground - (a.position[1] - a.ground) };
}
async function nativeDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round12Course;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const root = scene.getObjectByName('birdlab-course-comparison'), bird = scene.getObjectByName('birdlab-red-tailed-hawk');
    const controller = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d, state = controller.getState(), study = state.courseStudy;
    const terrain = scene.getObjectByName('continuous-woodland-ground'), ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
    const course = study?.samples || [], all = course.concat(study ? [study.selected, ...(study.pinned ? [study.pinned] : [])] : []);
    const intersections = all.map((station: any) => { ray.set(new T.Vector3(station.position[0], 100, station.position[2]), down); return ray.intersectObject(terrain, false)[0]?.point.toArray() || null; });
    const actual = bird.getWorldPosition(new T.Vector3()).toArray(), relative = w.BirdLab3D.sampleFlight(state.time).position;
    const offset = actual.map((value: number, axis: number) => value - relative[axis]);
    const independent = all.map((station: any) => w.BirdLab3D.sampleFlight(station.t).position.map((value: number, axis: number) => value + offset[axis]));
    const meshes = ['birdlab-course-interval', 'birdlab-course-interval-outline'].map(name => {
      const object = root.getObjectByName(name), matrix = new T.Matrix4(), segments = [];
      for (let index = 0; index < object.count; index++) { object.getMatrixAt(index, matrix); segments.push([-.5, .5].map(y => new T.Vector3(0, y, 0).applyMatrix4(matrix).applyMatrix4(object.matrixWorld).toArray())); }
      return { name, visible: object.visible, segments, capacity: object.instanceMatrix.count, geometry: object.geometry.uuid, material: object.material.uuid };
    });
    const anchor = root.getObjectByName('birdlab-course-anchor'), tether = root.getObjectByName('birdlab-course-anchor-height');
    const tetherPoints = Array.from({ length: tether.geometry.attributes.position.count }, (_, index) => new T.Vector3().fromBufferAttribute(tether.geometry.attributes.position, index).applyMatrix4(tether.matrixWorld).toArray());
    function chart(selector: string) {
      const svg = document.querySelector(selector) as SVGSVGElement;
      const path = (selector: string) => { const node = svg.querySelector(selector); return node ? (node.getAttribute('d')!.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number) : null; };
      return { viewBox: svg.getAttribute('viewBox'), domain: { ...svg.dataset }, full: path('[data-course-path="full"]'), interval: path('[data-course-path="interval"]'), terrain: path('[data-course-terrain]'),
        points: ['selected', 'pinned'].map(kind => { const node = svg.querySelector('[data-course-point="' + kind + '"]') as SVGCircleElement | null; return node ? [node.cx.baseVal.value, node.cy.baseVal.value] : null; }),
        ground: ['selected', 'pinned'].map(kind => { const node = svg.querySelector('[data-course-ground="' + kind + '"]') as SVGLineElement | null; return node ? [node.x1.baseVal.value, node.y1.baseVal.value, node.x2.baseVal.value, node.y2.baseVal.value] : null; }) };
    }
    const resources = new Set<any>(); root.traverse((object: any) => { if (object.geometry) resources.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((item: any) => resources.add(item)); });
    return { rootVisible: root.visible, legacyFlownVisible: scene.getObjectByName('birdlab-study-flown').visible, actual, independent, intersections, meshes,
      anchorVisible: anchor.visible, anchor: anchor.getWorldPosition(new T.Vector3()).toArray(), tetherVisible: tether.visible, tether: tetherPoints,
      resources: [...resources].map(resource => resource.uuid).sort(), plan: chart('[data-course-plan]'), profile: chart('[data-course-profile]'),
      projected: all.map((station: any) => new T.Vector3(...station.position).project(camera).toArray()),
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
async function goldPaint(page: Page): Promise<any> {
  return page.evaluate(() => {
    const { scene, camera, renderer } = (window as any).round12Course;
    const root = scene.getObjectByName('birdlab-course-comparison');
    const outline = root.getObjectByName('birdlab-course-interval-outline'), interval = root.getObjectByName('birdlab-course-interval');
    const previous = [outline.visible, interval.visible], canvas = document.createElement('canvas');
    canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    // Copy immediately after each real WebGL render, before the drawing buffer
    // can be discarded. The model, camera and all other scene objects stay fixed.
    function pixels(showOutline: boolean, showGold: boolean) {
      outline.visible = showOutline; interval.visible = showGold; renderer.render(scene, camera);
      context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(renderer.domElement, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const warm = (data: Uint8ClampedArray, offset: number) => data[offset] > 200 && data[offset] > data[offset + 1] && data[offset + 1] > data[offset + 2] + 10;
    try {
      const baseline = pixels(false, false), reference = pixels(false, true), actual = pixels(true, true);
      let referencePixels = 0, retainedPixels = 0;
      for (let offset = 0; offset < reference.length; offset += 4) {
        const delta = Math.abs(reference[offset] - baseline[offset]) + Math.abs(reference[offset + 1] - baseline[offset + 1]) + Math.abs(reference[offset + 2] - baseline[offset + 2]);
        if (warm(reference, offset) && delta > 30) {
          referencePixels++; if (warm(actual, offset)) retainedPixels++;
        }
      }
      return { referencePixels, retainedPixels, retainedFraction: retainedPixels / Math.max(1, referencePixels), width: canvas.width, height: canvas.height };
    } finally {
      outline.visible = previous[0]; interval.visible = previous[1]; renderer.render(scene, camera);
    }
  });
}
async function agrees(page: Page) {
  await step(page);
  const state = await call(page, 'getState'), study = state.courseStudy, drawing = await nativeDrawing(page);
  expect(study.duration).toBe(44); expect(study.samples).toHaveLength(177);
  expect(study.samples.map((station: any) => station.t)).toEqual(Array.from({ length: 177 }, (_, index) => index / 4));
  expect(drawing.rootVisible).toBe(true); expect(drawing.legacyFlownVisible, 'gold identifies only the pinned interval while the course lens is visible').toBe(false);
  expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true);
  expect(closePoint(study.selected.position, drawing.actual, 1e-8)).toBe(true);
  const all = study.samples.concat([study.selected, ...(study.pinned ? [study.pinned] : [])]), errors: string[] = [];
  all.forEach((station: any, index: number) => {
    if (!closePoint(station.position, drawing.independent[index], 1e-8)) errors.push('model position ' + index);
    if (!drawing.intersections[index] || !closePoint([station.position[0], station.ground, station.position[2]], drawing.intersections[index], .00001)) errors.push('rendered terrain ' + index);
  });
  const plan = drawing.plan, profile = drawing.profile;
  expect(plan.viewBox).toBe('0 0 420 280'); expect(profile.viewBox).toBe('0 0 420 280');
  const minX = Number(plan.domain.domainMinX), maxX = Number(plan.domain.domainMaxX), minZ = Number(plan.domain.domainMinZ), maxZ = Number(plan.domain.domainMaxZ);
  const scale = Math.min(352 / (maxX - minX), 214 / (maxZ - minZ));
  expect((maxX - minX) / 352).toBeCloseTo((maxZ - minZ) / 214, 6);
  const planPoint = (station: any) => [38 + (352 - (maxX - minX) * scale) / 2 + (station.position[0] - minX) * scale, 28 + (214 - (maxZ - minZ) * scale) / 2 + (station.position[2] - minZ) * scale];
  const minY = Number(profile.domain.domainMin), maxY = Number(profile.domain.domainMax);
  expect(minY).toBeLessThan(maxY);
  const y = (value: number) => 242 - (value - minY) / (maxY - minY) * 214;
  const profilePoint = (station: any) => [38 + station.t / 44 * 352, y(station.position[1])];
  for (const [chart, project] of [[plan, planPoint], [profile, profilePoint]] as const) {
    expect(chart.full).toHaveLength(study.samples.length * 2);
    study.samples.forEach((station: any, index: number) => { if (!closePoint(chart.full.slice(index * 2, index * 2 + 2), project(station), .03)) errors.push('native full path ' + index); });
    expect(closePoint(chart.points[0], project(study.selected), .03)).toBe(true);
    if (study.pinned) {
      expect(closePoint(chart.points[1], project(study.pinned), .03)).toBe(true); expect(chart.interval).toHaveLength(study.interval.length * 2);
      study.interval.forEach((station: any, index: number) => { if (!closePoint(chart.interval.slice(index * 2, index * 2 + 2), project(station), .03)) errors.push('native interval ' + index); });
    } else { expect(chart.points[1]).toBeNull(); }
  }
  expect(profile.terrain).toHaveLength(study.samples.length * 2);
  study.samples.forEach((station: any, index: number) => {
    if (!closePoint(profile.terrain.slice(index * 2, index * 2 + 2), [38 + station.t / 44 * 352, y(station.ground)], .03)) errors.push('native terrain path ' + index);
    expect(station.position[1]).toBeGreaterThanOrEqual(minY); expect(station.position[1]).toBeLessThanOrEqual(maxY); expect(station.ground).toBeGreaterThanOrEqual(minY); expect(station.ground).toBeLessThanOrEqual(maxY);
  });
  for (const [index, station] of [study.selected, study.pinned].entries()) if (station) {
    expect(closePoint(profile.ground[index], [...profilePoint(station), 38 + station.t / 44 * 352, y(station.ground)], .03)).toBe(true);
  }
  for (const mesh of drawing.meshes) {
    expect(mesh.capacity).toBe(178); expect(mesh.segments).toHaveLength(Math.max(0, study.interval.length - 1));
    mesh.segments.forEach((ends: number[][], index: number) => {
      if (!closePoint(ends[0], study.interval[index].position) || !closePoint(ends[1], study.interval[index + 1].position)) errors.push(mesh.name + ' segment ' + index);
    });
  }
  if (study.pinned) {
    expect(drawing.anchorVisible).toBe(true); expect(drawing.tetherVisible).toBe(true); expect(closePoint(drawing.anchor, study.pinned.position)).toBe(true);
    const expected = expectedComparison(study); for (const [key, value] of Object.entries(expected)) expect(study.comparison[key], key).toBeCloseTo(value, 8);
    const low = Math.min(study.pinned.t, study.selected.t), high = Math.max(study.pinned.t, study.selected.t);
    const expectedTimes = [low, ...study.samples.map((station: any) => station.t).filter((time: number) => time > low && time < high), ...(high > low ? [high] : [])];
    expect(study.interval.map((station: any) => station.t)).toEqual(expectedTimes);
    const ground = [study.pinned.position[0], study.pinned.ground, study.pinned.position[2]];
    expect(drawing.tether.some((point: number[]) => closePoint(point, ground))).toBe(true); expect(drawing.tether.some((point: number[]) => closePoint(point, study.pinned.position))).toBe(true);
  } else { expect(study.comparison).toBeNull(); expect(drawing.anchorVisible).toBe(false); }
  expect(errors).toEqual([]);
  return { state, drawing };
}

test('guided course comparison matches actual scene positions, terrain and native charts without an extra clock', async ({ page }) => {
  await mount(page); const before = await call(page, 'getState');
  await call(page, 'setCourseLens', true); const opened = await agrees(page); frozen(before, opened.state);
  expect(opened.state.courseLens).toBe(true); expect(opened.state.camera).toBe('wide'); expect(opened.state.studyOverlay).toBe(true); expect(opened.state.courseStudy.pinned).toBeNull();
  await page.locator('[data-course-pin]').click(); const pinned = await agrees(page); frozen(opened.state, pinned.state);
  expect(pinned.state.courseStudy.pinned.t).toBe(7.375); expect(pinned.state.courseStudy.interval).toHaveLength(1);
  const pin = pinned.state.courseStudy.pinned, resources = pinned.drawing.resources; expect(resources).toHaveLength(7);
  for (const selected of [31.625, 1.125, 7.375, 44]) {
    await call(page, 'seek', selected); const review = await agrees(page);
    expect(review.state.courseStudy.selected.t).toBe(selected); expect(review.state.courseStudy.pinned).toEqual(pin); expect(review.drawing.resources).toEqual(resources);
    if (selected === 44) { expect(review.state.time).toBe(44); expect(review.state.courseStudy.selected.position).toEqual(review.state.courseStudy.samples.at(-1).position); }
    if (selected === 7.375) { expect(review.state.courseStudy.comparison.routeLength).toBe(0); expect(review.state.courseStudy.comparison.separation).toBe(0); }
  }
  await call(page, 'seek', 24.625); await step(page);
  const paintState = (await call(page, 'getState')).courseStudy;
  expect(paintState.pinned.t).toBe(7.375); expect(paintState.selected.t).toBe(24.625);
  const beforePaint = await call(page, 'getState');
  for (const camera of ['wide', 'orbit']) {
    await call(page, 'setCamera', camera); await call(page, 'seek', 24.625); await step(page);
    const cameraState = await call(page, 'getState'); frozen(beforePaint, cameraState); expect(cameraState.camera).toBe(camera);
    const distance = Math.hypot(...cameraState.cameraPosition.map((value: number, axis: number) => value - cameraState.position[axis]));
    if (camera === 'orbit') expect(distance, 'the paint check reaches the normal close orbit').toBeLessThan(5);
    const paint = await goldPaint(page);
    expect(paint.referencePixels, camera + ': the real GPU paints a substantial gold interval without its outline').toBeGreaterThan(30);
    expect(paint.retainedFraction, camera + ': the outline preserves the gold center in the actual rendered frame').toBeGreaterThan(.6);
  }
  await call(page, 'setCamera', 'wide'); await call(page, 'seek', 24.625); await step(page);
  const still = await call(page, 'getState'); await step(page, 3, 60_000); frozen(still, await call(page, 'getState'));
  await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => {
    const copy = canvas._birdlab3d.getState().courseStudy;
    copy.samples[0].position[0] = 999; copy.samples[0].ground = 999; copy.selected.position[0] = 999; copy.pinned.position[0] = 999; copy.interval[0].position[0] = 999; copy.comparison.routeLength = 999;
  });
  expect((await call(page, 'getState')).courseStudy).toEqual(still.courseStudy);
  for (const [method, value] of [['setCourseLens', false], ['setCamera', 'robin'], ['inspectWingbeat', undefined], ['setMode', 'free']] as const) {
    await call(page, 'seek', 4.2); await call(page, method, value); await step(page);
    expect((await call(page, 'getState')).courseStudy, method).toBeNull();
    expect(await page.evaluate(() => (window as any).round12Course.scene.getObjectByName('birdlab-course-comparison').visible), method).toBe(false);
    expect(await page.evaluate(() => (window as any).round12Course.scene.getObjectByName('birdlab-study-flown').visible), method + ': restore the ordinary flown prefix outside the lens').toBe(true);
    await call(page, 'closeWingbeat'); await call(page, 'setMode', 'guided'); await call(page, 'setCamera', 'orbit'); await call(page, 'setCourseLens', true);
    const restored = await agrees(page); expect(restored.state.courseStudy.pinned).toEqual(pin); expect(restored.drawing.resources).toEqual(resources);
  }
  await call(page, 'setPaused', false); await step(page, 2, 100); expect((await call(page, 'getState')).courseStudy.pinned).toEqual(pin);
  await call(page, 'setPaused', true); await page.locator('[data-course-clear]').click(); const cleared = await agrees(page); expect(cleared.state.courseStudy.pinned).toBeNull();
  await call(page, 'pinCourseStation'); await call(page, 'restart'); expect((await call(page, 'getState')).courseStudy.pinned).toBeNull();
  await page.evaluate(() => {
    const w = window as any, root = w.round12Course.scene.getObjectByName('birdlab-course-comparison'), resources = new Set<any>();
    root.traverse((object: any) => { if (object.geometry) resources.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material: any) => resources.add(material)); });
    w.round12CourseReleased = [...resources].map(resource => { const value = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => value.count++); return value; });
  });
  await harness.unmount(page);
  const released = await page.evaluate(() => (window as any).round12CourseReleased); expect(released).toHaveLength(7); expect(released.every((value: any) => value.count === 1), 'all three geometries and four materials released once').toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('course comparison remains keyboard accessible, framed and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const toggle = page.locator('[data-birdlab-course-toggle]');
    await toggle.focus(); await page.keyboard.press('Space'); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const slider = page.locator('#birdlab-3d-timeline'), pin = page.locator('[data-course-pin]'), clear = page.locator('[data-course-clear]');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused(); expect((await call(page, 'getState')).courseStudy.selected.t).toBeCloseTo(.1, 8);
    await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused(); expect((await call(page, 'getState')).courseStudy.pinned.t).toBeCloseTo(.1, 8);
    await slider.focus(); await page.keyboard.press('End'); const review = await agrees(page); expect(review.state.courseStudy.selected.t).toBe(44);
    expect(review.drawing.projected.filter((point: number[]) => point.some(value => !Number.isFinite(value)) || Math.abs(point[0]) >= 1 || Math.abs(point[1]) >= 1 || Math.abs(point[2]) >= 1), `whole course fits host ${layout.host}`).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-course-study]', '[data-course-plan]', '[data-course-profile]', '[data-course-pin]', '[data-course-clear]', '[data-birdlab-course-toggle]']) {
      const control = page.locator(selector), box = await control.boundingBox(); expect(box, selector).not.toBeNull(); expect(box!.width, selector).toBeGreaterThan(0);
      expect(box!.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box!.x + box!.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await control.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-course-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    await clear.focus(); await expect(clear).toBeFocused(); await page.keyboard.press('Space'); expect((await call(page, 'getState')).courseStudy.pinned).toBeNull();
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('[data-birdlab-course-study]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
