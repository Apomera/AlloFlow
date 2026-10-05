import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-stroke-preview-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const previewMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_'))) as Record<string,string>;
const terrainMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('terrain_'))) as Record<string,string>;
const registeredMessages = { ...sectionMessages, ...planMessages, ...footprintMessages, ...previewMessages, ...findMessages, ...terrainMessages };
const probes = `
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
  expect(crypto.createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_dinolab.js')).digest('hex')).toBe('0e5ec342e8f6b30814f727144f81628ca84345ac53c39250d3785171b2808d24');
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
      if (key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.find_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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

test('native hover rays on uneven terrain keep root selection immutable and Enter excavates the displayed brush target',async({page})=>{
 await page.setViewportSize({width:1366,height:900});const voxel=emptyVoxel();voxel.depths[1]=1;voxel.depths[2]=2;voxel.depths[7]=1;voxel.depths[8]=3;voxel.depths[14]=4;
 await mount(page,{digVoxel:voxel,notebook:{microraptor:{question:'A prospective box is not new evidence.'}}});await topCamera(page);await attachNativeInputs(page);await page.locator('#dino-voxel-canvas').focus();
 const before=await state(page),initial=await envelopePool(page),proof:any[]=[];
 for(const index of [1,2,7,14]){const hit=await hoverCell(page,index,0),p=await assertEnvelopes(page);expect(await state(page)).toEqual(before);expect(await envelopePool(page)).toEqual(initial);expect(await feedbackFrames(page)).toEqual([]);proof.push({index,projection:hit.point,ray:p.lastNativeRay,preview:p.data,hud:p.hud,targets:p.targets});}
 expect(new Set(proof.map(p=>p.projection.top)).size).toBeGreaterThan(2);
 await hoverCell(page,7,0);const plan=(await previewSnapshot(page)).data.plan;await page.keyboard.press('Enter');await expect.poll(async()=>(await layers(page))[7]).toBe(before.digVoxel.depths[7]+1);
 const after=await state(page),actual=checkActualStroke(before,after,plan);expect(actual.changed).toEqual([7]);expect(after.digFocus).toBe(7);expect(after.notebook).toEqual(before.notebook);const current=await expectPreview(page,7,'selection',7);expect(current.inputs.filter((e:any)=>e.type==='keydown').slice(-1)[0]).toMatchObject({key:'Enter',isTrusted:true});
 await page.locator('[data-dig-camera="oblique"]').click();await visibleCanvas(page);await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'preview-brush-uneven-desktop.png')});
 fs.writeFileSync(path.join(dir,'preview-native-hover-enter-proof.json'),JSON.stringify({proof,rootStateUnchangedDuringHover:true,geometryPoolRetained:true,nativeEnterUsesDisplayedTarget:true,actual,notebookPreserved:true,mainRendererOnly:true}));
});

test('native picks show solid brush dashed trowel and zero-volume held envelopes across nine cells and clipped edges',async({page})=>{
 await page.setViewportSize({width:1366,height:900});const voxel=emptyVoxel();voxel.tool='trowel';voxel.focus=15;voxel.depths[16]=3;voxel.contacts[16]=true;voxel.depths[20]=4;voxel.depths[21]=3;
 await mount(page,{digFocus:15,digVoxel:voxel});await topCamera(page);await attachNativeInputs(page);await page.locator('#dino-voxel-canvas').focus();const initial=await envelopePool(page),before=await state(page),proof:any[]=[];
 for(const [index,expected]of [[15,[8,9,10,14,15,16,20,21,22]],[7,[0,1,2,6,7,8,12,13,14]],[0,[0,1,6,7]],[23,[16,17,22,23]],[21,[14,15,16,20,21,22]]]as [number,number[]][]){
  await hoverCell(page,index,15);const p=await assertEnvelopes(page);expect(p.data.plan.footprint).toEqual(expected);expect(await state(page)).toEqual(before);expect(await envelopePool(page)).toEqual(initial);if(index===21){expect(p.data.plan.blocked).toBe(true);expect(p.targets.every((t:any)=>t.crossVisible&&!t.envelope.visible&&t.envelope.data.height===0)).toBe(true);}proof.push({index,plan:p.data.plan,targets:p.targets});
 }
 await page.getByRole('button',{name:'Brush',exact:true}).click();await page.locator('#dino-voxel-canvas').focus();await hoverCell(page,16,15);const brush=await assertEnvelopes(page);expect(brush.data.plan).toMatchObject({minRemoval:1,maxRemoval:1});expect(brush.targets[0].envelope.data.certainty).toBe('guaranteed');
 const clickBefore=await state(page),point=await hoverCell(page,16,15);await page.mouse.down();expect(await state(page)).toEqual(clickBefore);expect((await previewSnapshot(page)).hud?.target).toBe('16');await page.mouse.up();await expect.poll(async()=>(await layers(page))[16]).toBe(4);
 const actual=checkActualStroke(clickBefore,await state(page),brush.data.plan);expect(actual.changed).toEqual([16]);await expectPreview(page,16,'selection',16);const held=await assertEnvelopes(page);expect(held.targets[0].envelope.data).toMatchObject({certainty:'held',height:0,minRemoval:0,maxRemoval:0});
 await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>(await layers(page))[16]).toBe(3);await page.getByRole('button',{name:'Trowel',exact:true}).click();await selectFocus(page,15);await page.locator('[data-dig-camera="oblique"]').click();await visibleCanvas(page);await assertEnvelopes(page);
 await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'preview-mixed-envelope-desktop.png')});await page.locator('#dino-preview-volume-legend').screenshot({path:path.join(dir,'preview-volume-legend-desktop.png')});
 fs.writeFileSync(path.join(dir,'preview-envelope-certainty-proof.json'),JSON.stringify({proof,brush,actual,nativeClickCoordinates:{x:point.x,y:point.y},oneLayerGeometryMeasured:true,voxelWidth:1.062,modelLayerHeight:.52,heldGeometryZero:true,allNineAndClippedEdges:true,overlayNeverRayHit:true,geometryPoolRetained:true}));
});

test('native leave focus keyboard tool view seed Undo and camera transitions restore the prospective selection without preview excavation',async({page})=>{
 const voxel=emptyVoxel();voxel.tool='trowel';voxel.focus=7;voxel.depths[19]=4;await mount(page,{digFocus:7,digVoxel:voxel,digRevealed:[19],notebook:{microraptor:{question:'Preview transitions preserve notebook work.'}}});await topCamera(page);await attachNativeInputs(page);await page.locator('#dino-voxel-canvas').focus();
 const before=await state(page),initial=await envelopePool(page);await hoverCell(page,23,7);await page.mouse.move(5,5);await expectPreview(page,7,'selection',7);expect(await state(page)).toEqual(before);
 await page.locator('#dino-voxel-canvas').focus();await hoverCell(page,23,7);await page.locator('#dino-dig-cell-8').focus();await expectPreview(page,8,'selection',8);await page.locator('#dino-dig-cell-8').press('ArrowDown');await expectPreview(page,14,'selection',14);const gridBefore=await state(page),plan=(await previewSnapshot(page)).data.plan;
 await page.locator('#dino-dig-cell-14').press('Enter');await expect.poll(async()=>(await state(page)).digVoxelAction?.kind).toBe('excavate');const actual=checkActualStroke(gridBefore,await state(page),plan);
 await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>await preservedState(page)).toEqual({...await observationStateFrom(gridBefore),notebook:gridBefore.notebook});await expectPreview(page,14,'selection',14);
 const toggle=page.locator('#dino-footprint-toggle');await toggle.focus();await toggle.press('Space');await expect.poll(async()=>(await previewSnapshot(page)).visible).toBe(false);await expect(page.locator('#dino-preview-target')).toHaveCount(0);await expect(page.locator('#dino-preview-volume-legend')).toHaveCount(0);expect((await page.locator('#dino-voxel-canvas').getAttribute('aria-describedby'))?.split(' ')).not.toContain('dino-preview-volume-legend');await toggle.press('Enter');await expectPreview(page,14,'selection',14);
 await mode(page,'section');expect((await previewSnapshot(page)).visible).toBe(false);await expect(page.locator('#dino-preview-volume-legend')).toHaveCount(0);await expect(page.locator('#dino-preview-target')).toHaveCount(0);expect((await page.locator('#dino-voxel-canvas').getAttribute('aria-describedby'))?.split(' ')).not.toContain('dino-preview-volume-legend');
 await page.locator('[data-dig-view="full"]').click();await selectFocus(page,19);await page.locator('[data-dig-view="find"]').click();await expect(page.locator('#dino-voxel-stage')).toHaveAttribute('data-dig-view','find');expect((await previewSnapshot(page)).visible).toBe(false);expect((await previewSnapshot(page)).scenePreview.focus).toBeNull();await expect(page.locator('#dino-preview-target')).toHaveCount(0);
 await page.locator('[data-dig-view="full"]').click();await page.getByRole('button',{name:'New dig',exact:true}).click();await expect.poll(async()=>(await state(page)).digSeed).toBe(2);const stored=(await state(page)).digFocus??(await state(page)).digVoxel.focus;await expectPreview(page,stored,'selection',stored);expect(await envelopePool(page)).toEqual(initial);
 await page.getByRole('button',{name:'Brush',exact:true}).focus();await page.getByRole('button',{name:'Brush',exact:true}).press('Enter');const selected=await expectPreview(page,stored,'selection',stored);expect(selected.hud?.tool).toBe('brush');
 await visibleCanvas(page);await page.locator('#dino-voxel-canvas').focus();const dragBefore=await preservedState(page),cameraBefore=await camera(page),hit=await hoverCell(page,7,stored);await page.mouse.down();await page.mouse.move(hit.x+48,hit.y+14,{steps:5});await page.mouse.up();await expectPreview(page,stored,'selection',stored);expect(await preservedState(page)).toEqual(dragBefore);expect(await camera(page)).not.toEqual(cameraBefore);expect((await envelopePool(page)).scene).toBe(initial.scene);
 fs.writeFileSync(path.join(dir,'preview-native-transition-proof.json'),JSON.stringify({pointerLeaveRestores:true,focusAndGridKeysRestore:true,nativeGridEnterRange:actual,undoRestores:true,toolKeyboard:true,hiddenInSectionAndFind:true,previewToggleDescriptionsCorrect:true,newSeedClearsTransient:true,dragOrbitsWithoutExcavation:true,sceneAndGeometryPoolRetained:true,notebookPreserved:true}));
});
async function observationStateFrom(value:any){return {depths:value.digVoxel.depths,contacts:value.digVoxel.contacts,revealed:value.digRevealed||[],citations:value.digCitedClues||[],guess:value.digGuess||null,solved:value.digSolvedFor||null};}

test('prospective stroke guides fit phone themes pass axe remain static with reduced motion and dispose their shared scene pool',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const voxel=emptyVoxel();voxel.tool='trowel';voxel.focus=7;voxel.depths[19]=4;
 await mount(page,{digFocus:7,digVoxel:voxel,digRevealed:[19],digVoxelFindLook:'outline'});await topCamera(page);await attachNativeInputs(page);await page.getByRole('button',{name:'Brush',exact:true}).click();await page.locator('#dino-voxel-canvas').focus();await hoverCell(page,23,7);await page.getByRole('button',{name:'Trowel',exact:true}).click();
 const evidence=await preservedState(page),initial=await envelopePool(page),audits:any[]=[],frames:any[]=[];await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 for(const width of [320,390]){await page.setViewportSize({width,height:844});for(const themeName of ['theme-default','theme-dark','theme-contrast']){
  await theme(page,themeName);await noHorizontalOverflow(page);await visibleCanvas(page);await page.locator('#dino-voxel-canvas').focus();await hoverCell(page,7,7);const p=await assertEnvelopes(page);expect(p.targets.filter((t:any)=>t.envelope.effectiveVisible).length).toBe(9);
  expect((await page.locator('#dino-voxel-canvas').getAttribute('aria-describedby'))?.split(' ')).toContain('dino-preview-volume-legend');await expect(page.locator('#dino-preview-volume-legend')).toHaveAccessibleName(previewMessages.preview_legend_title);
  for(const selector of ['#dino-preview-volume-legend','#dino-preview-target','#dino-action-plan-map']){const box=(await page.locator(selector).boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.width).toBeGreaterThan(20);}
  const violations=await page.evaluate(async()=>{const result=await(window as any).axe.run(document.querySelector('#dinopanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}));});audits.push({width,theme:themeName,violations});
  expect(await preservedState(page)).toEqual(evidence);expect(await envelopePool(page)).toEqual(initial);frames.push({width,theme:themeName,target:p.hud,plan:p.data.plan});
  await page.locator('#dino-voxel-stage').screenshot({path:path.join(dir,'preview-phone-'+width+'-'+themeName+'.png')});await page.locator('#dino-preview-volume-legend').screenshot({path:path.join(dir,'preview-legend-phone-'+width+'-'+themeName+'.png')});
 }}
 fs.writeFileSync(path.join(dir,'preview-accessibility.json'),JSON.stringify(audits));fs.writeFileSync(path.join(dir,'preview-phone-framing.json'),JSON.stringify(frames));expect(audits.filter(a=>a.violations.length)).toEqual([]);
 await visibleCanvas(page);await page.waitForTimeout(180);const idle=(await previewSnapshot(page)).renders;await page.waitForTimeout(230);const idleDraws=(await previewSnapshot(page)).renders-idle;expect(idleDraws).toBeLessThanOrEqual(1);expect(await feedbackNow(page)).toEqual({removed:0,dust:0});
 await selectFocus(page,19);await page.locator('[data-dig-view="find"]').click();await visibleCanvas(page);await expect(page.locator('#dino-find-view-plate')).toHaveAttribute('data-dig-find-plate-ready','true');const resources=await collectSceneOwnership(page);expect(resources).toEqual({owned:114,borrowed:1,targetTextureInOwned:false});
 await page.locator('#dinotab-notes').click();await expect.poll(()=>page.evaluate(()=>(window as any).__previewDisposal.disposed)).toBe(resources.owned);const disposal=await page.evaluate(()=>(window as any).__previewDisposal);expect(disposal.records.every((r:any)=>r.disposed)).toBe(true);expect(disposal.borrowedRecords).toMatchObject([{matchedDefaultSpriteGeometry:true}]);const oldTargets=await page.evaluate(()=>(window as any).__strokePreviewQA.targets.map((r:any)=>({uuid:r.uuid,disposed:r.disposed,textureDisposed:r.textureDisposed})));expect(oldTargets).toHaveLength(1);expect(oldTargets[0]).toMatchObject({disposed:1,textureDisposed:0});
 await page.locator('#dinotab-dig').click();await ready(page);await page.locator('[data-dig-view="full"]').click();await selectFocus(page,7);await visibleCanvas(page);await expectPreview(page,7,'selection',7);expect(await preservedState(page)).toEqual(evidence);expect((await envelopePool(page)).scene).not.toBe(initial.scene);await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
 fs.writeFileSync(path.join(dir,'preview-scene-disposal-diagnostic.json'),JSON.stringify(disposal));fs.writeFileSync(path.join(dir,'preview-motion-lifecycle-proof.json'),JSON.stringify({reducedMotionStatic:true,idleDraws,geometryPoolRetainedAcrossPointerAndThemeChanges:true,resources,disposedSceneResources:disposal.disposed,borrowedSpriteExcluded:true,ownershipCondition:'outlined exposed find19 after both envelope styles used',captureTargets:oldTargets,targetTextureOwnedByTarget:true,remountPreservesEvidence:true,contexts:(await harness.glContexts(page)).map(c=>({id:c.id,lost:c.lost}))}));
});
