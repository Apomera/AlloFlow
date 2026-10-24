import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const { restorePass57Source } = require('./helpers/cephalopod_pass57_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const baseline = restorePass57Source(source);
const hash = value => createHash('sha256').update(value).digest('hex');
const math = Object.create(Math); math.random = () => { throw new Error('Plant finish must not consume simulation RNG'); };
function helpers(text) {
  const start = text.indexOf('function shadeCLHuntPlantFlex('), end = text.indexOf('function createCLHuntMarineSnowGeometry(', start);
  if (start < 0 || end <= start) throw new Error('Live plant helper region missing');
  return new Function('Math', text.slice(start, end) + ';return{shade:shadeCLHuntPlantFlex,configure:createCLHuntPlantFlex,update:updateCLHuntPlantFlex,create:createCLHuntPlantGeometry};')(math);
}
const live = helpers(source), accepted = helpers(baseline);
const standardShader = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader });
function fixture(factory, kind, height, variant) {
  const geometry = factory.create(THREE, kind, height, variant), material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, roughness: kind === 'kelp' ? .95 : .86, transparent: kind === 'kelp', opacity: kind === 'kelp' ? .85 : 1, depthWrite: kind !== 'kelp' });
  const mesh = kind === 'grass' ? new THREE.InstancedMesh(geometry, material, 7) : new THREE.Mesh(geometry, material);
  if (kind === 'grass') mesh.frustumCulled = false;
  return { geometry, material, mesh, dispose() { geometry.dispose(); material.dispose(); } };
}
function buffers(geometry) {
  const all = { ...geometry.attributes, index: geometry.index };
  return Object.fromEntries(Object.entries(all).map(([name, attr]) => [name, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }]));
}
function unchanged(geometry, snapshot) {
  for (const [name, saved] of Object.entries(snapshot)) {
    const attr = name === 'index' ? geometry.index : geometry.attributes[name];
    expect(attr).toBe(saved.attr); expect(attr.array).toBe(saved.array); expect(Array.from(attr.array)).toEqual(saved.values); expect(attr.version).toBe(saved.version);
  }
}
function compiled(fixture, supported) {
  const motion = live.configure(THREE, fixture.mesh, fixture.geometry.userData.clPlantHeight, supported), shader = standardShader(); fixture.material.onBeforeCompile(shader);
  return { motion, shader };
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (lo, hi, x) => { const t = clamp((x - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
const max = Math.max;
const sampleFixture = fixture(live, 'kelp', 7.4, 4), surfaceShader = compiled(sampleFixture, true).shader;
sampleFixture.dispose();
const filterDefinition = surfaceShader.fragmentShader.match(/float clPlantTissueFilter\(([^)]*)\)\{([^{}]*)\}/);
if (!filterDefinition) throw new Error('Live tissue filter missing');
const filter = new Function('smoothstep', 'max', 'return function(' + filterDefinition[1].replace(/float /g, '') + '){' + filterDefinition[2] + '};')(smoothstep, max);
const grainPhaseExpression = surfaceShader.fragmentShader.match(/float clPlantGrainPhase=([^;]+);/)[1];
const phase = new Function('x', 'y', 'sin', 'return ' + grainPhaseExpression.replaceAll('clPlantTissue.x', 'x').replaceAll('clPlantTissue.y', 'y') + ';');
const toneExpression = surfaceShader.fragmentShader.match(/float clPlantTissueTone=([^;]+);/)[1];
const tone = new Function('vein', 'edge', 'grain', 'return ' + toneExpression.replaceAll('clPlantVein', 'vein').replaceAll('clPlantEdge', 'edge').replaceAll('clPlantGrain', 'grain') + ';');
const roughnessExpression = surfaceShader.fragmentShader.match(/roughnessFactor=(mix\(roughnessFactor,clamp\(roughnessFactor[^;]+);/)[1];
const finishRoughness = new Function('base', 'weight', 'vein', 'grain', 'clamp', 'mix', 'return ' + roughnessExpression.replaceAll('roughnessFactor', 'base').replaceAll('clPlantRibbonWeight', 'weight').replaceAll('clPlantVein', 'vein').replaceAll('clPlantGrain', 'grain') + ';');
const backlightExpression = surfaceShader.fragmentShader.match(/reflectedLight\.directDiffuse\+=diffuseColor\.rgb\*directionalLights\[0\]\.color\*([^;]+);/)[1];
// Pass74 rib relief routes the backlight through the emitted clPlantBladeTransmission helper (edge variation).
const transmissionDefinition = surfaceShader.fragmentShader.match(/float clPlantBladeTransmission\(([^)]*)\)\{([^{}]*)\}/);
if (!transmissionDefinition) throw new Error('Live blade transmission missing');
const clPlantBladeTransmission = new Function('return function(' + transmissionDefinition[1].replace(/float /g, '') + '){' + transmissionDefinition[2] + '};')();
const backlightWeight = new Function('clPlantBladeTransmission', 'weight', 'backlight', 'edge', 'variation', 'aa', 'return ' + backlightExpression.replaceAll('clPlantRibbonWeight', 'weight').replaceAll('clPlantBacklight', 'backlight').replaceAll('clPlantEdgeVariation', 'variation').replaceAll('clPlantEdgeAA', 'aa').replaceAll('clPlantEdge', 'edge') + ';').bind(null, clPlantBladeTransmission);

describe('Cephalopod Hunter restrained plant tissue finish', () => {
  it('restores the accepted source exactly and leaves the original geometry, motion and placement definitions intact', () => {
    expect(hash(baseline)).toBe('4dbccc80d7607e788c961eee1829eead070e59382985862913b4d83687aa14ec');
    // Pass74 recurves only the kelp blade tips inside the geometry factory; kelp_tip_form checks that
    // against a frozen accepted factory and the geometry test below keeps every other byte exact.
    for (const helper of ['shade', 'update']) expect(live[helper].toString()).toBe(accepted[helper].toString());
    for (const call of [
      "createCLHuntPlantFlex(THREE,gmesh,gH,renderer.capabilities.isWebGL2||renderer.extensions.has('OES_standard_derivatives'));",
      "createCLHuntPlantFlex(THREE,kmesh,kH,renderer.capabilities.isWebGL2||renderer.extensions.has('OES_standard_derivatives'));",
    ]) expect(source.split(call)).toHaveLength(2);
  });

  it('keeps default and unsupported compilation byte-identical to the accepted flex shader, without a tissue buffer', () => {
    for (const supported of [undefined, false]) for (const kind of ['grass', 'kelp']) {
      const current = fixture(live, kind, kind === 'kelp' ? 7.4 : 1.2, 4), old = fixture(accepted, kind, kind === 'kelp' ? 7.4 : 1.2, 4);
      try {
        const { motion, shader } = compiled(current, supported), oldMotion = accepted.configure(THREE, old.mesh, old.geometry.userData.clPlantHeight), oldShader = standardShader(); old.material.onBeforeCompile(oldShader);
        expect(shader.vertexShader).toBe(oldShader.vertexShader); expect(shader.fragmentShader).toBe(oldShader.fragmentShader); expect(shader.uniforms.clPlantMotion).toBe(motion); expect(motion.value.toArray()).toEqual(oldMotion.value.toArray());
        expect(current.material.customProgramCacheKey()).toBe(old.material.customProgramCacheKey()); expect(current.geometry.attributes.clPlantRibbon).toBeUndefined();
        expect(current.geometry.boundingBox).toEqual(old.geometry.boundingBox); expect(current.geometry.boundingSphere).toEqual(old.geometry.boundingSphere);
        expect(current.material.extensions).toEqual(old.material.extensions);
      } finally { current.dispose(); old.dispose(); }
    }
  });

  it('adds only a scalar ribbon mask, excludes every closed float, and preserves geometry bytes, bounds, resources and global UUID randomness', () => {
    for (const kind of ['grass', 'kelp']) for (let variant = 0; variant < 25; variant++) {
      const height = kind === 'kelp' ? 5 + variant / 24 * 4 : .6 + variant / 24 * 1.3;
      const current = fixture(live, kind, height, variant), old = fixture(accepted, kind, height, variant), saved = buffers(current.geometry), meta = current.geometry.userData;
      try {
        const livePositions = Array.from(current.geometry.attributes.position.array), oldPositions = Array.from(old.geometry.attributes.position.array);
        if (kind === 'grass') expect(livePositions).toEqual(oldPositions);
        else {
          // Pass74 appends 24 tip vertices and moves the last six rows of each blade; all other kelp bytes stay exact.
          expect(livePositions.length).toBe(oldPositions.length + 24 * 3);
          const kept = [[0, 57], [141, 277], ...[0, 1, 2, 3].map(leaf => [57 + leaf * 21, 57 + leaf * 21 + 15])];
          for (const [from, to] of kept) expect(livePositions.slice(from * 3, to * 3)).toEqual(oldPositions.slice(from * 3, to * 3));
        }
        const uuid = current.geometry.uuid, materialUUID = current.material.uuid, random = Math.random; let globalDraws = 0;
        try { Math.random = () => { globalDraws++; return .375; }; live.configure(THREE, current.mesh, height, true); } finally { Math.random = random; }
        accepted.configure(THREE, old.mesh, height);
        expect(globalDraws).toBe(0); expect(current.geometry.uuid).toBe(uuid); expect(current.material.uuid).toBe(materialUUID); expect(current.mesh.children).toHaveLength(0);
        unchanged(current.geometry, saved); expect(current.geometry.userData).toBe(meta); expect(current.geometry.boundingBox).toEqual(old.geometry.boundingBox); expect(current.geometry.boundingSphere).toEqual(old.geometry.boundingSphere);
        const mask = current.geometry.attributes.clPlantRibbon; expect(mask.itemSize).toBe(1); expect(mask.count).toBe(current.geometry.attributes.position.count); expect(mask.version).toBe(0);
        const closed = new Set(); if (kind === 'kelp') for (const part of meta.clKelpBladders.parts) for (let at = part.vertexStart; at < part.vertexStart + part.vertexCount; at++) closed.add(at);
        for (let at = 0; at < mask.count; at++) expect(mask.getX(at)).toBe(closed.has(at) ? 0 : 1);
        expect(mask.array.byteLength).toBe(kind === 'kelp' ? 1204 : 132);
        expect(current.material.transparent).toBe(old.material.transparent); expect(current.material.opacity).toBe(old.material.opacity); expect(current.material.depthWrite).toBe(old.material.depthWrite); expect(current.material.side).toBe(old.material.side);
      } finally { current.dispose(); old.dispose(); }
    }
    expect(25 * 1204 + 80 * 132).toBe(40660);
  });

  it('retains one motion uniform and mask across compilation and pause or reduced-motion updates, including instanced grass', () => {
    for (const kind of ['grass', 'kelp']) {
      const plant = fixture(live, kind, kind === 'kelp' ? 8.7 : 1.8, 7);
      try {
        const { motion } = compiled(plant, true), saved = buffers(plant.geometry), uniform = motion.value, mask = plant.geometry.attributes.clPlantRibbon;
        for (let iteration = 0; iteration < 3; iteration++) {
          const shader = standardShader(); plant.material.onBeforeCompile(shader);
          expect(shader.uniforms.clPlantMotion).toBe(motion); expect(plant.material.customProgramCacheKey()).toBe('cl-plant-flex-v58-rib-relief');
          expect(shader.vertexShader).toContain('attribute float clPlantRibbon; varying vec3 clPlantTissue;'); expect(shader.vertexShader).toContain('clPlantTissue=vec3(uv,clPlantRibbon);');
          expect(shader.vertexShader).toContain('clPlantInstancePhase=dot(instanceMatrix[3].xz,vec2(7.1,11.3));'); expect(shader.vertexShader).toContain('objectNormal.y-=dot(clPlantSlope,objectNormal.xz);');
          expect(shader.fragmentShader.indexOf('float clPlantRibbonWeight=')).toBeLessThan(shader.fragmentShader.indexOf('#include <roughnessmap_fragment>'));
          expect(shader.fragmentShader.indexOf('reflectedLight.directDiffuse+=diffuseColor')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <lights_fragment_end>'));
          expect(plant.material.extensions.derivatives).toBe(true);
        }
        for (const now of [1200, 16000, 1e9, 1e12]) live.update(motion, now, 2.7, kind === 'grass' ? .001 : .0008, false);
        const paused = uniform.toArray(); expect(motion.value.toArray()).toEqual(paused);
        live.update(motion, 1e12 + 1000, 2.7, .0008, true); const reduced = uniform.toArray(); live.update(motion, 1e12 + 4000, 2.7, .0008, true);
        expect(motion.value).toBe(uniform); expect(motion.value.toArray()).toEqual(reduced); expect(reduced).toEqual([...paused.slice(0, 3), 0]); expect(reduced.every(Number.isFinite)).toBe(true);
        expect(plant.geometry.attributes.clPlantRibbon).toBe(mask); unchanged(plant.geometry, saved);
      } finally { plant.dispose(); }
    }
  });

  it('bounds tissue colour and roughness while high-frequency grain vanishes when a pixel cannot resolve it', () => {
    for (const footprint of [-1, 0, .1, .35, .7, 1.2, 10, 1e12, Infinity]) {
      const filtered = filter(footprint); expect(Number.isFinite(filtered)).toBe(true); expect(filtered).toBeGreaterThanOrEqual(0); expect(filtered).toBeLessThanOrEqual(1);
      if (footprint >= 1.2) expect(filtered).toBe(0);
    }
    expect(filter(.35)).toBe(1);
    expect(surfaceShader.fragmentShader).toContain('clPlantTissueFilter(fwidth(clPlantTissue.x)/0.057)');
    const nearMidrib = filter(.001 / .057), unresolvedMidrib = filter(.10 / .057);
    expect(nearMidrib).toBe(1); expect(unresolvedMidrib).toBe(0);
    for (let ix = 0; ix <= 48; ix++) for (let iy = 0; iy <= 48; iy++) for (const pixel of [.001, .01, .1, 1]) {
      const x = ix / 48, y = iy / 48, epsilon = 1e-5;
      const dx = (phase(x + epsilon, y, Math.sin) - phase(x - epsilon, y, Math.sin)) / (2 * epsilon), dy = (phase(x, y + epsilon, Math.sin) - phase(x, y - epsilon, Math.sin)) / (2 * epsilon);
      const footprint = (Math.abs(dx) + Math.abs(dy)) * pixel, aa = filter(footprint), grain = Math.sin(phase(x, y, Math.sin)) * aa;
      const across = Math.abs(x - .5), vein = (1 - smoothstep(.018, .075, across)) * filter(pixel / .057), edge = smoothstep(.29, .49, across), value = tone(vein, edge, grain);
      expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(.912); expect(value).toBeLessThanOrEqual(1.05300000001);
      for (const base of [.86, .95]) { const finished = finishRoughness(base, 1, vein, grain, clamp, mix); expect(finished).toBeGreaterThanOrEqual(.832 - 1e-12); expect(finished).toBeLessThanOrEqual(.946 + 1e-12); }
      if (footprint >= 1.2) expect(Math.abs(grain)).toBe(0);
    }
    for (const base of [.01, .20, .82, .86, .95, .99, 1]) for (const vein of [0, .5, 1]) for (const grain of [-1, 0, 1]) expect(finishRoughness(base, 0, vein, grain, clamp, mix)).toBe(base);
  });

  it('ties backlight to actual directional colour and intensity, leaves floats unlit, and changes neither alpha nor emissive radiance', () => {
    const fragment = surfaceShader.fragmentShader, inserted = fragment.split('#include <lights_fragment_end>\n')[1].split('#include <aomap_fragment>')[0];
    expect(inserted).toContain('#if NUM_DIR_LIGHTS > 0'); expect(inserted).toContain('max(0.0,-dot(geometry.normal,directionalLights[0].direction))');
    expect(inserted).toContain('directionalLights[0].color'); expect(inserted).not.toContain('emissive'); expect(fragment).not.toContain('diffuseColor.a*=');
    const diffuse = [.10, .18, .035], light = [.8, 1.0, .7], lit = (weight, backlight, edge, intensity, variation, aa) => diffuse.map((value, i) => value * light[i] * intensity * backlightWeight(weight, backlight, edge, variation, aa));
    for (const edge of [0, .5, 1]) for (const variation of [-1, 0, 1]) for (const aa of [0, 1]) {
      expect(lit(0, 1, edge, 1, variation, aa)).toEqual([0, 0, 0]); expect(lit(1, 0, edge, 1, variation, aa)).toEqual([0, 0, 0]); expect(lit(1, 1, edge, 0, variation, aa)).toEqual([0, 0, 0]);
      const full = lit(1, 1, edge, 1, variation, aa), half = lit(1, 1, edge, .5, variation, aa);
      // Accepted .18-.26 transmission, with the Pass74 edge variation of at most 16% (plant_rib_relief bound .3016).
      expect(full.every((value, i) => value >= 0 && value <= diffuse[i] * light[i] * .3016 + 1e-12)).toBe(true); expect(half).toEqual(full.map(value => value * .5));
      if (aa === 0 || variation === 0) expect(full.every((value, i) => value <= diffuse[i] * light[i] * .26 + 1e-12)).toBe(true);
    }
  });
});
