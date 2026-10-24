import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Inspect the application's native models and camera. This spec creates no
// substitute geometry, proxy hit targets, independent animation or pixel golden.
test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.residentLensProbe={scene,camera,renderer};return render(scene,camera);};return renderer;};})();",
});
const report = resolve('reports/birdlab-fieldmark-studio-2026-10-22');
const previews = resolve(report, 'previews');
const canvas = '[data-birdlab-3d-canvas]';
const ids = ['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal',
  'darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', 'americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];
const macroSpecies = [
  { id: 'americanGoldfinch', flight: 18, feeding: 8.63 },
  { id: 'easternBluebird', flight: 22.3, feeding: 10.93 },
  { id: 'whiteThroatedSparrow', flight: 12.97, feeding: 6.03 },
];
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value',
  'aria-required-children', 'aria-required-parent', 'nested-interactive'];

test.beforeAll(async () => { mkdirSync(previews, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator(canvas).evaluate((node: any, input) => node._birdlab3d[input.method](input.value), { method, value });
}
async function step(page: Page, count = 2) {
  await page.evaluate(count => { for (let i = 0; i < count; i++) (window as any).residentLensStep(100); }, count);
}
async function captureNative(page: Page, selector: string, file: string) {
  const element = page.locator(selector);
  await element.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await step(page);
  const clip = await element.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height, scale: 1 };
  });
  expect(clip.width).toBeGreaterThan(0); expect(clip.height).toBeGreaterThan(0);
  // Locator screenshots wait for automatic RAF stability, but this test owns
  // RAF explicitly. Capture the native browser surface at its exact DOM clip.
  const session = await page.context().newCDPSession(page);
  try {
    const screenshot = await session.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true, clip,
    });
    writeFileSync(resolve(previews, file), Buffer.from(screenshot.data, 'base64'));
  } finally { await session.detach(); }
  return { file, ...clip };
}
async function resize(page: Page, width: number, host: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => {
    node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true');
  }, host);
  await page.waitForFunction(() => {
    const w = window as any, node = document.querySelector('[data-birdlab-3d-canvas]');
    if (!node || !w.residentLensProbe) return false;
    const rect = node.getBoundingClientRect();
    return Math.abs(w.residentLensProbe.camera.aspect - Math.round(rect.width) / Math.round(rect.height)) < 1e-8;
  });
  await step(page);
}
async function mount(page: Page, width = 1280, host = 1100) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let now = 1000, next = 1; const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = next++; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).residentLensStep = (ms: number) => {
      now += ms; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(now));
    };
    (window as any).residentLensPending = () => pending.size;
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blBadges: {}, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.residentLensProbe", null, { polling: 50, timeout: 60_000 });
  await resize(page, width, host); await call(page, 'seek', 0); await step(page);
  await installNativeOracle(page); return errors;
}

