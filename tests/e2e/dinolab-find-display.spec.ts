import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-find-display-enhancement';
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

type FindLook = 'surface' | 'raking' | 'outline';
type FindCamera = 'oblique' | 'top' | 'end';
function shortcutPose(name: FindCamera, index: number, seed = 1) {
  if (name === 'top') return { yaw: 0, pitch: 1.53, zoom: 1 };
  if (name === 'end') return { yaw: Math.PI / 2 + ((index * 1.813 + seed * .19) % (2 * Math.PI)), pitch: .25, zoom: 1 };
  return { yaw: .66, pitch: .62, zoom: 1 };
}
async function displayScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current, scene = q.scene;
    scene.updateMatrixWorld(true);
    function visible(object: any) { for (let value = object; value; value = value.parent) if (!value.visible) return false; return true; }
    function hash(array: any) {
      if (!array) return null;
      let value = 2166136261;
      for (const byte of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) value = Math.imul(value ^ byte, 16777619) >>> 0;
      return value;
    }
    function materials(object: any) {
      return (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).map((material: any) => ({
        uuid: material.uuid, name: material.name, type: material.type, color: material.color?.toArray(), emissive: material.emissive?.toArray(),
        roughness: material.roughness, metalness: material.metalness, wireframe: !!material.wireframe,
        opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, side: material.side,
        toneMapped: material.toneMapped, map: material.map?.uuid || null,
        bumpMap: material.bumpMap?.uuid || null, normalMap: material.normalMap?.uuid || null,
      }));
    }
    function meshes(group: any) {
      const result: any[] = [];
      group?.traverse((object: any) => {
        if (!object.isMesh) return;
        result.push({ geometry: object.geometry.uuid, castShadow: object.castShadow, positions: hash(object.geometry.attributes.position?.array),
          normals: hash(object.geometry.attributes.normal?.array), indices: hash(object.geometry.index?.array),
          materials: materials(object) });
      });
      return result;
    }
    const selected = scene.userData.findSelection;
    const clone = Number.isInteger(selected) ? scene.getObjectByName('dino-find-fragment-' + selected) : null;
    const originals = Array.from({ length: 24 }, (_, index) => ({ index, meshes: meshes(scene.getObjectByName('dino-fossil-fragment-' + index)) }));
    const lights: any[] = [];
    scene.traverse((object: any) => {
      if (!object.isLight) return;
      lights.push({ uuid: object.uuid, name: object.name, type: object.type, visible: visible(object), intensity: object.intensity,
        color: object.color.toArray(), position: object.getWorldPosition(new T.Vector3()).toArray(),
        target: object.target ? object.target.getWorldPosition(new T.Vector3()).toArray() : null });
    });
    const findLighting = scene.getObjectByName('dino-find-lighting');
    return { scene: scene.uuid, renderer: w.__voxelQA.records.indexOf(q), renders: q.renders,
      findLook: scene.userData.findLook, lightingLook: findLighting?.userData.look ?? null,
      lightingVisible: findLighting ? visible(findLighting) : false,
      originals, cloneMeshes: meshes(clone), lights, shadersFailed: q.renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length };
  });
}
function geometryOnly(meshes: any[]) { return meshes.map(({ materials, castShadow, ...geometry }) => geometry); }
function activeFindLights(snapshot: any) {
  return snapshot.lights.filter((light: any) => ['dino-find-ambient', 'dino-find-key', 'dino-find-fill'].includes(light.name));
}
function siteLights(snapshot: any) { return snapshot.lights.filter((light: any) => !light.name.startsWith('dino-find-')); }
function assertFindLighting(snapshot: any, look: FindLook) {
  expect(snapshot.findLook).toBe(look); expect(snapshot.lightingLook).toBe(look); expect(snapshot.lightingVisible).toBe(true);
  const lights = activeFindLights(snapshot);
  expect(lights.map((light: any) => light.name).sort()).toEqual(['dino-find-ambient', 'dino-find-fill', 'dino-find-key']);
  expect(lights.every((light: any) => light.visible)).toBe(true);
  expect(siteLights(snapshot).every((light: any) => !light.visible)).toBe(true);
  const expected = look === 'raking' ? [.18, 1.7, .12] : [.50, 1.15, .22];
  for (const [index, name] of ['dino-find-ambient', 'dino-find-key', 'dino-find-fill'].entries())
    expect(lights.find((light: any) => light.name === name).intensity).toBeCloseTo(expected[index], 5);
  expect(lights.find((light: any) => light.name === 'dino-find-key').position).toEqual(look === 'raking' ? [-6, 2.3, 4] : [-6, 12, 8]);
}
async function appearance(page: Page, look: FindLook) {
  const before = await displayScene(page);
  await page.locator('button[data-dig-find-look="' + look + '"]').click();
  await expect(page.locator('button[data-dig-find-look="' + look + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#dino-voxel-stage')).toHaveAttribute('data-dig-find-look', look);
  await expect.poll(async () => (await state(page)).digVoxelFindLook).toBe(look);
  // The on-demand renderer deliberately pauses while the canvas is offscreen.
  await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();
  if (before.findLook !== look) await expect.poll(async () => (await displayScene(page)).renders).toBeGreaterThan(before.renders);
  await settle(page);
  const after = await displayScene(page); expect(after.findLook).toBe(look);
  return after;
}
async function viewShortcut(page: Page, name: FindCamera, index: number) {
  await page.locator('[data-dig-find-camera="' + name + '"]').click();
  await expect.poll(async () => (await state(page)).digVoxelFindPose).toEqual(shortcutPose(name, index));
  await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();
  await settle(page);
}

test('find appearance changes real clone shading and lights while preserving original geometry and materials', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const voxel = exposedShapesFixture(); voxel.focus = 12;
  await mount(page, { digFocus: 12, digVoxel: voxel });
  const observation = await preservedState(page), full = await displayScene(page);
  await inspectFind(page, 12);
  await expect(page.locator('#dino-find-display')).toBeVisible();
  await expect(page.locator('button[data-dig-find-look="surface"]')).toHaveAttribute('aria-pressed', 'true');
  const surface = await displayScene(page);
  assertFindLighting(surface, 'surface');
  const surfacePixels = await harness.glPixels(page, '#dino-voxel-stage'); expect(surfacePixels).not.toBeNull();
  const raking = await appearance(page, 'raking');
  assertFindLighting(raking, 'raking');
  expect(raking.lights).not.toEqual(surface.lights);
  expect(raking.cloneMeshes).toEqual(surface.cloneMeshes);
  await assertSelectedFind(page, 12, 'curved');
  const rakingPixels = await harness.glPixels(page, '#dino-voxel-stage'); expect(rakingPixels).not.toBeNull();
  expect(rakingPixels!.png.equals(surfacePixels!.png)).toBe(false);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-raking-desktop.png') });
  const outline = await appearance(page, 'outline');
  assertFindLighting(outline, 'outline');
  expect(outline.cloneMeshes.length).toBe(surface.cloneMeshes.length);
  expect(outline.cloneMeshes.every(mesh => mesh.castShadow === false)).toBe(true);
  const outlineMaterials = outline.cloneMeshes.flatMap(mesh => mesh.materials);
  expect(outlineMaterials.length).toBeGreaterThan(0);
  expect(outlineMaterials.every((material: any) => material.name === 'dino-find-outline'
    && material.type === 'MeshBasicMaterial' && material.wireframe === false
    && material.map === null && material.bumpMap === null && material.normalMap === null
    && material.toneMapped === false && material.transparent === false && material.opacity === 1)).toBe(true);
  expect(outlineMaterials.every((material: any) => material.color[0] < material.color[1]
    && material.color[0] < material.color[2] && material.color.every((channel: number) => channel < .4))).toBe(true);
  expect(new Set(outlineMaterials.map((material: any) => material.uuid)).size).toBe(1);
  expect(geometryOnly(outline.cloneMeshes)).toEqual(geometryOnly(surface.cloneMeshes));
  const original = full.originals.find(record => record.index === 12)!.meshes;
  for (let i = 0; i < outline.cloneMeshes.length; i++) {
    expect(outline.cloneMeshes[i].geometry).toBe(original[i].geometry);
    for (let j = 0; j < outline.cloneMeshes[i].materials.length; j++) expect(outline.cloneMeshes[i].materials[j].uuid).not.toBe(original[i].materials[j].uuid);
  }
  await assertSelectedFind(page, 12, 'curved');
  const outlinePixels = await harness.glPixels(page, '#dino-voxel-stage'); expect(outlinePixels).not.toBeNull();
  expect(outlinePixels!.png.equals(surfacePixels!.png)).toBe(false); expect(outlinePixels!.png.equals(rakingPixels!.png)).toBe(false);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-outline-desktop.png') });
  const restored = await appearance(page, 'surface');
  assertFindLighting(restored, 'surface');
  expect(restored.cloneMeshes).toEqual(surface.cloneMeshes);
  expect(restored.lights).toEqual(surface.lights);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-surface-desktop.png') });
  await page.locator('#dino-find-display').screenshot({ path: path.join(dir, 'find-display-controls-desktop.png') });
  for (const snapshot of [surface, raking, outline, restored]) {
    expect(snapshot.originals).toEqual(full.originals); expect(snapshot.scene).toBe(full.scene); expect(snapshot.renderer).toBe(full.renderer);
    expect(snapshot.shadersFailed).toBe(0);
  }
  expect(await preservedState(page)).toEqual(observation);
  await mode(page, 'full'); const restoredFull = await displayScene(page);
  expect(restoredFull.originals).toEqual(full.originals); expect(siteLights(restoredFull)).toEqual(siteLights(full));
  expect(restoredFull.findLook).toBeNull(); expect(restoredFull.lightingLook).toBeNull(); expect(restoredFull.lightingVisible).toBe(false);
  expect(activeFindLights(restoredFull).every((light: any) => !light.visible)).toBe(true);
  fs.writeFileSync(path.join(dir, 'find-display-material-light-proof.json'), JSON.stringify({ geometryUnchanged: true, originalMaterialsAndCastFlagsUnchanged: true, solidSilhouetteOwnMaterial: true, wireframeFalse: true, rakingLightsChanged: true, actualCanvasPixelsDifferAcrossAllLooks: true, restoredFullLights: true, rendererRetained: true, evidencePreserved: true, selectedGeometry: geometryOnly(surface.cloneMeshes), surfaceLights: activeFindLights(surface), rakingLights: activeFindLights(raking) }));
});

test('native look and camera shortcuts preserve pose banks and supersede queued wheel input', async ({ page }) => {
  const voxel = exposedShapesFixture(); voxel.focus = 19;
  const fullPose = { yaw: .71, pitch: .75, zoom: 1.1 }, sectionPose = { yaw: -.21, pitch: .42, zoom: .95 };
  await mount(page, { digFocus: 19, digVoxel: voxel, digVoxelPose: fullPose, digVoxelSectionPose: sectionPose });
  const observation = await preservedState(page), initial = await displayScene(page);
  await inspectFind(page, 19);
  const surface = page.locator('button[data-dig-find-look="surface"]'); await surface.focus(); await surface.press('Tab');
  await expect(page.locator('button[data-dig-find-look="raking"]')).toBeFocused(); await page.keyboard.press('Space');
  await expect(page.locator('button[data-dig-find-look="raking"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab'); await expect(page.locator('button[data-dig-find-look="outline"]')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('button[data-dig-find-look="outline"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab'); await expect(page.locator('[data-dig-find-camera="oblique"]')).toBeFocused(); await page.keyboard.press('Enter');
  for (const name of ['oblique', 'top', 'end'] as const) {
    await viewShortcut(page, name, 19);
    await expect(page.locator('[data-dig-find-camera="' + name + '"]')).not.toHaveAttribute('aria-pressed');
    await assertSelectedFind(page, 19, 'elongate');
  }
  const wheelPresetMs = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector('#dino-voxel-canvas')!.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    (document.querySelector('[data-dig-find-camera="top"]') as HTMLButtonElement).click();
    return performance.now() - start;
  });
  expect(wheelPresetMs).toBeLessThan(160);
  await expect.poll(async () => (await state(page)).digVoxelFindPose).toEqual(shortcutPose('top', 19));
  await page.waitForTimeout(220); expect((await state(page)).digVoxelFindPose).toEqual(shortcutPose('top', 19));
  await page.locator('#dino-voxel-canvas').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await state(page)).digVoxelFindPose?.yaw).toBeCloseTo(.12, 6);
  const freelyOrbited = (await state(page)).digVoxelFindPose;
  await mode(page, 'full'); expect((await state(page)).digVoxelPose).toEqual(fullPose);
  await mode(page, 'section'); expect((await state(page)).digVoxelSectionPose).toEqual(sectionPose);
  await mode(page, 'find'); expect((await state(page)).digVoxelFindPose).toEqual(freelyOrbited);
  expect((await state(page)).digVoxelFindLook).toBe('outline');
  expect((await displayScene(page)).scene).toBe(initial.scene); expect((await displayScene(page)).renderer).toBe(initial.renderer);
  expect(await preservedState(page)).toEqual(observation);
  fs.writeFileSync(path.join(dir, 'find-display-camera-keyboard-proof.json'), JSON.stringify({ nativeTabSpaceEnter: true, shortcutPoses: { oblique: shortcutPose('oblique', 19), top: shortcutPose('top', 19), end: shortcutPose('end', 19) }, wheelPresetMs, pendingWheelCancelled: true, freeOrbitPreserved: true, independentPoseBanks: true, rendererRetained: true, evidencePreserved: true }));
});

