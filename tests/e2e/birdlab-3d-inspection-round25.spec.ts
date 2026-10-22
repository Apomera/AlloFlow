import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round25Woodland={scene,camera,renderer};return render(scene,camera);};return renderer;};})();" });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = '[data-birdlab-3d-canvas]', root = '[data-birdlab-anatomy-study]', toggle = '[data-anatomy-frozen-toggle]', opacity = '[data-anatomy-frozen-opacity]';
async function call(page: Page, method: string, value?: unknown): Promise<any> { return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value }); }
async function step(page: Page, frames = 2) { await page.evaluate(frames => { for (let i = 0; i < frames; i++) (window as any).round25Step(100); }, frames); }
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
  await page.locator(canvas).scrollIntoViewIfNeeded(); await step(page);
  await expect.poll(() => page.evaluate(() => { const p = (window as any).round25Woodland; return Math.abs(p.camera.aspect - p.renderer.domElement.clientWidth / p.renderer.domElement.clientHeight); })).toBeLessThan(.002);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; }; window.cancelAnimationFrame = id => { pending.delete(id); }; (window as any).round25Step = (ms: number) => { now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.round25Woodland", null, { polling: 50, timeout: 60_000 });
  await sizing(page, 1280, 1100); await call(page, 'seek', 7.5); await call(page, 'setAnatomyStudy', true); await call(page, 'setAnatomyPart', 'leftWing'); await call(page, 'setAnatomyIsolate', true); await call(page, 'setAnatomyView', 'above'); await step(page);
}
function frozen(before: any, after: any) { for (const key of ['time', 'paused', 'speed', 'position', 'orientation', 'pose', 'wind', 'sightings', 'wildlife', 'animals', 'fieldVisitTime', 'lighting', 'lightingDirectionCustom']) expect(after[key], key).toEqual(before[key]); }
async function inventory(page: Page): Promise<any> {
  return page.evaluate(() => {
    const p = (window as any).round25Woodland, objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>(), originals: any[] = [];
    p.scene.traverse((node: any) => { objects.push(node.uuid); if (node.geometry) geometries.add(node.geometry.uuid); const list = Array.isArray(node.material) ? node.material : node.material ? [node.material] : []; list.forEach((material: any) => { materials.add(material.uuid); Object.values(material).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); }); });
      if (node.isMesh && p.scene.getObjectByName('birdlab-red-tailed-hawk').getObjectById(node.id)) originals.push({ id: node.uuid, geometry: node.geometry.uuid, materials: list.map((m: any) => ({ id: m.uuid, color: m.color?.getHex(), opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite, side: m.side })) }); });
    return { objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort(), originals };
  });
}

