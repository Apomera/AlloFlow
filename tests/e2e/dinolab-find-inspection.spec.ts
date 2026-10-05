import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-find-inspection-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_'))) as Record<string, string>;
const registeredMessages = { ...sectionMessages, ...planMessages, ...footprintMessages, ...findMessages };
const probes = `
window.__voxelQA = { records: [], current: null, raycasts: 0, lastRayColumns: [], rayEvents: [], feedbackFrames: [] };
function qaHitColumn(hit) {
  var u = hit.object.userData || {}, i = hit.instanceId;
  return { column: Number.isInteger(i) && u.columnIndices ? u.columnIndices[i] : u.digColumn,
    layer: Number.isInteger(i) && u.layers ? u.layers[i] : u.layer, role: u.role, name: hit.object.name };
}
['intersectObjects', 'intersectObject'].forEach(function (key) {
  var original = THREE.Raycaster.prototype[key];
  THREE.Raycaster.prototype[key] = function () {
    var hits = original.apply(this, arguments);
    window.__voxelQA.raycasts++;
    window.__voxelQA.lastRayColumns = hits.slice(0, 8).map(qaHitColumn);
    window.__voxelQA.rayEvents.push({ number: window.__voxelQA.raycasts, columns: window.__voxelQA.lastRayColumns });
    if (window.__voxelQA.rayEvents.length > 64) window.__voxelQA.rayEvents.shift();
    return hits;
  };
});
var VoxelRenderer = THREE.WebGLRenderer;
THREE.WebGLRenderer = function (options) {
  var renderer = new VoxelRenderer(options), render = renderer.render.bind(renderer), dispose = renderer.dispose.bind(renderer);
  var record = { renderer: renderer, scene: null, camera: null, renders: 0, disposed: false };
  window.__voxelQA.records.push(record);
  renderer.render = function (scene, camera) {
    if (scene.name === 'dino-voxel-excavation' && !renderer.getRenderTarget()) {
      record.scene = scene; record.camera = camera; record.renders++;
      window.__voxelQA.current = record;
      var removed = scene.getObjectByName('dino-removed-sediment'), dust = scene.getObjectByName('dino-excavation-dust');
      if (removed && dust && (removed.count || dust.count)) {
        var feedback = {
          removed: { count: removed.count, columns: (removed.userData.columnIndices || []).slice(), layers: (removed.userData.removedLayers || []).slice() },
          dust: { count: dust.count, columns: (dust.userData.columnIndices || []).slice() }
        };
        var signature = JSON.stringify(feedback);
        if (signature !== record.lastFeedback) {
          record.lastFeedback = signature; feedback.time = performance.now();
          window.__voxelQA.feedbackFrames.push(feedback);
          if (window.__voxelQA.feedbackFrames.length > 40) window.__voxelQA.feedbackFrames.shift();
        }
      } else record.lastFeedback = null;
    }
    return render(scene, camera);
  };
  renderer.dispose = function () { record.disposed = true; return dispose(); };
  return renderer;
};
THREE.WebGLRenderer.prototype = VoxelRenderer.prototype;
`;
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab',
  width: 1180, height: 920, layout: 'document', appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js', ...runtimeScripts], probes,
});
const pageErrors = new WeakMap<Page, string[]>();
test.setTimeout(240000);
test.use({ video: 'off', trace: 'off', screenshot: 'off' });

