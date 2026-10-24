import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor, 'globalThis.__dinoBilateral = { DINOS, skeletalAnatomyProfileFor, dinoDistalDigitLandmarks, dinoManualDigitLandmarks, dinoFootSurfaceProfileFor, dinoIguanodontThumbEnabled, dinoCompactFootGeometry, dinoCompactDigitGeometry, dinoBluntTerminalGeometry, dinoFoldedWingProfileFor, dinoForelimbRestPose, dinoKeratinGeometry, dinoDromaeosaurPesProfileFor, dinoDromaeosaurPesFrame, dinoDromaeosaurPesUngualGeometry, dinoDromaeosaurPesMeshes, dinoLongBoneGeometry, dinoSurfacePartIds };' + anchor))();
const art = globalThis.__dinoBilateral;
delete globalThis.__dinoBilateral;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const species = id => {
  const dn = art.DINOS.find(value => value.id === id);
  if (!dn) throw new Error('Missing catalog dinosaur ' + id);
  return dn;
};
const mirror = point => [point[0], point[1], -point[2]];
function samePoint(a, b) { a.forEach((value, index) => expect(value).toBeCloseTo(b[index], 10)); }

// Execute the actual skeleton and skin fan builders, so a helper-only test
// cannot pass while one renderer still uses unmirrored world-Z coordinates.
function buildFoot(dn, front, side, scale = 1) {
  const start = source.indexOf('            function addDigitFan(');
  const end = source.indexOf('            function surfaceAnchor(', start);
  const records = [], model = new THREE.Group(), material = new THREE.MeshBasicMaterial();
  const record = (kind, points, radii) => {
    records.push({ kind, points: points.map(point => point.toArray()), radii });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.001 * scale, 4, 3), material);
    mesh.position.copy(points[0]); model.add(mesh); return mesh;
  };
  const skeletalProfile = art.skeletalAnatomyProfileFor(dn);
  const context = {
    THREE, model, dn, skeletalProfile, props: { showSkeleton: true, showBody: true },
    detailScale: scale, len: 8 * scale, ht: 3 * scale, bodyDepth: .8 * scale,
    isSauropod: dn.group === 'sauropod', cladeName: dn.clade, vec: v,
    boneMat: material, toothMat: material, headMat: material, keratinMat: material,
    ...art,
    addTaperedBoneSegment: (a, b, r1, r2) => record('bone', [a, b], [r1, r2]),
    addLimbJoint: (a, axis, r, hinge) => record('joint', [a, axis], [r, hinge]),
    addSkeletonEllipsoid: (a, radii) => record('bone-envelope', [a], radii.toArray()),
    addSkeletonCone: (a, b, r) => record('ungual', [a, b], [r]),
    addEllipsoid: (a, radii) => record('skin-envelope', [a], radii.toArray()),
    addSoftTissueCylinder: (a, b, r1, r2) => record('skin-digit', [a, b], [r1, r2]),
    addKeratinCone: (a, b, r) => record('sheath', [a, b], [r]),
    addBodyContour: mesh => mesh,
    addBodyPartAnchor: (id, point) => record('anchor:' + id, [point])
  };
  const fan = new Function('context', 'with (context) {' + source.slice(start, end) + '\nreturn { addDigitFan, addSoftTissueDigitFan };}')(context);
  const root = v(0, .03 * scale, side * .6 * scale);
  fan.addDigitFan(root, front, side);
  fan.addSoftTissueDigitFan(root, front, side, front ? 1 : skeletalProfile.distalLegScale);
  model.updateMatrixWorld(true);
  const pedal = model.children.filter(mesh => mesh.userData.dinoDromaeosaurPedalElement || mesh.userData.dinoDromaeosaurPedalBase);
  return { records, model, pedal, profile: skeletalProfile, root, dispose() { model.traverse(mesh => mesh.geometry?.dispose()); material.dispose(); } };
}