// Independent reference walks native material draw groups and indexed faces,
// applies CPU morphs, and combines model/world inverse transforms once. It
// retains Float32 body-frame triangles, not controller-provided geometry.
async function captureOracle(page: Page, part = 'leftWing'): Promise<any> {
  return page.evaluate(part => {
    const w = window as any, T = w.THREE, p = w.round25Woodland; p.scene.updateMatrixWorld(true);
    const bird = p.scene.getObjectByName('birdlab-red-tailed-hawk'), inverse = bird.matrixWorld.clone().invert(), names: Record<string, string[]> = { leftWing: ['left-shoulder'], rightWing: ['right-shoulder'], head: ['hawk-head-gaze'], tail: ['twelve-feather-rust-tail'], feet: ['anatomical-foot--1', 'anatomical-foot-1'] }, flat: number[] = [], sources: any[] = [], edgeSet = new Set<string>(); let morphed = 0, indexed = 0, nonindexed = 0;
    const key = (a: number[], b: number[]) => [a.join(','), b.join(',')].sort().join('|');
    bird.traverse((mesh: any) => {
      if (!mesh.isMesh || mesh.name === 'curved-lower-eyelid') return;
      let selected = part === 'whole'; for (let node = mesh; node; node = node.parent) { if (node.visible === false) return; if ((names[part] || []).includes(node.name)) selected = true; }
      if (!selected) return;
      const g = mesh.geometry, a = g.attributes.position, count = g.index ? g.index.count : a.count, transform = inverse.clone().multiply(mesh.matrixWorld), from = Math.max(0, g.drawRange.start), to = Math.min(count, g.drawRange.start + g.drawRange.count), groups = Array.isArray(mesh.material) ? g.groups : [{ start: 0, count, materialIndex: 0 }], start = flat.length / 3;
      const point = (index: number) => { const base = new T.Vector3().fromBufferAttribute(a, index), v = base.clone(); (g.morphAttributes.position || []).forEach((attribute: any, i: number) => { const weight = mesh.morphTargetInfluences?.[i] || 0; if (weight) { const target = new T.Vector3().fromBufferAttribute(attribute, index); if (!g.morphTargetsRelative) target.sub(base); v.addScaledVector(target, weight); morphed++; } }); return v.applyMatrix4(transform).toArray().map(Math.fround); };
      groups.forEach((group: any) => { const material = Array.isArray(mesh.material) ? mesh.material[group.materialIndex] : mesh.material; if (!material || material.visible === false) return; for (let i = Math.max(from, group.start); i + 2 < Math.min(to, group.start + group.count); i += 3) { const vertices = [0, 1, 2].map(corner => point(g.index ? g.index.getX(i + corner) : i + corner)); vertices.forEach(v => flat.push(...v)); [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => edgeSet.add(key(vertices[a], vertices[b]))); } });
      const length = flat.length / 3 - start; if (length) { sources.push({ id: mesh.uuid, name: mesh.name, triangles: length / 3 }); if (g.index) indexed++; else nonindexed++; }
    });
    w.round25Oracle = { flat: new Float32Array(flat), sources, edgeSet }; return { vertices: flat.length / 3, triangles: flat.length / 9, sources, morphed, indexed, nonindexed };
  }, part);
}
async function agrees(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, p = w.round25Woodland, expected = w.round25Oracle, bird = p.scene.getObjectByName('birdlab-red-tailed-hawk'), group = p.scene.getObjectByName('birdlab-anatomy-frozen-surface'), mesh = group.getObjectByName('birdlab-anatomy-frozen-triangles'), lines = group.getObjectByName('birdlab-anatomy-frozen-creases'); p.scene.updateMatrixWorld(true);
    const a = mesh.geometry.attributes.position.array, b = lines.geometry.attributes.position.array, key = (a: number[], b: number[]) => [a.join(','), b.join(',')].sort().join('|'); let maximum = 0, invalidEdges = 0, matrixError = 0;
    for (let i = 0; i < a.length; i++) maximum = Math.max(maximum, Math.abs(a[i] - expected.flat[i]));
    // Outline endpoints must be actual edges of the captured native faces.
    // A small Float32 transform-roundoff allowance avoids depending on the
    // production order of two mathematically equivalent matrix products.
    const buckets = new Map<string, number[][]>();
    for (let i = 0; i < expected.flat.length; i += 3) { const point = Array.from(expected.flat.slice(i, i + 3)) as number[], bucket = point.map(v => Math.floor(v / 1e-6)).join(','); if (!buckets.has(bucket)) buckets.set(bucket, []); buckets.get(bucket)!.push(point); }
    const nativePoint = (point: number[]) => { const bucket = point.map(v => Math.floor(v / 1e-6)); let best: number[] | null = null, error = Infinity; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (const candidate of buckets.get([bucket[0] + x, bucket[1] + y, bucket[2] + z].join(',')) || []) { const d = Math.max(...candidate.map((v, i) => Math.abs(v - point[i]))); if (d < error) { error = d; best = candidate; } } return error < 3e-7 ? best : null; };
    for (let i = 0; i < b.length; i += 6) { const first = Array.from(b.slice(i, i + 3)) as number[], second = Array.from(b.slice(i + 3, i + 6)) as number[]; if (!expected.edgeSet.has(key(first, second))) { const a = nativePoint(first), c = nativePoint(second); if (!a || !c || !expected.edgeSet.has(key(a, c))) invalidEdges++; } }
    group.matrixWorld.elements.forEach((v: number, i: number) => { matrixError = Math.max(matrixError, Math.abs(v - bird.matrixWorld.elements[i])); });
    return { vertices: a.length / 3, expected: expected.flat.length / 3, maximum, invalidEdges, edgeSegments: b.length / 6, matrixError, visible: group.visible, outsideBird: group.parent === p.scene && !bird.getObjectById(group.id), root: group.uuid, geometries: [mesh.geometry.uuid, lines.geometry.uuid], materials: [mesh.material, lines.material].map((m: any) => ({ id: m.uuid, depthTest: m.depthTest, depthWrite: m.depthWrite, opacity: m.opacity })), shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable), live: !p.renderer.getContext().isContextLost() };
  });
}
function geometryAgrees(value: any, expected: any) { expect(value.vertices).toBe(expected.vertices); expect(value.vertices).toBe(value.expected); expect(value.maximum).toBeLessThan(3e-7); expect(value.invalidEdges).toBe(0); expect(value.edgeSegments).toBeGreaterThan(0); expect(value.matrixError).toBeLessThan(1e-10); expect(value.outsideBird).toBe(true); expect(value.materials.every((m: any) => m.depthTest && !m.depthWrite)).toBe(true); expect(value.live).toBe(true); expect(value.shaders).toBe(true); }
async function pixels(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).round25Woodland, root = p.scene.getObjectByName('birdlab-anatomy-frozen-surface'), gl = p.renderer.getContext(), size = gl.drawingBufferWidth * gl.drawingBufferHeight * 4, shown = root.visible;
    const read = () => { p.renderer.render(p.scene, p.camera); const bytes = new Uint8Array(size); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes); return bytes; };
    try { root.visible = true; const withGhost = read(); root.visible = false; const withoutGhost = read(); let changed = 0; for (let i = 0; i < size; i += 4) if (Math.abs(withGhost[i] - withoutGhost[i]) + Math.abs(withGhost[i + 1] - withoutGhost[i + 1]) + Math.abs(withGhost[i + 2] - withoutGhost[i + 2]) > 15) changed++; return changed; }
    finally { root.visible = shown; p.renderer.render(p.scene, p.camera); }
  });
}
async function ledger(page: Page) { await page.evaluate(() => { const w = window as any, p = w.round25Woodland, root = p.scene.getObjectByName('birdlab-anatomy-frozen-surface'); w.round25Dispose ||= new Map(); root.traverse((node: any) => { for (const resource of [node.geometry, node.material]) if (resource && !w.round25Dispose.has(resource.uuid)) { const record = { id: resource.uuid, kind: resource.isMaterial ? 'material' : 'geometry', count: 0 }; w.round25Dispose.set(resource.uuid, record); resource.addEventListener('dispose', () => record.count++); } }); }); }
async function counts(page: Page): Promise<any[]> { return page.evaluate(() => [...(window as any).round25Dispose.values()]); }

