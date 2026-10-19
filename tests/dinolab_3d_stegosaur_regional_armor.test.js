import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THREE, vec, nativeTailHarness } from './helpers/dino_native_tail_harness.js';

const source = readFileSync(process.env.DINO_STEGOSAUR_ARMOR_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
window.StemLab = { registerTool() {} };
new Function(source.replace(registration, 'globalThis.__regionalArmor = { DINOS, dinoStegosaurArmorProfileFor, dinoStegosaurArmorReference, dinoStegosaurArmorLayout, dinoStegosaurArmorGeometry, dinoSurfaceGeometry, dinoTorsoRadii, dinoTailSkinEnvelope, dinoPlateGeometry, dinoKeratinGeometry, dinoDetailedBodyPartDefinitions, dinoPartInspectionFor, dinoStudyBounds };' + registration))();
const art = globalThis.__regionalArmor; delete globalThis.__regionalArmor;
const native = nativeTailHarness(source);
const modes = [{ bodyHeightScale: .91, bodyDepthScale: .89, tailSoftTissueScale: .90 },
  { bodyHeightScale: .98, bodyDepthScale: .98, tailSoftTissueScale: .97 },
  { bodyHeightScale: 1, bodyDepthScale: 1, tailSoftTissueScale: 1 }];
const ids = ['kentrosaurus', 'tuojiangosaurus', 'hesperosaurus'];
function section(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b < a) throw Error(start); return source.slice(a, b); }
function extract(name) {
  const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
  if (start < 0) throw Error(name);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
  return source.slice(start, end);
}
const evaluate = (code, result, context) => new Function('context', 'with(context){' + code + '\nreturn ' + result + ';}')(context);
function frameOf(context) { return Object.fromEntries(['ht', 'detailScale', 'hip', 'shoulder', 'tail', 'pelvisCenter', 'bodyHeight', 'bodyDepth', 'torsoPoints', 'postcranialSurface', 'reconstructionProfile'].map(key => [key, context[key]])); }
const torsoCode = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
const tailCode = section('var tailMidA =', 'var tailSurfaceCurve =');
const baseCode = source.match(/^\s*var tailBaseRadius =.*;$/m)[0];
function contextFor(id, scale) {
  const built = native.build(scale, 1, false, id), context = built.context;
  // Retain native anchor and builder execution; expose the native station array.
  Object.assign(context, evaluate(torsoCode, '({bodyShell,pelvisCenter,surfaceBodyHeight,surfaceBodyDepth,torsoPoints})', context));
  Object.assign(context, art);
  return { built, context, frame: frameOf(context) };
}
function actualSkin(context, mode) {
  const old = context.surfaceHypothesis; context.surfaceHypothesis = mode;
  const before = new Set(context.model.children);
  Object.assign(context, evaluate(torsoCode, '({bodyShell,pelvisCenter,surfaceBodyHeight,surfaceBodyDepth})', context));
  context.tailBaseRadius = evaluate(baseCode, 'tailBaseRadius', context);
  Object.assign(context, evaluate(tailCode, '({tailMeshes,tailSkinEnvelope})', context));
  context.model.updateMatrixWorld(true); context.surfaceHypothesis = old;
  const result = { torso: context.bodyShell, tail: context.tailMeshes[0] };
  return { ...result, dispose() { context.model.children.slice().filter(child => !before.has(child)).forEach(child => { child.geometry?.dispose(); context.model.remove(child); }); } };
}
function meshFor(entry, core, material) {
  const mesh = new THREE.Mesh(art.dinoStegosaurArmorGeometry(THREE, entry, core), material);
  mesh.position.fromArray(entry.root); mesh.updateMatrixWorld(true); return mesh;
}
// Point containment uses the real closed triangles, with an XY bucket index
// for Z intersections. It does not replace armor or skin by analytical shapes.
function contains(mesh, tolerance) {
  mesh.updateMatrixWorld(true);
  const p = mesh.geometry.attributes.position, ix = mesh.geometry.index;
  const vertices = Array.from({ length: p.count }, (_, i) => vec().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  const box = new THREE.Box3().setFromPoints(vertices), cells = 40, grid = new Map();
  const gx = x => Math.max(0, Math.min(cells - 1, Math.floor((x - box.min.x) / Math.max(1e-20, box.max.x - box.min.x) * (cells - 1))));
  const gy = y => Math.max(0, Math.min(cells - 1, Math.floor((y - box.min.y) / Math.max(1e-20, box.max.y - box.min.y) * (cells - 1))));
  for (let i = 0; i < ix.count; i += 3) {
    const a = vertices[ix.getX(i)], b = vertices[ix.getX(i + 1)], c = vertices[ix.getX(i + 2)];
    const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(d) < tolerance * tolerance * 1e-8) continue;
    const tri = { a, b, c, d };
    for (let x = gx(Math.min(a.x, b.x, c.x)); x <= gx(Math.max(a.x, b.x, c.x)); x++) for (let y = gy(Math.min(a.y, b.y, c.y)); y <= gy(Math.max(a.y, b.y, c.y)); y++) {
      const key = x * cells + y, bucket = grid.get(key) || []; bucket.push(tri); grid.set(key, bucket);
    }
  }
  return point => {
    if (point.x < box.min.x - tolerance || point.x > box.max.x + tolerance || point.y < box.min.y - tolerance || point.y > box.max.y + tolerance) return false;
    let min = Infinity, max = -Infinity;
    for (const { a, b, c, d } of grid.get(gx(point.x) * cells + gy(point.y)) || []) {
      const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / d;
      const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / d, w = 1 - u - v;
      if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
      const z = u * a.z + v * b.z + w * c.z; min = Math.min(min, z); max = Math.max(max, z);
    }
    return point.z >= min - tolerance && point.z <= max + tolerance;
  };
}
function buffers(geometry) { return { position: Array.from(geometry.attributes.position.array), index: Array.from(geometry.index.array) }; }
function runArmor(context, baseline = false) {
  // The native tail harness stops before idle-motion registration. Execute the
  // production assignment so armor attachment is checked against its real mesh.
  const tailMotionCaller = source.match(/^\s*idleMotion.tail = tailMeshes\[0\];$/m)?.[0];
  if (!tailMotionCaller) throw Error('Missing native tail-motion assignment');
  evaluate(tailMotionCaller, 'undefined', context);
  context.bodyPartDefinitions = art.dinoDetailedBodyPartDefinitions(context.dn, true, 'evidence');
  const names = ['dorsalSurfacePoint', 'hasAnatomyPart', 'dinoMarkSpecialPart', 'addRegionalStegosaurArmor', 'addDorsalPlates', 'addTailSpikes', 'addAccentCone', 'addSkeletonCone'];
  let code = 'var reviewedStegosaurArmor = null;\n' + names.map(extract).join('\n');
  if (baseline) code = code.replace("              if (addRegionalStegosaurArmor(mat, mat === boneMat, 'plate')) return;\n", '').replace("              if (addRegionalStegosaurArmor(mat, !surface, 'spike')) return;\n", '');
  const before = new Set(); context.model.traverse(object => before.add(object));
  evaluate(code + '\naddDorsalPlates(bodyMat,1);addTailSpikes(bodyMat,true);addDorsalPlates(boneMat,.92);addTailSpikes(boneMat,false);', 'undefined', context);
  context.model.updateMatrixWorld(true);
  const meshes = []; context.model.traverse(object => { if (object.isMesh && !before.has(object)) meshes.push(object); });
  return meshes;
}

