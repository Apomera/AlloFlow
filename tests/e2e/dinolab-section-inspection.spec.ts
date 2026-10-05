import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_SECTION_ENHANCEMENT_REPORT_DIR || process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-section-enhancement';
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const terrainMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('terrain_'))) as Record<string,string>;
const registeredMessages = { ...sectionMessages, ...terrainMessages };
const probes = `
window.__voxelQA = { records: [], current: null, raycasts: 0, lastRayColumns: [], rayEvents: [] };
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
      if (key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.terrain_')) {
        const name = key.slice('stem.dinolab.'.length), value = messages[name];
        if (typeof value === 'string') {
          if (!w.__sectionRegistryQA.resolvedKeys.includes(name)) w.__sectionRegistryQA.resolvedKeys.push(name);
          return value;
        }
        w.__sectionRegistryQA.missing.push(key);
        throw new Error('Missing registered Dino section phrase: ' + key);
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

test('row inspection filters actual voxels and trusted picking while preserving excavation evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page);
  await assertLiveScene(page);
  const initial = await sectionScene(page);
  expect(initial.count).toBe(96);
  const observations = await observationState(page);
  await mode(page, 'section');
  await row(page, 2);
  const section = await sectionScene(page);
  expect(section.count).toBe(24);
  expect([...new Set(section.columns)].sort((a, b) => a - b)).toEqual([12, 13, 14, 15, 16, 17]);
  expect([...new Set(section.layers)].sort()).toEqual([0, 1, 2, 3]);
  expect(section.scene).toBe(initial.scene); expect(section.batch).toBe(initial.batch); expect(section.renderer).toBe(initial.renderer);
  await expect(page.getByRole('button', { name: 'Brush', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Trowel', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Camera: Oblique', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset section camera', exact: true })).toBeVisible();
  expect(await observationState(page)).toEqual(observations);
  expect(await page.evaluate(() => {
    const scene = (window as any).__voxelQA.current.scene;
    return Array.from({ length: 24 }, (_, index) => scene.getObjectByName('dino-fossil-fragment-' + index).visible).some(Boolean);
  })).toBe(false);
  await expect(page.locator('[data-dig-observed-find]')).toHaveCount(0);

  const canvas = page.locator('#dino-voxel-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const target = await projectedTarget(page); expect(target).not.toBeNull();
  expect(Math.floor(target!.column / 6)).toBe(2);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + (target!.x + 1) / 2 * box.width, box.y + (1 - target!.y) / 2 * box.height);
  await expect.poll(async () => (await state(page)).digFocus).toBe(target!.column);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(new RegExp('^' + coord(target!.column) + ':'));
  expect(await observationState(page)).toEqual(observations);
  await canvas.focus(); await canvas.press('Enter');
  expect(await observationState(page)).toEqual(observations);
  await page.locator('#dino-dig-cell-15').focus();
  await page.locator('#dino-dig-cell-15').press('Space');
  await expect.poll(async () => (await state(page)).digFocus).toBe(15);
  expect(await observationState(page)).toEqual(observations);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-row-three-desktop.png') });
  await page.locator('.dinolab-section-observatory').screenshot({ path: path.join(dir, 'section-observatory-desktop.png') });
  await page.getByRole('button', { name: 'Return to excavation', exact: true }).click();
  await expect.poll(async () => (await sectionScene(page)).view).toBe('full');
  expect((await sectionScene(page)).count).toBe(96);
  expect(await observationState(page)).toEqual(observations);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-full-site-desktop.png') });
  fs.writeFileSync(path.join(dir, 'section-render-proof.json'), JSON.stringify({ initial, section, retainedScene: true, immutableEvidence: true }));
});

test('section navigation links plan and profile without excavating or leaking hidden findings', async ({ page }) => {
  const savedFullPose = { yaw: .74, pitch: .88, zoom: 1.12 };
  await mount(page, { digVoxelPose: savedFullPose });
  const initialCamera = await camera(page);
  const switchTiming = await page.evaluate(() => {
    const canvas = document.querySelector('#dino-voxel-canvas')!;
    const start = performance.now();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    (document.querySelector('[data-dig-view="section"]') as HTMLButtonElement).click();
    return performance.now() - start;
  });
  expect(switchTiming).toBeLessThan(160);
  await expect.poll(async () => (await sectionScene(page)).view).toBe('section');
  await expect.poll(async () => (await state(page)).digVoxelPose?.zoom).toBeCloseTo(savedFullPose.zoom * 1.08, 6);
  await mode(page, 'full'); await settle(page);
  const restoredCamera = await camera(page);
  for (let i = 0; i < initialCamera.quaternion.length; i++) expect(restoredCamera.quaternion[i]).toBeCloseTo(initialCamera.quaternion[i], 5);
  expect(restoredCamera.distance).toBeLessThan(initialCamera.distance);
  const resetTiming = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector('#dino-voxel-canvas')!.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    const reset = Array.from(document.querySelectorAll<HTMLButtonElement>('.dinolab-voxel-toolbar button')).find(button => button.textContent === 'Reset camera')!;
    reset.click();
    return performance.now() - start;
  });
  expect(resetTiming).toBeLessThan(160);
  await expect.poll(async () => (await state(page)).digVoxelPose).toBeNull();
  await page.waitForTimeout(220); // The discarded 160 ms wheel save must not overwrite reset.
  expect((await state(page)).digVoxelPose).toBeNull();
  await mode(page, 'section');
  await row(page, 1);
  await expect(page.locator('#dino-section-plan')).toHaveAttribute('role', 'img');
  await expect(page.locator('#dino-section-plan')).toHaveAccessibleName(/plan/i);
  await expect(page.locator('[data-dig-section-column]')).toHaveCount(6);
  const observations = await observationState(page), initial = await sectionScene(page);
  const column = page.locator('[data-dig-section-column="8"]');
  await column.focus(); await column.press('Space');
  await expect.poll(async () => (await state(page)).digFocus).toBe(8);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^C2:/);
  expect((await state(page)).digVoxel.focus).toBe(8);
  expect(await observationState(page)).toEqual(observations);
  await page.locator('#dino-dig-cell-8').focus();
  await page.locator('#dino-dig-cell-8').press('ArrowRight');
  await expect(page.locator('#dino-dig-cell-9')).toBeFocused();
  await page.locator('#dino-dig-cell-9').press('Enter');
  await expect.poll(async () => (await state(page)).digFocus).toBe(9);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^D2:/);
  expect(await observationState(page)).toEqual(observations);
  await expect(page.locator('[data-dig-observed-find]')).toHaveCount(0);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/Covered.*no find observed/i);
  const publicText = await page.locator('.dinolab-section-observatory').innerText();
  expect(publicText).not.toMatch(/burial depth|vertebra|rib fragment|long bone fragment/i);
  expect(await page.locator('#dino-section-profile').getAttribute('aria-label')).not.toMatch(/burial depth|vertebra|rib fragment|long bone fragment/i);
  const retained = await sectionScene(page);
  expect(retained.scene).toBe(initial.scene); expect(retained.renderer).toBe(initial.renderer);
  await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();
  const fullPose = (await state(page)).digVoxelPose;
  const canvas = (await page.locator('#dino-voxel-canvas').boundingBox())!;
  await page.mouse.move(canvas.x + canvas.width * .5, canvas.y + canvas.height * .5);
  await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width * .63, canvas.y + canvas.height * .54, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => !!(await state(page)).digVoxelSectionPose).toBe(true);
  expect((await state(page)).digVoxelPose).toEqual(fullPose);
  expect(await observationState(page)).toEqual(observations);
  fs.writeFileSync(path.join(dir, 'section-selection-proof.json'), JSON.stringify({ selected: 9, immutableEvidence: true, retainedScene: true, separateCameraPose: true, pendingWheelSwitchMs: switchTiming, pendingWheelResetMs: resetTiming, fullZoomPreserved: true, resetWins: true }));
});

test('linked section observations follow brush contact and undo without revealing buried fossil metadata', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const voxel = emptyVoxel(); voxel.depths[22] = 1; voxel.contacts[22] = true; voxel.focus = 22;
  await mount(page, { digFocus: 22, digVoxel: voxel, digVoxelView: 'section' });
  await expect.poll(async () => (await sectionScene(page)).view).toBe('section');
  await row(page, 3);
  await page.locator('[data-dig-section-column="22"]').click();
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^E4:.*contact/i);
  await expect(page.locator('[data-dig-observed-find="22"]')).toContainText('E4 · Recorded contact');
  await expect(page.locator('[data-dig-observed-find="22"]')).toHaveAttribute('data-dig-observed-status', 'contact');
  await expect(page.locator('[data-dig-observed-find]')).toHaveCount(1);
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0);
  const contactText = await page.locator('[data-dig-observed-find="22"]').innerText();
  expect(contactText).not.toMatch(/burial depth|vertebra|rib fragment|long bone fragment|species|taxon/i);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  const initial = await sectionScene(page), before = await observationState(page);
  await mode(page, 'full');
  await page.getByRole('button', { name: 'Brush', exact: true }).click();
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(2);
  await mode(page, 'section');
  await row(page, 3);
  await expect(page.locator('[data-dig-observed-find="22"]')).toBeVisible();
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^E4:.*exposed/i);
  await expect(page.locator('[data-dig-observed-find="22"]')).toContainText('E4 · Exposed fragment');
  await expect(page.locator('[data-dig-observed-find="22"]')).toHaveAttribute('data-dig-observed-status', 'exposed');
  expect((await sectionScene(page)).count).toBe(22);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(true);
  await expect(page.locator('[data-dig-clue]')).toHaveCount(1);
  await row(page, 2);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  await expect(page.locator('[data-dig-observed-find="22"]')).toContainText('E4 · Exposed fragment');
  await row(page, 3);
  await page.locator('[data-dig-section-column="22"]').click();
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-exposed-e4-desktop.png') });
  await page.locator('.dinolab-section-observatory').screenshot({ path: path.join(dir, 'section-exposed-e4-observatory.png') });
  await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(1);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^E4:.*contact/i);
  await expect(page.locator('[data-dig-observed-find="22"]')).toContainText('E4 · Recorded contact');
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0);
  expect(await observationState(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  expect((await sectionScene(page)).scene).toBe(initial.scene);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-contact-after-undo.png') });
  fs.writeFileSync(path.join(dir, 'section-contact-undo-proof.json'), JSON.stringify({ coordinate: 'E4', contactRecord: true, contactGeometryOnly: true, brushDepth: 2, exposedRecord: true, hiddenOutsideSection: true, undoDepth: 1, cluesAfterUndo: 0, retainedScene: true }));

  // Preview real exploration through the same public controls: two dry columns,
  // the prepared sample's B4/D4 fragments, E4 contact, and an unknown F4 column.
  await mode(page, 'full');
  await page.getByRole('button', { name: 'Use a prepared sample', exact: true }).click();
  for (const index of [18, 20]) {
    for (let step = 0; step < 4; step++) await page.locator('#dino-dig-cell-' + index).click();
    await expect.poll(async () => (await layers(page))[index]).toBe(4);
  }
  await page.locator('#dino-dig-cell-23').click();
  await expect.poll(async () => (await layers(page))[23]).toBe(1);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-explored-full-desktop.png') });
  await mode(page, 'section'); await row(page, 3);
  await page.locator('[data-dig-section-column="21"]').click();
  await expect(page.locator('[data-dig-observed-find="19"]')).toHaveAttribute('data-dig-observed-status', 'exposed');
  await expect(page.locator('[data-dig-observed-find="21"]')).toHaveAttribute('data-dig-observed-status', 'exposed');
  await expect(page.locator('[data-dig-observed-find="22"]')).toHaveAttribute('data-dig-observed-status', 'contact');
  await expect(page.locator('[data-dig-observed-find="23"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-23').visible)).toBe(false);
  expect((await page.locator('[data-dig-observed-find]').allTextContents()).join(' ')).not.toMatch(/burial depth|vertebra|rib fragment|long bone fragment|species|taxon/i);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-explored-row-desktop.png') });
  await page.locator('.dinolab-section-observatory').screenshot({ path: path.join(dir, 'section-explored-observatory-desktop.png') });
  await page.setViewportSize({ width: 320, height: 844 }); await noHorizontalOverflow(page);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-explored-row-phone-320.png') });
});

test('section profile and plan reflow across phone themes and release their retained GPU scene', async ({ page }) => {
  await mount(page);
  await mode(page, 'section'); await row(page, 2);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [], initial = await sectionScene(page), mountId = await harness.currentMount(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
      await theme(page, name);
      await noHorizontalOverflow(page);
      for (const selector of ['#dino-section-profile', '#dino-section-plan', '#dino-section-row']) {
        const box = await page.locator(selector).boundingBox(); expect(box, selector).not.toBeNull();
        expect(box!.x, selector).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, selector).toBeLessThanOrEqual(width);
      }
      const button = page.locator('[data-dig-section-column="14"]');
      await button.focus(); await button.press('Enter');
      await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^C3:/);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#dinopanel'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
      });
      audits.push({ width, theme: name, violations });
      const retained = await sectionScene(page);
      expect(retained.scene).toBe(initial.scene); expect(retained.renderer).toBe(initial.renderer);
    }
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-phone-' + width + '.png') });
    await page.locator('.dinolab-section-observatory').screenshot({ path: path.join(dir, 'section-observatory-phone-' + width + '.png') });
    if (width === 320) {
      await mode(page, 'full');
      await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'section-full-site-phone-320.png') });
      await mode(page, 'section');
    }
  }
  fs.writeFileSync(path.join(dir, 'section-accessibility.json'), JSON.stringify(audits));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
  expect((await harness.glContexts(page, mountId)).filter(context => !context.lost)).toHaveLength(1);
  await page.locator('#dinotab-notes').click();
  await expect.poll(async () => (await harness.glContexts(page, mountId)).filter(context => !context.lost).length).toBe(0);
  expect(await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene && !record.disposed).length)).toBe(0);
  await page.locator('#dinotab-dig').click(); await ready(page);
  await expect(page.locator('#dino-section-profile')).toHaveAccessibleName(/^C3:/);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  fs.writeFileSync(path.join(dir, 'section-gpu-lifecycle.json'), JSON.stringify((await harness.glContexts(page)).map(context => ({ id: context.id, lost: context.lost }))));
});