test.beforeAll(async () => {
  expect(Object.keys(sectionMessages)).toHaveLength(65);
  expect(Object.keys(planMessages)).toHaveLength(44);
  expect(Object.keys(footprintMessages)).toHaveLength(2);
  expect(Object.keys(findMessages)).toHaveLength(63);
  expect(Object.values(registeredMessages).every(value => typeof value === 'string')).toBe(true);
  expect(Object.values(sectionMessages).every(value => typeof value === 'string')).toBe(true);
  fs.mkdirSync(dir, { recursive: true }); await harness.start();
});
test.afterAll(async () => harness.stop());
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(async ({ page }, info) => {
  const runtime = {
    pageErrors: pageErrors.get(page) || [],
    errors: await page.evaluate(() => (window as any).__events?.errors || []).catch(() => []),
  };
  const translations = await page.evaluate(() => (window as any).__sectionRegistryQA).catch(() => null);
  // Keep diagnostics bounded: no scene dumps, videos, or large traces.
  fs.writeFileSync(path.join(dir, info.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-runtime.json'), JSON.stringify({ ...runtime, translations }));
  await harness.destroy(page);
  expect.soft(runtime).toEqual({ pageErrors: [], errors: [] });
  expect.soft(translations?.registered).toBe(Object.keys(registeredMessages).length);
  expect.soft(translations?.missing).toEqual([]);
  expect.soft(translations?.resolvedKeys.length).toBeGreaterThan(20);
});

function emptyVoxel(seed = 1) {
  return { version: 1, seed, depths: Array(24).fill(0), contacts: Array(24).fill(false), tool: 'brush', focus: 0 };
}
async function theme(page: Page, name = 'theme-default') {
  await page.evaluate(name => { document.body.className = name; (window as any).__rerender(); }, name);
}
async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dinoLab: { tab: 'dig', digSeed: 1, digVoxel: emptyVoxel(), ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(messages => {
    const w = window as any, previous = w.__ctx.t;
    w.__sectionRegistryQA = { registered: Object.keys(messages).length, resolvedKeys: [], missing: [] };
    w.__ctx.t = function (key: string, fallback: string) {
      if (key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || key.startsWith('stem.dinolab.find_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
        const name = key.slice('stem.dinolab.'.length), value = messages[name];
        if (typeof value === 'string') {
          if (!w.__sectionRegistryQA.resolvedKeys.includes(name)) w.__sectionRegistryQA.resolvedKeys.push(name);
          return value;
        }
        w.__sectionRegistryQA.missing.push(key);
        throw new Error('Missing registered Dino planning/section phrase: ' + key);
      }
      return previous(key, fallback);
    };
    w.__rerender();
  }, registeredMessages);
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  expect(start).toBeGreaterThanOrEqual(0); expect(end).toBeGreaterThan(start);
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await theme(page);
  await ready(page);
}
async function ready(page: Page) {
  await expect(page.locator('#dino-voxel-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const record = (window as any).__voxelQA.current;
    return !!record?.scene && record.renders > 1 && !(window as any).__glLive('#dino-voxel-stage')?.lost;
  }), { timeout: 60000 }).toBe(true);
}
async function state(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.dinoLab))); }
async function layers(page: Page) { return (await state(page)).digVoxel.depths as number[]; }
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function camera(page: Page) {
  return page.evaluate(() => {
    const camera = (window as any).__voxelQA.current.camera;
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), zoom: camera.zoom, distance: camera.position.length() };
  });
}
async function sedimentCount(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    let count = 0;
    w.__voxelQA.current.scene.traverse((object: any) => {
      if (!object.isMesh || !object.visible || object.userData.role !== 'sediment-voxel') return;
      if (!object.isInstancedMesh) { count++; return; }
      const matrix = new T.Matrix4();
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, matrix);
        if (Math.abs(matrix.determinant()) > 1e-9) count++;
      }
    });
    return count;
  });
}
async function voxelFraming(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current;
    q.scene.updateMatrixWorld(true); q.camera.updateMatrixWorld(true);
    const bounds = new T.Box3();
    q.scene.traverse((object: any) => {
      if (!object.isMesh || !object.visible || object.userData.role !== 'sediment-voxel') return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const count = object.isInstancedMesh ? object.count : 1;
      for (let index = 0; index < count; index++) {
        const matrix = object.matrixWorld.clone();
        if (object.isInstancedMesh) {
          const local = new T.Matrix4(); object.getMatrixAt(index, local);
          if (Math.abs(local.determinant()) < 1e-9) continue;
          matrix.multiply(local);
        }
        bounds.union(object.geometry.boundingBox.clone().applyMatrix4(matrix));
      }
    });
    // Include the physical excavation plinth, stakes, and ropes. Scenic cliffs
    // and the large ground plane can extend beyond the view intentionally.
    const sedimentSize = bounds.getSize(new T.Vector3()), plot = bounds.clone();
    q.scene.traverse((object: any) => {
      if (!object.isMesh || object.isInstancedMesh || !object.visible || !object.geometry) return;
      let ancestor = object.parent;
      while (ancestor) { if (!ancestor.visible) return; ancestor = ancestor.parent; }
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
      const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      if (center.x < plot.min.x - .7 || center.x > plot.max.x + .7 || center.z < plot.min.z - .7 || center.z > plot.max.z + .7) return;
      if (center.y < plot.min.y - .6 || center.y > plot.max.y + .8) return;
      if (size.x > sedimentSize.x + 1.6 || size.z > sedimentSize.z + 1.6 || size.y > sedimentSize.y + 1.2) return;
      bounds.union(box);
    });
    let maxScreen = 0, maxDepth = 0, invalid = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const p = new T.Vector3(x, y, z).project(q.camera);
      if (![p.x, p.y, p.z].every(Number.isFinite)) invalid++;
      maxScreen = Math.max(maxScreen, Math.abs(p.x), Math.abs(p.y));
      maxDepth = Math.max(maxDepth, Math.abs(p.z));
    }
    return { maxScreen, maxDepth, invalid, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
  });
}
async function assertLiveScene(page: Page) {
  const scene = await harness.glScene(page, '#dino-voxel-stage');
  expect(scene?.hasScene).toBe(true); expect(scene!.renders).toBeGreaterThan(1);
  expect(scene!.visibleMeshes).toBeGreaterThan(3); expect(scene!.draws).toBeGreaterThan(0);
  const pixels = await harness.glPixels(page, '#dino-voxel-stage');
  expect(pixels).not.toBeNull();
  expect(looksBlank(pixels!)).toBe(false);
  const health = await page.evaluate(() => {
    const r = (window as any).__voxelQA.current.renderer;
    return { lost: r.getContext().isContextLost(), shaderFailures: r.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length };
  });
  expect(health).toEqual({ lost: false, shaderFailures: 0 });
}
async function projectedTarget(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current, scene = q.scene, camera = q.camera;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const sediment: any[] = [];
    scene.traverse((object: any) => {
      if (object.isMesh && object.userData.role === 'sediment-voxel' && object.visible) sediment.push(object);
    });
    const ray = new T.Raycaster();
    for (const object of sediment) {
      const instances = object.isInstancedMesh ? object.count : 1;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      for (let instance = 0; instance < instances; instance++) {
        const transform = object.matrixWorld.clone();
        if (object.isInstancedMesh) { const local = new T.Matrix4(); object.getMatrixAt(instance, local); transform.multiply(local); }
        const box = object.geometry.boundingBox.clone().applyMatrix4(transform);
        const point = box.getCenter(new T.Vector3()); point.y = box.max.y + .001;
        const p = point.project(camera);
        if (Math.abs(p.x) > .8 || Math.abs(p.y) > .8 || Math.abs(p.z) > 1) continue;
        ray.setFromCamera(new T.Vector2(p.x, p.y), camera);
        const hit = ray.intersectObjects(sediment, false)[0];
        if (!hit) continue;
        const metadata = w.qaHitColumn(hit);
        if (Number.isInteger(metadata.column) && metadata.column >= 0 && metadata.column < 24) {
          return { x: p.x, y: p.y, column: metadata.column, layer: metadata.layer };
        }
      }
    }
    return null;
  });
}
async function noHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
  expect(size.width, JSON.stringify(size)).toBeLessThanOrEqual(size.viewport);
}


