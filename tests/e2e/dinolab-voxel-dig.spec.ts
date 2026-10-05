import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_VOXEL_ENHANCEMENT_REPORT_DIR || process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-voxel-dig-enhancement';
const previewMessages = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab).filter(([key]) => key.startsWith('preview_') || key.startsWith('terrain_') || key.startsWith('checkpoint_') || key.startsWith('camera_control_') || key === 'voxel_controls_hint')) as Record<string,string>;
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

test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
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
  // Keep diagnostics bounded: no scene dumps, videos, or large traces.
  fs.writeFileSync(path.join(dir, info.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-runtime.json'), JSON.stringify(runtime));
  await harness.destroy(page);
  expect.soft(runtime).toEqual({ pageErrors: [], errors: [] });
  const translations=await page.evaluate(()=>(window as any).__previewRegistryQA);expect.soft(translations?.registered).toBe(Object.keys(previewMessages).length);expect.soft(translations?.missing).toEqual([]);
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
    w.__previewRegistryQA = { registered: Object.keys(messages).length, missing: [] };
    w.__ctx.t = function(key:string,fallback:string) {
      if(key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.checkpoint_') || key.startsWith('stem.dinolab.camera_control_') || key === 'stem.dinolab.voxel_controls_hint') { const value=messages[key.slice('stem.dinolab.'.length)]; if(typeof value==='string')return value; w.__previewRegistryQA.missing.push(key);throw new Error('Missing preview phrase '+key); }
      return previous(key,fallback);
    };
    w.__rerender();
  },previewMessages);
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

test('voxel excavation renders real 3D, raycasts trusted clicks, and separates camera motion from digging', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  await assertLiveScene(page);
  await page.getByRole('button', { name: 'Brush', exact: true }).click();
  const canvas = page.locator('#dino-voxel-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const target = await projectedTarget(page); expect(target).not.toBeNull();
  const box = (await canvas.boundingBox())!;
  const beforeVoxels = await sedimentCount(page);
  expect(beforeVoxels).toBeGreaterThan(24);
  const beforeRaycasts = await page.evaluate(() => (window as any).__voxelQA.raycasts);
  await page.mouse.click(box.x + (target!.x + 1) / 2 * box.width, box.y + (1 - target!.y) / 2 * box.height);
  await expect.poll(async () => (await layers(page))[target!.column]).toBe(1);
  expect((await layers(page)).reduce((sum, depth) => sum + depth, 0)).toBe(1);
  await expect.poll(() => sedimentCount(page)).toBe(beforeVoxels - 1);
  const pointerRay = await page.evaluate(before => ({
    count: (window as any).__voxelQA.raycasts,
    events: (window as any).__voxelQA.rayEvents.filter((event: any) => event.number > before),
  }), beforeRaycasts);
  expect(pointerRay.count).toBeGreaterThan(beforeRaycasts);
  expect(pointerRay.events.some((event: any) => event.columns.some((hit: any) => hit.column === target!.column && hit.role === 'sediment-voxel'))).toBe(true);
  await page.getByRole('button', { name: 'Undo last excavation', exact: true }).click();
  expect(await layers(page)).toEqual(Array(24).fill(0));
  await expect.poll(() => sedimentCount(page)).toBe(beforeVoxels);

  const before = await camera(page), excavation = (await state(page)).digVoxel;
  await canvas.scrollIntoViewIfNeeded();
  const drag = (await canvas.boundingBox())!;
  await page.mouse.move(drag.x + drag.width * .5, drag.y + drag.height * .5);
  await page.mouse.down();
  await page.mouse.move(drag.x + drag.width * .65, drag.y + drag.height * .57, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => JSON.stringify((await camera(page)).position)).not.toBe(JSON.stringify(before.position));
  expect((await state(page)).digVoxel.depths).toEqual(excavation.depths);
  const zoomBefore = (await camera(page)).distance;
  await page.mouse.wheel(0, -160);
  await expect.poll(async () => (await camera(page)).distance).not.toBe(zoomBefore);
  expect((await state(page)).digVoxel.depths).toEqual(excavation.depths);
  await page.getByRole('button', { name: 'Camera: Top', exact: true }).click(); await settle(page);
  expect((await state(page)).digVoxelCamera).toBeTruthy();
  expect((await camera(page)).position).not.toEqual(before.position);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click(); await settle(page);
  await assertLiveScene(page);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-desktop.png') });
});

test('layer progress survives saved-state reload and keeps the original catalog notebook exercise', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 920 });
  await mount(page, { notebook: { microraptor: { question: 'An independent notebook question survives excavation.' } } });
  const cell = page.locator('[data-dig-voxel-cell="0"]');
  await cell.focus(); await cell.press('Enter');
  await expect.poll(async () => (await layers(page))[0]).toBe(1);
  const saved = await state(page);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, saved);
  expect((await state(page)).digVoxel.depths).toEqual(saved.digVoxel.depths);
  expect((await state(page)).digVoxel.contacts).toEqual(saved.digVoxel.contacts);
  expect((await state(page)).digRevealed || []).toEqual(saved.digRevealed || []);
  await page.getByRole('button', { name: 'Use a prepared sample', exact: true }).click();
  await expect(page.locator('[data-dig-clue]')).toHaveCount(6);
  await settle(page);
  await assertLiveScene(page);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-excavated-desktop.png') });
  const clues = await page.locator('[data-dig-clue]').evaluateAll(inputs => inputs.map(input => ({
    id: input.getAttribute('data-dig-clue')!, value: input.parentElement!.textContent!.split(': ').slice(1).join(': '),
  })));
  const candidates = await page.locator('[data-dig-candidate]').evaluateAll(cards => cards.map(card => ({
    id: card.getAttribute('data-dig-candidate')!, values: [...card.querySelectorAll('dd')].map(dd => dd.textContent),
  })));
  const matches = candidates.filter(candidate => candidate.values.every((value, i) => value === clues[i].value));
  expect(matches).toHaveLength(1);
  for (const clue of clues) await page.locator('[data-dig-clue="' + clue.id + '"]').check();
  await page.locator('[data-dig-candidate="' + matches[0].id + '"] button').click();
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await expect(page.locator('#dino-dig-feedback')).toContainText('identify one catalog candidate');
  await page.getByRole('button', { name: 'Explain in my notebook', exact: true }).click();
  await expect(page.locator('#dino-note-inference')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Excavation exercise context' })).toContainText(clues[0].value);
  const explanation = 'The catalog clues identify this candidate. A real fossil would require diagnostic anatomy and geological context.';
  await page.locator('#dino-note-inference').fill(explanation);
  expect((await state(page)).notebook.microraptor.question).toBe('An independent notebook question survives excavation.');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading;
  const file = path.join(dir, 'voxel-excavation-notebook.txt'); await download.saveAs(file);
  const exported = fs.readFileSync(file, 'utf8');
  expect(exported).toContain(explanation); expect(exported).toContain('Cited catalog clues:');
  expect(exported).toContain('An independent notebook question survives excavation.');
});