async function installNativeOracle(page: Page) {
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, baselines = new Map();
    function residentRoot(id: string) { return w.residentLensProbe.scene.getObjectByName('woodland-' + id); }
    function records(id: string) {
      const root = residentRoot(id), nodes: any[] = [];
      root.traverse((node: any) => nodes.push({ node, geometry: node.geometry, material: node.material,
        attributes: node.geometry ? Object.entries(node.geometry.attributes).map(([key, value]: any) => [key, value, value.array]) : [],
        index: node.geometry?.index, indices: node.geometry?.index?.array }));
      return { root, nodes };
    }
    w.residentLensRemember = (id: string) => {
      const value = records(id), resources = new Set<any>();
      for (const { geometry, material } of value.nodes) {
        if (geometry) resources.add(geometry);
        for (const item of Array.isArray(material) ? material : material ? [material] : []) resources.add(item);
      }
      const disposals = new Map<any, number>();
      resources.forEach(item => { disposals.set(item, 0); item.addEventListener('dispose', () => disposals.set(item, disposals.get(item)! + 1)); });
      baselines.set(id, { ...value, resources, disposals });
    };
    w.residentLensModel = (id: string) => {
      const value = records(id), baseline = baselines.get(id); let hash = 2166136261;
      function bytes(array: any) {
        const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (const byte of view) hash = Math.imul(hash ^ byte, 16777619);
      }
      let same = !baseline || value.root === baseline.root && value.nodes.length === baseline.nodes.length;
      value.nodes.forEach((entry: any, index: number) => {
        const old = baseline?.nodes[index];
        if (old && (old.node !== entry.node || old.geometry !== entry.geometry || old.material !== entry.material ||
            old.index !== entry.index || old.indices !== entry.indices || old.attributes.length !== entry.attributes.length)) same = false;
        entry.attributes.forEach(([key, attribute, array]: any, offset: number) => {
          const previous = old?.attributes[offset];
          if (previous && (key !== previous[0] || attribute !== previous[1] || array !== previous[2])) same = false;
          bytes(array);
        });
        if (entry.indices) bytes(entry.indices);
        const transform = [...entry.node.position.toArray(), ...entry.node.quaternion.toArray(), ...entry.node.scale.toArray(),
          entry.node.visible ? 1 : 0, ...(entry.node.morphTargetInfluences || [])];
        bytes(new Float64Array(transform));
      });
      return { root: value.root.uuid, hash: hash >>> 0, same, nodes: value.nodes.length,
        resources: baseline?.resources.size || 0, disposals: baseline ? [...baseline.disposals.values()] : [] };
    };
    w.residentLensNative = (id: string, part: string) => {
      const probe = w.residentLensProbe, root = residentRoot(id), shared = !!root.userData.speciesId;
      probe.scene.updateMatrixWorld(true); probe.camera.updateMatrixWorld(true);
      const names: Record<string, string> = shared ? { head: 'woodland-head', wing: 'woodland-right-wing', tail: 'woodland-tail' }
        : { head: id + '-head', wing: id + '-wing-1', tail: id + '-tail' };
      const selected = part === 'whole' ? root : root.getObjectByName(names[part]);
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], meshes: string[] = [];
      let vertices = 0, invalid = 0, maxX = 0, maxY = 0, minZ = Infinity, maxZ = -Infinity;
      selected.traverse((mesh: any) => {
        if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
        for (let node = mesh; node; node = node.parent) if (!node.visible) return;
        const geometry = mesh.geometry, attribute = geometry.attributes.position;
        const stream = geometry.index ? Array.from(geometry.index.array) as number[] : Array.from({ length: attribute.count }, (_, index) => index);
        const drawn = new Set<number>(), materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const groups = Array.isArray(mesh.material) ? geometry.groups : [{ start: 0, count: stream.length, materialIndex: 0 }];
        for (const group of groups) {
          if (!materialList[group.materialIndex || 0]?.visible) continue;
          const begin = Math.max(geometry.drawRange.start, group.start), end = Math.min(stream.length,
            geometry.drawRange.start + geometry.drawRange.count, group.start + group.count);
          const drawable = stream.slice(begin, end);
          for (let triangle = 0; triangle + 2 < drawable.length; triangle += 3) {
            vertices += 3; drawn.add(drawable[triangle]); drawn.add(drawable[triangle + 1]); drawn.add(drawable[triangle + 2]);
          }
        }
        if (!drawn.size) return; meshes.push(mesh.uuid);
        for (const index of drawn) {
          const original = [attribute.getX(index), attribute.getY(index), attribute.getZ(index)], local = original.slice();
          (geometry.morphAttributes.position || []).forEach((morph: any, target: number) => {
            const weight = mesh.morphTargetInfluences?.[target] || 0;
            const values = [morph.getX(index), morph.getY(index), morph.getZ(index)];
            for (let axis = 0; axis < 3; axis++) local[axis] += weight * (values[axis] - (geometry.morphTargetsRelative ? 0 : original[axis]));
          });
          const m = mesh.matrixWorld.elements, [x, y, z] = local;
          const divisor = m[3] * x + m[7] * y + m[11] * z + m[15];
          const world = [(m[0] * x + m[4] * y + m[8] * z + m[12]) / divisor,
            (m[1] * x + m[5] * y + m[9] * z + m[13]) / divisor,
            (m[2] * x + m[6] * y + m[10] * z + m[14]) / divisor];
          world.forEach((value, axis) => { if (!Number.isFinite(value)) invalid++; lo[axis] = Math.min(lo[axis], value); hi[axis] = Math.max(hi[axis], value); });
          const projected = new T.Vector3(...world).project(probe.camera);
          maxX = Math.max(maxX, Math.abs(projected.x)); maxY = Math.max(maxY, Math.abs(projected.y));
          minZ = Math.min(minZ, projected.z); maxZ = Math.max(maxZ, projected.z);
        }
      });
      const center = lo.map((value, axis) => (value + hi[axis]) / 2), size = lo.map((value, axis) => hi[axis] - value);
      const radius = Math.max(.004, Math.hypot(...size) / 2), halfVertical = probe.camera.fov * Math.PI / 360;
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * probe.camera.aspect);
      const minimumDistance = Math.max(probe.camera.near + radius + .01, radius * 1.10 / Math.sin(Math.min(halfVertical, halfHorizontal)));
      const actualDirection = probe.camera.position.clone().sub(new T.Vector3(...center)).normalize();
      const quaternion = root.getWorldQuaternion(new T.Quaternion());
      return { id, part, min: lo, max: hi, center, size, radius, minimumDistance, meshes, vertices, invalid,
        projected: { maxX, maxY, minZ, maxZ }, distance: probe.camera.position.distanceTo(new T.Vector3(...center)),
        position: probe.camera.position.toArray(), target: probe.camera.getWorldDirection(new T.Vector3()).toArray(),
        direction: actualDirection.toArray(), up: probe.camera.up.toArray(),
        directions: { side: new T.Vector3(1, 0, 0).applyQuaternion(quaternion).toArray(),
          front: new T.Vector3(0, 0, shared ? 1 : -1).applyQuaternion(quaternion).toArray(),
          above: new T.Vector3(0, 1, 0).applyQuaternion(quaternion).toArray() },
        aboveUp: new T.Vector3(0, 0, shared ? 1 : -1).applyQuaternion(quaternion).toArray(),
        root: root.uuid, rootPosition: root.position.toArray(), aspect: probe.camera.aspect,
        live: !probe.renderer.getContext().isContextLost(), calls: probe.renderer.info.render.calls,
        shaders: probe.renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
    };
  });
}

