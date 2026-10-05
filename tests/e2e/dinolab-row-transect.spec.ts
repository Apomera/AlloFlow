import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-row-transect-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_') && !key.startsWith('section_transect_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_'))) as Record<string, string>;
const strokeMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('stroke_'))) as Record<string, string>;
const surveyMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('survey_'))) as Record<string, string>;
const transectMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_transect_'))) as Record<string,string>;
const previewMessages = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const registeredMessages = { ...previewMessages, ...sectionMessages, ...planMessages, ...footprintMessages, ...findMessages, ...strokeMessages, ...surveyMessages, ...transectMessages };
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
  expect(Object.keys(sectionMessages)).toHaveLength(53);
  expect(Object.keys(planMessages)).toHaveLength(44);
  expect(Object.keys(footprintMessages)).toHaveLength(2);
  expect(Object.keys(findMessages)).toHaveLength(63);
  expect(Object.keys(strokeMessages)).toHaveLength(28);
  expect(Object.keys(surveyMessages)).toHaveLength(46);
  expect(Object.keys(transectMessages)).toHaveLength(12);
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
      if (key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || key.startsWith('stem.dinolab.find_') || key.startsWith('stem.dinolab.stroke_') || key.startsWith('stem.dinolab.survey_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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
    return !!record?.scene && !record.disposed && record.renders > 1 && record.renderer.domElement === document.querySelector('#dino-voxel-canvas') && !(window as any).__glLive('#dino-voxel-stage')?.lost;
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

async function simulationEvidence(page: Page) {
  const value = await state(page), voxel = value.digVoxel || emptyVoxel(value.digSeed || 1);
  return { seed: value.digSeed, depths: voxel.depths, contacts: voxel.contacts, tool: voxel.tool,
    undo: value.digVoxelUndo || [], action: value.digVoxelAction || null, revealed: value.digRevealed || [],
    cited: value.digCitedClues || [], guess: value.digGuess || null, checked: value.digChecked || false,
    solved: value.digSolvedFor || null, notebook: value.notebook || {} };
}
async function canvasVisible(page: Page) { await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded(); await settle(page); }
async function surveyScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, q = w.__voxelQA.current, scene = q.scene;
    scene.updateMatrixWorld(true); q.camera.updateMatrixWorld(true);
    function visible(object: any) { for (let current = object; current; current = current.parent) if (!current.visible) return false; return true; }
    function snapshot(object: any) {
      const box = new T.Box3().setFromObject(object); let maxScreen = 0, maxDepth = 0, finite = true;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new T.Vector3(x,y,z).project(q.camera); finite = finite && [point.x,point.y,point.z].every(Number.isFinite);
        maxScreen = Math.max(maxScreen,Math.abs(point.x),Math.abs(point.y)); maxDepth = Math.max(maxDepth,Math.abs(point.z));
      }
      return { name: object.name, data: JSON.parse(JSON.stringify(object.userData)), visible: visible(object),
        position: object.getWorldPosition(new T.Vector3()).toArray(), scale: object.scale.toArray(),
        bounds: {min:box.min.toArray(),max:box.max.toArray()}, material: object.material?.type || null,
        hasDistances: !!object.geometry?.attributes.lineDistance, maxScreen,maxDepth,finite };
    }
    const group = scene.getObjectByName('dino-field-survey-guides'), axes = scene.getObjectByName('dino-survey-coordinates');
    const batch = scene.getObjectByName('dino-sediment-voxels');
    return { scene: scene.uuid, renderer: w.__voxelQA.records.indexOf(q), renders:q.renders, view:scene.userData.view,
      group:snapshot(group), labels:axes.children.map(snapshot), axesVisible:visible(axes),
      datum:snapshot(scene.getObjectByName('dino-survey-original-surface')),
      profile:snapshot(scene.getObjectByName('dino-survey-selected-profile')),
      remaining:snapshot(scene.getObjectByName('dino-survey-remaining-span')),
      removed:snapshot(scene.getObjectByName('dino-survey-removed-span')),
      sediment:{count:batch.count,opacity:batch.material.opacity,transparent:batch.material.transparent},
      contextLost:q.renderer.getContext().isContextLost(), shaderFailures:q.renderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length };
  });
}
async function assertSurvey(page: Page, index: number, removed: number, status: string, shape: string|null = null) {
  await canvasVisible(page); const snapshot = await surveyScene(page);
  const selected = { index,row:Math.floor(index/6),col:index%6,coord:coord(index),removed,remaining:4-removed,status,shape };
  expect(snapshot.group.data).toEqual({role:'observed-field-survey',seed:(await state(page)).digSeed,selection:selected});
  expect(snapshot.profile.data).toEqual(selected); expect(snapshot.profile.visible).toBe(true);
  expect(snapshot.profile.position).toEqual([(index%6-2.5)*1.08,0,(Math.floor(index/6)-1.5)*1.08]);
  expect(snapshot.datum.data).toEqual({role:'original-model-surface',originalY:2.08,coverLayers:4,row:snapshot.view==='section'?Math.floor(index/6):null});
  expect(snapshot.datum.position[1]).toBeCloseTo(2.105,5);
  expect(snapshot.remaining.visible).toBe(removed<4); expect(snapshot.remaining.scale[1]).toBeCloseTo((4-removed)*.52,5);
  expect(snapshot.removed.visible).toBe(removed>0); expect(snapshot.removed.scale[1]).toBeCloseTo(removed*.52,5);
  expect(snapshot.removed.position[1]).toBeCloseTo((4-removed)*.52,5);
  expect(snapshot.remaining.material).toBe('LineBasicMaterial'); expect(snapshot.removed.material).toBe('LineDashedMaterial');
  expect(snapshot.datum.hasDistances&&snapshot.removed.hasDistances).toBe(true);
  expect(snapshot.sediment.opacity).toBe(1); expect(snapshot.sediment.transparent).toBe(false);
  expect(snapshot.contextLost).toBe(false); expect(snapshot.shaderFailures).toBe(0);
  expect(JSON.stringify(snapshot.group.data)).not.toMatch(/"(?:hasBone|burial|fossilY|species|boneKind|clues|hidden)"/);
  await expect(page.locator('#dino-field-survey')).toHaveAttribute('data-dig-survey-focus',String(index));
  await expect(page.locator('[data-dig-survey-selected-status]')).toHaveAttribute('data-dig-survey-selected-status',status);
  await expect(page.locator('[data-dig-survey-layer]')).toHaveCount(4);
  await expect(page.locator('[data-dig-survey-layer-removed="true"]')).toHaveCount(removed);
  await expect(page.locator('[data-dig-survey-shape]')).toHaveCount(shape?1:0);
  if(shape) await expect(page.locator('[data-dig-survey-shape]')).toHaveAttribute('data-dig-survey-shape',shape);
  return snapshot;
}
async function selectSurvey(page: Page,index:number) {
  await page.locator('#dino-survey-cell-'+index).click();
  await expect.poll(async()=>(await state(page)).digFocus).toBe(index);
  await expect(page.locator('#dino-survey-cell-'+index)).toHaveAttribute('aria-pressed','true');
}
async function openReasoning(page: Page) {
  if(!(await page.locator('#dino-survey-reasoning').evaluate((element:any)=>element.open)))
    await page.locator('#dino-survey-reasoning summary').click();
}
async function answer(page:Page,id:string,value:'observation'|'inference',matches:boolean) {
  await openReasoning(page); const radio=page.locator('#dino-survey-answer-'+id+'-'+value);
  await radio.check(); await expect(radio).toBeChecked();
  await expect(page.locator('#dino-survey-feedback-'+id)).toHaveAttribute('data-dig-survey-answer-matches',String(matches));
}
async function surveyWorldResources(page:Page) {
  return page.evaluate(()=> {
    const w=window as any,records:any[]=[];function hash(a:any){if(!a)return null;let h=2166136261;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))h=Math.imul(h^b,16777619)>>>0;return h;}
    w.__voxelQA.current.scene.getObjectByName('dino-excavation-world').traverse((object:any)=> {
      if(!object.isMesh)return;let predictive=false;for(let p=object;p;p=p.parent)if(p.name==='dino-tool-footprint')predictive=true;
      records.push({uuid:object.uuid,geometry:object.geometry.uuid,positions:hash(object.geometry.attributes.position?.array),normals:hash(object.geometry.attributes.normal?.array),
        materials:predictive?null:(Array.isArray(object.material)?object.material:[object.material]).map((m:any)=>({uuid:m.uuid,color:m.color.toArray(),map:m.map?.uuid||null,bumpMap:m.bumpMap?.uuid||null}))});
    });const lights:any[]=[];w.__voxelQA.current.scene.traverse((o:any)=>{if(o.isLight&&o.name.startsWith('dino-site-'))lights.push({name:o.name,uuid:o.uuid,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray(),visible:o.visible});});return{records,lights};
  });
}

