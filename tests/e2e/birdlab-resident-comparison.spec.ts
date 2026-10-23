import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Native renderer evidence, independent CPU face traversal and real input.
// Temporary, named topology fixtures are removed before asset preservation checks.
test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.residentCompareProbe={scene,camera,renderer};return render(scene,camera);};return renderer;};})();",
});
const report = resolve('reports/birdlab-resident-comparison-2026-10-22');
const previews = resolve(report, 'previews');
const canvas = '[data-birdlab-3d-canvas]', panel = '[data-resident-comparison-panel]';
const pin = '[data-resident-comparison-pin]', clear = '[data-resident-comparison-clear]';
const toggle = '[data-resident-comparison-toggle]', opacity = '[data-resident-comparison-opacity]';
const ids = ['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal',
  'darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', 'americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];
const macroSpecies = [{ id: 'americanGoldfinch', flight: 18 }, { id: 'easternBluebird', flight: 22.3 },
  { id: 'whiteThroatedSparrow', flight: 12.97 }];
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value',
  'aria-required-children', 'aria-required-parent', 'nested-interactive'];
test.beforeAll(async () => { mkdirSync(previews, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, count = 2) {
  await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).residentCompareStep(100); }, count);
}
async function resize(page: Page, width: number, host: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, host) => {
    node.style.width = host + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.waitForFunction(() => {
    const w = window as any, node = document.querySelector('[data-birdlab-3d-canvas]');
    if (!node || !w.residentCompareProbe) return false;
    const rect = node.getBoundingClientRect();
    return Math.abs(w.residentCompareProbe.camera.aspect - Math.round(rect.width) / Math.round(rect.height)) < 1e-8;
  });
  await step(page);
}
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).residentCompareStep = (ms: number) => {
      now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now));
    };
    (window as any).residentComparePending = () => pending.size;
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blBadges: {}, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.residentCompareProbe", null, { polling: 50, timeout: 60_000 });
  await resize(page, 1280, 1100); await call(page, 'seek', 0); await step(page); await installOracle(page); return errors;
}
function closeArray(actual: number[], expected: number[], digits = 8) {
  expect(actual).toHaveLength(expected.length); actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], digits));
}
function frozen(before: any, after: any, paused = true) {
  for (const key of ['time', 'speed', 'position', 'orientation', 'pose', 'wildlife', 'fieldVisitTime', 'sightings', ...(paused ? ['paused'] : [])]) {
    expect(after[key], key).toEqual(before[key]);
  }
}
async function installOracle(page: Page) {
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, baselines = new Map();
    const rootFor = (id: string) => w.residentCompareProbe.scene.getObjectByName('woodland-' + id);
    function model(id: string) {
      const root = rootFor(id), nodes: any[] = [], materials: any[] = []; let hash = 2166136261;
      const bytes = (array: any) => { for (const byte of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) hash = Math.imul(hash ^ byte, 16777619); };
      root.traverse((node: any) => {
        const geometry = node.geometry, attributes = geometry ? Object.entries(geometry.attributes).map(([key, attribute]: any) => [key, attribute, attribute.array]) : [];
        const morphs = geometry ? Object.entries(geometry.morphAttributes).flatMap(([key, list]: any) => list.map((attribute: any, index: number) => [key, index, attribute, attribute.array])) : [];
        attributes.forEach((row: any) => bytes(row[2])); morphs.forEach((row: any) => bytes(row[3])); if (geometry?.index) bytes(geometry.index.array);
        for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.push({ id: material.uuid, color: material.color?.getHex(), opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, side: material.side, visible: material.visible, roughness: material.roughness, metalness: material.metalness });
        nodes.push({ node, geometry, material: node.material, attributes, morphs, index: geometry?.index, indices: geometry?.index?.array });
      });
      return { root, nodes, materials, hash: hash >>> 0 };
    }
    w.residentCompareRemember = (id: string) => {
      const value = model(id), resources = new Set<any>();
      value.nodes.forEach(({ geometry, material }: any) => { if (geometry) resources.add(geometry); for (const item of Array.isArray(material) ? material : material ? [material] : []) resources.add(item); });
      const disposals = new Map<any, number>(); resources.forEach(item => { disposals.set(item, 0); item.addEventListener('dispose', () => disposals.set(item, disposals.get(item)! + 1)); });
      baselines.set(id, { ...value, disposals });
    };
    w.residentCompareModel = (id: string) => {
      const value = model(id), previous = baselines.get(id); let same = !!previous && previous.root === value.root && previous.nodes.length === value.nodes.length;
      value.nodes.forEach((entry: any, index: number) => {
        const old = previous?.nodes[index]; if (!old || entry.node !== old.node || entry.geometry !== old.geometry || entry.material !== old.material || entry.index !== old.index || entry.indices !== old.indices || entry.attributes.length !== old.attributes.length || entry.morphs.length !== old.morphs.length) same = false;
        for (const key of ['attributes', 'morphs']) entry[key].forEach((row: any, offset: number) => { const a = old?.[key][offset]; if (!a || row.length !== a.length || row.some((item: any, i: number) => item !== a[i])) same = false; });
      });
      return { root: value.root.uuid, hash: value.hash, same, materialsUnchanged: !!previous && JSON.stringify(value.materials) === JSON.stringify(previous.materials), disposals: previous ? [...previous.disposals.values()] : [] };
    };
    w.residentCompareCapture = (id: string, part: string, save: boolean) => {
      const p = w.residentCompareProbe, root = rootFor(id), shared = !!root.userData.speciesId;
      p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
      const names: Record<string, string> = shared ? { head: 'woodland-head', wing: 'woodland-right-wing', tail: 'woodland-tail' }
        : { head: id + '-head', wing: id + '-wing-1', tail: id + '-tail' };
      const selected = part === 'whole' ? root : root.getObjectByName(names[part]);
      const inverse = root.matrixWorld.clone().invert(), flat: number[] = [], world: number[] = [], sources: any[] = [], edgeSet = new Set<string>();
      let morphed = 0, indexed = 0, nonindexed = 0;
      const key = (a: number[], b: number[]) => [a.join(','), b.join(',')].sort().join('|');
      selected.traverse((mesh: any) => {
        if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
        for (let node = mesh; node; node = node.parent) if (!node.visible) return;
        const g = mesh.geometry, a = g.attributes.position, total = g.index ? g.index.count : a.count;
        const start = Math.max(0, g.drawRange.start), end = Math.min(total, g.drawRange.start + g.drawRange.count);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const groups = Array.isArray(mesh.material) ? g.groups : [{ start: 0, count: total, materialIndex: 0 }], before = flat.length;
        for (const group of groups) {
          if (!materials[group.materialIndex || 0]?.visible) continue;
          for (let face = Math.max(start, group.start); face + 2 < Math.min(end, group.start + group.count); face += 3) {
            const triangle: number[][] = [];
            for (let corner = 0; corner < 3; corner++) {
              const index = g.index ? g.index.getX(face + corner) : face + corner;
              const base = new T.Vector3().fromBufferAttribute(a, index), point = base.clone();
              (g.morphAttributes.position || []).forEach((attribute: any, offset: number) => {
                const weight = mesh.morphTargetInfluences?.[offset] || 0; if (!weight) return;
                const target = new T.Vector3().fromBufferAttribute(attribute, index); if (!g.morphTargetsRelative) target.sub(base);
                point.addScaledVector(target, weight); morphed++;
              });
              const global = point.applyMatrix4(mesh.matrixWorld); world.push(...global.toArray());
              const local = global.clone().applyMatrix4(inverse).toArray().map(Math.fround); flat.push(...local); triangle.push(local);
            }
            for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) edgeSet.add(key(triangle[a], triangle[b]));
          }
        }
        const count = (flat.length - before) / 9; if (count) { sources.push({ name: mesh.name, triangles: count }); if (g.index) indexed++; else nonindexed++; }
      });
      const bounds = (values: number[]) => { const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < values.length; i++) { min[i % 3] = Math.min(min[i % 3], values[i]); max[i % 3] = Math.max(max[i % 3], values[i]); } return { min, max, center: min.map((v, i) => (v + max[i]) / 2), size: min.map((v, i) => max[i] - v) }; };
      const value = { flat: new Float32Array(flat), world, sources, edgeSet, local: bounds(flat), bounds: bounds(world), root, id, part };
      w.residentCompareCurrent = value; if (save) w.residentCompareOracle = value;
      return { id, part, sources, triangles: flat.length / 9, vertices: flat.length / 3, local: value.local, bounds: value.bounds, morphed, indexed, nonindexed };
    };
  });
}
async function captureOracle(page: Page, id: string, part: string, save = true): Promise<any> {
  return page.evaluate(({ id, part, save }) => (window as any).residentCompareCapture(id, part, save), { id, part, save });
}
async function model(page: Page, id: string): Promise<any> { return page.evaluate(id => (window as any).residentCompareModel(id), id); }
async function inventory(page: Page) {
  return page.evaluate(() => {
    const objects: string[] = [], geometries = new Set<string>(), materials = new Set<string>(), textures = new Set<string>();
    (window as any).residentCompareProbe.scene.traverse((node: any) => { objects.push(node.uuid); if (node.geometry) geometries.add(node.geometry.uuid); for (const item of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) { materials.add(item.uuid); Object.values(item).forEach((value: any) => { if (value?.isTexture) textures.add(value.uuid); }); } });
    return { objects: objects.sort(), geometries: [...geometries].sort(), materials: [...materials].sort(), textures: [...textures].sort() };
  });
}
async function agrees(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, p = w.residentCompareProbe, expected = w.residentCompareOracle, root = expected.root;
    p.scene.updateMatrixWorld(true); const group = p.scene.getObjectByName('birdlab-resident-frozen-surface');
    const mesh = group.getObjectByName('birdlab-resident-frozen-triangles'), lines = group.getObjectByName('birdlab-resident-frozen-creases');
    const positions = mesh.geometry.attributes.position.array, edges = lines.geometry.attributes.position.array;
    let maximum = 0, matrixError = 0, invalidEdges = 0;
    for (let i = 0; i < positions.length; i++) maximum = Math.max(maximum, Math.abs(positions[i] - expected.flat[i]));
    const key = (a: number[], b: number[]) => [a.join(','), b.join(',')].sort().join('|');
    const buckets = new Map<string, number[][]>();
    for (let i = 0; i < expected.flat.length; i += 3) { const point = Array.from(expected.flat.slice(i, i + 3)) as number[], key = point.map(v => Math.floor(v / 1e-6)).join(','); if (!buckets.has(key)) buckets.set(key, []); buckets.get(key)!.push(point); }
    const nativePoint = (point: number[]) => { const bucket = point.map(v => Math.floor(v / 1e-6)); let closest: number[] | null = null, error = Infinity; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (const candidate of buckets.get([bucket[0] + x, bucket[1] + y, bucket[2] + z].join(',')) || []) { const delta = Math.max(...candidate.map((v, i) => Math.abs(v - point[i]))); if (delta < error) { error = delta; closest = candidate; } } return error < 3e-7 ? closest : null; };
    for (let i = 0; i < edges.length; i += 6) { const a = Array.from(edges.slice(i, i + 3)) as number[], b = Array.from(edges.slice(i + 3, i + 6)) as number[]; if (!expected.edgeSet.has(key(a, b))) { const x = nativePoint(a), y = nativePoint(b); if (!x || !y || !expected.edgeSet.has(key(x, y))) invalidEdges++; } }
    group.matrixWorld.elements.forEach((value: number, i: number) => { matrixError = Math.max(matrixError, Math.abs(value - root.matrixWorld.elements[i])); });
    return { vertices: positions.length / 3, expected: expected.flat.length / 3, maximum, matrixError, invalidEdges,
      edgeSegments: edges.length / 6, root: group.uuid, geometries: [mesh.geometry.uuid, lines.geometry.uuid],
      materials: [mesh.material, lines.material].map((material: any) => ({ id: material.uuid, depthTest: material.depthTest, depthWrite: material.depthWrite, opacity: material.opacity })),
      visible: group.visible, outsideBird: group.parent === p.scene && !root.getObjectById(group.id),
      live: !p.renderer.getContext().isContextLost(), shaders: p.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
}
function geometryAgrees(actual: any, expected: any) {
  expect(actual.vertices).toBe(expected.vertices); expect(actual.vertices).toBe(actual.expected); expect(actual.maximum).toBeLessThan(3e-7);
  expect(actual.matrixError).toBeLessThan(1e-10); expect(actual.invalidEdges).toBe(0); expect(actual.edgeSegments).toBeGreaterThan(0);
  expect(actual.outsideBird).toBe(true); expect(actual.materials.every((m: any) => m.depthTest && !m.depthWrite)).toBe(true);
  expect(actual.live).toBe(true); expect(actual.shaders).toBe(true);
}
async function ledger(page: Page) {
  await page.evaluate(() => {
    const w = window as any, group = w.residentCompareProbe.scene.getObjectByName('birdlab-resident-frozen-surface'); w.residentCompareDisposals ||= new Map();
    group.traverse((node: any) => { for (const resource of [node.geometry, node.material]) if (resource && !w.residentCompareDisposals.has(resource.uuid)) { const row = { id: resource.uuid, kind: resource.isMaterial ? 'material' : 'geometry', count: 0 }; w.residentCompareDisposals.set(resource.uuid, row); resource.addEventListener('dispose', () => row.count++); } });
  });
}
async function counts(page: Page): Promise<any[]> { return page.evaluate(() => [...(window as any).residentCompareDisposals.values()]); }
async function pixels(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).residentCompareProbe, group = p.scene.getObjectByName('birdlab-resident-frozen-surface'), shown = group.visible;
    const gl = p.renderer.getContext(), size = gl.drawingBufferWidth * gl.drawingBufferHeight * 4;
    const read = () => { p.renderer.render(p.scene, p.camera); const bytes = new Uint8Array(size); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes); return bytes; };
    try { group.visible = true; const withGhost = read(); group.visible = false; const withoutGhost = read(); let changed = 0; for (let i = 0; i < size; i += 4) if (Math.abs(withGhost[i] - withoutGhost[i]) + Math.abs(withGhost[i + 1] - withoutGhost[i + 1]) + Math.abs(withGhost[i + 2] - withoutGhost[i + 2]) > 15) changed++; return changed; }
    finally { group.visible = shown; p.renderer.render(p.scene, p.camera); }
  });
}
async function framing(page: Page): Promise<any> {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, p = w.residentCompareProbe, pin = w.residentCompareOracle, current = w.residentCompareCurrent;
    p.scene.updateMatrixWorld(true); p.camera.updateMatrixWorld(true);
    const min = current.bounds.min.slice(), max = current.bounds.max.slice(), corners: any[] = [];
    for (const x of [pin.local.min[0], pin.local.max[0]]) for (const y of [pin.local.min[1], pin.local.max[1]]) for (const z of [pin.local.min[2], pin.local.max[2]]) {
      const point = new T.Vector3(x, y, z).applyMatrix4(pin.root.matrixWorld); corners.push(point); point.toArray().forEach((v: number, i: number) => { min[i] = Math.min(min[i], v); max[i] = Math.max(max[i], v); });
    }
    const center = min.map((v: number, i: number) => (v + max[i]) / 2), size = min.map((v: number, i: number) => max[i] - v);
    const radius = Math.max(.004, Math.hypot(...size) / 2), half = Math.min(p.camera.fov * Math.PI / 360, Math.atan(Math.tan(p.camera.fov * Math.PI / 360) * p.camera.aspect));
    const minimumDistance = Math.max(p.camera.near + radius + .01, radius * 1.1 / Math.sin(half));
    let maxX = 0, maxY = 0, minZ = Infinity, maxZ = -Infinity;
    const project = (point: any) => { const q = point.project(p.camera); maxX = Math.max(maxX, Math.abs(q.x)); maxY = Math.max(maxY, Math.abs(q.y)); minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, q.z); };
    for (let i = 0; i < current.world.length; i += 3) project(new T.Vector3(...current.world.slice(i, i + 3)));
    for (let i = 0; i < pin.flat.length; i += 3) project(new T.Vector3(...pin.flat.slice(i, i + 3)).applyMatrix4(pin.root.matrixWorld));
    corners.forEach(project);
    let localChange = current.flat.length === pin.flat.length ? 0 : Infinity;
    if (!localChange) for (let i = 0; i < current.flat.length; i++) localChange = Math.max(localChange, Math.abs(current.flat[i] - pin.flat[i]));
    return { min, max, center, size, radius, minimumDistance, distance: p.camera.position.distanceTo(new T.Vector3(...center)), projected: { maxX, maxY, minZ, maxZ }, localChange };
  });
}
async function validFrame(page: Page, id: string, part: string) {
  const current = await captureOracle(page, id, part, false), expected = await framing(page), state = await call(page, 'getState');
  const inspection = state.residentInspection, comparison = inspection.comparison;
  for (const key of ['min', 'max', 'center', 'size']) { closeArray(inspection.bounds[key], current.bounds[key]); closeArray(comparison.framing[key], expected[key]); }
  expect(inspection.vertices).toBe(current.vertices); closeArray(state.cameraTarget, expected.center);
  expect(inspection.cameraFit.radius).toBeCloseTo(expected.radius, 8); expect(inspection.cameraFit.minimumDistance).toBeCloseTo(expected.minimumDistance, 8);
  expect(inspection.cameraFit.distance).toBeCloseTo(expected.distance, 8); expect(expected.distance).toBeCloseTo(expected.minimumDistance, 8);
  expect(expected.projected.maxX).toBeLessThanOrEqual(1); expect(expected.projected.maxY).toBeLessThanOrEqual(1);
  expect(expected.projected.minZ).toBeGreaterThan(-1); expect(expected.projected.maxZ).toBeLessThan(1);
  return { state, expected, current };
}
async function captureNative(page: Page, selector: string, file: string) {
  const element = page.locator(selector); await element.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  // With preserveDrawingBuffer=false, scrolling can discard a compositor
  // surface after a settled pause. Request a real native render at the exact
  // same opacity and pose before taking the DOM-clipped browser screenshot.
  const state = await call(page, 'getState'); await call(page, 'setResidentFrozenOpacity', state.residentInspection.comparison.opacity); await step(page);
  const clip = await element.evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, scale: 1 }; });
  const nativeRect = selector === '.birdlab-3d-stage' ? await element.evaluate(node => {
    const outer = node.getBoundingClientRect(), native = node.querySelector('[data-birdlab-3d-canvas]')!.getBoundingClientRect();
    return { x: native.x - outer.x, y: native.y - outer.y, width: native.width, height: native.height };
  }) : null;
  expect(clip.width).toBeGreaterThan(0); expect(clip.height).toBeGreaterThan(0);
  // CDP captures the real native surface while the harness explicitly owns RAF.
  const cdp = await page.context().newCDPSession(page); let imagePixels: any = null;
  try {
    const image = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip });
    if (nativeRect) {
      imagePixels = await page.evaluate(async ({ data, rect }) => {
        const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const surface = document.createElement('canvas'); surface.width = bitmap.width; surface.height = bitmap.height;
        const context = surface.getContext('2d')!; context.drawImage(bitmap, 0, 0); bitmap.close();
        // Only the middle half of the native canvas is sampled: corner HUD
        // text and the surrounding card cannot make a black render pass.
        const x = Math.max(0, Math.floor(rect.x + rect.width * .25)), y = Math.max(0, Math.floor(rect.y + rect.height * .25));
        const width = Math.min(surface.width - x, Math.floor(rect.width * .5)), height = Math.min(surface.height - y, Math.floor(rect.height * .5));
        const rgba = context.getImageData(x, y, width, height).data; let nonblack = 0;
        for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] && Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) > 15) nonblack++;
        return { width: surface.width, height: surface.height, sampledPixels: width * height, nonblackPixels: nonblack, nonblackFraction: nonblack / (width * height) };
      }, { data: image.data, rect: nativeRect });
      expect(imagePixels.sampledPixels).toBeGreaterThan(1000); expect(imagePixels.nonblackFraction).toBeGreaterThan(.1);
    }
    writeFileSync(resolve(previews, file), Buffer.from(image.data, 'base64'));
  }
  finally { await cdp.detach(); }
  return { file, ...clip, nativeRect, imagePixels };
}