// The reviewed pes builder creates real geometry directly rather than calling
// the generic segment spies. Compare every native vertex, allowing circular
// rings to be reindexed by the mirrored local bone frame.
function expectMirroredPedal(left, right, scale) {
  expect(left.pedal.length).toBeGreaterThan(8);
  expect(left.pedal).toHaveLength(right.pedal.length);
  const tolerance = 2e-7 * Math.max(1, scale), toleranceSq = tolerance * tolerance;
  const cell = point => [point.x, point.y, point.z].map(value => Math.floor(value / tolerance));
  const key = indices => indices.join(',');
  left.pedal.forEach((mesh, index) => {
    const opposite = right.pedal[index], tag = mesh.userData.dinoDromaeosaurPedalElement;
    const otherTag = opposite.userData.dinoDromaeosaurPedalElement;
    if (tag) {
      expect([tag.ray, tag.layer, tag.element, tag.index]).toEqual([otherTag.ray, otherTag.layer, otherTag.element, otherTag.index]);
      expect(tag.side).toBe(-otherTag.side);
    } else {
      expect(opposite.userData.dinoDromaeosaurPedalBase.layer).toBe('life');
      expect(mesh.userData.dinoDromaeosaurPedalBase.side).toBe(-opposite.userData.dinoDromaeosaurPedalBase.side);
    }
    const a = mesh.geometry.attributes.position, b = opposite.geometry.attributes.position;
    expect(a.count).toBe(b.count);
    const cells = new Map();
    for (let vertex = 0; vertex < b.count; vertex++) {
      const point = opposite.localToWorld(v(0, 0, 0).fromBufferAttribute(b, vertex)), bucket = key(cell(point));
      if (!cells.has(bucket)) cells.set(bucket, []);
      cells.get(bucket).push(point);
    }
    let nonfinite = 0, unmatched = 0;
    for (let vertex = 0; vertex < a.count; vertex++) {
      const point = mesh.localToWorld(v(0, 0, 0).fromBufferAttribute(a, vertex)); point.z *= -1;
      if (!point.toArray().every(Number.isFinite)) { nonfinite++; continue; }
      const origin = cell(point); let found = false;
      for (let x = -1; x <= 1 && !found; x++) for (let y = -1; y <= 1 && !found; y++) for (let z = -1; z <= 1 && !found; z++) {
        found = (cells.get(key([origin[0] + x, origin[1] + y, origin[2] + z])) || []).some(candidate => candidate.distanceToSquared(point) <= toleranceSq);
      }
      if (!found) unmatched++;
    }
    expect(nonfinite).toBe(0); expect(unmatched).toBe(0);
  });
  for (const built of [left, right]) {
    expect(built.model.userData.dinoDromaeosaurPes.rays.map(ray => ray.ray)).toEqual([1, 2, 3, 4]);
    expect(built.pedal.filter(mesh => mesh.userData.dinoDromaeosaurPedalElement?.element === 'ungual-core')).toHaveLength(4);
    expect(built.pedal.filter(mesh => mesh.userData.dinoDromaeosaurPedalElement?.element === 'ungual-covering')).toHaveLength(4);
  }
}

