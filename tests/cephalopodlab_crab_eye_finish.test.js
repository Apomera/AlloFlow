import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const before = "            var ceye=new THREE.Mesh(createCLHuntCrabGeometry(THREE,'eye',{sm:sm,type:ctype,side:eyeSide,color:cfg.color}),new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true}));";
const after = "            var ceye=new THREE.Mesh(createCLHuntCrabGeometry(THREE,'eye',{sm:sm,type:ctype,side:eyeSide,color:cfg.color}),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.32,metalness:0,vertexColors:true}));";
assert.equal(source.split(after).length - 1, 1, 'The actual eye finish must have exactly one construction guard');

function factory(runtime) {
  const start = runtime.indexOf('var CRAB_TYPES = {'), end = runtime.indexOf('// Seed with mix:', start);
  assert.ok(start >= 0 && end > start);
  const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene(),octopus={position:new THREE.Vector3(10,.55,-8)};' + runtime.slice(start, end) + ';return {scene,spawn:spawnCrab};');
  const draws = [], sequence = [.125, .25, .375, .5];
  const math = Object.assign(Object.create(Math), { random() { const result = sequence[draws.length % sequence.length]; draws.push(result); return result; } });
  return { ...construct(THREE, math), draws };
}
function anatomy(mesh) {
  return {
    name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(),
    attributes: Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name, Array.from(attribute.array)]),
    index: Array.from(mesh.geometry.index.array), parts: mesh.geometry.userData.clCrabParts, frame: mesh.geometry.userData.clCrabGeometry,
    box: [mesh.geometry.boundingBox.min.toArray(), mesh.geometry.boundingBox.max.toArray()],
    sphere: [mesh.geometry.boundingSphere.center.toArray(), mesh.geometry.boundingSphere.radius]
  };
}
function close(item) { item.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); }

describe('Cephalopod Hunter crab eye lighting', () => {
  it('changes only eye light response while retaining exact articulated anatomy, ownership, poses and spawn randomness', () => {
    const current = factory(source), reference = factory(source.replace(after, before));
    try {
      for (const request of ['rock', 'red', 'hermit', 'unknown']) {
        const crab = current.spawn(request), oldCrab = reference.spawn(request);
        assert.deepEqual(current.draws, reference.draws);
        assert.deepEqual(crab.userData, oldCrab.userData);
        assert.deepEqual(crab.position.toArray(), oldCrab.position.toArray());
        assert.equal(crab.children.length, oldCrab.children.length);
        crab.children.forEach((mesh, index) => {
          assert.deepEqual(anatomy(mesh), anatomy(oldCrab.children[index]));
          assert.notEqual(mesh.geometry, oldCrab.children[index].geometry);
          assert.notEqual(mesh.material, oldCrab.children[index].material);
          if (index === 1 || index === 2) {
            assert.equal(mesh.geometry.attributes.position.count, 58);
            assert.equal(mesh.material.isMeshStandardMaterial, true);
            assert.equal(mesh.material.roughness, .32); assert.equal(mesh.material.metalness, 0);
            assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.color.getHex(), 0xffffff);
            assert.equal(mesh.material.emissive.getHex(), 0); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.opacity, 1);
            assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
            const shader = { vertexShader: 'vertex sentinel', fragmentShader: 'fragment sentinel', uniforms: {} };
            mesh.material.onBeforeCompile(shader);
            assert.deepEqual(shader, { vertexShader: 'vertex sentinel', fragmentShader: 'fragment sentinel', uniforms: {} });
          } else {
            assert.equal(mesh.material.type, oldCrab.children[index].material.type);
            assert.equal(mesh.material.roughness, oldCrab.children[index].material.roughness);
          }
        });
        assert.notEqual(crab.children[1].material, crab.children[2].material);
      }
      assert.equal(current.draws.length, 16);
    } finally { close(current); close(reference); }
  });
});
