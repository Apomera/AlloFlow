import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round11Raptor={scene,camera,renderer};if(!window.round11SkipRender)return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function command(page: Page, action: string, value?: unknown) {
  await page.locator('[data-raptor-canvas]').evaluate((canvas: any, input) => canvas._rhCommand(input.action, input.value), { action, value });
}
async function snapshot(page: Page): Promise<any> {
  return page.locator('[data-raptor-canvas]').evaluate((canvas: any) => canvas._rhSnapshot());
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => {
    const w = window as any;
    try { for (let index = 0; index < frames; index++) { w.round11SkipRender = index < frames - 1; w.round11Step(ms); } }
    finally { w.round11SkipRender = false; }
  }, { frames, ms });
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, host);
  await step(page);
}
async function mount(page: Page, species = 'baldEagle') {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let now = 1000, id = 0, seed = 928;
    const callbacks = new Map<number, FrameRequestCallback>();
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    performance.now = () => now;
    requestAnimationFrame = callback => { callbacks.set(++id, callback); return id; };
    cancelAnimationFrame = handle => callbacks.delete(handle);
    (window as any).round11Step = (ms: number) => { now += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(now)); };
    const prototype = CanvasRenderingContext2D.prototype as any;
    for (const name of ['clearRect', 'beginPath', 'moveTo', 'lineTo', 'arc', 'closePath', 'stroke', 'fill', 'fillRect', 'fillText']) {
      const original = prototype[name];
      prototype[name] = function (...args: any[]) {
        if (this.canvas.hasAttribute('data-flight-path-profile')) {
          const state = ((window as any).round11Profile ||= { shapes: [], fills: [], text: [], path: [] });
          if (name === 'clearRect') { state.shapes = []; state.fills = []; state.text = []; state.path = []; }
          if (name === 'beginPath') state.path = [];
          if (name === 'moveTo' || name === 'lineTo' || name === 'arc' || name === 'closePath') state.path.push([name, ...args]);
          if (name === 'fill' || name === 'stroke') state.shapes.push({ kind: name, points: state.path.map((point: any[]) => point.slice()), style: String(name === 'stroke' ? this.strokeStyle : this.fillStyle), alpha: this.globalAlpha });
          if (name === 'fillRect') state.fills.push({ args: args.slice(0, 4), style: String(this.fillStyle), alpha: this.globalAlpha });
          if (name === 'fillText') state.text.push(args.slice(0, 3));
        }
        return original.apply(this, args);
      };
    }
  });
  await page.goto(`${harness.base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.raptorHunt, undefined, { polling: 100, timeout: 30_000 });
  await page.evaluate(speciesId => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = '1100px'; wrap.setAttribute('data-stem-tool-shell', 'true');
    (window as any).__mount({ raptorHunt: { activeSection: 'hunt', selectedSpecies: speciesId, activeMission: 'open',
      flightSession: { speciesId, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low' } });
  }, species);
  await page.waitForFunction(() => !!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot, undefined, { polling: 100, timeout: 30_000 });
  await command(page, 'environment', { windSpeed: 5, windDir: Math.PI / 2 }); await step(page, 25, 40);
  await command(page, 'hold', { key: 'd', pressed: true }); await step(page, 50, 40);
  await command(page, 'hold', { key: 'd', pressed: false }); await step(page, 25, 40);
}
function frozen(before: any, after: any) {
  for (const key of ['motionTimeMs', 'calories', 'stamina', 'missionCatches', 'practiceTrailScore', 'practiceTrailBestScore', 'raptorPosition', 'motionTrack', 'motionVectors', 'speedMps']) expect(after[key], key).toEqual(before[key]);
}
async function terrainDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round11Raptor;
    const root = scene.getObjectByName('raptor-flight-path-review'); root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const curtain = root.getObjectByName('raptor-flight-terrain-curtain'), ground = root.getObjectByName('raptor-flight-terrain-ground'), stroke = root.getObjectByName('raptor-flight-terrain-stroke');
    const terrain = scene.children.find((object: any) => object.isMesh && object.geometry.parameters?.width === 800 && object.geometry.parameters?.height === 800);
    terrain.updateMatrixWorld(true);
    const state = (document.querySelector('[data-raptor-canvas]') as any)._rhSnapshot(), ray = new T.Raycaster(), direction = new T.Vector3(0, -1, 0);
    const intersections = state.flightPathSamples.map((point: any) => { ray.set(new T.Vector3(point.x, 5000, point.z), direction); return ray.intersectObject(terrain, false)[0]?.point.toArray() || null; });
    const positions = (object: any) => Array.from({ length: object.geometry.drawRange.count }, (_, index) => new T.Vector3().fromBufferAttribute(object.geometry.attributes.position, index).applyMatrix4(object.matrixWorld).toArray());
    const matrix = new T.Matrix4(), segments = [];
    for (let index = 0; index < stroke.count; index++) { stroke.getMatrixAt(index, matrix); segments.push([-.5, .5].map(y => new T.Vector3(0, y, 0).applyMatrix4(matrix).applyMatrix4(stroke.matrixWorld).toArray())); }
    const vertices = positions(curtain), floor = positions(ground);
    return { rootVisible: root.visible, visible: [curtain.visible, ground.visible, stroke.visible], vertices, floor, segments, intersections,
      projected: [...vertices, ...floor].map((point: number[]) => new T.Vector3(...point).project(camera).toArray()),
      geometry: [curtain.geometry.uuid, ground.geometry.uuid, stroke.geometry.uuid], material: [curtain.material.uuid, ground.material.uuid, stroke.material.uuid],
      capacity: [curtain.geometry.attributes.position.count, ground.geometry.attributes.position.count, stroke.instanceMatrix.count],
      curtain: { opacity: curtain.material.opacity, side: curtain.material.side, depthWrite: curtain.material.depthWrite },
      groundDepthTest: ground.material.depthTest, strokeDepthTest: stroke.material.depthTest, strokeDepthWrite: stroke.material.depthWrite,
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
function samePoint(actual: number[], expected: number[], tolerance = .0006) {
  return actual.every((value, axis) => Number.isFinite(value) && Math.abs(value - expected[axis]) <= tolerance);
}
async function agrees(page: Page) {
  const state = await snapshot(page), drawing = await terrainDrawing(page), points = state.flightPathSamples, ground = state.flightPathTerrainSamples;
  expect(ground).toHaveLength(points.length); expect(points.length).toBeGreaterThan(10);
  expect(drawing.live).toBe(true); expect(drawing.calls).toBeGreaterThan(0); expect(drawing.shaders).toBe(true);
  expect(drawing.floor).toHaveLength(points.length); expect(drawing.segments).toHaveLength(points.length - 1); expect(drawing.vertices).toHaveLength((points.length - 1) * 6);
  expect(drawing.capacity).toEqual([720, 121, 120]); expect(drawing.curtain.side).toBe(2); expect(drawing.curtain.opacity).toBeGreaterThan(0); expect(drawing.curtain.opacity).toBeLessThanOrEqual(.2);
  expect(drawing.curtain.depthWrite).toBe(false); expect(drawing.groundDepthTest).toBe(true); expect(drawing.strokeDepthTest).toBe(true); expect(drawing.strokeDepthWrite).toBe(false);
  const errors: string[] = [];
  points.forEach((point: any, index: number) => {
    const value = ground[index], expected = [point.x, value.y, point.z];
    if (!drawing.intersections[index] || !samePoint(expected, drawing.intersections[index], .00001)) errors.push(`ground ${index} disagrees with the actual terrain triangles`);
    if (!samePoint(drawing.floor[index], expected)) errors.push(`ground line ${index}`);
    expect(value.x).toBe(point.x); expect(value.z).toBe(point.z); expect(value.t).toBe(point.t);
    if (index < points.length - 1) {
      const next = points[index + 1], nextGround = ground[index + 1], corners = [[point.x, point.y, point.z], expected, [next.x, next.y, next.z], [next.x, nextGround.y, next.z]];
      const quad = drawing.vertices.slice(index * 6, index * 6 + 6);
      if (quad.some((vertex: number[]) => !corners.some(corner => samePoint(vertex, corner)))) errors.push(`curtain ${index}: vertex off sampled quad`);
      if (corners.some(corner => !quad.some((vertex: number[]) => samePoint(vertex, corner)))) errors.push(`curtain ${index}: missing corner`);
      if (!samePoint(drawing.segments[index][0], expected) || !samePoint(drawing.segments[index][1], corners[3])) errors.push(`ground stroke ${index}`);
    }
  });
  expect(errors).toEqual([]);
  const profile = await page.evaluate(() => (window as any).round11Profile), values = points.flatMap((point: any, index: number) => [point.y, ground[index].y]);
  const min = Math.floor(Math.min(0, ...values) / 10) * 10, max = Math.ceil(Math.max(10, ...values) / 10) * 10;
  const start = points[0].t, duration = Math.max(1, points.at(-1).t - start);
  const x = (point: any) => 46 + (point.t - start) / duration * 458, y = (height: number) => 166 - (height - min) / (max - min) * 142;
  const containsPath = (shape: any, expected: number[][]) => {
    const native = shape.points.filter((point: any[]) => point[0] === 'moveTo' || point[0] === 'lineTo').map((point: any[]) => point.slice(1, 3));
    return native.some((_: any, offset: number) => expected.every((point, index) => native[offset + index] && samePoint(native[offset + index], point, .00001)));
  };
  expect(profile.shapes.some((shape: any) => shape.kind === 'fill' && containsPath(shape, ground.map((point: any) => [x(point), y(point.y)]))), 'native terrain fill follows every sampled mesh height').toBe(true);
  expect(profile.shapes.some((shape: any) => shape.kind === 'stroke' && containsPath(shape, points.map((point: any) => [x(point), y(point.y)]))), 'native flight profile uses world height with the shared domain').toBe(true);
  const selected = points[state.flightPathIndex], selectedGround = ground[state.flightPathIndex], sx = x(selected);
  expect(profile.shapes.some((shape: any) => shape.kind === 'stroke' && (containsPath(shape, [[sx, y(selected.y)], [sx, y(selectedGround.y)]]) || containsPath(shape, [[sx, y(selectedGround.y)], [sx, y(selected.y)]]))), 'native selected clearance column joins flight and terrain').toBe(true);
  for (const expectedY of [y(selected.y), y(selectedGround.y)]) expect(profile.shapes.some((shape: any) => shape.points.some((point: any[]) => point[0] === 'arc' && Math.hypot(point[1] - sx, point[2] - expectedY) < .00001)), 'native selected endpoint').toBe(true);
  const readings = await page.locator('[data-terrain-value]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [(node as HTMLElement).dataset.terrainValue, node.textContent])));
  for (const [name, expected] of Object.entries({ bird: selected.y, ground: selectedGround.y, clearance: selected.y - selectedGround.y })) {
    const number = Number(String(readings[name]).replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/)?.[0]);
    expect(Math.abs(number - expected), `${name} agrees to displayed precision`).toBeLessThanOrEqual(.051);
  }
  return { state, drawing, min, max };
}

test('terrain curtain and world-height profile match rendered triangles without moving the paused flight', async ({ page }) => {
  await mount(page); const live = await snapshot(page);
  await command(page, 'flightPath'); await step(page); const captured = await snapshot(page); frozen(live, captured);
  expect(captured.flightPathTerrainEnabled).toBe(false); expect(captured.flightPathTerrainVisible).toBe(false);
  await command(page, 'pathMetric', 'terrain'); await command(page, 'pathTerrain', true); await step(page);
  const first = await agrees(page); expect(first.min, 'lake-basin terrain below world zero remains in the profile').toBeLessThan(0);
  expect(first.drawing.visible).toEqual([true, true, true]); expect(first.state.flightPathTerrainVisible).toBe(true);
  const points = captured.flightPathSamples, middle = Math.floor(points.length / 2);
  await command(page, 'pathSample', middle); await command(page, 'pathPin');
  for (const selected of [0, points.length - 1, middle]) {
    await command(page, 'pathSample', selected); await step(page); const review = await agrees(page);
    expect(review.drawing.geometry).toEqual(first.drawing.geometry); expect(review.drawing.material).toEqual(first.drawing.material); frozen(captured, review.state);
    expect(review.state.flightPathAnchorIndex).toBe(middle);
  }
  const expectedLowest = points.reduce((best: number, point: any, index: number) => point.y - first.state.flightPathTerrainSamples[index].y < points[best].y - first.state.flightPathTerrainSamples[best].y ? index : best, 0);
  await page.locator('[data-flight-path-lowest]').click(); await step(page);
  expect((await snapshot(page)).flightPathIndex).toBe(expectedLowest); expect((await snapshot(page)).flightPathAnchorIndex).toBe(middle); await agrees(page);
  await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => { const state = canvas._rhSnapshot(); state.flightPathTerrainSamples[0].y = 999999; state.flightPathTerrainSamples.push({ x: 0, y: 0, z: 0, t: 0 }); });
  expect((await snapshot(page)).flightPathTerrainSamples).toEqual(first.state.flightPathTerrainSamples);
  await command(page, 'pathTerrain', false); await step(page);
  expect((await snapshot(page)).flightPathTerrainVisible).toBe(false); expect((await terrainDrawing(page)).visible).toEqual([false, false, false]);
  await expect(page.locator('[data-flight-path-terrain-key]')).toBeVisible();
  await command(page, 'pathMetric', 'speed'); await expect(page.locator('[data-flight-path-terrain-key]')).toBeHidden();
  await command(page, 'pathTerrain', true); await expect(page.locator('[data-flight-path-terrain-key]')).toBeVisible();
  await step(page, 1, 60_000); frozen(captured, await snapshot(page));
  await command(page, 'pathClose'); await step(page);
  const closed = await snapshot(page); frozen(captured, closed); expect(closed.flightPathTerrainSamples).toEqual([]); expect(closed.flightPathTerrainVisible).toBe(false); expect((await terrainDrawing(page)).rootVisible).toBe(false);
  await command(page, 'pause'); await step(page, 30, 40); const extended = await snapshot(page); expect(extended.motionTimeMs).toBeGreaterThan(captured.motionTimeMs);
  await command(page, 'flightPath'); await command(page, 'pathMetric', 'terrain'); await step(page);
  const reopened = await snapshot(page); frozen(extended, reopened); expect(reopened.flightPathTerrainEnabled).toBe(false); expect(reopened.flightPathTerrainSamples.length).toBeGreaterThan(points.length);
  await command(page, 'pathTerrain', true); await step(page); const rechecked = await agrees(page); expect(rechecked.drawing.geometry).toEqual(first.drawing.geometry);
  await page.evaluate(() => {
    const w = window as any, root = w.round11Raptor.scene.getObjectByName('raptor-flight-path-review'), resources = new Set<any>();
    for (const name of ['raptor-flight-terrain-curtain', 'raptor-flight-terrain-ground', 'raptor-flight-terrain-stroke']) { const object = root.getObjectByName(name); resources.add(object.geometry); resources.add(object.material); }
    w.round11Released = [...resources].map(resource => { const value = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => value.count++); return value; });
  });
  await harness.unmount(page);
  const released = await page.evaluate(() => (window as any).round11Released); expect(released).toHaveLength(6); expect(released.every((value: any) => value.count === 1), 'all new resources released once').toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('terrain study remains framed and keyboard accessible at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page, 'redTail'); await command(page, 'flightPath'); await command(page, 'pathMetric', 'terrain'); await step(page);
  const captured = await snapshot(page), toggle = page.locator('[data-flight-path-terrain-toggle]'), lowest = page.locator('[data-flight-path-lowest]'), slider = page.locator('[data-flight-path-sample]');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await toggle.focus(); await page.keyboard.press('Space'); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused(); expect((await snapshot(page)).flightPathIndex).toBe(1);
    await lowest.focus(); await page.keyboard.press('Enter'); await expect(lowest).toBeFocused();
    await page.locator('[data-flight-path-pin]').click(); await slider.focus(); await page.keyboard.press('End'); await step(page);
    for (const view of ['oblique', 'top', 'side']) {
      await command(page, 'pathView', view); await step(page); const review = await agrees(page);
      expect(review.drawing.projected.filter((point: number[]) => point.some(value => !Number.isFinite(value)) || Math.abs(point[0]) >= .98 || Math.abs(point[1]) >= .98 || Math.abs(point[2]) >= 1), `${view} at host ${layout.host}: every curtain endpoint stays framed`).toEqual([]);
      frozen(captured, review.state);
    }
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-flight-path]', '[data-flight-path-profile]', '[data-flight-path-terrain-key]', '[data-flight-path-terrain-toggle]', '[data-flight-path-lowest]', '[data-flight-path-metric]', '[data-flight-path-sample]']) {
      const control = page.locator(selector), box = (await control.boundingBox())!; expect(box, selector).not.toBeNull();
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await control.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-raptor-flight-path]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })); });
    expect(violations).toEqual([]); frozen(captured, await snapshot(page));
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  }
  await slider.focus(); await page.keyboard.press('Escape'); expect((await snapshot(page)).flightPathActive).toBe(false); frozen(captured, await snapshot(page));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