type TransectColumn = {index:number;coord:string;removed:number;remaining:number;status:string};
function unevenTransectVoxel() {
  const voxel=emptyVoxel();voxel.focus=22;
  for(const[index,depth]of[[5,3],[12,4],[18,4],[19,4],[20,2],[21,3],[22,1],[23,1]])voxel.depths[index]=depth;
  voxel.contacts[22]=true;return voxel;
}
async function transectDom(page:Page) {
  return page.locator('#dino-section-profile').evaluate(element=>({
    row:Number(element.getAttribute('data-dig-transect-row')),label:element.getAttribute('aria-label'),
    columns:Array.from(element.querySelectorAll('[data-dig-transect-column]')).map(column=>({index:Number(column.getAttribute('data-dig-transect-column')),
      coord:String.fromCharCode(65+Number(column.getAttribute('data-dig-transect-column'))%6)+(Math.floor(Number(column.getAttribute('data-dig-transect-column'))/6)+1),
      removed:Number(column.getAttribute('data-dig-transect-removed')),remaining:4-Number(column.getAttribute('data-dig-transect-removed')),status:column.getAttribute('data-dig-transect-status')})),
    markerColumns:Array.from(element.querySelectorAll('[data-dig-transect-marker]')).map(marker=>({index:Number(marker.getAttribute('data-dig-transect-marker-column')),status:marker.getAttribute('data-dig-transect-marker'),transform:marker.querySelector('[transform]')?.getAttribute('transform')})),
    surface:element.querySelector('[data-dig-transect-surface="current"]')?.getAttribute('d'),
    datum:element.querySelector('[data-dig-transect-datum="original"]')?.getAttribute('d'),
    selected:Number(element.querySelector('[data-dig-transect-selected]')?.getAttribute('data-dig-transect-selected')),
  }));
}
async function assertTransectDom(page:Page,rowIndex:number,focus:number) {
  const dom=await transectDom(page),value=await state(page),voxel=value.digVoxel||emptyVoxel(value.digSeed||1);
  expect(dom.row).toBe(rowIndex);expect(dom.selected).toBe(focus);expect(dom.columns.map(column=>column.index)).toEqual(Array.from({length:6},(_,col)=>rowIndex*6+col));
  expect(dom.label).toMatch(new RegExp('^'+coord(focus)+':'));await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(new RegExp('^'+coord(focus)+':'));
  for(const column of dom.columns){const publicCount=Number((await page.locator('#dino-dig-cell-'+column.index+' small').textContent())!.split('/')[0]);expect(column.removed).toBe(publicCount);expect(column.remaining).toBe(4-column.removed);expect(['covered','partial','contact','exposed','cleared']).toContain(column.status);const group=page.locator('[data-dig-transect-column="'+column.index+'"]');await expect(group.locator('[data-dig-transect-level]')).toHaveCount(4);await expect(group.locator('[data-dig-transect-layer-removed="true"]')).toHaveCount(column.removed);}
  await expect(page.locator('#dino-section-profile [data-dig-transect-level]')).toHaveCount(24);await expect(page.locator('[data-dig-transect-plan-row]')).toHaveAttribute('data-dig-transect-plan-row',String(rowIndex));
  await expect(page.locator('[data-dig-transect-summary]')).toHaveCount(6);for(const column of dom.columns)await expect(page.locator('[data-dig-transect-summary="'+column.index+'"]')).toContainText(column.coord);
  expect(dom.markerColumns.map(marker=>({index:marker.index,status:marker.status}))).toEqual(dom.columns.filter(column=>column.status==='contact'||column.status==='exposed').map(column=>({index:column.index,status:column.status})));
  for(const marker of dom.markerColumns){const column=dom.columns.find(column=>column.index===marker.index)!;expect(marker.transform).toContain('translate('+(53.5+(column.index%6)*48)+' '+(62+column.removed*35)+')');}
  expect(dom.surface).toBeTruthy();expect(dom.datum).toBeTruthy();expect(dom.surface).not.toMatch(/NaN|Infinity/);expect(dom.datum).not.toMatch(/NaN|Infinity/);
  expect(JSON.stringify(dom.columns)).not.toMatch(/"(?:shape|hasBone|burial|fossilY|species|boneKind|clues|hidden)"/);return dom;
}
async function transectScene(page:Page) {
  return page.evaluate(()=>{const w=window as any,T=w.THREE,q=w.__voxelQA.current,scene=q.scene;scene.updateMatrixWorld(true);q.camera.updateMatrixWorld(true);
    function visible(object:any){for(let current=object;current;current=current.parent)if(!current.visible)return false;return true;}
    function capture(object:any){const box=new T.Box3().setFromObject(object);let maxScreen=0,maxDepth=0,finite=true;for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const point=new T.Vector3(x,y,z).project(q.camera);finite=finite&&[point.x,point.y,point.z].every(Number.isFinite);maxScreen=Math.max(maxScreen,Math.abs(point.x),Math.abs(point.y));maxDepth=Math.max(maxDepth,Math.abs(point.z));}
      return{name:object.name,uuid:object.uuid,data:JSON.parse(JSON.stringify(object.userData)),visible:visible(object),position:object.getWorldPosition(new T.Vector3()).toArray(),scale:object.scale.toArray(),geometry:object.geometry?.uuid||null,material:object.material?.uuid||null,materialType:object.material?.type||null,distances:!!object.geometry?.attributes.lineDistance,positionsFinite:!object.geometry||Array.from(object.geometry.attributes.position.array).every(Number.isFinite),bounds:{min:box.min.toArray(),max:box.max.toArray()},finite,maxScreen,maxDepth};}
    const group=scene.getObjectByName('dino-row-transect-guides');return{scene:scene.uuid,renderer:w.__voxelQA.records.indexOf(q),renders:q.renders,view:scene.userData.view,
      group:capture(group),surfaces:['A','B','C','D','E','F'].map(letter=>capture(scene.getObjectByName('dino-transect-surface-'+letter))),steps:Array.from({length:5},(_,index)=>capture(scene.getObjectByName('dino-transect-step-'+index))),
      datum:capture(scene.getObjectByName('dino-transect-original-datum')),contextLost:q.renderer.getContext().isContextLost(),shaderFailures:q.renderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length};
  });
}
async function assertTransectGeometry(page:Page,rowIndex:number,focus:number) {
  await canvasVisible(page);const dom=await assertTransectDom(page,rowIndex,focus),snapshot=await transectScene(page),removed=dom.columns.map(column=>column.removed),z=(rowIndex-1.5)*1.08;
  expect(snapshot.group.visible).toBe(true);expect(snapshot.group.data).toEqual({role:'observed-row-transect',row:rowIndex,focus,columns:dom.columns,removedMin:Math.min(...removed),removedMax:Math.max(...removed)});
  const batch=await sectionScene(page);for(const column of dom.columns)expect(batch.columns.filter(index=>index===column.index).length).toBe(column.remaining);
  expect(snapshot.surfaces).toHaveLength(6);expect(snapshot.steps).toHaveLength(5);expect(new Set([...snapshot.surfaces,...snapshot.steps].map(segment=>segment.geometry)).size).toBe(1);expect(new Set([...snapshot.surfaces,...snapshot.steps].map(segment=>segment.material)).size).toBe(1);
  for(let col=0;col<6;col++){const segment=snapshot.surfaces[col],column=dom.columns[col];expect(segment.visible).toBe(true);expect(segment.materialType).toBe('MeshBasicMaterial');expect(segment.position[0]).toBeCloseTo((col-2.5)*1.08,5);expect(segment.position[1]).toBeCloseTo(column.remaining*.52+.025,5);expect(segment.position[2]).toBeCloseTo(z+.573,5);expect(segment.scale).toEqual([1.08,.027,.027]);expect(segment.data).toEqual({role:'observed-excavation-surface',columnIndices:[column.index],remaining:[column.remaining]});expect(segment.positionsFinite).toBe(true);}
  for(let col=0;col<5;col++){const segment=snapshot.steps[col],a=dom.columns[col],b=dom.columns[col+1];expect(segment.visible).toBe(a.remaining!==b.remaining);if(a.remaining===b.remaining){expect(segment.data).toEqual({});continue;}expect(segment.position[0]).toBeCloseTo((col-2)*1.08,5);expect(segment.position[1]).toBeCloseTo((a.remaining+b.remaining)*.26+.025,5);expect(segment.position[2]).toBeCloseTo(z+.573,5);expect(segment.scale[0]).toBeCloseTo(.027,6);expect(segment.scale[1]).toBeCloseTo(Math.abs(a.remaining-b.remaining)*.52,5);expect(segment.scale[2]).toBeCloseTo(.027,6);expect(segment.data).toEqual({role:'observed-excavation-surface',columnIndices:[a.index,b.index],remaining:[a.remaining,b.remaining]});}
  expect(snapshot.datum.visible).toBe(true);expect(snapshot.datum.materialType).toBe('LineDashedMaterial');expect(snapshot.datum.distances).toBe(true);expect(snapshot.datum.data).toEqual({role:'original-model-surface',originalY:2.08,row:rowIndex});expect(snapshot.datum.bounds.min[0]).toBeCloseTo(-3.28,5);expect(snapshot.datum.bounds.max[0]).toBeCloseTo(3.28,5);expect(snapshot.datum.bounds.min[1]).toBeCloseTo(2.105,5);expect(snapshot.datum.bounds.max[1]).toBeCloseTo(2.105,5);expect(snapshot.datum.bounds.min[2]).toBeCloseTo(z+.59,5);
  expect(snapshot.contextLost).toBe(false);expect(snapshot.shaderFailures).toBe(0);expect(JSON.stringify(snapshot.group.data)).not.toMatch(/"(?:shape|hasBone|burial|fossilY|species|boneKind|clues|hidden)"/);return snapshot;
}
async function assertTransectHidden(page:Page) {
  const snapshot=await transectScene(page);expect(snapshot.group.visible).toBe(false);expect(snapshot.group.data.columns||[]).toEqual([]);for(const segment of[...snapshot.surfaces,...snapshot.steps,snapshot.datum])expect(segment.visible).toBe(false);return snapshot;
}

