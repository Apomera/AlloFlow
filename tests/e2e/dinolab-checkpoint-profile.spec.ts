import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Load the actual shared STEM host before the harness fills registry gaps.
const runtimeScripts = (process.env.DINO_VOXEL_RUNTIME_SCRIPTS || '').split(',').filter(Boolean);
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || path.resolve('test-results/dino-checkpoint-profile');
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
const locatorMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('locator_'))) as Record<string,string>;
const profileMessages = Object.fromEntries(Object.entries(dinoEnglish).filter(([key]) => key.startsWith('change_profile_'))) as Record<string,string>;
const registeredMessages = { ...profileMessages, ...locatorMessages, ...patternMessages, ...coverMessages, ...spatialMessages, ...sectionMessages, ...planMessages, ...footprintMessages, ...previewMessages, ...findMessages, ...terrainMessages, ...checkpointMessages, ...controlMessages, ...cameraMessages };
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
  expect(Object.keys(locatorMessages)).toHaveLength(4);
  expect(Object.keys(profileMessages)).toHaveLength(17);
  const expected = process.env.DINO_PROFILE_EXPECTED_HASH;
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
      if (key.startsWith('stem.dinolab.change_profile_') || key.startsWith('stem.dinolab.locator_') || key.startsWith('stem.dinolab.pattern_') || key.startsWith('stem.dinolab.cover_guides_') || key.startsWith('stem.dinolab.spatial_') || key.startsWith('stem.dinolab.camera_control_') || key === 'stem.dinolab.voxel_controls_hint' || key.startsWith('stem.dinolab.checkpoint_') || key.startsWith('stem.dinolab.terrain_') || key.startsWith('stem.dinolab.preview_') || key.startsWith('stem.dinolab.find_') || key.startsWith('stem.dinolab.section_') || key.startsWith('stem.dinolab.plan_') || ['stem.dinolab.voxel_footprint_label', 'stem.dinolab.voxel_footprint_hint'].includes(key)) {
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

async function checkpointOpen(page: Page) {
  const details=page.locator('#dino-checkpoint-details'),before=await state(page);
  if(!await details.evaluate((el:HTMLDetailsElement)=>el.open))await details.locator(':scope > summary').click();
  expect(await state(page)).toEqual(before);
}
async function checkpointSave(page: Page) {
  await checkpointOpen(page);const before=await state(page);await page.locator('#dino-checkpoint-save').click();
  await expect(page.locator('#dino-checkpoint-panel')).toHaveAttribute('data-dig-checkpoint-kind','ready');
  const after=await state(page);expect(after.digVoxelCheckpoint.version).toBe(1);expect(after.digVoxelCheckpoint.seed).toBe(before.digSeed);expect(after.digVoxelCheckpoint.columns).toHaveLength(24);
  expect(after).toEqual({...before,digVoxelCheckpoint:after.digVoxelCheckpoint,digVoxelCheckpointNotes:null});
}
async function profileOpen(page: Page) {
  await checkpointOpen(page);const details=page.locator('#dino-checkpoint-profile-details'),before=await state(page);
  if(!await details.evaluate((el:HTMLDetailsElement)=>el.open))await details.locator(':scope > summary').click();
  expect(await state(page)).toEqual(before);
}
async function profileSnapshot(page: Page) {
  return page.locator('#dino-checkpoint-profile').evaluate(el=>({focus:Number(el.getAttribute('data-dig-profile-focus')),delta:Number(el.getAttribute('data-dig-profile-delta')),kind:el.getAttribute('data-dig-profile-kind'),
    levels:Array.from(el.querySelectorAll('[data-dig-profile-side]')).map(side=>({side:side.getAttribute('data-dig-profile-side'),levels:Array.from(side.querySelectorAll('[data-dig-profile-level]')).map(level=>({level:Number(level.getAttribute('data-dig-profile-level')),additional:level.getAttribute('data-dig-profile-additional')==='true',y:Number(level.getAttribute('y')),height:Number(level.getAttribute('height'))}))})),
    surfaces:Array.from(el.querySelectorAll('[data-dig-profile-surface]')).map(line=>({side:line.getAttribute('data-dig-profile-surface'),y1:Number(line.getAttribute('y1')),y2:Number(line.getAttribute('y2'))})),brackets:el.querySelectorAll('[data-dig-profile-bracket]').length}));
}
async function assertProfile(page: Page, expected: {focus:number,before:number,current:number,kind:string}) {
  await profileOpen(page);const delta=expected.current-expected.before;
  const sides=['saved','current'].map(side=>({side,levels:[1,2,3,4].map(level=>({level,additional:side==='current'&&level>expected.before&&level<=expected.current,y:60+(level-1)*36,height:33}))}));
  const surfaces=[{side:'saved',y1:60+expected.before*36,y2:60+expected.before*36},{side:'current',y1:60+expected.current*36,y2:60+expected.current*36}];
  await expect.poll(()=>profileSnapshot(page)).toEqual({focus:expected.focus,delta,kind:expected.kind,levels:sides,surfaces,brackets:delta>0?1:0});
  const selected=page.locator('.dinolab-checkpoint-map [aria-current="true"]');await expect(selected).toHaveCount(2);for(const el of await selected.all())await expect(el).toHaveAttribute('data-dig-checkpoint-cell',String(expected.focus));
  const coord=String.fromCharCode(65+expected.focus%6)+(Math.floor(expected.focus/6)+1);
  await expect(page.locator('#dino-checkpoint-profile-details > summary')).toHaveText('Inspect change at '+coord);
  await expect(page.locator('#dino-checkpoint-profile-map-key')).toHaveText('Outer outlines mark selected '+coord+'. Thick dashed or solid cell borders mark changes since the baseline.');
  await expect(page.locator('#dino-checkpoint-profile-counts')).toHaveText('Saved '+(4-expected.before)+' remain → current '+(4-expected.current)+' remain · '+delta+' model layers removed since this baseline.');
  const description=await page.locator('#dino-checkpoint-profile svg').getAttribute('aria-label');expect(description).toContain('saved '+expected.before+'/4 removed, '+(4-expected.before)+' remaining');expect(description).toContain('current '+expected.current+'/4 removed, '+(4-expected.current)+' remaining');expect(description).toContain(delta+' additional model layers');
  return profileSnapshot(page);
}
async function checkpointSelect(page: Page,index:number) {
  await checkpointOpen(page);const before=await state(page);await page.locator('[data-dig-checkpoint-select="'+index+'"]').click();
  await expect.poll(async()=>(await state(page)).digFocus).toBe(index);expect(await state(page)).toEqual({...before,digFocus:index,digVoxel:{...before.digVoxel,focus:index}});
}

test('checkpoint profile follows native baseline selection digging Undo and stale comparisons without changing evidence',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const voxel=emptyVoxel();voxel.depths[19]=4;voxel.focus=7;
  await mount(page,{digVoxel:voxel,digFocus:7,digRevealed:[19],digVoxelFindLook:'outline'});await warmFind(page,7);const pool=(await marker(page)).pool;
  await expect(page.locator('#dino-checkpoint-profile')).toHaveCount(0);await brush(page,7);await checkpointSave(page);
  const details=page.locator('#dino-checkpoint-profile-details');await expect(details).not.toHaveAttribute('open');
  const closedIcon=await details.locator('summary').evaluate(el=>getComputedStyle(el,'::before').content);expect(closedIcon).toBe('"+"');await expect(page.locator('#dino-checkpoint-profile-map-key')).toBeVisible();
  await assertProfile(page,{focus:7,before:1,current:1,kind:'unchanged'});const openedIcon=await details.locator('summary').evaluate(el=>getComputedStyle(el,'::before').content);expect(openedIcon).toBe('"−"');
  await brush(page,7);await brush(page,7);const removed=await assertProfile(page,{focus:7,before:1,current:3,kind:'removed'});
  await expect(page.locator('#dino-checkpoint-profile-observation')).toHaveText('The patterned bands show 2 additional model layers removed at B2.');
  await page.locator('#dino-checkpoint-note-observation').fill('At B2, two more model layers were removed after my baseline.');
  const notes=(await state(page)).digVoxelCheckpointNotes,baseline=(await state(page)).digVoxelCheckpoint;
  await page.setViewportSize({width:1280,height:2200});await profileOpen(page);await page.locator('#dino-checkpoint-profile').screenshot({path:path.join(dir,'checkpoint-profile-two-layers-desktop.png')});
  await page.locator('.dinolab-checkpoint-maps').screenshot({path:path.join(dir,'checkpoint-profile-selected-maps-desktop.png')});
  await brush(page,0);await assertProfile(page,{focus:0,before:0,current:1,kind:'removed'});await checkpointSelect(page,7);await assertProfile(page,{focus:7,before:1,current:3,kind:'removed'});
  expect((await state(page)).digVoxelCheckpointNotes).toEqual(notes);expect((await state(page)).digVoxelCheckpoint).toEqual(baseline);
  await page.locator('[data-dig-view="section"]').click();await assertProfile(page,{focus:7,before:1,current:3,kind:'removed'});
  await choose(page,19);await page.locator('[data-dig-view="find"]').click();await expect(page.locator('#dino-checkpoint-panel')).toHaveCount(0);await expect(page.locator('#dino-checkpoint-profile')).toHaveCount(0);
  await page.locator('[data-dig-view="full"]').click();await choose(page,7);await assertProfile(page,{focus:7,before:1,current:3,kind:'removed'});expect((await state(page)).digVoxelCheckpointNotes).toEqual(notes);
  const restoredSelection=(await state(page)).digVoxelUndo.at(-1).focus;expect(restoredSelection).toBe(0);
  await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>(await layers(page))[0]).toBe(0);await expect.poll(async()=>(await state(page)).digFocus).toBe(restoredSelection);const undoSelection=await assertProfile(page,{focus:restoredSelection,before:0,current:0,kind:'unchanged'});
  await checkpointSelect(page,7);await assertProfile(page,{focus:7,before:1,current:3,kind:'removed'});
  await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>(await layers(page))[7]).toBe(2);const undone=await assertProfile(page,{focus:7,before:1,current:2,kind:'removed'});
  await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>(await layers(page))[7]).toBe(1);await assertProfile(page,{focus:7,before:1,current:1,kind:'unchanged'});
  await page.getByRole('button',{name:'Undo last excavation',exact:true}).click();await expect.poll(async()=>(await layers(page))[7]).toBe(0);await expect(page.locator('#dino-checkpoint-panel')).toHaveAttribute('data-dig-checkpoint-kind','ahead');await expect(page.locator('#dino-checkpoint-profile')).toHaveCount(0);
  await checkpointSave(page);const replaced=await assertProfile(page,{focus:7,before:0,current:0,kind:'unchanged'});expect((await state(page)).digVoxelCheckpointNotes).toBeNull();
  await page.locator('#dino-checkpoint-clear').click();await expect(page.locator('#dino-checkpoint-panel')).toHaveAttribute('data-dig-checkpoint-kind','missing');await expect(page.locator('#dino-checkpoint-profile')).toHaveCount(0);
  await checkpointSave(page);await assertProfile(page,{focus:7,before:0,current:0,kind:'unchanged'});await page.getByRole('button',{name:'New dig',exact:true}).click();await expect.poll(async()=>(await state(page)).digSeed).toBe(2);await expect(page.locator('#dino-checkpoint-profile')).toHaveCount(0);
  expect((await state(page)).digVoxelCheckpoint).toBeNull();expect((await state(page)).digVoxelCheckpointNotes).toBeNull();expect((await marker(page)).pool).toEqual(pool);
  fs.writeFileSync(path.join(dir,'checkpoint-profile-behavior.json'),JSON.stringify({removed,undoSelection,undone,replaced,nativeUndoRestoresSelection:true,closedAndOpenDisclosureIndicatorsCorrect:true,nativeDisclosuresDoNotWriteState:true,pairedMapsShareSelectedCoordinate:true,nativeChangedCoordinateSelectionOnly:true,notesAndBaselinePreservedAcrossSelectionAndViews:true,findAndUndoAheadAndClearAndNewSiteHideProfile:true,replaceBaselineClearsItsNotes:true,noNewSceneResources:true,unchangedPool:pool},null,2));
});

