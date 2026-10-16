import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const { restoreOriginalSeagrassSource } = require('./helpers/cephalopod_seagrass_reference.cjs');
// An explicit candidate path supports pre-integration validation without changing
// the canonical simulator. Normal unit runs always read the production source.
const source = readFileSync(process.env.CLH_KELP_TEST_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const a = source.indexOf('function shadeCLHuntPlantFlex('), b = source.indexOf('function createCLHuntMarineSnowGeometry(', a);
assert.ok(a >= 0 && b > a, 'Expected the live plant factory and flex helpers');
const math = Object.create(Math);math.random = () => { throw new Error('Plant geometry must not consume dive RNG'); };
const { build, configure, shade } = new Function('Math', source.slice(a, b) + ';return{build:createCLHuntPlantGeometry,configure:createCLHuntPlantFlex,shade:shadeCLHuntPlantFlex};')(math);
// Old grass golden remains exact after reversing only the approved strap insertion.
// The standalone seagrass suite checks the actual live strap geometry independently.
const grassReferenceSource=restoreOriginalSeagrassSource(source),grassReferenceAt=grassReferenceSource.indexOf('function shadeCLHuntPlantFlex('),grassReferenceEnd=grassReferenceSource.indexOf('function createCLHuntMarineSnowGeometry(',grassReferenceAt);
assert.ok(grassReferenceAt>=0&&grassReferenceEnd>grassReferenceAt);
const grassReferenceBuild=new Function('Math',grassReferenceSource.slice(grassReferenceAt,grassReferenceEnd)+';return createCLHuntPlantGeometry;')(math);
const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };shade(shader);
const waveSource = shader.vertexShader.match(/vec2 clPlantWave\(([^)]*)\)\{([^{}]*)\}/);
assert.ok(waveSource, 'Expected the actual injected flex kernel');
const wave = new Function('sin', 'cos', 'vec2', 'return function(' + waveSource[1].replace(/float /g, '') + '){' + waveSource[2].replace(/\bfloat /g, 'let ') + '};')(Math.sin, Math.cos, (x, y) => [x, y]);
const xParameters = shader.vertexShader.match(/vec2 clPlantX=clPlantWave\(clPlantT,([^,]+),([\d.]+),([\d.]+)\);/);
const zParameters = shader.vertexShader.match(/vec2 clPlantZ=clPlantWave\(clPlantT,([^,]+),([\d.]+),([\d.]+)\);/);
assert.ok(xParameters && zParameters, 'Expected the actual accepted spatial-pulse wave expressions');
assert.deepEqual([xParameters[1],zParameters[1]],['clPlantMotion.y+clPlantInstancePhase','clPlantMotion.y+1.7+clPlantInstancePhase*0.73']);
assert.deepEqual([+xParameters[2],+xParameters[3],+zParameters[2],+zParameters[3]],[1.6,.12,2.1,.035]);
const livePhase = expression => new Function('phases','instancePhase','return '+expression.replace(/clPlantMotion\.x/g,'phases[0]').replace(/clPlantMotion\.y/g,'phases[1]').replace(/clPlantInstancePhase/g,'instancePhase')+';');
const xPhase=livePhase(xParameters[1]),zPhase=livePhase(zParameters[1]);
const pulseDefinition=shader.vertexShader.match(/float clPlantPulse\(([^)]*)\)\{([^{}]*)\}/);
assert.ok(pulseDefinition, 'Expected the actual accepted shared pulse');
const pulse=new Function('sin','return function('+pulseDefinition[1].replace(/float /g,'')+'){'+pulseDefinition[2].replace(/\bfloat /g,'let ')+'};')(Math.sin);
function pose(point, height, phase, enabled = 1, sitePhase = 0) {
  const t = Math.max(0, Math.min(1, point.y / Math.max(height, .001))),phases=[phase,phase*.79],weight=enabled*pulse(phases[0],sitePhase);
  const x=wave(t,xPhase(phases,0),+xParameters[2],+xParameters[3]),z=wave(t,zPhase(phases,0),+zParameters[2],+zParameters[3]);
  return point.clone().add(new THREE.Vector3(x[0]*height*weight,0,z[0]*height*weight));
}
function snapshot(geometry, prefix = Infinity) {
  return { ...Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array.slice(0, prefix * attr.itemSize))])), index: Array.from(geometry.index.array.slice(0, prefix === 57 ? 216 : undefined)), ...(prefix === Infinity ? { metadata: geometry.userData, box: [geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()], sphere: [geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius] } : {}) };
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('Cephalopod Hunter attached kelp fronds', () => {
  it('checks original grass goldens through the exact approved-insertion reversal and preserves live central-kelp attributes', () => {
    const grass = [], central = [];
    for (let variant = 0; variant < 80; variant++) {
      const geometry = grassReferenceBuild(THREE, 'grass', .6 + variant / 79 * 1.3, variant);
      try { grass.push(snapshot(geometry));assert.equal(geometry.attributes.position.count, 33);assert.equal(geometry.index.count / 3, 40); } finally { geometry.dispose(); }
    }
    for (const height of [5, 7, 9]) for (let variant = 0; variant < 25; variant++) {
      const geometry = build(THREE, 'kelp', height, variant);
      try {
        const p = geometry.attributes.position, normal = geometry.attributes.normal;
        assert.equal(p.count, 301);assert.equal(geometry.index.count / 3, 456);assert.deepEqual(Object.keys(geometry.attributes).sort(), ['color', 'normal', 'position', 'uv']);
        const { clKelpBladders, ...originalMetadata } = geometry.userData;
        assert.deepEqual(originalMetadata, { clPlantKind: 'kelp', clPlantHeight: height, clPlantVariant: variant, clPlantSections: 18, clPlantColumns: 3 });
        assert.deepEqual({ version: clKelpBladders.version, sides: clKelpBladders.sides, latitudeIntervals: clKelpBladders.latitudeIntervals }, { version: 1, sides: 8, latitudeIntervals: 5 });
        assert.equal(clKelpBladders.parts.length, 4);
        for (const attr of Object.values(geometry.attributes)) assert.ok(Array.from(attr.array).every(Number.isFinite));
        for (const value of geometry.attributes.color.array) assert.ok(value >= 0 && value <= 1);
        const point = new THREE.Vector3();
        for (let vertex = 0; vertex < p.count; vertex++) {
          assert.ok(Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1) < 2e-6);
          assert.ok(p.getY(vertex) >= 0 && p.getY(vertex) <= height);assert.ok(Math.hypot(p.getX(vertex), p.getZ(vertex)) < 1.25);
          assert.ok(geometry.boundingBox.containsPoint(point.fromBufferAttribute(p, vertex)));assert.ok(point.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-6);
        }
        const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        for (let triangle = 0; triangle < geometry.index.count; triangle += 3) {
          const ids = [geometry.index.getX(triangle), geometry.index.getX(triangle + 1), geometry.index.getX(triangle + 2)];
          assert.ok(ids.every(index => Number.isInteger(index) && index >= 0 && index < p.count));
          v0.fromBufferAttribute(p, ids[0]);v1.fromBufferAttribute(p, ids[1]);v2.fromBufferAttribute(p, ids[2]);
          assert.ok(v1.sub(v0).cross(v2.sub(v0)).length() > 1e-8);
        }
        central.push(snapshot(geometry, 57));
      } finally { geometry.dispose(); }
    }
    assert.equal(hash(grass), 'c70667ade1521cb02324cecefe784c82f5579f4e0f67000ddc0221b211fb6691');
    assert.equal(hash(central), '7303381a48058e243908182d076a8d74208380a7c1918d063d042f074e75df28');
  }, 30000);

  it('attaches four alternating curved leaves, with narrow tips, broad folded middles and a continuous palette at every joint', () => {
    for (const height of [5, 7, 9]) for (let variant = 0; variant < 25; variant++) {
      const geometry = build(THREE, 'kelp', height, variant), positions = geometry.attributes.position, colors = geometry.attributes.color;
      try {
        for (let leaf = 0; leaf < 4; leaf++) {
          const sign = variant % 2 ? -1 : 1, side = (leaf % 2 ? 1 : -1) * sign, start = 57 + leaf * 21, parent = (4 + leaf * 3) * 3 + (side < 0 ? 0 : 2);
          const anchor = new THREE.Vector3().fromBufferAttribute(positions, parent), base = new THREE.Vector3().fromBufferAttribute(positions, start + 1);
          assert.deepEqual(base.toArray(), anchor.toArray());
          for (const axis of ['getX', 'getY', 'getZ']) assert.equal(colors[axis](start + 1), colors[axis](parent));
          const widthAt = row => new THREE.Vector3().fromBufferAttribute(positions, start + row * 3).distanceTo(new THREE.Vector3().fromBufferAttribute(positions, start + row * 3 + 2));
          assert.ok(widthAt(3) > widthAt(0) * 10);assert.ok(widthAt(6) < widthAt(3) * .04);
          const middle = start + 9, edgeCenter = new THREE.Vector3().fromBufferAttribute(positions, middle).add(new THREE.Vector3().fromBufferAttribute(positions, middle + 2)).multiplyScalar(.5);
          assert.ok(new THREE.Vector3().fromBufferAttribute(positions, middle + 1).distanceTo(edgeCenter) > .02);
          const tip = new THREE.Vector3().fromBufferAttribute(positions, start + 19);
          // The approved distal curl returns the narrow tip into its own leaf hull.
          // The first five rows and root remain exact; the dedicated tip-form suite
          // checks the complete curved surface against the frozen accepted factory.
          assert.ok((tip.x - anchor.x) * side > .43 && (tip.x - anchor.x) * side < .51);
          assert.ok(tip.y - anchor.y > height * .15 && tip.y - anchor.y < height * .18);assert.ok(tip.y < height);
          assert.ok(tip.y < positions.getY(281 + leaf * 6), 'The final sampled segment recurs downward');
          for (let row = 0; row <= 6; row++) for (let column = 0; column < 3; column++) {
            const index = start + row * 3 + column;
            assert.equal(geometry.attributes.uv.getX(index), column / 2);assert.equal(geometry.attributes.uv.getY(index), Math.fround(row / 6));
            assert.equal(positions.getY(index), positions.getY(start + row * 3));
            if (row && row <= 4) assert.ok(positions.getY(index) > positions.getY(index - 3));
          }
        }
        const duplicate = build(THREE, 'kelp', height, variant);
        try { for (const [name, attr] of Object.entries(geometry.attributes)) assert.deepEqual(attr.array, duplicate.attributes[name].array);assert.deepEqual(geometry.index.array, duplicate.index.array); } finally { duplicate.dispose(); }
      } finally { geometry.dispose(); }
    }
  }, 30000);

  it('keeps joined vertices together under the existing flex and encloses every bent leaf in the actual expanded bounds', () => {
    for (const height of [5, 7, 9]) for (let variant = 0; variant < 25; variant++) {
      const geometry = build(THREE, 'kelp', height, variant), material = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(geometry, material);
      const restBox = geometry.boundingBox.clone(), arrays = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) => [name, attr.array]));
      const motion = configure(THREE, mesh, height), p = geometry.attributes.position;
      try {
        assert.equal(geometry.boundingBox.min.x, restBox.min.x - height * .12);assert.equal(geometry.boundingBox.max.x, restBox.max.x + height * .12);
        assert.equal(geometry.boundingBox.min.z, restBox.min.z - height * .035);assert.equal(geometry.boundingBox.max.z, restBox.max.z + height * .035);
        assert.equal(geometry.boundingBox.min.y, restBox.min.y);assert.equal(geometry.boundingBox.max.y, restBox.max.y);
        assert.deepEqual(motion.value.toArray(), [0, 0, height, 0]);assert.equal(material.customProgramCacheKey(), 'cl-plant-flex-v28-water-pulse');
        mesh.position.set(17, -48, 23);mesh.rotation.y = .83;mesh.updateMatrixWorld(true);
        for (let phase = 0; phase < Math.PI * 2; phase += .41) {
          for (let vertex = 0; vertex < p.count; vertex++) {
            const rest = new THREE.Vector3().fromBufferAttribute(p, vertex), moved = pose(rest, height, phase);
            assert.ok(geometry.boundingBox.containsPoint(moved));assert.ok(moved.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-6);
            assert.deepEqual(pose(rest, height, phase, 0).toArray(), rest.toArray());
            if (vertex < 3) assert.deepEqual(moved.applyMatrix4(mesh.matrixWorld).toArray(), rest.applyMatrix4(mesh.matrixWorld).toArray());
          }
          for (let leaf = 0; leaf < 4; leaf++) {
            const side = (leaf % 2 ? 1 : -1) * (variant % 2 ? -1 : 1), parent = (4 + leaf * 3) * 3 + (side < 0 ? 0 : 2);
            const anchor = pose(new THREE.Vector3().fromBufferAttribute(p, parent), height, phase).applyMatrix4(mesh.matrixWorld);
            const joint = pose(new THREE.Vector3().fromBufferAttribute(p, 58 + leaf * 21), height, phase).applyMatrix4(mesh.matrixWorld);
            assert.deepEqual(joint.toArray(), anchor.toArray());
          }
        }
        for (const [name, array] of Object.entries(arrays)) assert.equal(geometry.attributes[name].array, array);
      } finally { geometry.dispose();material.dispose(); }
    }
  }, 30000);
});