async function native(page: Page, id: string, part: string): Promise<any> {
  return page.evaluate(({ id, part }) => (window as any).residentLensNative(id, part), { id, part });
}
async function model(page: Page, id: string): Promise<any> {
  return page.evaluate(id => (window as any).residentLensModel(id), id);
}
function closeArray(actual: number[], expected: number[], digits = 8) {
  expect(actual).toHaveLength(expected.length); actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], digits));
}
function frozenWorld(before: any, after: any, includePaused = true) {
  for (const key of ['time', 'speed', 'position', 'orientation', 'pose', 'wildlife', 'fieldVisitTime', 'sightings', ...(includePaused ? ['paused'] : [])]) {
    expect(after[key], key).toEqual(before[key]);
  }
}
function validFit(state: any, geometry: any, view?: string) {
  const inspection = state.residentInspection; expect(inspection.active).toBe(true);
  expect(inspection.species).toBe(geometry.id); expect(inspection.part).toBe(geometry.part);
  for (const key of ['min', 'max', 'center', 'size']) closeArray(inspection.bounds[key], geometry[key]);
  expect([...inspection.meshes].sort()).toEqual([...geometry.meshes].sort()); expect(inspection.vertices).toBe(geometry.vertices);
  expect(geometry.vertices).toBeGreaterThan(50); expect(geometry.invalid).toBe(0);
  expect(inspection.cameraFit.radius).toBeCloseTo(geometry.radius, 9);
  expect(inspection.cameraFit.minimumDistance).toBeCloseTo(geometry.minimumDistance, 9);
  expect(inspection.cameraFit.distance).toBeCloseTo(geometry.distance, 9);
  expect(geometry.distance).toBeCloseTo(geometry.minimumDistance, 8);
  closeArray(state.cameraTarget, geometry.center); closeArray(state.cameraPosition, geometry.position);
  expect(geometry.projected.maxX).toBeLessThanOrEqual(1); expect(geometry.projected.maxY).toBeLessThanOrEqual(1);
  expect(geometry.projected.minZ).toBeGreaterThan(-1); expect(geometry.projected.maxZ).toBeLessThan(1);
  expect(geometry.live).toBe(true); expect(geometry.calls).toBeGreaterThan(0); expect(geometry.shaders).toBe(true);
  if (view) { expect(inspection.view).toBe(view); closeArray(geometry.direction, geometry.directions[view]); }
  if (view === 'above') closeArray(geometry.up, geometry.aboveUp);
}