describe('bilateral dinosaur digit anatomy', () => {
  for (const id of ['allosaurus', 'velociraptor', 'ornithomimus', 'therizinosaurus', 'triceratops', 'diplodocus']) {
    for (const front of (['triceratops', 'diplodocus'].includes(id) ? [false, true] : [false])) {
      it('mirrors every native ' + id + (front ? ' front-foot' : ' hind-foot') + ' bone, skin digit, claw and anchor', () => {
        for (const scale of [.08, 1, 5]) {
          const left = buildFoot(species(id), front, -1, scale), right = buildFoot(species(id), front, 1, scale);
          try {
            if (id === 'velociraptor') expectMirroredPedal(left, right, scale);
            else expect(left.records.length).toBeGreaterThan(8);
            expect(left.records).toHaveLength(right.records.length);
            left.records.forEach((item, index) => {
              const opposite = right.records[index];
              expect(item.kind).toBe(opposite.kind); expect(item.radii).toEqual(opposite.radii);
              item.points.forEach((point, p) => {
                expect(point.every(Number.isFinite)).toBe(true);
                samePoint(mirror(point), opposite.points[p]);
              });
            });
            expect(left.model.children).toHaveLength(right.model.children.length);
            left.model.children.forEach((mesh, index) => samePoint(mirror(mesh.position.toArray()), right.model.children[index].position.toArray()));
          } finally { left.dispose(); right.dispose(); }
        }
      });
    }
  }

  it('places the elevated second-toe ungual on the medial side of BOTH raptor feet, clear of the ground', () => {
    for (const side of [-1, 1]) {
      const built = buildFoot(species('velociraptor'), false, side);
      try {
        const rays = built.model.userData.dinoDromaeosaurPes.feet[0].rays;
        expect(rays.map(ray => ray.ray)).toEqual([1, 2, 3, 4]);
        const raised = rays.find(ray => ray.ray === 2), third = rays.find(ray => ray.ray === 3);
        expect(raised.ungualRoot[1]).toBeGreaterThan(third.ungualRoot[1] * 2);
        expect((raised.ungualRoot[2] - built.root.z) * side).toBeLessThan(0);
        const core = built.pedal.find(mesh => mesh.userData.dinoDromaeosaurPedalElement?.element === 'ungual-core' && mesh.userData.dinoDromaeosaurPedalElement.ray === 2);
        const points = core.geometry.attributes.position;
        for (let index = 0; index < points.count; index++) expect(core.localToWorld(v(0, 0, 0).fromBufferAttribute(points, index)).y).toBeGreaterThan(0);
        const hallux = rays.find(ray => ray.ray === 1);
        expect((hallux.ungualTip[2] - built.root.z) * side).toBeLessThan(0);
        expect(hallux.ungualTip[0]).toBeLessThan(hallux.base[0]); // unreversed, not a backward perching toe
      } finally { built.dispose(); }
    }
  });

  it('keeps the ordinary three-toed foot mesaxonic with unequal side-ray lengths', () => {
    for (const side of [-1, 1]) {
      const rays = [0, 1, 2].map(index => art.dinoDistalDigitLandmarks(THREE, v(0, .03, side * .6), .3, .12, 3, 1, false, side, index, 3, false, 'Allosauridae'));
      expect(rays[1].length).toBeGreaterThan(rays[0].length);
      expect(rays[1].length).toBeGreaterThan(rays[2].length);
      expect(rays[0].length).not.toBe(rays[2].length);
      expect(rays[0].spread * side).toBeLessThan(0);
      expect(rays[2].spread * side).toBeGreaterThan(0);
      expect(rays.every(ray => !ray.raised)).toBe(true);
    }
  });

  it('restricts lost or weight-bearing first toes to the supported derived clades', () => {
    for (const id of ['therizinosaurus', 'nothronychus', 'erlikosaurus', 'segnosaurus']) {
      const profile = art.skeletalAnatomyProfileFor(species(id));
      expect(profile.pedalDigits).toBe(4); expect(profile.pedalUnguals).toBe(4);
      expect(profile.pedalPhalanxFormula).toEqual([2, 3, 4, 5]); expect(profile.hallux).toBe(false);
      const built = buildFoot(species(id), false, 1);
      try { expect(built.records.filter(item => item.kind === 'ungual')).toHaveLength(4); } finally { built.dispose(); }
    }
    for (const id of ['falcarius', 'beipiaosaurus']) {
      const profile = art.skeletalAnatomyProfileFor(species(id));
      expect(profile.pedalDigits).toBe(3); expect(profile.hallux).toBe(true);
    }
    for (const id of ['ornithomimus', 'gallimimus']) expect(art.skeletalAnatomyProfileFor(species(id)).hallux).toBe(false);
    expect(art.skeletalAnatomyProfileFor(species('garudimimus')).hallux).toBe(true);
  });
});

