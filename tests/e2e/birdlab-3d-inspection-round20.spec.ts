import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene?.getObjectByName('birdlab-wing-construction'))window.round20Wing={scene,camera,renderer,frames:((window.round20Wing||{}).frames||0)+1};return render(scene,camera);};return renderer;};})();",
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const root = '[data-birdlab-wing-assembly]', stage = '[data-wing-construction-stage]', isolate = '[data-wing-isolate]';
const parts = ['secondaries', 'primaries', 'body'];
const models = [
  { id: 'soaring', label: 'Soaring Wings', outer: 94 },
  { id: 'elliptical', label: 'Elliptical Wings', outer: 84 },
  { id: 'highaspect', label: 'High-Aspect-Ratio', outer: 84 },
  { id: 'highspeed', label: 'High-Speed Wings', outer: 84 },
  { id: 'aquatic', label: 'Aquatic Wings', outer: 84 },
];
async function painted(page: Page) {
  await page.locator(stage).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => (window as any).round20Wing.frames);
  await expect.poll(() => page.evaluate(() => (window as any).round20Wing.frames)).toBeGreaterThan(before + 1);
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => { const p = (window as any).round20Wing; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.001);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'wingTypes', wingSel: 'soaring' } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible(); await page.locator(stage).scrollIntoViewIfNeeded();
  await page.waitForFunction("!!window.round20Wing?.scene.getObjectByName('birdlab-wing-construction')", null, { timeout: 60_000 });
  await sizing(page, 1280, 1100); await expect(page.locator('[data-wing-view="below"]')).toBeEnabled();
  await page.locator('[data-wing-assemble]').click(); await painted(page);
  await page.evaluate(() => { (window as any).round20Canvas = document.querySelector('[data-wing-construction-stage] canvas'); (window as any).round20Checkbox = document.querySelector('[data-wing-isolate]'); });
}
async function gap(page: Page, value: number) {
  await page.locator('#birdlab-wing-separation').evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(value));
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).round20Wing.scene.getObjectByName('birdlab-wing-construction').userData.separation)).toBe(value);
}
async function native(page: Page, part = 'all', remember = false): Promise<any> {
  await page.locator(stage).scrollIntoViewIfNeeded();
  return page.evaluate(({ part, remember }) => {
    const w = window as any, T = w.THREE, { scene, camera, renderer, frames } = w.round20Wing;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const model = scene.getObjectByName('birdlab-wing-construction'), before = w.round20Baseline, saved = new Map();
    const objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>();
    scene.traverse((object: any) => {
      objects.push(object.uuid); if (object.geometry) geometries.add(object.geometry.uuid);
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        materials.add(material.uuid); for (const value of Object.values(material) as any[]) if (value?.isTexture) textures.add(value.uuid);
      }
    });
    let count = 0, visibleCount = 0, matched = 0, bufferError = 0, worldError = 0, localError = 0, maxX = 0, maxY = 0, minZ = Infinity, maxZ = -Infinity;
    const groups: any[] = [], bounds = new T.Box3();
    for (const id of ['secondaries', 'primaries', 'body']) {
      const group = model.getObjectByName('wing-construction-' + id); let pieces = 0;
      group.traverse((mesh: any) => {
        if (!mesh.isMesh) return; count++; pieces++; if (group.visible && mesh.visible) visibleCount++;
        const attr = mesh.geometry.attributes.position, local = mesh.matrix.toArray(), previous = before?.model === model.uuid ? before.meshes.get(mesh.uuid) : null, points: number[][] = [];
        if (previous) {
          matched++; if (previous.geometry !== mesh.geometry.uuid) bufferError = Infinity;
          attr.array.forEach((value: number, i: number) => { bufferError = Math.max(bufferError, Math.abs(value - previous.buffer[i])); });
          local.forEach((value: number, i: number) => { localError = Math.max(localError, Math.abs(value - previous.local[i])); });
        }
        for (let i = 0; i < attr.count; i++) {
          const point = new T.Vector3().fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld); points.push(point.toArray());
          if (previous) point.toArray().forEach((value: number, axis: number) => { worldError = Math.max(worldError, Math.abs(value - previous.points[i][axis])); });
          if (part === 'all' || part === id) { bounds.expandByPoint(point); const ndc = point.clone().project(camera); maxX = Math.max(maxX, Math.abs(ndc.x)); maxY = Math.max(maxY, Math.abs(ndc.y)); minZ = Math.min(minZ, ndc.z); maxZ = Math.max(maxZ, ndc.z); }
        }
        saved.set(mesh.uuid, { geometry: mesh.geometry.uuid, buffer: Array.from(attr.array), local, points });
      });
      groups.push({ id, visible: group.visible, pieces, position: group.position.toArray(), quaternion: group.quaternion.toArray(), scale: group.scale.toArray() });
    }
    if (remember) w.round20Baseline = { model: model.uuid, meshes: saved };
    const centre = bounds.getCenter(new T.Vector3()), direction = camera.getWorldDirection(new T.Vector3());
    return { model: model.uuid, scene: scene.uuid, camera: camera.uuid, objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort(),
      programs: renderer.info.programs.map((program: any) => program.id).sort(), memory: { ...renderer.info.memory },
      groups, count, visibleCount, matched, bufferError, localError, worldError, rootMatrix: model.matrix.toArray(),
      position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), elevation: Math.atan2(camera.position.y, Math.hypot(camera.position.x, camera.position.z)),
      targetElevation: Math.atan2(camera.position.y - centre.y, Math.hypot(camera.position.x - centre.x, camera.position.z - centre.z)), aim: direction.dot(centre.sub(camera.position).normalize()),
      projection: { maxX, maxY, minZ, maxZ }, frames, live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      sameCanvas: renderer.domElement === w.round20Canvas, sameCheckbox: document.querySelector('[data-wing-isolate]') === w.round20Checkbox,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, { part, remember });
}
function unchanged(value: any, before: any) {
  for (const key of ['model', 'scene', 'camera', 'objects', 'geometries', 'materials', 'textures', 'programs', 'memory', 'count', 'rootMatrix']) expect(value[key], key).toEqual(before[key]);
  expect(value.groups.map(({ visible, ...group }: any) => group)).toEqual(before.groups.map(({ visible, ...group }: any) => group));
  expect(value.matched).toBe(value.count); expect(value.bufferError).toBe(0); expect(value.localError).toBe(0); expect(value.worldError).toBeLessThan(1e-9);
  expect(value.sameCanvas).toBe(true); expect(value.sameCheckbox).toBe(true); expect(value.live).toBe(true); expect(value.calls).toBeGreaterThan(0); expect(value.shaders).toBe(true);
}
function sameCamera(value: any, before: any) { expect(value.position).toEqual(before.position); expect(value.quaternion).toEqual(before.quaternion); }
function contained(value: any) { expect(value.projection.maxX).toBeLessThan(1); expect(value.projection.maxY).toBeLessThan(1); expect(value.projection.minZ).toBeGreaterThan(-1); expect(value.projection.maxZ).toBeLessThan(1); }
async function visibility(page: Page, selected: string | null) {
  await expect(page.locator(root)).toHaveAttribute('data-wing-isolated', selected || 'all');
  await expect.poll(async () => (await native(page)).groups.filter((g: any) => g.visible).map((g: any) => g.id)).toEqual(selected ? [selected] : parts);
}
async function pixels(page: Page, remember = false): Promise<any> {
  return page.evaluate(remember => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round20Wing, model = scene.getObjectByName('birdlab-wing-construction');
    const visibility = scene.children.map((object: any) => ({ object, visible: object.visible })), background = scene.background, fog = scene.fog;
    try {
      visibility.forEach(({ object }: any) => { object.visible = object === model || !!object.isLight; }); scene.background = new T.Color(0); scene.fog = null;
      renderer.render(scene, camera); const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight, bytes = new Uint8Array(width * height * 4), before = w.round20Pixels;
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes); let visible = 0, changed = 0;
      for (let i = 0; i < bytes.length; i += 4) {
        if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 12) visible++;
        if (before && Math.max(Math.abs(before[i] - bytes[i]), Math.abs(before[i + 1] - bytes[i + 1]), Math.abs(before[i + 2] - bytes[i + 2])) > 8) changed++;
      }
      if (remember) w.round20Pixels = bytes;
      return { visible, changed, error: gl.getError() };
    } finally { visibility.forEach(({ object, visible }: any) => { object.visible = visible; }); scene.background = background; scene.fog = fog; renderer.render(scene, camera); }
  }, remember);
}
// Find an actual native body surface whose screen ray hits no currently visible
// wing mesh. The same screen point must become pickable after restoring context.
async function hiddenBodyPoint(page: Page): Promise<any> {
  await page.locator(stage).scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round20Wing, model = scene.getObjectByName('birdlab-wing-construction'), ray = new T.Raycaster(), meshes: any[] = [];
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); model.traverse((mesh: any) => { if (mesh.isMesh) meshes.push(mesh); });
    const visible = (mesh: any) => { for (let node = mesh; node; node = node.parent) if (!node.visible) return false; return true; };
    for (const mesh of meshes.filter(mesh => mesh.userData.partId === 'body')) {
      mesh.geometry.computeBoundingBox(); const centre = mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld), ndc = centre.project(camera);
      if (Math.abs(ndc.x) > .94 || Math.abs(ndc.y) > .94) continue;
      ray.setFromCamera(new T.Vector2(ndc.x, ndc.y), camera); const hits = ray.intersectObjects(meshes, false);
      if (hits[0]?.object.userData.partId !== 'body' || hits.some((hit: any) => visible(hit.object))) continue;
      const rect = renderer.domElement.getBoundingClientRect(); return { x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2, rawPart: hits[0].object.userData.partId };
    }
    return null;
  });
}