test('frozen native triangles preserve transformed morphs, indexed draw ranges and true face edges with depth-tested pixels and unique resource release', async ({ page }) => {
  await mount(page); const baseline = await inventory(page), before = await call(page, 'getState'), expected = await captureOracle(page); expect(expected.morphed).toBeGreaterThan(0); expect(expected.indexed).toBeGreaterThan(0);
  await call(page, 'pinAnatomyShape'); await step(page); expect(await inventory(page)).toEqual(baseline); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface).toBeUndefined(); frozen(before, await call(page, 'getState'));
  await page.locator(toggle).check(); await step(page); const drawn = await agrees(page); geometryAgrees(drawn, expected); expect(drawn.visible).toBe(true); await ledger(page);
  const added = await inventory(page); expect(added.geometries.length - baseline.geometries.length).toBe(2); expect(added.materials.length - baseline.materials.length).toBe(2); expect(added.objects.length - baseline.objects.length).toBe(3); expect(added.originals).toEqual(baseline.originals); expect(added.textures).toEqual(baseline.textures);
  const meta = (await call(page, 'getState')).anatomyInvestigation.frozenSurface; expect(meta.sourceMeshes).toEqual(expected.sources); expect(meta.triangles).toBe(expected.triangles); expect(meta.edgeSegments).toBe(drawn.edgeSegments);
  for (const time of [35.2, 26]) { await call(page, 'seek', time); await step(page); geometryAgrees(await agrees(page), expected); expect((await call(page, 'getState')).anatomyInvestigation.pinned.time).toBe(7.5); }
  expect(await pixels(page)).toBeGreaterThan(100); const still = await call(page, 'getState');
  for (const value of [0, .7, .35]) { await call(page, 'setAnatomyFrozenOpacity', value); await step(page); const geometry = await agrees(page); geometryAgrees(geometry, expected); expect(geometry.geometries).toEqual(drawn.geometries); expect(geometry.materials.map((m: any) => m.id)).toEqual(drawn.materials.map((m: any) => m.id)); expect(geometry.visible).toBe(value > 0); expect(geometry.materials[0].opacity).toBe(value); frozen(still, await call(page, 'getState')); }
  await call(page, 'setLighting', 'golden'); await step(page); const relit = await call(page, 'getState'); await page.locator(canvas).scrollIntoViewIfNeeded(); await page.locator(canvas).focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await step(page, 12); geometryAgrees(await agrees(page), expected); frozen(relit, await call(page, 'getState')); expect((await inventory(page)).originals).toEqual(baseline.originals);
  await call(page, 'setAnatomyFrozenSurface', false); await call(page, 'setAnatomyFrozenSurface', true); await step(page); expect((await agrees(page)).geometries).toEqual(drawn.geometries); expect((await counts(page)).every((row: any) => row.count === 0)).toBe(true);
  // Temporary native fixtures exercise draw-range, indexed/non-indexed,
  // material-group and hidden-surface policies without modifying model files.
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, p = w.round25Woodland, shoulder = p.scene.getObjectByName('left-shoulder'), plain = new T.MeshBasicMaterial({ color: 0x88ccdd }), hidden = new T.MeshBasicMaterial({ visible: false }), indexed = new T.BufferGeometry();
    indexed.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .03, 0, 0, .03, .03, 0, 0, .03, 0, -.02, .015, 0], 3)); indexed.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]); indexed.addGroup(0, 3, 0); indexed.addGroup(3, 3, 1); indexed.addGroup(6, 3, 0); indexed.setDrawRange(3, 6); indexed.morphTargetsRelative = true; indexed.morphAttributes.position = [new T.Float32BufferAttribute([0, 0, 0, 0, 0, .01, 0, 0, .01, 0, 0, .02, 0, 0, .03], 3)];
    const a = new T.Mesh(indexed, [plain, hidden]); a.name = 'round25-indexed-draw-fixture'; a.morphTargetInfluences[0] = .4; shoulder.add(a);
    const nonindexed = new T.BufferGeometry(); nonindexed.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .01, 0, 0, 0, .01, 0, 0, 0, .01, .01, 0, .01, 0, .01, .01, 0, 0, .02, .01, 0, .02, 0, .01, .02], 3)); nonindexed.setDrawRange(3, 3); const b = new T.Mesh(nonindexed, plain); b.name = 'round25-nonindexed-draw-fixture'; shoulder.add(b); const c = b.clone(); c.name = 'round25-hidden-draw-fixture'; c.visible = false; shoulder.add(c);
  });
  const replacement = await captureOracle(page); expect(replacement.nonindexed).toBeGreaterThan(0); expect(replacement.sources.find((s: any) => s.name === 'round25-indexed-draw-fixture').triangles).toBe(1); expect(replacement.sources.find((s: any) => s.name === 'round25-nonindexed-draw-fixture').triangles).toBe(1); expect(replacement.sources.some((s: any) => s.name === 'round25-hidden-draw-fixture')).toBe(false);
  await call(page, 'pinAnatomyShape'); await step(page); const next = await agrees(page); geometryAgrees(next, replacement); expect(next.root).toBe(drawn.root); expect(next.geometries).not.toEqual(drawn.geometries); expect(next.materials.map((m: any) => m.id)).toEqual(drawn.materials.map((m: any) => m.id)); expect((await counts(page)).filter(row => row.kind === 'geometry').every(row => row.count === 1)).toBe(true); await ledger(page);
  await call(page, 'clearAnatomyShape'); await step(page); expect((await counts(page)).filter(row => row.kind === 'geometry').every(row => row.count === 1)).toBe(true); expect((await counts(page)).filter(row => row.kind === 'material').every(row => row.count === 0)).toBe(true); await expect(page.locator(toggle)).toBeDisabled();
  await captureOracle(page); await call(page, 'pinAnatomyShape'); await step(page); await ledger(page); geometryAgrees(await agrees(page), replacement); await call(page, 'dispose'); expect((await counts(page)).filter(row => row.kind === 'geometry')).toHaveLength(6); expect((await counts(page)).filter(row => row.kind === 'material')).toHaveLength(2); expect((await counts(page)).every(row => row.count === 1)).toBe(true);
});