describe('Three regional stegosaur armor profiles', () => {
  it('gates every helper to exactly the three reviewed ornithischians', () => {
    for (const dn of art.DINOS.filter(dino => !ids.includes(dino.id))) {
      expect(art.dinoStegosaurArmorProfileFor(dn), dn.id).toBeNull();
      expect(art.dinoStegosaurArmorReference(THREE, dn, {}), dn.id).toBeNull();
      expect(art.dinoStegosaurArmorLayout(THREE, dn, {}), dn.id).toBeNull();
    }
    for (const id of ids) expect(art.dinoStegosaurArmorProfileFor({ id, group: 'other' })).toBeNull();
  });
  for (const id of ids) for (const scale of [.05, 1, 8]) {
    it(id + ' seats fixed native armor, nests cores and preserves anatomy at scale ' + scale, () => {
      const { built, context, frame } = contextFor(id, scale), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const geometries = [], references = [];
      try {
        const before = built.model.children.slice(), reference = art.dinoStegosaurArmorReference(THREE, context.dn, frame);
        references.push(reference);
        expect(reference.torso.parent).toBeNull(); expect(reference.tail.parent).toBeNull();
        expect(built.model.children).toEqual(before);
        const nativeTorso = art.dinoSurfaceGeometry(THREE, frame.torsoPoints, art.dinoTorsoRadii(frame.bodyHeight * .90, frame.bodyDepth * .89, frame.postcranialSurface), { smoothProfile: true });
        geometries.push(nativeTorso);
        expect(buffers(reference.torso.geometry)).toEqual(buffers(nativeTorso));
        const nativeTail = art.dinoSurfaceGeometry(THREE, reference.envelope.points, reference.envelope.radii, { smoothProfile: true }); geometries.push(nativeTail);
        expect(buffers(reference.tail.geometry)).toEqual(buffers(nativeTail));
        const minimalSkin = actualSkin(context, { bodyHeightScale: .90, bodyDepthScale: .89, tailSoftTissueScale: .90 });
        try {
          expect(context.tailSkinEnvelope.points.map(point => point.toArray())).toEqual(reference.envelope.points.map(point => point.toArray()));
          expect(context.tailSkinEnvelope.radii).toEqual(reference.envelope.radii);
        } finally { minimalSkin.dispose(); }
        const entries = art.dinoStegosaurArmorLayout(THREE, context.dn, frame);
        expect(entries).toHaveLength(id === 'hesperosaurus' ? 12 : 18);
        expect(built.model.children).toEqual(before);
        const outer = entries.map(entry => meshFor(entry, false, material)), cores = entries.map(entry => meshFor(entry, true, material));
        geometries.push(...outer.map(mesh => mesh.geometry), ...cores.map(mesh => mesh.geometry));
        const coverContains = outer.map(mesh => contains(mesh, context.ht * 2e-6));
        for (const mesh of [...outer, ...cores]) {
          expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
          expect(mesh.geometry.userData.dinoStegosaurArmor.sampledArrangement).toBe(true);
        }
        if (id === 'kentrosaurus') {
          expect(entries.filter(e => e.kind === 'plate')).toHaveLength(8);
          expect(entries.filter(e => e.kind === 'spike' && e.region === 'torso')).toHaveLength(2);
          expect(entries.filter(e => e.kind === 'spike' && e.region === 'tail')).toHaveLength(8);
        }
        if (id === 'tuojiangosaurus') expect(new Set(entries.filter(e => e.kind === 'plate').map(e => e.shape))).toEqual(new Set(['pear', 'triangle', 'lance']));
        if (id === 'hesperosaurus') for (let index = 0; index < entries.length; index++) if (entries[index].kind === 'plate') {
          const box = outer[index].geometry.boundingBox, size = box.getSize(vec());
          expect(size.x, 'long-low plate ' + index).toBeGreaterThan(size.y);
        }
        const armorSignature = entries.map((entry, index) => ({ entry, core: buffers(cores[index].geometry), covering: buffers(outer[index].geometry) }));
        for (const mode of modes) {
          const skin = actualSkin(context, mode);
          try {
            const inside = { torso: contains(skin.torso, context.ht * 2e-6), tail: contains(skin.tail, context.ht * 2e-6) };
            const failures = [];
            for (let index = 0; index < entries.length; index++) {
              const entry = entries[index], root = vec().fromArray(entry.root);
              expect(inside[entry.region](root), JSON.stringify({ id, scale, mode, index, root: root.toArray() })).toBe(true);
              const coveringPositions = outer[index].geometry.attributes.position;
              if (entry.kind === 'spike') {
                // All radial base vertices, rather than only the center, must
                // disappear into the actual rendered skin in every mode.
                for (let vertex = 0; vertex < 24; vertex++) {
                  const point = vec().fromBufferAttribute(coveringPositions, vertex).applyMatrix4(outer[index].matrixWorld);
                  expect(inside[entry.region](point), 'floating spike base ' + JSON.stringify({ id, index, vertex, point: point.toArray(), mode })).toBe(true);
                }
              } else {
                for (let sample = 0; sample <= 6; sample++) {
                  const dx = entry.width * (sample / 6 - .5) * .54;
                  const t = (dx / entry.width + .5) * 12, lo = Math.min(11, Math.floor(t));
                  const y = entry.roof[lo] + (entry.roof[lo + 1] - entry.roof[lo]) * (t - lo) - entry.bury;
                  expect(inside[entry.region](vec(entry.root[0] + dx, y, entry.root[2])), 'floating plate base ' + JSON.stringify({ id, index, sample, mode })).toBe(true);
                }
              }
              const positions = cores[index].geometry.attributes.position;
              for (let vertex = 0; vertex < positions.count; vertex++) {
                const point = vec().fromBufferAttribute(positions, vertex).applyMatrix4(cores[index].matrixWorld);
                if (!coverContains[index](point) && !inside[entry.region](point)) failures.push({ index, vertex, point: point.toArray() });
              }
            }
            expect(failures.slice(0, 8), 'exposed core count ' + failures.length + ' in ' + JSON.stringify(mode)).toEqual([]);
            if (mode === modes[0]) {
              const collisions = [];
              const boxes = outer.map(mesh => mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
              for (let a = 0; a < entries.length; a++) for (let b = a + 1; b < entries.length; b++) {
                if (!boxes[a].intersectsBox(boxes[b])) continue;
                for (const [from, to] of [[a, b], [b, a]]) {
                  const positions = outer[from].geometry.attributes.position;
                  for (let vertex = 0; vertex < positions.count; vertex++) {
                    const point = vec().fromBufferAttribute(positions, vertex).applyMatrix4(outer[from].matrixWorld);
                    if (coverContains[to](point) && !inside.torso(point) && !inside.tail(point)) { collisions.push({ from, to, vertex }); break; }
                  }
                }
              }
              expect(collisions, 'visible armor intersections').toEqual([]);
            }
            const repeated = art.dinoStegosaurArmorLayout(THREE, context.dn, frame);
            expect(repeated).toEqual(entries);
            expect(entries.map((entry, index) => ({ entry, core: buffers(cores[index].geometry), covering: buffers(outer[index].geometry) }))).toEqual(armorSignature);
          } finally { skin.dispose(); }
        }
      } finally { for (const reference of references) reference.dispose(); for (const geometry of geometries) geometry.dispose(); material.dispose(); built.dispose(); }
    }, 30000);
  }
  it('disposes private reference resources before the layout can enter bounds or motion capture', () => {
    const { built, context, frame } = contextFor('kentrosaurus', 1);
    const geometryDispose = THREE.BufferGeometry.prototype.dispose, materialDispose = THREE.Material.prototype.dispose;
    let geometries = 0, materials = 0;
    try {
      THREE.BufferGeometry.prototype.dispose = function () { geometries++; return geometryDispose.call(this); };
      THREE.Material.prototype.dispose = function () { materials++; return materialDispose.call(this); };
      const before = built.model.children.slice();
      art.dinoStegosaurArmorLayout(THREE, context.dn, frame);
      expect(geometries).toBe(2); expect(materials).toBe(1); expect(built.model.children).toEqual(before);
    } finally { THREE.BufferGeometry.prototype.dispose = geometryDispose; THREE.Material.prototype.dispose = materialDispose; built.dispose(); }
  });
  it('uses native callers, correct part ownership and source-linked exploration boundaries', () => {
    for (const id of ids) {
      const { built, context } = contextFor(id, 1), boneMaterial = new THREE.MeshBasicMaterial(); context.boneMat = boneMaterial;
      try {
        const meshes = runArmor(context), cores = meshes.filter(mesh => mesh.userData.dinoStegosaurArmor.core);
        expect(meshes).toHaveLength(id === 'hesperosaurus' ? 24 : 36); expect(cores).toHaveLength(meshes.length / 2);
        for (const mesh of meshes) {
          const spike = mesh.userData.dinoFeature.includes('spike');
          expect(mesh.userData.dinoPartIds).toEqual([spike ? 'spikes' : 'plates']);
          if (mesh.userData.dinoRegion === 'tail') expect(mesh.parent).toBe(context.idleMotion.tail);
        }
        const parts = art.dinoDetailedBodyPartDefinitions(context.dn, true, 'evidence');
        if (id === 'kentrosaurus') {
          const spikes = parts.find(part => part.id === 'spikes');
          expect(spikes.label).toBe('Posterior spines'); expect(spikes.region).toBe('full');
          expect(meshes.filter(mesh => mesh.userData.dinoFeature === 'dorsal-spike')).toHaveLength(4);
        }
        for (const partId of ['plates', 'spikes']) {
          const inspection = art.dinoPartInspectionFor(context.dn, parts.find(part => part.id === partId));
          expect(inspection.source.url).toBe(art.dinoStegosaurArmorProfileFor(context.dn).source);
          expect(inspection.limit.includes('not an exact fossil count')).toBe(true);
          expect(inspection.life.includes('not the osteoderm anchors')).toBe(true);
        }
      } finally { built.dispose(); boneMaterial.dispose(); }
    }
  });
  it('retains exact legacy plate and spike geometry for Stegosaurus and Gigantspinosaurus', () => {
    for (const id of ['stegosaurus', 'tuojiangosaurus2']) for (const scale of [.05, 1, 8]) {
      const { built, context } = contextFor(id, scale);
      try {
        const actual = runArmor(context), control = runArmor(context, true);
        const signature = meshes => meshes.map(mesh => ({ geometry: buffers(mesh.geometry), position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), data: mesh.userData }));
        expect(signature(actual)).toEqual(signature(control));
      } finally { built.dispose(); }
    }
  });
});
