import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene?.getObjectByName('birdlab-wing-construction'))window.round19Underside={scene,camera,renderer,frames:((window.round19Underside||{}).frames||0)+1};return render(scene,camera);};return renderer;};})();",
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const root = '[data-birdlab-wing-assembly]', stage = '[data-wing-construction-stage]';
const models = [
  { id: 'soaring', label: 'Soaring Wings', pieces: 194 },
  { id: 'elliptical', label: 'Elliptical Wings', pieces: 184 },
  { id: 'highaspect', label: 'High-Aspect-Ratio', pieces: 184 },
  { id: 'highspeed', label: 'High-Speed Wings', pieces: 184 },
  { id: 'aquatic', label: 'Aquatic Wings', pieces: 184 },
];
async function painted(page: Page) {
  await page.locator(stage).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => (window as any).round19Underside.frames);
  await expect.poll(() => page.evaluate(() => (window as any).round19Underside.frames)).toBeGreaterThan(before + 1);
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, size) => {
    node.style.width = size + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => {
    const probe = (window as any).round19Underside;
    return probe ? Math.abs(probe.camera.aspect - probe.renderer.domElement.clientWidth / probe.renderer.domElement.clientHeight) : 1;
  })).toBeLessThan(.001);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'wingTypes', wingSel: 'soaring' } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible(); await page.locator(stage).scrollIntoViewIfNeeded();
  await page.waitForFunction("!!window.round19Underside?.scene.getObjectByName('birdlab-wing-construction')", null, { timeout: 60_000 });
  await sizing(page, 1280, 1100); await expect(page.locator('[data-wing-view="below"]')).toBeEnabled();
  await page.locator('[data-wing-assemble]').click();
  await painted(page);
  await page.evaluate(() => { (window as any).round19Canvas = document.querySelector('[data-wing-construction-stage] canvas'); });
}
async function gap(page: Page, value: number) {
  await page.locator('#birdlab-wing-separation').evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(value));
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).round19Underside.scene.getObjectByName('birdlab-wing-construction').userData.separation)).toBe(value);
}
async function native(page: Page, part = 'all', remember = false): Promise<any> {
  await page.locator(stage).scrollIntoViewIfNeeded();
  return page.evaluate(({ part, remember }) => {
    const w = window as any, T = w.THREE, { scene, camera, renderer, frames } = w.round19Underside;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const model = scene.getObjectByName('birdlab-wing-construction'), baseline = w.round19VertexBaseline, saved = new Map();
    const objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>();
    scene.traverse((object: any) => {
      objects.push(object.uuid); if (object.geometry) geometries.add(object.geometry.uuid);
      (Array.isArray(object.material) ? object.material : object.material ? [object.material] : []).forEach((material: any) => {
        materials.add(material.uuid); Object.values(material).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); });
      });
    });
    let count = 0, vertices = 0, geometryError = 0, worldError = 0, localError = 0, maxX = 0, maxY = 0, minZ = Infinity, maxZ = -Infinity;
    const box = new T.Box3(), groupState: any[] = [];
    for (const id of ['secondaries', 'primaries', 'body']) {
      const group = model.getObjectByName('wing-construction-' + id); groupState.push({ id, position: group.position.toArray(), scale: group.scale.toArray() });
      group.traverse((mesh: any) => {
        if (!mesh.isMesh) return; count++;
        const attribute = mesh.geometry.attributes.position, local = mesh.matrix.toArray(), world: number[][] = [], previous = baseline?.model === model.uuid ? baseline.meshes.get(mesh.uuid) : null;
        if (previous) {
          if (previous.geometry !== mesh.geometry.uuid) geometryError = Infinity;
          attribute.array.forEach((value: number, index: number) => { geometryError = Math.max(geometryError, Math.abs(value - previous.buffer[index])); });
          local.forEach((value: number, index: number) => { localError = Math.max(localError, Math.abs(value - previous.matrix[index])); });
        }
        for (let index = 0; index < attribute.count; index++) {
          const point = new T.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld); vertices++; world.push(point.toArray());
          if (previous) point.toArray().forEach((value: number, axis: number) => { worldError = Math.max(worldError, Math.abs(value - previous.points[index][axis])); });
          if (part === 'all' || part === id) {
            box.expandByPoint(point); const ndc = point.clone().project(camera);
            maxX = Math.max(maxX, Math.abs(ndc.x)); maxY = Math.max(maxY, Math.abs(ndc.y)); minZ = Math.min(minZ, ndc.z); maxZ = Math.max(maxZ, ndc.z);
          }
        }
        saved.set(mesh.uuid, { geometry: mesh.geometry.uuid, buffer: Array.from(attribute.array), matrix: local, points: world });
      });
    }
    if (remember) w.round19VertexBaseline = { model: model.uuid, meshes: saved };
    const centre = box.getCenter(new T.Vector3()), direction = camera.getWorldDirection(new T.Vector3());
    return { model: model.uuid, camera: camera.uuid, scene: scene.uuid, objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort(),
      count, vertices, groups: groupState, modelScale: model.scale.toArray(), modelQuaternion: model.quaternion.toArray(), geometryError, worldError, localError,
      position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), direction: direction.toArray(), orbitElevation: Math.atan2(camera.position.y, Math.hypot(camera.position.x, camera.position.z)),
      targetElevation: Math.atan2(camera.position.y - centre.y, Math.hypot(camera.position.x - centre.x, camera.position.z - centre.z)), aim: direction.dot(centre.sub(camera.position).normalize()),
      projection: { maxX, maxY, minZ, maxZ }, frames, sameCanvas: renderer.domElement === w.round19Canvas,
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, { part, remember });
}
function unchanged(value: any, baseline: any) {
  for (const key of ['model', 'camera', 'scene', 'objects', 'geometries', 'materials', 'textures', 'count', 'vertices', 'groups', 'modelScale', 'modelQuaternion']) expect(value[key], key).toEqual(baseline[key]);
  expect(value.geometryError).toBe(0); expect(value.localError).toBe(0); expect(value.worldError).toBeLessThan(1e-9);
  expect(value.sameCanvas).toBe(true); expect(value.live).toBe(true); expect(value.calls).toBeGreaterThan(0); expect(value.shaders).toBe(true);
}
function contained(value: any) {
  expect(value.projection.maxX).toBeLessThan(1); expect(value.projection.maxY).toBeLessThan(1);
  expect(value.projection.minZ).toBeGreaterThan(-1); expect(value.projection.maxZ).toBeLessThan(1);
}
async function preset(page: Page, view: 'above' | 'below' | 'front') {
  await page.locator('[data-wing-view="' + view + '"]').click(); await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(view === 'above' ? 1.33 : view === 'below' ? -.67 : .23, 6);
}
// Read actual rendered model pixels. Helper cages and the HTML chip cannot make
// this pass: only the existing model and real lights are visible during readback.
async function modelPixels(page: Page, keep: boolean): Promise<any> {
  return page.evaluate(keep => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round19Underside, model = scene.getObjectByName('birdlab-wing-construction');
    const visibility = scene.children.map((object: any) => ({ object, visible: object.visible })), originalBackground = scene.background, originalFog = scene.fog;
    try {
      visibility.forEach(({ object }: any) => { object.visible = object === model || !!object.isLight; }); scene.background = new T.Color(0); scene.fog = null;
      renderer.render(scene, camera); const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight, pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let visible = 0, total = 0, changed = 0, overlap = 0; const before = w.round19Pixels;
      for (let index = 0; index < pixels.length; index += 4) {
        const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        if (luminance > 4) { visible++; total += luminance; }
        if (before) {
          const old = before[index] + before[index + 1] + before[index + 2];
          if (old > 12 || luminance > 4) {
            overlap++; if (Math.max(Math.abs(before[index] - pixels[index]), Math.abs(before[index + 1] - pixels[index + 1]), Math.abs(before[index + 2] - pixels[index + 2])) > 8) changed++;
          }
        }
      }
      if (keep) w.round19Pixels = pixels;
      return { visible, mean: total / Math.max(1, visible), changed, overlap, width, height, error: gl.getError() };
    } finally {
      visibility.forEach(({ object, visible }: any) => { object.visible = visible; }); scene.background = originalBackground; scene.fog = originalFog; renderer.render(scene, camera);
    }
  }, keep);
}
test('all five native wing models expose a real underside without changing geometry, split, selection or resources', async ({ page }) => {
  await mount(page);
  for (const model of models) {
    await page.locator(root).getByRole('button', { name: model.label, exact: true }).click();
    await expect(page.locator(root)).toHaveAttribute('data-wing-model', model.id); await page.locator(stage).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await native(page)).count).toBe(model.pieces);
    await page.locator('[data-wing-assemble]').click(); await gap(page, 0); await painted(page);
    const home = await native(page), host = await page.evaluate(() => JSON.stringify((window as any).__toolData));
    for (const spacing of [0, 100]) {
      await gap(page, spacing); const baseline = await native(page, 'all', true); expect(baseline.count).toBe(model.pieces);
      await preset(page, 'above'); const above = await native(page); unchanged(above, baseline); contained(above); expect(above.direction[1]).toBeLessThan(-.8);
      const upper = await modelPixels(page, true); expect(upper.visible).toBeGreaterThan(400); expect(upper.error).toBe(0);
      await preset(page, 'below'); const below = await native(page); unchanged(below, baseline); contained(below);
      expect(below.position[1]).toBeLessThan(0); expect(below.direction[1]).toBeGreaterThan(.5);
      const lower = await modelPixels(page, false); expect(lower.visible).toBeGreaterThan(400); expect(lower.error).toBe(0);
      expect(lower.changed).toBeGreaterThan(200); expect(lower.changed / lower.overlap).toBeGreaterThan(.08);
      expect(Math.abs(lower.mean - upper.mean)).toBeGreaterThan(.5);
      for (const part of ['secondaries', 'primaries', 'body']) {
        await page.locator('[data-wing-select="' + part + '"]').click(); await page.locator('[data-wing-frame]').click(); await page.locator(stage).scrollIntoViewIfNeeded();
        await expect.poll(async () => (await native(page, part)).aim).toBeGreaterThan(.999999);
        const framed = await native(page, part); unchanged(framed, baseline); contained(framed); expect(framed.targetElevation).toBeLessThan(-.5);
        await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(spacing)); await expect(page.locator(root)).toHaveAttribute('data-wing-part', part);
      }
      await preset(page, 'below'); await expect(page.locator(root)).toHaveAttribute('data-wing-part', 'body'); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(spacing));
      const still = await native(page); await expect.poll(async () => (await native(page)).frames).toBeGreaterThan(still.frames + 2);
      const after = await native(page); expect(after.position).toEqual(still.position); expect(after.quaternion).toEqual(still.quaternion); unchanged(after, baseline);
      await page.getByRole('button', { name: 'Reset the view', exact: true }).click(); await page.locator(stage).scrollIntoViewIfNeeded();
      await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(.78, 6);
      const reset = await native(page); expect(reset.position).toEqual(home.position); expect(reset.quaternion).toEqual(home.quaternion); unchanged(reset, baseline);
    }
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(host);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('underside presets, keyboard tilt and touch controls stay usable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  await page.locator(root).getByRole('button', { name: 'High-Aspect-Ratio', exact: true }).click(); await expect(page.locator(root)).toHaveAttribute('data-wing-model', 'highaspect');
  await expect.poll(async () => (await native(page)).count).toBe(184);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-wing-assemble]').click(); await gap(page, 100);
    const baseline = await native(page, 'all', true), below = page.locator('[data-wing-view="below"]'), above = page.locator('[data-wing-view="above"]'), viewer = page.locator(stage);
    await below.focus(); await page.keyboard.press('Enter'); await expect(below).toBeFocused();
    await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(-.67, 6); contained(await native(page)); unchanged(await native(page), baseline);
    await above.tap(); await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(1.33, 6); contained(await native(page));
    await below.tap(); await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(-.67, 6);
    await viewer.focus(); for (let index = 0; index < 15; index++) await page.keyboard.press('ArrowDown'); await expect(viewer).toBeFocused();
    await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(-1.2, 6);
    const limit = await native(page); await page.keyboard.press('ArrowDown'); expect((await native(page)).position).toEqual(limit.position);
    await page.keyboard.press('0'); await expect(viewer).toBeFocused(); await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(.78, 6);
    await below.focus(); await page.keyboard.press('Space'); await expect(below).toBeFocused(); await expect.poll(async () => (await native(page)).orbitElevation).toBeCloseTo(-.67, 6);
    await viewer.focus(); const distance = Math.hypot(...(await native(page)).position); await page.keyboard.press('Equal');
    await expect.poll(async () => Math.hypot(...(await native(page)).position)).toBeLessThan(distance);
    await page.keyboard.press('Minus'); await expect.poll(async () => Math.hypot(...(await native(page)).position)).toBeCloseTo(distance, 6);
    const select = page.locator('[data-wing-select="primaries"]'); await select.focus(); await page.keyboard.press('Enter'); await expect(select).toBeFocused();
    const frame = page.locator('[data-wing-frame]'); await frame.focus(); await page.keyboard.press('Enter'); await expect(frame).toBeFocused();
    await expect.poll(async () => (await native(page, 'primaries')).aim).toBeGreaterThan(.999999);
    contained(await native(page, 'primaries')); unchanged(await native(page), baseline);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, stage, '[data-wing-view="above"]', '[data-wing-view="front"]', '[data-wing-view="below"]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!; expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0);
      expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-birdlab-section-study]')).toBeVisible();
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wing-assembly]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
