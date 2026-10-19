import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round8Wingtip={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
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
  await page.waitForFunction('!!window.round8Wingtip', null, { polling: 50, timeout: 60_000 });
  await expect(page.locator('[data-birdlab-3d-canvas]')).toBeVisible();
  await sizing(page, 1280, 1100); await call(page, 'seek', 4.2);
}
function preserved(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings', 'wildlife', 'animals']) expect(after[key], key).toEqual(before[key]);
}
function stableDrawing(value: any) { const { calls: _calls, ...stable } = value; return stable; }
async function drawing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, renderer } = w.round8Wingtip;
    const root = scene.getObjectByName('birdlab-wingtip-paths'), bird = scene.getObjectByName('birdlab-red-tailed-hawk');
    scene.updateMatrixWorld(true);
    const wings = ['left', 'right'].map(side => {
      // Independently read the actual rendered primary, including closed-wing
      // and loaded-feather morphs. A joint's world position is its root, not tip.
      const vane = bird.getObjectByName(side + '-shoulder').getObjectByName('slotted-primary-0');
      const geometry = vane.geometry, vertex = geometry.attributes.position.count - 3;
      const base = new T.Vector3().fromBufferAttribute(geometry.attributes.position, vertex), actual = base.clone();
      (geometry.morphAttributes.position || []).forEach((target: any, index: number) => {
        const delta = new T.Vector3().fromBufferAttribute(target, vertex);
        if (!geometry.morphTargetsRelative) delta.sub(base);
        actual.addScaledVector(delta, vane.morphTargetInfluences[index] || 0);
      });
      actual.applyMatrix4(vane.matrixWorld);
      const line = root.getObjectByName('birdlab-wingtip-' + side), marker = root.getObjectByName('birdlab-wingtip-current-' + side);
      const strokes = ['outline', 'stroke'].map(kind => {
        const mesh = root.getObjectByName('birdlab-wingtip-' + kind + '-' + side), matrix = new T.Matrix4();
        let endpointError = 0, minimumRadius = Infinity;
        for (let segment = 0; segment < mesh.count; segment++) {
          mesh.getMatrixAt(segment, matrix);
          const from = new T.Vector3(0, -.5, 0).applyMatrix4(matrix), to = new T.Vector3(0, .5, 0).applyMatrix4(matrix);
          endpointError = Math.max(endpointError,
            from.distanceTo(new T.Vector3().fromBufferAttribute(line.geometry.attributes.position, segment)),
            to.distanceTo(new T.Vector3().fromBufferAttribute(line.geometry.attributes.position, segment + 1)));
          minimumRadius = Math.min(minimumRadius, new T.Vector3().setFromMatrixColumn(matrix, 0).length(), new T.Vector3().setFromMatrixColumn(matrix, 2).length());
        }
        return { count: mesh.count, geometry: mesh.geometry.uuid, material: mesh.material.uuid,
          visible: mesh.visible, opacity: mesh.material.opacity, endpointError, minimumRadius };
      });
      return { points: [...line.geometry.attributes.position.array], count: line.geometry.attributes.position.count,
        geometry: line.geometry.uuid, material: line.material.uuid, visible: line.visible, opacity: line.material.opacity,
        actual: actual.toArray(), local: bird.worldToLocal(actual.clone()).toArray(),
        marker: marker.getWorldPosition(new T.Vector3()).toArray(), markerGeometry: marker.geometry.uuid, strokes };
    });
    return { visible: root.visible, parentIsScene: root.parent === scene, wings,
      position: root.position.toArray(), orientation: root.quaternion.toArray(),
      ownsCanvas: renderer.domElement === document.querySelector('[data-birdlab-3d-canvas]') && renderer.domElement.isConnected,
      liveContext: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}