test('trowel sweeps stop at bone contact, persisted contact resumes, and brush exposure protects the bone', async ({ page }) => {
  // Seed 1 retains the existing site layout. E4 (index 22) has burial depth 2;
  // the model's separate burial RNG never changes the original bone-cell RNG.
  await page.setViewportSize({ width: 1180, height: 920 });
  await mount(page);
  await page.getByRole('button', { name: 'Trowel', exact: true }).click();
  expect((await state(page)).digVoxel.tool).toBe('trowel');
  const cell = page.locator('[data-dig-voxel-cell="22"]');
  await cell.focus();
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  const footprint = Array(24).fill(0);
  for (const index of [15, 16, 17, 21, 22, 23]) footprint[index] = 1;
  expect(await layers(page)).toEqual(footprint);
  expect((await state(page)).digVoxel.contacts[22]).toBe(false);
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await state(page)).digVoxel.contacts[22]).toBe(true);
  expect((await layers(page))[22]).toBe(1);
  expect((await state(page)).digRevealed || []).not.toContain(22);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-contact-22').visible)).toBe(true);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-bone-contact.png') });

  const saved = await state(page);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, saved);
  expect((await state(page)).digVoxel.contacts[22]).toBe(true);
  expect((await layers(page))[22]).toBe(1);
  expect((await state(page)).digRevealed || []).not.toContain(22);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(false);
  await page.getByRole('button', { name: 'Brush', exact: true }).click();
  await page.locator('[data-dig-voxel-cell="22"]').focus();
  await page.getByRole('button', { name: 'Excavate selected column', exact: true }).click();
  await expect.poll(async () => (await layers(page))[22]).toBe(2);
  await expect.poll(async () => (await state(page)).digRevealed || []).toContain(22);
  await expect.poll(() => page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-fragment-22').visible)).toBe(true);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.scene.getObjectByName('dino-fossil-contact-22').visible)).toBe(false);
  await page.locator('[data-dig-voxel-cell="22"]').focus();
  await page.locator('[data-dig-voxel-cell="22"]').press('Enter');
  expect((await layers(page))[22]).toBe(2);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-bone-exposed.png') });
});