test('display controls expose only observed finds and undo clears every closeup presentation', async ({ page }) => {
  const voxel = emptyVoxel(); voxel.focus = 22; voxel.depths[22] = 1; voxel.contacts[22] = true;
  await mount(page, { digFocus: 22, digVoxel: voxel, notebook: { microraptor: { question: 'Display changes keep this independent observation.' } } });
  const notebook = (await state(page)).notebook;
  await expect(page.locator('#dino-find-display')).toHaveCount(0);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await inspectFind(page, 22); const observed = await preservedState(page);
  await appearance(page, 'raking'); await viewShortcut(page, 'end', 22); await appearance(page, 'outline');
  expect(await preservedState(page)).toEqual(observed);
  await selectFocus(page, 23); await expect.poll(async () => (await findScene(page)).selection).toBeNull();
  const blankPresentation = await displayScene(page);
  expect(blankPresentation.findLook).toBeNull(); expect(blankPresentation.lightingLook).toBeNull(); expect(blankPresentation.lightingVisible).toBe(false);
  expect(activeFindLights(blankPresentation).every((light: any) => !light.visible)).toBe(true);
  await expect(page.locator('#dino-find-display')).toHaveCount(0);
  expect((await findScene(page)).record).toBeNull(); expect((await findScene(page)).visible).toEqual([]);
  expect((await displayScene(page)).findLook).toBeNull(); expect((await displayScene(page)).lightingVisible).toBe(false);
  await expect(page.locator('#dino-find-select option[value="23"]')).toHaveCount(0);
  await page.locator('#dino-voxel-canvas').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  expect(await preservedState(page)).toEqual(observed);
  await inspectFind(page, 22); await assertSelectedFind(page, 22, 'elongate');
  await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click();
  await expect.poll(async () => (await findScene(page)).selection).toBeNull();
  await expect(page.locator('#dino-find-display')).toHaveCount(0); await expect(page.locator('#dino-find-canvas-empty')).toBeVisible();
  expect((await layers(page))[22]).toBe(1); expect((await state(page)).digVoxel.contacts[22]).toBe(true);
  expect((await findScene(page)).record).toBeNull(); expect((await findScene(page)).visible).toEqual([]);
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0); expect((await state(page)).notebook).toEqual(notebook);
  const saved = await state(page); await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, saved); await expect(page.locator('#dino-find-display')).toHaveCount(0);
  expect((await findScene(page)).record).toBeNull(); expect((await state(page)).notebook).toEqual(notebook);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-empty-after-undo.png') });
  fs.writeFileSync(path.join(dir, 'find-display-privacy-undo-proof.json'), JSON.stringify({ selectedExposedOnly: true, coveredSelectionBlank: true, controlsAbsentWhenBlank: true, canvasActivationDoesNotDig: true, undoClearsCloseup: true, savedEmptyModeRestored: true, contactRetained: true, notebookPreserved: true }));
});