test('row transect links profile plan and native selection while trusted section picking preserves excavation',async({page})=>{
  await page.setViewportSize({width:1366,height:900});await mount(page,{notebook:{microraptor:{question:'This notebook remains intact during row inspection.'}}});const baseline=await simulationEvidence(page);await assertTransectDom(page,0,0);await assertTransectHidden(page);
  await page.locator('[data-dig-section-column="2"]').focus();await page.locator('[data-dig-section-column="2"]').press('Space');await expect(page.locator('[data-dig-section-column="2"]')).toBeFocused();await assertTransectDom(page,0,2);expect(await simulationEvidence(page)).toEqual(baseline);
  await page.locator('#dino-survey-cell-14').click();await assertTransectDom(page,2,14);await mode(page,'section');await row(page,3);await assertTransectGeometry(page,3,20);await page.locator('[data-dig-section-column="22"]').click();await assertTransectGeometry(page,3,22);await expect(page.locator('#dino-section-row')).toHaveValue('3');
  await canvasVisible(page);const target=await projectedTarget(page);expect(target).not.toBeNull();expect(Math.floor(target!.column/6)).toBe(3);const box=(await page.locator('#dino-voxel-canvas').boundingBox())!;await page.mouse.click(box.x+(target!.x+1)/2*box.width,box.y+(1-target!.y)/2*box.height);await expect.poll(async()=>(await state(page)).digFocus).toBe(target!.column);const hit=await page.evaluate(()=>(window as any).__voxelQA.lastRayColumns);expect(hit[0].column).toBe(target!.column);expect(hit.some((item:any)=>item.name?.startsWith('dino-transect'))).toBe(false);await assertTransectGeometry(page,3,target!.column);expect(await simulationEvidence(page)).toEqual(baseline);
  await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'transect-fresh-row-desktop.png')});await page.locator('.dinolab-section-observatory').screenshot({path:path.join(dir,'transect-fresh-observatory-desktop.png')});
  fs.writeFileSync(path.join(dir,'transect-profile-plan-selection-proof.json'),JSON.stringify({profileSixColumns:true,coverLevels24:true,planRowLocator:true,nativeSpaceFocus:true,surveySelectionLinks:true,sectionRowFollows:true,selectionOnlyRaycast:target!.column,traceExcludedFromPickers:true,evidenceAndNotebookPreserved:true}));
});