test('checkpoint profile records contact at equal depth and remains accessible across phone themes and remount', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const voxel = emptyVoxel();
  voxel.depths[5] = 2;
  for (const index of [4, 10, 11, 19]) voxel.depths[index] = 4;
  voxel.focus = 5;
  await mount(page, {
    digVoxel: voxel,
    digFocus: 5,
    digRevealed: [19],
    digVoxelFindLook: 'outline'
  });
  await warmFind(page, 5);
  const initialPool = (await marker(page)).pool;
  const nonFootprintMaterials = async () => page.evaluate(() => {
    const scene = (window as any).__voxelQA.current.scene, materials = new Set<string>();
    scene.traverse((object: any) => {
      for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (ancestor.name === 'dino-tool-footprint') return;
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) materials.add(material.uuid);
    });
    return [...materials].sort();
  });
  const initialNonFootprintMaterials = await nonFootprintMaterials();
  await checkpointSave(page);
  await assertProfile(page, { focus: 5, before: 2, current: 2, kind: 'unchanged' });
  await expect(page.locator('#dino-checkpoint-profile-status')).toContainText('Partly excavated → Partly excavated');

  await page.getByRole('button', { name: 'Trowel', exact: true }).click();
  const beforeContact = await state(page);
  const beforeLayers = await layers(page);
  const pose = await camera(page);
  expect(beforeContact.digVoxel.tool).toBe('trowel');
  await page.locator('#dino-dig-cell-5').focus();
  await page.locator('#dino-dig-cell-5').press('Enter');
  await expect.poll(async () => (await state(page)).digVoxel.contacts[5]).toBe(true);
  expect(await layers(page)).toEqual(beforeLayers);
  const afterContact = await state(page);
  expect(afterContact.digVoxel.contacts.flatMap((contact: boolean, index: number) =>
    contact === beforeContact.digVoxel.contacts[index] ? [] : [index]
  )).toEqual([5]);
  expect(await camera(page)).toEqual(pose);
  await assertProfile(page, { focus: 5, before: 2, current: 2, kind: 'status' });
  await expect(page.locator('#dino-checkpoint-profile-status')).toContainText('Partly excavated → Contact recorded');
  await expect(page.locator('#dino-checkpoint-profile-counts')).toContainText('0 model layers removed since this baseline');
  await expect(page.locator('#dino-checkpoint-profile-observation')).toContainText('no additional model layers removed');
  await expect(page.locator('#dino-checkpoint-profile [data-dig-profile-additional="true"]')).toHaveCount(0);
  await expect(page.locator('#dino-checkpoint-profile [data-dig-profile-bracket]')).toHaveCount(0);
  // Contact updates the existing preallocated tool-preview material bindings.
  // Geometry, textures, and every material outside that preview retain identity.
  const contactPool = (await marker(page)).pool;
  for (const key of ['scene', 'renderer', 'geometries', 'textures'] as const) expect(contactPool[key]).toEqual(initialPool[key]);
  expect(contactPool.materials).toHaveLength(initialPool.materials.length);
  expect(await nonFootprintMaterials()).toEqual(initialNonFootprintMaterials);
  const contactFootprint = await page.evaluate(() => {
    const target = (window as any).__voxelQA.current.scene.getObjectByName('dino-tool-target-5');
    return { contact: target.userData.contact, maxRemoval: target.userData.maxRemoval, envelopeVisible: target.children[4].visible };
  });
  expect(contactFootprint).toEqual({ contact: true, maxRemoval: 0, envelopeVisible: false });
  await page.setViewportSize({ width: 1280, height: 1600 });
  await profileOpen(page);
  await page.locator('#dino-checkpoint-profile').scrollIntoViewIfNeeded();
  await settle(page);
  await page.locator('#dino-checkpoint-profile').screenshot({ path: path.join(dir, 'checkpoint-profile-status-desktop.png') });

  const saved = await state(page), pool = (await marker(page)).pool;
  const audits: any[] = [];
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  for (const width of [320, 390]) for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.setViewportSize({ width, height: 844 });
    await theme(page, name);
    await assertProfile(page, { focus: 5, before: 2, current: 2, kind: 'status' });
    await expect(page.locator('#dino-checkpoint-profile-map-key')).toBeVisible();
    const boxes = await page.locator('#dino-checkpoint-panel,#dino-checkpoint-profile,#dino-checkpoint-profile-map-key,#dino-checkpoint-profile svg,#dino-checkpoint-details>summary,#dino-checkpoint-profile-details>summary')
      .evaluateAll(els => els.map(el => {
        const bounds = el.getBoundingClientRect();
        return { tag: el.tagName.toUpperCase(), id: el.id, left: bounds.left, right: bounds.right, height: bounds.height };
      }));
    for (const box of boxes) {
      expect(box.left, box.id || box.tag).toBeGreaterThanOrEqual(0);
      expect(box.right, box.id || box.tag).toBeLessThanOrEqual(width);
      if (box.tag === 'SUMMARY') expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#dinopanel'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      });
      return result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    audits.push({ width, theme: name, violations, boxes });
    await page.setViewportSize({ width, height: 1600 });
    await page.locator('#dino-checkpoint-profile').scrollIntoViewIfNeeded();
    await settle(page);
    await page.locator('#dino-checkpoint-profile').screenshot({ path: path.join(dir, 'checkpoint-profile-status-' + width + '-' + name + '.png') });
    await page.setViewportSize({ width, height: 844 });
    expect(await state(page)).toEqual(saved);
    expect((await marker(page)).pool).toEqual(pool);
  }

  await visibleCanvas(page);
  const pixels = await harness.glPixels(page, '#dino-voxel-stage');
  expect(pixels).not.toBeNull();
  expect(looksBlank(pixels!)).toBe(false);
  await page.waitForTimeout(180);
  const idle = (await marker(page)).renders;
  await page.waitForTimeout(240);
  const idleDraws = (await marker(page)).renders - idle;
  expect(idleDraws).toBeLessThanOrEqual(1);

  const resources = await ownership(page);
  expect(resources.owned).toBe(pool.geometries.length + pool.materials.length + pool.textures.length - 1);
  expect(resources.borrowed).toBe(1);
  await page.locator('#dinotab-notes').click();
  await expect.poll(() => page.evaluate(() => (window as any).__spatialDisposal.every((resource: any) => resource.count === 1))).toBe(true);
  const firstDisposal = await page.evaluate(() => (window as any).__spatialDisposal);
  expect(firstDisposal).toHaveLength(resources.owned);

  await page.locator('#dinotab-dig').click();
  await ready(page);
  await warmFind(page, 5);
  await assertProfile(page, { focus: 5, before: 2, current: 2, kind: 'status' });
  await expect(page.locator('#dino-checkpoint-profile-status')).toContainText('Partly excavated → Contact recorded');
  expect(await state(page)).toEqual(saved);
  const secondPool = (await marker(page)).pool;
  expect(secondPool.geometries.length).toBe(pool.geometries.length);
  expect(secondPool.materials.length).toBe(pool.materials.length);
  expect(secondPool.textures.length).toBe(pool.textures.length);
  const secondResources = await ownership(page);
  expect(secondResources).toEqual(resources);
  await harness.unmount(page);
  await expect.poll(() => page.evaluate(() => (window as any).__spatialDisposal.every((resource: any) => resource.count === 1))).toBe(true);
  const secondDisposal = await page.evaluate(() => (window as any).__spatialDisposal);
  expect(secondDisposal).toHaveLength(secondResources.owned);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);

  fs.writeFileSync(path.join(dir, 'checkpoint-profile-status-behavior.json'), JSON.stringify({
    nativeTrowelAtF1: true,
    contactRecordedWithoutDepthChange: true,
    onlyTargetContactChanged: true,
    beforeRemoved: 2,
    currentRemoved: 2,
    additionalRemoved: 0,
    statusTransition: ['partial', 'contact'],
    noInventedRemovalBandsOrBracket: true,
    cameraUnchangedByContactRecording: true,
    noNewSceneResources: true,
    materialReferenceChangesConfinedToExistingToolFootprint: true,
    geometryAndTextureIdentityPreserved: true,
    nonblankWebGL: true
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'checkpoint-profile-accessibility.json'), JSON.stringify(audits, null, 2));
  fs.writeFileSync(path.join(dir, 'checkpoint-profile-lifecycle.json'), JSON.stringify({
    resources,
    secondResources,
    firstDisposal,
    secondDisposal,
    idleDraws,
    stateAndPoolPreservedAcrossThemes: true,
    statusOnlyComparisonPreservedAcrossRemount: true,
    eachOwnedResourceDisposedOnce: true
  }, null, 2));
});