test('isolation changes real model pixels and picking while every native wing shape and camera stays intact', async ({ page }) => {
  await mount(page); await expect(page.locator(isolate)).toBeDisabled();
  for (const model of models) {
    if (await page.locator(root).getAttribute('data-wing-model') !== model.id) {
      const previous = (await native(page)).model;
      await page.locator(root).getByRole('button', { name: model.label, exact: true }).click();
      await expect.poll(async () => (await native(page)).model).not.toBe(previous);
    }
    await page.locator('[data-wing-assemble]').click(); await gap(page, 60);
    await page.locator('[data-wing-view="below"]').click(); await page.locator('[data-wing-select="primaries"]').click(); await painted(page);
    const baseline = await native(page, 'all', true), hostData = await page.evaluate(() => JSON.stringify((window as any).__toolData));
    expect(baseline.count).toBe(100 + model.outer); contained(baseline);
    const full = await pixels(page, true); expect(full.visible).toBeGreaterThan(250); expect(full.error).toBe(0);
    await page.locator(isolate).check(); await visibility(page, 'primaries');
    const isolated = await native(page); unchanged(isolated, baseline); sameCamera(isolated, baseline); expect(isolated.visibleCount).toBe(model.outer);
    const outerPixels = await pixels(page); expect(outerPixels.visible).toBeGreaterThan(50); expect(outerPixels.visible).toBeLessThan(full.visible); expect(outerPixels.changed).toBeGreaterThan(50); expect(outerPixels.error).toBe(0);
    for (const part of parts) {
      const cameraBefore = await native(page);
      await page.locator('[data-wing-select="' + part + '"]').click(); await visibility(page, part);
      const selected = await native(page); unchanged(selected, baseline); sameCamera(selected, cameraBefore);
      expect(selected.visibleCount).toBe(part === 'body' ? 2 : part === 'secondaries' ? 98 : model.outer);
      await page.locator('[data-wing-frame]').click(); await page.locator(stage).scrollIntoViewIfNeeded();
      await expect.poll(async () => (await native(page, part)).aim).toBeGreaterThan(.999999);
      const framed = await native(page, part); unchanged(framed, baseline); contained(framed); expect(framed.targetElevation).toBeLessThan(-.5);
      const selectedPixels = await pixels(page); expect(selectedPixels.visible).toBeGreaterThan(20); expect(selectedPixels.error).toBe(0);
    }
    await page.locator('[data-wing-select="primaries"]').click(); await visibility(page, 'primaries');
    await page.locator('[data-wing-view="below"]').click(); await painted(page);
    const beforePick = await native(page), point = await hiddenBodyPoint(page); expect(point).not.toBeNull(); expect(point.rawPart).toBe('body');
    await page.mouse.click(point.x, point.y); await painted(page);
    await expect(page.locator(root)).toHaveAttribute('data-wing-part', 'primaries'); await expect(page.locator(isolate)).toBeChecked();
    unchanged(await native(page), baseline); sameCamera(await native(page), beforePick);
    await page.locator(isolate).uncheck(); await visibility(page, null); sameCamera(await native(page), beforePick);
    // uncheck() may scroll the viewer; rederive the same projected native ray.
    await page.locator(stage).scrollIntoViewIfNeeded();
    const rect = (await page.locator(stage + ' canvas').boundingBox())!;
    const restoredPoint = await page.evaluate(() => {
      const w = window as any, T = w.THREE, p = w.round20Wing, body = p.scene.getObjectByName('wing-construction-body').children[0];
      return body.getWorldPosition(new T.Vector3()).project(p.camera).toArray();
    });
    await page.mouse.click(rect.x + (restoredPoint[0] + 1) * rect.width / 2, rect.y + (1 - restoredPoint[1]) * rect.height / 2);
    await expect(page.locator(root)).toHaveAttribute('data-wing-part', 'body'); await expect(page.locator(isolate)).not.toBeChecked();
    unchanged(await native(page), baseline); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(hostData);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('isolation keeps keyboard focus, touch controls, framing and resets usable in desktop, phone and embedded hosts', async ({ page }) => {
  await mount(page);
  await page.locator(root).getByRole('button', { name: 'High-Aspect-Ratio', exact: true }).click(); await painted(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-wing-assemble]').click(); await gap(page, 100);
    await page.locator('[data-wing-view="below"]').tap(); await page.locator('[data-wing-select="body"]').tap(); await painted(page);
    const baseline = await native(page, 'all', true), checkbox = page.locator(isolate);
    await checkbox.focus(); await page.keyboard.press('Space'); await expect(checkbox).toBeFocused(); await expect(checkbox).toBeChecked(); await visibility(page, 'body');
    unchanged(await native(page), baseline); sameCamera(await native(page), baseline);
    await page.keyboard.press('Space'); await expect(checkbox).toBeFocused(); await visibility(page, null);
    await checkbox.tap(); await visibility(page, 'body');
    await page.locator('[data-wing-select="primaries"]').tap(); await visibility(page, 'primaries'); await expect(checkbox).toBeChecked();
    const frame = page.locator('[data-wing-frame]'); await frame.focus(); await page.keyboard.press('Enter'); await expect(frame).toBeFocused();
    await expect.poll(async () => (await native(page, 'primaries')).aim).toBeGreaterThan(.999999);
    const framed = await native(page, 'primaries'); contained(framed); unchanged(framed, baseline); expect(framed.targetElevation).toBeLessThan(-.5);
    await page.locator('[data-wing-view="above"]').tap(); await visibility(page, 'primaries'); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '100');
    const viewer = page.locator(stage); await viewer.focus(); const above = await native(page);
    await page.keyboard.press('ArrowRight'); await expect(viewer).toBeFocused(); await expect.poll(async () => (await native(page)).position).not.toEqual(above.position);
    await page.keyboard.press('Equal'); await expect.poll(async () => Math.hypot(...(await native(page)).position)).toBeLessThan(Math.hypot(...above.position));
    await page.keyboard.press('0'); await expect(viewer).toBeFocused(); await expect.poll(async () => (await native(page)).elevation).toBeCloseTo(.78, 6); await visibility(page, 'primaries'); unchanged(await native(page), baseline);
    await page.locator('[data-wing-select="all"]').tap(); await visibility(page, null); await expect(checkbox).not.toBeChecked(); await expect(checkbox).toBeDisabled();
    await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '100'); unchanged(await native(page), baseline);
    await page.locator('[data-wing-select="body"]').tap(); await checkbox.tap(); await visibility(page, 'body');
    await page.locator('[data-wing-assemble]').tap(); await visibility(page, null); await expect(checkbox).not.toBeChecked(); await expect(checkbox).toBeDisabled();
    await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '0'); await expect(page.locator(root)).toHaveAttribute('data-wing-part', 'all');
    await expect.poll(async () => (await native(page)).elevation).toBeCloseTo(.78, 6);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, stage, isolate, '[data-wing-isolate-help]', '[data-wing-select="all"]', '[data-wing-frame]', '[data-wing-assemble]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0); expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wing-assembly]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