test('uneven row transects follow real brush contact exposure and undo without projecting outside row finds',async({page})=>{
  const voxel=unevenTransectVoxel();voxel.depths[18]=0;voxel.contacts[22]=false;voxel.tool='brush';for(const index of[15,16,17])voxel.depths[index]=4;
  await mount(page,{digFocus:22,digVoxel:voxel});await mode(page,'section');const initial=await assertTransectGeometry(page,3,22);expect(initial.group.data.columns.map((column:any)=>column.status)).toEqual(['covered','exposed','partial','exposed','partial','partial']);
  await expect(page.locator('[data-dig-observed-find="5"]')).toBeVisible();await expect(page.locator('#dino-section-profile [data-dig-transect-marker-column="5"]')).toHaveCount(0);await expect(page.locator('#dino-section-profile [data-dig-transect-marker-column="12"]')).toHaveCount(0);
  await mode(page,'full');await page.locator('#dino-dig-cell-18').click();await expect.poll(async()=>(await layers(page))[18]).toBe(1);await mode(page,'section');await assertTransectGeometry(page,3,18);
  await mode(page,'full');await page.locator('#dino-survey-cell-22').click();await page.getByRole('button',{name:'Trowel',exact:true}).click();await page.getByRole('button',{name:'Excavate selected column',exact:true}).click();await expect.poll(async()=>(await state(page)).digVoxel.contacts[22]).toBe(true);await mode(page,'section');const contact=await assertTransectGeometry(page,3,22);expect(contact.group.data.columns[4]).toEqual({index:22,coord:'E4',removed:1,remaining:3,status:'contact'});await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^E4:.*contact/i);const beforeBrush=await observationState(page),cluesBefore=await page.locator('[data-dig-clue]').count();
  await mode(page,'full');await page.getByRole('button',{name:'Brush',exact:true}).click();await page.getByRole('button',{name:'Excavate selected column',exact:true}).click();await expect.poll(async()=>(await layers(page))[22]).toBe(2);await mode(page,'section');const exposed=await assertTransectGeometry(page,3,22);expect(exposed.group.data.columns[4].status).toBe('exposed');await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^E4:.*exposed/i);expect(await page.locator('[data-dig-clue]').count()).toBe(cluesBefore+1);
  await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'transect-uneven-exposed-desktop.png')});await page.locator('.dinolab-section-observatory').screenshot({path:path.join(dir,'transect-uneven-observatory-desktop.png')});await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();const undone=await assertTransectGeometry(page,3,22);expect(undone.group.data.columns[4].status).toBe('contact');expect(await observationState(page)).toEqual(beforeBrush);await expect(page.locator('[data-dig-clue]')).toHaveCount(cluesBefore);
  await row(page,2);const outside=await assertTransectGeometry(page,2,16);expect(outside.group.data.columns.every((column:any)=>column.index>=12&&column.index<=17)).toBe(true);await expect(page.locator('[data-dig-observed-find="22"]')).toBeVisible();await expect(page.locator('#dino-section-profile [data-dig-transect-marker-column="22"]')).toHaveCount(0);
  fs.writeFileSync(path.join(dir,'transect-real-contact-undo-proof.json'),JSON.stringify({initial:initial.group.data,contact:contact.group.data,exposed:exposed.group.data,undone:undone.group.data,outsideRow:outside.group.data,observedMarkersOnly:true,markerAtCurrentSurface:true,noHiddenBurialOffsets:true,clueCountRestored:cluesBefore}));
});

