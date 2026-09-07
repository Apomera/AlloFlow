import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
function meadow() { return BH.queen3dBuildScene(THREE, { scene: new THREE.Scene(), dark: false, contrast: false, wantShadow: false }); }
function dispose(model) { const gs = new Set(), ms = new Set(); model.anchor.traverse(o => { if (o.geometry) gs.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => ms.add(m)); if (o.isInstancedMesh && o.dispose) o.dispose(); }); gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); }

describe('RTS meadow state and animation', () => {
  it('shows distinct structure silhouettes at the modeled positions without reallocating the scene', () => {
    const m = meadow();
    const structures = ['brood', 'honey', 'pollen', 'guard', 'nursery', 'fan'].map((type, i) => ({ type, x: .12 + i * .06, y: .3 + i * .08, level: 1 }));
    const before = new Set(); m.anchor.traverse(o => { if (o.geometry) before.add(o.geometry); });
    m.frame(0, { structures }, true);
    for (const [index, slot] of m.meshes.comb_works.children.entries()) {
      if (index >= structures.length) { expect(slot.visible).toBe(false); continue; }
      const active = slot.children.filter(child => child.name.startsWith('structure-') && child.visible);
      expect(active.map(child => child.name)).toEqual(['structure-' + structures[index].type]);
      const at = BH.bhQueenStructurePosition(structures[index], BH.QUEEN_MAP_PAD);
      expect(slot.position.x).toBeCloseTo(at.x); expect(slot.position.z).toBeCloseTo(at.z);
    }
    m.frame(1000, { structures: structures.map(s => ({ ...s, level: 3 })) }, true);
    const after = new Set(); m.anchor.traverse(o => { if (o.geometry) after.add(o.geometry); });
    expect(after).toEqual(before);
    m.frame(1200, { structures: Array.from({ length: 13 }, (_, i) => ({ type: 'guard', x: .12 + i % 4 * .09, y: .25 + Math.floor(i / 4) * .18, level: 1 })) }, true);
    expect(m.meshes.comb_works.children.filter(slot => slot.visible)).toHaveLength(13);
    const extra = m.meshes.comb_works.children[12];
    expect(extra.getObjectByName('structure-guard').visible).toBe(true);
    expect(m.picks).toContain(extra.children[0]);
    dispose(m);
  });
  it('keeps flowers and shared route endpoints independent of the RTS advantage score', () => {
    const m = meadow(); m.frame(0, { share: 0, showRoutes: true }, true);
    const lines = m.anchor.getObjectByName('forage-routes').children;
    expect(lines).toHaveLength(12);
    const snapshots = lines.map(line => Array.from(line.geometry.attributes.position.array));
    const flowerMaterials = m.meshes.forage_field.children.map(child => child.material);
    const focus = m.meshes.guard_line.position.clone();
    for (let patch = 0; patch < 6; patch++) {
      const home = lines[patch], neighbor = lines[patch + 6];
      expect(home.material.isLineDashedMaterial).not.toBe(true);
      expect(neighbor.material.isLineDashedMaterial).toBe(true);
      const a = home.geometry.attributes.position, b = neighbor.geometry.attributes.position;
      expect(a.getX(0)).toBeCloseTo(m.meshes.home_hive.position.x); expect(b.getX(0)).toBeCloseTo(m.meshes.rival_hive.position.x);
      expect(a.getX(32)).toBeCloseTo(b.getX(32)); expect(a.getZ(32)).toBeCloseTo(b.getZ(32));
    }
    m.frame(10, { share: 1 }, true);
    expect(lines.map(line => Array.from(line.geometry.attributes.position.array))).toEqual(snapshots);
    expect(m.meshes.forage_field.children.map(child => child.material)).toEqual(flowerMaterials);
    expect(m.meshes.guard_line.position.equals(focus)).toBe(true);
    dispose(m);
  });
  it('separates game buildings, raids and signal domes from the default ecological illustration', () => {
    const m=meadow(); const props={ structures:[{type:'guard',x:.2,y:.3}], raidPressure:1, qmp:1 };
    m.frame(0,props,true);
    expect(m.meshes.comb_works.visible).toBe(false); expect(m.meshes.raiders.visible).toBe(false);
    expect(m.meshes.signals.children.every(o=>!o.visible)).toBe(true);
    m.frame(1,{...props,showGamePieces:true,showSignals:true},true);
    expect(m.meshes.comb_works.visible).toBe(true); expect(m.meshes.raiders.visible).toBe(true);
    expect(m.meshes.signals.children.some(o=>o.visible)).toBe(true);
    dispose(m);
  });
  it('keeps nest size and spacing fixed as health changes, with both colonies using flowers', () => {
    const m=meadow();m.frame(0,{homeHealth:1,rivalHealth:1,forageRate:1},true);
    const size=new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).getSize(new THREE.Vector3());
    expect(m.meshes.rival_hive.position.x-m.meshes.home_hive.position.x).toBeGreaterThan(3.5);
    expect(m.meshes.swarm.children.filter(o=>o.visible&&o.userData.route.colony===0).length).toBeGreaterThan(0);
    expect(m.meshes.swarm.children.filter(o=>o.visible&&o.userData.route.colony===1).length).toBeGreaterThan(0);
    m.frame(1,{homeHealth:.1,rivalHealth:.1,forageRate:1},true);
    expect(new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).getSize(new THREE.Vector3()).equals(size)).toBe(true);
    dispose(m);
  });
  it('honors overlay choices and reflects the model winter without summer foragers', () => {
    const m = meadow(); m.frame(0, { forageRate: 1, season: 1, showSignals: false, showRoutes: false }, true);
    expect(m.meshes.swarm.children.filter(o => o.visible).length).toBeGreaterThan(0);
    expect(m.meshes.signals.children.every(o => !o.visible)).toBe(true);
    expect(m.anchor.getObjectByName('forage-routes').visible).toBe(false);
    const summer = m.anchor.getObjectByName('meadow-grass').material.color.getHex();
    m.frame(10, { forageRate: 1, season: 3, showRoutes: true }, true);
    expect(m.meshes.swarm.children.every(o => !o.visible)).toBe(true);
    expect(m.anchor.getObjectByName('forage-routes').visible).toBe(false);
    expect(m.anchor.getObjectByName('meadow-grass').material.color.getHex()).not.toBe(summer);
    dispose(m);
  });
  it('freezes bee positions during tactical pause and resumes without a time jump', () => {
    const m = meadow(), sp = { forageRate: 1, paused: false };
    m.frame(1000, sp, false); const first = m.meshes.swarm.children[0].position.clone();
    m.frame(1080, sp, false); const flying = m.meshes.swarm.children[0].position.clone();
    expect(flying.equals(first)).toBe(false);
    m.frame(5000, { ...sp, paused: true }, false);
    expect(m.meshes.swarm.children[0].position.equals(flying)).toBe(true);
    m.frame(5016, sp, false);
    expect(m.meshes.swarm.children[0].position.distanceTo(flying)).toBeLessThan(.02);
    dispose(m);
  });
  it('keeps reduced-motion scenes static and hives grounded as health changes', () => {
    const m = meadow(); m.frame(0, { homeHealth: 1, forageRate: 1 }, true);
    const position = m.meshes.swarm.children[0].position.clone();
    const base = new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).min.y;
    m.frame(10000, { homeHealth: .1, forageRate: 1 }, true);
    expect(m.meshes.swarm.children[0].position.equals(position)).toBe(true);
    expect(new THREE.Box3().setFromObject(m.meshes.home_hive.userData.body).min.y).toBeCloseTo(base, 2);
    dispose(m);
  });
});