test('find display buttons fit phone themes and reduced motion renders on demand with complete cleanup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const voxel = exposedShapesFixture(); voxel.focus = 19;
  await mount(page, { digFocus: 19, digVoxel: voxel, digVoxelView: 'find' });
  const observation = await preservedState(page), initial = await displayScene(page), mountId = await harness.currentMount(page);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [], framing: any[] = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [index, shape] of [[5, 'compact'], [12, 'curved'], [19, 'elongate']] as const) {
      await inspectFind(page, index);
      for (const preset of ['oblique', 'top', 'end'] as const) {
        await viewShortcut(page, preset, index); const snapshot = await assertSelectedFind(page, index, shape);
        framing.push({ width, shape, preset, geometry: snapshot.specimens[0] });
      }
    }
    await viewShortcut(page, 'oblique', 19);
    for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
      await theme(page, name);
      for (const look of ['surface', 'raking', 'outline'] as const) {
        await appearance(page, look); await noHorizontalOverflow(page);
        await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-' + look + '-phone-' + width + '-' + name + '.png') });
        for (const selector of ['#dino-find-display', 'button[data-dig-find-look]', 'button[data-dig-find-camera]']) {
          for (const box of await page.locator(selector).evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { x: rect.x, right: rect.right, width: rect.width, height: rect.height }; }))) {
            expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.width).toBeGreaterThan(24); expect(box.height).toBeGreaterThanOrEqual(24);
          }
        }
      }
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
      });
      audits.push({ width, theme: name, violations }); expect(await preservedState(page)).toEqual(observation);
    }
    await page.locator('#dino-find-display').screenshot({ path: path.join(dir, 'find-display-controls-phone-' + width + '.png') });
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'find-display-outline-phone-' + width + '.png') });
  }
  fs.writeFileSync(path.join(dir, 'find-display-accessibility.json'), JSON.stringify(audits));
  fs.writeFileSync(path.join(dir, 'find-display-phone-framing.json'), JSON.stringify(framing));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
  expect((await displayScene(page)).scene).toBe(initial.scene); expect((await displayScene(page)).renderer).toBe(initial.renderer);
  await page.waitForTimeout(160); const idleStart = (await displayScene(page)).renders;
  await page.waitForTimeout(200); const idleEnd = (await displayScene(page)).renders;
  expect(idleEnd - idleStart).toBeLessThanOrEqual(1); expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
  const resources = await page.evaluate(() => {
    const w = window as any, resources = new Set<any>(), owners = new Map<any, string[]>(), borrowed = new Set<any>();
    // r128 supplies one module-level geometry to every default Sprite.
    const spriteProbe = new w.THREE.Sprite(), sharedSpriteGeometry = spriteProbe.geometry;
    spriteProbe.material.dispose();
    function collect(resource: any, owner: any, slot: string) {
      resources.add(resource);
      const entries = owners.get(resource) || [];
      entries.push(owner.type + ':' + (owner.name || owner.parent?.name || owner.userData?.role || 'unnamed') + ':' + slot);
      owners.set(resource, entries);
    }
    w.__voxelQA.current.scene.traverse((object: any) => {
      if (object.geometry) {
        if (object.isSprite && object.geometry === sharedSpriteGeometry) borrowed.add(object.geometry);
        else collect(object.geometry, object, 'geometry');
      }
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        collect(material, object, 'material'); Object.entries(material).forEach(([slot, value]: any) => { if (value?.isTexture) collect(value, object, slot); });
      }
    });
    w.__displayDisposal = { total: resources.size, seen: resources.size + borrowed.size, borrowed: borrowed.size,
      borrowedRecords: Array.from(borrowed, (resource: any) => ({ uuid: resource.uuid, type: resource.type,
        reason: 'Three r128 module-level default Sprite geometry', matchedDefaultSpriteGeometry: resource === sharedSpriteGeometry })),
      disposed: 0, records: [] };
    resources.forEach(resource => {
      const record = { uuid: resource.uuid, type: resource.type || resource.constructor.name,
        name: resource.name, owners: owners.get(resource), disposed: false };
      w.__displayDisposal.records.push(record);
      resource.addEventListener('dispose', () => { w.__displayDisposal.disposed++; record.disposed = true; });
    });
    return resources.size;
  });
  await page.locator('#dinotab-notes').click();
  await expect.poll(async () => (await harness.glContexts(page, mountId)).filter(context => !context.lost).length).toBe(0);
  try {
    await expect.poll(() => page.evaluate(() => (window as any).__displayDisposal.disposed)).toBe(resources);
  } finally {
    fs.writeFileSync(path.join(dir, 'find-display-disposal-diagnostic.json'), JSON.stringify(await page.evaluate(() => (window as any).__displayDisposal)));
  }
  await page.locator('#dinotab-dig').click(); await ready(page);
  await expect(page.locator('button[data-dig-find-look="outline"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await preservedState(page)).toEqual(observation);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const ownership = await page.evaluate(() => ({ total: (window as any).__displayDisposal.total,
    seen: (window as any).__displayDisposal.seen, borrowed: (window as any).__displayDisposal.borrowed,
    disposed: (window as any).__displayDisposal.disposed, borrowedRecords: (window as any).__displayDisposal.borrowedRecords }));
  fs.writeFileSync(path.join(dir, 'find-display-motion-lifecycle-proof.json'), JSON.stringify({ idleDraws: idleEnd - idleStart, onDemandRendering: true, reducedMotionStatic: true, ownedSceneResourcesDisposed: resources, ownership, contexts: (await harness.glContexts(page)).map(context => ({ id: context.id, lost: context.lost })), rendererRetainedDuringDisplayChanges: true, persistedLookRemounted: true, evidencePreserved: true }));
});