test('all twelve resident pins preserve exact native deformed triangles, filtered topology and uniquely owned reusable resources', async ({ page }) => {
  const errors = await mount(page), evidence: any[] = []; expect((await call(page, 'getState')).residentInspection).toBeNull();
  for (const id of ids) {
    await call(page, 'setCamera', id); await call(page, 'seek', 0); await call(page, 'setResidentPart', 'wing');
    if (!evidence.length) expect((await call(page, 'getState')).residentInspection.comparison).toBeUndefined();
    if (evidence.length) await call(page, 'clearResidentShape');
    await call(page, 'setResidentFrozenSurface', false); await page.evaluate(id => (window as any).residentCompareRemember(id), id);
    const before = await call(page, 'getState'), original = await model(page, id), inventoryBefore = await inventory(page), expected = await captureOracle(page, id, 'wing');
    await call(page, 'pinResidentShape'); await step(page); frozen(before, await call(page, 'getState'));
    expect(await inventory(page)).toEqual(inventoryBefore);
    const saved = (await call(page, 'getState')).residentInspection.comparison;
    expect(saved.pinned.species).toBe(id); expect(saved.pinned.part).toBe('wing'); expect(saved.pinned.time).toBe(0);
    expect(saved.pinned.sources).toEqual(expected.sources); expect(saved.pinned.triangles).toBe(expected.triangles);
    for (const key of ['min', 'max', 'size']) closeArray(saved.pinned.bounds[key], expected.local[key]);
    expect(saved.enabled).toBe(false); expect(saved.opacity).toBe(.25); expect(saved.visible).toBe(false); expect(saved.framing).toBeNull();
    await call(page, 'setResidentFrozenSurface', true); await step(page); const shown = await agrees(page); geometryAgrees(shown, expected);
    // Full dynamic buffers are compared at the same authored pose. Seeking
    // intentionally deforms native wing/neck/tail positions and normals.
    expect((await model(page, id)).hash).toBe(original.hash);
    expect(shown.visible).toBe(true); await call(page, 'seek', 12); await step(page); geometryAgrees(await agrees(page), expected);
    const retained = await model(page, id); expect(retained.same).toBe(true); expect(retained.materialsUnchanged).toBe(true); expect(retained.disposals.every((n: number) => n === 0)).toBe(true);
    await call(page, 'setResidentFrozenSurface', false); await call(page, 'setResidentFrozenSurface', true); await step(page);
    expect((await agrees(page)).geometries).toEqual(shown.geometries);
    await call(page, 'seek', 0); await step(page); geometryAgrees(await agrees(page), expected); expect((await model(page, id)).hash).toBe(original.hash);
    evidence.push({ species: id, part: 'wing', triangles: expected.triangles, sourceMeshes: expected.sources.length, maximumError: shown.maximum, originalBuffers: true });
  }
  await call(page, 'setResidentPart', 'head'); await call(page, 'setResidentView', 'above'); await call(page, 'pinResidentShape'); await step(page);
  await captureOracle(page, 'whiteThroatedSparrow', 'head'); const initial = await agrees(page); await ledger(page);
  const original = await model(page, 'whiteThroatedSparrow');
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, head = w.residentCompareProbe.scene.getObjectByName('woodland-whiteThroatedSparrow').getObjectByName('woodland-head');
    const visible = new T.MeshBasicMaterial(), hidden = new T.MeshBasicMaterial({ visible: false }), indexed = new T.BufferGeometry();
    indexed.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .03, 0, 0, .03, .03, 0, 0, .03, 0, -.02, .015, 0], 3)); indexed.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
    indexed.addGroup(0, 3, 0); indexed.addGroup(3, 3, 1); indexed.addGroup(6, 3, 0); indexed.setDrawRange(3, 6); indexed.morphTargetsRelative = true;
    indexed.morphAttributes.position = [new T.Float32BufferAttribute([0, 0, 0, 0, 0, .01, 0, 0, .01, 0, 0, .02, 0, 0, .03], 3)];
    const a = new T.Mesh(indexed, [visible, hidden]); a.name = 'test-only-resident-indexed-relative'; a.morphTargetInfluences[0] = .4; head.add(a);
    const nonindexed = new T.BufferGeometry(); nonindexed.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .01, 0, 0, 0, .01, 0, 0, 0, .01, .01, 0, .01, 0, .01, .01, 0, 0, .02, .01, 0, .02, 0, .01, .02], 3)); nonindexed.setDrawRange(3, 3);
    nonindexed.morphAttributes.position = [new T.Float32BufferAttribute([0, 0, .01, .01, 0, .01, 0, .01, .01, 0, 0, .02, .01, 0, .02, 0, .01, .02, 0, 0, .03, .01, 0, .03, 0, .01, .03], 3)];
    const b = new T.Mesh(nonindexed, visible); b.name = 'test-only-resident-nonindexed-absolute'; b.morphTargetInfluences[0] = .7; head.add(b);
    const c = b.clone(); c.name = 'test-only-resident-hidden-mesh'; c.visible = false; head.add(c);
    const hiddenParent = new T.Group(); hiddenParent.visible = false; hiddenParent.name = 'test-only-resident-hidden-parent'; const d = b.clone(); d.name = 'test-only-resident-hidden-child'; hiddenParent.add(d); head.add(hiddenParent);
    w.residentCompareFixtures = { nodes: [a, b, c, hiddenParent], geometries: [indexed, nonindexed], materials: [visible, hidden] };
  });
  let replacement: any;
  try {
    replacement = await captureOracle(page, 'whiteThroatedSparrow', 'head');
    expect(replacement.indexed).toBeGreaterThan(0); expect(replacement.nonindexed).toBeGreaterThan(0); expect(replacement.morphed).toBeGreaterThan(0);
    for (const name of ['test-only-resident-indexed-relative', 'test-only-resident-nonindexed-absolute']) expect(replacement.sources.find((source: any) => source.name === name).triangles).toBe(1);
    expect(replacement.sources.some((source: any) => source.name.includes('hidden'))).toBe(false);
    await call(page, 'pinResidentShape'); await step(page); const replaced = await agrees(page); geometryAgrees(replaced, replacement);
    expect(replaced.root).toBe(initial.root); expect(replaced.geometries).not.toEqual(initial.geometries); expect(replaced.materials.map((m: any) => m.id)).toEqual(initial.materials.map((m: any) => m.id));
    expect((await counts(page)).filter(row => row.kind === 'geometry').every(row => row.count === 1)).toBe(true); await ledger(page);
    await call(page, 'clearResidentShape'); await step(page);
    expect((await counts(page)).filter(row => row.kind === 'geometry').every(row => row.count === 1)).toBe(true); expect((await counts(page)).filter(row => row.kind === 'material').every(row => row.count === 0)).toBe(true);
    await call(page, 'pinResidentShape'); await call(page, 'setResidentFrozenSurface', true); await step(page); geometryAgrees(await agrees(page), replacement); await ledger(page);
  } finally {
    await page.evaluate(() => { const w = window as any, f = w.residentCompareFixtures; f.nodes.forEach((node: any) => node.parent.remove(node)); f.geometries.forEach((g: any) => g.dispose()); f.materials.forEach((m: any) => m.dispose()); delete w.residentCompareFixtures; });
  }
  const retained = await model(page, 'whiteThroatedSparrow'); expect(retained.same).toBe(true); expect(retained.materialsUnchanged).toBe(true); expect(retained.hash).toBe(original.hash); expect(retained.disposals.every((n: number) => n === 0)).toBe(true);
  await call(page, 'dispose'); const released = await counts(page); expect(released.filter(row => row.kind === 'geometry')).toHaveLength(6); expect(released.filter(row => row.kind === 'material')).toHaveLength(2); expect(released.every(row => row.count === 1)).toBe(true);
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'comparison-geometry.json'), JSON.stringify({ cases: evidence, topologyFixture: replacement, disposalLedger: released, errors }, null, 2));
});

