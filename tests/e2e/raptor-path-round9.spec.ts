import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round9Raptor={scene,camera,renderer};if(!window.round9SkipRender)return render(scene,camera);};return renderer;};})();`,
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
    // Every simulation frame integrates normally; bulk setup draws its final frame.
    try { for (let i = 0; i < frames; i++) { w.round9SkipRender = i < frames - 1; w.round9Step(ms); } }
    finally { w.round9SkipRender = false; }
  }, { frames, ms });
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host); await step(page);
}
async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let time = 1000, next = 1, seed = 928;
    const callbacks = new Map<number, FrameRequestCallback>();
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    performance.now = () => time;
    window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { callbacks.delete(id); };
    (window as any).round9Step = (ms: number) => { time += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
    const prototype = CanvasRenderingContext2D.prototype as any;
    for (const name of ['clearRect', 'fillRect', 'arc']) {
      const original = prototype[name];
      prototype[name] = function (...args: any[]) {
        if (this.canvas.hasAttribute('data-flight-path-profile')) {
          const state = ((window as any).round9Profile ||= { fills: [], arcs: [] });
          if (name === 'clearRect') { state.fills = []; state.arcs = []; }
          if (name === 'fillRect') state.fills.push({ args: args.slice(0, 4), style: this.fillStyle, alpha: this.globalAlpha });
          if (name === 'arc') state.arcs.push(args.slice(0, 3));
        }
        return original.apply(this, args);
      };
    }
  });
  await page.goto(`${harness.base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.raptorHunt, undefined, { polling: 100, timeout: 30_000 });
  await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = '1100px'; wrap.setAttribute('data-stem-tool-shell', 'true');
    (window as any).__mount({ raptorHunt: { activeSection: 'hunt', selectedSpecies: 'redTail', activeMission: 'open',
      flightSession: { speciesId: 'redTail', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low' } });
  });
  await page.waitForFunction(() => !!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot, undefined, { polling: 100, timeout: 30_000 });
  await command(page, 'environment', { windSpeed: 5, windDir: Math.PI / 2 }); await step(page, 25, 40);
  await command(page, 'hold', { key: 'd', pressed: true }); await step(page, 50, 40);
  await command(page, 'hold', { key: 'd', pressed: false }); await step(page, 25, 40);
}
function frozen(before: any, after: any) {
  for (const key of ['motionTimeMs', 'calories', 'stamina', 'missionCatches', 'practiceTrailScore', 'practiceTrailBestScore', 'raptorPosition', 'motionTrack', 'motionVectors']) expect(after[key], key).toEqual(before[key]);
}
function expectedComparison(points: any[], a: number, b: number) {
  const first = points[a], last = points[b]; let distance = 0;
  for (let i = Math.min(a, b); i < Math.max(a, b); i++) {
    distance += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y, points[i + 1].z - points[i].z);
  }
  return { elapsed: Math.abs(last.t - first.t) / 1000, distance, displacement: Math.hypot(last.x - first.x, last.z - first.z),
    altitudeChange: last.y - first.y, clearanceChange: last.height - first.height, airspeedChange: last.speed - first.speed };
}
async function drawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round9Raptor;
    const root = scene.getObjectByName('raptor-flight-path-review'); root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const interval = root.getObjectByName('raptor-flight-path-interval'), anchor = root.getObjectByName('raptor-flight-path-anchor');
    const selected = root.getObjectByName('raptor-flight-path-marker'), tether = root.getObjectByName('raptor-flight-path-anchor-height');
    const matrix = new T.Matrix4(), segments = [], projected = [];
    for (let i = 0; i < interval.count; i++) {
      interval.getMatrixAt(i, matrix);
      const pair = [-.5, .5].map(y => new T.Vector3(0, y, 0).applyMatrix4(matrix).applyMatrix4(interval.matrixWorld));
      segments.push(pair.map(point => point.toArray())); projected.push(...pair.map(point => point.clone().project(camera).toArray()));
    }
    const at = (object: any) => object.getWorldPosition(new T.Vector3()).toArray();
    return { rootVisible: root.visible, intervalVisible: interval.visible, anchorVisible: anchor.visible,
      segments, projected, anchor: at(anchor), selected: at(selected), anchorGeometry: anchor.geometry.uuid,
      tetherVisible: tether.visible, tether: [...tether.geometry.attributes.position.array], tetherDistance: [...tether.geometry.attributes.lineDistance.array],
      intervalGeometry: interval.geometry.uuid, intervalMaterial: interval.material.uuid, capacity: interval.instanceMatrix.count,
      opacity: interval.material.opacity, live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
async function comparisonAgrees(page: Page, points: any[], a: number, b: number, metric = 'height') {
  const state = await snapshot(page), expected = expectedComparison(points, a, b), geometry = await drawing(page);
  expect(state.flightPathAnchorIndex).toBe(a); expect(state.flightPathIndex).toBe(b);
  for (const [key, value] of Object.entries(expected)) expect(state.flightPathComparison[key], key).toBeCloseTo(value, 6);
  expect(geometry.rootVisible).toBe(true); expect(geometry.anchorVisible).toBe(true);
  expect(geometry.live).toBe(true); expect(geometry.shaders).toBe(true); expect(geometry.calls).toBeGreaterThan(0);
  expect(geometry.segments).toHaveLength(Math.abs(b - a)); expect(geometry.capacity).toBeGreaterThanOrEqual(120);
  if (a !== b) { expect(geometry.intervalVisible).toBe(true); expect(geometry.opacity).toBeGreaterThan(0); }
  const errors: string[] = [];
  const agrees = (actual: number, expectedValue: number, label: string, tolerance = .0005) => {
    if (!Number.isFinite(actual) || Math.abs(actual - expectedValue) > tolerance) errors.push(`${label}: ${actual} vs ${expectedValue}`);
  };
  for (let segment = 0; segment < geometry.segments.length; segment++) for (const end of [0, 1]) {
    for (const [axis, key] of ['x', 'y', 'z'].entries()) agrees(geometry.segments[segment][end][axis], points[Math.min(a, b) + segment + end][key], `segment${segment}/end${end}/${key}`);
  }
  for (const [axis, key] of ['x', 'y', 'z'].entries()) {
    agrees(geometry.anchor[axis], points[a][key], `anchor/${key}`, 1e-6); agrees(geometry.selected[axis], points[b][key], `selection/${key}`, 1e-6);
    agrees(geometry.tether[axis], points[a][key], `anchor tether/${key}`);
  }
  expect(geometry.tetherVisible).toBe(true);
  agrees(geometry.tether[3], points[a].x, 'anchor terrain x'); agrees(geometry.tether[4], points[a].y - points[a].height, 'anchor terrain y'); agrees(geometry.tether[5], points[a].z, 'anchor terrain z');
  agrees(geometry.tetherDistance[0], 0, 'tether dash start'); agrees(geometry.tetherDistance[1], points[a].height, 'tether dash end');
  expect(errors, 'the rendered interval and both markers agree with recorded positions').toEqual([]);
  const readings = await page.locator('[data-path-comparison-value]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [(node as HTMLElement).dataset.pathComparisonValue, node.textContent])));
  for (const [name, key] of Object.entries({ elapsed: 'elapsed', distance: 'distance', displacement: 'displacement', altitude: 'altitudeChange', clearance: 'clearanceChange', speed: 'airspeedChange' })) {
    const value = Number(String(readings[name]).replace(/−/g, '-').match(/[+-]?\d+(?:\.\d+)?/)?.[0]);
    expect(Number.isFinite(value), `${name} reading is numeric`).toBe(true);
    expect(Math.abs(value - expected[key as keyof typeof expected]), `${name} agrees to displayed precision`).toBeLessThanOrEqual(.051);
  }
  const profile = await page.evaluate(() => (window as any).round9Profile), start = points[0].t, duration = Math.max(1, points.at(-1).t - start);
  const x = (index: number) => 46 + (points[index].t - start) / duration * 458;
  const top = Math.max(10, Math.ceil(Math.max(...points.map(point => point[metric])) / 10) * 10);
  for (const index of [a, b]) {
    const y = 166 - points[index][metric] / top * 142;
    expect(profile.arcs.some((arc: number[]) => Math.hypot(arc[0] - x(index), arc[1] - y) < .001), `native profile marker ${index}`).toBe(true);
  }
  if (a !== b) expect(profile.fills.some((fill: any) => Math.abs(fill.args[0] - Math.min(x(a), x(b))) < .001 && Math.abs(fill.args[2] - Math.abs(x(b) - x(a))) < .001 && fill.args[3] > 100 && fill.alpha > 0), 'native Canvas2D shading spans the same recorded times').toBe(true);
  return geometry;
}

test('pinned flight legs show exact sampled geometry and signed changes while preserving the live flight', async ({ page }) => {
  await mount(page); const live = await snapshot(page);
  await page.getByRole('button', { name: 'Inspect flight path', exact: true }).click(); await step(page);
  const captured = await snapshot(page), points = captured.flightPathSamples;
  frozen(live, captured); expect(points.length).toBeGreaterThan(10); expect(captured.flightPathAnchorIndex).toBeNull();
  const last = points.length - 1, second = Math.floor(points.length / 2);
  const whole = expectedComparison(points, 0, last);
  expect(whole.distance, 'turning flight has a longer sampled route than horizontal separation').toBeGreaterThan(whole.displacement + .1);
  let resources: any;
  for (const [a, b] of [[2, last], [last, 2], [second, second]]) {
    await command(page, 'pathSample', a); await page.locator('[data-flight-path-pin]').click();
    await command(page, 'pathSample', b); await step(page);
    const geometry = await comparisonAgrees(page, points, a, b); frozen(captured, await snapshot(page));
    if (!resources) resources = geometry;
    expect(geometry.intervalGeometry).toBe(resources.intervalGeometry); expect(geometry.intervalMaterial).toBe(resources.intervalMaterial);
    await command(page, 'pathMetric', 'speed'); await step(page); await comparisonAgrees(page, points, a, b, 'speed');
    await command(page, 'pathMetric', 'height'); await step(page);
  }
  await step(page, 1, 60_000); frozen(captured, await snapshot(page));
  await page.locator('[data-flight-path-clear]').click(); await step(page);
  expect((await snapshot(page)).flightPathAnchorIndex).toBeNull(); expect((await snapshot(page)).flightPathComparison).toBeNull();
  const cleared = await drawing(page); expect(cleared.anchorVisible).toBe(false); expect(cleared.intervalVisible).toBe(false); expect(cleared.tetherVisible).toBe(false);
  await command(page, 'pathPin'); await command(page, 'pathClose'); await step(page);
  expect((await drawing(page)).rootVisible).toBe(false); frozen(captured, await snapshot(page));
  await command(page, 'pause'); await step(page, 50, 40);
  const extended = await snapshot(page); expect(extended.motionTimeMs).toBeGreaterThan(captured.motionTimeMs);
  await command(page, 'flightPath'); await step(page);
  const reopened = await snapshot(page); expect(reopened.flightPathAnchorIndex).toBeNull(); expect(reopened.flightPathComparison).toBeNull();
  expect(reopened.flightPathSamples.length).toBeGreaterThan(points.length); frozen(extended, reopened);
  await command(page, 'pathSample', 0); await command(page, 'pathPin'); await command(page, 'pathSample', reopened.flightPathSamples.length - 1); await step(page);
  const finalGeometry = await comparisonAgrees(page, reopened.flightPathSamples, 0, reopened.flightPathSamples.length - 1);
  expect(finalGeometry.intervalGeometry).toBe(resources.intervalGeometry); expect(finalGeometry.anchorGeometry).toBe(resources.anchorGeometry);
  await page.evaluate(() => {
    const w = window as any, root = w.round9Raptor.scene.getObjectByName('raptor-flight-path-review'), resources = new Set<any>();
    for (const name of ['raptor-flight-path-anchor', 'raptor-flight-path-interval', 'raptor-flight-path-anchor-height']) {
      const object = root.getObjectByName(name); resources.add(object.geometry); resources.add(object.material);
    }
    w.round9Released = [...resources].map(resource => { const counter = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => counter.count++); return counter; });
  });
  await harness.unmount(page);
  const released = await page.evaluate(() => (window as any).round9Released);
  expect(released.length).toBeGreaterThanOrEqual(3); expect(released.every((resource: any) => resource.count === 1), 'new geometry and materials are released once on unmount').toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('flight-leg comparison remains keyboard accessible and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page); await command(page, 'flightPath'); await step(page);
  const captured = await snapshot(page), slider = page.locator('[data-flight-path-sample]'), pin = page.locator('[data-flight-path-pin]'), clear = page.locator('[data-flight-path-clear]');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    expect((await snapshot(page)).flightPathIndex).toBe(1);
    await pin.focus(); await page.keyboard.press('Space'); await expect(pin).toBeFocused();
    expect((await snapshot(page)).flightPathAnchorIndex).toBe(1);
    await slider.focus(); await page.keyboard.press('End'); await expect(slider).toBeFocused(); await step(page);
    await expect(page.locator('[data-flight-path-comparison]')).toBeVisible();
    await comparisonAgrees(page, captured.flightPathSamples, 1, captured.flightPathSamples.length - 1);
    for (const view of ['oblique', 'top', 'side']) {
      await command(page, 'pathView', view); await step(page);
      const outside = (await drawing(page)).projected.filter((point: number[]) => point.some(value => !Number.isFinite(value)) || Math.abs(point[0]) >= .98 || Math.abs(point[1]) >= .98 || Math.abs(point[2]) >= 1);
      expect(outside, `${view} at host${layout.host}: actual highlighted endpoints stay in camera`).toEqual([]);
    }
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-raptor-flight-path]', '[data-flight-path-profile]', '[data-flight-path-comparison]', '[data-flight-path-pin]', '[data-flight-path-clear]', '[data-flight-path-sample]']) {
      const control = page.locator(selector), box = await control.boundingBox();
      expect(box, selector).not.toBeNull(); expect(box!.width, selector).toBeGreaterThan(0);
      expect(box!.x, selector).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, selector).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await control.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-raptor-flight-path]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]); frozen(captured, await snapshot(page));
    await clear.focus(); await page.keyboard.press('Enter');
    expect((await snapshot(page)).flightPathAnchorIndex).toBeNull(); frozen(captured, await snapshot(page));
    const fullRoute = page.locator('[data-flight-path-compare-all]'); await fullRoute.focus(); await page.keyboard.press('Enter'); await expect(fullRoute).toBeFocused(); await step(page);
    await comparisonAgrees(page, captured.flightPathSamples, 0, captured.flightPathSamples.length - 1); frozen(captured, await snapshot(page));
  }
  await slider.focus(); await page.keyboard.press('Escape'); expect((await snapshot(page)).flightPathActive).toBe(false); frozen(captured, await snapshot(page));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