describe('Optional RTS field objectives', () => {
  it('requires both target readings rather than rewarding one strong indicator', () => {
    expect(BH.bhQueenFieldObjective('explore', { intel: 45, territory: 59 }).met).toBe(false);
    expect(BH.bhQueenFieldObjective('explore', { intel: 45, territory: 60 }).met).toBe(true);
    expect(BH.bhQueenFieldObjective('defend', { guards: 100, health: 69 }).met).toBe(false);
    expect(BH.bhQueenFieldObjective('defend', { guards: 100, health: 70 }).met).toBe(true);
    expect(BH.bhQueenFieldObjective('build', { structures: 5, nectar: 19 }).met).toBe(false);
    expect(BH.bhQueenFieldObjective('build', { structures: 5, nectar: 20 }).met).toBe(true);
  });
  it('handles incomplete saves without claiming completion and does not mutate game state', () => {
    const state = { guards: NaN, health: Infinity, resources: { nectar: 30 } }, copy = JSON.stringify(state);
    expect(BH.bhQueenFieldObjective('defend', state).met).toBe(false);
    expect(BH.bhQueenFieldObjective('missing', {}).id).toBe('explore');
    expect(JSON.stringify(state)).toBe(copy);
  });
});

describe('Shared patch inspection',()=>{
  it('filters diagram routes and foragers together without changing shared access geometry',()=>{
    const m=meadow();const props={forageRate:1,rivalHealth:1,showRoutes:true};m.frame(0,props,true);
    const lines=m.anchor.getObjectByName('forage-routes').children;
    const geometry=lines.map(line=>Array.from(line.geometry.attributes.position.array));
    const beePositions=m.meshes.swarm.children.map(bee=>bee.position.clone());
    for(const view of ['both','home','neighbor']) {
      m.frame(0,{...props,patchId:'patch_c',colonyView:view},true);
      const shown=lines.filter(line=>line.visible);expect(shown).toHaveLength(view==='both'?2:1);
      expect(shown.every(line=>line.userData.patch===2)).toBe(true);
      if(view!=='both')expect(shown[0].userData.colony).toBe(view==='home'?0:1);
      expect(m.meshes.swarm.children.filter(bee=>bee.visible).every(bee=>bee.userData.route.patch===2&&(view==='both'||bee.userData.route.colony===(view==='home'?0:1)))).toBe(true);
      expect(m.meshes.patch_c.children[0].visible).toBe(true);expect(m.meshes.patch_a.children[0].visible).toBe(false);
      expect(m.meshes.guard_line.visible).toBe(false);
    }
    m.frame(0,props,true);expect(lines.filter(line=>line.visible)).toHaveLength(12);
    expect(lines.map(line=>Array.from(line.geometry.attributes.position.array))).toEqual(geometry);
    expect(m.meshes.swarm.children.map(bee=>bee.position.clone())).toEqual(beePositions);
    dispose(m);
  });
  it('gives flowers and large ground targets the same patch selection identity',()=>{
    const m=meadow();
    for(const patch of BH.QUEEN_LANDSCAPE_PATCHES){
      expect(m.meshes[patch.id]).toBeTruthy();
      expect(m.picks.filter(mesh=>mesh.userData.partId===patch.id).length).toBeGreaterThan(12);
    }
    m.frame(0,{patchId:'patch_f',colonyView:'neighbor',showRoutes:false,season:3},true);
    expect(m.anchor.getObjectByName('forage-routes').visible).toBe(false);
    expect(m.meshes.swarm.children.some(bee=>bee.visible)).toBe(false);
    expect(m.meshes.patch_f.children[0].visible).toBe(true);
    dispose(m);
  });
  it('normalizes stale saved inspection choices and keeps nests inside the enlarged terrain',()=>{
    expect(BH.bhQueenMapInspection('missing','bad')).toEqual({patchIndex:-1,patch:null,colony:'both'});
    expect(BH.bhQueenMapInspection('patch_f','neighbor').patchIndex).toBe(5);
    const m=meadow();const earth=m.anchor.getObjectByName('meadow-landscape').children[0];
    earth.updateWorldMatrix(true,false);const bounds=new THREE.Box3().setFromObject(earth);
    expect(bounds.max.x-bounds.min.x).toBeGreaterThan(6);
    expect(m.meshes.rival_hive.position.x-m.meshes.home_hive.position.x).toBeGreaterThan(4.5);
    dispose(m);
  });
});