async function sectionScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, q = w.__voxelQA.current;
    const batch = q.scene.getObjectByName('dino-sediment-voxels');
    return {
      scene: q.scene.uuid, batch: batch.uuid, renderer: w.__voxelQA.records.indexOf(q),
      view: q.scene.userData.view, row: q.scene.userData.sectionRow,
      count: batch.count, columns: batch.userData.columnIndices.slice(0, batch.count),
      layers: batch.userData.layers.slice(0, batch.count),
    };
  });
}
function coord(index: number) { return String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1); }
async function observationState(page: Page) {
  const value = await state(page);
  return {
    depths: value.digVoxel.depths, contacts: value.digVoxel.contacts,
    revealed: value.digRevealed || [], citations: value.digCitedClues || [],
    guess: value.digGuess || null, solved: value.digSolvedFor || null,
  };
}
async function mode(page: Page, view: 'full' | 'section' | 'find') {
  await page.locator('[data-dig-view="' + view + '"]').click();
  await expect.poll(async () => (await sectionScene(page)).view).toBe(view);
}
async function row(page: Page, index: number) {
  await page.locator('#dino-section-row').selectOption(String(index));
  await expect.poll(async () => (await sectionScene(page)).row).toBe(index);
}

async function preservedState(page: Page) {
  const value = await state(page);
  return { ...await observationState(page), notebook: value.notebook || {} };
}
async function selectFocus(page: Page, index: number) {
  await page.locator('#dino-dig-cell-' + index).focus();
  await expect.poll(async () => { const value = await state(page); return value.digFocus ?? value.digVoxel.focus; }).toBe(index);
  await expect.poll(async () => (await footprintScene(page)).plan.focus).toBe(index);
}
async function footprintScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current;
    const group = q.scene.getObjectByName('dino-tool-footprint');
    q.scene.updateMatrixWorld(true);
    return {
      scene: q.scene.uuid, renderer: w.__voxelQA.records.indexOf(q), visible: group.visible,
      role: group.userData.role, plan: JSON.parse(JSON.stringify(group.userData.plan)),
      targets: Array.from({ length: 24 }, (_, index) => {
        const target = group.getObjectByName('dino-tool-target-' + index);
        if (!target || !target.visible) return null;
        return { ...target.userData, position: target.getWorldPosition(new T.Vector3()).toArray() };
      }).filter(Boolean)
    };
  });
}
async function assertPlanParity(page: Page, expected: number[]) {
  const snapshot = await footprintScene(page), plan = snapshot.plan;
  expect(snapshot.role).toBe('observed-tool-footprint');
  expect(plan.footprint).toEqual(expected);
  expect(plan.columns.map((column: any) => column.index)).toEqual(expected);
  expect(snapshot.targets.map((target: any) => target.digColumn).sort((a: number, b: number) => a - b)).toEqual(expected);
  const cells = await page.locator('#dino-action-plan-map [data-dig-plan-cell]').evaluateAll(elements => elements.map(element => ({
    index: Number(element.getAttribute('data-dig-plan-cell')),
    footprint: element.getAttribute('data-dig-plan-footprint'), status: element.getAttribute('data-dig-plan-status')
  })));
  expect(cells).toHaveLength(24);
  expect(cells.filter(cell => cell.footprint === 'true').map(cell => cell.index)).toEqual(expected);
  for (const column of plan.columns) {
    const target = snapshot.targets.find((entry: any) => entry.digColumn === column.index)!;
    expect(target).toMatchObject({ status: column.status, minRemoval: column.minRemoval, maxRemoval: column.maxRemoval, removed: column.removed, remaining: column.remaining, contact: column.contact });
    const clearance = target.position[1] - column.remaining * .52;
    expect(clearance).toBeGreaterThanOrEqual(0); expect(clearance).toBeLessThan(.4);
    expect(target.position[0]).toBeCloseTo((column.col - 2.5) * 1.08, 5);
    expect(target.position[2]).toBeCloseTo((column.row - 1.5) * 1.08, 5);
    expect(cells.find(cell => cell.index === column.index)?.status).toBe(column.status);
  }
  expect(cells.filter(cell => cell.footprint !== 'true').every(cell => cell.status === null)).toBe(true);
  await expect(page.locator('#dino-action-plan')).toHaveAttribute('data-dig-plan-tool', plan.tool);
  await expect(page.locator('#dino-action-plan')).toHaveAttribute('data-dig-plan-blocked', String(plan.blocked));
  await expect(page.locator('#dino-action-plan-outcome')).toHaveAttribute('data-dig-plan-min', String(plan.minRemoval));
  await expect(page.locator('#dino-action-plan-outcome')).toHaveAttribute('data-dig-plan-max', String(plan.maxRemoval));
  expect(JSON.stringify(plan)).not.toMatch(/"(?:hasBone|burial|fossilY|coverRemaining|species|bonesExposed|clues)"/);
  return snapshot;
}
async function feedbackFrames(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__voxelQA.feedbackFrames)) as any[]);
}
async function feedbackNow(page: Page) {
  return page.evaluate(() => {
    const scene = (window as any).__voxelQA.current.scene;
    return { removed: scene.getObjectByName('dino-removed-sediment').count, dust: scene.getObjectByName('dino-excavation-dust').count };
  });
}
async function assertFeedback(page: Page, columns: number[]) {
  await expect.poll(async () => (await feedbackFrames(page)).some(frame => JSON.stringify(frame.removed.columns) === JSON.stringify(columns))).toBe(true);
  const frame = (await feedbackFrames(page)).findLast(frame => JSON.stringify(frame.removed.columns) === JSON.stringify(columns))!;
  expect(frame.removed.count).toBe(columns.length);
  expect(frame.removed.layers).toEqual(columns.map(() => 1));
  expect(frame.dust.columns).toEqual(columns);
  expect(frame.dust.count).toBe(columns.length * 12);
  expect(frame.removed.count).toBeLessThanOrEqual(9); expect(frame.dust.count).toBeLessThanOrEqual(108);
  return frame;
}