test('all twelve resident models use their exact current native triangles for four part fits without changing clocks or resources', async ({ page }) => {
  const errors = await mount(page), initial = await call(page, 'getState'), evidence: any[] = [];
  expect(initial.residentInspection).toBeNull(); expect(initial.wildlife.map((bird: any) => bird.id)).toEqual(ids);
  for (const id of ids) {
    await call(page, 'setCamera', id); await step(page);
    const ordinary = await call(page, 'getState');
    expect(ordinary.residentInspection).toEqual({ species: id, part: 'whole', view: 'free', active: false, zoom: 1,
      bounds: null, meshes: [], vertices: 0, cameraFit: null });
    await page.evaluate(id => (window as any).residentLensRemember(id), id);
    const original = await model(page, id);
    for (const part of ['whole', 'head', 'wing', 'tail']) {
      await call(page, 'setResidentPart', part); await step(page);
      const state = await call(page, 'getState'), geometry = await native(page, id, part);
      validFit(state, geometry, 'side'); frozenWorld(ordinary, state);
      const current = await model(page, id);
      expect(current.root).toBe(original.root); expect(current.same).toBe(true); expect(current.hash).toBe(original.hash);
      expect(current.disposals.every((value: number) => value === 0)).toBe(true);
      evidence.push({ species: id, part, meshes: geometry.meshes.length, vertices: geometry.vertices,
        bounds: state.residentInspection.bounds, radius: geometry.radius, distance: geometry.distance, projected: geometry.projected });
    }
  }
  // A temporary, explicitly named fixture exercises renderer filtering. It is
  // attached to a real head, then removed before checking the original model's
  // resource identities and bytes again; no resident asset is edited.
  const fixtureId = 'whiteThroatedSparrow', original = await model(page, fixtureId);
  await call(page, 'setResidentPart', 'head'); const unmodified = await native(page, fixtureId, 'head');
  await page.evaluate(id => {
    const w = window as any, T = w.THREE, head = w.residentLensProbe.scene.getObjectByName('woodland-' + id).getObjectByName('woodland-head');
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, .001, 0, 0, 0, .001, 0,
      100, 100, 100, 101, 100, 100, 100, 101, 100], 3));
    geometry.setIndex([0, 1, 2, 3, 4, 5]); geometry.addGroup(0, 3, 0); geometry.addGroup(3, 3, 1); geometry.setDrawRange(0, 3);
    const materials = [new T.MeshBasicMaterial(), new T.MeshBasicMaterial()], mesh = new T.Mesh(geometry, materials);
    mesh.name = 'test-only-resident-draw-filter-fixture'; head.add(mesh); w.residentLensFixture = { geometry, materials, mesh };
  }, fixtureId);
  try {
    for (const filter of ['drawRange', 'hiddenMaterial', 'hiddenMesh']) {
      await page.evaluate(filter => {
        const fixture = (window as any).residentLensFixture;
        if (filter === 'hiddenMaterial') { fixture.geometry.setDrawRange(0, 6); fixture.materials[1].visible = false; }
        if (filter === 'hiddenMesh') fixture.mesh.visible = false;
      }, filter);
      await call(page, 'setResidentPart', 'head'); const geometry = await native(page, fixtureId, 'head');
      validFit(await call(page, 'getState'), geometry, 'side');
      closeArray(geometry.min, unmodified.min); closeArray(geometry.max, unmodified.max);
      expect(geometry.vertices).toBe(unmodified.vertices + (filter === 'hiddenMesh' ? 0 : 3));
    }
  } finally {
    await page.evaluate(() => {
      const w = window as any, fixture = w.residentLensFixture;
      fixture.mesh.parent.remove(fixture.mesh); fixture.geometry.dispose(); fixture.materials.forEach((material: any) => material.dispose()); delete w.residentLensFixture;
    });
    await call(page, 'setResidentPart', 'head');
  }
  const retained = await model(page, fixtureId); expect(retained.same).toBe(true); expect(retained.hash).toBe(original.hash);
  expect(retained.disposals.every((value: number) => value === 0)).toBe(true);
  await call(page, 'setCamera', 'orbit'); expect((await call(page, 'getState')).residentInspection).toBeNull();
  await call(page, 'setResidentPart', 'head'); await call(page, 'setResidentView', 'above');
  expect((await call(page, 'getState')).residentInspection).toBeNull();
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'inspection-geometry.json'), JSON.stringify({ cases: evidence,
    temporaryFixture: ['indexed triangles', 'drawRange', 'hidden material group', 'hidden mesh', 'removed and disposed'], errors }, null, 2));
});

