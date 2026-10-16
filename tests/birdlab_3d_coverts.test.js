import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const engine = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engine);

// Stub only canvas painting. Exercise the production mesh batches, custom
// material hooks, pose writer and resource ownership with bundled Three.js.
function fixture(withCrest = true) {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width: 16, height: 16, getContext: () => context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: canvas,
    createVaneDetailCanvases: () => ({ normal: canvas(), roughness: canvas() }),
  } };
  // Suppress only the displacement at its use site. All production feather
  // construction, atlas choices and morph generation remain identical.
  if (!withCrest && source.split('+ shaftCrest').length !== 2) throw new Error('Missing unique shaft crest displacement');
  const fixtureSource = withCrest ? source : source.replace('+ shaftCrest', '+ 0');
  new Function('window', 'document', fixtureSource)(local, { createElement: canvas });
  return local.BirdLab3DBird.create(THREE);
}
const pose = time => ({ ...engine.BirdLab3D.sampleFlight(time).pose,
  flapPhase: engine.BirdLab3D.sampleWingPhase(time), elapsedTime: time });

describe('BirdLab distinct covert plumage', () => {
  it('raises a bounded narrow shaft only inside coverts, retaining attached roots, tips, edges and all other geometry', () => {
    const bird = fixture(), flat = fixture(false);
    const allMeshes = model => { const meshes = []; model.root.traverse(object => { if (object.geometry) meshes.push(object); }); return meshes; };
    try {
      expect(bird.getStats()).toEqual(flat.getStats());
      const meshes = allMeshes(bird), references = allMeshes(flat);
      expect(meshes.length).toBe(references.length);
      // The live carpal bridge has already been folded by create(); inspect
      // its retained authored source to measure the actual geometric crest.
      const authored = (model, mesh) => {
        const wing = model.joints.wings.find(candidate => candidate.bridge.mesh === mesh);
        return wing ? new THREE.BufferAttribute(wing.bridge.source, 3) : mesh.geometry.attributes.position;
      };
      let raisedFeathers = 0;
      meshes.forEach((mesh, meshIndex) => {
        const reference = references[meshIndex], g = mesh.geometry, original = reference.geometry;
        expect(mesh.name).toBe(reference.name);
        expect(g.index && g.index.array).toEqual(original.index && original.index.array);
        for (const [name, attribute] of Object.entries(g.attributes)) if (name !== 'position' && name !== 'normal') expect(attribute.array).toEqual(original.attributes[name].array);
        const position = authored(bird, mesh), before = authored(flat, reference), style = g.attributes.birdFeatherStyle;
        expect(position.count).toBe(before.count);
        if (!style) { expect(position.array).toEqual(before.array); return; }
        for (let first = 0; first < style.count; first += 40) {
          const covert = style.getX(first) === 1;
          let highest = 0;
          for (let vertex = first; vertex < first + 40; vertex++) {
            const column = (vertex - first) % 5, along = 1 - g.attributes.uv.getY(vertex);
            const rise = position.getY(vertex) - before.getY(vertex);
            expect(position.getX(vertex)).toBe(before.getX(vertex));
            expect(position.getZ(vertex)).toBe(before.getZ(vertex));
            if (!covert || along === 0 || along === 1 || column === 0 || column === 4) expect(rise).toBe(0);
            else {
              expect(rise).toBeGreaterThanOrEqual(0);
              expect(rise).toBeLessThanOrEqual(.000381);
              highest = Math.max(highest, rise);
              if (column === 1 || column === 3) {
                const center = vertex + (2 - column), centerRise = position.getY(center) - before.getY(center);
                expect(rise).toBeLessThan(centerRise * .15 + 1e-8);
              }
            }
          }
          if (covert) { expect(highest).toBeGreaterThan(.0002); raisedFeathers++; }
          else expect(highest).toBe(0);
        }
      });
      expect(raisedFeathers).toBe(2 * (33 + 39 + 42));
      const [left, right] = bird.joints.wings, [leftFlat, rightFlat] = flat.joints.wings;
      left.meshes.forEach((mesh, meshIndex) => {
        const lp = authored(bird, mesh), rp = authored(bird, right.meshes[meshIndex]);
        const lb = authored(flat, leftFlat.meshes[meshIndex]), rb = authored(flat, rightFlat.meshes[meshIndex]);
        for (let vertex = 0; vertex < lp.count; vertex++) expect(lp.getY(vertex) - lb.getY(vertex)).toBeCloseTo(rp.getY(vertex) - rb.getY(vertex), 8);
      });
    } finally { bird.dispose(); flat.dispose(); }
  });

  it('keeps displaced and folded surfaces finite, nondegenerate and consistently oriented', () => {
    const bird = fixture(), flat = fixture(false);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3(), referenceNormal = new THREE.Vector3();
    const faceNormal = (position, index, face, output) => {
      a.fromBufferAttribute(position, index.getX(face)); b.fromBufferAttribute(position, index.getX(face + 1)); c.fromBufferAttribute(position, index.getX(face + 2));
      return output.crossVectors(b.sub(a), c.sub(a));
    };
    try {
      for (const time of [0, 4.26, 10, 33, 39.5]) {
        bird.update(pose(time), 0); flat.update(pose(time), 0);
        bird.joints.wings.forEach((wing, wingIndex) => wing.meshes.forEach((mesh, meshIndex) => {
          const g = mesh.geometry, original = flat.joints.wings[wingIndex].meshes[meshIndex].geometry;
          const surfaces = [[g.attributes.position, g.attributes.normal, original.attributes.position],
            ...(g.morphAttributes.position || []).map((position, index) => [position, g.morphAttributes.normal[index], original.morphAttributes.position[index]])];
          for (const [position, normals, before] of surfaces) {
            for (let vertex = 0; vertex < position.count; vertex++) {
              a.fromBufferAttribute(position, vertex); normal.fromBufferAttribute(normals, vertex);
              if (![a.x, a.y, a.z, normal.x, normal.y, normal.z].every(Number.isFinite) || Math.abs(normal.length() - 1) > 1e-5) throw new Error('Invalid covert position or normal');
            }
            for (let face = 0; face < g.index.count; face += 3) {
              if (g.attributes.birdFeatherStyle.getX(g.index.getX(face)) !== 1) continue;
              faceNormal(position, g.index, face, normal); faceNormal(before, original.index, face, referenceNormal);
              if (normal.lengthSq() < 1e-22 || normal.dot(referenceNormal) <= 0) throw new Error(`Crest folds a face over at ${mesh.name}:${face / 3}`);
            }
          }
        }));
      }
    } finally { bird.dispose(); flat.dispose(); }
  });

  it('classifies only the three covert rows, with a constant mirrored seed on each whole feather', () => {
    const bird = fixture();
    try {
      for (const wing of bird.joints.wings) {
        let coverts = 0, other = 0;
        const seeds = new Set();
        for (const mesh of wing.meshes) {
          const g = mesh.geometry, style = g.attributes.birdFeatherStyle;
          expect(style.count).toBe(g.attributes.position.count);
          for (let first = 0; first < style.count; first += 40) {
            const flag = style.getX(first), seed = style.getY(first);
            expect([0,1]).toContain(flag); expect(seed).toBeGreaterThanOrEqual(0); expect(seed).toBeLessThan(1);
            for (let vertex = first + 1; vertex < first + 40; vertex++) {
              if (style.getX(vertex) !== flag || style.getY(vertex) !== seed) throw new Error('Pigment changes inside one feather');
            }
            if (flag) { coverts++; seeds.add(seed); }
            else { other++; expect(seed).toBe(0); }
            if (mesh.name.startsWith('slotted-primary-') || mesh.name === 'three-thumb-feathers') expect(flag).toBe(0);
          }
        }
        expect(coverts).toBe(33 + 39 + 42); expect(other).toBe(28 + 8 + 3);
        expect(seeds.size).toBe(coverts);
      }
      const [left, right] = bird.joints.wings;
      left.meshes.forEach((mesh, index) => expect(Array.from(mesh.geometry.attributes.birdFeatherStyle.array))
        .toEqual(Array.from(right.meshes[index].geometry.attributes.birdFeatherStyle.array)));
      for (const name of ['layered-crown-and-nape-plumes', 'layered-scapular-mantle-and-flank-plumes', 'layered-breast-and-belly-plumes']) {
        expect(bird.root.getObjectByName(name).geometry.attributes.birdFeatherStyle).toBeUndefined();
      }
    } finally { bird.dispose(); }
  });

  it('retains feather-local coordinates, morphs and resources through playback, pause and repeated seek', () => {
    const bird = fixture();
    try {
      const references = bird.joints.wings.flatMap(wing => wing.meshes.map(mesh => ({ mesh, g: mesh.geometry,
        uv: mesh.geometry.attributes.uv, style: mesh.geometry.attributes.birdFeatherStyle,
        uvValues: Array.from(mesh.geometry.attributes.uv.array), styleValues: Array.from(mesh.geometry.attributes.birdFeatherStyle.array),
        morphs: Object.values(mesh.geometry.morphAttributes).flat().map(attribute => [attribute, attribute.array]),
      })));
      const stats = bird.getStats();
      const snapshot = () => JSON.stringify(references.map(({ mesh }) => [...mesh.position.toArray(), ...mesh.quaternion.toArray(), ...mesh.morphTargetInfluences]));
      bird.update(pose(4.26), 0); const expected = snapshot();
      for (let time = 0; time <= 44; time += .2) bird.update(pose(time), 1 / 60);
      bird.update(pose(4.26), 1 / 144); expect(snapshot()).toBe(expected);
      bird.update(pose(4.26), 0); expect(snapshot()).toBe(expected);
      for (const ref of references) {
        expect(ref.mesh.geometry).toBe(ref.g); expect(ref.g.attributes.uv).toBe(ref.uv); expect(ref.g.attributes.birdFeatherStyle).toBe(ref.style);
        expect(Array.from(ref.uv.array)).toEqual(ref.uvValues); expect(Array.from(ref.style.array)).toEqual(ref.styleValues);
        const morphs = Object.values(ref.g.morphAttributes).flat();
        ref.morphs.forEach(([attribute, array], index) => { expect(morphs[index]).toBe(attribute); expect(morphs[index].array).toBe(array); });
      }
      expect(bird.getStats()).toMatchObject({ feathers: stats.feathers, geometries: stats.geometries, materials: stats.materials, textures: stats.textures });
    } finally { bird.dispose(); }
  });

  it('binds the existing unbarred texture with matching color space and releases shared resources once', () => {
    const bird = fixture();
    const mantle = bird.root.getObjectByName('layered-scapular-mantle-and-flank-plumes').material;
    let disposals = 0;
    mantle.map.addEventListener('dispose', () => disposals++);
    try {
      const wingMaterials = new Set(bird.joints.wings.flatMap(wing => wing.meshes.map(mesh => mesh.material)));
      expect(wingMaterials.size).toBe(2);
      for (const material of wingMaterials) {
        const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
        material.onBeforeCompile(shader);
        expect(shader.uniforms.blCovertMap.value).toBe(mantle.map);
        expect(shader.uniforms.blCovertMap.value.encoding).toBe(material.map.encoding);
        expect(material.map.encoding).toBe(THREE.sRGBEncoding);
        expect(material.normalMap).toBe(mantle.normalMap); expect(material.roughnessMap).toBe(mantle.roughnessMap);
        // Confirm the installed Three shader hook actually replaces its map
        // chunk; merely declaring a sampler would silently leave bars in place.
        expect(shader.fragmentShader).not.toContain('#include <map_fragment>');
        expect(shader.fragmentShader).toContain('texture2D(blCovertMap,vUv)');
        expect(shader.fragmentShader.match(/mapTexelToLinear\(/g)).toHaveLength(1);
        expect(shader.vertexShader).toContain('attribute vec2 birdFeatherStyle;');
      }
    } finally { bird.dispose(); bird.dispose(); }
    expect(disposals).toBe(1);
  });
});