describe('neutral inward-facing theropod hands', () => {
  for (const count of [1, 2, 3, 4]) it('keeps ' + count + '-digit hands vertical and bilateral with medially facing palms', () => {
    const hands = side => Array.from({ length: count }, (_, index) => art.dinoManualDigitLandmarks(THREE, v(-.8, 1.2, side * .4), .22, .07, index, count, side, false));
    const left = hands(-1), right = hands(1);
    left.forEach((ray, index) => {
      const opposite = right[index];
      samePoint(mirror(ray.metacarpalEnd.toArray()), opposite.metacarpalEnd.toArray());
      samePoint(mirror(ray.tip.toArray()), opposite.tip.toArray());
      expect(opposite.palmNormal.dot(v(0, 0, -1))).toBe(1);
      expect(ray.palmNormal.dot(v(0, 0, 1))).toBe(1);
    });
    if (count > 1) {
      expect(right[0].tip.y).toBeGreaterThan(right[count - 1].tip.y);
      expect(right[0].tip.z).toBe(right[count - 1].tip.z);
      expect(right[0].tip.x).not.toBe(right[1].tip.x);
    }
  });

  it('preserves every curated folded-wing wrist and manual feather-tract landmark', () => {
    for (const id of ['archaeopteryx', 'microraptor', 'anchiornis', 'caudipteryx']) for (const side of [-1, 1]) {
      const dn = species(id), profile = art.dinoFoldedWingProfileFor(dn);
      const pose = art.dinoForelimbRestPose(THREE, v(-.6, .8, 0), 3, 1, 1, .3, .4, 1, side, profile);
      const origin = pose.wrist.clone();
      for (let index = 0; index < 3; index++) {
        const offset = index - 1, ray = art.dinoManualDigitLandmarks(THREE, pose.wrist, .2, .06, index, 3, side, true);
        samePoint(ray.metacarpalEnd.toArray(), origin.clone().add(v(-.2 * .28, -.2 * .035, offset * .06 * .42)).toArray());
        samePoint(ray.tip.toArray(), origin.clone().add(v(-.2, -.2 * .14, offset * .06 * 1.22)).toArray());
        expect(ray.folded).toBe(true);
      }
      samePoint(pose.wrist.toArray(), origin.toArray());
    }
    expect(source).toContain('var metacarpalEnd = manualLayout.metacarpalEnd;');
    expect(source).toContain('var fingerTip = manualLayout.tip;');
    expect(source).toContain('addScaledVector(manualLayout.palmNormal, manualClawLength * 0.30)');
  });
});

