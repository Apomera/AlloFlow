import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const integrated = source.includes('function dinoLambeosaurCrestProfileFor(');
const helpers = integrated ? '' : readFileSync('tmp/dinolab-lambeosaur-crests-helpers.js', 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", helpers + "\nglobalThis.__lambeosaurCrest={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope,dinoNeckJunction,dinoSurfaceGeometry,dinoCranialGeometry,cranialSurfaceProfileFor,dinoCranialDisplayProfile,dinoLambeosaurCrestProfileFor,dinoLambeosaurCrestGeometry,dinoAddLambeosaurCrest,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor,dinoPartViewpointTaskFor};window.StemLab.registerTool('dinoLab'"))();
const art = globalThis.__lambeosaurCrest;
const species = ['parasaurolophus', 'corythosaurus', 'lambeosaurus', 'olorotitan'];
const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const animal = id => art.DINOS.find(d => d.id === id);

function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing native crest/head assembly seam: ' + start);
  return source.slice(a, b);
}

function nativeSurfaces(id, scale, softTissue = .90, transformed = false) {
  const dn = animal(id), model = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  if (transformed) { model.position.set(2, 3, -4); model.rotation.set(.2, .65, -.1); model.scale.set(1.7, .8, 1.2); }
  const context = { THREE, dn, len: dn.lengthM * scale, ht: dn.heightM * scale,
    isTheropod: false, isSauropod: false, cladeName: dn.clade,
    reconstructionProfile: art.reconstructionProfileFor(dn), posture: art.postureProfileFor(dn),
    cranialSurface: art.cranialSurfaceProfileFor(dn), postcranialSurface: art.postcranialSurfaceProfileFor(dn),
    surfaceHypothesis: { headSoftTissueScale: softTissue, neckSoftTissueScale: .88, bodyHeightScale: .91 },
    vec, headMat: material, bodyMat: material, model, props: { species: dn, showBody: true, showSkeleton: true },
    ...Object.fromEntries(['dinoTyrannosaurPose', 'dinoLongSnoutedTyrannosaurAnchors', 'dinoCervicalEnvelope', 'dinoNeckJunction', 'dinoCranialGeometry', 'dinoSurfaceGeometry'].map(key => [key, art[key]])) };
  context.addSoftTissueChain = new Function('context', 'with(context){' + section('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {', 'function addContourGroup(meshes)') + 'return addSoftTissueChain;}')(context);
  const assembly = section('var detailScale = Math.min(1, ht / 2);', 'var evidenceAnchorPoints =');
  const envelope = section('var surfaceHeadFactor = reconstructionProfile.head', 'if (headShell) {');
  const anchors = new Function('context', 'with(context){' + assembly + 'var surfaceBodyHeight=bodyHeight*surfaceHypothesis.bodyHeightScale;' + envelope + 'return {head,snout,headShell,detailScale,len,ht,reconstructionProfile};}')(context);
  const skullLength = Math.max(.20 * anchors.detailScale, anchors.len * .066) * anchors.reconstructionProfile.head;
  const skullHeight = Math.max(.045 * anchors.detailScale, anchors.ht * .058) * anchors.reconstructionProfile.head;
  const skullDepth = Math.max(.035 * anchors.detailScale, anchors.ht * .058) * anchors.reconstructionProfile.head;
  const display = art.dinoCranialDisplayProfile(THREE, dn, anchors.head, anchors.snout, skullLength, skullHeight, skullDepth, anchors.detailScale, false);
  const vault = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  vault.position.copy(display.vaultCenter); vault.scale.copy(display.vaultScale); model.add(vault);
  const life = art.dinoAddLambeosaurCrest(THREE, dn, model, anchors.head, anchors.len, anchors.ht, anchors.reconstructionProfile.head, material, false, anchors.headShell);
  const bone = art.dinoAddLambeosaurCrest(THREE, dn, model, anchors.head, anchors.len, anchors.ht, anchors.reconstructionProfile.head, material, true, vault);
  model.updateMatrixWorld(true);
  return { dn, model, material, skin: anchors.headShell, vault, life, bone, ...anchors };
}

function dispose(f) { f.model.traverse(mesh => { if (mesh.geometry) mesh.geometry.dispose(); }); f.material.dispose(); }

function insideByRay(mesh, point, center, tolerance) {
  const delta = point.clone().sub(center), length = delta.length();
  if (length === 0) return true;
  const hit = new THREE.Raycaster(center, delta.normalize(), 0, Infinity).intersectObject(mesh, false)[0];
  return !!hit && length <= hit.distance + tolerance;
}

describe('mature lambeosaur crests use distinct, rounded, nested external outlines', () => {
  it('limits the reviewed profiles to the exact four represented species', () => {
    expect(species.map(id => art.dinoLambeosaurCrestProfileFor(animal(id)).id)).toEqual(['parasaurolophus-tube', 'corythosaurus-helmet', 'lambeosaurus-hatchet', 'olorotitan-fan']);
    for (const dn of art.DINOS.filter(d => !species.includes(d.id))) expect(art.dinoLambeosaurCrestProfileFor(dn), dn.id).toBeNull();
    expect(art.dinoLambeosaurCrestProfileFor({ ...animal('parasaurolophus'), group: 'other' })).toBeNull();
    expect(art.dinoLambeosaurCrestProfileFor(null)).toBeNull();
    expect(art.dinoLambeosaurCrestGeometry(THREE, animal('edmontosaurus'), vec(0, 0), 10, 3, 1, true)).toBeNull();
    for (const bad of [0, -1, NaN, Infinity]) expect(art.dinoLambeosaurCrestGeometry(THREE, animal('parasaurolophus'), vec(0, 0), bad, 3, 1, true)).toBeNull();
  });

  it('keeps every smoothed sagittal outline star-shaped without self-crossing', () => {
    for (const id of species) {
      const p = art.dinoLambeosaurCrestProfileFor(animal(id));
      const center = vec(...p.center), curve = new THREE.CatmullRomCurve3(p.outline.slice().reverse().map(p => vec(...p)), true, 'centripetal');
      for (let n = 0; n < 2000; n++) {
        const a = curve.getPoint(n / 2000).sub(center), b = curve.getPoint(((n + 1) % 2000) / 2000).sub(center);
        expect(a.x * b.y - a.y * b.x, `${id} contour=${n}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(species.flatMap(id => [.04, 1, 6].map(scale => ({ id, scale }))))('seats and encloses the native crest of $id at scale $scale', ({ id, scale }) => {
    const f = nativeSurfaces(id, scale), b = f.bone, life = f.life;
    expect(b).not.toBeNull(); expect(life).not.toBeNull();
    expect(b.userData.dinoLambeosaurCrest.root).toEqual(life.userData.dinoLambeosaurCrest.root);
    for (const mesh of [b, life]) {
      const meta = mesh.userData.dinoLambeosaurCrest, g = mesh.geometry, p = g.attributes.position, normals = g.attributes.normal;
      expect(meta.surfaceSeated, `${id} ${meta.core ? 'bone' : 'life'}`).toBe(true);
      expect(meta.lumenModeled).toBe(false); expect(meta.wallThicknessMeasured).toBe(false);
      expect(meta.dimensionsInterpretive).toBe(true); expect(meta.coveringInterpretive).toBe(true);
      expect(mesh.userData.dinoPartIds).toContain('crest'); expect(mesh.userData.dinoRegion).toBe('head');
      expect(p.count).toBeLessThan(2000);
      for (const attr of ['position', 'normal', 'uv']) expect(Array.from(g.attributes[attr].array).every(Number.isFinite)).toBe(true);
      for (let n = 0; n < normals.count; n++) expect(new THREE.Vector3().fromBufferAttribute(normals, n).length()).toBeCloseTo(1, 5);
      const center = new THREE.Vector3().fromArray(meta.center), edges = new Map();
      let volume = 0;
      for (let t = 0; t < g.index.count; t += 3) {
        const ids = [g.index.getX(t), g.index.getX(t + 1), g.index.getX(t + 2)];
        const [a, b, c] = ids.map(n => new THREE.Vector3().fromBufferAttribute(p, n));
        const normal = b.clone().sub(a).cross(c.clone().sub(a)), radial = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center);
        expect(normal.dot(radial), `${id} scale=${scale} triangle=${t / 3}`).toBeGreaterThan(Math.pow(scale, 3) * 1e-12);
        volume += a.clone().sub(center).dot(b.clone().sub(center).cross(c.clone().sub(center))) / 6;
        for (let k = 0; k < 3; k++) {
          const a = ids[k], b = ids[(k + 1) % 3], key = [a, b].sort((a, b) => a - b).join(':');
          const edge = edges.get(key) || { count: 0, direction: 0 };
          edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
        }
      }
      expect(volume).toBeGreaterThan(0);
      expect([...edges.values()].every(edge => edge.count === 2 && edge.direction === 0)).toBe(true);
      expect(g.boundingBox.max.z - g.boundingBox.min.z).toBeGreaterThan(meta.frame.height * .35);
      const root = mesh.localToWorld(new THREE.Vector3().fromArray(meta.root));
      const supporting = meta.core ? f.vault : f.skin;
      const supportCenter = f.model.localToWorld(f.head.clone());
      expect(insideByRay(supporting, root, supportCenter, scale * 1e-6), `${id} actual buried root`).toBe(true);
      expect(insideByRay(mesh, root, mesh.localToWorld(center.clone()), scale * 1e-6), `${id} crest root is inside crest volume`).toBe(true);
      let basalVertices = 0;
      for (let n = 0; n < p.count; n++) {
        const point = new THREE.Vector3().fromBufferAttribute(p, n);
        if (point.y > f.head.y + meta.frame.height * .65) continue;
        basalVertices++;
        expect(insideByRay(supporting, mesh.localToWorld(point.clone()), supportCenter, scale * 1e-6), `${id} core=${meta.core} basal circumference vertex=${n} coordinate=${point.clone().sub(f.head).toArray()}`).toBe(true);
      }
      expect(basalVertices).toBeGreaterThan(10);
    }
    const positions = b.geometry.attributes.position, center = life.localToWorld(new THREE.Vector3().fromArray(life.userData.dinoLambeosaurCrest.center));
    for (let n = 0; n < positions.count; n++) {
      const point = b.localToWorld(new THREE.Vector3().fromBufferAttribute(positions, n));
      expect(insideByRay(life, point, center, scale * 1e-6), `${id} scale=${scale} bone vertex=${n}`).toBe(true);
    }
    dispose(f);
  });

  it('keeps bony geometry fixed across soft-tissue hypotheses and parent poses', () => {
    for (const id of species) {
      const lean = nativeSurfaces(id, 1, .90), full = nativeSurfaces(id, 1, 1.13), posed = nativeSurfaces(id, 1, .90, true);
      const actual = lean.bone.geometry.attributes.position.array;
      expect(full.bone.geometry.attributes.position.array).toEqual(actual);
      expect(posed.bone.geometry.attributes.position.array).toEqual(actual);
      expect(lean.life.geometry.attributes.position.array).toEqual(full.life.geometry.attributes.position.array);
      expect(posed.bone.userData.dinoLambeosaurCrest.surfaceSeated).toBe(true);
      expect(posed.life.userData.dinoLambeosaurCrest.surfaceSeated).toBe(true);
      for (const f of [lean, full, posed]) dispose(f);
    }
  });

  it('retains a rounded cross-section along the long Parasaurolophus rear shaft', () => {
    const f = nativeSurfaces('parasaurolophus', 1), g = f.bone.geometry, p = g.attributes.position;
    const meta = f.bone.userData.dinoLambeosaurCrest, station = f.head.x + meta.frame.length * 1.4, slice = [];
    for (let t = 0; t < g.index.count; t += 3) {
      const ids = [g.index.getX(t), g.index.getX(t + 1), g.index.getX(t + 2)];
      for (let k = 0; k < 3; k++) {
        const a = new THREE.Vector3().fromBufferAttribute(p, ids[k]), b = new THREE.Vector3().fromBufferAttribute(p, ids[(k + 1) % 3]);
        if ((a.x - station) * (b.x - station) <= 0 && a.x !== b.x) slice.push(a.lerp(b, (station - a.x) / (b.x - a.x)));
      }
    }
    expect(slice.length).toBeGreaterThan(40);
    expect(Math.max(...slice.map(p => p.z)) - Math.min(...slice.map(p => p.z))).toBeGreaterThan(meta.frame.height * .22);
    expect(Math.max(...slice.map(p => p.y)) - Math.min(...slice.map(p => p.y))).toBeGreaterThan(meta.frame.height * .15);
    dispose(f);
  });

  it('preserves every original fallback primitive exactly for unreviewed species', () => {
    const normalized = source.replace(/\r/g, '');
    const a = normalized.indexOf('                  var crestBase = head.clone().add(vec(len * 0.010, surfaceHeadHeight * 0.70, 0));');
    const b = normalized.indexOf("                }\n                dinoTagSpecialParts(cranialFeatureBefore, 'crest');", a);
    const c = normalized.indexOf('                  var crestBaseBone = head.clone().add(vec(skullLength * 0.12, skullHeight * 0.64, 0));');
    const d = normalized.indexOf("                  dinoTagSpecialParts(crestPartsBefore, 'crest');", c);
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a); expect(c).toBeGreaterThan(b); expect(d).toBeGreaterThan(c);
    let life = normalized.slice(a, b), bone = normalized.slice(c, d);
    if (integrated) {
      const addedClosing = '                  }\n';
      expect(life.endsWith(addedClosing)).toBe(true); expect(bone.endsWith(addedClosing)).toBe(true);
      life = life.slice(0, -addedClosing.length); bone = bone.slice(0, -addedClosing.length);
      const gate = 'if (/^(parasaurolophus|corythosaurus|lambeosaurus|olorotitan)$/.test(dn.id)) {';
      expect(normalized.slice(a - 400, a)).toContain(gate);
      expect(normalized.slice(c - 400, c)).toContain(gate);
    }
    expect(createHash('sha256').update(life).digest('hex')).toBe('c13a4d256337e6fbb46f2290d8842e35e3c9fb542906384db4e89ce06a5a5cdb');
    expect(createHash('sha256').update(bone).digest('hex')).toBe('bc69aba13db5fb5a7003c5ddfb1c339d9f34981d254146394e8d92567e383fde');
  });

  it.runIf(integrated)('uses the native life/bone branches and links species-specific exploration to primary sources', () => {
    const life = section("} else if (/Hadrosaur|Lambeosaur/i.test(cladeName)) {", "} else if (/Pachycephalosaur/i.test(cladeName) && hasAnatomyPart('dome')) {");
    const boneStart = source.indexOf('var duckBillCenter = snout.clone()');
    const boneEnd = source.indexOf("} else if (/Pachycephalosaur/i.test(cladeName) && hasAnatomyPart('dome')) {", boneStart);
    expect(life).toContain('dinoAddLambeosaurCrest(THREE, dn, model, head, len, ht, reconstructionProfile.head, anatomyAccentMat, false, headShell)');
    expect(source.slice(boneStart, boneEnd)).toContain('dinoAddLambeosaurCrest(THREE, dn, model, head, len, ht, reconstructionProfile.head, boneMat, true, cranialVault)');
    for (const id of species) {
      const dn = animal(id), part = art.dinoDetailedBodyPartDefinitions(dn, true, 'evidence-led').find(p => p.id === 'crest');
      expect(part).toBeDefined(); expect(part.region).toBe('head'); expect(part.layer).toBe('both');
      const inspection = art.dinoPartInspectionFor(dn, part), view = art.dinoPartViewpointTaskFor(dn, part);
      expect(inspection.source.url).toBe(art.dinoLambeosaurCrestProfileFor(dn).source);
      expect(inspection.limit).toMatch(/outline|dimensions/); expect(inspection.limit).toMatch(/passages|lumen/);
      expect(view.views.map(v => v.id)).toEqual(['side', 'front']);
    }
    expect(art.dinoDetailedBodyPartDefinitions(animal('edmontosaurus'), true, 'evidence-led').some(p => p.id === 'crest')).toBe(false);
  });
});
