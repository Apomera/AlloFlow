import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round13Attitude={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let index = 0; index < frames; index++) (window as any).round13AttitudeStep(ms); }, { frames, ms });
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
    (window as any).round13AttitudeStep = (ms: number) => { time += ms; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); };
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round13Attitude', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.375); await step(page);
}
function frozen(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings', 'wildlife', 'animals']) expect(after[key], key).toEqual(before[key]);
}
function closePoint(actual: number[], expected: number[], tolerance = .0001) {
  return actual.length === expected.length && actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
async function resources(page: Page): Promise<any> {
  return page.evaluate(() => {
    const root = (window as any).round13Attitude.scene.getObjectByName('birdlab-attitude-guide'), values = new Set<any>();
    root?.traverse((object: any) => { if (object.geometry) values.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material: any) => values.add(material)); });
    return { exists: !!root, visible: !!root?.visible, ids: [...values].map(value => value.uuid).sort() };
  });
}
async function nativeDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round13Attitude;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const bird = scene.getObjectByName('birdlab-red-tailed-hawk'), root = scene.getObjectByName('birdlab-attitude-guide');
    const origin = bird.localToWorld(new T.Vector3()), axes = { forward: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] };
    const basis = Object.fromEntries(Object.entries(axes).map(([name, vector]) => [name, bird.localToWorld(new T.Vector3(...vector)).sub(origin).normalize().toArray()]));
    const world = (object: any, point: number[]) => new T.Vector3(...point).applyMatrix4(object.matrixWorld).toArray();
    const nativeAxes = ['forward', 'right', 'up'].map(name => {
      const stem = root.getObjectByName('birdlab-attitude-' + name + '-stem'), tip = root.getObjectByName('birdlab-attitude-' + name + '-tip');
      return { name, stem: [[0, -.5, 0], [0, .5, 0]].map(point => world(stem, point)), tip: world(tip, [0, .5, 0]),
        coneBase: world(tip, [0, -.5, 0]), visible: stem.visible && tip.visible };
    });
    const horizon = root.getObjectByName('birdlab-attitude-horizon'), positions = horizon.geometry.attributes.position;
    const ring = Array.from({ length: positions.count }, (_, index) => new T.Vector3().fromBufferAttribute(positions, index).applyMatrix4(horizon.matrixWorld).toArray());
    const line = root.getObjectByName('birdlab-attitude-world-up'), linePositions = line.geometry.attributes.position;
    const worldUp = Array.from({ length: linePositions.count }, (_, index) => new T.Vector3().fromBufferAttribute(linePositions, index).applyMatrix4(line.matrixWorld).toArray());
    const projected: number[][] = [];
    root.traverse((object: any) => { const positions = object.geometry?.attributes?.position; if (!positions) return; for (let index = 0; index < positions.count; index++) projected.push(new T.Vector3().fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld).project(camera).toArray()); });
    function chart(plane: string) {
      const svg = document.querySelector('[data-attitude-plane="' + plane + '"]') as SVGSVGElement;
      return { plane, viewBox: svg.getAttribute('viewBox'), vectors: ['forward', 'right', 'up'].map(name => {
        const line = svg.querySelector('[data-attitude-vector="' + name + '"]') as SVGLineElement;
        return { name, endpoints: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value], stroke: getComputedStyle(line).stroke };
      }) };
    }
    const direction = camera.position.clone().sub(new T.Vector3(...(document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState().cameraTarget)).normalize();
    return { origin: origin.toArray(), basis, rootPosition: root.getWorldPosition(new T.Vector3()).toArray(), rootQuaternion: root.getWorldQuaternion(new T.Quaternion()).toArray(),
      frameQuaternion: root.getObjectByName('birdlab-attitude-body-frame').getWorldQuaternion(new T.Quaternion()).toArray(), birdQuaternion: bird.getWorldQuaternion(new T.Quaternion()).toArray(),
      visible: root.visible, nativeAxes, ring, horizonCenter: horizon.getWorldPosition(new T.Vector3()).toArray(), horizonNormal: new T.Vector3(0, 0, 1).applyQuaternion(horizon.getWorldQuaternion(new T.Quaternion())).toArray(), worldUp,
      charts: ['plan', 'side'].map(chart), metrics: Object.fromEntries(['heading', 'pitch', 'bank'].map(name => [name, document.querySelector('[data-attitude-value="' + name + '"]')!.textContent])),
      projected, cameraDirection: direction.toArray(), cameraUp: camera.up.toArray(), live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
async function agrees(page: Page, checkFrustum = true): Promise<any> {
  await expect(page.locator('[data-birdlab-attitude-study]')).toBeVisible(); await step(page);
  const state = await call(page, 'getState'), drawing = await nativeDrawing(page), study = state.attitudeStudy, errors: string[] = [];
  expect(state.attitudeLens).toBe(true); expect(study).not.toBeNull(); expect(drawing.visible).toBe(true); expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true);
  expect(closePoint(study.position, drawing.origin)).toBe(true); expect(closePoint(drawing.rootPosition, drawing.origin)).toBe(true);
  expect(closePoint(drawing.rootQuaternion, [0, 0, 0, 1])).toBe(true);
  expect(Math.abs(drawing.frameQuaternion.reduce((sum: number, value: number, axis: number) => sum + value * drawing.birdQuaternion[axis], 0))).toBeCloseTo(1, 7);
  for (const axis of ['forward', 'right', 'up']) {
    expect(closePoint(study[axis], drawing.basis[axis])).toBe(true);
    expect(Math.hypot(...study[axis])).toBeCloseTo(1, 8);
    const native = drawing.nativeAxes.find((value: any) => value.name === axis), expected = (distance: number) => drawing.origin.map((value: number, index: number) => value + distance * drawing.basis[axis][index]);
    expect(native.visible).toBe(true); expect(closePoint(native.stem[0], expected(0))).toBe(true); expect(closePoint(native.stem[1], expected(1.27))).toBe(true); expect(closePoint(native.coneBase, expected(1.27))).toBe(true); expect(closePoint(native.tip, expected(1.45))).toBe(true);
  }
  expect(study.worldUp).toEqual([0, 1, 0]);
  expect(closePoint(drawing.worldUp[0], drawing.origin)).toBe(true); expect(closePoint(drawing.worldUp[1], drawing.origin.map((value: number, axis: number) => value + (axis === 1 ? 1.45 : 0)))).toBe(true);
  expect(closePoint(drawing.horizonCenter, drawing.origin)).toBe(true); expect(Math.abs(drawing.horizonNormal[1])).toBeCloseTo(1, 8);
  for (const point of drawing.ring) {
    const radius = Math.hypot(point[0] - drawing.origin[0], point[2] - drawing.origin[2]);
    if (Math.abs(point[1] - drawing.origin[1]) > .0121 || radius < 1.1879 || radius > 1.2121) errors.push('world-horizontal ring');
  }
  const degrees = 180 / Math.PI, f = drawing.basis.forward, r = drawing.basis.right, u = drawing.basis.up;
  const angles = { heading: Math.atan2(-f[0], -f[2]) * degrees, pitch: Math.asin(Math.max(-1, Math.min(1, f[1]))) * degrees, bank: Math.atan2(r[1], u[1]) * degrees };
  for (const [name, expected] of Object.entries(angles)) {
    expect(study[name], name).toBeCloseTo(expected, 7);
    const displayed = Number((drawing.metrics[name].replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/) || [NaN])[0]);
    expect(Math.abs(displayed - expected), name + ' displayed degree reading').toBeLessThan(.06);
  }
  for (const chart of drawing.charts) {
    expect(chart.viewBox).toBe('0 0 420 280');
    for (const vector of chart.vectors) {
      const basis = drawing.basis[vector.name], expected = chart.plane === 'plan' ? [210, 140, 210 + 80 * basis[0], 140 + 80 * basis[2]] : [210, 140, 210 + 80 * basis[2], 140 - 80 * basis[1]];
      // SVGAnimatedLength exposes browser Float32 values; this is subpixel error.
      expect(closePoint(vector.endpoints, expected, .0001), chart.plane + ':' + vector.name).toBe(true); expect(vector.stroke).not.toBe('none');
    }
  }
  const directions: Record<string, number[]> = { oblique: [1, .65, 1.5], x: [1, 0, 0], z: [0, 0, 1], above: [0, 1, 0] };
  if (directions[study.view]) {
    const direction = directions[study.view], length = Math.hypot(...direction);
    expect(closePoint(drawing.cameraDirection, direction.map(value => value / length))).toBe(true);
    expect(closePoint(drawing.cameraUp, study.view === 'above' ? [0, 0, -1] : [0, 1, 0])).toBe(true);
    if (checkFrustum) for (const point of drawing.projected) if (!point.every(Number.isFinite) || Math.abs(point[0]) > 1.001 || Math.abs(point[1]) > 1.001 || Math.abs(point[2]) > 1.001) errors.push('guide outside camera frustum');
  }
  expect(errors).toEqual([]); return { state, drawing };
}

