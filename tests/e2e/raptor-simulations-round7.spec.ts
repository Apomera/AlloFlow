import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
// Allow a slow software-WebGL host to initialize without widening operation timeouts.
test.describe.configure({ mode: 'default', retries: 0, timeout: 300_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round7Raptor={scene,camera,renderer};if(!window.round7SkipRender)return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function command(page: Page, action: string, value?: unknown) {
  await page.locator('[data-raptor-canvas]').evaluate((canvas: any, input) => canvas._rhCommand(input.action, input.value), { action, value });
}
async function snapshot(page: Page): Promise<any> {
  return page.locator('[data-raptor-canvas]').evaluate((canvas: any) => canvas._rhSnapshot());
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => {
    const w = window as any;
    // Integrate every real simulation frame; draw the final one in a bulk batch.
    // Single-frame camera and review operations always execute a real WebGL draw.
    try {
      for (let i = 0; i < frames; i++) { w.round7SkipRender = i < frames - 1; w.round7Step(ms); }
    } finally { w.round7SkipRender = false; }
  }, { frames, ms });
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%'; wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host); await step(page);
}
async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let time = 1000, next = 1, seed = 731;
    const callbacks = new Map<number, FrameRequestCallback>();
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    performance.now = () => time;
    window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { callbacks.delete(id); };
    (window as any).round7Step = (ms: number) => { time += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
    const prototype = CanvasRenderingContext2D.prototype as any;
    for (const name of ['clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc']) {
      const original = prototype[name];
      prototype[name] = function (...args: any[]) {
        if (this.canvas.hasAttribute('data-flight-path-profile')) {
          const state = ((window as any).round7Profile ||= { paths: [], arcs: [] });
          if (name === 'clearRect') { state.paths = []; state.arcs = []; }
          if (name === 'beginPath') this.round7Path = [];
          if (name === 'moveTo' || name === 'lineTo') (this.round7Path ||= []).push(args.slice(0, 2));
          if (name === 'stroke') state.paths.push((this.round7Path || []).slice());
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
  await command(page, 'environment', { windSpeed: 5, windDir: Math.PI / 2 }); await step(page, 6);
}
function frozen(before: any, after: any) {
  for (const key of ['motionTimeMs', 'calories', 'stamina', 'missionCatches', 'practiceTrailScore', 'practiceTrailBestScore', 'raptorPosition', 'motionTrack', 'motionVectors']) expect(after[key], key).toEqual(before[key]);
}
async function drawing(page: Page) {
  return page.evaluate(() => {
    const w = window as any, { scene, camera, renderer } = w.round7Raptor;
    const root = scene.getObjectByName('raptor-flight-path-review'), line = root.getObjectByName('raptor-flight-path-line');
    const marker = root.getObjectByName('raptor-flight-path-marker'), tether = root.getObjectByName('raptor-flight-path-height');
    root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const positions = line.geometry.attributes.position, count = Math.min(positions.count, line.geometry.drawRange.count);
    const points = [], projected = [];
    for (let i = 0; i < count; i++) {
      const point = new w.THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(line.matrixWorld);
      points.push(point.toArray()); projected.push(point.clone().project(camera).toArray());
    }
    const strokes = ['raptor-flight-path-outline', 'raptor-flight-path-stroke'].map(name => {
      const mesh = root.getObjectByName(name), matrix = new w.THREE.Matrix4();
      mesh.geometry.computeBoundingBox();
      const segments = [];
      for (let index = 0; index < mesh.count; index++) {
        mesh.getMatrixAt(index, matrix);
        segments.push([mesh.geometry.boundingBox.min.y, mesh.geometry.boundingBox.max.y].map(y =>
          new w.THREE.Vector3(0, y, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld).toArray()));
      }
      const color = mesh.instanceColor;
      const colors = color ? Array.from({ length: mesh.count }, (_, index) => [color.getX(index), color.getY(index), color.getZ(index)]) : [];
      return { name, visible: mesh.visible, opacity: mesh.material.opacity, segments, colorCapacity: color?.count || 0, colors };
    });
    return { visible: root.visible, points, projected, marker: new w.THREE.Vector3().setFromMatrixPosition(marker.matrixWorld).toArray(),
      tether: [...tether.geometry.attributes.position.array], strokes, calls: renderer.info.render.calls,
      live: !renderer.getContext().isContextLost(), ownsCanvas: renderer.domElement === document.querySelector('[data-raptor-canvas]'),
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
function numericCheck(actual: number, expected: number, precision: number, label: string, errors: string[]) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) >= .5 * 10 ** -precision) {
    errors.push(`${label}: expected ${expected}, received ${actual}`);
  }
}
function routeAgrees(geometry: any, history: any[]) {
  expect(geometry.points).toHaveLength(history.length);
  const errors: string[] = [];
  for (let point = 0; point < history.length; point++) for (const [axis, coordinate] of ['x', 'y', 'z'].entries()) {
    numericCheck(geometry.points[point][axis], history[point][coordinate], 3, `route point ${point}, ${coordinate}`, errors);
  }
  expect(errors, 'every actual route vertex agrees with its recorded position').toEqual([]);
}
function strokesAgree(geometry: any, history: any[]) {
  const errors: string[] = [];
  for (const stroke of geometry.strokes) {
    expect(stroke.visible, stroke.name).toBe(true); expect(stroke.opacity, stroke.name).toBeGreaterThan(0);
    expect(stroke.segments, stroke.name).toHaveLength(history.length - 1);
    for (let segment = 0; segment < stroke.segments.length; segment++) for (const end of [0, 1]) {
      for (const [axis, coordinate] of ['x', 'y', 'z'].entries()) {
        numericCheck(stroke.segments[segment][end][axis], history[segment + end][coordinate], 3, `${stroke.name}, segment ${segment}, end ${end}, ${coordinate}`, errors);
      }
    }
    if (stroke.name === 'raptor-flight-path-stroke') {
      expect(stroke.colorCapacity, 'a later, longer review must have room for all 120 colored segments').toBeGreaterThanOrEqual(120);
      expect(stroke.colors).toHaveLength(history.length - 1);
      for (let segment = 0; segment < stroke.colors.length; segment++) {
        const share = (segment + .5) / stroke.colors.length;
        const expected = [.96 - .47 * share, .80 + .09 * share, .48 + .38 * share];
        for (let channel = 0; channel < 3; channel++) {
          numericCheck(stroke.colors[segment][channel], expected[channel], 6, `segment ${segment}, color channel ${channel}`, errors);
        }
      }
    }
  }
  expect(errors, 'all visible stroke endpoints and finite gradient colors agree').toEqual([]);
}
async function profileAgrees(page: Page, history: any[], index: number, metric: string) {
  const paths = await page.evaluate(() => (window as any).round7Profile);
  const trace = paths.paths.find((path: number[][]) => path.length === history.length);
  expect(trace, 'the actual Canvas2D trace contains every recorded sample').toBeDefined();
  const first = history[0].t, duration = Math.max(1, history.at(-1).t - first);
  const top = Math.max(10, Math.ceil(Math.max(...history.map(point => point[metric])) / 10) * 10);
  const errors: string[] = [];
  for (let i = 0; i < history.length; i++) {
    numericCheck(trace[i][0], 46 + (history[i].t - first) / duration * 458, 6, `profile sample ${i}, time`, errors);
    numericCheck(trace[i][1], 166 - history[i][metric] / top * 142, 6, `profile sample ${i}, ${metric}`, errors);
  }
  expect(errors, 'every native Canvas2D profile point agrees with its recorded sample').toEqual([]);
  expect(paths.arcs.some((arc: number[]) => Math.hypot(arc[0] - trace[index][0], arc[1] - trace[index][1]) < .001), 'selected marker must be painted on the selected sample').toBe(true);
}
async function cameraState(page: Page) {
  return page.evaluate(() => {
    const camera = (window as any).round7Raptor.camera;
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), up: camera.up.toArray(), fov: camera.fov, far: camera.far };
  });
}

test('flight-path review renders recorded live positions and keeps inspection separate from the frozen flight', async ({ page }) => {
  await mount(page);
  const records = await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => {
    const frames = [canvas._rhSnapshot()];
    const w = window as any;
    try {
      for (let i = 0; i < 80; i++) { w.round7SkipRender = i < 79; w.round7Step([17, 35, 50, 23][i % 4]); frames.push(canvas._rhSnapshot()); }
    } finally { w.round7SkipRender = false; }
    return frames.map(frame => ({ t: frame.motionTimeMs, position: frame.raptorPosition }));
  });
  const live = await snapshot(page), cameraBefore = await cameraState(page);
  await page.getByRole('button', { name: 'Inspect flight path', exact: true }).click(); await step(page);
  const captured = await snapshot(page), history = captured.flightPathSamples;
  expect(captured.flightPathActive).toBe(true); frozen(live, captured);
  expect(history.length).toBeGreaterThan(5); expect(history.length).toBeLessThanOrEqual(121);
  expect(history.at(-1).t - history[0].t).toBeLessThanOrEqual(24_000);
  for (const point of history.filter((point: any) => point.t >= records[0].t)) {
    const actual = records.find(frame => Math.abs(frame.t - point.t) < 1e-6);
    expect(actual, `recorded sample ${point.t} must come from a real frame`).toBeDefined();
    for (const axis of ['x', 'y', 'z']) expect(point[axis]).toBeCloseTo(actual!.position[axis], 7);
  }
  for (const index of [0, Math.floor(history.length / 2), history.length - 1]) {
    await command(page, 'pathSample', index); await step(page);
    const state = await snapshot(page), geometry = await drawing(page), selected = history[index];
    expect(state.flightPathIndex).toBe(index); expect(state.flightPathSample).toEqual(selected); frozen(captured, state);
    expect(geometry.visible).toBe(true); expect(geometry.live).toBe(true); expect(geometry.ownsCanvas).toBe(true); expect(geometry.shaders).toBe(true); expect(geometry.calls).toBeGreaterThan(0);
    routeAgrees(geometry, history);
    strokesAgree(geometry, history);
    for (const [axis, coordinate] of ['x', 'y', 'z'].entries()) expect(geometry.marker[axis]).toBeCloseTo(selected[coordinate], 5);
    for (const [axis, coordinate] of ['x', 'y', 'z'].entries()) expect(geometry.tether[axis]).toBeCloseTo(selected[coordinate], 3);
    expect(geometry.tether[3]).toBeCloseTo(selected.x, 3); expect(geometry.tether[5]).toBeCloseTo(selected.z, 3);
    expect(Math.abs(geometry.tether[4] - geometry.tether[1])).toBeCloseTo(selected.height, 3);
    await profileAgrees(page, history, index, 'height');
    await step(page, 1, 60_000); frozen(captured, await snapshot(page));
  }
  await command(page, 'pathClose');
  const closed = await snapshot(page); expect(closed.flightPathActive).toBe(false); frozen(captured, closed);
  expect(closed.cameraMode).toBe(live.cameraMode);
  expect(await cameraState(page)).toEqual(cameraBefore);
  await step(page, 3); frozen(captured, await snapshot(page));
  await command(page, 'pause'); await step(page, 4);
  expect((await snapshot(page)).motionTimeMs).toBeGreaterThan(captured.motionTimeMs);
  await step(page, 60, 50);
  const extendedFlight = await snapshot(page);
  await page.getByRole('button', { name: 'Inspect flight path', exact: true }).click(); await step(page);
  const reopened = await snapshot(page), extendedHistory = reopened.flightPathSamples;
  expect(extendedHistory.length, 'second review includes newly recorded flight').toBeGreaterThan(history.length);
  expect(extendedHistory.length).toBeLessThanOrEqual(121); frozen(extendedFlight, reopened);
  const extendedGeometry = await drawing(page);
  routeAgrees(extendedGeometry, extendedHistory);
  strokesAgree(extendedGeometry, extendedHistory);
  await profileAgrees(page, extendedHistory, extendedHistory.length - 1, 'height');
  expect(extendedGeometry.live).toBe(true); expect(extendedGeometry.shaders).toBe(true); expect(extendedGeometry.calls).toBeGreaterThan(0);
  await command(page, 'pathClose'); frozen(extendedFlight, await snapshot(page));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('recorded-flight controls and fitted camera remain usable by keyboard in desktop, phone and embedded views', async ({ page }) => {
  await mount(page); await step(page, 70, 40);
  const toggle = page.getByRole('button', { name: 'Inspect flight path', exact: true });
  await toggle.focus(); await page.keyboard.press('Enter'); await step(page);
  const captured = await snapshot(page), panel = page.locator('[data-raptor-flight-path]'), slider = page.locator('[data-flight-path-sample]');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused(); await step(page);
    expect((await snapshot(page)).flightPathIndex).toBe(0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused(); await step(page);
    expect((await snapshot(page)).flightPathIndex).toBe(1);
    await page.keyboard.press('End'); await step(page);
    expect((await snapshot(page)).flightPathIndex).toBe(captured.flightPathSamples.length - 1);
    for (const view of ['oblique', 'top', 'side']) {
      await command(page, 'pathView', view); await step(page);
      const outside = (await drawing(page)).projected.map((point: number[], index: number) => ({ index, point })).filter(({ point }: { point: number[] }) =>
        point.some(value => !Number.isFinite(value)) || Math.abs(point[0]) >= .98 || Math.abs(point[1]) >= .98 || Math.abs(point[2]) >= 1);
      expect(outside, `${view}, ${layout.host}px: every actual route point stays inside the same camera bounds`).toEqual([]);
    }
    await page.locator('[data-flight-path-metric]').selectOption('speed'); await step(page);
    expect((await snapshot(page)).flightPathMetric).toBe('speed');
    await profileAgrees(page, captured.flightPathSamples, captured.flightPathSamples.length - 1, 'speed');
    await page.locator('[data-flight-path-metric]').selectOption('height'); await step(page);
    const host = await page.locator('#wrap').boundingBox();
    for (const [name, target] of [['panel', panel], ['profile', page.locator('[data-flight-path-profile]')], ['slider', slider]] as const) {
      const box = await target.boundingBox(), context = `${name} at viewport${layout.viewport}/host${layout.host}`;
      expect(box!.x, context).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, context).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await target.evaluate(element => element.scrollWidth - element.clientWidth), context).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-flight-path]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]); frozen(captured, await snapshot(page));
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
