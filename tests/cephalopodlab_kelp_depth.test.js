import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const { restorePass67Source } = require('./helpers/cephalopod_pass67_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const baseline = restorePass67Source(source);
function region(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from);
  if (from < 0 || to <= from) throw new Error('Missing actual kelp source region: ' + start);
  return text.slice(from, to);
}
const helpers = text => region(text, 'function shadeCLHuntPlantFlex(', 'function createCLHuntMarineSnowGeometry(');
function grove(text, seed, support = 'webgl2') {
  const math = Object.create(Math), draws = [];
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; draws.push(value); return value; };
  const scene = new THREE.Scene(), renderer = { capabilities: { isWebGL2: support === 'webgl2' }, extensions: { has: name => support === 'extension' && name === 'OES_standard_derivatives' } };
  const block = region(text, 'var kelpStrands = [];', '// \u2500\u2500\u2500 Hydrothermal vent');
  const strands = new Function('THREE', 'Math', 'scene', 'renderer', helpers(text) + '\n' + block + ';return kelpStrands;')(THREE, math, scene, renderer);
  return { scene, strands, draws, dispose() { for (const { mesh } of strands) { mesh.geometry.dispose(); mesh.material.dispose(); } } };
}
function geometrySnapshot(geometry) {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) => [name, { itemSize: attr.itemSize, normalized: attr.normalized, values: Array.from(attr.array) }])),
    index: Array.from(geometry.index.array), metadata: geometry.userData,
    bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray(), center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius },
  };
}
function placement({ mesh, phase, baseHeight, flex }) {
  return { name: mesh.name, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), substrate: mesh.userData, phase, baseHeight, motion: flex.value.toArray(), frustumCulled: mesh.frustumCulled, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, renderOrder: mesh.renderOrder };
}
function shaderFor(material) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader); return shader;
}

describe('Cephalopod Hunter kelp depth and light', () => {
  it('restores the accepted Pass66 source exactly and preserves every plant helper', () => {
    expect(createHash('sha256').update(baseline).digest('hex')).toBe('2a777cc913efe952c2f10ba0f67712493f75443dd276b0f2c5761734582309c7');
    expect(helpers(source)).toBe(helpers(baseline));
  });

  it('keeps the seeded grove, simulation random stream, geometry and resource budgets identical', () => {
    for (const seed of [2741, 8191, 123456789]) for (const support of ['webgl2', 'extension', 'none']) {
      const current = grove(source, seed, support), accepted = grove(baseline, seed, support);
      try {
        expect(current.draws).toEqual(accepted.draws); expect(current.draws).toHaveLength(125);
        expect(current.scene.children).toHaveLength(25); expect(current.strands).toHaveLength(25);
        const geometries = new Set(), materials = new Set();
        for (let i = 0; i < current.strands.length; i++) {
          const live = current.strands[i], old = accepted.strands[i];
          expect(placement(live)).toEqual(placement(old)); expect(geometrySnapshot(live.mesh.geometry)).toEqual(geometrySnapshot(old.mesh.geometry));
          expect(live.mesh.children).toHaveLength(0); expect(live.mesh.geometry.attributes.position.count).toBe(277); expect(live.mesh.geometry.index.count).toBe(1272);
          geometries.add(live.mesh.geometry); materials.add(live.mesh.material);
        }
        expect(geometries.size).toBe(25); expect(materials.size).toBe(25);
      } finally { current.dispose(); accepted.dispose(); }
    }
  });

  it('uses two-sided solid depth while retaining the actual thin-leaf lighting and float exclusion', () => {
    for (const support of ['webgl2', 'extension', 'none']) {
      const current = grove(source, 2741, support), accepted = grove(baseline, 2741, support);
      try {
        for (let i = 0; i < current.strands.length; i++) {
          const { mesh, flex } = current.strands[i], material = mesh.material, old = accepted.strands[i].mesh.material;
          expect(material.isMeshStandardMaterial).toBe(true); expect(material.transparent).toBe(false); expect(material.opacity).toBe(1); expect(material.depthWrite).toBe(true); expect(material.depthTest).toBe(true); expect(material.side).toBe(THREE.DoubleSide);
          expect(old.transparent).toBe(true); expect(old.opacity).toBe(.85); expect(old.depthWrite).toBe(false);
          for (const key of ['roughness', 'metalness', 'vertexColors', 'alphaTest', 'blending', 'map', 'alphaMap', 'normalMap', 'emissiveMap']) expect(material[key]).toBe(old[key]);
          expect(material.color.equals(old.color)).toBe(true); expect(material.emissive.equals(old.emissive)).toBe(true);
          const shader = shaderFor(material), previous = shaderFor(old);
          expect(shader.vertexShader).toBe(previous.vertexShader); expect(shader.fragmentShader).toBe(previous.fragmentShader); expect(shader.uniforms.clPlantMotion).toBe(flex); expect(material.customProgramCacheKey()).toBe(old.customProgramCacheKey());
          if (support !== 'none') {
            expect(shader.fragmentShader).toContain('directionalLights[0].color*clPlantRibbonWeight*clPlantBacklight');
            const mask = mesh.geometry.attributes.clPlantRibbon, floats = mesh.geometry.userData.clKelpBladders.parts;
            expect(mask.count).toBe(277);
            for (const part of floats) for (let vertex = part.vertexStart; vertex < part.vertexStart + part.vertexCount; vertex++) expect(mask.getX(vertex)).toBe(0);
            for (let vertex = 0; vertex < 141; vertex++) expect(mask.getX(vertex)).toBe(1);
          } else { expect(mesh.geometry.attributes.clPlantRibbon).toBeUndefined(); }
        }
      } finally { current.dispose(); accepted.dispose(); }
    }
  });
});