test('wingtip paths follow the actual morphing feathers without changing the captured pose and release on every exit', async ({ page }) => {
  await mount(page); await call(page, 'setSpeed', .25); await call(page, 'inspectWingbeat');
  await call(page, 'setWingtipPaths', false);
  const before = await call(page, 'getState');
  await call(page, 'setWingtipPaths', true);
  preserved(before, await call(page, 'getState'));
  const initial = await drawing(page);
  expect(initial).toMatchObject({ visible: true, parentIsScene: true, ownsCanvas: true, liveContext: true, shaders: true });
  expect(initial.calls).toBeGreaterThan(0);
  expect((await call(page, 'getState')).wingtipPathsVisible).toBe(true);
  for (const wing of initial.wings) {
    expect(wing.count).toBe(65); expect(wing.points.every(Number.isFinite)).toBe(true);
    expect(wing.visible).toBe(true); expect(wing.opacity).toBeGreaterThan(0);
    for (const stroke of wing.strokes) {
      expect(stroke.count).toBe(64); expect(stroke.visible).toBe(true); expect(stroke.opacity).toBeGreaterThan(0);
      expect(stroke.endpointError).toBeLessThan(1e-6); expect(stroke.minimumRadius).toBeGreaterThan(.003);
    }
    const height = wing.points.filter((_: number, index: number) => index % 3 === 1);
    expect(Math.max(...height) - Math.min(...height)).toBeGreaterThan(.25);
  }
  // Fractions include both reversals and intermediate stroke positions. The
  // reference is the displayed model at each independently sought instant.
  for (const index of [0, 8, 16, 27, 32, 48, 64]) {
    await call(page, 'seekWingbeat', index / 64);
    const state = await call(page, 'getState'), actual = await drawing(page);
    expect(state.paused).toBe(true); expect(actual.visible).toBe(true);
    expect(actual.position).toEqual(state.position); expect(actual.orientation).toEqual(state.orientation);
    for (let side = 0; side < 2; side++) {
      const wing = actual.wings[side];
      expect(wing.points).toEqual(initial.wings[side].points);
      expect(wing.geometry).toBe(initial.wings[side].geometry);
      for (let axis = 0; axis < 3; axis++) {
        expect(wing.points[index * 3 + axis], `side ${side}, phase ${index}/64, axis ${axis}`).toBeCloseTo(wing.local[axis], 5);
        expect(wing.marker[axis]).toBeCloseTo(wing.actual[axis], 6);
      }
    }
  }
  const frozen = await call(page, 'getState'), frozenDrawing = await drawing(page);
  for (let repeat = 0; repeat < 3; repeat++) {
    await call(page, 'setWingtipPaths', false); expect((await drawing(page)).visible).toBe(false);
    await call(page, 'setWingtipPaths', true); preserved(frozen, await call(page, 'getState'));
    expect(stableDrawing(await drawing(page))).toEqual(stableDrawing(frozenDrawing));
  }
  await page.waitForTimeout(150); preserved(frozen, await call(page, 'getState'));
  expect(stableDrawing(await drawing(page))).toEqual(stableDrawing(frozenDrawing));

  for (const [method, value] of [['closeWingbeat', undefined], ['setPaused', false], ['seek', 14], ['restart', undefined], ['setCamera', 'chickadee'], ['setMode', 'free']] as const) {
    await call(page, 'setMode', 'guided'); await call(page, 'setCamera', 'orbit'); await call(page, 'setPaused', true);
    await call(page, 'seek', 4.2); await call(page, 'inspectWingbeat'); await call(page, 'setWingtipPaths', true);
    const reopened = await drawing(page);
    expect(reopened.visible, method + ' precondition').toBe(true);
    for (let side = 0; side < 2; side++) {
      expect(reopened.wings[side].geometry).toBe(initial.wings[side].geometry);
      expect(reopened.wings[side].material).toBe(initial.wings[side].material);
      expect(reopened.wings[side].markerGeometry).toBe(initial.wings[side].markerGeometry);
      expect(reopened.wings[side].strokes).toEqual(initial.wings[side].strokes);
    }
    await call(page, method, value);
    expect((await call(page, 'getState')).wingbeatStudy, method).toBeNull();
    expect((await call(page, 'getState')).wingtipPathsVisible, method).toBe(false);
    await expect.poll(async () => (await drawing(page)).visible, { message: method + ' must hide guides' }).toBe(false);
  }
  const released = await page.evaluate(() => {
    const w = window as any, root = w.round8Wingtip.scene.getObjectByName('birdlab-wingtip-paths'), resources = new Set<any>(), geometryUsers = new Map<any, number>();
    root.traverse((object: any) => {
      if (object.geometry) { resources.add(object.geometry); geometryUsers.set(object.geometry, (geometryUsers.get(object.geometry) || 0) + 1); }
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    });
    const counters = [...resources].map(resource => { const counter = { count: 0 }; resource.addEventListener('dispose', () => counter.count++); return counter; });
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as any, controller = canvas._birdlab3d;
    controller.dispose(); controller.dispose();
    return { counts: counters.map(item => item.count), sharedGeometryUsers: [...geometryUsers.values()].filter(count => count > 1).sort(),
      attached: !!canvas._birdlab3d, children: w.round8Wingtip.scene.children.length };
  });
  expect(released.counts.length).toBeGreaterThanOrEqual(4); expect(released.counts.every(count => count === 1)).toBe(true);
  expect(released.sharedGeometryUsers).toEqual([2, 4]);
  expect(released.attached).toBe(false); expect(released.children).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wingtip controls retain keyboard focus, readable layout and accessible names at three widths', async ({ page }) => {
  await mount(page); await page.locator('[data-birdlab-wingbeat-toggle]').click();
  const toggle = page.locator('[data-birdlab-wingtip-toggle]'), key = page.locator('[data-birdlab-wingtip-key]');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await call(page, 'setWingtipPaths', false);
    await toggle.focus(); await page.keyboard.press('Space'); await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true'); await expect(key).toBeVisible();
    expect((await call(page, 'getState')).wingtipPathsVisible).toBe(true);
    const slider = page.locator('#birdlab-wingbeat-phase');
    await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    expect((await call(page, 'getState')).wingbeatStudy.progress).toBeCloseTo(.001, 7);
    const host = await page.locator('#wrap').boundingBox();
    for (const selector of ['[data-birdlab-wingbeat-study]', '[data-birdlab-wingtip-toggle]', '[data-birdlab-wingtip-key]', '#birdlab-wingbeat-phase']) {
      const control = page.locator(selector), box = await control.boundingBox();
      expect(box, selector).not.toBeNull(); expect(box!.width).toBeGreaterThan(0);
      expect(box!.x, selector).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, selector).toBeLessThanOrEqual(host!.x + host!.width + 1);
      expect(await control.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    if (layout.host <= 500) expect((await page.locator('.birdlab-3d-stage').boundingBox())!.width).toBeGreaterThan(300);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wingbeat-study]'), {
        runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
      });
      return result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect((await call(page, 'getState')).wingtipPathsVisible).toBe(false);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