function exposedShapesFixture() {
  const voxel = emptyVoxel();
  voxel.depths[5] = 3; voxel.depths[12] = 4; voxel.depths[19] = 4;
  voxel.depths[22] = 1; voxel.contacts[22] = true; voxel.depths[23] = 1;
  return voxel;
}
async function findScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current, scene = q.scene;
    const group = scene.getObjectByName('dino-find-closeup'), world = scene.getObjectByName('dino-excavation-world');
    function effectiveVisible(object: any) { for (let value = object; value; value = value.parent) if (!value.visible) return false; return true; }
    scene.updateMatrixWorld(true); q.camera.updateMatrixWorld(true);
    const visible: number[] = [], specimens: any[] = [];
    for (let index = 0; index < 24; index++) {
      const clone = group.getObjectByName('dino-find-fragment-' + index);
      if (!clone || !effectiveVisible(clone)) continue;
      visible.push(index);
      const box = new T.Box3().setFromObject(clone), size = box.getSize(new T.Vector3());
      let meshes = 0, vertices = 0, validNormals = true, maxScreen = 0, maxDepth = 0;
      clone.traverse((object: any) => {
        if (!object.isMesh || !effectiveVisible(object)) return;
        meshes++; const position = object.geometry.attributes.position, normal = object.geometry.attributes.normal;
        vertices += position?.count || 0;
        if (!normal || normal.count !== position?.count || !Array.from(normal.array).every(Number.isFinite)) validNormals = false;
      });
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new T.Vector3(x, y, z).project(q.camera);
        maxScreen = Math.max(maxScreen, Math.abs(point.x), Math.abs(point.y)); maxDepth = Math.max(maxDepth, Math.abs(point.z));
      }
      specimens.push({ index, size: size.toArray(), scale: clone.scale.toArray(), meshes, vertices, validNormals, maxScreen, maxDepth });
    }
    return {
      scene: scene.uuid, renderer: w.__voxelQA.records.indexOf(q), view: scene.userData.view,
      inspectionOnly: scene.userData.inspectionOnly, visibleLayers: scene.userData.visibleLayers,
      selection: scene.userData.findSelection, worldVisible: effectiveVisible(world),
      role: group.userData.role, record: group.userData.find == null ? null : JSON.parse(JSON.stringify(group.userData.find)),
      columns: (group.userData.columnIndices || []).slice(), visible, specimens,
      contextLost: q.renderer.getContext().isContextLost(), shaderFailures: q.renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length
    };
  });
}
async function inspectFind(page: Page, index: number) {
  await page.locator('#dino-find-select').selectOption(String(index));
  await expect(page.locator('#dino-find-inspect')).toBeEnabled();
  await page.locator('#dino-find-inspect').click();
  await expect.poll(async () => (await findScene(page)).selection).toBe(index);
  await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded(); await settle(page);
  await expect(page.locator('#dino-voxel-stage')).toHaveAttribute('data-dig-view', 'find');
}
async function assertSelectedFind(page: Page, index: number, shape: 'curved' | 'elongate' | 'compact') {
  const snapshot = await findScene(page);
  expect(snapshot).toMatchObject({ view: 'find', inspectionOnly: true, visibleLayers: 0, selection: index, worldVisible: false, role: 'exposed-find-inspection', columns: [index], visible: [index], contextLost: false, shaderFailures: 0 });
  expect(snapshot.record).toMatchObject({ index, coord: coord(index), shape });
  expect(Object.keys(snapshot.record).sort()).toEqual(['col', 'coord', 'index', 'remaining', 'removed', 'row', 'shape']);
  await expect(page.locator('#dino-find-summary [data-dig-find-shape]')).toHaveAttribute('data-dig-find-shape', shape);
  const specimen = snapshot.specimens[0];
  expect(specimen.meshes).toBeGreaterThan(0); expect(specimen.vertices).toBeGreaterThan(30);
  expect(specimen.size.every((dimension: number) => Number.isFinite(dimension) && dimension > .001)).toBe(true);
  expect(specimen.validNormals).toBe(true);
  expect(specimen.scale[0]).toBeCloseTo(specimen.scale[1], 5); expect(specimen.scale[1]).toBeCloseTo(specimen.scale[2], 5);
  expect(specimen.maxScreen).toBeLessThanOrEqual(1); expect(specimen.maxDepth).toBeLessThanOrEqual(1);
  const pixels = await harness.glPixels(page, '#dino-voxel-stage'); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  return snapshot;
}