test('body-relative views refit deformed parts at three aspect ratios and create native desktop and phone macro previews', async ({ page }) => {
  const errors = await mount(page), evidence: any[] = [], captures: any[] = [];
  for (const [width, host] of [[1280, 1100], [800, 430], [390, 390]]) {
    await resize(page, width, host);
    for (const species of macroSpecies) {
      await call(page, 'setCamera', species.id); await call(page, 'seek', 0);
      const rest: Record<string, any> = {};
      for (const time of [0, species.feeding, species.flight]) {
        await call(page, 'seek', time);
        for (const part of ['head', 'wing', 'tail']) {
          await call(page, 'setResidentPart', part);
          const views = part === 'head' ? ['side', 'front', 'above'] : [part === 'wing' ? 'above' : 'side'];
          for (const view of views) {
            await call(page, 'setResidentView', view);
            const before = await call(page, 'getState'), geometry = await native(page, species.id, part);
            validFit(before, geometry, view); expect(before.time).toBe(time); expect(before.paused).toBe(true);
            if (time === 0) rest[part] = before.residentInspection.bounds;
            if (time === species.flight) expect(before.residentInspection.bounds).not.toEqual(rest[part]);
            if (part === 'head' && view === 'side' && time === 0 && width !== 800) {
              captures.push(await captureNative(page, '.birdlab-3d-stage', species.id + '-' + width + '.png'));
              if (species.id === 'americanGoldfinch') captures.push(await captureNative(page, '[data-birdlab-resident-inspection]', 'studio-' + width + '.png'));
              expect(geometry.position[1]).toBeLessThan(geometry.rootPosition[1] + .24);
            }
            evidence.push({ species: species.id, time, part, view, viewport: width, host,
              bounds: before.residentInspection.bounds, distance: geometry.distance, projected: geometry.projected });
          }
        }
      }
      await call(page, 'setResidentPart', 'head'); await call(page, 'setResidentView', 'side');
      const fixed = await call(page, 'getState'); await call(page, 'setResidentView', 'free');
      const released = await call(page, 'getState'); frozenWorld(fixed, released);
      closeArray(released.cameraPosition, fixed.cameraPosition); closeArray(released.cameraTarget, fixed.cameraTarget);
    }
  }
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'inspection-poses.json'), JSON.stringify({ cases: evidence, errors }, null, 2));
  writeFileSync(resolve(report, 'inspection-captures.json'), JSON.stringify(captures, null, 2));
});

