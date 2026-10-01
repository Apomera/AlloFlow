import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const dropStart = source.indexOf('// Drop\n', source.indexOf('var gKeyNow =')), dropEnd = source.indexOf('carriedShelter = null;', dropStart) + 'carriedShelter = null;'.length; assert.ok(dropStart >= 0 && dropEnd > dropStart);
const drop = source.slice(dropStart, dropEnd), scan = region('var nearAnyShelterDen = false;', '// Remember it;');
const build = new Function('THREE', 'Math', '__alloT', 'var scene=new THREE.Scene(),octopus=new THREE.Group(),announcements=[],achievements=[];scene.add(octopus);function clAnnounce(text){announcements.push(text);}function unlockAchievement(id){achievements.push(id);}' + region('function terrainHeight(', 'function distance3(') + region('var SHELTER_PICKUP_RANGE =', '// ─── Audio (synthesized') + ';return{scene,octopus,shelters,announcements,achievements,terrain:terrainHeight,carry:function(shelter){scene.remove(shelter);octopus.add(shelter);shelter.position.set(0,-.1,.6);shelter.rotation.set(0,0,.11);shelter.userData.state="carried";carriedShelter=shelter;},drop:function(now){' + drop + scan + ';return nearAnyShelterDen;},scan:function(){' + scan + ';return nearAnyShelterDen;}};');
const fixtures = [];
function fixture() { let draws = 0, locked = false; const math = Object.assign(Object.create(Math), { random() { if (locked) throw new Error('Dropping shelter must not consume world randomness'); draws++; return .8; } }); const item = build(THREE, math, (_key, fallback) => fallback); locked = true; fixtures.push(item); return { ...item, draws }; }
afterEach(() => { for (const item of fixtures.splice(0)) { const resources = new Set(); item.scene.traverse(object => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); }); resources.forEach(resource => resource.dispose()); } });
describe('Cephalopod Hunter same-frame placed-shelter grounding', () => {
  it('grounds each real carriable shelter before the first den scan on both shelf and negative terrain', () => {
    for (const type of ['coconut', 'bottle', 'conch']) for (const x of [-16, 0, 28, 36]) {
      const item = fixture(), shelter = item.shelters.find(object => object.userData.shelterType === type), floor = item.terrain(x, 0); item.octopus.position.set(x, floor + .55, 0); item.carry(shelter);
      const protectedImmediately = item.drop(4321); assert.equal(shelter.position.x, x); assert.equal(shelter.position.z, 0); assert.ok(Math.abs(shelter.position.y - (floor + .12)) < 1e-12, 'The actual drop branch must use final terrain height before updateGround runs'); assert.equal(protectedImmediately, true, type + ' protects in its placement frame at X=' + x); assert.equal(shelter.parent, item.scene); assert.equal(shelter.userData.state, 'dropped'); assert.equal(shelter.userData.createdAt, 4321);
    }
  });
  it('preserves the existing strict height and horizontal den boundaries after placement', () => {
    const item = fixture(), shelter = item.shelters.find(object => object.userData.shelterType === 'bottle'); item.octopus.position.set(28, item.terrain(28, 0) + .55, 0); item.carry(shelter); item.drop(5000);
    for (const sign of [-1, 1]) { item.octopus.position.y = shelter.position.y + sign; assert.equal(item.scan(), false); item.octopus.position.y = shelter.position.y + sign * .999; assert.equal(item.scan(), true); }
    item.octopus.position.y = shelter.position.y + .5; item.octopus.position.x = shelter.position.x + 1.5; assert.equal(item.scan(), false); item.octopus.position.x = shelter.position.x + 1.499; assert.equal(item.scan(), true);
    item.octopus.position.set(shelter.position.x, shelter.position.y + 2, shelter.position.z); assert.equal(item.scan(), false, 'Grounding does not make high floating players protected');
  });
  it('retains exact drop poses, metadata, resources, announcements and zero extra randomness', () => {
    for (const type of ['coconut', 'bottle', 'conch']) {
      const item = fixture(), shelter = item.shelters.find(object => object.userData.shelterType === type), before = { uuid: shelter.uuid, wobble: shelter.userData.wobble, children: shelter.children.slice(), resources: shelter.children.flatMap(mesh => [mesh.geometry, mesh.material]), arrays: shelter.children.flatMap(mesh => Object.values(mesh.geometry.attributes).map(attr => attr.array)) };
      item.octopus.position.set(28, item.terrain(28, 0) + .55, 0); item.carry(shelter); item.drop(8765); assert.equal(item.draws, 36); assert.equal(shelter.uuid, before.uuid); assert.equal(shelter.userData.wobble, before.wobble); assert.deepEqual(shelter.children, before.children); assert.deepEqual(shelter.children.flatMap(mesh => [mesh.geometry, mesh.material]), before.resources); assert.deepEqual(shelter.children.flatMap(mesh => Object.values(mesh.geometry.attributes).map(attr => attr.array)), before.arrays);
      assert.deepEqual(shelter.rotation.toArray(), [0, 0, type === 'bottle' ? Math.PI / 2 : 0, 'XYZ']); assert.equal(item.announcements.length, 1); assert.match(item.announcements[0], /placed — temporary den/); assert.deepEqual(item.achievements, type === 'coconut' ? ['coconutBuilder'] : []);
    }
  });
});