test('current and saved body envelopes frame real ground-to-flight poses at three hosts and produce native comparison previews', async ({ page }) => {
  const errors = await mount(page), evidence: any[] = [], captures: any[] = [];
  for (const [viewport, host] of [[1280, 1100], [800, 430], [390, 390]]) {
    await resize(page, viewport, host);
    for (const species of macroSpecies) {
      await call(page, 'setCamera', species.id); await call(page, 'seek', 0); await call(page, 'setResidentPart', 'wing'); await call(page, 'setResidentView', 'above');
      const pinned = await captureOracle(page, species.id, 'wing'); await call(page, 'pinResidentShape'); await call(page, 'setResidentFrozenSurface', true); await call(page, 'setResidentFrozenOpacity', .2);
      await call(page, 'seek', species.flight); await step(page); geometryAgrees(await agrees(page), pinned);
      const fit = await validFrame(page, species.id, 'wing'); expect(fit.expected.localChange).toBeGreaterThan(1e-5);
      expect(fit.state.residentInspection.comparison.opacity).toBe(.2);
      expect(fit.state.residentInspection.comparison.pinned.time).toBe(0); expect(fit.state.residentInspection.comparison.visible).toBe(true);
      const changed = await pixels(page); expect(changed).toBeGreaterThan(20);
      if (viewport !== 800) {
        captures.push(await captureNative(page, '.birdlab-3d-stage', species.id + '-' + viewport + '.png'));
        if (species.id === 'americanGoldfinch') captures.push(await captureNative(page, '[data-birdlab-resident-inspection]', 'studio-' + viewport + '.png'));
      }
      evidence.push({ viewport, host, species: species.id, time: species.flight, pinnedTime: 0, nativeChangedPixels: changed, framing: fit.expected, currentBounds: fit.current.bounds });
      // An explicit native root transform checks body-local registration and
      // the conservative eight-corner body-box frame, including scale.
      await page.evaluate(id => { const w = window as any, root = w.residentCompareProbe.scene.getObjectByName('woodland-' + id); w.residentCompareRootTransform = { position: root.position.clone(), quaternion: root.quaternion.clone(), scale: root.scale.clone() }; root.position.add(new w.THREE.Vector3(.31, .19, -.23)); root.rotation.y += .43; root.scale.multiply(new w.THREE.Vector3(1.15, .9, 1.07)); root.updateMatrixWorld(true); }, species.id);
      await call(page, 'setResidentView', 'front'); await step(page); geometryAgrees(await agrees(page), pinned); await validFrame(page, species.id, 'wing');
      await page.evaluate(id => { const w = window as any, root = w.residentCompareProbe.scene.getObjectByName('woodland-' + id), old = w.residentCompareRootTransform; root.position.copy(old.position); root.quaternion.copy(old.quaternion); root.scale.copy(old.scale); root.updateMatrixWorld(true); delete w.residentCompareRootTransform; }, species.id);
      await call(page, 'setResidentView', 'front');
      await call(page, 'setResidentFrozenSurface', false); await step(page); const off = await call(page, 'getState'), native = await captureOracle(page, species.id, 'wing', false);
      expect(off.residentInspection.comparison.framing).toBeNull(); closeArray(off.cameraTarget, native.bounds.center);
      await call(page, 'setResidentFrozenSurface', true); await call(page, 'seek', species.flight); await step(page);
    }
  }
  expect(captures).toHaveLength(8); expect(errors).toEqual([]);
  writeFileSync(resolve(report, 'comparison-poses.json'), JSON.stringify({ cases: evidence, errors }, null, 2));
  writeFileSync(resolve(report, 'comparison-captures.json'), JSON.stringify(captures, null, 2));
});