test('find inspection lists only exposed observations and leaves contacts and unknown columns blank', async ({ page }) => {
  const voxel = exposedShapesFixture(); voxel.focus = 23;
  await mount(page, { digFocus: 23, digVoxel: voxel, notebook: { microraptor: { question: 'Closeup inspection preserves this independent record.' } } });
  const before = await preservedState(page), initial = await sectionScene(page);
  const values = await page.locator('#dino-find-select option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(values).toEqual(['', '5', '12', '19']);
  await mode(page, 'find');
  await selectFocus(page, 23);
  await expect.poll(async () => (await findScene(page)).selection).toBeNull();
  await expect(page.locator('#dino-find-empty')).toHaveAttribute('data-dig-find-empty', 'unselected');
  await expect(page.locator('#dino-find-canvas-empty')).toBeVisible();
  await expect(page.locator('#dino-find-inspect')).toHaveCount(0);
  const empty = await findScene(page);
  expect(empty).toMatchObject({ selection: null, record: null, columns: [], visible: [], worldVisible: false, visibleLayers: 0, inspectionOnly: true });
  const canvas = page.locator('#dino-voxel-canvas'); await canvas.focus(); await canvas.press('Enter'); await canvas.press('Space');
  await canvas.click({ position: { x: 30, y: 80 } });
  expect(await preservedState(page)).toEqual(before);
  await selectFocus(page, 22);
  await expect.poll(async () => (await findScene(page)).selection).toBeNull();
  expect((await findScene(page)).record).toBeNull();
  await canvas.focus(); await canvas.press('Enter'); await canvas.press('Space');
  expect(await preservedState(page)).toEqual(before);
  await expect(page.locator('#dino-find-select option[value="22"]')).toHaveCount(0);
  await expect(page.locator('#dino-find-select option[value="23"]')).toHaveCount(0);
  await inspectFind(page, 5); const selected = await assertSelectedFind(page, 5, 'compact');
  expect(selected.scene).toBe(initial.scene); expect(selected.renderer).toBe(initial.renderer);
  expect(await preservedState(page)).toEqual(before);
  fs.writeFileSync(path.join(dir, 'find-exposed-only-proof.json'), JSON.stringify({ exposedOptions: [5, 12, 19], unknownBlank: true, contactBlank: true, emptyCanvasActivationDoesNotDig: true, observedRecordKeys: Object.keys(selected.record), evidenceAndNotebookPreserved: true, rendererRetained: true }));
});

test('three generic fragments render real closeups and independent cameras retain excavation evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const voxel = exposedShapesFixture(); voxel.focus = 19;
  const fullPose = { yaw: .71, pitch: .75, zoom: 1.1 };
  await mount(page, { digFocus: 19, digVoxel: voxel, digVoxelPose: fullPose });
  const before = await preservedState(page), initial = await sectionScene(page), initialCamera = await camera(page);
  const wheelSwitchMs = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector('#dino-voxel-canvas')!.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    (document.querySelector('[data-dig-view="find"]') as HTMLButtonElement).click();
    return performance.now() - start;
  });
  expect(wheelSwitchMs).toBeLessThan(160);
  await expect.poll(async () => (await findScene(page)).view).toBe('find');
  await expect.poll(async () => (await state(page)).digVoxelPose?.zoom).toBeCloseTo(fullPose.zoom * 1.08, 6);
  const shapes: any[] = [];
  for (const [index, shape] of [[5, 'compact'], [12, 'curved'], [19, 'elongate']] as const) {
    await inspectFind(page, index); const snapshot = await assertSelectedFind(page, index, shape);
    expect(snapshot.scene).toBe(initial.scene); expect(snapshot.renderer).toBe(initial.renderer);
    expect(await preservedState(page)).toEqual(before);
    shapes.push({ index, shape, geometry: snapshot.specimens[0] });
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-closeup-' + shape + '-desktop.png') });
  }
  await page.locator('#dino-find-panel').screenshot({ path: path.join(dir, 'find-panel-desktop.png') });
  await expect(page.getByRole('button', { name: 'Brush', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Trowel', exact: true })).toBeDisabled();
  await expect(page.locator('[data-dig-camera]')).toHaveCount(0);
  await expect(page.locator('#dino-footprint-toggle')).toHaveCount(0);
  expect((await footprintScene(page)).visible).toBe(false); expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
  const canvas = page.locator('#dino-voxel-canvas'); await canvas.focus(); await canvas.press('ArrowLeft'); await canvas.press('+');
  await expect.poll(async () => !!(await state(page)).digVoxelFindPose).toBe(true);
  const beforeWheelKey = (await state(page)).digVoxelFindPose;
  const wheelKeyMs = await page.evaluate(() => {
    const canvas = document.querySelector('#dino-voxel-canvas')!, start = performance.now();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    return performance.now() - start;
  });
  expect(wheelKeyMs).toBeLessThan(160);
  await expect.poll(async () => (await state(page)).digVoxelFindPose?.yaw).toBeCloseTo(beforeWheelKey.yaw + .12, 6);
  const immediateWheelKeyPose = (await state(page)).digVoxelFindPose;
  expect(immediateWheelKeyPose.zoom).toBeCloseTo(beforeWheelKey.zoom * 1.08, 6);
  await page.waitForTimeout(220);
  expect((await state(page)).digVoxelFindPose).toEqual(immediateWheelKeyPose);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .56, { steps: 8 }); await page.mouse.up();
  const findPose = (await state(page)).digVoxelFindPose;
  expect(findPose).not.toBeNull(); expect((await state(page)).digVoxelPose).toEqual({ ...fullPose, zoom: fullPose.zoom * 1.08 });
  expect(await preservedState(page)).toEqual(before);
  await mode(page, 'full'); await settle(page);
  const restoredCamera = await camera(page);
  for (let i = 0; i < initialCamera.quaternion.length; i++) expect(restoredCamera.quaternion[i]).toBeCloseTo(initialCamera.quaternion[i], 5);
  expect(restoredCamera.distance).toBeLessThan(initialCamera.distance);
  await mode(page, 'section'); await canvas.focus(); await canvas.press('ArrowRight');
  await expect.poll(async () => !!(await state(page)).digVoxelSectionPose).toBe(true);
  expect((await state(page)).digVoxelFindPose).toEqual(findPose);
  await mode(page, 'find');
  await page.getByRole('button', { name: findMessages.find_reset_camera, exact: true }).click();
  await expect.poll(async () => (await state(page)).digVoxelFindPose).toBeNull();
  await canvas.scrollIntoViewIfNeeded(); await settle(page); await assertSelectedFind(page, 19, 'elongate');
  expect(await preservedState(page)).toEqual(before);
  fs.writeFileSync(path.join(dir, 'find-camera-geometry-proof.json'), JSON.stringify({ shapes, wheelSwitchMs, wheelKeyMs, wheelThenArrowSurvivesQueuedSave: true, immediateWheelKeyPose, fullPoseRestored: true, separateFullSectionFindPoses: true, selectionOnly: true, retainedRenderer: true }));
});

