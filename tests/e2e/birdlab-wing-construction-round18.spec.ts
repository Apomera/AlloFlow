import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene&&scene.isScene&&scene.getObjectByName('birdlab-wing-construction'))window.round18Wing={scene,camera,renderer,frames:((window.round18Wing||{}).frames||0)+1};return render(scene,camera);};return renderer;};})();`,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const root = '[data-birdlab-wing-assembly]';
const stage = '[data-wing-construction-stage]';
const parts = ['secondaries', 'primaries', 'body'] as const;
const models = [
  { id: 'soaring', label: 'Soaring Wings', outer: 94 },
  { id: 'elliptical', label: 'Elliptical Wings', outer: 84 },
  { id: 'highaspect', label: 'High-Aspect-Ratio', outer: 84 },
  { id: 'highspeed', label: 'High-Speed Wings', outer: 84 },
  { id: 'aquatic', label: 'Aquatic Wings', outer: 84 },
];

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => {
    node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => {
    const probe = (window as any).round18Wing;
    return probe ? Math.abs(probe.camera.aspect - probe.renderer.domElement.clientWidth / probe.renderer.domElement.clientHeight) : 1;
  })).toBeLessThan(.001);
}

async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'wingTypes', wingSel: 'soaring' } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible(); await page.locator(stage).scrollIntoViewIfNeeded();
  await page.waitForFunction("!!window.round18Wing?.scene.getObjectByName('birdlab-wing-construction')", null, { timeout: 60_000 });
  await sizing(page, 1280, 1100);
  await page.locator('[data-wing-select="body"]').click(); await expect(page.locator('[data-wing-frame]')).toBeEnabled();
  await page.locator('[data-wing-assemble]').click(); await page.locator(stage).scrollIntoViewIfNeeded();
  await page.evaluate(() => { (window as any).round18WingCanvas = document.querySelector('[data-wing-construction-stage] canvas'); });
}

async function separation(page: Page, value: number) {
  await page.locator('#birdlab-wing-separation').evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(value));
  await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).round18Wing.scene.getObjectByName('birdlab-wing-construction').userData.separation)).toBe(value);
}

// Keep copied native vertex positions and identities in the browser. The oracle
// compares every vertex after group motion; it does not reuse the scene callback.
async function remember(page: Page) {
  await page.locator(stage).scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, { scene, camera, renderer } = w.round18Wing, T = w.THREE;
    scene.updateMatrixWorld(true); const model = scene.getObjectByName('birdlab-wing-construction'), meshes = new Map();
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      const attribute = mesh.geometry.attributes.position, positions: number[][] = [];
      for (let index = 0; index < attribute.count; index++) positions.push(new T.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld).toArray());
      meshes.set(mesh.uuid, { positions, attribute: Array.from(attribute.array), matrix: mesh.matrix.toArray(), geometry: mesh.geometry.uuid, material: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material: any) => material.uuid) });
    });
    w.round18WingBaseline = { model: model.uuid, meshes };
    const objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>();
    scene.traverse((object: any) => { objects.push(object.uuid); if (object.geometry) geometries.add(object.geometry.uuid); for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) materials.add(material.uuid); });
    return { model: model.uuid, scene: scene.uuid, camera: camera.uuid, canvasSame: renderer.domElement === w.round18WingCanvas,
      objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort() };
  });
}

async function native(page: Page, gap: number, part = 'all') {
  await page.locator(stage).scrollIntoViewIfNeeded();
  return page.evaluate(({ gap, part }) => {
    const w = window as any, T = w.THREE, { scene, camera, renderer, frames } = w.round18Wing;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const model = scene.getObjectByName('birdlab-wing-construction'), baseline = w.round18WingBaseline;
    const objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>();
    scene.traverse((object: any) => { objects.push(object.uuid); if (object.geometry) geometries.add(object.geometry.uuid); for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) materials.add(material.uuid); });
    let translationError = 0, geometryError = 0, localError = 0, allVisible = true, matched = 0;
    const selectedBox = new T.Box3(), groups: any[] = []; let maxX = 0, maxY = 0, minZ = Infinity, maxZ = -Infinity;
    for (const id of ['secondaries', 'primaries', 'body']) {
      const group = model.getObjectByName('wing-construction-' + id); let count = 0;
      const direction = id === 'secondaries' ? -1 : id === 'primaries' ? 1 : 0;
      group.traverse((mesh: any) => {
        if (!mesh.isMesh) return; count++; allVisible &&= mesh.visible;
        const attribute = mesh.geometry.attributes.position, saved = baseline?.model === model.uuid ? baseline.meshes.get(mesh.uuid) : null;
        if (saved) {
          matched++; if (saved.geometry !== mesh.geometry.uuid || JSON.stringify(saved.material) !== JSON.stringify((Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material: any) => material.uuid))) geometryError = Infinity;
          for (let index = 0; index < attribute.array.length; index++) geometryError = Math.max(geometryError, Math.abs(attribute.array[index] - saved.attribute[index]));
          mesh.matrix.toArray().forEach((value: number, index: number) => { localError = Math.max(localError, Math.abs(value - saved.matrix[index])); });
        }
        for (let index = 0; index < attribute.count; index++) {
          const point = new T.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld);
          if (saved) {
            const expected = saved.positions[index];
            translationError = Math.max(translationError, Math.abs(point.x - expected[0]), Math.abs(point.y - expected[1] - direction * .70 * 1.4 * gap / 100), Math.abs(point.z - expected[2]));
          }
          if (part === 'all' || part === id) { selectedBox.expandByPoint(point); const ndc = point.clone().project(camera); maxX = Math.max(maxX, Math.abs(ndc.x)); maxY = Math.max(maxY, Math.abs(ndc.y)); minZ = Math.min(minZ, ndc.z); maxZ = Math.max(maxZ, ndc.z); }
        }
      });
      groups.push({ id, count, scale: group.scale.toArray(), position: group.position.toArray(), keepScale: group.userData.noSelectionScale, pickIds: (() => { const ids = new Set(); group.traverse((mesh: any) => { if (mesh.isMesh) ids.add(mesh.userData.partId); }); return [...ids]; })() });
    }
    const cage = scene.children.find((object: any) => object.type === 'BoxHelper'), cageBox = new T.Box3();
    if (cage?.visible) { const attribute = cage.geometry.attributes.position; for (let index = 0; index < attribute.count; index++) cageBox.expandByPoint(new T.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(cage.matrixWorld)); }
    const center = selectedBox.getCenter(new T.Vector3()), aim = center.clone().sub(camera.position).normalize();
    return { model: model.uuid, scene: scene.uuid, camera: camera.uuid, canvasSame: renderer.domElement === w.round18WingCanvas,
      objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), groups,
      rootScale: model.scale.toArray(), rootQuaternion: model.quaternion.toArray(), translationError, geometryError, localError, matched, allVisible,
      box: { min: selectedBox.min.toArray(), max: selectedBox.max.toArray() }, cage: { visible: cage?.visible, min: cageBox.min.toArray(), max: cageBox.max.toArray() },
      projection: { maxX, maxY, minZ, maxZ }, cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray(), aimDot: camera.getWorldDirection(new T.Vector3()).dot(aim),
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls, frames,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, { gap, part });
}

function identity(actual: any, baseline: any) {
  for (const key of ['model', 'scene', 'camera', 'objects', 'geometries', 'materials']) expect(actual[key], key).toEqual(baseline[key]);
  expect(actual.canvasSame).toBe(true);
}
function contained(value: any) {
  expect(value.projection.maxX).toBeLessThan(1); expect(value.projection.maxY).toBeLessThan(1);
  expect(value.projection.minZ).toBeGreaterThan(-1); expect(value.projection.maxZ).toBeLessThan(1);
}
function closeArray(actual: number[], expected: number[], tolerance = 1e-6) {
  expect(actual).toHaveLength(expected.length); actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThan(tolerance));
}
async function settled(page: Page, gap: number, part: string, baseline: any) {
  await expect.poll(async () => (await native(page, gap, part)).translationError).toBeLessThan(1e-7);
  const value = await native(page, gap, part); identity(value, baseline);
  expect(value.live).toBe(true); expect(value.calls).toBeGreaterThan(0); expect(value.shaders).toBe(true);
  expect(value.allVisible).toBe(true); expect(value.geometryError).toBe(0); expect(value.localError).toBe(0);
  expect(value.matched).toBe(value.groups.reduce((sum: number, group: any) => sum + group.count, 0));
  closeArray(value.rootScale, [.7, .7, .7]); closeArray(value.rootQuaternion, [0, 0, 0, 1]);
  value.groups.forEach((group: any) => { closeArray(group.scale, [1, 1, 1]); expect(group.keepScale).toBe(true); expect(group.pickIds).toEqual([group.id]); closeArray(group.position, [0, (group.id === 'secondaries' ? -1 : group.id === 'primaries' ? 1 : 0) * 1.4 * gap / 100, 0]); });
  return value;
}

async function frame(page: Page, part: string, gap: number, baseline: any) {
  await page.locator('[data-wing-select="' + part + '"]').click(); await page.locator('[data-wing-frame]').click();
  await expect.poll(async () => (await native(page, gap, part)).aimDot).toBeGreaterThan(.999999);
  await expect.poll(async () => { const value = await native(page, gap, part); return Math.max(...value.box.min.map((n: number, i: number) => Math.abs(n - value.cage.min[i])), ...value.box.max.map((n: number, i: number) => Math.abs(n - value.cage.max[i]))); }).toBeLessThan(1e-5);
  const value = await settled(page, gap, part, baseline); contained(value); expect(value.cage.visible).toBe(true); return value;
}

test('native wing regions separate by rigid model-coordinate translations, remain pickable and framed, and reuse resources until a model is replaced', async ({ page }) => {
  await mount(page); let baseline = await remember(page), state = await settled(page, 0, 'all', baseline); contained(state);
  for (const part of parts) {
    const previousCamera = state.cameraPosition;
    await page.locator('[data-wing-select="' + part + '"]').click(); await expect(page.locator(root)).toHaveAttribute('data-wing-part', part);
    state = await settled(page, 0, part, baseline); closeArray(state.cameraPosition, previousCamera);
    await expect(page.locator('[data-wing-piece-count]')).toHaveText(String(part === 'secondaries' ? 98 : part === 'primaries' ? 94 : 2));
  }
  const before = await native(page, 0, 'all'); await separation(page, 50); state = await settled(page, 50, 'all', baseline); closeArray(state.cameraPosition, before.cameraPosition);
  await separation(page, 100); await settled(page, 100, 'all', baseline);
  for (const part of parts) await frame(page, part, 100, baseline);

  // Pick a projected vertex-derived mesh centre only after an independent
  // raycast proves that the visible first hit belongs to the intended region.
  await page.locator('[data-wing-select="all"]').click(); await page.locator(stage).scrollIntoViewIfNeeded();
  await expect.poll(async () => (await native(page, 100, 'all')).cage.visible).toBe(false);
  const pick = await page.evaluate(() => {
    const w = window as any, T = w.THREE, { scene, camera, renderer } = w.round18Wing, model = scene.getObjectByName('birdlab-wing-construction');
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); const meshes: any[] = []; model.traverse((mesh: any) => { if (mesh.isMesh) meshes.push(mesh); });
    const rect = renderer.domElement.getBoundingClientRect(), ray = new T.Raycaster();
    for (const mesh of meshes.filter(mesh => mesh.userData.partId === 'primaries')) {
      const box = new T.Box3(); const attribute = mesh.geometry.attributes.position;
      for (let index = 0; index < attribute.count; index++) box.expandByPoint(new T.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld));
      const projected = box.getCenter(new T.Vector3()).project(camera);
      if (Math.abs(projected.x) > .85 || Math.abs(projected.y) > .80) continue;
      ray.setFromCamera(new T.Vector2(projected.x, projected.y), camera); const hits = ray.intersectObjects(meshes, false);
      if (hits[0]?.object.userData.partId === 'primaries') return { x: rect.left + (projected.x + 1) * rect.width / 2, y: rect.top + (1 - projected.y) * rect.height / 2 };
    }
    return null;
  });
  expect(pick).not.toBeNull(); await page.mouse.click(pick!.x, pick!.y);
  await expect(page.locator(root)).toHaveAttribute('data-wing-part', 'primaries'); await expect(page.locator('[data-wing-select="primaries"]')).toHaveAttribute('aria-pressed', 'true');
  await settled(page, 100, 'primaries', baseline); await expect(page.locator('[data-wing-construction-reading]')).toContainText('model mesh, not a feather count');
  await page.locator('[data-wing-assemble]').click(); await separation(page, 0); state = await settled(page, 0, 'all', baseline); contained(state); expect(state.cage.visible).toBe(false);
  const still = state; await expect.poll(async () => (await native(page, 0, 'all')).frames).toBeGreaterThan(still.frames + 2); state = await settled(page, 0, 'all', baseline); closeArray(state.cameraPosition, still.cameraPosition); closeArray(state.cameraQuaternion, still.cameraQuaternion);

  for (const model of models.slice(1)) {
    const old = baseline.model; await page.locator(root).getByRole('button', { name: model.label, exact: true }).click();
    await expect(page.locator(root)).toHaveAttribute('data-wing-model', model.id); await page.locator(stage).scrollIntoViewIfNeeded();
    await page.waitForFunction(old => (window as any).round18Wing.scene.getObjectByName('birdlab-wing-construction').uuid !== old, old);
    const next = await remember(page); expect(next.canvasSame).toBe(true); expect(next.scene).toBe(baseline.scene); expect(next.camera).toBe(baseline.camera); expect(next.model).not.toBe(old); baseline = next;
    state = await settled(page, 0, 'all', baseline); contained(state); expect(state.groups.map((group: any) => group.count)).toEqual([98, model.outer, 2]);
    await separation(page, 75); for (const part of ['secondaries', 'primaries']) { await expect(page.locator('[data-wing-select="' + part + '"]')).toBeEnabled(); await frame(page, part, 75, baseline); await expect(page.locator('[data-wing-piece-count]')).toHaveText(String(part === 'secondaries' ? 98 : model.outer)); }
    await page.locator('[data-wing-assemble]').click(); await separation(page, 0); await settled(page, 0, 'all', baseline);
  }
  await page.evaluate(() => {
    const w = window as any, resources = new Map(); w.round18Wing.scene.getObjectByName('birdlab-wing-construction').traverse((mesh: any) => { if (mesh.geometry) resources.set(mesh.geometry.uuid, mesh.geometry); for (const material of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) resources.set(material.uuid, material); });
    w.round18WingDisposals = [...resources.values()].map((resource: any) => { const record = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => record.count++); return record; });
  });
  await harness.unmount(page); expect(await page.evaluate(() => (window as any).round18WingDisposals.every((record: any) => record.count === 1))).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wing construction remains a stable keyboard-controlled viewer with readable controls at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const reset = page.locator('[data-wing-assemble]'); await reset.focus(); await page.keyboard.press('Enter'); await expect(reset).toBeFocused();
    const baseline = await remember(page), outer = page.locator('[data-wing-select="primaries"]'); await outer.focus(); await page.keyboard.press('Enter'); await expect(outer).toBeFocused(); await expect(outer).toHaveAttribute('aria-pressed', 'true');
    const input = page.locator('#birdlab-wing-separation'); await input.focus(); await page.keyboard.press('Home'); for (let index = 0; index < 5; index++) await page.keyboard.press('ArrowRight');
    await expect(input).toBeFocused(); await expect(input).toHaveValue('25'); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '25'); await settled(page, 25, 'primaries', baseline);
    const inner = page.locator('[data-wing-select="secondaries"]'); await inner.focus(); await page.keyboard.press('Space'); await expect(inner).toBeFocused(); await expect(page.locator('[data-wing-piece-count]')).toHaveText('98');
    const frameButton = page.locator('[data-wing-frame]'); await frameButton.focus(); await page.keyboard.press('Enter'); await expect(frameButton).toBeFocused(); await expect.poll(async () => (await native(page, 25, 'secondaries')).aimDot).toBeGreaterThan(.999999); contained(await settled(page, 25, 'secondaries', baseline));
    const viewer = page.locator(stage); await viewer.focus(); const initial = await native(page, 25, 'all'); await page.keyboard.press('ArrowRight');
    await expect.poll(async () => JSON.stringify((await native(page, 25, 'all')).cameraQuaternion)).not.toBe(JSON.stringify(initial.cameraQuaternion)); await expect(viewer).toBeFocused();
    await page.keyboard.press('Equal'); await page.keyboard.press('0'); await expect(viewer).toBeFocused(); contained(await settled(page, 25, 'all', baseline));
    const highAspect = page.locator(root).getByRole('button', { name: 'High-Aspect-Ratio', exact: true }); await highAspect.focus(); await page.keyboard.press('Enter'); await expect(highAspect).toBeFocused(); await expect(page.locator(root)).toHaveAttribute('data-wing-model', 'highaspect');
    await page.locator(stage).scrollIntoViewIfNeeded(); await page.waitForFunction(old => (window as any).round18Wing.scene.getObjectByName('birdlab-wing-construction').uuid !== old, baseline.model);
    await frameButton.focus(); await page.keyboard.press('Enter'); await expect(frameButton).toBeFocused();
    await expect.poll(async () => (await native(page, 25, 'secondaries')).aimDot).toBeGreaterThan(.999999); contained(await native(page, 25, 'secondaries'));
    await reset.focus(); await page.keyboard.press('Enter'); await expect(reset).toBeFocused(); await expect(input).toHaveValue('0'); await expect(page.locator('[data-wing-select="all"]')).toHaveAttribute('aria-pressed', 'true'); await expect(frameButton).toBeDisabled();
    await expect.poll(() => page.evaluate(() => document.querySelector('[data-wing-construction-stage] canvas') === (window as any).round18WingCanvas)).toBe(true);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, stage, '#birdlab-wing-separation', '[data-wing-construction-reading]', '[data-wing-select="all"]', '[data-wing-assemble]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!; expect(box.width, selector).toBeGreaterThan(0); expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect((await viewer.boundingBox())!.height).toBeGreaterThan(150);
    const labels = await page.locator(root).evaluate(element => [...element.querySelectorAll('button,label,output,.wing-construction-reading p,.wing-construction-limit')].map(node => ({ text: node.textContent, overflow: node.scrollWidth - node.clientWidth, size: parseFloat(getComputedStyle(node).fontSize) })));
    for (const label of labels) { expect(label.overflow, label.text || '').toBeLessThanOrEqual(1); expect(label.size, label.text || '').toBeGreaterThanOrEqual(10); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wing-assembly]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    // Put the same starting variant back for the next host-width context.
    await page.locator(root).getByRole('button', { name: 'Soaring Wings', exact: true }).click(); await expect(page.locator(root)).toHaveAttribute('data-wing-model', 'soaring'); await page.locator(stage).scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const model = (window as any).round18Wing.scene.getObjectByName('birdlab-wing-construction'); let count = 0; model.getObjectByName('wing-construction-primaries').traverse((mesh: any) => { if (mesh.isMesh) count++; }); return count === 94; });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
