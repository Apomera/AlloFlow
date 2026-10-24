import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round5Bird={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host = viewport) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%'; wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function audit(page: Page, selectors: string[]) {
  for (const selector of selectors) await expect(page.locator(selector)).toBeVisible();
  const violations = await page.evaluate(async selectors => {
    const report = await (window as any).axe.run({ include: selectors.map(selector => [selector]) }, {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
    });
    return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
  }, selectors);
  expect(violations).toEqual([]);
}
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function overlay(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, review = w.round5Bird, root = review.scene.getObjectByName('birdlab-flight-study-overlay');
    const height = root.getObjectByName('birdlab-study-height'), course = root.getObjectByName('birdlab-study-course');
    const flown = root.getObjectByName('birdlab-study-flown'), ground = root.getObjectByName('birdlab-study-ground'), heading = root.getObjectByName('birdlab-study-heading');
    const positions = course.geometry.attributes.position;
    const terminalRing = flown.geometry.drawRange.count / 24;
    const endpoint = new w.THREE.Vector3();
    if (terminalRing > 0) for (let side = 0; side < 4; side++) endpoint.add(new w.THREE.Vector3().fromBufferAttribute(flown.geometry.attributes.position, terminalRing * 5 + side));
    const centers = [0, 88, 200, 280].map(index => {
      const center = new w.THREE.Vector3();
      for (let side = 0; side < 4; side++) center.add(new w.THREE.Vector3().fromBufferAttribute(positions, index * 5 + side));
      return center.multiplyScalar(.25).toArray();
    });
    return { visible: root.visible, centers, courseId: course.geometry.uuid, drawn: flown.geometry.drawRange.count, flownEnd: terminalRing > 0 ? endpoint.multiplyScalar(.25).toArray() : null,
      height: [...height.geometry.attributes.position.array], ground: ground.position.toArray(), headingVisible: heading.visible,
      headingPosition: heading.position.toArray(), headingDirection: new w.THREE.Vector3(0, 1, 0).applyQuaternion(heading.quaternion).toArray(),
      shaders: review.renderer.info.programs.every((p: any) => !p.diagnostics || p.diagnostics.runnable) };
  });
}
async function mount3d(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, 'document.querySelector("[data-birdlab-3d-canvas]")?._birdlab3d');
  await sizing(page, 1280, 1100);
  await expect(page.getByRole('button', { name: 'Flight study overlay', exact: true })).toBeEnabled();
}
function sameGuided(before: any, after: any) {
  for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'sightings']) expect(after[key], key).toEqual(before[key]);
}