test('retained three dimensional transect geometry follows rows datum guides and new seed without camera changes',async({page})=>{
  const poses={digVoxelPose:{yaw:.71,pitch:.75,zoom:1.1},digVoxelSectionPose:{yaw:-.21,pitch:.42,zoom:.95},digVoxelFindPose:{yaw:.66,pitch:.62,zoom:1.05}};
  await mount(page,{digFocus:22,digVoxel:unevenTransectVoxel(),...poses});const initial=await transectScene(page);await assertTransectHidden(page);await mode(page,'section');const uneven=await assertTransectGeometry(page,3,22),baseline=await simulationEvidence(page),originalCamera=await camera(page);
  await page.locator('#dino-survey-guides').uncheck();await assertTransectHidden(page);expect(await simulationEvidence(page)).toEqual(baseline);await page.locator('#dino-survey-guides').check();const restored=await assertTransectGeometry(page,3,22);expect(await camera(page)).toEqual(originalCamera);
  await row(page,0);await assertTransectGeometry(page,0,4);await row(page,3);await assertTransectGeometry(page,3,22);await inspectFind(page,19);await assertSelectedFind(page,19,'elongate');await assertTransectHidden(page);await mode(page,'section');await row(page,3);await assertTransectGeometry(page,3,19);
  for(const[key,value]of Object.entries(poses))expect((await state(page))[key]).toEqual(value);expect(await simulationEvidence(page)).toEqual(baseline);
  await page.getByRole('button',{name:'New dig',exact:true}).click();await expect.poll(async()=>(await state(page)).digSeed).toBe(2);await assertTransectHidden(page);await mode(page,'section');await row(page,1);const fresh=await assertTransectGeometry(page,1,6);expect(fresh.group.data.columns.every((column:any)=>column.removed===0&&column.status==='covered')).toBe(true);expect(fresh.steps.every((segment:any)=>!segment.visible)).toBe(true);
  expect(fresh.scene).toBe(initial.scene);expect(fresh.renderer).toBe(initial.renderer);expect(fresh.group.uuid).toBe(initial.group.uuid);expect(fresh.surfaces.map((segment:any)=>segment.geometry)).toEqual(restored.surfaces.map((segment:any)=>segment.geometry));expect(fresh.surfaces.map((segment:any)=>segment.material)).toEqual(restored.surfaces.map((segment:any)=>segment.material));
  fs.writeFileSync(path.join(dir,'transect-retained-geometry-datum-proof.json'),JSON.stringify({uneven,restored,fresh,retainedSceneAndBuffers:true,fullAndFindHidden:true,guideToggleDisplayOnly:true,poseBanksPreserved:true,seedResetFreshRow:true}));
});