test('undo removes an exposed closeup immediately and saved state keeps contacts out of the find list', async ({ page }) => {
  const voxel = emptyVoxel(); voxel.focus = 22; voxel.depths[22] = 1; voxel.contacts[22] = true;
  await mount(page, { digFocus: 22, digVoxel: voxel, notebook: { microraptor: { question: 'Undo does not edit my independent note.' } } });
  const notebook = (await state(page)).notebook, initial = await sectionScene(page);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(2);
  await inspectFind(page, 22); await assertSelectedFind(page, 22, 'elongate');
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-brush-exposed-e4.png') });
  await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click();
  await expect.poll(async () => (await findScene(page)).selection).toBeNull();
  const undone = await findScene(page);
  expect(undone).toMatchObject({ view: 'find', record: null, visible: [], columns: [], worldVisible: false });
  expect((await layers(page))[22]).toBe(1); expect((await state(page)).digVoxel.contacts[22]).toBe(true);
  await expect(page.locator('#dino-find-empty')).toHaveAttribute('data-dig-find-empty', 'none');
  await expect(page.locator('#dino-find-canvas-empty')).toBeVisible();
  await expect(page.locator('#dino-find-select option')).toHaveCount(1);
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0);
  expect(undone.scene).toBe(initial.scene); expect((await state(page)).notebook).toEqual(notebook);
  const saved = await state(page);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, saved);
  expect((await findScene(page)).record).toBeNull(); expect((await findScene(page)).visible).toEqual([]);
  expect((await state(page)).notebook).toEqual(notebook);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-empty-after-undo.png') });
  fs.writeFileSync(path.join(dir, 'find-undo-persistence-proof.json'), JSON.stringify({ exposedIndex: 22, brushDepth: 2, undoDepth: 1, contactRetained: true, staleCloseupRemoved: true, findListEmptyAfterUndo: true, cluesAfterUndo: 0, rendererRetainedUntilUnmount: true, savedStateRestoresBlankFindMode: true, notebookPreserved: true }));
});

