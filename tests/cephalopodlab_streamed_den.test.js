import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); assert.ok(a >= 0 && b > a, start); return source.slice(a, b); }
const helpers = region('function shadeCLHuntRockSurface(', 'function shadeCLHuntCoralSurface(') + region('function reefSurface(shader){', '// ─── Reef rocks') + region('function createCLHuntDenRockGeometry(', '// ─── Dens (4 rock arches');
const initial = region('var DEN_RADIUS = 2.0;', '// ─── Clams'), recycle = region('var RECYCLE_DIST = 120;', '// Rocks'), stream = region('var nearestDenD = Infinity;', '// Recycling changes X/Z');
const construct = new Function('THREE', 'Math', 'renderer', 'var scene=new THREE.Scene(),octopus={position:new THREE.Vector3()};' + helpers + initial + recycle + ';return{scene,dens,octopus,step:function(){' + stream + '},rock:createCLHuntDenRockGeometry,shadow:createCLHuntDenShadowGeometry,shader:shadeCLHuntRockSurface,fallback:reefSurface};');
const fixtures = [];
function fixture(derivatives = true) {
  const draws = [], math = Object.assign(Object.create(Math), { random() { const value = ((draws.length * 37 + 17) % 97) / 97; draws.push(value); return value; } });
  const item = construct(THREE, math, { capabilities: { isWebGL2: false }, extensions: { has(name) { assert.equal(name, 'OES_standard_derivatives'); return derivatives; } } });
  fixtures.push(item); return { ...item, draws };
}
const data = geometry => ({ attributes: Object.entries(geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(geometry.index.array) });
afterEach(() => { for (const item of fixtures.splice(0)) { const materials = new Set(); item.scene.traverse(object => { object.geometry?.dispose(); if (object.material) materials.add(object.material); }); materials.forEach(material => material.dispose()); } });

describe('Cephalopod Hunter streamed exploration dens', () => {
  it('uses the actual distance gate, three spawn draws, annulus and twelve-den cap', () => {
    const item = fixture(); assert.equal(item.dens.length, 4); assert.equal(item.draws.length, 4);
    item.step(); assert.equal(item.dens.length, 4); assert.equal(item.draws.length, 4);
    item.octopus.position.set(-220, .55, 0); const at = item.draws.length; item.step(); const den = item.dens[4], draws = item.draws.slice(at);
    assert.equal(draws.length, 3); const angle = draws[0] * Math.PI * 2, radius = 55 + draws[1] * 40;
    assert.equal(den.x, -220 + Math.sin(angle) * radius); assert.equal(den.z, Math.cos(angle) * radius); assert.equal(den.group.rotation.y, draws[2] * Math.PI);
    assert.deepEqual(den.group.position.toArray(), [den.x, 0, den.z]); assert.equal(den.group.parent, item.scene); assert.equal(den.glow, den.group.children[4]);
    item.octopus.position.set(den.x, .55, den.z); item.step(); assert.equal(item.draws.length, at + 3); assert.equal(item.dens.length, 5);
    while (item.dens.length < 12) { const count = item.dens.length, before = item.draws.length; item.octopus.position.set(-400 * (count + 1), .55, 37); item.step(); assert.equal(item.dens.length, count + 1); assert.equal(item.draws.length, before + 3); }
    const count = item.draws.length; item.octopus.position.set(-10000, .55, 0); item.step(); assert.equal(item.dens.length, 12); assert.equal(item.draws.length, count);
  });

  it('reuses the accepted stone and cavity geometry with the original five-child shelter contract', () => {
    const item = fixture(); item.octopus.position.set(-220, .55, 0); item.step(); const den = item.dens[4], meshes = den.group.children;
    assert.equal(den.group.name, 'cl-den'); assert.equal(meshes.length, 5); assert.equal(new Set(meshes.map(mesh => mesh.material)).size, 3);
    const transforms = [[[-.9, .7, 0], [.7, 1.05, .8]], [[.9, .7, 0], [.8, 1.02, .8]], [[0, 1.6, 0], [1.5, .36, .66]]];
    for (let i = 0; i < 3; i++) {
      const expected = item.rock(THREE, i === 2 ? 1 : .7, i === 2 ? 24 : 20, i === 2 ? 16 : 14, 12 + i);
      try { assert.deepEqual(data(meshes[i].geometry), data(expected)); } finally { expected.dispose(); }
      assert.equal(meshes[i].name, 'cl-den-rock'); assert.equal(meshes[i].material, meshes[0].material); assert.deepEqual(meshes[i].position.toArray(), transforms[i][0]); assert.deepEqual(meshes[i].scale.toArray(), transforms[i][1]);
    }
    const expected = item.shadow(THREE); try { assert.deepEqual(data(meshes[3].geometry), data(expected)); } finally { expected.dispose(); }
    assert.equal(meshes[3].material.vertexColors, true); assert.equal(meshes[3].material.transparent, false); assert.equal(meshes[3].material.side, THREE.DoubleSide);
    assert.equal(meshes[4], den.glow); assert.equal(meshes[4].geometry.parameters.innerRadius, 1.7); assert.equal(meshes[4].geometry.parameters.outerRadius, 2); assert.equal(meshes[4].material.opacity, 0);
    assert.deepEqual(meshes[4].position.toArray(), [0, .06, 0]); assert.equal(meshes[4].rotation.x, -Math.PI / 2);
    assert.equal(meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0), 565); assert.equal(meshes.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0), 302);
    assert.ok(meshes.every(mesh => !Object.values(mesh.material).some(value => value?.isTexture)));
  });

  it('preserves derivative fallback, linear mineral finish and independent streamed resource ownership', () => {
    for (const derivatives of [false, true]) {
      const item = fixture(derivatives); item.octopus.position.set(-220, .55, 0); item.step(); const first = item.dens[4].group;
      item.octopus.position.set(-500, .55, 0); item.step(); const second = item.dens[5].group;
      for (const [index, den] of [[4, first], [5, second]]) {
        const material = den.children[0].material, expected = new THREE.Color([0x55483a, 0x3f4d3d, 0x5c4f3f, 0x46524a][index % 4]).convertSRGBToLinear();
        assert.deepEqual(material.color.toArray(), expected.toArray()); assert.equal(material.name, 'cl-den-rock-material'); assert.equal(material.roughness, .9);
        assert.equal(material.onBeforeCompile, derivatives ? item.shader : item.fallback); if (derivatives) assert.equal(material.customProgramCacheKey(), 'cl-rock-surface-v1');
      }
      const firstResources = new Set(first.children.flatMap(mesh => [mesh.geometry, mesh.material])), secondResources = new Set(second.children.flatMap(mesh => [mesh.geometry, mesh.material]));
      assert.equal(firstResources.size, 8); assert.ok([...firstResources].every(resource => !secondResources.has(resource)));
      const disposed = new Set(); let neighbor = 0; firstResources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource))); secondResources.forEach(resource => resource.addEventListener('dispose', () => neighbor++));
      first.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); first.parent.remove(first);
      assert.equal(disposed.size, firstResources.size, 'Every owned resource disposes; repeated shared-material events are harmless'); assert.equal(neighbor, 0);
    }
  });

  it('keeps both actual pillar supports in contact with the roof for every streamed den variant', () => {
    const item = fixture();
    while (item.dens.length < 12) { item.octopus.position.set(-400 * (item.dens.length + 1), .55, 37); item.step(); }
    assert.equal(item.dens.slice(4).length, 8);
    for (const [offset, den] of item.dens.slice(4).entries()) {
      const roof = den.group.children[2], localRoof = new THREE.Mesh(roof.geometry, roof.material); localRoof.position.copy(roof.position); localRoof.scale.copy(roof.scale); localRoof.updateMatrixWorld(true);
      for (const pillar of den.group.children.slice(0, 2)) {
        const underside = new THREE.Raycaster(new THREE.Vector3(pillar.position.x, -2, pillar.position.z), new THREE.Vector3(0, 1, 0)).intersectObject(localRoof, false)[0];
        const localPillar = new THREE.Mesh(pillar.geometry, pillar.material); localPillar.position.copy(pillar.position); localPillar.scale.copy(pillar.scale); localPillar.updateMatrixWorld(true);
        const top = new THREE.Raycaster(new THREE.Vector3(pillar.position.x, 3, pillar.position.z), new THREE.Vector3(0, -1, 0)).intersectObject(localPillar, false)[0];
        assert.ok(underside && top, 'Actual support rays must hit variant ' + (offset + 4)); assert.ok(top.point.y - underside.point.y > .005, 'Actual roof and pillar triangles must overlap in variant ' + (offset + 4));
      }
    }
  });
});