test('the real 3D course, flown trace and height line agree with the bird at inspected times and release resources', async ({ page }) => {
  await mount3d(page);
  const toggle = page.getByRole('button', { name: 'Flight study overlay', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect((await overlay(page)).visible).toBe(false);
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  let geometryId = '', previousCount = -1;
  const times = [3, 14, 28, 38];
  for (let index = 0; index < times.length; index++) {
    await call(page, 'seek', times[index]);
    const state = await call(page, 'getState'), drawing = await overlay(page);
    expect(drawing.visible).toBe(true); expect(drawing.shaders).toBe(true); expect(state.paused).toBe(true);
    if (geometryId) expect(drawing.courseId).toBe(geometryId); else geometryId = drawing.courseId;
    for (let axis = 0; axis < 3; axis++) {
      expect(drawing.centers[index][axis]).toBeCloseTo(state.position[axis], 4);
      expect(drawing.height[axis + 3]).toBeCloseTo(state.position[axis], 5);
      expect(drawing.ground[axis]).toBeCloseTo(drawing.height[axis] + (axis === 1 ? .025 : 0), 5);
    }
    expect(drawing.height[0]).toBeCloseTo(drawing.height[3], 5);
    expect(drawing.height[2]).toBeCloseTo(drawing.height[5], 5);
    expect(drawing.height[4]).toBeGreaterThan(drawing.height[1]);
    expect(drawing.height[4] - drawing.height[1]).toBeCloseTo(state.altitude, 4);
    expect(drawing.drawn).toBeGreaterThan(previousCount); previousCount = drawing.drawn;
    if (times[index] === 14) {
      expect(drawing.headingVisible).toBe(true);
      await call(page, 'seek', 14.01); const next = await call(page, 'getState');
      const delta = next.position.map((value: number, axis: number) => value - state.position[axis]);
      const distance = Math.hypot(...delta);
      const dot = delta.reduce((sum: number, value: number, axis: number) => sum + value / distance * drawing.headingDirection[axis], 0);
      expect(dot).toBeGreaterThan(.999);
      await call(page, 'seek', 14);
    }
  }
  expect(previousCount).toBe(280 * 4 * 6);
  await page.evaluate(() => {
    const w = window as any;
    w.round5WholeFlown = [...w.round5Bird.scene.getObjectByName('birdlab-study-flown').geometry.attributes.position.array];
  });
  // Inspect between fixed course rings, then seek backward. The gold endpoint
  // must follow the bird exactly, without leaving a kink in previously used rings.
  for (const time of [9.3, 18.6, 9.3, 28, 0, 38]) {
    await call(page, 'seek', time);
    const state = await call(page, 'getState'), drawing = await overlay(page);
    if (time === 0) { expect(drawing.drawn === 0).toBe(true); continue; }
    expect(drawing.drawn).toBe(Math.ceil(Math.max(0, Math.min(1, (time - 3) / 35)) * 280 - 1e-9) * 24);
    for (let axis = 0; axis < 3; axis++) expect(drawing.flownEnd[axis]).toBeCloseTo(state.position[axis], 4);
  }
  expect(await page.evaluate(() => {
    const w = window as any, positions = w.round5Bird.scene.getObjectByName('birdlab-study-flown').geometry.attributes.position.array;
    return Math.max(...Array.from(positions, (value: any, index) => Math.abs(value - w.round5WholeFlown[index])));
  })).toBe(0);
  const frozen = await call(page, 'getState'), drawing = await overlay(page);
  await page.waitForTimeout(350); sameGuided(frozen, await call(page, 'getState')); expect(await overlay(page)).toEqual(drawing);
  const nativeRender = await page.evaluate(() => {
    const renderer = (window as any).round5Bird.renderer;
    return { ownsCanvas: renderer.domElement === document.querySelector('[data-birdlab-3d-canvas]') && renderer.domElement.isConnected,
      liveContext: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
  expect(nativeRender).toMatchObject({ ownsCanvas: true, liveContext: true, shaders: true }); expect(nativeRender.calls).toBeGreaterThan(0);
  const released = await page.evaluate(() => {
    const w = window as any, root = w.round5Bird.scene.getObjectByName('birdlab-flight-study-overlay'), resources = new Set<any>();
    root.traverse((object: any) => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); });
    const counts = [...resources].map(resource => { const counter = { count: 0 }; resource.addEventListener('dispose', () => counter.count++); return counter; });
    const canvas = document.querySelector('[data-birdlab-3d-canvas]') as any, controller = canvas._birdlab3d;
    controller.dispose(); controller.dispose();
    return { counts: counts.map(item => item.count), attached: !!canvas._birdlab3d };
  });
  expect(released.counts.length).toBeGreaterThan(5); expect(released.counts.every(count => count === 1)).toBe(true); expect(released.attached).toBe(false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('flight study preserves paused state across cameras, free exploration and reset on desktop, phone and narrow panes', async ({ page }) => {
  await mount3d(page); await call(page, 'seek', 14); await call(page, 'setSpeed', .25);
  const before = await call(page, 'getState'), toggle = page.getByRole('button', { name: 'Flight study overlay', exact: true });
  await toggle.focus(); await page.keyboard.press('Space'); await expect(toggle).toBeFocused();
  sameGuided(before, await call(page, 'getState'));
  await page.getByRole('button', { name: 'See whole route', exact: true }).click();
  expect((await call(page, 'getState')).camera).toBe('wide'); sameGuided(before, await call(page, 'getState'));
  await call(page, 'setCamera', 'chickadee');
  await expect(toggle).toHaveCount(0); expect((await overlay(page)).visible).toBe(false);
  expect((await call(page, 'getState')).studyOverlay).toBe(true);
  await call(page, 'setCamera', 'orbit'); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Free roam', exact: true }).click();
  expect((await overlay(page)).visible).toBe(false); await expect(toggle).toHaveCount(0);
  await page.getByRole('button', { name: 'Guided study', exact: true }).click();
  sameGuided(before, await call(page, 'getState')); expect((await overlay(page)).visible).toBe(true);
  await page.getByRole('button', { name: 'See whole route', exact: true }).click();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await expect.poll(() => page.evaluate(() => {
      const w = window as any, { scene, camera } = w.round5Bird;
      const course = scene.getObjectByName('birdlab-study-course'), positions = course.geometry.attributes.position;
      course.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      let extent = 0;
      for (let ring = 0; ring <= 280; ring++) {
        const point = new w.THREE.Vector3();
        for (let side = 0; side < 4; side++) point.add(new w.THREE.Vector3().fromBufferAttribute(positions, ring * 5 + side));
        point.multiplyScalar(.25).applyMatrix4(course.matrixWorld).project(camera);
        if (point.z <= -1 || point.z >= 1) return 99;
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
      return extent;
    }), { timeout: 15_000, message: 'See whole route should frame every actual course center after resizing' }).toBeLessThanOrEqual(.96);
    for (const selector of ['[data-birdlab-3d-study-key]', '[data-birdlab-3d-study-toggle]']) {
      const box = await page.locator(selector).boundingBox(), host = await page.locator('#wrap').boundingBox();
      expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
    }
    await audit(page, ['[data-birdlab-3d-study-key]', '[data-birdlab-3d-study-toggle]']);
    sameGuided(before, await call(page, 'getState'));
  }
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  sameGuided(before, await call(page, 'getState')); expect((await overlay(page)).visible).toBe(true);
  await page.getByRole('button', { name: 'Restart flight', exact: true }).click();
  const restarted = await call(page, 'getState'); expect(restarted.time).toBe(0); expect(restarted.paused).toBe(true);
  expect(restarted.studyOverlay).toBe(true); expect((await overlay(page)).drawn === 0).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

async function mountIspy(page: Page, habitat = 'forest', reduced = false) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await harness.mount(page, { birdLab: { view: 'ispy', activeHabitat: habitat, blSceneMotion: false, blSceneLens: 'wide' } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-habitat-navigator]')).toHaveAttribute('data-birdlab-habitat-navigator', habitat);
}
async function nonPresentationState(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries((window as any).__toolData.birdLab).filter(([key]) => !['blSceneLens', 'blSceneMotion'].includes(key))));
}
async function cropError(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-birdlab-realistic-scene]') as SVGSVGElement;
    const nav = document.querySelector('[data-birdlab-habitat-navigator] > svg') as SVGSVGElement;
    const windowRect = document.querySelector('[data-birdlab-navigator-window]') as SVGRectElement;
    const box = svg.getBoundingClientRect(), inverse = svg.getScreenCTM()!.inverse(), full = nav.viewBox.baseVal;
    const top = new DOMPoint(box.left, box.top).matrixTransform(inverse), bottom = new DOMPoint(box.right, box.bottom).matrixTransform(inverse);
    const expected = [Math.max(full.x, top.x), Math.max(full.y, top.y), Math.min(full.x + full.width, bottom.x), Math.min(full.y + full.height, bottom.y)];
    const actual = [windowRect.x.baseVal.value, windowRect.y.baseVal.value, windowRect.x.baseVal.value + windowRect.width.baseVal.value, windowRect.y.baseVal.value + windowRect.height.baseVal.value];
    return Math.max(...actual.map((value, index) => Math.abs(value - expected[index])));
  });
}

test('the 2D habitat navigator tracks painted crop bounds in all habitats without revealing or identifying birds', async ({ page }) => {
  for (const habitat of ['forest', 'marsh', 'backyard', 'coast', 'mountain']) {
    await mountIspy(page, habitat);
    const before = await nonPresentationState(page), nav = page.locator('[data-birdlab-habitat-navigator]');
    await expect(nav.locator('[data-birdlab-species], [data-birdlab-kind], button')).toHaveCount(0);
    await expect(nav).toContainText('Animal locations stay yours to discover');
    const ids = await page.evaluate(() => {
      const sceneIds = new Set([...document.querySelectorAll('[data-birdlab-realistic-scene] [id]')].map(element => element.id));
      return [...document.querySelectorAll('[data-birdlab-habitat-navigator] [id]')].map(element => element.id).filter(id => sceneIds.has(id));
    });
    expect(ids, `${habitat} paint definitions must be scoped to each SVG`).toEqual([]);
    const choices = page.locator('[data-birdlab-navigator-lens]:not(:disabled)');
    expect(await choices.count()).toBeGreaterThan(1);
    for (const lens of await choices.evaluateAll(elements => elements.map(element => element.getAttribute('data-birdlab-navigator-lens')!))) {
      const control = page.locator(`[data-birdlab-navigator-lens="${lens}"]`);
      await control.click(); await expect(control).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('[data-birdlab-navigator-window]')).toHaveAttribute('data-birdlab-navigator-window', lens);
      await expect.poll(() => cropError(page), { message: `${habitat}/${lens} should match the actual clipped scene` }).toBeLessThan(3);
      expect(await nonPresentationState(page)).toEqual(before);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    await harness.destroy(page);
  }
});

test('navigator radios support roving keyboard selection and keep the paused scene coherent at phone and 500px widths', async ({ page }) => {
  await mountIspy(page, 'forest', true);
  const before = await nonPresentationState(page), controls = page.locator('[data-birdlab-scene-controls]');
  await expect(page.getByRole('button', { name: 'Scene motion disabled by reduced-motion preference', exact: true })).toBeDisabled();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const choices = controls.locator('[data-birdlab-navigator-lens]:not(:disabled)');
    const ids = await choices.evaluateAll(elements => elements.map(element => element.getAttribute('data-birdlab-navigator-lens')!));
    expect(ids.length).toBeGreaterThan(1);
    await choices.first().focus(); await page.keyboard.press('Home');
    await expect(choices.first()).toBeFocused(); await expect(choices.first()).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight'); await expect(choices.nth(1)).toBeFocused(); await expect(choices.nth(1)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End'); await expect(choices.last()).toBeFocused(); await expect(choices.last()).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => cropError(page)).toBeLessThan(3);
    await page.keyboard.press('ArrowRight'); await expect(choices.first()).toBeFocused(); await expect(choices.first()).toHaveAttribute('aria-checked', 'true');
    await expect(controls.locator('[data-birdlab-navigator-lens][tabindex="0"]')).toHaveCount(1);
    await expect.poll(() => cropError(page)).toBeLessThan(3);
    const host = await page.locator('#wrap').boundingBox(), nav = await page.locator('[data-birdlab-habitat-navigator]').boundingBox();
    expect(nav).not.toBeNull(); expect(nav!.x).toBeGreaterThanOrEqual(host!.x - 1); expect(nav!.x + nav!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
    expect(await controls.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page, ['[data-birdlab-scene-controls]']);
    expect(await nonPresentationState(page)).toEqual(before);
    const painting = () => page.evaluate(() => [...document.querySelectorAll('[data-birdlab-realistic-scene] [data-birdlab-motion-box]')].map(element => {
      const matrix = (element as SVGGraphicsElement).getScreenCTM();
      return { matrix: matrix ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] : null, transform: getComputedStyle(element).transform, running: getComputedStyle(element).animationPlayState };
    }));
    const still = await painting(); expect(still.length).toBeGreaterThan(0);
    await page.waitForTimeout(200); expect(await painting()).toEqual(still);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