test('voxel dig offers phone keyboard excavation and accessible theme controls', async ({ page }) => {
  await mount(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noHorizontalOverflow(page);
    const cell = page.locator('[data-dig-voxel-cell="' + (width === 320 ? 1 : 2) + '"]');
    await cell.focus(); await cell.press('Space');
    await expect(cell).toBeFocused();
    const index = width === 320 ? 1 : 2;
    await expect.poll(async () => (await layers(page))[index]).toBe(1);
    await page.getByRole('button', { name: 'Excavate selected column', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await layers(page))[index]).toBe(2);
    const presets: any[] = [];
    for (const preset of ['Oblique', 'Top', 'Side']) {
      await page.getByRole('button', { name: 'Camera: ' + preset, exact: true }).click();
      await settle(page);
      const framing = await voxelFraming(page);
      presets.push({ preset, ...framing });
      fs.writeFileSync(path.join(dir, 'voxel-phone-' + width + '-framing.json'), JSON.stringify(presets));
      expect(framing.invalid).toBe(0);
      expect(framing.maxScreen, preset + ': complete sediment volume should fit the phone camera').toBeLessThanOrEqual(1.02);
      expect(framing.maxDepth).toBeLessThanOrEqual(1.02);
    }
    await assertLiveScene(page);
    await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-phone-' + width + '.png') });
  }
  await page.setViewportSize({ width: 1180, height: 920 });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await theme(page, name);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#dinopanel'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      });
      return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
    });
    audits.push({ theme: name, tab: 'dig', violations });
    await noHorizontalOverflow(page);
  }
  fs.writeFileSync(path.join(dir, 'voxel-accessibility.json'), JSON.stringify(audits));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
});

test('voxel scene releases its GPU context and renderer on tab changes and remount', async ({ page }) => {
  await mount(page);
  const mountId = await harness.currentMount(page);
  const before = await harness.glContexts(page, mountId);
  expect(before.filter(context => !context.lost)).toHaveLength(1);
  await page.locator('#dinotab-notes').click();
  await expect.poll(async () => (await harness.glContexts(page, mountId)).filter(context => !context.lost).length).toBe(0);
  expect(await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene && !record.disposed).length)).toBe(0);
  const renders = await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene).map((record: any) => record.renders));
  await settle(page);
  expect(await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene).map((record: any) => record.renders))).toEqual(renders);
  await page.locator('#dinotab-dig').click(); await ready(page); await assertLiveScene(page);
  expect((await harness.glContexts(page, mountId)).filter(context => !context.lost)).toHaveLength(1);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__voxelQA.records.filter((record: any) => record.scene && !record.disposed).length)).toBe(0);
  fs.writeFileSync(path.join(dir, 'voxel-gpu-lifecycle.json'), JSON.stringify((await harness.glContexts(page)).map(context => ({ id: context.id, mount: context.mount, lost: context.lost, lostBy: context.lostBy }))));
});

test('lost voxel graphics context retries with a fresh canvas and preserves excavation state', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 920 });
  await mount(page);
  const cell = page.locator('[data-dig-voxel-cell="0"]');
  await cell.focus(); await cell.press('Enter');
  await expect.poll(async () => (await layers(page))[0]).toBe(1);
  const saved = (await state(page)).digVoxel;
  const oldCanvas = await page.locator('#dino-voxel-canvas').elementHandle();
  expect(oldCanvas).not.toBeNull();
  const supportsLoss = await page.evaluate(() => {
    const record = (window as any).__voxelQA.current;
    (window as any).__voxelQA.oldRenderer = record.renderer;
    const extension = record.renderer.getContext().getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(supportsLoss, 'Chromium should supply the WebGL context-loss extension').toBe(true);
  const retry = page.getByRole('button', { name: 'Retry 3D view', exact: true });
  await expect(retry).toBeVisible();
  expect((await state(page)).digVoxel).toEqual(saved);
  await retry.focus(); await retry.press('Enter');
  await ready(page);
  await expect.poll(() => oldCanvas!.evaluate(canvas => canvas.isConnected)).toBe(false);
  expect(await page.evaluate(() => (window as any).__voxelQA.current.renderer === (window as any).__voxelQA.oldRenderer)).toBe(false);
  expect((await state(page)).digVoxel).toEqual(saved);
  await assertLiveScene(page);
  const contexts = await harness.glContexts(page);
  expect(contexts.filter(context => !context.lost)).toHaveLength(1);
  expect(contexts.filter(context => context.lost).length).toBeGreaterThanOrEqual(1);
  await page.locator('#dino-voxel-stage').screenshot({ path: path.join(dir, 'voxel-context-recovered.png') });
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  fs.writeFileSync(path.join(dir, 'voxel-context-recovery.json'), JSON.stringify({
    freshCanvas: true, layersRetained: saved.depths,
    contexts: (await harness.glContexts(page)).map(context => ({ id: context.id, lost: context.lost })),
  }));
});
