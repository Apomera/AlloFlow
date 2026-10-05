import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-action-planning-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const previewMessages = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const registeredMessages = { ...previewMessages, ...sectionMessages, ...planMessages, ...footprintMessages };
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
    if (scene.name === 'dino-voxel-excavation') {
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
      if (key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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

test('observable action previews match brush and clipped trowel footprints without changing evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, { notebook: { microraptor: { question: 'A preview preserves my independent notebook question.' } } });
  await assertLiveScene(page);
  await expect(page.locator('#dino-footprint-toggle')).toHaveAttribute('aria-pressed', 'true');
  const before = await preservedState(page), initial = await sectionScene(page);
  const brush = await assertPlanParity(page, [0]);
  expect(brush.plan).toMatchObject({ minRemoval: 1, maxRemoval: 1, eligibleCount: 1, blocked: false });
  await page.getByRole('button', { name: 'Trowel', exact: true }).click();
  const footprints: any[] = [];
  for (const [focus, expected] of [[0, [0, 1, 6, 7]], [2, [1, 2, 3, 7, 8, 9]], [7, [0, 1, 2, 6, 7, 8, 12, 13, 14]], [23, [16, 17, 22, 23]]] as [number, number[]][]) {
    await selectFocus(page, focus);
    const snapshot = await assertPlanParity(page, expected);
    expect(snapshot.plan).toMatchObject({ minRemoval: 0, maxRemoval: expected.length, eligibleCount: expected.length });
    expect(snapshot.plan.columns.every((column: any) => column.status === 'candidate')).toBe(true);
    expect(await preservedState(page)).toEqual(before);
    expect(snapshot.scene).toBe(initial.scene); expect(snapshot.renderer).toBe(initial.renderer);
    footprints.push({ focus, footprint: snapshot.plan.footprint, min: snapshot.plan.minRemoval, max: snapshot.plan.maxRemoval });
  }
  const selectedPlan = (await footprintScene(page)).plan;
  const canvas = page.locator('#dino-voxel-canvas'); await canvas.scrollIntoViewIfNeeded();
  const target = await projectedTarget(page); expect(target).not.toBeNull();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + (target!.x + 1) / 2 * box.width, box.y + (1 - target!.y) / 2 * box.height);
  await expect.poll(async () => (await footprintScene(page)).plan.focus).toBe(target!.column);
  expect((await footprintScene(page)).plan.coord).toBe(coord(target!.column));
  expect(await page.locator('#dino-action-plan-map [data-dig-plan-selected="true"]').getAttribute('data-dig-plan-cell')).toBe(String(selectedPlan.focus));
  expect(await page.locator('#dino-action-plan-map [data-dig-plan-footprint="true"]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-dig-plan-cell'))))).toEqual(selectedPlan.footprint);
  expect((await state(page)).digFocus).toBe(23);
  await page.locator('#dino-footprint-toggle').click();
  await expect.poll(async () => (await footprintScene(page)).visible).toBe(false);
  await page.locator('#dino-footprint-toggle').click();
  await expect.poll(async () => (await footprintScene(page)).visible).toBe(true);
  expect(await preservedState(page)).toEqual(before);
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0);
  expect(await feedbackFrames(page)).toEqual([]);
  expect(await page.evaluate(() => {
    const scene = (window as any).__voxelQA.current.scene;
    return Array.from({ length: 24 }, (_, index) => scene.getObjectByName('dino-fossil-fragment-' + index).visible).some(Boolean);
  })).toBe(false);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'action-preview-desktop.png') });
  await page.locator('#dino-action-plan').screenshot({ path: path.join(dir, 'action-plan-desktop.png') });
  await harness.unmount(page);
  const other = emptyVoxel(2); other.tool = 'trowel'; other.focus = 23;
  await mount(page, { digSeed: 2, digFocus: 23, digVoxel: other });
  expect((await footprintScene(page)).plan).toEqual(selectedPlan);
  fs.writeFileSync(path.join(dir, 'action-preview-proof.json'), JSON.stringify({ footprints, immutableEvidence: true, rendererRetained: true, hoverLeavesPersistentPlan: true, hiddenLayoutsGiveSamePlan: true }));
});

