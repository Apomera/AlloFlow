import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round10Wingtip={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function sizing(page: Page, viewport: number, host = viewport) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d", null, { polling: 50, timeout: 60_000 });
  await page.waitForFunction('!!window.round10Wingtip', null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat');
  await expect(page.locator('[data-birdlab-wingtip-projections]')).toBeVisible();
}
function preserved(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings', 'wildlife', 'animals']) expect(after[key], key).toEqual(before[key]);
}
function projected(point: number[], plane: string, radius: number) {
  const scale = 84 / radius;
  return plane === 'front' ? [150 - point[0] * scale, 120 - point[1] * scale]
    : plane === 'side' ? [150 - point[2] * scale, 120 - point[1] * scale]
      : [150 + point[0] * scale, 120 + point[2] * scale];
}
async function nativeDrawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round10Wingtip;
    const bird = scene.getObjectByName('birdlab-red-tailed-hawk'), root = scene.getObjectByName('birdlab-wingtip-paths');
    scene.updateMatrixWorld(true);
    const actual = ['left', 'right'].map(side => {
      const vane = bird.getObjectByName(side + '-shoulder').getObjectByName('slotted-primary-0'), geometry = vane.geometry;
      const vertex = geometry.attributes.position.count - 3;
      const base = new T.Vector3().fromBufferAttribute(geometry.attributes.position, vertex), result = base.clone();
      (geometry.morphAttributes.position || []).forEach((target: any, index: number) => {
        const delta = new T.Vector3().fromBufferAttribute(target, vertex);
        if (!geometry.morphTargetsRelative) delta.sub(base);
        result.addScaledVector(delta, vane.morphTargetInfluences[index] || 0);
      });
      return bird.worldToLocal(result.applyMatrix4(vane.matrixWorld)).toArray();
    });
    const planes = ['front', 'side', 'above'].map(plane => {
      const svg = document.querySelector('[data-wingtip-plane="' + plane + '"]')!;
      return { plane, viewBox: svg.getAttribute('viewBox'), wings: ['left', 'right'].map(side => {
        const path = svg.querySelector('[data-projection-path="' + side + '"]') as SVGPathElement;
        const current = svg.querySelector('[data-projection-current="' + side + '"]') as SVGCircleElement;
        const pin = svg.querySelector('[data-projection-pin="' + side + '"]') as SVGCircleElement | null;
        const gap = svg.querySelector('[data-projection-gap="' + side + '"]') as SVGLineElement | null;
        return { path: (path.getAttribute('d')!.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number),
          length: path.getTotalLength(), stroke: getComputedStyle(path).stroke,
          current: [current.cx.baseVal.value, current.cy.baseVal.value],
          pin: pin ? [pin.cx.baseVal.value, pin.cy.baseVal.value] : null,
          gap: gap ? [gap.x1.baseVal.value, gap.y1.baseVal.value, gap.x2.baseVal.value, gap.y2.baseVal.value] : null };
      }) };
    });
    const basis = [[0, 0, 0], [.1, 0, 0], [0, .1, 0], [0, 0, .1]].map(point =>
      bird.localToWorld(new T.Vector3(...point)).project(camera).toArray());
    const frameBounds = ['left', 'right'].flatMap(side => {
      const points = root.getObjectByName('birdlab-wingtip-' + side).geometry.attributes.position;
      return Array.from({ length: points.count }, (_, index) => bird.localToWorld(new T.Vector3().fromBufferAttribute(points, index)).project(camera).toArray());
    });
    return { actual, planes, traceVisible: root.visible, basis, frameBounds,
      tracePaths: ['left', 'right'].map(side => [...root.getObjectByName('birdlab-wingtip-' + side).geometry.attributes.position.array]),
      camera: bird.worldToLocal(camera.getWorldPosition(new T.Vector3())).toArray(),
      cameraUp: camera.up.toArray(), canvasOwned: renderer.domElement === document.querySelector('[data-birdlab-3d-canvas]'),
      liveContext: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls };
  });
}
function assertProjection(state: any, drawing: any) {
  const study = state.wingtipStudy;
  expect(study).not.toBeNull(); expect(study.paths).toHaveLength(2);
  const radius = Math.max(.5, ...study.paths.flatMap((path: number[]) =>
    Array.from({ length: 65 }, (_, index) => Math.hypot(...path.slice(index * 3, index * 3 + 3))))) + .12;
  expect(study.radius).toBeCloseTo(radius, 6);
  for (let side = 0; side < 2; side++) {
    expect(study.paths[side]).toEqual(drawing.tracePaths[side]);
    expect(study.paths[side]).toHaveLength(195);
    expect(study.paths[side].every(Number.isFinite)).toBe(true);
    for (let axis = 0; axis < 3; axis++) expect(study.current[side][axis]).toBeCloseTo(drawing.actual[side][axis], 6);
  }
  for (const plane of drawing.planes) {
    expect(plane.viewBox).toBe('0 0 300 240');
    for (let side = 0; side < 2; side++) {
      const wing = plane.wings[side]; expect(wing.path).toHaveLength(130); expect(wing.length).toBeGreaterThan(1); expect(wing.stroke).not.toBe('none');
      for (let sample = 0; sample < 65; sample++) {
        const point = projected(study.paths[side].slice(sample * 3, sample * 3 + 3), plane.plane, study.radius);
        for (let axis = 0; axis < 2; axis++) expect(Math.abs(wing.path[sample * 2 + axis] - point[axis])).toBeLessThan(.03);
      }
      const current = projected(study.current[side], plane.plane, study.radius);
      for (let axis = 0; axis < 2; axis++) expect(Math.abs(wing.current[axis] - current[axis])).toBeLessThan(.03);
      if (study.pinned) {
        const pin = projected(study.pinned.points[side], plane.plane, study.radius);
        expect(wing.pin).not.toBeNull(); expect(wing.gap).not.toBeNull();
        for (let axis = 0; axis < 2; axis++) {
          expect(Math.abs(wing.pin[axis] - pin[axis])).toBeLessThan(.03);
          const ends = [wing.gap[axis], wing.gap[axis + 2]];
          expect(Math.min(Math.abs(ends[0] - pin[axis]) + Math.abs(ends[1] - current[axis]), Math.abs(ends[1] - pin[axis]) + Math.abs(ends[0] - current[axis]))).toBeLessThan(.06);
        }
      } else { expect(wing.pin).toBeNull(); expect(wing.gap).toBeNull(); }
    }
  }
}

