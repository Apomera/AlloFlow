import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene?.getObjectByName('birdlab-wing-construction'))window.round21Wing={scene,camera,renderer,frames:((window.round21Wing||{}).frames||0)+1};return render(scene,camera);};return renderer;};})();",
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const root = '[data-birdlab-wing-assembly]', stage = '[data-wing-construction-stage]', toggle = '[data-wing-section-toggle]', slider = '[data-wing-section-station]';
const models = [
  { id: 'soaring', label: 'Soaring Wings', span: 4.8, pieces: 194 },
  { id: 'elliptical', label: 'Elliptical Wings', span: 2.5, pieces: 184 },
  { id: 'highaspect', label: 'High-Aspect-Ratio', span: 5.2, pieces: 184 },
  { id: 'highspeed', label: 'High-Speed Wings', span: 3.6, pieces: 184 },
  { id: 'aquatic', label: 'Aquatic Wings', span: 1.9, pieces: 184 },
];
async function painted(page: Page) {
  await page.locator(stage).scrollIntoViewIfNeeded(); const frames = await page.evaluate(() => (window as any).round21Wing.frames);
  await expect.poll(() => page.evaluate(() => (window as any).round21Wing.frames)).toBeGreaterThan(frames + 1);
}
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await painted(page);
  await expect.poll(() => page.evaluate(() => { const p = (window as any).round21Wing; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.001);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'wingTypes', wingSel: 'soaring' } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible(); await page.locator(stage).scrollIntoViewIfNeeded();
  await page.waitForFunction("!!window.round21Wing?.scene.getObjectByName('birdlab-wing-section-probe')", null, { timeout: 60_000 });
  await sizing(page, 1280, 1100); await expect(page.locator(toggle)).toBeEnabled();
  await page.evaluate(() => { (window as any).round21Canvas = document.querySelector('[data-wing-construction-stage] canvas'); (window as any).round21Toggle = document.querySelector('[data-wing-section-toggle]'); });
}
async function range(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function station(page: Page, value: number) { await range(page, slider, value); await expect(page.locator(root)).toHaveAttribute('data-wing-station', String(value)); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true'); }
async function gap(page: Page, value: number) { await range(page, '#birdlab-wing-separation', value); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', String(value)); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true'); }

// Independent oracle: THREE.Plane.intersectLine reads actual WORLD triangles.
// It does not call the production intersection routine or infer a cut from boxes.
// Quantization only absorbs Float32 upload rounding in the displayed line buffer.
async function native(page: Page, span: number, station: number, gap = 0, remember = false): Promise<any> {
  return page.evaluate(({ span, station, gap, remember }) => {
    const w = window as any, T = w.THREE, p = w.round21Wing, { scene, camera, renderer } = p;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const model = scene.getObjectByName('birdlab-wing-construction'), guide = scene.getObjectByName('birdlab-wing-section-probe'), line = scene.getObjectByName('birdlab-wing-section-lines');
    const before = w.round21Source, saved = new Map(), objects: string[] = [], geos = new Set<string>(), mats = new Set<string>(), textures = new Set<string>();
    scene.traverse((object: any) => { objects.push(object.uuid); if (object.geometry) geos.add(object.geometry.uuid); for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) { mats.add(material.uuid); for (const value of Object.values(material) as any[]) if (value?.isTexture) textures.add(value.uuid); } });
    let count = 0, bufferError = 0, localError = 0, translationError = 0, matched = 0;
    const expected = new Map<string, any[]>(), actual = new Map<string, any[]>(), hitPieces = new Set<string>(), coplanar: any[] = [], x = span * station / 100 * .7, plane = new T.Plane(new T.Vector3(1, 0, 0), -x);
    const keyPoint = (v: any) => [v.x, v.y, v.z].map(n => Math.round(n * 1e5)).join(',');
    const keySegment = (a: any, b: any) => { const ak = keyPoint(a), bk = keyPoint(b); return ak < bk ? ak + '|' + bk : bk + '|' + ak; };
    const isVisible = (mesh: any) => { for (let node = mesh; node; node = node.parent) if (!node.visible) return false; return true; };
    const groups = ['secondaries', 'primaries', 'body'].map(id => { const group = model.getObjectByName('wing-construction-' + id); return { id, visible: group.visible, position: group.position.toArray(), scale: group.scale.toArray() }; });
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return; count++;
      const attr = mesh.geometry.attributes.position, savedMesh = before?.model === model.uuid ? before.meshes.get(mesh.uuid) : null, points: number[][] = [], local = mesh.matrix.toArray(), side = mesh.userData.partId === 'secondaries' ? -1 : mesh.userData.partId === 'primaries' ? 1 : 0;
      if (savedMesh) { matched++; attr.array.forEach((value: number, i: number) => { bufferError = Math.max(bufferError, Math.abs(value - savedMesh.buffer[i])); }); local.forEach((value: number, i: number) => { localError = Math.max(localError, Math.abs(value - savedMesh.local[i])); }); }
      for (let i = 0; i < attr.count; i++) { const v = new T.Vector3().fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld); points.push(v.toArray()); if (savedMesh) translationError = Math.max(translationError, Math.abs(v.x - savedMesh.points[i][0]), Math.abs(v.y - savedMesh.points[i][1] - side * .98 * (gap - before.gap) / 100), Math.abs(v.z - savedMesh.points[i][2])); }
      saved.set(mesh.uuid, { buffer: Array.from(attr.array), local, points });
      if (mesh.userData.partId === 'body' || !isVisible(mesh)) return;
      const index = mesh.geometry.index, vertices = index ? index.count : attr.count;
      for (let i = 0; i < vertices; i += 3) {
        const triangle = [0, 1, 2].map(j => new T.Vector3().fromBufferAttribute(attr, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld));
        if (triangle.every(v => Math.abs(plane.distanceToPoint(v)) < 1e-8)) { coplanar.push(mesh.uuid); continue; }
        const crossings: any[] = [];
        for (let j = 0; j < 3; j++) { const hit = plane.intersectLine(new T.Line3(triangle[j], triangle[(j + 1) % 3]), new T.Vector3()); if (hit && !crossings.some(v => v.distanceTo(hit) < 1e-8)) crossings.push(hit); }
        if (crossings.length === 2 && crossings[0].distanceTo(crossings[1]) > 1e-8) { expected.set(keySegment(crossings[0], crossings[1]), crossings); hitPieces.add(mesh.uuid); }
      }
    });
    if (remember) { w.round21Source = { model: model.uuid, meshes: saved, gap }; w.round21LineArray = line.geometry.attributes.position.array; }
    const attr = line.geometry.attributes.position, vertices = line.geometry.drawRange.count, localSegments: number[][] = [];
    let planeError = 0;
    for (let i = 0; i < vertices; i += 2) {
      const a = new T.Vector3().fromBufferAttribute(attr, i), b = new T.Vector3().fromBufferAttribute(attr, i + 1); localSegments.push([a.y, a.z, b.y, b.z]);
      a.applyMatrix4(line.matrixWorld); b.applyMatrix4(line.matrixWorld); planeError = Math.max(planeError, Math.abs(a.x - x), Math.abs(b.x - x)); actual.set(keySegment(a, b), [a, b]);
    }
    const svg = Array.from(document.querySelectorAll('[data-wing-section-profile-lines] line')).map((node: any) => ['x1', 'y1', 'x2', 'y2'].map(k => Number(node.getAttribute(k))));
    let svgError = 0, equalScale = 0;
    if (svg.length === localSegments.length && svg.length) {
      let longest = 0, length = 0; localSegments.forEach((s, i) => { const size = Math.hypot(s[2] - s[0], s[3] - s[1]); if (size > length) { length = size; longest = i; } });
      equalScale = Math.hypot(svg[longest][2] - svg[longest][0], svg[longest][3] - svg[longest][1]) / length;
      svg.forEach((s, i) => { const v = localSegments[i]; svgError = Math.max(svgError, Math.abs((s[2] - s[0]) - equalScale * (v[3] - v[1])), Math.abs((s[3] - s[1]) + equalScale * (v[2] - v[0]))); });
    }
    const near = (a: any[], b: any[]) => (a[0].distanceTo(b[0]) < 1e-6 && a[1].distanceTo(b[1]) < 1e-6) || (a[0].distanceTo(b[1]) < 1e-6 && a[1].distanceTo(b[0]) < 1e-6);
    return { model: model.uuid, scene: scene.uuid, camera: camera.uuid, count, matched, bufferError, localError, translationError, groups,
      objects: objects.sort(), geometries: [...geos].sort(), materials: [...mats].sort(), textures: [...textures].sort(), programs: renderer.info.programs.map((program: any) => program.id).sort(), memory: { ...renderer.info.memory },
      position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), rootMatrix: model.matrix.toArray(), helperMatrix: guide.matrix.toArray(), helperVisible: guide.visible,
      section: guide.userData.section, expected: expected.size, actual: actual.size, missing: [...expected.values()].filter(a => ![...actual.values()].some(b => near(a, b))).length, extra: [...actual.values()].filter(a => ![...expected.values()].some(b => near(a, b))).length, coplanar: coplanar.length, hitPieces: hitPieces.size, planeError,
      svgCount: svg.length, svgError, equalScale, capacity: attr.array.length, drawCount: vertices, sameLineArray: !w.round21LineArray || attr.array === w.round21LineArray,
      frames: p.frames, sameCanvas: renderer.domElement === w.round21Canvas, sameToggle: document.querySelector('[data-wing-section-toggle]') === w.round21Toggle,
      live: !renderer.getContext().isContextLost(), shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  }, { span, station, gap, remember });
}
function exact(value: any) {
  expect(value.coplanar).toBe(0); expect(value.missing).toBe(0); expect(value.extra).toBe(0); expect(value.actual).toBe(value.expected);
  expect(value.planeError).toBeLessThan(1e-6); expect(value.section.pieces).toBe(value.hitPieces); expect(value.section.segments).toBe(value.actual); expect(value.svgCount).toBe(value.actual);
  expect(value.svgError).toBeLessThan(.003); if (value.actual) expect(value.equalScale).toBeGreaterThan(1); expect(value.drawCount * 3).toBeLessThanOrEqual(value.capacity);
}
function intact(value: any, before: any) {
  for (const key of ['model', 'scene', 'camera', 'count', 'objects', 'geometries', 'materials', 'textures', 'programs', 'memory', 'rootMatrix', 'helperMatrix', 'capacity']) expect(value[key], key).toEqual(before[key]);
  expect(value.matched).toBe(value.count); expect(value.bufferError).toBe(0); expect(value.localError).toBe(0); expect(value.translationError).toBeLessThan(1e-7); expect(value.sameLineArray).toBe(true);
  expect(value.sameCanvas).toBe(true); expect(value.sameToggle).toBe(true); expect(value.live).toBe(true); expect(value.shaders).toBe(true);
}
function sameCamera(value: any, before: any) { expect(value.position).toEqual(before.position); expect(value.quaternion).toEqual(before.quaternion); }
async function guidePixels(page: Page, remember = false): Promise<any> {
  return page.evaluate(remember => {
    const w = window as any, p = w.round21Wing, { scene, camera, renderer } = p, guide = scene.getObjectByName('birdlab-wing-section-probe'), visibility = scene.children.map((object: any) => ({ object, visible: object.visible })), background = scene.background, fog = scene.fog;
    try {
      visibility.forEach(({ object }: any) => { object.visible = object === guide; }); scene.background = new w.THREE.Color(0); scene.fog = null; renderer.render(scene, camera);
      const gl = renderer.getContext(), bytes = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4), before = w.round21Pixels; gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      let gold = 0, changed = 0; for (let i = 0; i < bytes.length; i += 4) { if (bytes[i] > 60 && bytes[i] > bytes[i + 1] * 1.05 && bytes[i] > bytes[i + 2] * 1.1) gold++; if (before && Math.max(Math.abs(bytes[i] - before[i]), Math.abs(bytes[i + 1] - before[i + 1]), Math.abs(bytes[i + 2] - before[i + 2])) > 10) changed++; }
      if (remember) w.round21Pixels = bytes; return { gold, changed, error: gl.getError() };
    } finally { visibility.forEach(({ object, visible }: any) => { object.visible = visible; }); scene.background = background; scene.fog = fog; renderer.render(scene, camera); }
  }, remember);
}

