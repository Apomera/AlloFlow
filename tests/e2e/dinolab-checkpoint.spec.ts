import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-checkpoint-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const previewMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_'))) as Record<string,string>;
const terrainMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('terrain_'))) as Record<string,string>;
const checkpointMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('checkpoint_'))) as Record<string,string>;
const controlMessages = {voxel_controls_hint:dinoEnglish.voxel_controls_hint};
const registeredMessages = { ...sectionMessages, ...planMessages, ...footprintMessages, ...previewMessages, ...findMessages, ...terrainMessages, ...checkpointMessages, ...controlMessages };
const probes = `
window.__terrainQA = { platePasses: 0 };
window.__strokePreviewQA = { projecting: false, inputs: [], targets: [] };
var PreviewRenderTarget = THREE.WebGLRenderTarget;
THREE.WebGLRenderTarget = function(width,height,options) {
  var target=new PreviewRenderTarget(width,height,options);
  if(width===256&&height===176){
    var record={target:target,uuid:target.texture.uuid,disposed:0,textureDisposed:0};window.__strokePreviewQA.targets.push(record);
    target.addEventListener('dispose',function(){record.disposed++;});
    target.texture.addEventListener('dispose',function(){record.textureDisposed++;});
  }
  return target;
};
THREE.WebGLRenderTarget.prototype=PreviewRenderTarget.prototype;

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
    window.__voxelQA.rayEvents.push({ number: window.__voxelQA.raycasts, columns: window.__voxelQA.lastRayColumns, native: !window.__strokePreviewQA.projecting });
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
    var target=renderer.getRenderTarget(); if(target && target.width===256 && target.height===176) window.__terrainQA.platePasses++;
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
  expect(Object.keys(previewMessages)).toHaveLength(9);
  expect(Object.keys(findMessages)).toHaveLength(63);
  expect(Object.keys(terrainMessages)).toHaveLength(8);
  expect(Object.keys(checkpointMessages)).toHaveLength(42);
  const expected = process.env.DINO_CHECKPOINT_EXPECTED_HASH || '8865944dea2c6ca2dd36ebc5dfba78f0ccb1fe7a784cd06681cebfa4f2ed46d7'; expect(expected?.length).toBe(64);
  expect(crypto.createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_dinolab.js')).digest('hex')).toBe(expected);
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
      if (key === 'stem.dinolab.voxel_controls_hint' || key.startsWith('stem.dinolab.checkpoint_') || key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.find_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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
    return !!record?.scene && !record.disposed && record.renderer.domElement === document.querySelector("#dino-voxel-canvas") && record.renders > 1 && !(window as any).__glLive('#dino-voxel-stage')?.lost;
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
async function mode(page: Page, view: 'full' | 'section') {
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


async function visibleCanvas(page:Page){await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();await settle(page);}
async function attachNativeInputs(page:Page){
 await page.locator('#dino-voxel-canvas').evaluate(canvas=>{
  const qa=(window as any).__strokePreviewQA;
  for(const type of ['pointermove','pointerdown','pointerup','pointerleave','focus','blur','keydown'])canvas.addEventListener(type,event=>{
   const e=event as PointerEvent&KeyboardEvent;qa.inputs.push({type,isTrusted:e.isTrusted,key:e.key||null,pointerType:e.pointerType||null,x:e.clientX||0,y:e.clientY||0});
   if(qa.inputs.length>160)qa.inputs.shift();
  },true);
 });
}
async function previewSnapshot(page:Page){
 return page.evaluate(()=>{
  const w=window as any,T=w.THREE,q=w.__voxelQA.current,group=q.scene.getObjectByName('dino-tool-footprint');
  q.scene.updateMatrixWorld(true);
  function shown(o:any){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
  const targets:any[]=[];
  for(let index=0;index<24;index++){
   const target=group.getObjectByName('dino-tool-target-'+index);if(!target.visible)continue;
   const envelope=target.getObjectByName('dino-tool-envelope-'+index),bounds=new T.Box3().setFromObject(envelope);
   const lines=envelope.children.map((line:any)=>({name:line.name,geometry:line.geometry.uuid,material:line.material.uuid,type:line.material.type,depthTest:line.material.depthTest,dashSize:line.material.dashSize,gapSize:line.material.gapSize,lineDistances:line.geometry.attributes.lineDistance?Array.from(line.geometry.attributes.lineDistance.array):[]}));
   targets.push({index,...target.userData,position:target.getWorldPosition(new T.Vector3()).toArray(),effectiveVisible:shown(target),
    envelope:{name:envelope.name,visible:envelope.visible,effectiveVisible:shown(envelope),data:JSON.parse(JSON.stringify(envelope.userData)),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},size:bounds.getSize(new T.Vector3()).toArray(),lines},
    crossVisible:shown(target.children[3]),minusVisible:shown(target.children[2])});
  }
  const hud=document.querySelector<HTMLElement>('#dino-preview-target'),map=document.querySelector('#dino-action-plan-map');
  const poolGeometry=new Set<string>(),poolMaterials=new Set<string>();group.traverse((o:any)=>{if(o.geometry)poolGeometry.add(o.geometry.uuid);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])poolMaterials.add(m.uuid);});
  return {scene:q.scene.uuid,renderer:w.__voxelQA.records.indexOf(q),view:q.scene.userData.view,visible:group.visible,data:JSON.parse(JSON.stringify(group.userData)),
   scenePreview:{focus:q.scene.userData.previewFocus,selected:q.scene.userData.previewSelectedFocus,source:q.scene.userData.previewTargetSource},targets,
   hud:hud?{text:hud.textContent,target:hud.dataset.digPreviewTarget,tool:hud.dataset.digPreviewTool,source:hud.dataset.digPreviewSource}:null,
   selectedMap:map?Array.from(map.querySelectorAll('[data-dig-plan-selected="true"]')).map(o=>Number(o.getAttribute('data-dig-plan-cell'))):[],
   selectedLegend:document.querySelector('#dino-preview-volume-legend')?.getAttribute('data-dig-preview-selected')||null,
   poolGeometry:Array.from(poolGeometry).sort(),poolMaterials:Array.from(poolMaterials).sort(),renders:q.renders,
   lastNativeRay:w.__voxelQA.rayEvents.filter((e:any)=>e.native).slice(-1)[0]||null,inputs:w.__strokePreviewQA.inputs.slice(-12),
   shaderFailures:q.renderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,contextLost:q.renderer.getContext().isContextLost()};
 });
}
async function expectPreview(page:Page,index:number,source:'pointer'|'selection',selected?:number){
 await expect.poll(async()=>{const p=await previewSnapshot(page);return [p.visible,p.data.previewFocus,p.data.source,p.hud?.target,p.hud?.source];}).toEqual([true,index,source,String(index),source]);
 const p=await previewSnapshot(page),stored=selected??((await state(page)).digFocus??(await state(page)).digVoxel.focus);
 expect(p.data).toMatchObject({role:'observed-tool-footprint',selectedFocus:stored,previewFocus:index,source});
 expect(p.data.plan.focus).toBe(index);expect(p.data.plan.coord).toBe(coord(index));
 expect(p.scenePreview).toEqual({focus:index,selected:stored,source});
 expect(p.hud!.tool).toBe(p.data.plan.tool);expect(p.hud!.text).toBe(previewMessages.preview_target.replace('{tool}',p.data.plan.tool==='trowel'?'Trowel':'Brush').replace('{coord}',coord(index)));
 expect(p.selectedMap).toEqual([stored]);expect(p.selectedLegend).toBe(String(stored));
 expect(p.shaderFailures).toBe(0);expect(p.contextLost).toBe(false);
 expect(JSON.stringify(p.data.plan)).not.toMatch(/"(?:hasBone|burial|fossilY|coverRemaining|species|bonesExposed|clues)"/);
 return p;
}
async function assertEnvelopes(page:Page){
 const p=await previewSnapshot(page),plan=p.data.plan;
 expect(p.targets.map((t:any)=>t.index).sort((a:number,b:number)=>a-b)).toEqual(plan.footprint.slice().sort((a:number,b:number)=>a-b));
 for(const target of p.targets){
  const column=plan.columns.find((c:any)=>c.index===target.index),held=plan.blocked||column.maxRemoval===0,guaranteed=!held&&column.minRemoval===column.maxRemoval;
  expect(target.envelope.data).toMatchObject({role:'prospective-removal-envelope',digColumn:target.index,certainty:held?'held':guaranteed?'guaranteed':'conditional',minRemoval:held?0:column.minRemoval,maxRemoval:held?0:column.maxRemoval});
  expect(target.envelope.data.top).toBeCloseTo(column.remaining*.52,8);
  expect(target.envelope.data.height).toBeCloseTo(held?0:.52,8);
  expect(target.envelope.visible).toBe(!held);expect(target.crossVisible).toBe(held);expect(target.minusVisible).toBe(!held);
  if(held){expect(target.envelope.effectiveVisible).toBe(false);expect(target.envelope.data.bottom).toBe(target.envelope.data.top);continue;}
  expect(target.envelope.effectiveVisible).toBe(true);expect(target.envelope.size[0]).toBeCloseTo(1.062,6);expect(target.envelope.size[2]).toBeCloseTo(1.062,6);expect(target.envelope.size[1]).toBeCloseTo(.52,6);
  expect(target.envelope.bounds.max[1]).toBeCloseTo(column.remaining*.52,6);expect(target.envelope.bounds.min[1]).toBeCloseTo((column.remaining-1)*.52,6);
  expect(target.envelope.bounds.min[1]).toBeGreaterThanOrEqual(-1e-7);
  for(const line of target.envelope.lines){expect(line.type).toBe(guaranteed?'LineBasicMaterial':'LineDashedMaterial');expect(line.depthTest).toBe(false);if(!guaranteed){expect(line.dashSize).toBeGreaterThan(0);expect(line.gapSize).toBeGreaterThan(0);expect(line.lineDistances.every(Number.isFinite)).toBe(true);expect(Math.max(...line.lineDistances)).toBeGreaterThan(0);}}
 }
 return p;
}
async function projectedCell(page:Page,index:number){
 return page.evaluate(index=>{
  const w=window as any,T=w.THREE,q=w.__voxelQA.current,batch=q.scene.getObjectByName('dino-sediment-voxels'),floors:any[]=[];
  q.scene.updateMatrixWorld(true);q.camera.updateMatrixWorld(true);
  q.scene.traverse((o:any)=>{if(o.isMesh&&Number.isInteger(o.userData.digColumn)&&!Array.isArray(o.material)&&o.material.visible===false)floors.push(o);});
  const depth=w.__toolData.dinoLab.digVoxel.depths[index],top=(4-depth)*.52;
  w.__strokePreviewQA.projecting=true;
  try{
   const ray=new T.Raycaster();
   for(const dx of [0,-.25,.25])for(const dz of [0,-.25,.25]){
    const point=new T.Vector3((index%6-2.5)*1.08+dx,depth===4?.02:top+.001,(Math.floor(index/6)-1.5)*1.08+dz),screen=point.clone().project(q.camera);
    if(Math.abs(screen.x)>.95||Math.abs(screen.y)>.95||Math.abs(screen.z)>1)continue;
    ray.setFromCamera(new T.Vector2(screen.x,screen.y),q.camera);
    const hits=ray.intersectObjects([batch,...floors],true),hit=hits.find((h:any)=>Number.isInteger(w.qaHitColumn(h).column));
    if(hit&&w.qaHitColumn(hit).column===index)return {x:screen.x,y:screen.y,index,top,depth,metadata:w.qaHitColumn(hit),floorPickerCount:floors.length};
   }
   return null;
  }finally{w.__strokePreviewQA.projecting=false;}
 },index);
}
async function hoverCell(page:Page,index:number,selected?:number){
 await visibleCanvas(page);const point=await projectedCell(page,index);expect(point,'actual first ray hit for '+index).not.toBeNull();
 const box=(await page.locator('#dino-voxel-canvas').boundingBox())!;
 const x=box.x+(point!.x+1)/2*box.width,y=box.y+(1-point!.y)/2*box.height;
 await page.mouse.move(x,y);await settle(page);const p=await expectPreview(page,index,'pointer',selected);
 expect(p.lastNativeRay?.columns[0]?.column).toBe(index);expect(['sediment-voxel',undefined]).toContain(p.lastNativeRay?.columns[0]?.role);
 expect(p.inputs.filter((e:any)=>e.type==='pointermove').slice(-1)[0]?.isTrusted).toBe(true);
 return {point,p,x,y};
}
async function topCamera(page:Page){await page.locator('[data-dig-camera="top"]').click();await visibleCanvas(page);}
function changedColumns(before:number[],after:number[]){return after.flatMap((n,i)=>n!==before[i]?[i]:[]);}
async function envelopePool(page:Page){const p=await previewSnapshot(page);return {scene:p.scene,renderer:p.renderer,geometry:p.poolGeometry};}
function checkActualStroke(before:any,after:any,plan:any){
 const changed=changedColumns(before.digVoxel.depths,after.digVoxel.depths);
 expect(changed.every((i:number)=>plan.footprint.includes(i))).toBe(true);
 let removed=0;for(let index=0;index<24;index++){const delta=after.digVoxel.depths[index]-before.digVoxel.depths[index];expect(delta).toBeGreaterThanOrEqual(0);expect(delta).toBeLessThanOrEqual(1);removed+=delta;const column=plan.columns.find((c:any)=>c.index===index);if(column)expect(delta).toBeLessThanOrEqual(column.maxRemoval);}
 expect(removed).toBeGreaterThanOrEqual(plan.minRemoval);expect(removed).toBeLessThanOrEqual(plan.maxRemoval);
 return {changed,removed,range:[plan.minRemoval,plan.maxRemoval]};
}
async function collectSceneOwnership(page:Page){
 return page.evaluate(()=>{
  const w=window as any,owned=new Set<any>(),borrowed=new Set<any>(),probe=new w.THREE.Sprite(),shared=probe.geometry;probe.material.dispose();
  w.__voxelQA.current.scene.traverse((o:any)=>{if(o.geometry){if(o.isSprite&&o.geometry===shared)borrowed.add(o.geometry);else owned.add(o.geometry);}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){owned.add(m);for(const value of Object.values(m))if((value as any)?.isTexture)owned.add(value);}});
  w.__previewDisposal={owned:owned.size,borrowed:borrowed.size,disposed:0,records:[],borrowedRecords:Array.from(borrowed).map((g:any)=>({uuid:g.uuid,matchedDefaultSpriteGeometry:g===shared}))};
  owned.forEach((resource:any)=>{const record={uuid:resource.uuid,type:resource.type||resource.constructor.name,disposed:false};w.__previewDisposal.records.push(record);resource.addEventListener('dispose',()=>{record.disposed=true;w.__previewDisposal.disposed++;});});
  return {owned:owned.size,borrowed:borrowed.size,targetTextureInOwned:w.__strokePreviewQA.targets.some((t:any)=>owned.has(t.target.texture))};
 });
}

async function observationStateFrom(value:any){return {depths:value.digVoxel.depths,contacts:value.digVoxel.contacts,revealed:value.digRevealed||[],citations:value.digCitedClues||[],guess:value.digGuess||null,solved:value.digSolvedFor||null};}
type TerrainLook = 'daylight' | 'raking';
async function terrainSnapshot(page: Page) {
 return page.evaluate(() => {
  const w = window as any, T = w.THREE, q = w.__voxelQA.current, batch = q.scene.getObjectByName('dino-sediment-voxels'), g = batch.geometry, m = batch.material;
  function hash(value: any) { let h = 2166136261; for (const byte of value) h = Math.imul(h ^ byte, 16777619) >>> 0; return h; }
  function attribute(a: any) { return a ? Array.from(a.array) : null; }
  const reference = new T.BoxGeometry(1.062, .508, 1.062);
  const geometry = { positionsUnchanged: JSON.stringify(attribute(g.attributes.position)) === JSON.stringify(attribute(reference.attributes.position)), normalsUnchanged: JSON.stringify(attribute(g.attributes.normal)) === JSON.stringify(attribute(reference.attributes.normal)), indicesUnchanged: JSON.stringify(attribute(g.index)) === JSON.stringify(attribute(reference.index)) };
  reference.dispose(); g.computeBoundingBox();
  const faces: any[] = [];
  for (let i = 0; i < g.attributes.normal.count; i++) faces.push({ normal: [g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i)], uv: [g.attributes.uv.getX(i), g.attributes.uv.getY(i)] });
  function texture(t: any) {
   const image = t.image, rgba = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
   let min = 255, max = 0; for (let i = 0; i < rgba.length; i += 4) { min = Math.min(min, rgba[i]); max = Math.max(max, rgba[i]); }
   return { uuid: t.uuid, name: t.name, width: image.width, height: image.height, encoding: t.encoding, min, max, hash: hash(rgba), anisotropy: t.anisotropy, generateMipmaps: t.generateMipmaps, minFilter: t.minFilter, magFilter: t.magFilter, wrapS: t.wrapS, wrapT: t.wrapT, data: t.userData };
  }
  function effectiveVisible(o: any) { for (let v = o; v; v = v.parent) if (!v.visible) return false; return true; }
  const lights = ['dino-site-ambient', 'dino-site-key', 'dino-site-fill', 'dino-find-ambient', 'dino-find-key', 'dino-find-fill'].map(name => { const light = q.scene.getObjectByName(name); return { uuid: light.uuid, name, visible: effectiveVisible(light), intensity: light.intensity, position: light.position.toArray(), shadowDirty: light.shadow?.needsUpdate }; });
  const color = texture(m.map), height = texture(m.bumpMap);
  return { scene: q.scene.uuid, renderer: w.__voxelQA.records.indexOf(q), renders: q.renders, terrainLook: q.scene.userData.terrainLook, findLook: q.scene.userData.findLook, metadata: batch.userData.sedimentAtlas, batch: batch.uuid, capacity: batch.instanceMatrix.count, count: batch.count, columns: batch.userData.columnIndices.slice(0, batch.count), layers: batch.userData.layers.slice(0, batch.count), geometry: { uuid: g.uuid, ...geometry, bounds: { min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() }, faces }, material: { uuid: m.uuid, type: m.type, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, bumpScale: m.bumpScale, roughness: m.roughness, metalness: m.metalness, color, height, colorSRGB: color.encoding === T.sRGBEncoding, heightLinear: height.encoding === T.LinearEncoding }, lights, contextLost: q.renderer.getContext().isContextLost(), failedShaders: q.renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, platePasses: w.__terrainQA.platePasses };
 });
}
function assertAtlas(snapshot: any) {
 expect(snapshot.capacity).toBe(96); expect(snapshot.geometry.positionsUnchanged).toBe(true); expect(snapshot.geometry.normalsUnchanged).toBe(true); expect(snapshot.geometry.indicesUnchanged).toBe(true);
 expect(snapshot.metadata).toEqual({ width: 512, height: 256, tileSize: 256, padding: 16, topFace: '+Y', otherFaces: 'wall', fixedSeed: 20867, colorEncoding: 'sRGB', heightEncoding: 'linear', bumpScale: .020 });
 expect(snapshot.material).toMatchObject({ type: 'MeshStandardMaterial', transparent: false, opacity: 1, depthWrite: true, bumpScale: .020, metalness: 0, colorSRGB: true, heightLinear: true });
 expect(snapshot.material.color.name).toBe('dino-sediment-color-atlas'); expect(snapshot.material.height.name).toBe('dino-sediment-height-atlas'); expect(snapshot.material.color.uuid).not.toBe(snapshot.material.height.uuid);
 for (const key of ['color', 'height']) { expect(snapshot.material[key].width).toBe(512); expect(snapshot.material[key].height).toBe(256); expect(snapshot.material[key].max).toBeGreaterThan(snapshot.material[key].min); }
 for (const face of snapshot.geometry.faces) { const top = face.normal[1] > .5; expect(face.uv[0]).toBeCloseTo(top ? (face.uv[0] < .25 ? 16 / 512 : 240 / 512) : (face.uv[0] < .75 ? 272 / 512 : 496 / 512), 7); expect(face.uv[1]).toBeCloseTo(face.uv[1] < .5 ? 16 / 256 : 240 / 256, 7); }
 expect(snapshot.geometry.faces.filter((f: any) => f.normal[1] > .5)).toHaveLength(4);
 const size = snapshot.geometry.bounds.max.map((n: number, i: number) => n - snapshot.geometry.bounds.min[i]); for (const [i, expected] of [1.062, .508, 1.062].entries()) expect(size[i]).toBeCloseTo(expected, 6);
 expect(snapshot.contextLost).toBe(false); expect(snapshot.failedShaders).toBe(0);
}
function pool(snapshot: any) { return { scene: snapshot.scene, renderer: snapshot.renderer, batch: snapshot.batch, geometry: snapshot.geometry.uuid, material: snapshot.material.uuid, color: snapshot.material.color.uuid, height: snapshot.material.height.uuid, lights: snapshot.lights.map((l: any) => l.uuid) }; }
function assertSiteLight(snapshot: any, look: TerrainLook, shown = true) {
 expect(snapshot.terrainLook).toBe(look); const expected = look === 'raking' ? [.30, 1.10, .18] : [.50, 1.15, .22];
 for (const [i, name] of ['dino-site-ambient', 'dino-site-key', 'dino-site-fill'].entries()) { const l = snapshot.lights.find((l: any) => l.name === name); expect(l.intensity).toBeCloseTo(expected[i], 6); expect(l.visible).toBe(shown); }
 expect(snapshot.lights.find((l: any) => l.name === 'dino-site-key').position).toEqual(look === 'raking' ? [-6, 2.8, 8] : [-6, 12, 8]);
}
async function terrainLook(page: Page, look: TerrainLook, key = 'Enter') {
 const before = await state(page), poses = await camera(page), snapshot = await terrainSnapshot(page), button = page.locator('#dino-terrain-' + look);
 await button.focus(); await button.press(key); await expect(button).toHaveAttribute('aria-pressed', 'true'); await expect.poll(async () => (await state(page)).digVoxelTerrainLook).toBe(look);
 await visibleCanvas(page); await expect.poll(async () => (await terrainSnapshot(page)).terrainLook).toBe(look); await settle(page);
 const after = await state(page); expect(after).toEqual({ ...before, digVoxelTerrainLook: look }); expect(await camera(page)).toEqual(poses); expect(pool(await terrainSnapshot(page))).toEqual(pool(snapshot)); return terrainSnapshot(page);
}
async function pixels(page: Page) { await visibleCanvas(page); const image = await harness.glPixels(page, '#dino-voxel-stage'); expect(image).not.toBeNull(); expect(looksBlank(image!)).toBe(false); return image!; }
function pixelDifference(a: Buffer, b: Buffer) {
 const x = readPng(a), y = readPng(b); expect([y.width, y.height]).toEqual([x.width, x.height]); let sum = 0, changed = 0, count = 0;
 // The central excavation area excludes DOM overlays and the scenic horizon.
 for (let py = Math.floor(x.height * .20); py < x.height * .84; py += 2) for (let px = Math.floor(x.width * .20); px < x.width * .80; px += 2) { const c = x.at(px, py), d = y.at(px, py), delta = (Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) + Math.abs(c[2] - d[2])) / 3; sum += delta; if (delta > 5) changed++; count++; }
 return { meanAbsoluteChannelChange: sum / count, fractionChangedOverFive: changed / count, samples: count };
}
async function findPlateSnapshot(page: Page) {
 return page.evaluate(() => { const w = window as any; function hash(rgba: any) { let h = 2166136261; for (const byte of rgba) h = Math.imul(h ^ byte, 16777619) >>> 0; return h; } return { key: document.querySelector<HTMLElement>('#dino-find-view-plate')?.dataset.digFindPlateKey, ready: document.querySelector<HTMLElement>('#dino-find-view-plate')?.dataset.digFindPlateReady, passes: w.__terrainQA.platePasses, canvases: Array.from(document.querySelectorAll<HTMLCanvasElement>('[data-dig-find-plate-view]')).map(c => ({ view: c.dataset.digFindPlateView, ready: c.dataset.digFindPlateReady, hash: hash(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data) })) }; });
}
async function waitFindPlate(page: Page) { await visibleCanvas(page); await expect(page.locator('#dino-find-view-plate')).toHaveAttribute('data-dig-find-plate-ready', 'true'); await expect.poll(async () => (await findPlateSnapshot(page)).canvases.filter((c: any) => c.ready === 'true').length).toBe(3); return findPlateSnapshot(page); }

const checkpointCodes: Record<string, string> = { covered: '0', partial: '1', contact: '2', exposed: '3', cleared: '4' };
function savedKey(saved: any) { return 'checkpoint:' + saved.seed + ':' + saved.columns.map((c: any) => String(c.removed) + checkpointCodes[c.status]).join(''); }
async function checkpointOpen(page: Page) { const details = page.locator('#dino-checkpoint-details'); await expect(details).toBeVisible(); if (!await details.evaluate((el: HTMLDetailsElement) => el.open)) await details.locator('summary').click(); }
async function checkpointKind(page: Page, kind: string) { await expect(page.locator('#dino-checkpoint-panel')).toHaveAttribute('data-dig-checkpoint-kind', kind); }
async function saveCheckpoint(page: Page) {
 await checkpointOpen(page); const before = await state(page); await page.locator('#dino-checkpoint-save').focus(); await page.locator('#dino-checkpoint-save').press('Enter'); await checkpointKind(page, 'ready'); const after = await state(page), saved = after.digVoxelCheckpoint;
 expect(saved).toMatchObject({ version: 1, seed: before.digSeed }); expect(Object.keys(saved).sort()).toEqual(['columns', 'seed', 'version']); expect(saved.columns).toHaveLength(24);
 for (const [index, c] of saved.columns.entries()) { expect(Object.keys(c).sort()).toEqual(['index', 'removed', 'status']); expect(c.index).toBe(index); expect(c.removed).toBe(before.digVoxel.depths[index]); expect(Object.keys(checkpointCodes)).toContain(c.status); }
 expect(after).toEqual({ ...before, digVoxelCheckpoint: saved, digVoxelCheckpointNotes: null }); return saved;
}
async function checkpointMaps(page: Page) {
 return page.evaluate(() => Object.fromEntries(['baseline', 'current'].map(name => [name, Array.from(document.querySelectorAll<HTMLElement>('#dino-checkpoint-' + name + '-map [data-dig-checkpoint-cell]')).map(el => ({ index: Number(el.dataset.digCheckpointCell), changed: el.dataset.digCheckpointChanged, label: el.getAttribute('aria-label'), status: el.querySelector('.dinolab-checkpoint-map-status > span')?.textContent, count: el.querySelector('.dinolab-checkpoint-map-count')?.textContent }))])));
}
function checkpointFormat(key: string, values: Record<string, unknown>) { return checkpointMessages['checkpoint_' + key].replace(/\{([a-zA-Z_]+)\}/g, (token: string, name: string) => Object.hasOwn(values, name) ? String(values[name]) : token); }
function mapStatus(cell: any) { const status = Object.keys(checkpointCodes).find(s => checkpointMessages['checkpoint_map_' + s] === cell.status); expect(status, JSON.stringify(cell)).toBeTruthy(); return status!; }
async function assertCheckpointMaps(page: Page, saved: any) {
 const value = await state(page), maps = await checkpointMaps(page), expected: any[] = [];
 for (const name of ['baseline', 'current']) expect(maps[name]).toHaveLength(24);
 for (let index = 0; index < 24; index++) {
  const before = saved.columns[index], old = maps.baseline[index], now = maps.current[index], status = mapStatus(now), removed = value.digVoxel.depths[index], delta = removed - before.removed, changed = delta > 0 || status !== before.status;
  expect(old.index).toBe(index); expect(now.index).toBe(index); expect(mapStatus(old)).toBe(before.status); expect(old.count).toBe(checkpointFormat('map_count', { removed: before.removed })); expect(now.count).toBe(checkpointFormat('map_count', { removed }));
  expect(old.label).toBe(checkpointFormat('map_cell', { coord: coord(index), removed: before.removed, status: checkpointMessages['checkpoint_status_' + before.status] })); expect(now.label).toBe(checkpointFormat('map_cell', { coord: coord(index), removed, status: checkpointMessages['checkpoint_status_' + status] }));
  expect(old.changed).toBe(String(changed)); expect(now.changed).toBe(String(changed)); expect(delta).toBeGreaterThanOrEqual(0);
  expected.push({ index, row: Math.floor(index / 6), col: index % 6, coord: coord(index), beforeRemoved: before.removed, removed, beforeRemaining: 4 - before.removed, remaining: 4 - removed, beforeStatus: before.status, status, delta, changed });
 }
 const changed = expected.filter(c => c.changed); const buttons = await page.locator('[data-dig-checkpoint-select]').evaluateAll(els => els.map(el => Number(el.getAttribute('data-dig-checkpoint-select')))); expect(buttons).toEqual(changed.map(c => c.index));
 expect(JSON.stringify(expected)).not.toMatch(/"(?:shape|identity|species|hasBone|burial|fossilY|clues)"/); return { maps, columns: expected, changedColumns: changed, layersRemoved: expected.reduce((n, c) => n + c.delta, 0) };
}
async function checkpointScene(page: Page) {
 return page.evaluate(() => {
  const w = window as any, T = w.THREE, q = w.__voxelQA.current, group = q.scene.getObjectByName('dino-checkpoint-guides'); q.scene.updateMatrixWorld(true);
  const otherGeometries = new Set<string>(); q.scene.traverse((o: any) => { for (let p = o; p; p = p.parent) if (p === group) return; if (o.geometry) otherGeometries.add(o.geometry.uuid); });
  const geometries = new Set<string>(), materials = new Set<string>(); const cells = group.children.map((cell: any, index: number) => ({ index, name: cell.name, visible: cell.visible, data: JSON.parse(JSON.stringify(cell.userData)), position: cell.getWorldPosition(new T.Vector3()).toArray(), lines: cell.children.map((line: any) => { geometries.add(line.geometry.uuid); materials.add(line.material.uuid); return { name: line.name, visible: line.visible, data: JSON.parse(JSON.stringify(line.userData)), position: line.getWorldPosition(new T.Vector3()).toArray(), bounds: new T.Box3().setFromObject(line).getSize(new T.Vector3()).toArray(), geometry: line.geometry.uuid, sharedOutsideGroup: otherGeometries.has(line.geometry.uuid), material: { uuid: line.material.uuid, name: line.material.name, type: line.material.type, depthTest: line.material.depthTest, depthWrite: line.material.depthWrite, toneMapped: line.material.toneMapped }, lineDistances: line.geometry.attributes.lineDistance ? Array.from(line.geometry.attributes.lineDistance.array) : [] }; }) }));
  return { scene: q.scene.uuid, renderer: w.__voxelQA.records.indexOf(q), visible: group.visible, data: JSON.parse(JSON.stringify(group.userData)), cells, geometries: Array.from(geometries).sort(), materials: Array.from(materials).sort(), renders: q.renders, platePasses: w.__terrainQA.platePasses, lastNativeRay: w.__voxelQA.rayEvents.filter((r: any) => r.native).slice(-1)[0] || null };
 });
}
function checkpointPool(snapshot: any) { return { scene: snapshot.scene, renderer: snapshot.renderer, geometries: snapshot.geometries, materials: snapshot.materials }; }
async function assertEmptyCheckpointGuides(page: Page) {
 const s = await checkpointScene(page); expect(s.visible).toBe(false); expect(s.data).toEqual({ role: 'observed-checkpoint-comparison', seed: null, key: null, baselineKey: null, columnIndices: [], columns: [] });
 for (const cell of s.cells) { expect(cell.visible).toBe(false); expect(cell.data).toEqual({}); for (const line of cell.lines) { expect(line.visible).toBe(false); expect(line.data).toEqual({}); } } return s;
}
async function assertCheckpointGuides(page: Page, saved: any, rowIndex?: number) {
 const comparison = await assertCheckpointMaps(page, saved), columns = comparison.changedColumns.filter(c => rowIndex === undefined || c.row === rowIndex), s = await checkpointScene(page);
 expect(s.visible).toBe(columns.length > 0); expect(s.cells).toHaveLength(24); expect(s.geometries).toHaveLength(3); expect(s.materials).toHaveLength(2); expect(s.data.columnIndices).toEqual(columns.map(c => c.index)); expect(s.data.columns).toEqual(columns);
 if (columns.length) { expect(s.data.seed).toBe(saved.seed); expect(s.data.key).toMatch(new RegExp('^' + savedKey(saved) + ':\\d{48}$')); expect(s.data.baselineKey).toBe(savedKey(saved)); }
 for (const cell of s.cells) { const c = columns.find(c => c.index === cell.index); expect(cell.visible).toBe(!!c); for (const line of cell.lines) { expect(line.sharedOutsideGroup).toBe(true); expect(line.material.depthTest).toBe(false); expect(line.material.depthWrite).toBe(false); expect(line.material.toneMapped).toBe(false); }
  if (!c) { expect(cell.data).toEqual({}); expect(cell.lines.every((l: any) => !l.visible && Object.keys(l.data).length === 0)).toBe(true); continue; }
  expect(cell.data).toEqual({ role: 'observed-checkpoint-column', ...c }); expect(cell.position[0]).toBeCloseTo((c.col - 2.5) * 1.08, 6); expect(cell.position[2]).toBeCloseTo((c.row - 1.5) * 1.08, 6);
  const [before, current, span] = cell.lines; expect(before.visible).toBe(true); expect(current.visible).toBe(true); expect(span.visible).toBe(c.delta > 0); expect(before.position[1]).toBeCloseTo(c.beforeRemaining * .52 + .065, 6); expect(current.position[1]).toBeCloseTo(c.remaining * .52 + .040, 6);
  expect(before.material.type).toBe('LineDashedMaterial'); expect(current.material.type).toBe('LineBasicMaterial'); expect(before.lineDistances.every(Number.isFinite)).toBe(true); expect(Math.max(...before.lineDistances)).toBeGreaterThan(0); if (span.visible) { expect(span.bounds[1]).toBeCloseTo(c.delta * .52, 6); expect(span.position[1]).toBeCloseTo(c.remaining * .52 + .040, 6); expect(span.data.removedLayers).toBe(c.delta); }
 }
 return { comparison, scene: s };
}
async function checkpointGuidesOn(page: Page) { await checkpointOpen(page); const checkbox = page.locator('#dino-checkpoint-guides'), before = await state(page); if (!await checkbox.isChecked()) { await checkbox.focus(); await checkbox.press('Space'); } await expect(checkbox).toBeChecked(); await expect.poll(async () => (await state(page)).digVoxelCheckpointGuides).toBe(true); expect(await state(page)).toEqual({ ...before, digVoxelCheckpointGuides: true }); await visibleCanvas(page); }
async function checkpointNote(page: Page, field: string, text: string) { await checkpointOpen(page); const before = await state(page); await page.locator('#dino-checkpoint-note-' + field).fill(text); const after = await state(page), key = savedKey(after.digVoxelCheckpoint); expect(after.digVoxelCheckpointNotes.key).toBe(key); expect(after.digVoxelCheckpointNotes[field]).toBe(text.slice(0, 400)); expect(after).toEqual({ ...before, digVoxelCheckpointNotes: after.digVoxelCheckpointNotes }); return after.digVoxelCheckpointNotes; }
async function brushStroke(page: Page, index: number) { await page.getByRole('button', { name: 'Brush', exact: true }).click(); await page.locator('#dino-dig-cell-' + index).focus(); const before = await state(page); await page.locator('#dino-dig-cell-' + index).press('Enter'); await expect.poll(async () => (await layers(page))[index]).toBe(before.digVoxel.depths[index] + 1); return state(page); }

test('native saved checkpoints compare multiple real brush and trowel strokes while stable notes survive until replacement and Undo invalidates the baseline', async ({ page }) => {
 await page.setViewportSize({ width: 1366, height: 900 }); await mount(page, { notebook: { microraptor: { question: 'Checkpoint reflections preserve this notebook question.' } } }); await expect(page.locator('#dino-voxel-controls-hint')).toHaveText(controlMessages.voxel_controls_hint); expect(controlMessages.voxel_controls_hint).toContain('displayed target column'); expect(controlMessages.voxel_controls_hint).toContain('When no column is pointed at, it uses the selected column.'); await checkpointKind(page, 'missing'); const untouched = await state(page), saved = await saveCheckpoint(page); expect(saved.columns.every((c: any) => c.removed === 0 && c.status === 'covered')).toBe(true); await assertEmptyCheckpointGuides(page);
 await checkpointNote(page, 'observation', 'A1 starts with all four model layers remaining.'); await checkpointNote(page, 'interpretation', 'The saved map records a starting surface, not a hidden find.'); const notes = await checkpointNote(page, 'next', 'Compare A1 and a trowel stroke around B2.');
 await brushStroke(page, 0); await page.getByRole('button', { name: 'Trowel', exact: true }).click(); await page.locator('#dino-dig-cell-7').focus(); await expect.poll(async () => (await previewSnapshot(page)).data.plan.focus).toBe(7); const beforeTrowel = await state(page), plan = (await previewSnapshot(page)).data.plan; await page.locator('#dino-dig-cell-7').press('Enter'); await expect.poll(async () => (await state(page)).digVoxel.depths.reduce((n: number, depth: number) => n + depth, 0)).toBeGreaterThan(beforeTrowel.digVoxel.depths.reduce((n: number, depth: number) => n + depth, 0)); const after = await state(page); expect(after.digVoxelAction.kind).toBe('excavate'); const actual = checkActualStroke(beforeTrowel, after, plan), comparison = await assertCheckpointMaps(page, saved);
 expect(comparison.changedColumns.length).toBeGreaterThan(1); expect(comparison.layersRemoved).toBe(after.digVoxel.depths.reduce((n: number, d: number) => n + d, 0)); expect(after.digVoxelCheckpoint).toEqual(saved); expect(after.digVoxelCheckpointNotes).toEqual(notes); expect(after.notebook).toEqual(untouched.notebook); await assertEmptyCheckpointGuides(page);
 await checkpointOpen(page); await page.locator('#dino-checkpoint-panel').screenshot({ path: path.join(dir, 'checkpoint-multi-stroke-desktop.png') }); const replaced = await saveCheckpoint(page); expect(replaced.columns.map((c: any) => c.removed)).toEqual(after.digVoxel.depths); expect((await assertCheckpointMaps(page, replaced)).changedColumns).toEqual([]); await checkpointNote(page, 'observation', 'This replacement begins after the two completed strokes.'); const beforeUndo = await state(page);
 await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click(); await checkpointKind(page, 'ahead'); expect((await state(page)).digVoxelCheckpoint).toEqual(replaced); expect((await state(page)).digVoxelCheckpointNotes).toEqual(beforeUndo.digVoxelCheckpointNotes); await expect(page.locator('[data-dig-checkpoint-map]')).toHaveCount(0); await expect(page.locator('[data-dig-checkpoint-note]')).toHaveCount(0); await assertEmptyCheckpointGuides(page);
 fs.writeFileSync(path.join(dir, 'checkpoint-native-comparison-proof.json'), JSON.stringify({ saved, actualTrowel: actual, comparison, notesStableAcrossCurrentKeyChange: true, replaced, UndoKind: 'ahead', invalidComparisonMapsAndGuidesEmpty: true, notebookPreserved: true, checkpointActionsChangeOnlyTheirOwnRecords: true }));
});

test('optional checkpoint boundaries reuse the retained geometry follow public surfaces and row selection while find inspection stays independent', async ({ page }) => {
 await page.setViewportSize({ width: 1366, height: 900 }); const voxel = emptyVoxel(); voxel.focus = 7; voxel.depths[19] = 4; await mount(page, { digFocus: 7, digVoxel: voxel, digRevealed: [19], digVoxelFindLook: 'raking' }); const saved = await saveCheckpoint(page), initial = await checkpointScene(page); await brushStroke(page, 7); await brushStroke(page, 13); const evidence = await preservedState(page); await assertEmptyCheckpointGuides(page);
 await checkpointGuidesOn(page); const full = await assertCheckpointGuides(page, saved); expect(full.scene.data.columnIndices).toEqual([7, 13]); expect(checkpointPool(full.scene)).toEqual(checkpointPool(initial)); await topCamera(page); await attachNativeInputs(page); await page.locator('#dino-voxel-canvas').focus(); const hover = await hoverCell(page, 13, 13); expect(hover.p.lastNativeRay.columns[0].role).toBe('sediment-voxel'); expect(JSON.stringify(hover.p.lastNativeRay)).not.toContain('checkpoint'); expect(await preservedState(page)).toEqual(evidence);
 await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'checkpoint-guides-desktop.png') }); const fullCamera = await camera(page); await mode(page, 'section'); const section = await assertCheckpointGuides(page, saved, 2); expect(section.scene.data.columnIndices).toEqual([13]); await checkpointOpen(page); const beforeSelect = await preservedState(page); await page.locator('[data-dig-checkpoint-select="7"]').focus(); await page.locator('[data-dig-checkpoint-select="7"]').press('Enter'); await expect.poll(async () => (await sectionScene(page)).row).toBe(1); const moved = await assertCheckpointGuides(page, saved, 1); expect(moved.scene.data.columnIndices).toEqual([7]); expect(await preservedState(page)).toEqual(beforeSelect);
 await page.locator('#dino-voxel-canvas').focus(); await page.keyboard.press('Enter'); expect(await preservedState(page)).toEqual(evidence); await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'checkpoint-guides-section-desktop.png') }); await mode(page, 'full'); await visibleCanvas(page); expect(await camera(page)).toEqual(fullCamera); await selectFocus(page, 19); await page.locator('[data-dig-view="find"]').click(); const plate = await waitFindPlate(page), find = await terrainSnapshot(page), findCamera = await camera(page); await assertEmptyCheckpointGuides(page); await expect(page.locator('#dino-checkpoint-panel')).toHaveCount(0); expect((await page.locator('#dino-voxel-canvas').getAttribute('aria-describedby'))?.split(' ')).not.toContain('dino-checkpoint-legend');
 await page.locator('[data-dig-find-camera="top"]').click(); await visibleCanvas(page); expect((await findPlateSnapshot(page)).passes).toBe(plate.passes); expect((await terrainSnapshot(page)).lights.filter((l: any) => l.name.startsWith('dino-find-'))).toEqual(find.lights.filter((l: any) => l.name.startsWith('dino-find-'))); await assertEmptyCheckpointGuides(page);
 await page.locator('[data-dig-view="full"]').click(); await visibleCanvas(page); await checkpointOpen(page); const returned = await assertCheckpointGuides(page, saved); expect(checkpointPool(returned.scene)).toEqual(checkpointPool(initial)); expect(await preservedState(page)).toEqual(evidence);
 fs.writeFileSync(path.join(dir, 'checkpoint-guides-inspection-proof.json'), JSON.stringify({ full, section, moved, actualNativeRay: hover.p.lastNativeRay, changedSelectionReadOnly: true, noNewGeometryAndNoPickerMembership: true, findPlateCacheUnaffectedByCameraCommand: plate, findCameraBeforeCommand: findCamera, findLightsIndependent: true, hiddenAndMetadataEmptyInFind: true, viewBanksPreserved: true, returnedPool: checkpointPool(returned.scene) }));
});

test('checkpoint notes and compatible public records survive reload while clear prepared samples new sites and invalid imports hide comparisons', async ({ page }) => {
 await mount(page, { notebook: { microraptor: { question: 'Resetting a comparison keeps the notebook.' } } }); const saved = await saveCheckpoint(page); await checkpointNote(page, 'observation', 'A1 was recorded before excavation.'); await checkpointNote(page, 'interpretation', 'Removing a model layer is not a geological date.'); await checkpointNote(page, 'next', 'Record another public surface.'); await brushStroke(page, 0); await checkpointGuidesOn(page); const notes = await checkpointNote(page, 'observation', 'A'.repeat(450)); expect(notes.observation).toHaveLength(400); await expect(page.locator('#dino-checkpoint-note-observation')).toHaveAttribute('maxlength', '400'); const stored = await state(page), evidence = await preservedState(page);
 await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); await mount(page, stored); await checkpointOpen(page); await checkpointKind(page, 'ready'); expect((await state(page)).digVoxelCheckpoint).toEqual(saved); expect((await state(page)).digVoxelCheckpointNotes).toEqual(notes); await expect(page.locator('#dino-checkpoint-note-observation')).toHaveValue(notes.observation); await expect(page.locator('#dino-checkpoint-guides')).toBeChecked(); await assertCheckpointGuides(page, saved); expect(await preservedState(page)).toEqual(evidence);
 const beforeClear = await state(page); await page.locator('#dino-checkpoint-clear').focus(); await page.locator('#dino-checkpoint-clear').press('Space'); await checkpointKind(page, 'missing'); expect(await state(page)).toEqual({ ...beforeClear, digVoxelCheckpoint: null, digVoxelCheckpointNotes: null }); expect((await state(page)).digVoxelCheckpointGuides).toBe(true); await assertEmptyCheckpointGuides(page); await expect(page.locator('[data-dig-checkpoint-map]')).toHaveCount(0);
 await saveCheckpoint(page); await checkpointNote(page, 'next', 'A prepared sample begins another comparison.'); await page.getByRole('button', { name: 'Use a prepared sample', exact: true }).click(); await checkpointKind(page, 'missing'); const prepared = await state(page); expect(prepared).toMatchObject({ digVoxelCheckpoint: null, digVoxelCheckpointNotes: null, digVoxelCheckpointGuides: true }); await assertEmptyCheckpointGuides(page);
 const oldSite = await saveCheckpoint(page); await checkpointNote(page, 'next', 'This note belongs to this saved site.'); await page.getByRole('button', { name: 'New dig', exact: true }).click(); await expect.poll(async () => (await state(page)).digSeed).toBe(2); await checkpointKind(page, 'missing'); const newSite = await state(page); expect(newSite).toMatchObject({ digVoxelCheckpoint: null, digVoxelCheckpointNotes: null, digVoxelCheckpointGuides: true }); expect(newSite.notebook).toEqual(stored.notebook); await assertEmptyCheckpointGuides(page);
 await harness.unmount(page); await mount(page, { ...newSite, digVoxelCheckpoint: oldSite, digVoxelCheckpointNotes: notes }); await checkpointOpen(page); await checkpointKind(page, 'stale'); await expect(page.locator('[data-dig-checkpoint-map], [data-dig-checkpoint-note]')).toHaveCount(0); await assertEmptyCheckpointGuides(page);
 const malformed = JSON.parse(JSON.stringify(oldSite)); malformed.seed = 2; malformed.columns[23].index = 22; await harness.unmount(page); await mount(page, { ...newSite, digVoxelCheckpoint: malformed }); await checkpointOpen(page); await checkpointKind(page, 'invalid'); await expect(page.locator('[data-dig-checkpoint-map], [data-dig-checkpoint-note]')).toHaveCount(0); await assertEmptyCheckpointGuides(page);
 fs.writeFileSync(path.join(dir, 'checkpoint-reset-reload-proof.json'), JSON.stringify({ publicRecordRoundTrip: saved, stableNotesKey: notes.key, noteCharacterLimit: 400, reloadPreservesCompatibleComparison: true, clearChangesOnlyTwoFields: true, preparedAndNewSiteClearRecordAndNotes: true, guidePreferenceRetainedWithoutVisibleMetadata: true, staleAndMalformedNoMapsOrNotes: true, notebookPreserved: true }));
});

test('checkpoint comparisons reflow in phone themes keep closed-disclosure guide descriptions and dispose their retained scene pool', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' }); const voxel = emptyVoxel(); voxel.focus = 7; voxel.tool = 'trowel'; voxel.depths[19] = 4; await mount(page, { digFocus: 7, digVoxel: voxel, digRevealed: [19], digVoxelFindLook: 'outline' }); await topCamera(page); await attachNativeInputs(page); await page.getByRole('button', { name: 'Brush', exact: true }).click(); await page.locator('#dino-voxel-canvas').focus(); await hoverCell(page, 23, 7); await page.getByRole('button', { name: 'Trowel', exact: true }).click(); const saved = await saveCheckpoint(page); await brushStroke(page, 7); await brushStroke(page, 13); await checkpointGuidesOn(page); await checkpointNote(page, 'observation', 'B2 and B3 changed since the saved public map.'); const evidence = await preservedState(page), notes = (await state(page)).digVoxelCheckpointNotes, initial = checkpointPool(await checkpointScene(page)), audits: any[] = [], frames: any[] = []; await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
 for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
  await theme(page, name); await checkpointOpen(page); await noHorizontalOverflow(page); const comparison = await assertCheckpointGuides(page, saved); const boxes = await page.locator('#dino-checkpoint-panel, [data-dig-checkpoint-map], #dino-checkpoint-panel textarea, #dino-checkpoint-panel button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName, left: r.left, right: r.right, width: r.width, height: r.height }; })); for (const box of boxes) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.width).toBeGreaterThan(24); if (box.tag === 'BUTTON') expect(box.height).toBeGreaterThanOrEqual(44); }
  const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); }); audits.push({ width, theme: name, violations }); expect(violations).toEqual([]); expect(await preservedState(page)).toEqual(evidence); expect((await state(page)).digVoxelCheckpointNotes).toEqual(notes); expect(checkpointPool(comparison.scene)).toEqual(initial);
  await page.locator('#dino-checkpoint-panel').screenshot({ path: path.join(dir, 'checkpoint-phone-' + width + '-' + name + '.png') }); const summary = page.locator('#dino-checkpoint-details > summary'); await summary.focus(); await summary.press('Enter'); await expect(page.locator('#dino-checkpoint-details')).not.toHaveAttribute('open', ''); await expect(page.locator('#dino-checkpoint-guides-hint')).toBeVisible(); await expect(page.locator('#dino-checkpoint-legend')).toBeVisible(); const description = (await page.locator('#dino-voxel-canvas').getAttribute('aria-describedby'))?.split(' '); expect(description).toContain('dino-checkpoint-guides-hint'); expect(description).toContain('dino-checkpoint-legend'); await visibleCanvas(page); expect((await checkpointScene(page)).visible).toBe(true); if (name === 'theme-default') await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'checkpoint-guides-phone-' + width + '.png') }); frames.push({ width, theme: name, boxes, descriptionsVisibleWhenClosed: true }); await summary.press('Enter');
 } }
 await visibleCanvas(page); await page.waitForTimeout(180); const idle = (await checkpointScene(page)).renders; await page.waitForTimeout(240); const idleDraws = (await checkpointScene(page)).renders - idle; expect(idleDraws).toBeLessThanOrEqual(1); expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 }); await selectFocus(page, 19); await page.locator('[data-dig-view="find"]').click(); await waitFindPlate(page); await assertEmptyCheckpointGuides(page); const resources = await collectSceneOwnership(page); expect(resources).toEqual({ owned: 116, borrowed: 1, targetTextureInOwned: false });
 await page.locator('#dinotab-notes').click(); await expect.poll(() => page.evaluate(() => (window as any).__previewDisposal.disposed)).toBe(116); const disposed = await page.evaluate(() => (window as any).__previewDisposal); expect(disposed.records.every((r: any) => r.disposed)).toBe(true); const targetsBefore = await page.evaluate(() => (window as any).__strokePreviewQA.targets.map((t: any) => ({ uuid: t.uuid, disposed: t.disposed, textureDisposed: t.textureDisposed }))); expect(targetsBefore).toHaveLength(1); expect(targetsBefore[0]).toMatchObject({ disposed: 1, textureDisposed: 0 });
 await page.locator('#dinotab-dig').click(); await ready(page); await page.locator('[data-dig-view="full"]').click(); await visibleCanvas(page); await checkpointOpen(page); const returned = await assertCheckpointGuides(page, saved); expect(checkpointPool(returned.scene)).not.toEqual(initial); expect(await preservedState(page)).toEqual(evidence); expect((await state(page)).digVoxelCheckpointNotes).toEqual(notes); await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); const targets = await page.evaluate(() => (window as any).__strokePreviewQA.targets.map((t: any) => ({ uuid: t.uuid, disposed: t.disposed, textureDisposed: t.textureDisposed }))); expect(targets.every((t: any) => t.disposed === 1 && t.textureDisposed === 0)).toBe(true);
 fs.writeFileSync(path.join(dir, 'checkpoint-accessibility.json'), JSON.stringify(audits)); fs.writeFileSync(path.join(dir, 'checkpoint-phone-framing.json'), JSON.stringify(frames)); fs.writeFileSync(path.join(dir, 'checkpoint-lifecycle-proof.json'), JSON.stringify({ reducedMotionStatic: true, idleDraws, resources, disposed, captureTargets: targets, targetTextureOwnedByTarget: true, borrowedDefaultSpriteExcluded: true, retainedThreeGeometryTwoMaterialPool: true, closedNativeDisclosureKeepsGuideDescriptions: true, remountPreservesPublicComparisonAndNotes: true }));
});
