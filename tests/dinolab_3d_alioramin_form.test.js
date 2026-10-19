import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__alioraminForm={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,cranialSurfaceProfileFor,skeletalAnatomyProfileFor,dinoLongSnoutedTyrannosaurAnchors,dinoCranialDisplayProfile,dinoCervicalEnvelope,dinoNeckJunction,dinoTheropodCranialRadii,dinoCranialGeometry,dinoSurfaceGeometry,dinoJawProfile};window.StemLab.registerTool('dinoLab'"))();
const art = globalThis.__alioraminForm;
const targets = ['alioramus', 'qianzhousaurus'];
const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const byId = id => art.DINOS.find(d => d.id === id);

// Match the production model's anchors, cranial loft, and mandibular surface.
// The lean and full factors bracket every selectable soft-tissue hypothesis.
function surfaces(d, scale, tissue) {
  const len = d.lengthM * scale, ht = d.heightM * scale, detail = Math.min(1, ht / 2);
  const reconstruction = art.reconstructionProfileFor(d), posture = art.postureProfileFor(d);
  const profile = art.cranialSurfaceProfileFor(d), postcranial = art.postcranialSurfaceProfileFor(d);
  const head = vec(-len * .30, Math.max(.16 * detail, ht * .93) * reconstruction.neck * posture.headHeight);
  const shoulder = vec(-len * .12, Math.max(.12 * detail, ht * .73) * reconstruction.stance * reconstruction.shoulder * posture.shoulderHeight);
  const snout = art.dinoLongSnoutedTyrannosaurAnchors(THREE, d, head, head.clone().add(vec(-len * .085, -ht * .02))).snout;
  const h = Math.max(.045 * detail, ht * .12) * reconstruction.head * tissue * profile.headHeightScale;
  const depth = Math.max(.035 * detail, ht * .082) * reconstruction.head * tissue * profile.headDepthScale;
  const length = Math.max(.18 * detail, len * .055) * reconstruction.head * tissue * profile.headLengthScale;
  const bodyH = Math.max(.065 * detail, ht * .19) * reconstruction.bodyHeight * reconstruction.chestFullness;
  const neckBase = Math.max(.035 * detail, bodyH * .42) * reconstruction.neckBase * postcranial.neckFullness;
  const neckTip = Math.min(Math.max(.028 * detail, ht * .085) * reconstruction.neckTip * Math.max(.82, postcranial.neckFullness), Math.min(h, depth) * .66);
  const cervical = art.dinoCervicalEnvelope(THREE, shoulder, head, bodyH, neckBase, neckTip, postcranial, false, d.clade, false);
  const junction = art.dinoNeckJunction(THREE, cervical.points, cervical.radii, length * 1.10);
  const points = [junction.point, head.clone().add(vec(length * .65, 0)), head,
    head.clone().lerp(snout, .58), snout, snout.clone().add(vec(-length * .28, 0))];
  const shape = { center: head.clone().lerp(snout, .28).add(vec(0, -h * .24)), length, height: h, depth, cheek: profile.cheekScale };
  const upper = art.dinoCranialGeometry(THREE, points, art.dinoTheropodCranialRadii(h, depth, junction.radius, profile), shape);
  const jawHeightScale = Math.min(1.12, profile.jawHeightScale);
  const jawDepth = depth * Math.min(1.12, profile.jawDepthScale) * Math.min(1, profile.muzzleDepthScale * profile.muzzleBaseScale);
  const jawTip = Math.min(1, profile.muzzleHeightScale * profile.muzzleTipScale);
  const lowerProfile = art.dinoJawProfile(THREE,
    head.clone().lerp(snout, .12).add(vec(0, -h * .44 * Math.min(1, jawHeightScale))),
    head.clone().lerp(snout, .98).add(vec(0, -h * .37 * jawTip)), h * jawHeightScale, jawDepth, length);
  const lower = art.dinoSurfaceGeometry(THREE, lowerProfile.points, lowerProfile.radii, { smoothProfile: true });
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes = [upper, lower].map(g => new THREE.Mesh(g, material));
  meshes.forEach(mesh => mesh.updateMatrixWorld(true));
  return { len, ht, detail, head, snout, meshes, upper, lower,
    skullLength: Math.max(.20 * detail, len * .066) * reconstruction.head,
    skullHeight: Math.max(.045 * detail, ht * .080) * reconstruction.head,
    skullDepth: Math.max(.035 * detail, ht * .073) * reconstruction.head,
    dispose() { upper.dispose(); lower.dispose(); material.dispose(); } };
}

// A bilateral skin/jaw cross-section encloses a point if either closed mesh
// contains its z value at the point's actual x/y coordinates.
function enclosed(model, point, clearance = 0) {
  return model.meshes.some(mesh => {
    const ray = new THREE.Raycaster(vec(point.x, point.y, model.ht * 5), vec(0, 0, -1));
    const hits = ray.intersectObject(mesh, false);
    if (hits.length < 2) return false;
    const high = hits[0].point.z, low = hits.at(-1).point.z;
    return point.z + clearance <= high + model.ht * 1e-5 && point.z - clearance >= low - model.ht * 1e-5;
  });
}

describe('Alioramini retain a long, low snout in bone and life views', () => {
  it('extends only the two supported species, retaining the input head and posterior anatomy', () => {
    for (const d of art.DINOS) {
      const head = vec(-3, 2), snout = vec(-4, 1.9), before = [head.toArray(), snout.toArray()];
      const result = art.dinoLongSnoutedTyrannosaurAnchors(THREE, d, head, snout);
      expect([head.toArray(), snout.toArray()], d.id).toEqual(before);
      expect(result.active, d.id).toBe(targets.includes(d.id));
      if (result.active) {
        expect(result.snout.distanceTo(head)).toBeCloseTo(snout.distanceTo(head) * 1.4, 10);
        expect(result.snout.z).toBe(0);
      } else expect(result.snout, d.id).toBe(snout);
    }
  });

  it('distinguishes long low cranial profiles from the robust Tyrannosaurus profile', () => {
    const robust = art.cranialSurfaceProfileFor(byId('tyrannosaurus'));
    for (const id of targets) {
      const p = art.cranialSurfaceProfileFor(byId(id));
      expect(p.id).toBe('alioramin-long-low');
      expect(p.matureTyrannosaur).not.toBe(true);
      expect(p.muzzleLengthScale).toBe(1); // One shared elongation, including the skeleton.
      const keys = 'headLengthScale headHeightScale headDepthScale muzzleLengthScale muzzleBaseScale muzzleTipScale muzzleHeightScale muzzleDepthScale jawHeightScale jawDepthScale cheekScale browScale eyeScale eyeForwardScale eyeHeightScale nostrilPosition nostrilHeightScale nostrilScale'.split(' ');
      expect(keys.map(key => p[key]), id).toEqual([1.04,.94,1,1,1,1,.94,1.04,.90,.94,.92,.96,1,.98,1,.88,1,.96]);
      for (const key of ['headHeightScale', 'headDepthScale', 'muzzleHeightScale', 'muzzleDepthScale', 'cheekScale', 'browScale']) expect(p[key], id + ':' + key).toBeLessThan(robust[key]);
      expect(p.note).toContain('10.1038/ncomms4788');
      expect(p.note).toContain('inferred');
    }
    expect(robust.id).toBe('tyrannosaur-deep'); expect(robust.matureTyrannosaur).toBe(true);
    expect(art.skeletalAnatomyProfileFor(byId('alioramus')).toothProfile).toBe('ziphodont');
    expect(art.skeletalAnatomyProfileFor(byId('qianzhousaurus')).toothProfile).toBe('incrassate');
    expect(art.skeletalAnatomyProfileFor(byId('tyrannosaurus')).toothProfile).toBe('incrassate');
    const alioramus = byId('alioramus');
    expect(alioramus.name).toBe('Alioramus altai');
    expect(alioramus.named).toBe(2009); expect(alioramus.namedBy).toContain('Brusatte');
    expect(alioramus.uncertain).toContain('was young');
    expect(alioramus.uncertain).toContain('distinct lineage');
  });

  it('uses a low elongated skeletal fill without extending the posterior vault', () => {
    for (const id of targets) for (const scale of [.05, 1, 8]) {
      const head = vec(0, 2 * scale), snout = vec(-2 * scale, 1.9 * scale);
      const p = art.dinoCranialDisplayProfile(THREE, byId(id), head, snout, .8 * scale, .4 * scale, .3 * scale, scale, true);
      expect(p.refined).toBe(true); expect(p.vaultCenter.toArray()).toEqual(head.toArray());
      expect(p.vaultScale.x).toBeLessThan(.8 * scale * .68);
      expect(p.rostrumScale.x / p.rostrumScale.y).toBeGreaterThan(4);
      expect(p.rostrumScale.x / p.rostrumScale.z).toBeGreaterThan(4);
      expect(p.rostrumCenter.x).toBeLessThan(head.clone().lerp(snout, .6).x);
    }
  });

  it('builds finite, symmetric surfaces at every model scale and tissue envelope', () => {
    for (const id of targets) for (const scale of [.05, 1, 8]) for (const tissue of [.90, 1, 1.04]) {
      const model = surfaces(byId(id), scale, tissue);
      for (const g of [model.upper, model.lower]) {
        for (const attr of ['position', 'normal', 'uv']) expect(Array.from(g.attributes[attr].array).every(Number.isFinite), id).toBe(true);
        const p = g.attributes.position;
        expect(g.boundingBox.max.z).toBeCloseTo(-g.boundingBox.min.z, 5);
        expect(g.boundingBox.min.x).toBeLessThan(model.snout.x);
        for (let i = 0; i < p.count; i++) expect(g.boundingBox.containsPoint(vec(p.getX(i), p.getY(i), p.getZ(i)))).toBe(true);
      }
      expect(model.upper.userData.dinoSectionPower).toBeUndefined();
      model.dispose();
    }
  });

  it('encloses the actual facial bone bars and tooth rows in the lean life surface', () => {
    for (const id of targets) for (const scale of [.05, 1, 8]) {
      const m = surfaces(byId(id), scale, .90), { head, snout, skullLength: l, skullHeight: h, skullDepth: z } = m;
      const rostrum = head.clone().lerp(snout, .62), radius = Math.max(.007 * m.detail, m.ht * .0027);
      const failures = [];
      for (const side of [-1, 1]) {
        const upper = snout.clone().add(vec(l * .04, h * .18, side * z * .38));
        const lower = snout.clone().add(vec(l * .02, -h * .24, side * z * .42));
        const nasal = rostrum.clone().add(vec(0, h * .34, side * z * .54));
        const front = snout.clone().lerp(rostrum, .38).add(vec(0, -h * .24, side * z * .54));
        const rear = rostrum.clone().lerp(head, .46).add(vec(0, -h * .22, side * z * .68));
        const jugal = head.clone().add(vec(l * .18, -h * .25, side * z * .72));
        for (const [name, a, b, size] of [['premaxilla', upper, lower, 1.15], ['nasal', upper, nasal, 1], ['front-maxilla', lower, front, 1.32], ['maxilla', front, rear, 1.42], ['jugal', rear, jugal, 1.18]]) {
          for (let i = 0; i <= 20; i++) {
            const p = a.clone().lerp(b, i / 20);
            for (const offset of [vec(0, 0, side * radius * size), vec(0, radius * size), vec(0, -radius * size)]) {
              if (!enclosed(m, p.clone().add(offset))) failures.push(name + ':' + i + ':' + side);
            }
          }
        }
        const toothProfile = art.skeletalAnatomyProfileFor(byId(id)).toothProfile;
        for (let i = 1; i <= 7; i++) {
          const t = .04 + i / 8 * .96;
          const base = head.clone().lerp(snout, t).add(vec(0, -h * .34, side * z * .48));
          const toothLength = Math.max(.025 * m.detail, m.ht * .010) * (toothProfile === 'incrassate' ? 1.18 : 1) * (.72 + Math.sin(t * Math.PI) * .38);
          const tip = base.clone().add(vec(toothLength * (toothProfile === 'incrassate' ? -.08 : -.18), -toothLength));
          if (!enclosed(m, base) || !enclosed(m, tip)) failures.push('tooth:' + i + ':' + side);
        }
      }
      expect(failures, id + ':' + scale).toEqual([]);
      m.dispose();
    }
  });

  it('encloses skeletal display volumes, including their vertices and triangle interiors', () => {
    // Match the renderer's SphereGeometry resolution; the anatomical frame and
    // teeth above are tested separately from these interpretive bulk fills.
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    for (const id of targets) for (const scale of [.05, 1, 8]) {
      const m = surfaces(byId(id), scale, .90);
      const p = art.dinoCranialDisplayProfile(THREE, byId(id), m.head, m.snout, m.skullLength, m.skullHeight, m.skullDepth, m.detail, true);
      for (const region of ['vault', 'rostrum']) {
        const at = i => new THREE.Vector3().fromBufferAttribute(sphere.attributes.position, i).multiply(p[region + 'Scale']).add(p[region + 'Center']);
        const failures = [];
        for (let i = 0; i < sphere.attributes.position.count; i++) if (!enclosed(m, at(i))) failures.push('vertex:' + i);
        for (let i = 0; i < sphere.index.count; i += 3) {
          const center = at(sphere.index.getX(i)).add(at(sphere.index.getX(i + 1))).add(at(sphere.index.getX(i + 2))).multiplyScalar(1 / 3);
          if (!enclosed(m, center)) failures.push('face:' + i);
        }
        expect(failures, id + ':' + scale + ':' + region).toEqual([]);
      }
      m.dispose();
    }
    sphere.dispose();
  });
});
