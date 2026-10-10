import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || path.resolve('test-results/dino-survey-pattern');
const dinoEnglish = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const sectionMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('section_'))) as Record<string, string>;
const planMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('plan_'))) as Record<string, string>;
const footprintMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => ['voxel_footprint_label', 'voxel_footprint_hint'].includes(key))) as Record<string, string>;
const previewMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('preview_'))) as Record<string,string>;
const findMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('find_'))) as Record<string,string>;
const terrainMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('terrain_'))) as Record<string,string>;
const checkpointMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('checkpoint_'))) as Record<string,string>;
const controlMessages = {voxel_controls_hint:dinoEnglish.voxel_controls_hint};
const cameraMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('camera_control_'))) as Record<string,string>;
const spatialMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('spatial_'))) as Record<string, string>;
const coverMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('cover_guides_'))) as Record<string, string>;
const patternMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('pattern_'))) as Record<string,string>;
const registeredMessages = { ...patternMessages, ...coverMessages, ...spatialMessages, ...sectionMessages, ...planMessages, ...footprintMessages, ...previewMessages, ...findMessages, ...terrainMessages, ...checkpointMessages, ...controlMessages, ...cameraMessages };
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
  expect(Object.keys(cameraMessages)).toHaveLength(16);
  expect(Object.keys(spatialMessages)).toHaveLength(26);
  expect(Object.keys(coverMessages)).toHaveLength(7);
  expect(Object.keys(patternMessages)).toHaveLength(8);
  const expected = process.env.DINO_PATTERN_EXPECTED_HASH;
  if (expected) expect(crypto.createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_dinolab.js')).digest('hex')).toBe(expected);
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
      if (key.startsWith('stem.dinolab.pattern_') || key.startsWith('stem.dinolab.cover_guides_') || key.startsWith('stem.dinolab.spatial_') || key.startsWith('stem.dinolab.camera_control_') || key === 'stem.dinolab.voxel_controls_hint' || key.startsWith('stem.dinolab.checkpoint_') || key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.find_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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
  await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => {
    const record = (window as any).__voxelQA.current;
    return !!record?.scene && !record.disposed && record.renderer.domElement === document.querySelector("#dino-voxel-canvas") && record.renders > 0 && !(window as any).__glLive('#dino-voxel-stage')?.lost;
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
async function visibleCanvas(page: Page) { await page.locator('#dino-voxel-canvas').scrollIntoViewIfNeeded(); await settle(page); }
async function openComparison(page: Page) { const panel = page.locator('#dino-spatial-details'); if (!await panel.evaluate((el: HTMLDetailsElement) => el.open)) await panel.locator('summary').click(); }
async function choose(page: Page, index: number) {
  const before = await state(page);
  await page.locator('#dino-survey-cell-' + index).click();
  await expect.poll(async () => (await state(page)).digFocus).toBe(index);
  expect(await state(page)).toEqual({ ...before, digFocus: index, digVoxel: { ...before.digVoxel, focus: index } });
}
async function command(page: Page, id: 'pin' | 'clear', key = 'Enter') {
  await openComparison(page); const before = await state(page);
  await page.locator('#dino-spatial-' + id).focus(); await page.locator('#dino-spatial-' + id).press(key);
  const expected = id === 'clear' ? null : { seed: before.digSeed, index: before.digFocus ?? before.digVoxel.focus };
  await expect.poll(async () => (await state(page)).digVoxelReference).toEqual(expected);
  expect(await state(page)).toEqual({ ...before, digVoxelReference: expected });
}
async function brush(page: Page, index: number) {
  await page.getByRole('button', { name: 'Brush', exact: true }).click();
  await page.locator('#dino-dig-cell-' + index).focus(); const before = await state(page);
  await page.locator('#dino-dig-cell-' + index).press('Enter');
  await expect.poll(async () => (await layers(page))[index]).toBe(before.digVoxel.depths[index] + 1);
  const after = await state(page); expect(after.digVoxel.depths.filter((n: number, i: number) => n !== before.digVoxel.depths[i])).toHaveLength(1);
}
async function marker(page: Page) {
  return page.evaluate(() => {
    const w = window as any, q = w.__voxelQA.current, m = q.scene.getObjectByName('dino-spatial-reference'), shared = q.scene.getObjectByName('dino-checkpoint-saved-surface');
    const g = new Set<string>(), a = new Set<string>(), t = new Set<string>();
    q.scene.traverse((o: any) => { if (o.geometry) g.add(o.geometry.uuid); for (const v of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) { a.add(v.uuid); for (const tex of Object.values(v)) if ((tex as any)?.isTexture) t.add((tex as any).uuid); } });
    return { visible: m.visible, data: { ...m.userData }, position: m.position.toArray(), uuid: m.uuid, sharedGeometry: m.geometry === shared.geometry, sharedMaterial: m.material === shared.material, renders: q.renders,
      pool: { scene: q.scene.uuid, renderer: w.__voxelQA.records.indexOf(q), geometries: [...g].sort(), materials: [...a].sort(), textures: [...t].sort() } };
  });
}
async function assertMarker(page: Page, index: number, removed: number) {
  await visibleCanvas(page);
  await expect.poll(async () => { const m = await marker(page); return { visible: m.visible, index: m.data.index, removed: m.data.removed }; }).toEqual({ visible: true, index, removed });
  const m = await marker(page); expect(m.sharedGeometry && m.sharedMaterial).toBe(true);
  expect(m.position).toEqual([(index % 6 - 2.5) * 1.08, (4 - removed) * .52 + .10, (Math.floor(index / 6) - 1.5) * 1.08]);
  expect(Object.keys(m.data).sort()).toEqual(['coord', 'index', 'remaining', 'removed', 'role', 'seed', 'status']); return m;
}
async function assertProfiles(page: Page, referenceIndex: number, selectedIndex: number) {
  await openComparison(page); const value = await state(page), depths = value.digVoxel.depths;
  for (const [kind, index] of [['reference', referenceIndex], ['selected', selectedIndex]] as const) {
    const profile = page.locator('[data-dig-spatial-profile="' + kind + '"]');
    await expect(profile).toHaveAttribute('data-dig-spatial-index', String(index));
    await expect(profile).toHaveAttribute('data-dig-spatial-removed', String(depths[index]));
    await expect(profile.locator('[data-dig-spatial-level]')).toHaveCount(4);
    await expect(profile.locator('[data-dig-spatial-removed-level="true"]')).toHaveCount(depths[index]);
    await expect(profile.locator('svg')).toHaveAccessibleName(new RegExp(depths[index] + ' of 4 model layers removed'));
  }
}
async function ownership(page: Page) {
  return page.evaluate(() => {
    const w = window as any, owned = new Set<any>(), borrowed = new Set<any>(), probe = new w.THREE.Sprite(), shared = probe.geometry; probe.material.dispose();
    w.__voxelQA.current.scene.traverse((o: any) => { if (o.geometry) { if (o.isSprite && o.geometry === shared) borrowed.add(o.geometry); else owned.add(o.geometry); } for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) { owned.add(m); for (const value of Object.values(m)) if ((value as any)?.isTexture) owned.add(value); } });
    w.__spatialDisposal = [...owned].map((r: any) => { const record = { uuid: r.uuid, count: 0 }; r.addEventListener('dispose', () => record.count++); return record; });
    return { owned: owned.size, borrowed: borrowed.size, targetTextureInOwned: w.__strokePreviewQA.targets.some((t: any) => owned.has(t.target.texture)) };
  });
}
async function warmFind(page: Page, index: number) {
  // Existing Find outlines are created lazily; include them before recording
  // the scene pool so comparison actions cannot hide an allocation regression.
  await choose(page, 19); await page.locator('[data-dig-view="find"]').click(); await visibleCanvas(page);
  await expect(page.locator('#dino-find-view-plate')).toHaveAttribute('data-dig-find-plate-ready', 'true');
  await page.locator('[data-dig-view="full"]').click(); await choose(page, index); await visibleCanvas(page);
}

async function patternOpen(page: Page) {
  const details = page.locator('#dino-survey-pattern-details'), before = await state(page);
  if (!await details.evaluate((el: HTMLDetailsElement) => el.open)) await details.locator('summary').click();
  expect(await state(page)).toEqual(before);
}
async function patternSnapshot(page: Page) {
  return page.locator('#dino-survey-pattern').evaluate(el => ({ worked: Number(el.getAttribute('data-dig-pattern-worked')), removed: Number(el.getAttribute('data-dig-pattern-removed')),
    bins: Array.from(el.querySelectorAll('[data-dig-pattern-bin]')).map(bin => ({ removed: Number(bin.getAttribute('data-dig-pattern-bin')), count: Number(bin.getAttribute('data-dig-pattern-count')), selected: bin.getAttribute('data-dig-pattern-selected') === 'true', height: Number(bin.querySelector('rect')!.getAttribute('height')), y: Number(bin.querySelector('rect')!.getAttribute('y')) })) }));
}
async function assertPattern(page: Page) {
  await patternOpen(page); const value = await state(page), depths = value.digVoxel?.depths || Array(24).fill(0), focus = value.digFocus ?? value.digVoxel?.focus ?? 0, bins = [0,0,0,0,0]; depths.forEach((n: number) => bins[n]++);
  const expected = { worked: 24 - bins[0], removed: depths.reduce((a: number,b: number) => a + b,0), bins: bins.map((count,removed) => ({ removed,count,selected: removed === depths[focus],height: count * 5,y: 152 - count * 5 })) };
  await expect.poll(() => patternSnapshot(page)).toEqual(expected);
  for (let index = 0; index < 24; index++) {
    const button = page.locator('#dino-survey-cell-' + index); await expect(button.locator('[data-dig-map-removed]')).toHaveAttribute('data-dig-map-removed',String(depths[index]));
    await expect(button.locator('[data-dig-map-layer]')).toHaveCount(4); await expect(button.locator('[data-dig-map-layer-removed="true"]')).toHaveCount(depths[index]);
    await expect(button).toHaveAccessibleName(new RegExp(depths[index] + ' of 4 layers removed'));
  }
  const label = await page.locator('#dino-survey-pattern svg').getAttribute('aria-label'); bins.forEach((count,removed) => expect(label).toContain(removed + ' layers removed: ' + count + ' coordinates'));
  const coord = String.fromCharCode(65 + focus % 6) + (Math.floor(focus / 6) + 1);
  await expect(page.locator('#dino-survey-pattern-selection')).toHaveText('Selected ' + coord + ': ' + depths[focus] + '/4 layers removed. Coordinates with this count: ' + bins[depths[focus]] + '.');
  expect((await page.locator('.dinolab-survey-map').getAttribute('aria-describedby'))!.split(' ')).toContain('dino-survey-depth-hint');
  return expected;
}

test('survey depth map and linked distribution follow native selection excavation Undo and new sites', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const voxel = emptyVoxel(); voxel.depths[19] = 4;
  await mount(page, { digVoxel: voxel, digRevealed: [19], digVoxelFindLook: 'outline', notebook: { microraptor: { question: 'Can equal totals hide different excavation patterns?' } } }); await warmFind(page,0);
  await expect(page.locator('#dino-survey-pattern-details')).not.toHaveAttribute('open'); const pool = (await marker(page)).pool; await assertPattern(page);
  await brush(page,7); await brush(page,13); await brush(page,7); const excavated = await assertPattern(page); expect(excavated.worked).toBe(3); expect(excavated.removed).toBe(7);
  await page.locator('#dino-field-survey').scrollIntoViewIfNeeded(); await settle(page); await page.locator('#dino-field-survey').screenshot({ path: path.join(dir,'survey-depth-map-desktop.png') });
  await page.locator('#dino-survey-cell-7').focus(); const beforeArrow = await state(page); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await state(page)).digFocus).toBe(8); await expect(page.locator('#dino-survey-cell-8')).toBeFocused();
  expect(await state(page)).toEqual({ ...beforeArrow, digFocus: 8, digVoxel: { ...beforeArrow.digVoxel, focus: 8 } });
  const beforeSpace = await state(page); await page.keyboard.press('Space'); expect(await state(page)).toEqual(beforeSpace); await assertPattern(page);
  await choose(page,13); await assertPattern(page); await page.locator('[data-dig-view="section"]').click(); await assertPattern(page);
  const inSection = await patternSnapshot(page); expect(inSection.bins.map(b => b.count)).toEqual(excavated.bins.map(b => b.count));
  await choose(page,19); await page.locator('[data-dig-view="find"]').click(); await expect(page.locator('#dino-survey-pattern')).toHaveCount(0);
  await page.locator('[data-dig-view="full"]').click(); await choose(page,7); await assertPattern(page);
  await page.getByRole('button',{ name:'Undo last excavation',exact:true }).click(); await expect.poll(async () => (await layers(page))[7]).toBe(1);
  const undone = await assertPattern(page); expect(undone.bins.map(b => b.count)).toEqual([21,2,0,0,1]);
  expect((await marker(page)).pool).toEqual(pool);
  await page.getByRole('button',{ name:'New dig',exact:true }).click(); await expect.poll(async () => (await state(page)).digSeed).toBe(2);
  const fresh = await assertPattern(page); expect(fresh.bins.map(b => b.count)).toEqual([24,0,0,0,0]); expect(fresh.removed).toBe(0);
  fs.writeFileSync(path.join(dir,'survey-pattern-behavior.json'),JSON.stringify({ nativeMapArrowsAndSpaceSelectOnly:true,chartDisclosureDoesNotWriteState:true,all24DepthTilesMatchCurrentRecords:true,all96DepthBlocksOrdered:true,excavated,undone,fresh,sectionChartRetainsAll24Coordinates:true,findHidesSurvey:true,unchangedScenePool:pool },null,2));
});