test('known contacts and protected columns guide plans while only real digging creates removal feedback', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const voxel = emptyVoxel(); voxel.tool = 'trowel'; voxel.focus = 15;
  voxel.depths[16] = 3; voxel.contacts[16] = true; voxel.depths[20] = 4; voxel.depths[21] = 3;
  await mount(page, { digFocus: 15, digVoxel: voxel, notebook: { microraptor: { question: 'Observed contacts do not replace notebook evidence.' } } });
  const initial = await sectionScene(page), notebook = (await state(page)).notebook;
  const mixed = await assertPlanParity(page, [8, 9, 10, 14, 15, 16, 20, 21, 22]);
  expect(mixed.plan).toMatchObject({ minRemoval: 0, maxRemoval: 6, eligibleCount: 6, contactStopCount: 1, protectedCount: 1, clearedCount: 1 });
  expect(mixed.plan.columns.find((column: any) => column.index === 22)).toMatchObject({ status: 'candidate', contact: false, minRemoval: 0, maxRemoval: 1 });
  const before = await preservedState(page);
  await selectFocus(page, 21);
  const blocked = await footprintScene(page);
  expect(blocked.plan).toMatchObject({ blocked: true, blockReason: 'protected', minRemoval: 0, maxRemoval: 0, eligibleCount: 0 });
  await expect(page.getByRole('button', { name: 'Excavate selected column', exact: true })).toBeDisabled();
  expect(await preservedState(page)).toEqual(before);
  await selectFocus(page, 15);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(1);
  const firstFeedback = await assertFeedback(page, [8, 9, 10, 14, 15, 22]);
  expect((await footprintScene(page)).plan.columns.find((column: any) => column.index === 22)).toMatchObject({ status: 'candidate', contact: false });
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await state(page)).digVoxel.contacts[22]).toBe(true);
  expect((await layers(page))[22]).toBe(1);
  const contactFeedback = await assertFeedback(page, [8, 9, 10, 14, 15]);
  expect((await state(page)).digVoxelAction).toMatchObject({ removed: 5, contacts: 1 });
  expect((await footprintScene(page)).plan.columns.find((column: any) => column.index === 22)).toMatchObject({ status: 'contact-stop', contact: true, minRemoval: 0, maxRemoval: 0 });
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  await selectFocus(page, 22); await page.getByRole('button', { name: 'Brush', exact: true }).click();
  expect((await footprintScene(page)).plan).toMatchObject({ minRemoval: 1, maxRemoval: 1, eligibleCount: 1, contactCount: 1 });
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(2);
  const brushFeedback = await assertFeedback(page, [22]);
  expect((await footprintScene(page)).plan).toMatchObject({ blocked: true, blockReason: 'protected', minRemoval: 0, maxRemoval: 0 });
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(true);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'action-observed-exposure.png') });
  await page.locator('#dino-action-plan').screenshot({ path: path.join(dir, 'action-protected-plan.png') });
  await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(1);
  await settle(page);
  expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
  expect((await state(page)).notebook).toEqual(notebook);
  expect((await sectionScene(page)).scene).toBe(initial.scene);
  fs.writeFileSync(path.join(dir, 'action-contact-feedback-proof.json'), JSON.stringify({ mixedPlan: mixed.plan, blockedCenterRespected: true, firstFeedback, contactFeedback, brushFeedback, undoSuppressesFeedback: true, notebookPreserved: true }));
});