function nativeManualClaw(dn, side, folded) {
  const model = new THREE.Group(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const wrist = v(-.8, 1.2, side * .4), handLength = dn.lengthM * (/Therizinosaur/i.test(dn.clade) ? .060 * 1.12 : .018);
  const manualLayout = art.dinoManualDigitLandmarks(THREE, wrist, handLength, .07, 1, 3, side, folded);
  const context = {
    THREE, dn, model, props: { showBody: true, showSkeleton: true },
    len: dn.lengthM, ht: dn.heightM, cladeName: dn.clade, detailScale: Math.min(1, dn.heightM / 2),
    manualLayout, handLength, fingerTip: manualLayout.tip, handDigitIndex: 1, armSide: side,
    manualUngualVisible: true, vec: v, boneMat: material, toothMat: material, keratinMat: material,
    dinoKeratinGeometry: art.dinoKeratinGeometry,
    dinoMarkSpecialPart() {}
  };
  const nativeFunction = (name, next) => {
    const start = source.indexOf('            function ' + name + '('), end = source.indexOf('            function ' + next + '(', start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    return new Function('context', 'with (context) {' + source.slice(start, end) + '\nreturn ' + name + ';}')(context);
  };
  context.addSkeletonCone = nativeFunction('addSkeletonCone', 'addDorsalSpine');
  context.addKeratinCone = nativeFunction('addKeratinCone', 'addIntegumentFilament');
  const start = source.indexOf('                  if (manualUngualVisible) {'), end = source.indexOf('                  else {', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  new Function('context', 'with (context) {' + source.slice(start, end) + '\n}')(context);
  model.updateMatrixWorld(true);
  return {
    model, core: model.children[0], sheath: model.children[1], root: manualLayout.tip,
    dispose() { model.traverse(mesh => mesh.geometry?.dispose()); material.dispose(); }
  };
}

function keratinRingCenters(mesh) {
  const position = mesh.geometry.attributes.position;
  return Array.from({ length: 12 }, (_, ring) => {
    const center = v(0, 0, 0);
    for (let side = 0; side < 12; side++) center.add(v(0, 0, 0).fromBufferAttribute(position, ring * 12 + side));
    return mesh.localToWorld(center.multiplyScalar(1 / 12));
  });
}

describe('native manual claw curvature and core integration', () => {
  for (const id of ['allosaurus', 'therizinosaurus']) it('keeps actual ' + id + ' claw curves in the inward finger flexion plane on both sides', () => {
    const left = nativeManualClaw(species(id), -1, false), right = nativeManualClaw(species(id), 1, false);
    try {
      for (const built of [left, right]) {
        for (const center of keratinRingCenters(built.sheath)) expect(center.y).toBeCloseTo(built.root.y, 7);
        if (id === 'therizinosaurus') for (const center of keratinRingCenters(built.core)) expect(center.y).toBeCloseTo(built.root.y, 7);
      }
      for (const field of ['core', 'sheath']) {
        const leftMesh = left[field], rightMesh = right[field], a = leftMesh.geometry.attributes.position, b = rightMesh.geometry.attributes.position;
        expect(a.count).toBe(b.count);
        const rightVertices = Array.from({ length: b.count }, (_, index) => rightMesh.localToWorld(v(0, 0, 0).fromBufferAttribute(b, index)));
        for (let index = 0; index < a.count; index++) {
          const point = leftMesh.localToWorld(v(0, 0, 0).fromBufferAttribute(a, index)); point.z *= -1;
          expect(Math.min(...rightVertices.map(candidate => candidate.distanceTo(point)))).toBeLessThan(2e-7);
        }
      }
    } finally { left.dispose(); right.dispose(); }
  });

  it('nests the actual long Therizinosaurus bony ungual inside its keratin sheath after the hand-plane correction', () => {
    for (const side of [-1, 1]) {
      const built = nativeManualClaw(species('therizinosaurus'), side, false);
      try {
        const points = built.core.geometry.attributes.position; let checked = 0;
        // Skip the shared basal cap plane. Every other sampled bony vertex
        // needs a sheath intersection in both directions across the thin axis.
        for (let index = 12; index < points.count - 1; index += 3) {
          const point = built.core.localToWorld(v(0, 0, 0).fromBufferAttribute(points, index));
          for (const sign of [-1, 1]) {
            const hits = new THREE.Raycaster(point, v(0, sign, 0)).intersectObject(built.sheath, false);
            expect(hits.some(hit => hit.distance > 1e-8)).toBe(true);
          }
          checked++;
        }
        expect(checked).toBeGreaterThan(30);
      } finally { built.dispose(); }
    }
  });

  it('keeps native folded-wing claws in their prior curve plane and default keratin geometry exact', () => {
    for (const side of [-1, 1]) {
      const built = nativeManualClaw(species('caudipteryx'), side, true);
      try { for (const center of keratinRingCenters(built.sheath)) expect(center.z).toBeCloseTo(built.root.z, 7); }
      finally { built.dispose(); }
    }
    const direction = v(-.20, -.06, 0), implicit = art.dinoKeratinGeometry(THREE, direction, .015, 'claw'), explicit = art.dinoKeratinGeometry(THREE, direction, .015, 'claw', undefined, null);
    try {
      for (const key of Object.keys(implicit.attributes)) expect(explicit.attributes[key].array).toEqual(implicit.attributes[key].array);
      expect(explicit.index.array).toEqual(implicit.index.array);
    } finally { implicit.dispose(); explicit.dispose(); }
  });
});