test('keyboard and real touch comparison controls retain optional pins through mismatches, play and modes with no extra RAF or persisted data', async ({ page }) => {
  const errors = await mount(page), stored = await page.evaluate(() => JSON.stringify((window as any).__toolData)), evidence: any[] = [];
  const touch = await page.context().newCDPSession(page);
  for (const [viewport, host] of [[1280, 1100], [800, 430], [390, 390]]) {
    await resize(page, viewport, host); await call(page, 'setCamera', 'americanGoldfinch'); await call(page, 'seek', 0);
    await call(page, 'clearResidentShape'); await expect(page.locator(toggle)).toBeDisabled(); await expect(page.locator(opacity)).toBeDisabled();
    await call(page, 'setPaused', false); await step(page, 3); const playing = await call(page, 'getState'); expect(playing.residentInspection.active).toBe(false);
    await page.locator(pin).focus(); await page.keyboard.press('Enter'); await step(page); const saved = await call(page, 'getState');
    frozen(playing, saved, false); expect(saved.paused).toBe(true); expect(saved.residentInspection.active).toBe(true); await expect(page.locator(pin)).toBeFocused();
    await page.locator(toggle).focus(); await page.keyboard.press('Space'); await step(page); await expect(page.locator(toggle)).toBeChecked();
    const before = await call(page, 'getState'); await page.locator(opacity).focus(); await page.keyboard.press('Home'); await step(page);
    await expect(page.locator(opacity)).toHaveValue('0'); expect((await call(page, 'getState')).residentInspection.comparison.visible).toBe(false);
    await page.keyboard.press('End'); await expect(page.locator(opacity)).toHaveValue('70'); await page.keyboard.press('ArrowLeft'); await expect(page.locator(opacity)).toHaveValue('69'); frozen(before, await call(page, 'getState'));
    await page.locator(opacity).scrollIntoViewIfNeeded(); const box = (await page.locator(opacity).boundingBox())!;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .3, y: box.y + box.height / 2, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .6, y: box.y + box.height / 2, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await step(page, 12);
    const value = Number(await page.locator(opacity).inputValue()), adjusted = await call(page, 'getState'); expect(value).toBeGreaterThan(30); expect(value).toBeLessThan(55);
    expect(adjusted.residentInspection.comparison.opacity).toBeCloseTo(value / 100, 8); frozen(before, adjusted);
    const pinned = adjusted.residentInspection.comparison.pinned; await call(page, 'seek', adjusted.time + 2); const inspectingTime = (await call(page, 'getState')).time;
    await page.locator('[data-resident-part-choice="head"]').tap(); await step(page);
    const mismatch = (await call(page, 'getState')).residentInspection.comparison; expect(mismatch.pinned).toEqual(pinned); expect(mismatch.matching).toBe(false); expect(mismatch.visible).toBe(false);
    await page.locator('[data-resident-comparison-return]').tap(); await step(page); expect((await call(page, 'getState')).residentInspection.comparison.matching).toBe(true); expect((await call(page, 'getState')).time).toBe(inspectingTime);
    await call(page, 'setCamera', 'easternBluebird'); await call(page, 'setResidentPart', pinned.part); await step(page);
    expect((await call(page, 'getState')).residentInspection.comparison.matching).toBe(false); await page.locator('[data-resident-comparison-return]').tap(); await step(page);
    const restored = await call(page, 'getState'); expect(restored.residentInspection.species).toBe(pinned.species); expect(restored.residentInspection.comparison.pinned).toEqual(pinned); expect(restored.time).toBe(inspectingTime);
    await call(page, 'setMode', 'free'); await step(page); expect((await call(page, 'getState')).residentInspection).toBeNull();
    expect(await page.evaluate(() => (window as any).residentCompareProbe.scene.getObjectByName('birdlab-resident-frozen-surface').visible)).toBe(false);
    await call(page, 'setMode', 'guided'); await step(page); expect((await call(page, 'getState')).residentInspection.comparison.pinned).toEqual(pinned);
    await call(page, 'setPaused', false); await step(page, 3); const resumed = await call(page, 'getState'); expect(resumed.time).toBeGreaterThan(restored.time);
    expect(resumed.residentInspection.comparison.visible).toBe(false); expect(resumed.residentInspection.comparison.pinned).toEqual(pinned);
    await expect(page.locator('[data-resident-comparison-return]')).toBeVisible();
    await page.locator('[data-resident-comparison-return]').tap(); await step(page); const recovered = await call(page, 'getState');
    frozen(resumed, recovered, false); expect(recovered.paused).toBe(true);
    await call(page, 'setResidentView', 'side'); await step(page, 12);
    expect((await call(page, 'getState')).residentInspection.comparison.visible).toBe(true); expect(await page.evaluate(() => (window as any).residentComparePending())).toBe(0);
    const settled = await call(page, 'getState'); await step(page, 4); expect((await call(page, 'getState')).frames).toBe(settled.frames);
    const layout = await page.locator(panel).evaluate((node: HTMLElement) => {
      const bad = [...node.querySelectorAll('button,input')].filter((element: any) => !element.disabled).map((element: any) => {
        const rect = element.type === 'checkbox' ? node.querySelector('label[for="' + element.id + '"]')!.getBoundingClientRect() : element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }).filter(rect => rect.width < 43.9 || rect.height < 43.9);
      return { bad, overflow: node.scrollWidth - node.clientWidth, page: document.documentElement.scrollWidth - innerWidth };
    });
    expect(layout.bad).toEqual([]); expect(layout.overflow).toBeLessThanOrEqual(1); expect(layout.page).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async rules => (await (window as any).axe.run('[data-birdlab-resident-inspection]', { runOnly: { type: 'rule', values: rules } })).violations.map((row: any) => ({ id: row.id, nodes: row.nodes.map((node: any) => node.target) })), rules);
    expect(violations).toEqual([]);
    await call(page, 'resetView'); await step(page); expect((await call(page, 'getState')).residentInspection).toBeNull(); await call(page, 'setCamera', pinned.species); await call(page, 'setResidentPart', pinned.part); await step(page);
    expect((await call(page, 'getState')).residentInspection.comparison.pinned).toEqual(pinned);
    await page.locator(clear).tap(); await step(page); await expect(page.locator(pin)).toBeFocused(); await expect(page.locator(toggle)).toBeDisabled(); await expect(page.locator(opacity)).toBeDisabled();
    expect((await call(page, 'getState')).residentInspection.comparison.pinned).toBeNull();
    evidence.push({ viewport, host, keyboard: true, nativeTouchOpacity: value, pinRestored: true, settled: true, layout, accessibilityRules: rules, violations });
  }
  await touch.detach(); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(stored); expect(errors).toEqual([]);
  writeFileSync(resolve(report, 'comparison-interactions.json'), JSON.stringify({ cases: evidence, errors }, null, 2));
});