test('keyboard preview controls and section inspection preserve the selected plan and notebook', async ({ page }) => {
  await mount(page, { notebook: { microraptor: { question: 'Keyboard previews preserve this independent record.' } } });
  const initial = await sectionScene(page), before = await preservedState(page);
  const toggle = page.locator('#dino-footprint-toggle');
  await toggle.focus(); await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await footprintScene(page)).visible).toBe(false);
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Trowel', exact: true }).focus();
  await page.getByRole('button', { name: 'Trowel', exact: true }).press('Enter');
  expect(await preservedState(page)).toEqual(before);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[0]).toBe(1);
  const afterDig = await preservedState(page);
  await mode(page, 'section');
  await expect(toggle).toBeDisabled();
  await expect.poll(async () => (await footprintScene(page)).visible).toBe(false);
  expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
  await page.locator('#dino-dig-cell-1').focus(); await page.locator('#dino-dig-cell-1').press('ArrowDown');
  await expect(page.locator('#dino-dig-cell-7')).toBeFocused();
  await page.locator('#dino-dig-cell-7').press('Enter');
  await expect.poll(async () => (await state(page)).digFocus).toBe(7);
  expect(await preservedState(page)).toEqual(afterDig);
  await page.locator('#dino-voxel-canvas').focus(); await page.locator('#dino-voxel-canvas').press('Space');
  expect(await preservedState(page)).toEqual(afterDig);
  await mode(page, 'full');
  await expect(toggle).toBeEnabled();
  await expect.poll(async () => (await footprintScene(page)).visible).toBe(true);
  const plan = await assertPlanParity(page, [0, 1, 2, 6, 7, 8, 12, 13, 14]);
  expect(plan.plan.focus).toBe(7);
  expect(plan.scene).toBe(initial.scene); expect(plan.renderer).toBe(initial.renderer);
  fs.writeFileSync(path.join(dir, 'action-keyboard-section-proof.json'), JSON.stringify({ nativeToggleKeyboard: true, toolKeyboard: true, sectionSelectOnly: true, footprintDisabledInSection: true, feedbackSuppressedInSection: true, evidenceAndNotebookPreserved: true, rendererRetained: true }));
});

test('action plans reflow across phone themes, respect reduced motion, and dispose their GPU resources', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const voxel = emptyVoxel(); voxel.tool = 'trowel'; voxel.focus = 7;
  await mount(page, { digFocus: 7, digVoxel: voxel });
  const initial = await sectionScene(page), mountId = await harness.currentMount(page);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[7]).toBe(1);
  await settle(page);
  expect(await feedbackNow(page)).toEqual({ removed: 0, dust: 0 });
  expect(await feedbackFrames(page)).toEqual([]);
  const afterDig = await preservedState(page);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
      await theme(page, name); await noHorizontalOverflow(page);
      const box = (await page.locator('#dino-action-plan-map').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      await assertPlanParity(page, [0, 1, 2, 6, 7, 8, 12, 13, 14]);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
      });
      audits.push({ width, theme: name, violations });
      expect(await preservedState(page)).toEqual(afterDig);
      const retained = await sectionScene(page);
      expect(retained.scene).toBe(initial.scene); expect(retained.renderer).toBe(initial.renderer);
    }
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'action-preview-phone-' + width + '.png') });
    await page.locator('#dino-action-plan').screenshot({ path: path.join(dir, 'action-plan-phone-' + width + '.png') });
  }
  fs.writeFileSync(path.join(dir, 'action-accessibility.json'), JSON.stringify(audits));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
  const resources = await page.evaluate(() => {
    const w = window as any, scene = w.__voxelQA.current.scene, resources = new Set<any>();
    for (const name of ['dino-tool-footprint', 'dino-removed-sediment', 'dino-excavation-dust']) scene.getObjectByName(name).traverse((object: any) => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material: any) => resources.add(material));
    });
    w.__planningDisposal = { total: resources.size, disposed: 0 };
    resources.forEach(resource => resource.addEventListener('dispose', () => { w.__planningDisposal.disposed++; }));
    return resources.size;
  });
  expect(resources).toBeGreaterThan(3);
  await page.locator('#dinotab-notes').click();
  await expect.poll(async () => (await harness.glContexts(page, mountId)).filter(context => !context.lost).length).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).__planningDisposal.disposed)).toBe(resources);
  expect(await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene && !record.disposed).length)).toBe(0);
  await page.locator('#dinotab-dig').click(); await ready(page);
  expect((await footprintScene(page)).plan.focus).toBe(7);
  expect(await preservedState(page)).toEqual(afterDig);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  fs.writeFileSync(path.join(dir, 'action-motion-lifecycle-proof.json'), JSON.stringify({ reducedMotionSuppressedFeedback: true, ownedResourcesDisposed: resources, contexts: (await harness.glContexts(page)).map(context => ({ id: context.id, lost: context.lost })), retainedRendererDuringPreview: true, remountPreservedEvidence: true }));
});