test('body and world attitude guides, native projections and degree readings agree with the actual rendered frame without advancing clocks', async ({ page }) => {
  await mount(page); const before = await call(page, 'getState'); expect((await resources(page)).exists).toBe(false);
  await call(page, 'setAttitudeLens', true); const opened = await agrees(page); frozen(before, opened.state);
  expect(opened.state.paused).toBe(true); expect(opened.state.courseLens).toBe(false); expect(opened.state.studyOverlay).toBe(false); expect(opened.state.wingbeatStudy).toBeNull();
  const ids = (await resources(page)).ids; expect(ids).toHaveLength(9);
  for (const time of [0, 4.2, 12.375, 24.625, 35.75, 44]) {
    await call(page, 'seek', time); const current = await agrees(page); expect(current.state.time).toBe(time); expect((await resources(page)).ids).toEqual(ids);
  }
  for (const view of ['oblique', 'x', 'z', 'above']) {
    const beforeView = await call(page, 'getState'); await call(page, 'setAttitudeView', view); const current = await agrees(page); frozen(beforeView, current.state); expect(current.state.attitudeStudy.view).toBe(view);
  }
  const still = await call(page, 'getState'); await step(page, 3, 60_000); frozen(still, await call(page, 'getState'));
  await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => {
    const copy = canvas._birdlab3d.getState().attitudeStudy;
    for (const key of ['position', 'forward', 'right', 'up', 'worldUp']) copy[key].fill(999);
    copy.heading = 999; copy.pitch = 999; copy.bank = 999;
  });
  expect((await call(page, 'getState')).attitudeStudy).toEqual(still.attitudeStudy);
  await call(page, 'setAttitudeLens', false); expect((await call(page, 'getState')).attitudeStudy).toBeNull(); expect((await resources(page)).visible).toBe(false);
  await call(page, 'setAttitudeLens', true); await agrees(page); expect((await resources(page)).ids).toEqual(ids);
  await call(page, 'setCourseLens', true); expect((await call(page, 'getState')).attitudeLens).toBe(false); expect((await call(page, 'getState')).attitudeStudy).toBeNull(); expect((await resources(page)).visible).toBe(false);
  await call(page, 'setAttitudeLens', true); expect((await call(page, 'getState')).courseLens).toBe(false); await agrees(page);
  await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); const wingbeat = await call(page, 'getState'); expect(wingbeat.wingbeatStudy).not.toBeNull(); expect(wingbeat.attitudeLens).toBe(false); expect(wingbeat.attitudeStudy).toBeNull(); expect((await resources(page)).visible).toBe(false);
  await call(page, 'closeWingbeat'); await call(page, 'setAttitudeLens', true);
  await call(page, 'setCamera', 'robin'); expect((await call(page, 'getState')).attitudeLens).toBe(true); expect((await call(page, 'getState')).attitudeStudy).toBeNull(); expect((await resources(page)).visible).toBe(false);
  await call(page, 'setCamera', 'orbit'); await call(page, 'setAttitudeView', 'oblique'); await agrees(page);
  await call(page, 'setMode', 'free'); expect((await call(page, 'getState')).attitudeLens).toBe(true); expect((await call(page, 'getState')).attitudeStudy).toBeNull(); expect((await resources(page)).visible).toBe(false);
  await call(page, 'setMode', 'guided'); await call(page, 'setAttitudeView', 'oblique'); await agrees(page); expect((await resources(page)).ids).toEqual(ids);
  const freeViewButton = page.locator('[data-attitude-view="free"]');
  const cameraChange = await call(page, 'getState'); await page.locator('[data-birdlab-3d-canvas]').focus(); await page.keyboard.press('ArrowRight'); await step(page); expect((await call(page, 'getState')).attitudeStudy.view).toBe('free'); frozen(cameraChange, await call(page, 'getState'));
  await expect(freeViewButton).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-attitude-view="oblique"]')).toHaveAttribute('aria-pressed', 'false');
  await call(page, 'setAttitudeView', 'above'); const beforeWheel = await call(page, 'getState'); await page.locator('[data-birdlab-3d-canvas]').hover(); await page.mouse.wheel(0, 100); await step(page); expect((await call(page, 'getState')).attitudeStudy.view).toBe('free'); frozen(beforeWheel, await call(page, 'getState'));
  await expect(freeViewButton).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-attitude-view="above"]')).toHaveAttribute('aria-pressed', 'false');
  await call(page, 'setAttitudeView', 'oblique'); const beforeDrag = await call(page, 'getState'); expect(beforeDrag.paused).toBe(true);
  const dragCanvas = page.locator('[data-birdlab-3d-canvas]'); await dragCanvas.scrollIntoViewIfNeeded(); const dragBox = (await dragCanvas.boundingBox())!;
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2); await page.mouse.down(); await page.mouse.move(dragBox.x + dragBox.width / 2 + 35, dragBox.y + dragBox.height / 2 + 12, { steps: 3 }); await page.mouse.up(); await step(page);
  const afterDrag = await call(page, 'getState'); expect(afterDrag.attitudeStudy.view).toBe('free'); frozen(beforeDrag, afterDrag);
  await expect(freeViewButton).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-attitude-view="oblique"]')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => {
    const root = (window as any).round13Attitude.scene.getObjectByName('birdlab-attitude-guide'), values = new Set<any>();
    root.traverse((object: any) => { if (object.geometry) values.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material: any) => values.add(material)); });
    (window as any).round13AttitudeReleased = [...values].map(value => { const record = { uuid: value.uuid, count: 0 }; value.addEventListener('dispose', () => record.count++); return record; });
  });
  await harness.unmount(page);
  const released = await page.evaluate(() => (window as any).round13AttitudeReleased); expect(released).toHaveLength(9); expect(released.every((value: any) => value.count === 1), 'four geometries and five materials released exactly once').toBe(true);
});

test('attitude controls, fixed cameras and native plots stay keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const toggle = page.locator('[data-birdlab-attitude-toggle]'); await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await call(page, 'seek', 24.625);
    for (const view of ['x', 'above']) {
      const button = page.locator('[data-attitude-view="' + view + '"]'); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toHaveAttribute('aria-pressed', 'true'); await agrees(page);
    }
    const slider = page.locator('#birdlab-3d-timeline'); await slider.focus(); await page.keyboard.press('ArrowRight'); expect((await call(page, 'getState')).paused).toBe(true); await agrees(page);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-attitude-study]', '[data-attitude-plane="plan"]', '[data-attitude-plane="side"]', '[data-attitude-view="oblique"]', '[data-attitude-view="above"]', '[data-birdlab-attitude-toggle]']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0);
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const plane of ['plan', 'side']) expect((await page.locator('[data-attitude-plane="' + plane + '"]').boundingBox())!.width, plane + ' readable width').toBeGreaterThan(280);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-attitude-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('[data-birdlab-attitude-study]')).toHaveCount(0);
  }
});
