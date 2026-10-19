import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__nasalRugosity={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope,dinoNeckJunction,dinoSurfaceGeometry,dinoNasalRugosityProfileFor,dinoNasalRugosityGeometry,dinoAddNasalRugosities,dinoSurfaceAnchor,dinoCranialGeometry,dinoTheropodCranialRadii,cranialSurfaceProfileFor,dinoCranialDisplayProfile,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor}; window.StemLab.registerTool('dinoLab'"))();
const art = globalThis.__nasalRugosity;
const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const animal = id => art.DINOS.find(d => d.id === id);

function productionSurfaces(id, scale = 1) {
  const dn = animal(id), model = new THREE.Group(), head = vec(0, 0), snout = vec(-1.4 * scale, -.03 * scale);
  const height = .24 * scale, depth = .20 * scale, length = .50 * scale;
  const shape = { center: head.clone().lerp(snout, .28).add(vec(0, -height * .24)), length, height, depth, cheek: .92 };
  const points = [vec(.7 * scale, -.02 * scale), vec(length * .65, 0), head,
    head.clone().lerp(snout, .58), snout, snout.clone().add(vec(-length * .28, 0))];
  const material = new THREE.MeshBasicMaterial();
  const skin = new THREE.Mesh(art.dinoCranialGeometry(THREE, points,
    art.dinoTheropodCranialRadii(height, depth, .08 * scale, art.cranialSurfaceProfileFor(dn)), shape), material);
  model.add(skin);
  const display = art.dinoCranialDisplayProfile(THREE, dn, head, snout, length, .16 * scale, .18 * scale, scale, true);
  const bone = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  bone.position.copy(display.rostrumCenter); bone.scale.copy(display.rostrumScale); model.add(bone);
  model.updateMatrixWorld(true);
  return { dn, model, head, snout, skin, bone, height, boneHeight: .16 * scale, material };
}

function nativeLeanSurfaces(id, scale) {
  function section(start, end) {
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (a < 0 || b < 0) throw new Error('Missing native nasal containment assembly seam');
    return source.slice(a, b);
  }
  const dn = animal(id), model = new THREE.Group(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const context = { THREE, dn, len: dn.lengthM * scale, ht: dn.heightM * scale,
    isTheropod: true, isSauropod: false, cladeName: dn.clade,
    reconstructionProfile: art.reconstructionProfileFor(dn), posture: art.postureProfileFor(dn),
    cranialSurface: art.cranialSurfaceProfileFor(dn), postcranialSurface: art.postcranialSurfaceProfileFor(dn),
    surfaceHypothesis: { headSoftTissueScale: .90, neckSoftTissueScale: .88, bodyHeightScale: .91 },
    vec, headMat: material, bodyMat: material, model, props: { species: dn, showBody: true, showSkeleton: true },
    ...Object.fromEntries(['dinoTyrannosaurPose', 'dinoLongSnoutedTyrannosaurAnchors', 'dinoCervicalEnvelope', 'dinoNeckJunction', 'dinoTheropodCranialRadii', 'dinoCranialGeometry', 'dinoSurfaceGeometry', 'dinoAddNasalRugosities', 'dinoCranialDisplayProfile'].map(key => [key, art[key]])) };
  context.addSoftTissueChain = new Function('context', 'with(context){' + section('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {', 'function addContourGroup(meshes)') + 'return addSoftTissueChain;}')(context);
  const assembly = section('var detailScale = Math.min(1, ht / 2);', 'var evidenceAnchorPoints =');
  const envelope = section('var surfaceHeadFactor = reconstructionProfile.head', 'if (headShell) {');
  const anchors = new Function('context', 'with(context){' + assembly + 'var surfaceBodyHeight=bodyHeight*surfaceHypothesis.bodyHeightScale;' + envelope + 'return {head,snout,headShell,detailScale,len,ht,reconstructionProfile};}')(context);
  Object.assign(context, anchors, { boneMat: material,
    skullLength: Math.max(.20 * anchors.detailScale, anchors.len * .066) * anchors.reconstructionProfile.head,
    skullHeight: Math.max(.045 * anchors.detailScale, anchors.ht * .080) * anchors.reconstructionProfile.head,
    skullDepth: Math.max(.035 * anchors.detailScale, anchors.ht * .073) * anchors.reconstructionProfile.head });
  context.addSkeletonEllipsoid = new Function('context', 'with(context){' + section('function addSkeletonEllipsoid(pos, scale, mat) {', 'function addSkeletonCone(base, tip, radius, mat)') + 'return addSkeletonEllipsoid;}')(context);
  const rostrum = new Function('context', 'with(context){' + section('var cranialDisplay = dinoCranialDisplayProfile(THREE, props.species, head, snout,', 'addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))') + 'return cranialRostrum;}')(context);
  model.updateMatrixWorld(true);
  return { model, material, skin: anchors.headShell, bone: rostrum, ht: anchors.ht };
}

describe('species-specific nasal rugosities follow the supporting skull and life surface', () => {
  it('uses the fossil counts for the represented species without borrowing A. remotus horns', () => {
    const ali = art.dinoNasalRugosityProfileFor(animal('alioramus'));
    const qian = art.dinoNasalRugosityProfileFor(animal('qianzhousaurus'));
    expect(animal('alioramus').name).toBe('Alioramus altai');
    expect(ali.count).toBe(3); expect(qian.count).toBe(4);
    expect(ali.fractions).toHaveLength(ali.count); expect(qian.fractions).toHaveLength(qian.count);
    expect(qian.heightScale).toBeLessThan(ali.heightScale);
    expect(qian.widthScale).toBeGreaterThan(ali.widthScale);
    expect(qian.lengthScale).toBeGreaterThan(ali.lengthScale);
    expect(ali.source).toBe('https://doi.org/10.1073/pnas.0906911106');
    expect(qian.source).toBe('https://doi.org/10.1080/02724634.2021.1999251');
    for (const d of art.DINOS.filter(d => !['alioramus', 'qianzhousaurus'].includes(d.id))) expect(art.dinoNasalRugosityProfileFor(d), d.id).toBeNull();
    expect(art.dinoNasalRugosityProfileFor({ id: 'alioramus', group: 'other' })).toBeNull();
    expect(art.dinoNasalRugosityProfileFor(null)).toBeNull();
  });

  it.each(['alioramus', 'qianzhousaurus'].flatMap(id => [.04, 1, 6].map(scale => ({ id, scale }))))('builds attached bone and skin bumps for $id at scale $scale', ({ id, scale }) => {
      const f = productionSurfaces(id, scale), profile = art.dinoNasalRugosityProfileFor(f.dn);
      const skinBefore = f.skin.geometry.attributes.position.array.slice(), boneBefore = f.bone.geometry.attributes.position.array.slice();
      const life = art.dinoAddNasalRugosities(THREE, f.dn, f.skin, f.head, f.snout, f.height, f.material, false);
      const bone = art.dinoAddNasalRugosities(THREE, f.dn, f.bone, f.head, f.snout, f.boneHeight, f.material, true);
      expect(life, id).toHaveLength(profile.count); expect(bone, id).toHaveLength(profile.count);
      f.model.updateMatrixWorld(true);
      for (const [meshes, surface, height] of [[life, f.skin, f.height], [bone, f.bone, f.boneHeight]]) for (const mesh of meshes) {
        expect(mesh.parent).toBe(surface);
        const { geometry } = mesh, pos = geometry.attributes.position, normal = geometry.attributes.normal;
        expect(pos.count).toBeLessThanOrEqual(160);
        expect(mesh.userData.dinoPartIds).toContain('nasal-rugosities');
        expect(mesh.userData.dinoNasalRugosity.surfaceSeated).toBe(true);
        for (const key of ['position', 'normal', 'uv']) expect(Array.from(geometry.attributes[key].array).every(Number.isFinite)).toBe(true);
        for (let n = 0; n < normal.count; n++) expect(new THREE.Vector3().fromBufferAttribute(normal, n).length()).toBeCloseTo(1, 5);
        const center = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, 0));
        const fraction = mesh.userData.dinoNasalRugosity.fraction;
        const anchor = art.dinoSurfaceAnchor(THREE, surface, vec(f.head.clone().lerp(f.snout, fraction).x, scale * 2, 0), vec(0, -1), scale * 5);
        const displacement = center.clone().sub(anchor.point);
        expect(displacement.dot(anchor.normal)).toBeGreaterThan(height * profile.heightScale * .90);
        // Interpolated normals on a triangulated loft need not have an exactly
        // zero lateral component at its seam; keep the crest on the midline
        // within 0.2% of the bump half-width instead of demanding exact doubles.
        expect(Math.abs(center.z)).toBeLessThan(height * profile.widthScale * .002);
        const rimStart = 1 + (geometry.userData.dinoNasalRugosity.rings - 1) * geometry.userData.dinoNasalRugosity.sides;
        for (let n = rimStart; n < pos.count; n++) {
          const rim = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, n));
          // SphereGeometry's wrapped seam can miss an exact edge ray after a
          // float32 local/world round trip. Probe either side by a subpixel
          // tolerance, while retaining the same strict physical root-gap bound.
          let underlying = art.dinoSurfaceAnchor(THREE, surface, vec(rim.x, scale * 2, rim.z), vec(0, -1), scale * 5);
          if (!underlying && Math.abs(rim.z) < scale * 1e-8) underlying = art.dinoSurfaceAnchor(THREE, surface, vec(rim.x, scale * 2, scale * 1e-8), vec(0, -1), scale * 5);
          expect(underlying, `${id} scale=${scale} layer=${mesh.userData.dinoNasalRugosity.core ? 'bone' : 'life'} bump=${mesh.userData.dinoNasalRugosity.index} vertex=${n} rim=${rim.toArray()}`).not.toBeNull();
          expect(rim.y - underlying.point.y).toBeLessThanOrEqual(scale * 1e-7);
          expect(rim.distanceTo(underlying.point)).toBeLessThan(height * profile.heightScale * .06);
        }
      }
      expect(f.skin.geometry.attributes.position.array).toEqual(skinBefore);
      expect(f.bone.geometry.attributes.position.array).toEqual(boneBefore);
      expect(life.map(m => m.userData.dinoNasalRugosity.fraction)).toEqual(bone.map(m => m.userData.dinoNasalRugosity.fraction));
      f.model.traverse(m => { if (m.geometry) m.geometry.dispose(); }); f.material.dispose();
  });

  it('keeps the patch attached after its scaled or translated parent is posed', () => {
    const f = productionSurfaces('alioramus');
    f.model.position.set(2, 1, -3); f.model.scale.setScalar(2); f.model.updateMatrixWorld(true);
    const patches = art.dinoAddNasalRugosities(THREE, f.dn, f.bone, f.head, f.snout, f.boneHeight, f.material, true);
    expect(patches).toHaveLength(3);
    const positions = patches.map(mesh => mesh.geometry.attributes.position.array.slice());
    f.model.rotation.y = .45; f.model.rotation.x = -.1; f.model.updateMatrixWorld(true);
    patches.forEach((mesh, i) => {
      expect(mesh.parent).toBe(f.bone); expect(mesh.geometry.attributes.position.array).toEqual(positions[i]);
      const world = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 0));
      expect([world.x, world.y, world.z].every(Number.isFinite)).toBe(true);
    });
    f.model.traverse(m => { if (m.geometry) m.geometry.dispose(); }); f.material.dispose();
  });

  it('builds the native bone relief without reading the soft-tissue hypothesis', () => {
    const start = source.indexOf('var cranialDisplay = dinoCranialDisplayProfile(THREE, props.species, head, snout,'),
      end = source.indexOf('addBone(head.clone().add(vec(0, skullHeight * 0.42, 0))', start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    const build = new Function('context', 'with(context){' + source.slice(start, end) + 'return cranialRostrum;}');
    for (const id of ['alioramus', 'qianzhousaurus']) {
      const f = productionSurfaces(id), model = new THREE.Group();
      const context = { THREE, dn: f.dn, props: { species: f.dn }, head: f.head, snout: f.snout,
        skullLength: .5, skullHeight: f.boneHeight, skullDepth: .18, detailScale: 1, isTheropod: true,
        boneMat: f.material, dinoCranialDisplayProfile: art.dinoCranialDisplayProfile, dinoAddNasalRugosities: art.dinoAddNasalRugosities,
        addSkeletonEllipsoid(position, scale, material) {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
          mesh.position.copy(position); mesh.scale.copy(scale); model.add(mesh); return mesh;
        } };
      Object.defineProperty(context, 'surfaceHypothesis', { get() { throw new Error('Bone nasal relief reads the tissue hypothesis'); } });
      const rostrum = build(context);
      expect(rostrum.children.filter(m => m.userData.dinoNasalRugosity?.core)).toHaveLength(art.dinoNasalRugosityProfileFor(f.dn).count);
      model.traverse(m => { if (m.geometry) m.geometry.dispose(); });
      f.model.traverse(m => { if (m.geometry) m.geometry.dispose(); }); f.material.dispose();
    }
  });

  it.each(['alioramus', 'qianzhousaurus'].flatMap(id => [.04, 1, 6].map(scale => ({ id, scale }))))('keeps every bone-bump vertex inside the native lean life head for $id at scale $scale', ({ id, scale }) => {
    const f = nativeLeanSurfaces(id, scale), patches = f.bone.children.filter(m => m.userData.dinoNasalRugosity?.core);
    expect(patches).toHaveLength(art.dinoNasalRugosityProfileFor(animal(id)).count);
    const direction = vec(1.031, -.577, .137).normalize(), reach = f.ht * 4, caster = new THREE.Raycaster();
    let missed = 0, outside = 0, clearance = Infinity;
    for (const mesh of patches) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      const p = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i));
      caster.set(p.clone().addScaledVector(direction, -reach), direction);
      const distances = [];
      for (const hit of caster.intersectObject(f.skin, false)) if (!distances.length || hit.distance - distances.at(-1) > f.ht * 1e-7) distances.push(hit.distance);
      if (distances.length < 2) { missed++; continue; }
      if (distances.filter(distance => distance < reach).length % 2 !== 1) outside++;
      clearance = Math.min(clearance, ...distances.map(distance => Math.abs(distance - reach)));
    }
    expect(missed).toBe(0); expect(outside).toBe(0); expect(clearance).toBeGreaterThan(f.ht * 1e-5);
    f.model.traverse(m => { if (m.geometry) m.geometry.dispose(); }); f.material.dispose();
  });

  it('rejects invalid or unsupported footprints instead of making detached ornaments', () => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial());
    sphere.updateMatrixWorld(true);
    expect(art.dinoNasalRugosityGeometry(THREE, sphere, vec(0, 0), [.2, .1, .1])).not.toBeNull();
    expect(art.dinoNasalRugosityGeometry(THREE, sphere, vec(3, 0), [.2, .1, .1])).toBeNull();
    expect(art.dinoNasalRugosityGeometry(THREE, sphere, vec(0, 0), [2, .1, 2])).toBeNull();
    for (const invalid of [[0, .1, .1], [.2, -.1, .1], [NaN, .1, .1], [.2, Infinity, .1]]) expect(art.dinoNasalRugosityGeometry(THREE, sphere, vec(0, 0), invalid)).toBeNull();
    expect(art.dinoNasalRugosityGeometry(THREE, null, vec(0, 0), [.2, .1, .1])).toBeNull();
    sphere.scale.y = 0;
    expect(art.dinoNasalRugosityGeometry(THREE, sphere, vec(0, 0), [.2, .1, .1])).toBeNull();
    sphere.geometry.dispose(); sphere.material.dispose();
  });

  it('teaches the bony count and one midline row separately from uncertain living appearance', () => {
    for (const id of ['alioramus', 'qianzhousaurus']) {
      const d = animal(id), part = art.dinoDetailedBodyPartDefinitions(d, false).find(p => p.id === 'nasal-rugosities');
      expect(part).toBeDefined(); expect(part.layer).toBe('both');
      const inspection = art.dinoPartInspectionFor(d, part);
      expect(inspection.question).toContain('midline row');
      expect(inspection.limit).toMatch(/illustrative|inferred/);
      expect(inspection.source.url).toBe(art.dinoNasalRugosityProfileFor(d).source);
      expect(inspection.bone).toContain(id === 'alioramus' ? 'three' : 'four');
    }
    for (const id of ['tyrannosaurus', 'velociraptor', 'triceratops']) expect(art.dinoDetailedBodyPartDefinitions(animal(id), false).some(p => p.id === 'nasal-rugosities')).toBe(false);
  });
});