test('native find selection and phone themes frame all shapes and release closeup resources', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const voxel = exposedShapesFixture(); voxel.focus = 19;
  await mount(page, { digFocus: 19, digVoxel: voxel, digVoxelView: 'find' });
  const before = await preservedState(page), initial = await sectionScene(page), mountId = await harness.currentMount(page);
  const select = page.locator('#dino-find-select'); await select.focus(); await select.press('ArrowUp');
  await expect(select).toHaveValue('12');
  await page.locator('#dino-find-inspect').focus(); await page.locator('#dino-find-inspect').press('Enter');
  await expect.poll(async () => (await findScene(page)).selection).toBe(12);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [], framing: any[] = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 }); await theme(page);
    for (const [index, shape] of [[5, 'compact'], [12, 'curved'], [19, 'elongate']] as const) {
      await inspectFind(page, index); const snapshot = await assertSelectedFind(page, index, shape);
      framing.push({ width, shape, geometry: snapshot.specimens[0] });
    }
    for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
      await theme(page, name); await noHorizontalOverflow(page);
      const stage = (await page.locator('#dino-voxel-stage').boundingBox())!;
      expect(stage.height).toBeCloseTo(360, 0);
      for (const selector of ['#dino-find-panel', '#dino-find-select']) {
        const box = (await page.locator(selector).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
      });
      audits.push({ width, theme: name, violations });
      expect(await preservedState(page)).toEqual(before);
      const retained = await findScene(page); expect(retained.scene).toBe(initial.scene); expect(retained.renderer).toBe(initial.renderer);
      expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
    }
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-closeup-phone-' + width + '.png') });
    await page.locator('#dino-find-panel').screenshot({ path: path.join(dir, 'find-panel-phone-' + width + '.png') });
  }
  fs.writeFileSync(path.join(dir, 'find-accessibility.json'), JSON.stringify(audits));
  fs.writeFileSync(path.join(dir, 'find-phone-framing.json'), JSON.stringify(framing));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
  const resources = await page.evaluate(() => {
    const w = window as any, resources = new Set<any>();
    w.__voxelQA.current.scene.getObjectByName('dino-find-closeup').traverse((object: any) => {
      if (object.geometry) resources.add(object.geometry);
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        resources.add(material); Object.values(material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      }
    });
    w.__findDisposal = { total: resources.size, disposed: 0 };
    resources.forEach(resource => resource.addEventListener('dispose', () => { w.__findDisposal.disposed++; }));
    return resources.size;
  });
  expect(resources).toBeGreaterThan(3);
  await page.locator('#dinotab-notes').click();
  await expect.poll(async () => (await harness.glContexts(page, mountId)).filter(context => !context.lost).length).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).__findDisposal.disposed)).toBe(resources);
  await page.locator('#dinotab-dig').click(); await ready(page);
  expect((await findScene(page)).record.index).toBe(19); expect(await preservedState(page)).toEqual(before);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  fs.writeFileSync(path.join(dir, 'find-gpu-lifecycle-proof.json'), JSON.stringify({ nativeKeyboardSelect: true, reducedMotionStatic: true, ownedCloseupResourcesDisposed: resources, contexts: (await harness.glContexts(page)).map(context => ({ id: context.id, lost: context.lost })), retainedRendererDuringViewChanges: true, savedSelectionAndEvidenceRemounted: true }));
});