test('orthographic wingtip views and pinned comparison match actual articulated tips and preserve the paused flight', async ({ page }) => {
  await mount(page); await call(page, 'setWingtipPaths', false);
  const initial = await call(page, 'getState'), initialDrawing = await nativeDrawing(page);
  expect(initialDrawing).toMatchObject({ traceVisible: false, canvasOwned: true, liveContext: true });
  expect(initialDrawing.calls).toBeGreaterThan(0); expect(initial.wingtipStudy.pinned).toBeNull(); assertProjection(initial, initialDrawing);
  await call(page, 'seekWingbeat', .21); const selected = await call(page, 'getState');
  await page.locator('[data-wingtip-pin]').click();
  const pinned = await call(page, 'getState'); preserved(selected, pinned);
  expect(pinned.wingtipStudy.pinned.progress).toBeCloseTo(.21, 7);
  expect(pinned.wingtipStudy.pinned.points).toEqual(pinned.wingtipStudy.current);
  await expect(page.locator('[data-wingtip-pinned-phase]')).toContainText('21');
  // Returned arrays must be snapshots: consumers cannot move the cached trace,
  // the current primary, or the frozen comparison by mutating a readout.
  await page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any) => {
    const read = canvas._birdlab3d.getState();
    read.wingtipStudy.paths[0][0] = 999; read.wingtipStudy.current[0][0] = 999; read.wingtipStudy.pinned.points[0][0] = 999;
  });
  expect((await call(page, 'getState')).wingtipStudy).toEqual(pinned.wingtipStudy);
  for (const phase of [0, .42, .71, 1]) {
    await call(page, 'seekWingbeat', phase); const state = await call(page, 'getState');
    expect(state.paused).toBe(true); expect(state.wingtipStudy.paths).toEqual(initial.wingtipStudy.paths);
    expect(state.wingtipStudy.radius).toBe(initial.wingtipStudy.radius);
    expect(state.wingtipStudy.pinned).toEqual(pinned.wingtipStudy.pinned); assertProjection(state, await nativeDrawing(page));
  }
  for (const view of ['front', 'side', 'above', 'free']) {
    const before = await call(page, 'getState'); await page.locator('[data-wingbeat-view="' + view + '"]').click();
    const after = await call(page, 'getState'); preserved(before, after); expect(after.wingbeatView).toBe(view);
    expect(after.wingtipStudy).toEqual(before.wingtipStudy);
    await expect(page.locator('[data-wingbeat-view="' + view + '"]')).toHaveAttribute('aria-pressed', 'true');
    if (view !== 'free') {
      const drawing = await nativeDrawing(page), offset = drawing.camera;
      const dominant = view === 'front' ? 2 : view === 'side' ? 0 : 1;
      expect(Math.abs(offset[dominant])).toBeGreaterThan(after.wingtipStudy.radius * 1.5);
      for (let axis = 0; axis < 3; axis++) if (axis !== dominant) expect(Math.abs(offset[axis])).toBeLessThan(.03);
      expect(Math.sign(offset[dominant])).toBe(view === 'front' ? -1 : 1);
      for (const point of drawing.frameBounds) {
        expect(Math.abs(point[0])).toBeLessThan(1); expect(Math.abs(point[1])).toBeLessThan(1);
        expect(point[2]).toBeGreaterThan(-1); expect(point[2]).toBeLessThan(1);
      }
      const [origin, x, y, z] = drawing.basis;
      if (view === 'front') { expect(x[0]).toBeLessThan(origin[0]); expect(y[1]).toBeGreaterThan(origin[1]); }
      if (view === 'side') { expect(z[0]).toBeLessThan(origin[0]); expect(y[1]).toBeGreaterThan(origin[1]); }
      if (view === 'above') { expect(x[0]).toBeGreaterThan(origin[0]); expect(z[1]).toBeLessThan(origin[1]); }
    }
  }
  const still = await call(page, 'getState'); await page.waitForTimeout(120); preserved(still, await call(page, 'getState'));
  await page.locator('[data-wingtip-clear]').click(); const cleared = await call(page, 'getState'); preserved(still, cleared);
  expect(cleared.wingtipStudy.pinned).toBeNull(); assertProjection(cleared, await nativeDrawing(page));
  for (const [method, value] of [['closeWingbeat', undefined], ['setPaused', false], ['seek', 14], ['restart', undefined], ['setCamera', 'chickadee'], ['setMode', 'free']] as const) {
    await call(page, 'setMode', 'guided'); await call(page, 'setCamera', 'orbit'); await call(page, 'setPaused', true);
    await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); await call(page, 'pinWingtipPose');
    expect((await call(page, 'getState')).wingtipStudy.pinned).not.toBeNull();
    await call(page, method, value); const exited = await call(page, 'getState');
    expect(exited.wingbeatStudy, method).toBeNull(); expect(exited.wingtipStudy, method).toBeNull();
    await expect(page.locator('[data-birdlab-wingtip-projections]')).toHaveCount(0);
  }
  await call(page, 'setMode', 'guided'); await call(page, 'setCamera', 'orbit'); await call(page, 'setPaused', true);
  await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); expect((await call(page, 'getState')).wingtipStudy.pinned).toBeNull();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wingtip comparison controls and three projection panels support keyboard, phone and embedded layouts', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await call(page, 'seekWingbeat', .21); await call(page, 'clearWingtipPose');
    const pin = page.locator('[data-wingtip-pin]'), clear = page.locator('[data-wingtip-clear]');
    await pin.focus(); await page.keyboard.press('Space'); await expect(pin).toBeFocused();
    expect((await call(page, 'getState')).wingtipStudy.pinned.progress).toBeCloseTo(.21, 7); await expect(clear).toBeEnabled();
    const view = page.locator('[data-wingbeat-view="above"]'); await view.focus(); await page.keyboard.press('Enter');
    await expect(view).toBeFocused(); await expect(view).toHaveAttribute('aria-pressed', 'true');
    const beforeOrbit = await call(page, 'getState');
    await page.locator('[data-birdlab-3d-canvas]').focus(); await page.keyboard.press('ArrowRight');
    expect((await call(page, 'getState')).wingbeatView).toBe('free');
    await expect(page.locator('[data-wingbeat-view="free"]')).toHaveAttribute('aria-pressed', 'true');
    preserved(beforeOrbit, await call(page, 'getState'));
    await view.focus(); await page.keyboard.press('Enter'); await expect(view).toHaveAttribute('aria-pressed', 'true');
    const slider = page.locator('#birdlab-wingbeat-phase'); await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused(); expect((await call(page, 'getState')).wingbeatStudy.progress).toBeCloseTo(.001, 7);
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-birdlab-wingtip-projections]', '[data-wingtip-plane="front"]', '[data-wingtip-plane="side"]', '[data-wingtip-plane="above"]', '[data-wingtip-pin]', '[data-wingtip-clear]', '[data-wingbeat-view="above"]']) {
      const control = page.locator(selector), box = await control.boundingBox();
      expect(box, selector).not.toBeNull(); expect(box!.width).toBeGreaterThan(0);
      expect(box!.x, selector).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, selector).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await control.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wingbeat-study]'), {
        runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
      });
      return result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    await clear.focus(); await page.keyboard.press('Enter'); expect((await call(page, 'getState')).wingtipStudy.pinned).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
