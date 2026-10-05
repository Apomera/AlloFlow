import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-find-view-plate-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_') && !key.startsWith('find_plate_'))) as Record<string, string>;
const plateMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_plate_'))) as Record<string,string>;
const previewMessages = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const terrainMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('terrain_'))) as Record<string,string>;
const checkpointMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('checkpoint_'))) as Record<string,string>;
const controlMessages = {voxel_controls_hint:dinoEnglish.voxel_controls_hint};
const cameraMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('camera_control_'))) as Record<string,string>;
const registeredMessages = { ...previewMessages, ...sectionMessages, ...planMessages, ...footprintMessages, ...findMessages, ...plateMessages, ...terrainMessages, ...checkpointMessages, ...controlMessages, ...cameraMessages };
const probes = `
window.__findPlateQA = { targets: [], passes: [], reads: [], captureEntries: [], targetChanges: [], captureExit: null };
function qaPlateHash(array) {
  var h = 2166136261;
  for (var i=0; i<array.length; i++) h = Math.imul(h ^ array[i], 16777619) >>> 0;
  return h;
}
var PlateRenderTarget = THREE.WebGLRenderTarget;
THREE.WebGLRenderTarget = function (width, height, options) {
  var target = new PlateRenderTarget(width, height, options);
  if (width === 256 && height === 176) {
    var record = { target: target, uuid: target.texture.uuid, width: width, height: height, disposed: 0, textureDisposed: 0 };
    window.__findPlateQA.targets.push(record);
    target.addEventListener('dispose', function () { record.disposed++; });
    target.texture.addEventListener('dispose', function () { record.textureDisposed++; });
  }
  return target;
};
THREE.WebGLRenderTarget.prototype = PlateRenderTarget.prototype;
function qaPlateTarget(renderer) {
  var target = renderer.getRenderTarget();
  return window.__findPlateQA.targets.find(function (record) { return record.target === target; });
}
function qaPlateRendererState(renderer) {
  var target=renderer.getRenderTarget();
  return { target: target ? target.texture.uuid : null,
    viewport: renderer.getViewport(new THREE.Vector4()).toArray(),
    scissor: renderer.getScissor(new THREE.Vector4()).toArray(), scissorTest: renderer.getScissorTest() };
}
function qaPlateInstrument(renderer) {
  var setTarget = renderer.setRenderTarget.bind(renderer), readPixels = renderer.readRenderTargetPixels.bind(renderer);
  renderer.setRenderTarget = function (target) {
    var before = qaPlateRendererState(renderer), previous = qaPlateTarget(renderer);
    var next = window.__findPlateQA.targets.find(function (record) { return record.target === target; });
    if (next && !previous && !renderer.__qaPlateRenderDepth) window.__findPlateQA.captureEntries.push(before);
    var result = setTarget.apply(renderer, arguments);
    window.__findPlateQA.targetChanges.push({ renderer: renderer.domElement.id, before: before, previous: previous ? previous.uuid : null, requested: target ? target.texture.uuid : null, next: next ? next.uuid : null, after: qaPlateRendererState(renderer) });
    if (previous && !next && !renderer.__qaPlateRenderDepth) window.__findPlateQA.captureExit = qaPlateRendererState(renderer);
    return result;
  };
  renderer.readRenderTargetPixels = function (target, x, y, width, height, buffer) {
    if(window.__findPlateQA.failReadAt===window.__findPlateQA.reads.length+1){window.__findPlateQA.failReadAt=null;throw new Error('QA forced third readback failure');}
    var result=readPixels.apply(renderer,arguments);
    var record=window.__findPlateQA.targets.find(function(record){return record.target===target;});
    if (record) {
      var flipped=new Uint8Array(buffer.length),stride=width*4;
      for(var row=0;row<height;row++)flipped.set(buffer.subarray(row*stride,(row+1)*stride),(height-row-1)*stride);
      window.__findPlateQA.reads.push({ target: record.uuid, width: width, height: height, hash: qaPlateHash(buffer), flippedHash: qaPlateHash(flipped) });
      if(window.__findPlateQA.reads.length>96)window.__findPlateQA.reads.shift();
    }
    return result;
  };
}
function qaPlateRecordPass(renderer, scene, camera) {
  var target=qaPlateTarget(renderer);if(!target)return;
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  function effectiveVisible(object){for(var item=object;item;item=item.parent)if(!item.visible)return false;return true;}
  var meshes=[],bounds=new THREE.Box3();bounds.makeEmpty();
  scene.traverse(function(object){
    if(!object.isMesh||!effectiveVisible(object))return;
    bounds.expandByObject(object);
    var ancestors=[],modelIndex=null;for(var parent=object;parent;parent=parent.parent){ancestors.push(parent.name);var match=/^dino-find-fragment-(\\d+)$/.exec(parent.name);if(match)modelIndex=Number(match[1]);}
    meshes.push({name:object.name,uuid:object.uuid,geometry:object.geometry.uuid,modelIndex:modelIndex,ancestors:ancestors,
      positions:qaPlateHash(new Uint8Array(object.geometry.attributes.position.array.buffer,object.geometry.attributes.position.array.byteOffset,object.geometry.attributes.position.array.byteLength)),
      materials:(Array.isArray(object.material)?object.material:[object.material]).map(function(material){return {uuid:material.uuid,name:material.name,type:material.type};})});
  });
  window.__findPlateQA.passes.push({target:target.uuid,scene:scene.name,camera:camera.uuid,
    cameraName:camera.name,cameraData:JSON.parse(JSON.stringify(camera.userData)),
    position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far,
    direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),boundsCenter:bounds.getCenter(new THREE.Vector3()).toArray(),
    meshes:meshes,rendererState:qaPlateRendererState(renderer)});
  if(window.__findPlateQA.passes.length>96)window.__findPlateQA.passes.shift();
}

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
  qaPlateInstrument(renderer);
  renderer.render = function (scene, camera) {
    qaPlateRecordPass(renderer,scene,camera);
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
    renderer.__qaPlateRenderDepth = (renderer.__qaPlateRenderDepth || 0) + 1;
    try { return render(scene, camera); } finally { renderer.__qaPlateRenderDepth--; }
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
  expect(Object.keys(findMessages)).toHaveLength(58);
  expect(Object.keys(plateMessages)).toHaveLength(5);
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
      if (key.startsWith('stem.dinolab.camera_control_') || key === 'stem.dinolab.voxel_controls_hint' || key.startsWith('stem.dinolab.checkpoint_') || key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || key.startsWith('stem.dinolab.find_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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
    return !!record?.scene && !record.disposed && record.renderer.domElement === document.querySelector('#dino-voxel-canvas') && record.renders > 1 && !(window as any).__glLive('#dino-voxel-stage')?.lost;
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


async function canvasVisible(page:Page){await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();await settle(page);}
async function plateEvidence(page:Page){const value=await state(page);return {...await preservedState(page),seed:value.digSeed,tool:value.digVoxel?.tool,undo:value.digVoxelUndo||[],action:value.digVoxelAction||null};}
async function plateSnapshot(page:Page){return page.evaluate(()=>{
 const w=window as any,q=w.__voxelQA.current,qa=w.__findPlateQA,wrap=document.querySelector<HTMLElement>('#dino-find-view-plate');
 function hash(a:any){let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619)>>>0;return h;}
 const canvases=Array.from(document.querySelectorAll<HTMLCanvasElement>('[data-dig-find-plate-view]')).map(canvas=>{const ctx=canvas.getContext('2d')!,pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;const colors=new Set<number>();let opaque=0;for(let i=0;i<pixels.length;i+=4){colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);if(pixels[i+3])opaque++;}return {id:canvas.id,view:canvas.dataset.digFindPlateView,key:canvas.dataset.digFindPlateKey,ready:canvas.dataset.digFindPlateReady,width:canvas.width,height:canvas.height,ariaHidden:canvas.getAttribute('aria-hidden'),hash:hash(pixels),colors:colors.size,opaque};});
 return {wrapper:wrap?{key:wrap.dataset.digFindPlateKey,selected:wrap.dataset.digFindPlateSelected,ready:wrap.dataset.digFindPlateReady}:null,canvases,
  targets:qa.targets.map((r:any)=>({uuid:r.uuid,name:r.target.name,role:r.target.userData.role,width:r.width,height:r.height,disposed:r.disposed,textureDisposed:r.textureDisposed,textureName:r.target.texture.name,encoding:r.target.texture.encoding,type:r.target.texture.type,format:r.target.texture.format})),
  passCount:qa.passes.length,readCount:qa.reads.length,passes:qa.passes.slice(-3),reads:qa.reads.slice(-3),entries:qa.captureEntries.slice(),targetChanges:qa.targetChanges.slice(),captureExit:qa.captureExit,rendererState:{target:q.renderer.getRenderTarget()?.texture.uuid||null,viewport:q.renderer.getViewport(new w.THREE.Vector4()).toArray(),scissor:q.renderer.getScissor(new w.THREE.Vector4()).toArray(),scissorTest:q.renderer.getScissorTest()},
  mainCamera:{uuid:q.camera.uuid,position:q.camera.position.toArray(),quaternion:q.camera.quaternion.toArray()},mainCanvas:{width:q.renderer.domElement.width,height:q.renderer.domElement.height,pixelRatio:q.renderer.getPixelRatio()},renders:q.renders};
});}
async function waitPlate(page:Page,index:number,look:FindLook='surface',bringCanvas=true){
 if(bringCanvas)await canvasVisible(page);const value=await state(page),record=(await findScene(page)).record;
 const key=[value.digSeed,index,record.removed,record.shape,look].join(':');
 await expect(page.locator('#dino-find-view-plate')).toHaveAttribute('data-dig-find-plate-key',key);
 await expect.poll(async()=>{const p=await plateSnapshot(page);return p.wrapper?.ready==='true'&&p.canvases.length===3&&p.canvases.every((c:any)=>c.ready==='true');}).toBe(true);
 const p=await plateSnapshot(page);expect(p.wrapper.selected).toBe(String(index));
 expect(p.canvases.map((c:any)=>c.view)).toEqual(['oblique','top','end']);
 for(const [i,c]of p.canvases.entries()){expect(c).toMatchObject({key,ready:'true',width:256,height:176,ariaHidden:'true'});expect(c.opaque).toBeGreaterThan(100);expect(c.colors).toBeGreaterThan(1);expect(c.hash).toBe(p.reads[i].flippedHash);}
 expect(new Set(p.canvases.map((c:any)=>c.hash)).size).toBe(3);
 expect(p.targets.filter((t:any)=>!t.disposed)).toHaveLength(1);expect(p.targets.find((t:any)=>!t.disposed)).toMatchObject({name:'dino-find-view-plate-target',role:'exposed-find-reference-plate',width:256,height:176,textureName:'dino-find-view-plate-texture',encoding:3001,type:1009,format:1023});
 const actual=(await displayScene(page)).cloneMeshes;
 const centers:any[]=[];
 for(const [i,pass]of p.passes.entries()){
  const view=['oblique','top','end'][i];expect(pass.cameraName).toBe('dino-find-plate-camera-'+view);expect(pass.cameraData).toMatchObject({role:'exposed-find-reference-view',view,key,index,look});
  expect(pass.aspect).toBeCloseTo(256/176,8);expect(pass.fov).toBe(42);expect(pass.near).toBe(.1);expect(pass.far).toBe(100);
  expect(pass.scene).toBe('dino-voxel-excavation');const models=pass.meshes.filter((m:any)=>m.modelIndex!==null);expect(models.length).toBe(actual.length);expect(models.every((m:any)=>m.modelIndex===index)).toBe(true);
  expect(models.map((m:any)=>m.geometry)).toEqual(actual.map((m:any)=>m.geometry));expect(models.map((m:any)=>m.positions)).toEqual(actual.map((m:any)=>m.positions));
  const pose=shortcutPose(view as FindCamera,index,value.digSeed),expected=[-Math.sin(pose.yaw)*Math.cos(pose.pitch),-Math.sin(pose.pitch),-Math.cos(pose.yaw)*Math.cos(pose.pitch)];for(let j=0;j<3;j++)expect(pass.direction[j]).toBeCloseTo(expected[j],6);
  centers.push(pass.position.map((v:number,j:number)=>v+pass.direction[j]*pass.cameraData.sharedDistance));
 }
 expect(new Set(p.passes.map((pass:any)=>pass.cameraData.sharedDistance)).size).toBe(1);for(const center of centers)for(let j=0;j<3;j++)expect(center[j]).toBeCloseTo(centers[0][j],6);
 fs.writeFileSync(path.join(dir,'plate-latest-state-probe.json'),JSON.stringify(p));expect(p.captureExit).toEqual(p.entries[p.entries.length-1]);expect(p.rendererState.target).toBeNull();expect(p.rendererState.scissor).toEqual(p.captureExit.scissor);expect(p.rendererState.scissorTest).toBe(p.captureExit.scissorTest);expect(p.rendererState.viewport).toEqual([0,0,p.mainCanvas.width/p.mainCanvas.pixelRatio,p.mainCanvas.height/p.mainCanvas.pixelRatio]);return p;
}
async function collectOwnedScene(page:Page){return page.evaluate(()=>{const w=window as any,owned=new Set<any>(),borrowed=new Set<any>(),probe=new w.THREE.Sprite(),shared=probe.geometry;probe.material.dispose();w.__voxelQA.current.scene.traverse((o:any)=>{if(o.geometry){if(o.isSprite&&o.geometry===shared)borrowed.add(o.geometry);else owned.add(o.geometry);}for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){owned.add(material);for(const value of Object.values(material))if((value as any)?.isTexture)owned.add(value);}});w.__plateSceneDisposal={owned:owned.size,borrowed:borrowed.size,disposed:0,records:[]};owned.forEach((r:any)=>{const item={uuid:r.uuid,type:r.type||r.constructor.name,disposed:false};w.__plateSceneDisposal.records.push(item);r.addEventListener('dispose',()=>{item.disposed=true;w.__plateSceneDisposal.disposed++;});});return {owned:owned.size,borrowed:borrowed.size,targetTextureInSceneOwned:w.__findPlateQA.targets.some((t:any)=>owned.has(t.target.texture))};});}

test('actual exposed find view plates render three distinct views of the same mesh with a shared frame',async({page})=>{
 await page.setViewportSize({width:1366,height:900});const voxel=exposedShapesFixture();voxel.focus=19;await mount(page,{digFocus:19,digVoxel:voxel});
 const evidence=await plateEvidence(page),base=await displayScene(page),proof:any[]=[];
 for(const [index,shape]of [[5,'compact'],[12,'curved'],[19,'elongate']]as const){await inspectFind(page,index);const selected=await assertSelectedFind(page,index,shape);const p=await waitPlate(page,index);expect(p.mainCamera.uuid).not.toBe(p.passes[0].camera);expect(p.mainCamera.uuid).not.toBe(p.passes[1].camera);expect(p.mainCamera.uuid).not.toBe(p.passes[2].camera);expect(await plateEvidence(page)).toEqual(evidence);expect((await displayScene(page)).originals).toEqual(base.originals);proof.push({index,shape,key:p.wrapper.key,canvases:p.canvases,passes:p.passes,rendererState:p.rendererState});await page.locator('#dino-find-view-plate').screenshot({path:path.join(dir,'find-plate-'+shape+'-desktop.png')});await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'find-plate-'+shape+'-stage-desktop.png')});expect(selected.scene).toBe(base.scene);}
 await page.locator('#dino-find-display').screenshot({path:path.join(dir,'find-plate-display-desktop.png')});fs.writeFileSync(path.join(dir,'plate-real-mesh-shared-frame-proof.json'),JSON.stringify({shapes:proof,actualReadbackMatchesCanvas:true,commonFrameWithinEachPlate:true,originalGeometryAndEvidencePreserved:true}));
});

test('native plate commands and lighting refresh thumbnails only for observed key changes',async({page})=>{
 const voxel=exposedShapesFixture();voxel.focus=19;const fullPose={yaw:.71,pitch:.75,zoom:1.1},sectionPose={yaw:-.21,pitch:.42,zoom:.95};await mount(page,{digFocus:19,digVoxel:voxel,digVoxelPose:fullPose,digVoxelSectionPose:sectionPose});await inspectFind(page,19);
 const before=await plateEvidence(page),surface=await waitPlate(page,19),originals=(await displayScene(page)).originals;
 await page.evaluate(()=>{const plate=document.querySelector('#dino-find-view-plate')!;window.scrollTo(0,window.scrollY+plate.getBoundingClientRect().top);document.querySelector<HTMLElement>('[data-dig-find-look="raking"]')!.focus({preventScroll:true});});
 const offscreen=await page.locator('#dino-voxel-canvas').evaluate(canvas=>{const r=canvas.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight};});expect(offscreen.bottom).toBeLessThanOrEqual(0);await page.keyboard.press('Enter');await waitPlate(page,19,'raking',false);fs.writeFileSync(path.join(dir,'plate-offscreen-look-proof.json'),JSON.stringify({offscreen,look:'raking',plateReady:true}));await appearance(page,'surface');const recaptured=await waitPlate(page,19);
 const oblique=page.locator('[data-dig-find-camera="oblique"]');await oblique.focus();await oblique.press('Enter');await expect(oblique).toBeFocused();await expect(oblique).toHaveAccessibleName(findMessages.find_camera_oblique);await expect(oblique).not.toHaveAttribute('aria-pressed');
 for(const view of ['oblique','top','end']as const){await viewShortcut(page,view,19);await expect(page.locator('[data-dig-find-camera="'+view+'"]')).toHaveAccessibleName(findMessages['find_camera_'+view]);expect((await plateSnapshot(page)).passCount).toBe(recaptured.passCount);}
 await page.locator('#dino-voxel-canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await canvasVisible(page);expect((await plateSnapshot(page)).passCount).toBe(recaptured.passCount);
 const cameraBefore=(await plateSnapshot(page)).mainCamera,poseBefore=(await state(page)).digVoxelFindPose;
 const looks:any[]=[];for(const look of ['raking','outline','surface']as const){const count=(await plateSnapshot(page)).passCount;await appearance(page,look);const p=await waitPlate(page,19,look);expect(p.passCount).toBe(count+3);expect(p.mainCamera).toEqual(cameraBefore);expect((await state(page)).digVoxelFindPose).toEqual(poseBefore);expect((await displayScene(page)).originals).toEqual(originals);await page.locator('#dino-find-view-plate').screenshot({path:path.join(dir,'find-plate-'+look+'-desktop.png')});looks.push({look,key:p.wrapper.key,hashes:p.canvases.map((c:any)=>c.hash),passes:p.passCount});}
 expect(new Set(looks.map(value=>value.hashes.join(':'))).size).toBe(3);expect(await plateEvidence(page)).toEqual(before);expect((await state(page)).digVoxelPose).toEqual(fullPose);expect((await state(page)).digVoxelSectionPose).toEqual(sectionPose);
 fs.writeFileSync(path.join(dir,'plate-native-cache-light-proof.json'),JSON.stringify({surfacePasses:surface.passCount,looks,shortcutsDoNotRecapture:true,freeOrbitDoesNotRecapture:true,nativeNamesFocusAndCommandsPreserved:true,mainCameraAndPoseBanksPreserved:true,evidencePreserved:true}));
});

test('undo invalid selections new seeds failure fallback and context recovery invalidate view plates safely',async({page})=>{
 const voxel=emptyVoxel();voxel.focus=22;voxel.depths[22]=1;voxel.contacts[22]=true;await mount(page,{digFocus:22,digVoxel:voxel,digVoxelFindPlate:{key:'forged',index:23,shape:'species'},digVoxelFindLook:'invalid-look'});
 await expect(page.locator('#dino-find-view-plate')).toHaveCount(0);await page.getByRole('button',{name:'Excavate selected column',exact:true}).click();await inspectFind(page,22);let p=await waitPlate(page,22);expect(p.wrapper.key).toBe('1:22:2:elongate:surface');
 const target=p.targets[0].uuid;await selectFocus(page,23);await expect(page.locator('#dino-find-view-plate')).toHaveCount(0);await expect.poll(async()=>(await findScene(page)).selection).toBeNull();
 await inspectFind(page,22);p=await waitPlate(page,22);expect(p.targets[0].uuid).toBe(target);
 await page.evaluate(()=>{const q=(window as any).__findPlateQA;q.failReadAt=q.reads.length+3;});await appearance(page,'raking');await expect(page.locator('#dino-find-view-plate')).toHaveAttribute('data-dig-find-plate-ready','false');
 const failed=await plateSnapshot(page);expect(failed.canvases.every((c:any)=>c.ready==='false'&&c.opaque===0)).toBe(true);expect(failed.rendererState).toEqual(failed.entries[failed.entries.length-1]);await expect(page.locator('#dino-find-plate-fallback')).toBeVisible();
 await page.locator('#dino-voxel-canvas').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(180);expect((await plateSnapshot(page)).passCount).toBe(failed.passCount);
 await appearance(page,'outline');await waitPlate(page,22,'outline');await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect(page.locator('#dino-find-view-plate')).toHaveCount(0);expect((await layers(page))[22]).toBe(1);
 await mode(page,'full');await page.getByRole('button',{name:'New dig',exact:true}).click();await expect.poll(async()=>(await state(page)).digSeed).toBe(2);await expect(page.locator('#dino-find-view-plate')).toHaveCount(0);await page.getByRole('button',{name:'Use a prepared sample',exact:true}).click();const eligibleOptions=await page.locator('#dino-find-select option').evaluateAll(options=>options.map(option=>({value:(option as HTMLOptionElement).value,disabled:(option as HTMLOptionElement).disabled,text:option.textContent})));const eligibleChoices=eligibleOptions.filter(option=>/^\d+$/.test(option.value)&&!option.disabled).map(option=>Number(option.value)).filter(index=>index>=0&&index<24);fs.writeFileSync(path.join(dir,'plate-seed-choices-diagnostic.json'),JSON.stringify({seed:(await state(page)).digSeed,options:eligibleOptions,eligibleChoices}));expect(eligibleChoices.length).toBeGreaterThan(0);const afterSeedIndex=eligibleChoices[0];await inspectFind(page,afterSeedIndex);p=await waitPlate(page,afterSeedIndex,'outline');expect(p.wrapper.key.startsWith('2:'+afterSeedIndex+':')).toBe(true);expect(p.targets[0].uuid).toBe(target);
 const evidence=await plateEvidence(page),oldCanvas=await page.locator('#dino-voxel-canvas').elementHandle(),oldScene=(await displayScene(page)).scene;
 await page.evaluate(()=>{const gl=(window as any).__voxelQA.current.renderer.getContext();gl.getExtension('WEBGL_lose_context').loseContext();});await expect(page.getByRole('button',{name:'Retry 3D view',exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry 3D view',exact:true}).click();await ready(page);await waitPlate(page,afterSeedIndex,'outline');expect((await displayScene(page)).scene).not.toBe(oldScene);expect(await plateEvidence(page)).toEqual(evidence);expect(await page.locator('#dino-voxel-canvas').evaluate((canvas,previous)=>canvas===previous,oldCanvas)).toBe(false);
 const recovery=await plateSnapshot(page);expect(recovery.targets).toHaveLength(2);expect(recovery.targets[0].disposed).toBe(1);expect(recovery.targets[1].disposed).toBe(0);
 await page.locator('#dino-find-view-plate').screenshot({path:path.join(dir,'find-plate-context-recovered.png')});fs.writeFileSync(path.join(dir,'plate-history-fallback-recovery-proof.json'),JSON.stringify({forgedStoredDescriptorIgnored:true,invalidLookNormalized:true,contactBlank:true,coveredBlank:true,undoClearsPlate:true,newSeedChangesKey:true,targetReusedWithinEngine:true,partialReadFailureClearsAll:true,failedKeyCached:true,nextLookRetries:true,rendererStateRestoredAfterFailure:true,failure:failed,contextRecovery:recovery,evidencePreserved:true}));
});

test('find view plates fit phone themes and reduced motion and dispose their capture target once',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const voxel=exposedShapesFixture();voxel.focus=19;await mount(page,{digFocus:19,digVoxel:voxel,digVoxelView:'find'});const evidence=await plateEvidence(page);await waitPlate(page,19);await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const audits:any[]=[],framing:any[]=[];
 for(const width of [320,390]){await page.setViewportSize({width,height:844});for(const name of ['theme-default','theme-dark','theme-contrast']){await theme(page,name);await noHorizontalOverflow(page);for(const look of ['surface','raking','outline']as const){await appearance(page,look);const p=await waitPlate(page,19,look);for(const selector of ['#dino-find-view-plate','[data-dig-find-camera]'])for(const box of await page.locator(selector).evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}))){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.width).toBeGreaterThan(24);}framing.push({width,theme:name,look,key:p.wrapper.key,hashes:p.canvases.map((c:any)=>c.hash)});await page.locator('#dino-find-view-plate').screenshot({path:path.join(dir,'find-plate-phone-'+width+'-'+name+'-'+look+'.png')});}const violations=await page.evaluate(async()=>{const result=await(window as any).axe.run(document.querySelector('#dinopanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}));});audits.push({width,theme:name,violations});expect(await plateEvidence(page)).toEqual(evidence);}}
 fs.writeFileSync(path.join(dir,'plate-accessibility.json'),JSON.stringify(audits));fs.writeFileSync(path.join(dir,'plate-phone-framing.json'),JSON.stringify(framing));expect(audits.filter(a=>a.violations.length)).toEqual([]);
 await canvasVisible(page);await page.waitForTimeout(180);const idle=await plateSnapshot(page);await page.waitForTimeout(220);const after=await plateSnapshot(page);expect(after.renders-idle.renders).toBeLessThanOrEqual(1);expect(after.passCount).toBe(idle.passCount);expect(await feedbackNow(page)).toEqual({removed:0,dust:0});
 const resources=await collectOwnedScene(page);expect([115,116]).toContain(resources.owned);expect(resources).toMatchObject({borrowed:1,targetTextureInSceneOwned:false});await page.locator('#dinotab-notes').click();await expect.poll(()=>page.evaluate(()=>(window as any).__plateSceneDisposal.disposed)).toBe(resources.owned);await expect.poll(()=>page.evaluate(()=>(window as any).__findPlateQA.targets[0].disposed)).toBe(1);const disposal=await page.evaluate(()=>(window as any).__plateSceneDisposal);fs.writeFileSync(path.join(dir,'plate-scene-disposal-diagnostic.json'),JSON.stringify(disposal));
 const targetBefore=await page.evaluate(()=>{const t=(window as any).__findPlateQA.targets[0];return {disposed:t.disposed,textureDisposed:t.textureDisposed};});expect(targetBefore).toEqual({disposed:1,textureDisposed:0});await page.locator('#dinotab-dig').click();await ready(page);await waitPlate(page,19,'outline');expect(await plateEvidence(page)).toEqual(evidence);await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const targets=await page.evaluate(()=>(window as any).__findPlateQA.targets.map((t:any)=>({uuid:t.uuid,disposed:t.disposed,textureDisposed:t.textureDisposed})));expect(targets).toHaveLength(2);expect(targets.every((t:any)=>t.disposed===1&&t.textureDisposed===0)).toBe(true);
 fs.writeFileSync(path.join(dir,'plate-motion-target-lifecycle-proof.json'),JSON.stringify({reducedMotionStatic:true,idleDraws:after.renders-idle.renders,idleCaptures:after.passCount-idle.passCount,ownedSceneResources:resources,disposedSceneResources:disposal.disposed,targets,targetDisposedOncePerEngine:true,targetTextureOwnedByTarget:true,remountRecapturesSameObservation:true,evidencePreserved:true,contexts:(await harness.glContexts(page)).map(c=>({id:c.id,lost:c.lost}))}));
});