test('row transects fit phone themes provide textual observations and release owned geometry under reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await mount(page,{digFocus:22,digVoxel:unevenTransectVoxel()});await mode(page,'section');const baseline=await simulationEvidence(page),initial=await assertTransectGeometry(page,3,22),mountId=await harness.currentMount(page);await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const audits:any[]=[],framing:any[]=[];
  for(const width of[320,390]){await page.setViewportSize({width,height:844});for(const name of['theme-default','theme-dark','theme-contrast']){await theme(page,name);await noHorizontalOverflow(page);const dom=await assertTransectDom(page,3,22);for(const selector of['#dino-section-profile','#dino-section-plan','[data-dig-transect-summary]']){const boxes=await page.locator(selector).evaluateAll(elements=>elements.map(element=>{const b=element.getBoundingClientRect();return{x:b.x,width:b.width};}));expect(boxes.every(box=>box.x>=0&&box.x+box.width<=width)).toBe(true);}const axis=await page.locator('#dino-section-profile').textContent();for(const value of['A','B','C','D','E','F','1','2','3','4'])expect(axis).toContain(value);expect(dom.label).toMatch(/^E4:.*contact/i);
      const scene=await assertTransectGeometry(page,3,22);expect(scene.group.finite&&scene.group.maxScreen<=1&&scene.group.maxDepth<=1).toBe(true);framing.push({width,theme:name,maxScreen:scene.group.maxScreen,maxDepth:scene.group.maxDepth,profileLabel:dom.label,summaries:await page.locator('[data-dig-transect-summary]').allTextContents()});
      await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'transect-phone-'+width+'-'+name+'.png')});await page.locator('.dinolab-section-observatory').screenshot({path:path.join(dir,'transect-observatory-phone-'+width+'-'+name+'.png')});const violations=await page.evaluate(async()=>{const result=await(window as any).axe.run(document.querySelector('#dinopanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}));});audits.push({width,theme:name,violations});expect(await simulationEvidence(page)).toEqual(baseline);
    }}fs.writeFileSync(path.join(dir,'transect-accessibility.json'),JSON.stringify(audits));expect(audits.filter(audit=>audit.violations.length)).toEqual([]);fs.writeFileSync(path.join(dir,'transect-phone-framing.json'),JSON.stringify(framing));expect(await feedbackNow(page)).toEqual({removed:0,dust:0});await canvasVisible(page);await page.waitForTimeout(160);const idleStart=(await transectScene(page)).renders;await page.waitForTimeout(200);const idleDraws=(await transectScene(page)).renders-idleStart;expect(idleDraws).toBeLessThanOrEqual(1);
  const findList=page.locator('.dinolab-section-find-list');await findList.focus();await expect(findList).toBeFocused();await findList.press('End');await expect.poll(()=>findList.evaluate(element=>element.scrollTop)).toBeGreaterThan(0);
  const resources=await page.evaluate(()=>{const w=window as any,owned=new Set<any>(),borrowed=new Set<any>(),sprite=new w.THREE.Sprite(),shared=sprite.geometry;sprite.material.dispose();w.__voxelQA.current.scene.traverse((object:any)=>{if(object.geometry){if(object.isSprite&&object.geometry===shared)borrowed.add(object.geometry);else owned.add(object.geometry);}for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){owned.add(material);Object.values(material).forEach((value:any)=>{if(value?.isTexture)owned.add(value);});}});w.__transectDisposal={owned:owned.size,borrowed:borrowed.size,disposed:0,records:[]};owned.forEach((resource:any)=>{const record={uuid:resource.uuid,type:resource.type||resource.constructor.name,disposed:false};w.__transectDisposal.records.push(record);resource.addEventListener('dispose',()=>{record.disposed=true;w.__transectDisposal.disposed++;});});return owned.size;});expect(resources).toBe(109);
  await page.locator('#dinotab-notes').click();await expect.poll(async()=>(await harness.glContexts(page,mountId)).filter(context=>!context.lost).length).toBe(0);try{await expect.poll(()=>page.evaluate(()=>(window as any).__transectDisposal.disposed)).toBe(resources);}finally{fs.writeFileSync(path.join(dir,'transect-disposal-diagnostic.json'),JSON.stringify(await page.evaluate(()=>(window as any).__transectDisposal)));}await page.locator('#dinotab-dig').click();await ready(page);await assertTransectGeometry(page,3,22);expect(await simulationEvidence(page)).toEqual(baseline);const saved=await state(page);await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);await mount(page,saved);await assertTransectGeometry(page,3,22);expect(await simulationEvidence(page)).toEqual(baseline);await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  fs.writeFileSync(path.join(dir,'transect-motion-lifecycle-proof.json'),JSON.stringify({reducedMotionStatic:true,idleDraws,findListKeyboardFocusableAndScrollable:true,ownedResourcesDisposed:resources,borrowedSpriteGeometry:1,remountAndSavedReloadPreserveObservation:true,initialScene:initial.scene,contexts:(await harness.glContexts(page)).map(context=>({id:context.id,lost:context.lost}))}));
});