test('equal removal totals show different site patterns and remain accessible across phone themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' }); const concentrated = emptyVoxel();
  // Seed 1 protects the fossil at F1 after three removals. These six
  // coordinates can actually reach four, preserving a valid 24-layer sample.
  concentrated.depths = Array.from({length:24},(_,i)=>[0,1,2,3,4,6].includes(i)?4:0);
  await mount(page,{digVoxel:concentrated}); const a = await assertPattern(page); expect(a.removed).toBe(24); expect(a.worked).toBe(6); expect(a.bins.map(b=>b.count)).toEqual([18,0,0,0,6]);
  await page.locator('#dino-survey-pattern').screenshot({path:path.join(dir,'pattern-concentrated-24.png')}); await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const distributed = emptyVoxel(); distributed.depths = Array(24).fill(1); distributed.focus = 7;
  await mount(page,{digVoxel:distributed,digFocus:7}); const b = await assertPattern(page); expect(b.removed).toBe(24); expect(b.worked).toBe(24); expect(b.bins.map(v=>v.count)).toEqual([0,24,0,0,0]);
  await page.locator('#dino-survey-pattern').screenshot({path:path.join(dir,'pattern-distributed-24.png')});
  const saved = await state(page), pool = (await marker(page)).pool, audits:any[]=[];
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  for(const width of [320,390]) for(const name of ['theme-default','theme-dark','theme-contrast']) {
    await page.setViewportSize({width,height:844}); await theme(page,name); await patternOpen(page);
    const boxes = await page.locator('#dino-field-survey,#dino-survey-pattern,.dinolab-survey-map button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,left:r.left,right:r.right,width:r.width,height:r.height};}));
    for(const box of boxes){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);if(box.tag==='BUTTON'){expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(24);}}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const violations = await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('#dinopanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}));});
    expect(violations).toEqual([]);audits.push({width,theme:name,violations,boxes});
    await page.setViewportSize({width,height:2400});await page.locator('#dino-field-survey').scrollIntoViewIfNeeded();await settle(page);await page.locator('#dino-field-survey').screenshot({path:path.join(dir,'survey-depth-map-'+width+'-'+name+'.png')});await page.setViewportSize({width,height:844});
    expect(await state(page)).toEqual(saved);expect((await marker(page)).pool).toEqual(pool);
  }
  await visibleCanvas(page);await page.waitForTimeout(180);const idle=(await marker(page)).renders;await page.waitForTimeout(240);const idleDraws=(await marker(page)).renders-idle;expect(idleDraws).toBeLessThanOrEqual(1);
  const resources=await ownership(page);expect(resources).toEqual({owned:pool.geometries.length+pool.materials.length+pool.textures.length-1,borrowed:1,targetTextureInOwned:false});
  await harness.unmount(page);await expect.poll(()=>page.evaluate(()=>(window as any).__spatialDisposal.every((r:any)=>r.count===1))).toBe(true);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const disposal=await page.evaluate(()=>(window as any).__spatialDisposal);
  fs.writeFileSync(path.join(dir,'survey-pattern-accessibility.json'),JSON.stringify(audits,null,2));
  fs.writeFileSync(path.join(dir,'survey-pattern-lifecycle.json'),JSON.stringify({concentrated:a,distributed:b,equalLayerTotalsDifferentSpatialSpread:true,resources,disposal,idleDraws,noNewSceneResources:true,noStateWritesForChartOrThemes:true},null,2));
});