test('all five probes match independent world-triangle intersections, real pixels and preserved model resources', async ({ page }) => {
  await mount(page); await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'false');
  for (const model of models) {
    if (await page.locator(root).getAttribute('data-wing-model') !== model.id) { const id = (await native(page, model.span, 45)).model; await page.locator(root).getByRole('button', { name: model.label, exact: true }).click(); await painted(page); await expect.poll(async () => (await native(page, model.span, 45)).model).not.toBe(id); }
    await page.locator('[data-wing-assemble]').click(); await painted(page);
    // Turn through the real camera control so the X-normal plane is not exactly
    // edge-on; this matters for the short, thin aquatic construction in pixels.
    await page.locator(stage).focus(); for (let turn = 0; turn < 4; turn++) await page.keyboard.press('ArrowRight'); await painted(page);
    const beforeProbe = await native(page, model.span, 45);
    expect(Math.atan2(beforeProbe.position[0], beforeProbe.position[2])).toBeCloseTo(.64, 6);
    // Warm the selection cage before measuring a fixed set of native resources.
    await page.locator('[data-wing-select="primaries"]').click(); await painted(page);
    await page.locator('[data-wing-select="all"]').click(); await painted(page);
    await page.locator(toggle).click(); await station(page, 45); await painted(page);
    // The pixel oracle temporarily removes fog/background; warm that legitimate
    // material-program variant before taking the strict resource baseline.
    const first = await guidePixels(page, true); expect(first.gold).toBeGreaterThan(5); expect(first.error).toBe(0);
    const baseline = await native(page, model.span, 45, 0, true), host = await page.evaluate(() => JSON.stringify((window as any).__toolData));
    exact(baseline); expect(baseline.count).toBe(model.pieces); expect(baseline.actual).toBeGreaterThan(0); sameCamera(baseline, beforeProbe);
    for (const position of [75, 95, 110, 45]) { await station(page, position); const value = await native(page, model.span, position); exact(value); intact(value, baseline); sameCamera(value, baseline); }
    await station(page, 75); const moved = await guidePixels(page); expect(moved.gold).toBeGreaterThan(5); expect(moved.changed).toBeGreaterThan(10); expect(moved.error).toBe(0);
    await gap(page, 60); exact(await native(page, model.span, 75, 60)); intact(await native(page, model.span, 75, 60), baseline);
    await page.locator('[data-wing-select="body"]').click(); await page.locator('[data-wing-isolate]').check();
    await expect(page.locator('[data-wing-section-status]')).toContainText('No visible wing pieces'); const empty = await native(page, model.span, 75, 60); exact(empty); intact(empty, baseline); expect(empty.actual).toBe(0);
    await page.locator('[data-wing-select="secondaries"]').click(); await station(page, 45); const inner = await native(page, model.span, 45, 60); exact(inner); intact(inner, baseline); expect(inner.actual).toBeGreaterThan(0);
    await page.locator('[data-wing-select="primaries"]').click(); await expect(page.locator('[data-wing-section-status]')).toContainText('No visible wing pieces'); exact(await native(page, model.span, 45, 60));
    await station(page, 95); const outer = await native(page, model.span, 95, 60); exact(outer); intact(outer, baseline); expect(outer.actual).toBeGreaterThan(0); sameCamera(outer, baseline);
    await page.locator('[data-wing-frame]').click(); await painted(page); const framed = await native(page, model.span, 95, 60);
    await page.locator(toggle).click(); await painted(page); sameCamera(await native(page, model.span, 95, 60), framed);
    await page.locator(toggle).click(); await station(page, 95); await painted(page); sameCamera(await native(page, model.span, 95, 60), framed); intact(await native(page, model.span, 95, 60), baseline);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(host);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('section controls stay fresh while rendering is offscreen and support keyboard, touch, host widths and reset', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-wing-assemble]').click(); await painted(page); const home = await native(page, 4.8, 45);
    await page.locator('[data-wing-select="body"]').click(); await painted(page);
    await page.locator('[data-wing-select="all"]').click(); await painted(page);
    const button = page.locator(toggle); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toBeFocused(); await station(page, 45); await painted(page);
    const baseline = await native(page, 4.8, 45, 0, true); exact(baseline); sameCamera(baseline, home);
    await page.locator(slider).focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator(slider)).toBeFocused(); await expect(page.locator(slider)).toHaveValue('46'); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true'); exact(await native(page, 4.8, 46));
    await button.tap(); await expect(button).toHaveAttribute('aria-expanded', 'false'); await painted(page); sameCamera(await native(page, 4.8, 46), baseline);
    await button.tap(); await station(page, 46); await painted(page);
    // Keep the profile and its keyboard control in view, with the entire native
    // canvas offscreen. Input effects must update the SAME geometry while the
    // shared renderer remains asleep; the oracle intentionally never scrolls.
    await page.locator('[data-wing-section-profile]').evaluate(node => { const y = node.getBoundingClientRect().top + scrollY; scrollTo(0, y - 100); });
    await page.locator(slider).focus(); await expect.poll(() => page.locator(stage).evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThan(0);
    await expect.poll(() => page.evaluate(async () => { const w = window as any, start = w.round21Wing.frames; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); return w.round21Wing.frames - start; })).toBe(0);
    const sleeping = await native(page, 4.8, 46);
    await page.keyboard.press('ArrowRight'); await expect(page.locator(slider)).toBeFocused(); await expect(page.locator(slider)).toHaveValue('47'); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true');
    const changed = await native(page, 4.8, 47); exact(changed); sameCamera(changed, sleeping); expect(changed.frames).toBe(sleeping.frames); expect(changed.section.station).toBe(47);
    await gap(page, 60); const separated = await native(page, 4.8, 47, 60); exact(separated); intact(separated, baseline); expect(separated.frames).toBe(sleeping.frames);
    // These controls occupy the other column on desktop. Native click events
    // preserve this profile viewport instead of Playwright scrolling the canvas
    // back onscreen to reach a locator in that column.
    await page.locator('[data-wing-select="body"]').evaluate((node: HTMLButtonElement) => node.click());
    await page.locator('[data-wing-isolate]').evaluate((node: HTMLInputElement) => node.click());
    await expect(page.locator('[data-wing-section-status]')).toContainText('No visible wing pieces');
    expect(await page.locator(stage).evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThan(0);
    const hidden = await native(page, 4.8, 47, 60); exact(hidden); expect(hidden.frames).toBe(sleeping.frames); sameCamera(hidden, sleeping);
    await page.locator('[data-wing-select="all"]').evaluate((node: HTMLButtonElement) => node.click()); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true'); exact(await native(page, 4.8, 47, 60));
    expect((await native(page, 4.8, 47, 60)).frames).toBe(sleeping.frames);
    await painted(page); const resumed = await native(page, 4.8, 47, 60); expect(resumed.frames).toBeGreaterThan(sleeping.frames); exact(resumed); intact(resumed, baseline);
    await page.locator('[data-wing-view="below"]').tap(); await painted(page); const below = await native(page, 4.8, 47, 60); expect(below.position[1]).toBeLessThan(0); exact(below);
    await page.locator(stage).focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator(stage)).toBeFocused(); await painted(page); exact(await native(page, 4.8, 47, 60));
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, stage, toggle, slider, '[data-wing-section-profile]', '[data-wing-section-status]']) { const element = page.locator(selector), box = (await element.boundingBox())!; expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0); expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await element.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1); }
    const chart = await page.locator('[data-wing-section-profile]').evaluate((svg: SVGSVGElement) => Array.from(svg.querySelectorAll('text')).map(text => { const b = text.getBBox(); return { text: text.textContent, x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height }; }));
    for (const label of chart) { expect(label.x, label.text || '').toBeGreaterThanOrEqual(0); expect(label.y, label.text || '').toBeGreaterThanOrEqual(0); expect(label.right, label.text || '').toBeLessThanOrEqual(640); expect(label.bottom, label.text || '').toBeLessThanOrEqual(360); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wing-assembly]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]);
    await page.locator('[data-wing-assemble]').tap(); await painted(page); await expect(button).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator(slider)).toHaveCount(0); await expect(page.locator(root)).toHaveAttribute('data-wing-station', '45'); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '0');
    const reset = await native(page, 4.8, 45); expect(reset.helperVisible).toBe(false); sameCamera(reset, home); expect(reset.sameCanvas).toBe(true); expect(reset.sameToggle).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  // A genuine GPU context-loss event tears the old construction down before the
  // shared viewer's delayed retry. Changing the open inspector during that gap
  // must not call its disposed native writer, and the replacement must reconnect.
  await sizing(page, 390, 390); await page.locator('[data-wing-assemble]').click(); await painted(page);
  await page.locator(toggle).click(); await station(page, 45); await gap(page, 60);
  await page.locator('[data-wing-select="secondaries"]').click(); await page.locator('[data-wing-isolate]').check(); await painted(page);
  const beforeLoss = await native(page, 4.8, 45, 60), savedHost = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  await page.evaluate(() => {
    const w = window as any, p = w.round21Wing, gl = p.renderer.getContext(), loss = gl.getExtension('WEBGL_lose_context');
    if (!loss) throw new Error('Chromium did not expose WEBGL_lose_context');
    const guide = p.scene.getObjectByName('birdlab-wing-section-probe'), line = p.scene.getObjectByName('birdlab-wing-section-lines');
    const record = w.round21Recovery = { canvas: p.renderer.domElement, guide, attribute: line.geometry.attributes.position, version: line.geometry.attributes.position.version,
      events: 0, trusted: false, contextLost: false, disposedGeometries: 0, disposedMaterials: 0 };
    guide.children.forEach((object: any) => { object.geometry.addEventListener('dispose', () => record.disposedGeometries++); object.material.addEventListener('dispose', () => record.disposedMaterials++); });
    record.canvas.addEventListener('webglcontextlost', (event: Event) => {
      record.events++; record.trusted = event.isTrusted; record.contextLost = gl.isContextLost();
      const input = document.querySelector('[data-wing-section-station]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '46');
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { once: true });
    loss.loseContext();
  });
  await page.waitForFunction(() => { const w = window as any; return w.round21Recovery.events === 1 && w.round21Wing.renderer.domElement !== w.round21Recovery.canvas; }, null, { timeout: 20_000 });
  await expect(page.locator(toggle)).toBeEnabled(); await expect(page.locator(slider)).toHaveValue('46'); await painted(page);
  const recovery = await page.evaluate(() => { const w = window as any, r = w.round21Recovery; return { events: r.events, trusted: r.trusted, contextLost: r.contextLost, disposedGeometries: r.disposedGeometries, disposedMaterials: r.disposedMaterials,
    oldVersion: r.attribute.version, beforeVersion: r.version, oldStation: r.guide.userData.section.station, newCanvas: document.querySelector('[data-wing-construction-stage] canvas') === w.round21Wing.renderer.domElement, oldDetached: !r.canvas.isConnected }; });
  expect(recovery).toEqual({ events: 1, trusted: true, contextLost: true, disposedGeometries: 3, disposedMaterials: 3, oldVersion: recovery.beforeVersion, beforeVersion: recovery.beforeVersion, oldStation: 45, newCanvas: true, oldDetached: true });
  const rebuilt = await native(page, 4.8, 46, 60); expect(rebuilt.model).not.toBe(beforeLoss.model); exact(rebuilt); sameCamera(rebuilt, beforeLoss);
  await expect(page.locator(root)).toHaveAttribute('data-wing-isolated', 'secondaries'); await expect(page.locator(root)).toHaveAttribute('data-wing-separation', '60'); await expect(page.locator(toggle)).toHaveAttribute('aria-expanded', 'true');
  expect(rebuilt.sameToggle).toBe(true); expect(rebuilt.live).toBe(true); expect(rebuilt.shaders).toBe(true);
  await page.evaluate(() => { (window as any).round21Canvas = document.querySelector('[data-wing-construction-stage] canvas'); });
  await page.locator('[data-wing-section-profile]').evaluate(node => { const y = node.getBoundingClientRect().top + scrollY; scrollTo(0, y - 100); });
  await page.locator(slider).focus(); await expect.poll(() => page.locator(stage).evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThan(0);
  await expect.poll(() => page.evaluate(async () => { const w = window as any, start = w.round21Wing.frames; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); return w.round21Wing.frames - start; })).toBe(0);
  const recoveredSleeping = await native(page, 4.8, 46, 60); await page.keyboard.press('ArrowRight'); await expect(page.locator(slider)).toHaveValue('47'); await expect(page.locator('[data-wing-mesh-section]')).toHaveAttribute('data-wing-section-ready', 'true');
  const reconnected = await native(page, 4.8, 47, 60); exact(reconnected); expect(reconnected.frames).toBe(recoveredSleeping.frames); sameCamera(reconnected, recoveredSleeping); expect(reconnected.sameCanvas).toBe(true);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(savedHost);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