test('frozen surface touch and keyboard controls preserve clocks and model visibility across regions, studies, play and three accessible hosts', async ({ page }) => {
  await mount(page); const host = await page.evaluate(() => JSON.stringify((window as any).__toolData)); await call(page, 'setAnatomyIsolate', false);
  const visibility = await page.evaluate(() => { const rows: any[] = []; (window as any).round25Woodland.scene.getObjectByName('birdlab-red-tailed-hawk').traverse((mesh: any) => { if (mesh.isMesh) rows.push([mesh.uuid, mesh.visible]); }); return rows; });
  await expect(page.locator(toggle)).toBeDisabled(); await page.locator('[data-anatomy-pin]').click(); await page.locator(toggle).focus(); await page.keyboard.press('Space'); await step(page); await expect(page.locator(toggle)).toBeChecked(); await expect(page.locator(opacity)).toHaveValue('35'); const before = await call(page, 'getState');
  await page.locator(opacity).focus(); await page.keyboard.press('Home'); await expect(page.locator(opacity)).toHaveValue('0'); await step(page); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface.visible).toBe(false); await page.keyboard.press('End'); await expect(page.locator(opacity)).toHaveValue('70'); await page.keyboard.press('ArrowLeft'); await expect(page.locator(opacity)).toHaveValue('69'); frozen(before, await call(page, 'getState'));
  await page.locator('[data-anatomy-moment="approach"]').click(); await page.locator('[data-anatomy-view="above"]').click(); await step(page); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface.visible).toBe(true);
  const browser = page.context().browser()!, cdp = await page.context().newCDPSession(page);
  for (const [viewport, width] of [[1280, 1100], [1280, 430], [390, 390]]) {
    await sizing(page, viewport, width); await page.locator(opacity).scrollIntoViewIfNeeded(); const box = (await page.locator(opacity).boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .35, y: box.y + box.height / 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .65, y: box.y + box.height / 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await step(page); const value = Number(await page.locator(opacity).inputValue()); expect(value).toBeGreaterThan(35); expect(value).toBeLessThan(60);
    const after = await call(page, 'getState'); expect(after.time).toBe(35.2); expect(after.anatomyInvestigation.pinned.time).toBe(7.5); expect(after.anatomyInvestigation.frozenSurface.opacity).toBeCloseTo(value / 100, 7);
    const layout = await page.locator(root).evaluate((node: HTMLElement) => { const bounds = node.getBoundingClientRect(), label = node.querySelector('label[for="birdlab-anatomy-frozen-show"]')!.getBoundingClientRect(); return { scroll: node.scrollWidth - node.clientWidth, page: document.documentElement.scrollWidth - innerWidth, width: bounds.width, label: { width: label.width, height: label.height }, bad: [...node.querySelectorAll('button,input')].filter((element: any) => !element.disabled).map((element: any) => { const rect = element.type === 'checkbox' ? node.querySelector('label[for="' + element.id + '"]')!.getBoundingClientRect() : element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }).filter(rect => rect.width < 43.9 || rect.height < 43.9) }; });
    expect(layout.scroll).toBeLessThanOrEqual(1); expect(layout.page).toBeLessThanOrEqual(1); expect(layout.label.height).toBeGreaterThanOrEqual(44); expect(layout.bad).toEqual([]);
    const axes = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-anatomy-study]'), { runOnly: { type: 'rule', values: ['label', 'button-name', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-allowed-attr', 'aria-required-attr', 'color-contrast', 'duplicate-id-aria'] } })).violations); expect(axes).toEqual([]);
  }
  expect(browser).not.toBeNull(); await cdp.detach();
  await page.locator('[data-anatomy-part="tail"]').click(); await step(page); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface.visible).toBe(false); await expect(page.locator(toggle)).toBeDisabled(); await expect(page.locator('[data-anatomy-frozen-status]')).toContainText('Return'); await page.locator('[data-anatomy-return]').click(); await step(page); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface.visible).toBe(true);
  const saved = (await call(page, 'getState')).anatomyInvestigation.frozenSurface;
  for (const [method, value, restore] of [['setCamera', 'robin', 'orbit'], ['setMode', 'free', 'guided']] as const) { await call(page, method, value); await step(page); expect((await call(page, 'getState')).anatomyInvestigation).toBeNull(); expect(await page.evaluate(() => (window as any).round25Woodland.scene.getObjectByName('birdlab-anatomy-frozen-surface').visible)).toBe(false); await call(page, method, restore); await step(page); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface).toEqual(saved); }
  await call(page, 'setAnatomyIsolate', true); await call(page, 'setPaused', false); await step(page, 3); await call(page, 'setPaused', true); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await page.evaluate(() => { const rows: any[] = []; (window as any).round25Woodland.scene.getObjectByName('birdlab-red-tailed-hawk').traverse((mesh: any) => { if (mesh.isMesh) rows.push([mesh.uuid, mesh.visible]); }); return rows; })).toEqual(visibility);
  for (const study of ['setStudyOverlay', 'setCourseLens', 'setAttitudeLens', 'setLightStudy', 'setPerspectiveStudy', 'inspectWingbeat']) { await call(page, 'setAnatomyStudy', true); await call(page, study, true); await step(page); expect((await call(page, 'getState')).anatomyStudy).toBe(false); expect(await page.evaluate(() => (window as any).round25Woodland.scene.getObjectByName('birdlab-anatomy-frozen-surface').visible)).toBe(false); if (study === 'inspectWingbeat') await call(page, 'closeWingbeat'); }
  await call(page, 'setAnatomyStudy', true); await page.locator('[data-anatomy-clear]').click(); await expect(page.locator('[data-anatomy-pin]')).toBeFocused(); await expect(page.locator(toggle)).toBeDisabled(); expect((await call(page, 'getState')).anatomyInvestigation.frozenSurface.triangles).toBe(0); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(host);
});