test('keyboard and real touch controls preserve the pose, settle their RAF and retain optional state through free observation', async ({ page }) => {
  const errors = await mount(page), stored = await page.evaluate(() => JSON.stringify((window as any).__toolData)), evidence: any[] = [];
  const touch = await page.context().newCDPSession(page);
  for (const [width, host] of [[1280, 1100], [800, 430], [390, 390]]) {
    await resize(page, width, host); const species = macroSpecies[evidence.length];
    const choice = page.locator('[data-birdlab-resident-camera="' + species.id + '"]');
    await choice.focus(); await page.keyboard.press('Enter'); await call(page, 'seek', species.feeding); await step(page);
    await page.evaluate(id => (window as any).residentLensRemember(id), species.id); const original = await model(page, species.id);
    await call(page, 'setPaused', false); await step(page, 3); const playing = await call(page, 'getState');
    const head = page.locator('[data-resident-part-choice="head"]');
    await head.focus(); await page.keyboard.press('Enter'); await step(page);
    const opened = await call(page, 'getState'); frozenWorld(playing, opened, false); expect(opened.paused).toBe(true);
    await expect(head).toBeFocused(); await expect(head).toHaveAttribute('aria-pressed', 'true');
    const card = page.locator('[data-birdlab-resident-inspection="' + species.id + '"]');
    await expect(card).toHaveAttribute('data-resident-inspection-active', 'true');
    await expect(card.locator('[data-resident-inspection-status]')).toContainText('Head and bill');
    for (const part of ['whole', 'head', 'wing', 'tail']) {
      const button = page.locator('[data-resident-part-choice="' + part + '"]'); await button.focus(); await page.keyboard.press('Space');
      await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true');
      expect((await call(page, 'getState')).residentInspection.part).toBe(part);
      const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const above = page.locator('[data-resident-view-choice="above"]'); await above.focus(); await page.keyboard.press('Enter'); await step(page);
    await expect(above).toHaveAttribute('aria-pressed', 'true'); const fixed = await call(page, 'getState');
    await page.locator(canvas).focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await step(page, 6);
    const keyed = await call(page, 'getState'); frozenWorld(fixed, keyed);
    expect(keyed.residentInspection.view).toBe('free'); expect(keyed.residentInspection.zoom).toBeLessThan(1);
    expect(keyed.cameraPosition).not.toEqual(fixed.cameraPosition);
    await page.locator('[data-resident-view-choice="side"]').tap(); await step(page);
    await page.locator(canvas).scrollIntoViewIfNeeded(); const box = await page.locator(canvas).boundingBox();
    const x = box!.x + box!.width * .5, y = box!.y + box!.height * .4, beforeDrag = await call(page, 'getState');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 38, y: y + 18, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await step(page);
    const dragged = await call(page, 'getState'); frozenWorld(beforeDrag, dragged);
    expect(dragged.residentInspection.view).toBe('free'); expect(dragged.cameraPosition).not.toEqual(beforeDrag.cameraPosition);
    const spread = Math.min(45, box!.width * .15), beforePinch = await call(page, 'getState');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - spread, y, id: 1 }, { x: x + spread, y, id: 2 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - spread * 1.5, y, id: 1 }, { x: x + spread * 1.5, y, id: 2 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await step(page, 12);
    const pinched = await call(page, 'getState'); frozenWorld(beforePinch, pinched);
    expect(pinched.residentInspection.zoom).toBeLessThan(beforePinch.residentInspection.zoom);
    expect(pinched.residentInspection.zoom).toBeGreaterThanOrEqual(.65);
    await page.locator(canvas).focus(); for (let index = 0; index < 12; index++) await page.keyboard.press('-'); await step(page, 8);
    expect((await call(page, 'getState')).residentInspection.zoom).toBe(3);
    for (let index = 0; index < 20; index++) await page.keyboard.press('+'); await step(page, 8);
    expect((await call(page, 'getState')).residentInspection.zoom).toBe(.65);
    await call(page, 'setResidentPart', 'head'); await call(page, 'setResidentView', 'side'); await step(page, 12);
    const paused = await call(page, 'getState'); expect(await page.evaluate(() => (window as any).residentLensPending())).toBe(0);
    await step(page, 4); expect((await call(page, 'getState')).frames).toBe(paused.frames);
    await call(page, 'setMode', 'free'); await step(page, 3); expect((await call(page, 'getState')).residentInspection).toBeNull();
    await call(page, 'setMode', 'guided'); await step(page, 3); const restored = await call(page, 'getState');
    expect(restored.time).toBe(paused.time); expect(restored.paused).toBe(true);
    expect(restored.residentInspection.part).toBe('head'); expect(restored.residentInspection.view).toBe('side');
    validFit(restored, await native(page, species.id, 'head'), 'side');
    await page.evaluate(() => { (window as any).__ctx.props.qaResidentLens = 1; (window as any).__rerender(); }); await step(page);
    expect((await model(page, species.id)).same).toBe(true); expect((await model(page, species.id)).root).toBe(original.root);
    const violations = await page.evaluate(async rules => (await (window as any).axe.run('[data-birdlab-3d-shell]',
      { runOnly: { type: 'rule', values: rules } })).violations.map((row: any) => ({ id: row.id, nodes: row.nodes.map((node: any) => node.target) })), rules);
    expect(violations).toEqual([]); expect(await page.locator('#wrap').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await call(page, 'setPaused', false); const resumed = await call(page, 'getState');
    expect(resumed.time).toBe(restored.time); expect(resumed.residentInspection.active).toBe(false);
    await step(page, 3); expect((await call(page, 'getState')).time).toBeGreaterThan(resumed.time);
    await call(page, 'setPaused', true); await call(page, 'setResidentPart', 'tail');
    await call(page, 'setCamera', 'robin'); expect((await call(page, 'getState')).residentInspection.active).toBe(false);
    await call(page, 'setResidentPart', 'head'); await call(page, 'resetView'); expect((await call(page, 'getState')).residentInspection).toBeNull();
    evidence.push({ viewport: width, host, species: species.id, accessibilityRules: rules, violations, overflow: 0,
      nativeRoot: original.root, keyboard: true, touchDrag: true, touchPinch: true, settled: true, restored: true });
  }
  await touch.detach(); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(stored);
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'inspection-interactions.json'), JSON.stringify({ cases: evidence, errors }, null, 2));
});
